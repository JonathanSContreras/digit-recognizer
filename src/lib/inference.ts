import * as tf from '@tensorflow/tfjs';
import { MNIST_SIZE } from './preprocess';
import { Prediction } from './types';

/** Trained by `training/train.js` and served from `public/model`. */
const MODEL_URL = '/model/model.json';

let modelPromise: Promise<tf.LayersModel> | null = null;

/** Loads the model once; later calls reuse the same promise. Retries after a failure. */
export function loadModel(): Promise<tf.LayersModel> {
  if (!modelPromise) {
    modelPromise = tf.loadLayersModel(MODEL_URL).then(async (model) => {
      // Warm-up pass so the first real prediction doesn't pay for shader compilation.
      tf.tidy(() => model.predict(tf.zeros([1, MNIST_SIZE, MNIST_SIZE, 1])));
      return model;
    });
    modelPromise.catch(() => {
      modelPromise = null;
    });
  }
  return modelPromise;
}

/** Runs the CNN on a 28x28 input and returns all ten classes, most likely first. */
export async function predict(input: Float32Array): Promise<Prediction[]> {
  const model = await loadModel();
  const output = tf.tidy(() => model.predict(tf.tensor4d(input, [1, MNIST_SIZE, MNIST_SIZE, 1])) as tf.Tensor);
  const probabilities = await output.data();
  output.dispose();
  return rankPredictions(probabilities);
}

export function rankPredictions(probabilities: ArrayLike<number>): Prediction[] {
  return Array.from(probabilities, (probability, label) => ({ label, probability })).sort(
    (a, b) => b.probability - a.probability,
  );
}
