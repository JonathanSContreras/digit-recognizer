// Usage: npm run train -- --epochs 10 --batch-size 128 --out ../public/model
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import './node-compat.js';
import * as tf from '@tensorflow/tfjs-node';
import { NUM_TRAIN, loadMnist, makeBatch } from './data.js';
import { createModel } from './model.js';

const { values: args } = parseArgs({
  options: {
    epochs: { type: 'string', default: '10' },
    'batch-size': { type: 'string', default: '128' },
    out: { type: 'string', default: '../public/model' },
    'no-augment': { type: 'boolean', default: false },
  },
});

const epochs = Number(args.epochs);
const batchSize = Number(args['batch-size']);
const augment = !args['no-augment'];
const outDir = path.resolve(args.out);

console.log('Downloading MNIST...');
const data = await loadMnist();
const testIndices = Array.from({ length: 65000 - NUM_TRAIN }, (_, i) => NUM_TRAIN + i);
const test = makeBatch(data, testIndices);
console.log(`Train: ${NUM_TRAIN} images, test: ${testIndices.length} images, augmentation: ${augment}`);

const model = createModel();
model.summary();

// Batches are re-shuffled (and re-augmented) every epoch.
function* trainBatches() {
  const order = tf.util.createShuffledIndices(NUM_TRAIN);
  for (let start = 0; start < NUM_TRAIN; start += batchSize) {
    yield makeBatch(data, order.subarray(start, start + batchSize), { augment });
  }
}

const started = Date.now();
await model.fitDataset(tf.data.generator(trainBatches), {
  epochs,
  validationData: [test.xs, test.ys],
  callbacks: {
    onEpochEnd: (epoch, logs) => {
      console.log(
        `Epoch ${epoch + 1}/${epochs}  loss=${logs.loss.toFixed(4)} acc=${logs.acc.toFixed(4)}  ` +
          `val_loss=${logs.val_loss.toFixed(4)} val_acc=${logs.val_acc.toFixed(4)}`,
      );
    },
  },
});

const [testLoss, testAcc] = model.evaluate(test.xs, test.ys, { batchSize: 1000 });
const accuracy = (await testAcc.data())[0];
const loss = (await testLoss.data())[0];
console.log(`\nTest accuracy: ${(accuracy * 100).toFixed(2)}%  (loss ${loss.toFixed(4)})`);

await mkdir(outDir, { recursive: true });
await model.save(`file://${outDir}`);
const metrics = {
  testAccuracy: Number(accuracy.toFixed(4)),
  testLoss: Number(loss.toFixed(4)),
  epochs,
  batchSize,
  augmentation: augment,
  params: model.countParams(),
  trainingSeconds: Math.round((Date.now() - started) / 1000),
  trainedAt: new Date().toISOString(),
};
await writeFile(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(`Saved model to ${outDir}`);
