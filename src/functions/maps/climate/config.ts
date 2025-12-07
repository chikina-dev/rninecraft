import type { ClimateTuning } from './index';

// デフォルト（バランス重視）
export const BalancedTuning: ClimateTuning = {
  smoothness: 0.4,
};

// 境界が明確
export const SharpTuning: ClimateTuning = {
  smoothness: 0.2,
};

// 非常に滑らか
export const SmoothTuning: ClimateTuning = {
  smoothness: 0.6,
};
