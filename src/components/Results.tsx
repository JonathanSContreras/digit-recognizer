'use client';

import { ModelStatus, Prediction } from '@/lib/types';

interface ResultsProps {
  predictions: Prediction[];
  inferenceMs: number | null;
  modelStatus: ModelStatus;
  onRetry: () => void;
}

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

export default function Results({ predictions, inferenceMs, modelStatus, onRetry }: ResultsProps) {
  if (modelStatus === 'error') {
    return (
      <div className="rounded-lg bg-secondary p-6 text-center" role="alert">
        <p className="text-red-400">Couldn&apos;t load the model.</p>
        <button type="button" onClick={onRetry} className="mt-3 rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600">
          Retry
        </button>
      </div>
    );
  }

  const top = predictions[0];
  const byDigit = new Map(predictions.map((p) => [p.label, p.probability]));

  return (
    <div className="rounded-lg bg-secondary p-6 shadow-md" aria-live="polite">
      <div className="text-center">
        {modelStatus === 'loading' ? (
          <p className="py-4 text-gray-300">Loading model&hellip;</p>
        ) : top ? (
          <>
            <p className="text-sm uppercase tracking-widest text-gray-400">Prediction</p>
            <p className="font-display text-7xl font-bold text-accent">{top.label}</p>
            <p className="text-sm text-gray-400">{(top.probability * 100).toFixed(1)}% confident</p>
          </>
        ) : (
          <p className="py-4 text-gray-300">Draw a digit on the canvas to see a prediction.</p>
        )}
      </div>

      <ol className="mt-6 space-y-1.5" aria-label="Probability for each digit">
        {DIGITS.map((digit) => {
          const p = byDigit.get(digit) ?? 0;
          const isTop = top?.label === digit;
          return (
            <li key={digit} className="flex items-center gap-3">
              <span className={`w-4 font-mono font-bold ${isTop ? 'text-white' : 'text-gray-400'}`}>{digit}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-700">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${isTop ? 'bg-accent' : 'bg-gray-500'}`}
                  style={{ width: `${p * 100}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-xs text-gray-400">{(p * 100).toFixed(1)}%</span>
            </li>
          );
        })}
      </ol>

      {inferenceMs !== null && (
        <p className="mt-4 text-center text-xs text-gray-500">
          Preprocessing + inference: {inferenceMs.toFixed(1)} ms
        </p>
      )}
    </div>
  );
}
