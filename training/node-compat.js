// @tensorflow/tfjs-node 4.x calls legacy `util.isNullOrUndefined` / `util.isArray`,
// which were removed in Node 23. Restore them so training runs on current Node.
import util from 'node:util';

util.isNullOrUndefined ??= (v) => v === null || v === undefined;
util.isArray ??= Array.isArray;
