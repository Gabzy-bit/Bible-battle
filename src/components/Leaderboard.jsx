import { useMemo } from 'react';
import PlayerCard from './PlayerCard';

const PODIUM_STYLES = [
  'border-yellow-300 bg-yellow-400/20',
  'border-gray-300 bg-gray-300/20',
  'border-amber-600 bg-amber-700/20',
];

const BADGES = ['👑', '🥈', '🥉'];

export default function Leaderboard({ players, countdown = 4 }) {
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => (b.score || 0) - (a.score || 0) || (a.created_at > b.created_at ? 1 : -1)),
    [players]
  );

  const topThree = sortedPlayers.slice(0, 3);
  const others = sortedPlayers.slice(3);

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <h2 className="text-center text-4xl font-black">🏆 Leaderboard</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {topThree.map((player, idx) => (
            <div key={player.id} className={`card fade-in-up border ${PODIUM_STYLES[idx]} ${idx === 0 ? 'md:scale-105' : ''}`}>
              <p className="text-3xl">{BADGES[idx]}</p>
              <p className="text-xl font-bold">{player.name}</p>
              <p className="text-3xl font-black text-yellow-300">{player.score}</p>
            </div>
          ))}
        </div>

        <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
          {others.map((player, index) => (
            <PlayerCard key={player.id} player={player} rank={index + 4} />
          ))}
        </div>

        <p className="text-center text-lg text-yellow-200">Next question in {countdown}...</p>
      </div>
    </div>
  );
}
