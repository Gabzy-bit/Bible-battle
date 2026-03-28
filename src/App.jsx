import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import AnswerReveal from './components/AnswerReveal';
import FinalResults from './components/FinalResults';
import HomePage from './components/HomePage';
import HostDashboard from './components/HostDashboard';
import Leaderboard from './components/Leaderboard';
import PlayerWaiting from './components/PlayerWaiting';
import QuestionScreen from './components/QuestionScreen';
import { useGameSync } from './hooks/useGameSync';
import { usePlayer } from './hooks/usePlayer';
import { BIBLE_QUESTIONS } from './lib/questions';
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabase';

function PlayerGameRoute() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { sessionData, players, answers, sessionQuestions, loading } = useGameSync(pin);

  const [playerContext, setPlayerContext] = useState({
    playerId: null,
    sessionId: null,
    pin: null,
    name: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [retryOption, setRetryOption] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const { restoreFromLocalStorage, submitAnswer, clearPlayerStorage } = usePlayer(
    playerContext.playerId,
    playerContext.sessionId
  );

  useEffect(() => {
    const restored = restoreFromLocalStorage();

    if (!restored.playerId || !restored.sessionId || !restored.pin) {
      navigate('/');
      return;
    }

    if (restored.pin !== pin) {
      clearPlayerStorage();
      navigate('/');
      return;
    }

    setPlayerContext(restored);
  }, [clearPlayerStorage, navigate, pin, restoreFromLocalStorage]);

  useEffect(() => {
    if (loading) return;
    if (!sessionData) {
      clearPlayerStorage();
      navigate('/');
    }
  }, [clearPlayerStorage, loading, navigate, sessionData]);

  useEffect(() => {
    if (!sessionData?.status) return;

    if (sessionData.status === 'revealing') {
      setCountdown(3);
      const timer = setInterval(() => setCountdown((prev) => Math.max(0, prev - 1)), 1000);
      return () => clearInterval(timer);
    }

    if (sessionData.status === 'leaderboard') {
      setCountdown(4);
      const timer = setInterval(() => setCountdown((prev) => Math.max(0, prev - 1)), 1000);
      return () => clearInterval(timer);
    }

    setCountdown(0);
    return undefined;
  }, [sessionData?.status]);

  const allQuestions = useMemo(() => {
    const custom = (sessionQuestions || []).map((question) => ({
      question: question.question,
      options: Array.isArray(question.options) ? question.options : [],
      correct: question.correct,
      scripture: question.scripture || 'Custom Question',
    }));

    return [...BIBLE_QUESTIONS, ...custom];
  }, [sessionQuestions]);

  const currentQuestion = useMemo(() => {
    const index = sessionData?.current_question_index ?? 0;
    return allQuestions[index];
  }, [allQuestions, sessionData?.current_question_index]);

  const playerAnswer = useMemo(() => {
    if (!playerContext.playerId || !sessionData) return null;

    return (
      answers.find(
        (answer) =>
          answer.player_id === playerContext.playerId &&
          answer.question_index === sessionData.current_question_index
      ) || null
    );
  }, [answers, playerContext.playerId, sessionData]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => (b.score || 0) - (a.score || 0) || (a.created_at > b.created_at ? 1 : -1)),
    [players]
  );

  const handleSubmitAnswer = useCallback(
    async (selectedOption) => {
      if (!currentQuestion || !sessionData?.question_start_time || !sessionData) return;
      if (playerAnswer) return;

      setSubmitError('');
      setIsSubmitting(true);
      setRetryOption(null);

      try {
        const startMs = new Date(sessionData.question_start_time).getTime();
        const timeTakenMs = Math.max(0, Date.now() - startMs);

        await submitAnswer(
          sessionData.current_question_index,
          selectedOption,
          timeTakenMs,
          currentQuestion.correct
        );
      } catch (error) {
        setSubmitError('Network error on answer submit. Please retry.');
        setRetryOption(selectedOption);
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentQuestion, playerAnswer, sessionData, submitAnswer]
  );

  const playerName = playerContext.name || 'Player';

  if (loading || !playerContext.playerId) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center bg-purple-900 text-2xl font-bold text-white">
        Loading your battle...
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  if (sessionData.status === 'waiting') {
    return <PlayerWaiting playerName={playerName} pin={pin} />;
  }

  if (sessionData.status === 'active' && currentQuestion) {
    return (
      <QuestionScreen
        question={currentQuestion}
        questionIndex={sessionData.current_question_index}
        totalQuestions={allQuestions.length}
        selectedOption={playerAnswer?.selected_option || null}
        locked={Boolean(playerAnswer)}
        startTime={sessionData.question_start_time}
        onSelect={handleSubmitAnswer}
        onTimeUp={() => {}}
        submitError={submitError}
        isSubmitting={isSubmitting}
        onRetry={retryOption ? () => handleSubmitAnswer(retryOption) : null}
      />
    );
  }

  if (sessionData.status === 'revealing' && currentQuestion) {
    return (
      <AnswerReveal
        question={currentQuestion}
        playerAnswer={playerAnswer}
        roundPoints={playerAnswer?.points_earned || 0}
        countdown={countdown || 3}
      />
    );
  }

  if (sessionData.status === 'leaderboard') {
    return <Leaderboard players={sortedPlayers} countdown={countdown || 4} />;
  }

  if (sessionData.status === 'finished') {
    return (
      <FinalResults
        players={sortedPlayers}
        onPlayAgain={() => {
          clearPlayerStorage();
          navigate('/');
        }}
        buttonLabel="Back Home"
      />
    );
  }

  return <Navigate to="/" replace />;
}

export default function App() {
  if (!isSupabaseConfigured || supabaseConfigError) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 px-4 text-white">
        <div className="card w-full max-w-2xl border border-red-200/40 bg-red-500/20 text-center">
          <h1 className="text-3xl font-black">Configuration Required</h1>
          <p className="mt-3 text-lg text-red-100">
            Bible Battle could not initialize Supabase. Add your Vercel environment variables and redeploy.
          </p>
          <div className="mt-6 rounded-xl bg-black/30 p-4 text-left text-sm text-red-100">
            <p>Required variables:</p>
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
            {supabaseConfigError ? <p className="mt-2">Error: {supabaseConfigError}</p> : null}
            <p className="mt-3">Vercel path: Project Settings to Environment Variables, add both keys, then Redeploy.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/host/:pin" element={<HostDashboard />} />
        <Route path="/play/:pin" element={<PlayerGameRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
