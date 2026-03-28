import { useEffect, useMemo, useRef, useState } from 'react';

function getRemainingSeconds(totalSeconds, startTime) {
  if (!startTime) return totalSeconds;
  const elapsedMs = Date.now() - new Date(startTime).getTime();
  const elapsedSeconds = Math.max(0, elapsedMs / 1000);
  return Math.max(0, totalSeconds - elapsedSeconds);
}

export default function TimerBar({ totalSeconds, startTime, onTimeUp }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(totalSeconds, startTime));
  const hasFiredRef = useRef(false);

  useEffect(() => {
    hasFiredRef.current = false;
    setRemaining(getRemainingSeconds(totalSeconds, startTime));

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = getRemainingSeconds(totalSeconds, startTime);
        if (next <= 0 && !hasFiredRef.current) {
          hasFiredRef.current = true;
          onTimeUp?.();
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [onTimeUp, startTime, totalSeconds]);

  const progress = useMemo(() => (remaining / totalSeconds) * 100, [remaining, totalSeconds]);

  const barColor = useMemo(() => {
    if (remaining <= 5) return 'bg-red-500';
    if (remaining <= 10) return 'bg-yellow-400';
    return 'bg-green-500';
  }, [remaining]);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm font-semibold text-white/90">
        <span>Time Left</span>
        <span className="text-xl font-black tabular-nums">{Math.ceil(remaining)}</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.max(0, progress)}%` }}
        />
      </div>
    </div>
  );
}
