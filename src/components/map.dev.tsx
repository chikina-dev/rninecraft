import type { Chunk } from 'src/types/map';
import { generateChunkGridWithStructures } from 'src/core/map/index';
import sha256 from 'src/functions/maps/sha256';

// グリッド描画・スクロール・バイオームログは ViewSystem へ委譲
// const CELL_SIZE = 32;

// 初期表示のチャンク数（2x2）: 原点(0,0)が4チャンクの交点に来るようにする
const WORLD_W = 2;
const WORLD_H = 2;

// シード文字列からハッシュ→数値シードへ変換し、チャンクグリッドを生成
async function generateSeededWorld(seedText: string): Promise<{ seed: number; chunks: Chunk[][] }> {
  const seed = await sha256(seedText || 'default-seed');
  // (0,0) がちょうど4チャンクの交点（中心）になるよう、開始座標を (-1,-1)、2x2 で生成
  const chunks = await generateChunkGridWithStructures(seed, -1, -1, WORLD_W, WORLD_H, 0);
  return { seed, chunks };
}

function App(props: { seed: string; seedNum: number; chunks: Chunk[][]; onSeedChange?: (seed: string) => void }): any {
  const { seedNum, chunks, onSeedChange } = props;
  let inputValue = props.seed;

  return (
    <div style={{ color: 'white', fontFamily: 'system-ui', display: 'grid', gap: '12px' }}>
      <div style={{ position: 'relative', zIndex: 10000, background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '4px', pointerEvents: 'auto' }}>
        <div>Seed: {props.seed} ({seedNum})</div>
        <div>Chunks: {chunks.length}x{chunks[0].length}</div>
        <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
          <input 
            type="text" 
            value={inputValue}
            oninput={(e: any) => { inputValue = e.target.value; }}
            style={{ padding: '4px', borderRadius: '4px', border: 'none', color: '#333' }}
          />
          <button 
            onclick={() => onSeedChange?.(inputValue)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#4CAF50', color: 'white', cursor: 'pointer' }}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export { App, generateSeededWorld };
