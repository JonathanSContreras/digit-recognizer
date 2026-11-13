/**
 * Turns a drawing into the 28x28 input the model was trained on, following the
 * same recipe used to build MNIST:
 *   1. crop to the bounding box of the ink
 *   2. scale the longest side to 20px, preserving aspect ratio (area-averaged,
 *      so strokes get the same soft anti-aliased edges as MNIST digits)
 *   3. place it in a 28x28 frame so its center of mass sits in the middle
 *
 * Everything here is pure (no DOM), which keeps it fast and unit-testable.
 */

export const MNIST_SIZE = 28;
const DIGIT_BOX = 20;
/** Pixels fainter than this are ignored when finding the bounding box. */
const INK_THRESHOLD = 0.1;

/**
 * Converts RGBA pixels to ink intensity in [0, 1], where 1 is a full stroke.
 * `inverted` means white strokes on a black background.
 */
export function toInk(rgba: Uint8ClampedArray, width: number, height: number, inverted: boolean): Float32Array {
  const ink = new Float32Array(width * height);
  for (let i = 0; i < ink.length; i++) {
    const p = i * 4;
    const luminance = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) / 255;
    ink[i] = inverted ? luminance : 1 - luminance;
  }
  return ink;
}

/**
 * Normalizes an ink map to a 28x28 MNIST-style image (row-major, values in [0, 1]).
 * Returns `null` when there is nothing drawn.
 */
export function normalizeDigit(ink: Float32Array, width: number, height: number): Float32Array | null {
  // 1. Bounding box of the ink.
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (ink[y * width + x] > INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  // 2. Scale the longest side to DIGIT_BOX, keeping the aspect ratio.
  const scale = DIGIT_BOX / Math.max(boxW, boxH);
  const outW = Math.max(1, Math.round(boxW * scale));
  const outH = Math.max(1, Math.round(boxH * scale));
  const digit = resizeArea(ink, width, minX, minY, boxW, boxH, outW, outH);

  // 3. Center by center of mass.
  let mass = 0, sumX = 0, sumY = 0;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const v = digit[y * outW + x];
      mass += v;
      sumX += v * x;
      sumY += v * y;
    }
  }
  const center = (MNIST_SIZE - 1) / 2;
  const comX = mass > 0 ? sumX / mass : (outW - 1) / 2;
  const comY = mass > 0 ? sumY / mass : (outH - 1) / 2;
  const offsetX = clamp(Math.round(center - comX), 0, MNIST_SIZE - outW);
  const offsetY = clamp(Math.round(center - comY), 0, MNIST_SIZE - outH);

  const out = new Float32Array(MNIST_SIZE * MNIST_SIZE);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      out[(y + offsetY) * MNIST_SIZE + (x + offsetX)] = digit[y * outW + x];
    }
  }
  return out;
}

/** Convenience wrapper: canvas pixels in, model input out. */
export function preprocess(imageData: ImageData, inverted: boolean): Float32Array | null {
  const { data, width, height } = imageData;
  return normalizeDigit(toInk(data, width, height, inverted), width, height);
}

/** Renders a 28x28 model input as white-on-black RGBA pixels (for the preview). */
export function toPreviewPixels(input: Float32Array): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(input.length * 4);
  for (let i = 0; i < input.length; i++) {
    const v = Math.round(input[i] * 255);
    rgba.set([v, v, v, 255], i * 4);
  }
  return rgba;
}

/** Box-filter resize of a sub-rectangle: each output pixel averages the source pixels it covers. */
function resizeArea(
  src: Float32Array,
  srcWidth: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  outW: number,
  outH: number,
): Float32Array {
  const out = new Float32Array(outW * outH);
  const sx = w / outW;
  const sy = h / outH;
  for (let oy = 0; oy < outH; oy++) {
    const ys = Math.floor(oy * sy);
    const ye = Math.max(ys + 1, Math.floor((oy + 1) * sy));
    for (let ox = 0; ox < outW; ox++) {
      const xs = Math.floor(ox * sx);
      const xe = Math.max(xs + 1, Math.floor((ox + 1) * sx));
      let sum = 0;
      for (let y = ys; y < ye; y++) {
        const row = (y0 + y) * srcWidth + x0;
        for (let x = xs; x < xe; x++) sum += src[row + x];
      }
      out[oy * outW + ox] = sum / ((ye - ys) * (xe - xs));
    }
  }
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
