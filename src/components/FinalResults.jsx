import { useEffect, useMemo } from 'react';
import PlayerCard from './PlayerCard';

export default function FinalResults({ players, onPlayAgain, buttonLabel = 'Play Again' }) {
  const sorted = useMemo(
    () => [...players].sort((a, b) => (b.score || 0) - (a.score || 0) || (a.created_at > b.created_at ? 1 : -1)),
    [players]
  );

  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  useEffect(() => {
    let mounted = true;

    const launch = async () => {
      const confettiModule = await import('canvas-confetti');
      const confetti = confettiModule.default;
      if (!mounted) return;

      confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 } });
      setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { x: 0.2, y: 0.65 } }), 300);
      setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { x: 0.8, y: 0.65 } }), 450);
    };

    launch();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <h1 className="text-center text-5xl font-black">🎉 Bible Battle Complete!</h1>

        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          <div className="card border border-gray-300 bg-gray-300/20 text-center md:order-1">
            <p className="text-3xl">🥈</p>
            <p className="text-xl font-bold">{second?.name || '-'}</p>
            <p className="text-2xl font-black text-yellow-300">{second?.score || 0}</p>
          </div>
          <div className="card border border-yellow-300 bg-yellow-400/20 text-center md:order-2 md:scale-110">
            <p className="text-4xl">👑</p>
            <p className="text-2xl font-bold">{first?.name || '-'}</p>
            <p className="text-3xl font-black text-yellow-300">{first?.score || 0}</p>
          </div>
          <div className="card border border-amber-700 bg-amber-700/20 text-center md:order-3">
            <p className="text-3xl">🥉</p>
            <p className="text-xl font-bold">{third?.name || '-'}</p>
            <p className="text-2xl font-black text-yellow-300">{third?.score || 0}</p>
          </div>
        </div>

        <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
          {sorted.map((player, index) => (
            <PlayerCard key={player.id} player={player} rank={index + 1} highlight={index === 0} />
          ))}
        </div>

        {onPlayAgain ? (
          <div className="flex justify-center">
            <button type="button" onClick={onPlayAgain} className="btn-base bg-gradient-to-r from-yellow-400 to-amber-500 text-purple-900">
              {buttonLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
