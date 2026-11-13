'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

type Point = { x: number; y: number };

export interface DrawingCanvasHandle {
  clear: () => void;
  undo: () => void;
  /** Current pixels, or null if nothing has been drawn. */
  getImageData: () => ImageData | null;
}

interface DrawingCanvasProps {
  size: number;
  strokeSize: number;
  isInverted: boolean;
  /** Fired whenever the drawing changes (stroke finished, undo, clear, recolor). */
  onChange: () => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas(
  { size, strokeSize, isInverted, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const currentStroke = useRef<Point[] | null>(null);

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.fillStyle = isInverted ? 'black' : 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = isInverted ? 'white' : 'black';
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const all = currentStroke.current ? [...strokes, currentStroke.current] : strokes;
    for (const stroke of all) {
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      // A single tap still draws a dot.
      for (const p of stroke.length > 1 ? stroke : [stroke[0], stroke[0]]) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }, [strokes, isInverted, strokeSize, size]);

  useEffect(() => {
    render();
    onChange();
  }, [render, onChange]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => setStrokes([]),
      undo: () => setStrokes((s) => s.slice(0, -1)),
      getImageData: () => {
        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
        return strokes.length > 0 && ctx ? ctx.getImageData(0, 0, size, size) : null;
      },
    }),
    [strokes, size],
  );

  // Map from CSS pixels to canvas pixels so drawing works when the canvas is scaled down.
  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * size,
      y: ((e.clientY - rect.top) / rect.height) * size,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    currentStroke.current = [toCanvasPoint(e)];
    render();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke.current) return;
    currentStroke.current.push(toCanvasPoint(e));
    render();
  };

  const handlePointerUp = () => {
    const stroke = currentStroke.current;
    currentStroke.current = null;
    if (stroke) setStrokes((s) => [...s, stroke]);
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label="Drawing area. Draw a single digit from 0 to 9."
      role="img"
      className="aspect-square w-full max-w-[384px] cursor-crosshair touch-none rounded-lg border-2 border-accent shadow-lg"
    />
  );
});

export default DrawingCanvas;
