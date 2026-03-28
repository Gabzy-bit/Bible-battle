const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function AnswerReveal({ question, playerAnswer, roundPoints, countdown = 3 }) {
  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h2 className="text-center text-4xl font-black">Answer Reveal</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {question.options.map((option, index) => {
            const isCorrect = option === question.correct;
            const isPlayerChoice = option === playerAnswer?.selected_option;
            const wrongChoice = isPlayerChoice && !playerAnswer?.is_correct;
            return (
              <div
                key={option}
                className={`card border ${
                  isCorrect
                    ? 'border-green-300 bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                    : wrongChoice
                    ? 'border-red-300 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                    : 'border-white/20 bg-white/10'
                }`}
              >
                <p className="text-lg font-bold">
                  {OPTION_LABELS[index]}. {option}{' '}
                  {isCorrect ? <span>✅</span> : null}
                  {wrongChoice ? <span> ❌</span> : null}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xl italic text-yellow-200">{question.scripture}</p>

        <p className="text-center text-4xl font-black text-yellow-300 animate-pulse">+{roundPoints || 0} points</p>

        <p className="text-center text-lg text-white/90">Next up in {countdown}...</p>
      </div>
    </div>
  );
}
