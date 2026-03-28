export default function PlayerCard({ player, rank, highlight = false }) {
  return (
    <div
      className={`card fade-in-up flex items-center justify-between border border-white/20 ${
        highlight ? 'bg-yellow-300/20' : 'bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        {typeof rank === 'number' ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-bold text-white">
            {rank}
          </span>
        ) : null}
        <p className="text-lg font-semibold text-white">{player.name}</p>
      </div>
      <p className="text-xl font-black text-yellow-300">{player.score ?? 0}</p>
    </div>
  );
}
