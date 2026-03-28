import { useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { QUESTION_TIME, calculatePoints } from '../lib/scoring';

const PLAYER_ID_KEY = 'bb_player_id';
const SESSION_ID_KEY = 'bb_session_id';
const PLAYER_PIN_KEY = 'bb_player_pin';
const PLAYER_NAME_KEY = 'bb_player_name';

export function usePlayer(playerId, sessionId) {
  const storageKeys = useMemo(
    () => ({
      playerId: PLAYER_ID_KEY,
      sessionId: SESSION_ID_KEY,
      pin: PLAYER_PIN_KEY,
      name: PLAYER_NAME_KEY,
    }),
    []
  );

  const joinSession = useCallback(async (name, pin) => {
    const trimmedName = name.trim();
    const normalizedPin = pin.trim();

    if (!trimmedName) throw new Error('Please enter your name');
    if (!/^\d{6}$/.test(normalizedPin)) throw new Error('PIN must be 6 digits');

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('pin', normalizedPin)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Game not found');
    if (session.status !== 'waiting') throw new Error('Sorry, this game has already started');

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({ session_id: session.id, name: trimmedName })
      .select()
      .single();

    if (playerError) throw playerError;

    localStorage.setItem(storageKeys.playerId, player.id);
    localStorage.setItem(storageKeys.sessionId, session.id);
    localStorage.setItem(storageKeys.pin, normalizedPin);
    localStorage.setItem(storageKeys.name, trimmedName);

    return { player, session };
  }, [storageKeys]);

  const submitAnswer = useCallback(
    async (questionIndex, selectedOption, timeTakenMs, correctOption) => {
      if (!playerId || !sessionId) {
        throw new Error('Missing player session details. Please rejoin the game.');
      }

      const { data: existingAnswer, error: checkError } = await supabase
        .from('answers')
        .select('*')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingAnswer) return { duplicate: true, answer: existingAnswer };

      const isCorrect = selectedOption === correctOption;
      const timeRemainingSeconds = Math.max(0, QUESTION_TIME - timeTakenMs / 1000);
      const pointsEarned = calculatePoints(isCorrect, timeRemainingSeconds);

      const { data: insertedAnswer, error: answerError } = await supabase
        .from('answers')
        .insert({
          player_id: playerId,
          session_id: sessionId,
          question_index: questionIndex,
          selected_option: selectedOption,
          is_correct: isCorrect,
          time_taken_ms: Math.max(0, Math.floor(timeTakenMs)),
          points_earned: pointsEarned,
        })
        .select()
        .single();

      if (answerError) throw answerError;

      const { data: currentPlayer, error: playerFetchError } = await supabase
        .from('players')
        .select('score')
        .eq('id', playerId)
        .single();

      if (playerFetchError) throw playerFetchError;

      const { error: updateScoreError } = await supabase
        .from('players')
        .update({ score: (currentPlayer?.score || 0) + pointsEarned })
        .eq('id', playerId);

      if (updateScoreError) throw updateScoreError;

      return { duplicate: false, answer: insertedAnswer };
    },
    [playerId, sessionId]
  );

  const restoreFromLocalStorage = useCallback(() => {
    const storedPlayerId = localStorage.getItem(storageKeys.playerId);
    const storedSessionId = localStorage.getItem(storageKeys.sessionId);
    const storedPin = localStorage.getItem(storageKeys.pin);
    const storedName = localStorage.getItem(storageKeys.name);

    return {
      playerId: storedPlayerId,
      sessionId: storedSessionId,
      pin: storedPin,
      name: storedName,
    };
  }, [storageKeys]);

  const clearPlayerStorage = useCallback(() => {
    localStorage.removeItem(storageKeys.playerId);
    localStorage.removeItem(storageKeys.sessionId);
    localStorage.removeItem(storageKeys.pin);
    localStorage.removeItem(storageKeys.name);
  }, [storageKeys]);

  return {
    joinSession,
    submitAnswer,
    restoreFromLocalStorage,
    clearPlayerStorage,
  };
}
