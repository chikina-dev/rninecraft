// アプリUI（シード入力とワールド表示）
// - 入力したシード文字列から決定的にマップを生成
// - 生成結果をCSSグリッドでフラットに描画
import { render as renderDOM } from '@jsx-dom/jsx';
import { renderGame } from './GameRoot';
import { App, generateSeededWorld } from './components/map.dev';
import './style.css';

// DOM Mount Point
const dev = document.querySelector<HTMLDivElement>('#dev')!;

// Game Mount Point (Canvas)
const gameCanvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
// 入力が変わるたびに再生成して差し替え描画
export async function rerender(seedText: string): Promise<void> {
  const { seed, chunks } = await generateSeededWorld(seedText);
  
  // 1. Render UI Layer (DOM)
  renderDOM(dev, <App seed={seedText} seedNum={seed} chunks={chunks} onSeedChange={rerender} />);

  // 2. Render Game Layer (WebGPU)
  renderGame(gameCanvas!, chunks, seed);
}

// 初期描画
void rerender('demo');