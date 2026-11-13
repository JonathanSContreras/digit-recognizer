
export interface Prediction {
  label: number;
  probability: number;
}

export type ModelStatus = 'loading' | 'ready' | 'error';
