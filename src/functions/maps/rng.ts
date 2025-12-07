// rng.ts - XorShift 実装
export interface XorShift {
  state: number;
}

export const createXorShift = (seed: number): XorShift => ({
  state: seed >>> 0,
});

export const next = (rng: XorShift): number => {
  let x = rng.state;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  rng.state = x >>> 0;
  return (rng.state & 0x7fffffff) / 0x7fffffff;
};
