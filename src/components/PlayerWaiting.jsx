export default function PlayerWaiting({ playerName, pin }) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 px-4 text-white">
      <div className="card w-full max-w-xl border border-white/20 bg-white/10 text-center">
        <p className="mb-2 text-2xl">📖 Bible Battle</p>
        <h2 className="text-4xl font-black">Waiting for host...</h2>
        <div className="mt-2 flex justify-center gap-1 text-3xl text-yellow-300">
          <span className="animate-bounce [animation-delay:0ms]">.</span>
          <span className="animate-bounce [animation-delay:150ms]">.</span>
          <span className="animate-bounce [animation-delay:300ms]">.</span>
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-sm text-white/70">Player</p>
            <p className="text-2xl font-bold">{playerName || 'Player'}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-sm text-white/70">Joined PIN</p>
            <p className="text-4xl font-black tracking-[0.3em]">{pin}</p>
          </div>
        </div>

        <p className="mt-6 animate-pulse text-sm text-yellow-200">Get ready for the next question!</p>
      </div>
    </div>
  );
}
