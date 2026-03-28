import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../hooks/usePlayer';
import { useSession } from '../hooks/useSession';

export default function HomePage() {
  const navigate = useNavigate();
  const { createSession, getStoredHostPin } = useSession();
  const { joinSession } = usePlayer();

  const [isJoining, setIsJoining] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const queryPin = (url.searchParams.get('pin') || '').replace(/\D/g, '').slice(0, 6);
    if (queryPin) {
      setPin(queryPin);
      setIsJoining(true);
    }
  }, []);

  const continueHostPin = useMemo(() => getStoredHostPin(), [getStoredHostPin]);

  const handleHostGame = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { pin: createdPin } = await createSession();
      navigate(`/host/${createdPin}`);
    } catch (hostError) {
      setError(hostError?.message || 'Could not create game. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [createSession, navigate]);

  const handleJoin = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const normalizedPin = pin.trim();
      await joinSession(name, normalizedPin);
      navigate(`/play/${normalizedPin}`);
    } catch (joinError) {
      setError(joinError?.message || 'Unable to join right now.');
    } finally {
      setLoading(false);
    }
  }, [joinSession, name, navigate, pin]);

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[90vh] w-full max-w-4xl flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-6xl">📖</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Bible Battle</h1>
          <p className="mt-4 text-xl text-white/80">The Ultimate Bible Quiz Game</p>
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-4 md:flex-row">
          <button
            type="button"
            onClick={handleHostGame}
            disabled={loading}
            className="btn-base flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-purple-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Host Game
          </button>

          <button
            type="button"
            onClick={() => setIsJoining((prev) => !prev)}
            className="btn-base flex-1 bg-white text-indigo-900"
          >
            Join Game
          </button>
        </div>

        {continueHostPin ? (
          <button
            type="button"
            onClick={() => navigate(`/host/${continueHostPin}`)}
            className="rounded-xl border border-yellow-300/60 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-300/20"
          >
            Continue previous host game ({continueHostPin})
          </button>
        ) : null}

        {isJoining ? (
          <div className="card w-full max-w-2xl border border-white/20 bg-white/10">
            <div className="space-y-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="input-base border-white/30 bg-white text-indigo-900 placeholder:text-indigo-500"
              />
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit PIN"
                inputMode="numeric"
                maxLength={6}
                className="input-base border-white/30 bg-white text-indigo-900 placeholder:text-indigo-500"
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={loading}
                className="btn-base w-full bg-gradient-to-r from-emerald-400 to-green-500 text-indigo-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Join Battle
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">{error}</p> : null}
      </div>
    </div>
  );
}
