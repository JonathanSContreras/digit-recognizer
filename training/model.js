import './node-compat.js';
import * as tf from '@tensorflow/tfjs-node';
import { IMAGE_SIZE, NUM_CLASSES } from './data.js';

/**
 * A compact CNN (~225k parameters, under 1 MB of weights) so the browser can
 * download it quickly while still getting >99% accuracy on the MNIST test set.
 */
export function createModel() {
  const model = tf.sequential();

  model.add(tf.layers.conv2d({ inputShape: [IMAGE_SIZE, IMAGE_SIZE, 1], filters: 32, kernelSize: 3, activation: 'relu' }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

  model.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

  model.add(tf.layers.flatten());
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.4 }));
  model.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}
