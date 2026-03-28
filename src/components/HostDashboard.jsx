import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameSync } from '../hooks/useGameSync';
import { useSession } from '../hooks/useSession';
import { BIBLE_QUESTIONS } from '../lib/questions';
import AnswerReveal from './AnswerReveal';
import FinalResults from './FinalResults';
import Leaderboard from './Leaderboard';
import PlayerCard from './PlayerCard';
import QuestionScreen from './QuestionScreen';

const EMPTY_CUSTOM_FORM = {
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correct: 'A',
  scripture: '',
};

function toQuestionShape(customQuestion) {
  return {
    question: customQuestion.question,
    options: Array.isArray(customQuestion.options) ? customQuestion.options : [],
    correct: customQuestion.correct,
    scripture: customQuestion.scripture || 'Custom Question',
  };
}

export default function HostDashboard() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { sessionData, players, answers, sessionQuestions, loading } = useGameSync(pin);
  const {
    startGame,
    revealAnswer,
    showLeaderboard,
    advanceQuestion,
    endGame,
    addCustomQuestion,
    resetSession,
    getStoredHostPin,
  } = useSession();

  const [actionError, setActionError] = useState('');
  const [transitionCountdown, setTransitionCountdown] = useState(0);
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM_FORM);
  const [customQuestionError, setCustomQuestionError] = useState('');
  const [customQuestionSaving, setCustomQuestionSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const revealHandledRef = useRef('');
  const leaderboardHandledRef = useRef('');

  const allQuestions = useMemo(() => {
    const custom = (sessionQuestions || []).map(toQuestionShape);
    return [...BIBLE_QUESTIONS, ...custom];
  }, [sessionQuestions]);

  const totalQuestions = allQuestions.length;

  useEffect(() => {
    if (pin) localStorage.setItem('bb_host_pin', pin);
  }, [pin]);

  useEffect(() => {
    const storedPin = getStoredHostPin();
    if (storedPin && storedPin !== pin) {
      navigate(`/host/${storedPin}`);
    }
  }, [getStoredHostPin, navigate, pin]);

  const sessionId = sessionData?.id;
  const currentIndex = sessionData?.current_question_index || 0;
  const currentQuestion = allQuestions[currentIndex];

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/play/${pin}`;
  }, [pin]);

  const answersForCurrentQuestion = useMemo(() => {
    const playersAnswered = new Set(
      answers.filter((answer) => answer.question_index === currentIndex).map((answer) => answer.player_id)
    );
    return playersAnswered.size;
  }, [answers, currentIndex]);

  const handleStartGame = useCallback(async () => {
    if (!sessionId || players.length === 0) return;

    setActionError('');
    try {
      await startGame(sessionId);
    } catch (error) {
      setActionError(error?.message || 'Unable to start the game.');
    }
  }, [players.length, sessionId, startGame]);

  const handleTimeUp = useCallback(async () => {
    if (!sessionId || sessionData?.status !== 'active') return;

    const key = `${sessionId}-${currentIndex}`;
    if (revealHandledRef.current === key) return;
    revealHandledRef.current = key;

    try {
      await revealAnswer(sessionId);
    } catch (error) {
      setActionError(error?.message || 'Failed to reveal answer.');
    }
  }, [currentIndex, revealAnswer, sessionData?.status, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    if (sessionData?.status === 'revealing') {
      const revealKey = `${sessionId}-${currentIndex}`;
      setTransitionCountdown(3);
      if (leaderboardHandledRef.current === revealKey) return;

      const timer = setInterval(() => {
        setTransitionCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      const timeout = setTimeout(async () => {
        leaderboardHandledRef.current = revealKey;
        await showLeaderboard(sessionId);
      }, 3000);

      return () => {
        clearInterval(timer);
        clearTimeout(timeout);
      };
    }

    if (sessionData?.status === 'leaderboard') {
      const leaderKey = `${sessionId}-${currentIndex}`;
      setTransitionCountdown(4);
      if (revealHandledRef.current === `${leaderKey}-advanced`) return;

      const timer = setInterval(() => {
        setTransitionCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      const timeout = setTimeout(async () => {
        revealHandledRef.current = `${leaderKey}-advanced`;
        const nextQuestionIndex = currentIndex + 1;

        if (nextQuestionIndex < totalQuestions) {
          await advanceQuestion(sessionId, nextQuestionIndex, true);
          return;
        }

        await endGame(sessionId);
      }, 4000);

      return () => {
        clearInterval(timer);
        clearTimeout(timeout);
      };
    }

    setTransitionCountdown(0);
    return undefined;
  }, [advanceQuestion, currentIndex, endGame, sessionData?.status, sessionId, showLeaderboard, totalQuestions]);

  const onPlayAgain = useCallback(async () => {
    if (!sessionId) return;
    setActionError('');
    try {
      await resetSession(sessionId);
      setCustomForm(EMPTY_CUSTOM_FORM);
      navigate(`/host/${pin}`);
    } catch (error) {
      setActionError(error?.message || 'Unable to reset game.');
    }
  }, [navigate, pin, resetSession, sessionId]);

  const handleCopyJoinLink = useCallback(async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setActionError('Could not copy join link.');
    }
  }, [joinUrl]);

  const updateCustomField = useCallback((field, value) => {
    setCustomForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddCustomQuestion = useCallback(async () => {
    if (!sessionId) return;

    setCustomQuestionError('');
    setCustomQuestionSaving(true);

    const optionMap = {
      A: customForm.optionA,
      B: customForm.optionB,
      C: customForm.optionC,
      D: customForm.optionD,
    };

    try {
      await addCustomQuestion(sessionId, {
        question: customForm.question,
        options: [customForm.optionA, customForm.optionB, customForm.optionC, customForm.optionD],
        correct: optionMap[customForm.correct],
        scripture: customForm.scripture,
      });
      setCustomForm(EMPTY_CUSTOM_FORM);
    } catch (error) {
      setCustomQuestionError(error?.message || 'Could not add custom question.');
    } finally {
      setCustomQuestionSaving(false);
    }
  }, [addCustomQuestion, customForm, sessionId]);

  if (loading) {
    return <div className="app-shell flex min-h-screen items-center justify-center bg-purple-900 text-2xl font-bold text-white">Loading game...</div>;
  }

  if (!sessionData) {
    return (
      <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-purple-900 px-4 text-center text-white">
        <h2 className="text-4xl font-black">Session not found</h2>
        <button type="button" onClick={() => navigate('/')} className="btn-base bg-white text-indigo-900">
          Back Home
        </button>
      </div>
    );
  }

  if (sessionData.status === 'active' && currentQuestion) {
    return (
      <div>
        <QuestionScreen
          question={currentQuestion}
          questionIndex={currentIndex}
          totalQuestions={totalQuestions}
          selectedOption={null}
          locked
          startTime={sessionData.question_start_time}
          onSelect={() => {}}
          onTimeUp={handleTimeUp}
          isSubmitting={false}
        />
        <div className="fixed bottom-4 left-1/2 z-20 w-[92%] max-w-lg -translate-x-1/2 rounded-2xl bg-black/50 px-4 py-3 text-center text-white backdrop-blur">
          <p className="font-semibold">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <p className="text-yellow-300">
            {answersForCurrentQuestion}/{players.length} answers received
          </p>
        </div>
      </div>
    );
  }

  if (sessionData.status === 'revealing' && currentQuestion) {
    return <AnswerReveal question={currentQuestion} playerAnswer={null} roundPoints={0} countdown={transitionCountdown || 3} />;
  }

  if (sessionData.status === 'leaderboard') {
    return <Leaderboard players={players} countdown={transitionCountdown || 4} />;
  }

  if (sessionData.status === 'finished') {
    return <FinalResults players={players} onPlayAgain={onPlayAgain} buttonLabel="Play Again" />;
  }

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-center text-4xl font-black">Host Dashboard</h1>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card border border-yellow-300/60 bg-yellow-300/20 text-center">
            <p className="text-xl font-semibold text-yellow-100">Game PIN:</p>
            <p className="text-5xl font-black tracking-[0.25em] md:text-7xl">{pin}</p>
            <p className="mt-3 text-yellow-100">Question deck: {totalQuestions}</p>
          </div>

          <div className="card flex flex-col items-center border border-white/20 bg-white/10 text-center">
            <p className="text-sm font-semibold text-white/80">Scan to join instantly</p>
            {joinUrl ? <QRCodeSVG value={joinUrl} size={160} bgColor="transparent" fgColor="#f9fafb" className="mt-3 rounded-lg bg-black/20 p-2" /> : null}
            <p className="mt-3 break-all text-xs text-white/80">{joinUrl}</p>
            <button type="button" onClick={handleCopyJoinLink} className="btn-base mt-3 bg-white text-indigo-900">
              {copied ? 'Copied!' : 'Copy Join Link'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
          <p className="font-semibold">{players.length} Players Joined</p>
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-sm font-bold text-purple-900">Live</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-xl font-bold">Players</h2>
            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {players.length > 0 ? (
                players.map((player) => <PlayerCard key={player.id} player={player} />)
              ) : (
                <div className="card border border-white/20 bg-white/10 text-center text-white/80">Players will appear here as they join.</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold">Add Personal Questions</h2>
            <div className="card border border-white/20 bg-white/10">
              <div className="space-y-3">
                <input
                  value={customForm.question}
                  onChange={(event) => updateCustomField('question', event.target.value)}
                  placeholder="Custom question"
                  className="input-base border-white/30 bg-white text-indigo-900"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input value={customForm.optionA} onChange={(event) => updateCustomField('optionA', event.target.value)} placeholder="Option A" className="input-base border-white/30 bg-white text-indigo-900" />
                  <input value={customForm.optionB} onChange={(event) => updateCustomField('optionB', event.target.value)} placeholder="Option B" className="input-base border-white/30 bg-white text-indigo-900" />
                  <input value={customForm.optionC} onChange={(event) => updateCustomField('optionC', event.target.value)} placeholder="Option C" className="input-base border-white/30 bg-white text-indigo-900" />
                  <input value={customForm.optionD} onChange={(event) => updateCustomField('optionD', event.target.value)} placeholder="Option D" className="input-base border-white/30 bg-white text-indigo-900" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={customForm.correct}
                    onChange={(event) => updateCustomField('correct', event.target.value)}
                    className="input-base border-white/30 bg-white text-indigo-900"
                  >
                    <option value="A">Correct: A</option>
                    <option value="B">Correct: B</option>
                    <option value="C">Correct: C</option>
                    <option value="D">Correct: D</option>
                  </select>
                  <input
                    value={customForm.scripture}
                    onChange={(event) => updateCustomField('scripture', event.target.value)}
                    placeholder="Scripture reference (optional)"
                    className="input-base border-white/30 bg-white text-indigo-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomQuestion}
                  disabled={customQuestionSaving}
                  className="btn-base w-full bg-gradient-to-r from-emerald-400 to-green-500 text-indigo-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {customQuestionSaving ? 'Saving...' : 'Add Custom Question'}
                </button>
                {customQuestionError ? <p className="rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-100">{customQuestionError}</p> : null}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartGame}
          disabled={players.length === 0}
          title={players.length === 0 ? 'At least one player is required to start.' : ''}
          className="btn-base mt-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-purple-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Game
        </button>

        {actionError ? <p className="rounded-xl bg-red-500/20 px-4 py-2 text-red-100">{actionError}</p> : null}
      </div>
    </div>
  );
}
