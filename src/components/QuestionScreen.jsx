import { useMemo } from 'react';
import TimerBar from './TimerBar';

const OPTION_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500 text-gray-900', 'bg-green-500'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuestionScreen({
  question,
  questionIndex,
  totalQuestions,
  selectedOption,
  locked,
  startTime,
  onSelect,
  onTimeUp,
  submitError,
  isSubmitting,
  onRetry,
}) {
  const lockedState = useMemo(() => locked || isSubmitting, [isSubmitting, locked]);

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <p className="text-center text-2xl font-bold text-yellow-300">
          Question {questionIndex + 1} of {totalQuestions}
        </p>

        <TimerBar totalSeconds={15} startTime={startTime} onTimeUp={onTimeUp} />

        <div className="card border border-white/20 bg-white/10">
          <h2 className="text-center text-3xl font-black md:text-4xl">{question.question}</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === option;
            return (
              <button
                key={option}
                type="button"
                disabled={lockedState}
                onClick={() => onSelect(option)}
                className={`btn-base min-h-20 justify-start text-left ${OPTION_COLORS[index]} ${
                  lockedState ? 'opacity-60 pointer-events-none' : ''
                } ${isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-transparent' : ''}`}
              >
                <span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/20 font-black">
                  {OPTION_LABELS[index]}
                </span>
                <span className="text-lg font-bold">{option}</span>
              </button>
            );
          })}
        </div>

        {submitError ? (
          <div className="card border border-red-200/40 bg-red-500/20 text-center">
            <p className="font-semibold text-red-100">{submitError}</p>
            {onRetry ? (
              <button type="button" onClick={onRetry} className="btn-base mt-4 bg-red-600 px-5 py-2 text-base">
                Retry Submit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
