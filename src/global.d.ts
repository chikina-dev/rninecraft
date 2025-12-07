import type { DivProps } from '@jsx/jsx-runtime';

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: string | number;
    }
    // JSXの組み込み要素の型（必要最小限）
    interface IntrinsicElements {
      div: DivProps;
      // input は属性/イベントを幅広く許容（簡便のため any）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: any;
      button: any;
    }
    interface Element extends Node {}
  }
}

export {};
