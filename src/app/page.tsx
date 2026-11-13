'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Controls from '@/components/Controls';
import DrawingCanvas, { DrawingCanvasHandle } from '@/components/DrawingCanvas';
import Results from '@/components/Results';
import { loadModel, predict } from '@/lib/inference';
import { MNIST_SIZE, preprocess, toPreviewPixels } from '@/lib/preprocess';
import { ModelStatus, Prediction } from '@/lib/types';
import metrics from '../../public/model/metrics.json';

const CANVAS_SIZE = 384;
const REPO_URL = 'https://github.com/JonathanSContreras/digit-recognizer';


export default function HomePage() {
  const [strokeSize, setStrokeSize] = useState(24);
  const [isInverted, setIsInverted] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading');

  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const requestId = useRef(0);

  const startModelLoad = useCallback(() => {
    setModelStatus('loading');
    loadModel()
      .then(() => setModelStatus('ready'))
      .catch((error) => {
        console.error('Failed to load model:', error);
        setModelStatus('error');
      });
  }, []);

  useEffect(startModelLoad, [startModelLoad]);

  // Re-runs on every finished stroke, undo, clear, or color change.
  const handleDrawingChange = useCallback(async () => {
    const id = ++requestId.current;
    const imageData = canvasRef.current?.getImageData() ?? null;
    const input = imageData ? preprocess(imageData, isInverted) : null;

    const previewCtx = previewRef.current?.getContext('2d');
    if (previewCtx) {
      previewCtx.fillStyle = 'black';
      previewCtx.fillRect(0, 0, MNIST_SIZE, MNIST_SIZE);
      if (input) previewCtx.putImageData(new ImageData(toPreviewPixels(input), MNIST_SIZE, MNIST_SIZE), 0, 0);
    }

    if (!input) {
      setPredictions([]);
      setInferenceMs(null);
      return;
    }
    if (modelStatus !== 'ready') return;

    const start = performance.now();
    const results = await predict(input);
    // Ignore results from a drawing that has since changed.
    if (id !== requestId.current) return;
    setPredictions(results);
    setInferenceMs(performance.now() - start);
  }, [isInverted, modelStatus]);

  const clear = useCallback(() => canvasRef.current?.clear(), []);
  const undo = useCallback(() => canvasRef.current?.undo(), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault();
        undo();
      } else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (key === 'c') clear();
        if (key === 'u') undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clear, undo]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-8">
      <header className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Digit Recognizer</h1>
        <p className="mt-3 text-gray-400">
          Draw a digit from 0 to 9. A convolutional neural network running in your browser will guess it.
        </p>
      </header>

      <div className="grid w-full gap-8 md:grid-cols-[minmax(0,384px)_minmax(0,1fr)] md:justify-center">
        <section className="flex flex-col items-center" aria-label="Drawing">
          <DrawingCanvas
            ref={canvasRef}
            size={CANVAS_SIZE}
            strokeSize={strokeSize}
            isInverted={isInverted}
            onChange={handleDrawingChange}
          />
          <Controls
            onClear={clear}
            onUndo={undo}
            strokeSize={strokeSize}
            onStrokeSizeChange={setStrokeSize}
            isInverted={isInverted}
            onInvertChange={setIsInverted}
          />
        </section>

        <section className="flex flex-col gap-4" aria-label="Prediction">
          <div className="flex items-center gap-4 rounded-lg bg-secondary p-4">
            <canvas
              ref={previewRef}
              width={MNIST_SIZE}
              height={MNIST_SIZE}
              className="h-28 w-28 shrink-0 rounded-md border border-gray-600 bg-black [image-rendering:pixelated]"
              aria-label="What the model sees: your drawing downscaled to 28 by 28 pixels"
            />
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-gray-200">What the model sees.</span> Your drawing is cropped,
              scaled to 20&times;20 and centered by mass in a 28&times;28 frame, the same way MNIST was made.
            </p>
          </div>
          <Results
            predictions={predictions}
            inferenceMs={inferenceMs}
            modelStatus={modelStatus}
            onRetry={startModelLoad}
          />
        </section>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Trained on MNIST &middot; {(metrics.testAccuracy * 100).toFixed(2)}% test accuracy &middot; TensorFlow.js
        &middot;{' '}
        <a href={REPO_URL} className="text-gray-300 underline underline-offset-4 hover:text-white">
          Source on GitHub
        </a>
      </footer>
    </main>
  );
}
