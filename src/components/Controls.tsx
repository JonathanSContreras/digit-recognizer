'use client';

interface ControlsProps {
  onClear: () => void;
  onUndo: () => void;
  strokeSize: number;
  onStrokeSizeChange: (size: number) => void;
  isInverted: boolean;
  onInvertChange: (inverted: boolean) => void;
}

const buttonClass =
  'rounded-lg border border-gray-600 bg-gray-700 p-3 text-lg font-semibold text-white shadow-md transition hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-accent';

export default function Controls({
  onClear,
  onUndo,
  strokeSize,
  onStrokeSizeChange,
  isInverted,
  onInvertChange,
}: ControlsProps) {
  return (
    <div className="mt-4 w-full max-w-[384px] space-y-4 rounded-lg bg-secondary p-4 shadow-md">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClear} className={buttonClass} aria-keyshortcuts="C">
          Clear <kbd className="text-sm text-gray-400">C</kbd>
        </button>
        <button type="button" onClick={onUndo} className={buttonClass} aria-keyshortcuts="U Control+Z Meta+Z">
          Undo <kbd className="text-sm text-gray-400">U</kbd>
        </button>
      </div>
      <div className="flex items-center gap-4">
        <label htmlFor="stroke-size" className="shrink-0 text-sm text-gray-300">
          Stroke size
        </label>
        <input
          id="stroke-size"
          type="range"
          min="8"
          max="40"
          value={strokeSize}
          onChange={(e) => onStrokeSizeChange(Number(e.target.value))}
          className="w-full cursor-pointer accent-accent"
        />
      </div>
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm text-gray-300">Invert colors</span>
        <input
          type="checkbox"
          role="switch"
          checked={isInverted}
          onChange={(e) => onInvertChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 rounded-full bg-gray-600 transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}
