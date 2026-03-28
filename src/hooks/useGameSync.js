import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useGameSync(pin) {
  const [sessionData, setSessionData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef(null);
  const hasSessionQuestionsTableRef = useRef(true);
  const channelsRef = useRef([]);
  const debounceRef = useRef({ players: null, answers: null, questions: null });

  const cleanupChannels = useCallback(async () => {
    const active = channelsRef.current;
    channelsRef.current = [];

    await Promise.all(active.map((channel) => supabase.removeChannel(channel)));
  }, []);

  const scheduleSetPlayers = useCallback((nextPlayers) => {
    if (debounceRef.current.players) clearTimeout(debounceRef.current.players);
    debounceRef.current.players = setTimeout(() => setPlayers(nextPlayers), 80);
  }, []);

  const scheduleSetAnswers = useCallback((nextAnswers) => {
    if (debounceRef.current.answers) clearTimeout(debounceRef.current.answers);
    debounceRef.current.answers = setTimeout(() => setAnswers(nextAnswers), 80);
  }, []);

  const scheduleSetSessionQuestions = useCallback((nextQuestions) => {
    if (debounceRef.current.questions) clearTimeout(debounceRef.current.questions);
    debounceRef.current.questions = setTimeout(() => setSessionQuestions(nextQuestions), 80);
  }, []);

  const refetchSessionPlayersAndAnswers = useCallback(
    async (sessionId, knownSession = null) => {
      if (!sessionId) return;

      const sessionPromise = knownSession
        ? Promise.resolve({ data: knownSession, error: null })
        : supabase.from('sessions').select('*').eq('id', sessionId).maybeSingle();

      const [sessionRes, playersRes, answersRes] = await Promise.all([
        sessionPromise,
        supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false }).order('created_at', { ascending: true }),
        supabase.from('answers').select('*').eq('session_id', sessionId),
      ]);

      let questionsData = [];
      if (hasSessionQuestionsTableRef.current) {
        const { data: customQuestions, error: customQuestionsError } = await supabase
          .from('session_questions')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (customQuestionsError?.code === '42P01') {
          hasSessionQuestionsTableRef.current = false;
          questionsData = [];
        } else if (customQuestionsError) {
          throw customQuestionsError;
        } else {
          questionsData = customQuestions || [];
        }
      }

      if (sessionRes.error) throw sessionRes.error;
      if (playersRes.error) throw playersRes.error;
      if (answersRes.error) throw answersRes.error;

      if (sessionRes.data) setSessionData(sessionRes.data);
      scheduleSetPlayers(playersRes.data || []);
      scheduleSetAnswers(answersRes.data || []);
      scheduleSetSessionQuestions(questionsData);
    },
    [scheduleSetAnswers, scheduleSetPlayers, scheduleSetSessionQuestions]
  );

  const setupRealtime = useCallback(
    async (sessionId) => {
      await cleanupChannels();

      const sessionChannel = supabase
        .channel(`session-${pin}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessions', filter: `pin=eq.${pin}` },
          async (payload) => {
            if (payload.new) {
              setSessionData(payload.new);
              sessionIdRef.current = payload.new.id;
              await refetchSessionPlayersAndAnswers(payload.new.id, payload.new);
            }
          }
        )
        .on('system', {}, async (payload) => {
          if (payload?.status === 'TIMED_OUT' || payload?.status === 'CHANNEL_ERROR') {
            const currentSessionId = sessionIdRef.current;
            if (currentSessionId) await refetchSessionPlayersAndAnswers(currentSessionId);
          }
        })
        .subscribe();

      channelsRef.current.push(sessionChannel);

      if (!sessionId) return;

      const playerAnswerChannel = supabase
        .channel(`players-answers-${sessionId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` },
          async () => {
            await refetchSessionPlayersAndAnswers(sessionId);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` },
          async () => {
            await refetchSessionPlayersAndAnswers(sessionId);
          }
        )
        .on('system', {}, async (payload) => {
          if (payload?.status === 'TIMED_OUT' || payload?.status === 'CHANNEL_ERROR') {
            await refetchSessionPlayersAndAnswers(sessionId);
          }
        })
        .subscribe();

      channelsRef.current.push(playerAnswerChannel);

      if (hasSessionQuestionsTableRef.current) {
        const customQuestionsChannel = supabase
          .channel(`session-questions-${sessionId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'session_questions', filter: `session_id=eq.${sessionId}` },
            async () => {
              await refetchSessionPlayersAndAnswers(sessionId);
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              hasSessionQuestionsTableRef.current = false;
            }
          });

        channelsRef.current.push(customQuestionsChannel);
      }
    },
    [cleanupChannels, pin, refetchSessionPlayersAndAnswers]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!pin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('pin', pin)
          .maybeSingle();

        if (sessionError) throw sessionError;

        if (!session) {
          if (!isMounted) return;
          setSessionData(null);
          setPlayers([]);
          setAnswers([]);
          setSessionQuestions([]);
          await setupRealtime(null);
          return;
        }

        sessionIdRef.current = session.id;
        if (isMounted) {
          setSessionData(session);
          await refetchSessionPlayersAndAnswers(session.id, session);
          await setupRealtime(session.id);
        }
      } catch (error) {
        console.error('Realtime sync bootstrap failed:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
      if (debounceRef.current.players) clearTimeout(debounceRef.current.players);
      if (debounceRef.current.answers) clearTimeout(debounceRef.current.answers);
      if (debounceRef.current.questions) clearTimeout(debounceRef.current.questions);
      cleanupChannels();
    };
  }, [cleanupChannels, pin, refetchSessionPlayersAndAnswers, setupRealtime]);

  return useMemo(
    () => ({ sessionData, players, answers, sessionQuestions, loading }),
    [answers, loading, players, sessionData, sessionQuestions]
  );
}
