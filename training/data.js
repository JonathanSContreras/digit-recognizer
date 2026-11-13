import './node-compat.js';
import * as tf from '@tensorflow/tfjs-node';

// MNIST packed by the TensorFlow.js team: one 784x65000 grayscale sprite
// (one digit per row) plus a matching file of one-hot uint8 labels.
const IMAGES_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
const LABELS_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';

export const IMAGE_SIZE = 28;
export const PIXELS = IMAGE_SIZE * IMAGE_SIZE;
export const NUM_CLASSES = 10;
const NUM_EXAMPLES = 65000;
export const NUM_TRAIN = 55000;

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Downloads MNIST. Images are floats in [0, 1] (white digit on black),
 * PIXELS values per example; labels are one-hot, NUM_CLASSES values per example.
 * The first NUM_TRAIN examples are the training set, the remaining 10k the test set.
 */
export async function loadMnist() {
  const [pngBytes, labelBytes] = await Promise.all([download(IMAGES_URL), download(LABELS_URL)]);
  const sprite = tf.node.decodePng(pngBytes, 1); // [65000, 784, 1]
  const pixels = await sprite.data();
  sprite.dispose();

  const images = Float32Array.from(pixels, (v) => v / 255);
  const labels = Float32Array.from(labelBytes);
  if (images.length !== NUM_EXAMPLES * PIXELS || labels.length !== NUM_EXAMPLES * NUM_CLASSES) {
    throw new Error('Unexpected MNIST data size');
  }
  return { images, labels };
}

/** Builds [n, 28, 28, 1] / [n, 10] tensors for the given example indices. */
export function makeBatch({ images, labels }, indices, { augment = false } = {}) {
  const n = indices.length;
  const xs = new Float32Array(n * PIXELS);
  const ys = new Float32Array(n * NUM_CLASSES);
  for (let i = 0; i < n; i++) {
    const idx = indices[i];
    const image = images.subarray(idx * PIXELS, (idx + 1) * PIXELS);
    if (augment) randomAffine(image, xs.subarray(i * PIXELS, (i + 1) * PIXELS));
    else xs.set(image, i * PIXELS);
    ys.set(labels.subarray(idx * NUM_CLASSES, (idx + 1) * NUM_CLASSES), i * NUM_CLASSES);
  }
  return {
    xs: tf.tensor4d(xs, [n, IMAGE_SIZE, IMAGE_SIZE, 1]),
    ys: tf.tensor2d(ys, [n, NUM_CLASSES]),
  };
}

/**
 * Random rotation, scale and shift (bilinear sampling, zero fill).
 * Hand-drawn digits are messier than MNIST, so this makes the model less brittle.
 */
function randomAffine(src, dst, { maxDegrees = 12, maxScale = 0.12, maxShift = 2.5 } = {}) {
  const rand = () => Math.random() * 2 - 1;
  const theta = (rand() * maxDegrees * Math.PI) / 180;
  const scale = 1 + rand() * maxScale;
  const tx = rand() * maxShift;
  const ty = rand() * maxShift;
  const cos = Math.cos(theta) / scale;
  const sin = Math.sin(theta) / scale;
  const c = (IMAGE_SIZE - 1) / 2;

  for (let y = 0; y < IMAGE_SIZE; y++) {
    for (let x = 0; x < IMAGE_SIZE; x++) {
      // Inverse map each output pixel back into the source image.
      const dx = x - c - tx;
      const dy = y - c - ty;
      const sx = cos * dx + sin * dy + c;
      const sy = -sin * dx + cos * dy + c;
      dst[y * IMAGE_SIZE + x] = bilinear(src, sx, sy);
    }
  }
}

function bilinear(src, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (px, py) =>
    px >= 0 && py >= 0 && px < IMAGE_SIZE && py < IMAGE_SIZE ? src[py * IMAGE_SIZE + px] : 0;
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) +
    at(x0 + 1, y0) * fx * (1 - fy) +
    at(x0, y0 + 1) * (1 - fx) * fy +
    at(x0 + 1, y0 + 1) * fx * fy
  );
}
