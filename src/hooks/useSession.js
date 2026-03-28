import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

const HOST_PIN_KEY = 'bb_host_pin';

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isMissingTableError(error) {
  return error?.code === '42P01';
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

  const addCustomQuestion = useCallback(async (sessionId, payload) => {
    const trimmedQuestion = payload.question?.trim();
    const trimmedOptions = (payload.options || []).map((option) => option.trim());
    const trimmedScripture = payload.scripture?.trim() || '';

    if (!trimmedQuestion) throw new Error('Question text is required.');
    if (trimmedOptions.length !== 4 || trimmedOptions.some((option) => !option)) {
      throw new Error('All 4 options are required.');
    }
    if (!trimmedOptions.includes(payload.correct)) {
      throw new Error('Correct answer must match one of the options.');
    }

    const { data, error } = await supabase
      .from('session_questions')
      .insert({
        session_id: sessionId,
        question: trimmedQuestion,
        options: trimmedOptions,
        correct: payload.correct,
        scripture: trimmedScripture,
      })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        throw new Error('Custom questions table is missing. Run the SQL update in README and retry.');
      }
      throw error;
    }

    return data;
  }, []);

  const resetSession = useCallback(async (sessionId) => {
    const [{ error: answersError }, { error: scoresError }, { error: sessionError }, { error: customQuestionsError }] = await Promise.all([
      supabase.from('answers').delete().eq('session_id', sessionId),
      supabase.from('players').update({ score: 0 }).eq('session_id', sessionId),
      supabase
        .from('sessions')
        .update({ status: 'waiting', current_question_index: 0, question_start_time: null })
        .eq('id', sessionId),
      supabase.from('session_questions').delete().eq('session_id', sessionId),
    ]);

    if (answersError) throw answersError;
    if (scoresError) throw scoresError;
    if (sessionError) throw sessionError;
    if (customQuestionsError && !isMissingTableError(customQuestionsError)) throw customQuestionsError;
  }, []);

  const getStoredHostPin = useCallback(() => localStorage.getItem(HOST_PIN_KEY), []);

  return {
    createSession,
    startGame,
    revealAnswer,
    showLeaderboard,
    advanceQuestion,
    endGame,
    addCustomQuestion,
    resetSession,
    getStoredHostPin,
  };
}
