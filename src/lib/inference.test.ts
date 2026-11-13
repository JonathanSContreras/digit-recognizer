import { describe, expect, it } from 'vitest';
import { rankPredictions } from './inference';

describe('rankPredictions', () => {
  it('labels each probability with its digit and sorts most likely first', () => {
    const probs = [0.01, 0.02, 0.05, 0.7, 0.01, 0.1, 0.03, 0.04, 0.02, 0.02];
    const ranked = rankPredictions(probs);
    expect(ranked).toHaveLength(10);
    expect(ranked[0]).toEqual({ label: 3, probability: 0.7 });
    expect(ranked[1]).toEqual({ label: 5, probability: 0.1 });
    expect(ranked.map((p) => p.probability)).toEqual([...probs].sort((a, b) => b - a));
  });
});
