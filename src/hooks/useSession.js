import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

const HOST_PIN_KEY = 'bb_host_pin';

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function useSession() {
  const createSession = useCallback(async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const pin = generatePin();
      const { data, error } = await supabase
        .from('sessions')
        .insert({ pin, status: 'waiting', current_question_index: 0, question_start_time: null })
        .select()
        .single();

      if (!error && data) {
        localStorage.setItem(HOST_PIN_KEY, pin);
        return { pin, session: data };
      }

      if (!error?.message?.toLowerCase?.().includes('duplicate') && error?.code !== '23505') {
        throw error;
      }
    }

    throw new Error('Unable to generate a unique game PIN. Please try again.');
  }, []);

  const startGame = useCallback(async (sessionId) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'active', question_start_time: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
  }, []);

  const revealAnswer = useCallback(async (sessionId) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'revealing' })
      .eq('id', sessionId);

    if (error) throw error;
  }, []);

  const showLeaderboard = useCallback(async (sessionId) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'leaderboard' })
      .eq('id', sessionId);

    if (error) throw error;
  }, []);

  const advanceQuestion = useCallback(async (sessionId, nextQuestionIndex, hasMoreQuestions) => {
    const payload = hasMoreQuestions
      ? {
          current_question_index: nextQuestionIndex,
          status: 'active',
          question_start_time: new Date().toISOString(),
        }
      : {
          current_question_index: nextQuestionIndex,
          status: 'finished',
          question_start_time: null,
        };

    const { error } = await supabase.from('sessions').update(payload).eq('id', sessionId);
    if (error) throw error;
  }, []);

  const endGame = useCallback(async (sessionId) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'finished', question_start_time: null })
      .eq('id', sessionId);

    if (error) throw error;
  }, []);

  const resetSession = useCallback(async (sessionId) => {
    const [{ error: answersError }, { error: scoresError }, { error: sessionError }] = await Promise.all([
      supabase.from('answers').delete().eq('session_id', sessionId),
      supabase.from('players').update({ score: 0 }).eq('session_id', sessionId),
      supabase
        .from('sessions')
        .update({ status: 'waiting', current_question_index: 0, question_start_time: null })
        .eq('id', sessionId),
    ]);

    if (answersError) throw answersError;
    if (scoresError) throw scoresError;
    if (sessionError) throw sessionError;
  }, []);

  const getStoredHostPin = useCallback(() => localStorage.getItem(HOST_PIN_KEY), []);

  return {
    createSession,
    startGame,
    revealAnswer,
    showLeaderboard,
    advanceQuestion,
    endGame,
    resetSession,
    getStoredHostPin,
  };
}
