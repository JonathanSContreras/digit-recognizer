import { describe, expect, it } from 'vitest';
import { MNIST_SIZE, normalizeDigit, toInk, toPreviewPixels } from './preprocess';

/** Builds an ink map with a filled rectangle of ink. */
function inkWithRect(size: number, x: number, y: number, w: number, h: number) {
  const ink = new Float32Array(size * size);
  for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) ink[r * size + c] = 1;
  return ink;
}

function boundingBox(img: Float32Array) {
  let minX = MNIST_SIZE, minY = MNIST_SIZE, maxX = -1, maxY = -1;
  for (let y = 0; y < MNIST_SIZE; y++) {
    for (let x = 0; x < MNIST_SIZE; x++) {
      if (img[y * MNIST_SIZE + x] > 0.1) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
}

function centerOfMass(img: Float32Array) {
  let mass = 0, sx = 0, sy = 0;
  img.forEach((v, i) => {
    mass += v;
    sx += v * (i % MNIST_SIZE);
    sy += v * Math.floor(i / MNIST_SIZE);
  });
  return { x: sx / mass, y: sy / mass };
}

describe('toInk', () => {
  const white = [255, 255, 255, 255];
  const black = [0, 0, 0, 255];
  const rgba = new Uint8ClampedArray([...white, ...black]);

  it('treats dark pixels as ink on a light background', () => {
    expect(Array.from(toInk(rgba, 2, 1, false))).toEqual([0, 1]);
  });

  it('treats light pixels as ink when inverted', () => {
    expect(Array.from(toInk(rgba, 2, 1, true))).toEqual([1, 0]);
  });
});

describe('normalizeDigit', () => {
  it('returns null for an empty drawing', () => {
    expect(normalizeDigit(new Float32Array(100 * 100), 100, 100)).toBeNull();
  });

  it('outputs a 28x28 image with values in [0, 1]', () => {
    const out = normalizeDigit(inkWithRect(100, 10, 10, 30, 60), 100, 100)!;
    expect(out).toHaveLength(MNIST_SIZE * MNIST_SIZE);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...out)).toBeLessThanOrEqual(1);
  });

  it('scales the longest side to 20px and keeps the aspect ratio', () => {
    // A tall, thin stroke (like a "1") must not be stretched into a square.
    const out = normalizeDigit(inkWithRect(200, 90, 20, 20, 160), 200, 200)!;
    const box = boundingBox(out);
    expect(box.height).toBe(20);
    expect(box.width).toBeGreaterThanOrEqual(2);
    expect(box.width).toBeLessThanOrEqual(4);
  });

  it('centers the digit by center of mass regardless of where it was drawn', () => {
    const corner = normalizeDigit(inkWithRect(100, 0, 0, 20, 20), 100, 100)!;
    const elsewhere = normalizeDigit(inkWithRect(100, 70, 55, 20, 20), 100, 100)!;
    const com = centerOfMass(corner);
    expect(com.x).toBeCloseTo((MNIST_SIZE - 1) / 2, 0);
    expect(com.y).toBeCloseTo((MNIST_SIZE - 1) / 2, 0);
    expect(Array.from(elsewhere)).toEqual(Array.from(corner));
  });

  it('ignores faint anti-aliasing noise when cropping', () => {
    const ink = inkWithRect(100, 40, 20, 20, 60);
    ink[0] = 0.05; // stray near-white pixel in the corner
    expect(boundingBox(normalizeDigit(ink, 100, 100)!).height).toBe(20);
  });
});

describe('toPreviewPixels', () => {
  it('maps intensity to opaque grayscale RGBA', () => {
    expect(Array.from(toPreviewPixels(new Float32Array([0, 1])))).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });
});
