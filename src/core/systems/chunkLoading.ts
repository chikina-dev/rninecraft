import type { SystemSpec } from 'src/types/ecs';
import type { Entity } from 'src/types/component';
import type { World as MapWorld } from 'src/types/map';
import { CHUNK_SIZE, generateChunk, generateStructures, applyStructuresToChunk } from 'src/core/map/index';

// チャンクのロード/アンロードをプレイヤー位置に基づいて行う SystemSpec
// 非同期生成はフレームをブロックしないよう内部で逐次処理キューを用いる
export interface ChunkLoadingOptions {
  mapWorld: MapWorld;          // ワールド（viewDistance を演算距離として扱う）
  region: { minX: number; maxX: number; minY: number; maxY: number }; // loadRadius 範囲（描画/初期表示共通データ）
  playerEntity: Entity;        // プレイヤーエンティティ（position から中心を取得）
  seed: number;                // 生成用シード
  maxPerFrame?: number;        // 1フレームでロードする最大チャンク数
}

type ChunkTaskType = 'load' | 'unload' | 'reload';

interface ChunkTask {
  cx: number;
  cy: number;
  type: ChunkTaskType;
}

export function createChunkLoadingSystem(opts: ChunkLoadingOptions): SystemSpec<['position']> {
  const { mapWorld, region, playerEntity, seed } = opts;
  const maxPerFrame = opts.maxPerFrame ?? 4;
  const UNLOAD_FACTOR = 2; // 固定係数: 演算距離 * 2 を超えたマンハッタン距離でアンロード
  const taskQueue: ChunkTask[] = [];
  let loading = false;

  // ロードタスクをキューへ追加（重複防止）
  const enqueueLoad = (cx: number, cy: number) => {
    const key = `${cx},${cy}`;
    // 既にロード済みなら何もしない。storedChunks にある場合は再ロード対象。
    if (mapWorld.loadedChunks.has(key)) return;
    if (!taskQueue.some(t => t.cx === cx && t.cy === cy && t.type === 'load')) {
      taskQueue.push({ cx, cy, type: 'load' });
    }
  };

  // アンロードタスクをキューへ追加（重複防止）
  const enqueueUnload = (cx: number, cy: number) => {
    const key = `${cx},${cy}`;
    if (!mapWorld.loadedChunks.has(key)) return;
    if (!taskQueue.some(t => t.cx === cx && t.cy === cy && t.type === 'unload')) {
      taskQueue.push({ cx, cy, type: 'unload' });
    }
  };

  // 非同期ロード処理
  const pumpLoads = async () => {
    if (loading) return;
    loading = true;
    
    const startTime = performance.now();
    const TIME_BUDGET_MS = 8; // 1フレームあたりの許容処理時間（ミリ秒）

    let count = 0;
    let changed = false;

    while (taskQueue.length && count < maxPerFrame) {
      if (count > 0 && performance.now() - startTime > TIME_BUDGET_MS) {
        break;
      }

      const task = taskQueue.shift()!;
      const { cx, cy, type } = task;
      const key = `${cx},${cy}`;

      if (type === 'unload') {
        mapWorld.loadedChunks.delete(key);
        changed = true;
        count++;
        continue;
      }

      // load / reload: storedChunks をキャッシュとして利用
      let ch = mapWorld.storedChunks.get(key);
      if (!ch) {
        // generateChunkWithStructures と同等のロジックで生成
        ch = await generateChunk(cx, cy, 0, seed);
        
        // 周囲のチャンクも含めて構造物を生成し、現在のチャンクにはみ出しているものを適用する
        const structs: { id: string, x: number, y: number }[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const s = generateStructures(seed, cx + dx, cy + dy);
            structs.push(...s);
          }
        }
        
        applyStructuresToChunk(ch, structs, seed);

        mapWorld.storedChunks.set(key, ch);
      }
      if (ch) {
        mapWorld.loadedChunks.set(key, ch);
      }
      changed = true;
      count++;
    }
    
    if (changed) {
      mapWorld.renderRevision = (mapWorld.renderRevision || 0) + 1;
    }
    loading = false;
  };

  // 演算距離(radiusChunks) とアンロード距離(unloadRadiusChunks) を元にロード/アンロード判定
  const computeBoxes = (px: number, py: number) => {
    const radiusChunks = mapWorld.viewDistance; // 演算距離（チャンク単位）
    const unloadRadiusChunks = radiusChunks * UNLOAD_FACTOR; // アンロード境界（マンハッタン距離）
    const centerCX = Math.floor(px / CHUNK_SIZE);
    const centerCY = Math.floor(py / CHUNK_SIZE);
    return {
      load: {
        minX: Math.floor(centerCX - radiusChunks),
        maxX: Math.floor(centerCX + radiusChunks),
        minY: Math.floor(centerCY - radiusChunks),
        maxY: Math.floor(centerCY + radiusChunks),
      },
      unloadRadiusChunks,
      centerCX,
      centerCY,
    };
  };

  return {
    name: 'chunk-loading',
    priority: 30, // 衝突後に位置が確定してから動作
    deps: ['position'],
    update: (entities) => {
      const playerPos = entities.find(e => e.entity === playerEntity)?.position;
      if (!playerPos) return;
      const boxes = computeBoxes(playerPos.x, playerPos.y);
      const { load, unloadRadiusChunks, centerCX, centerCY } = boxes;

      // ロードすべきチャンク（演算距離内）
      for (let cx = load.minX; cx <= load.maxX; cx++) {
        for (let cy = load.minY; cy <= load.maxY; cy++) {
          enqueueLoad(cx, cy);
        }
      }
      // アンロード（演算距離 * unloadFactor を超えるもの）
      for (const key of mapWorld.loadedChunks.keys()) {
        const [cxStr, cyStr] = key.split(',');
        const cx = Number(cxStr); const cy = Number(cyStr);
        const dx = Math.abs(cx - centerCX);
        const dy = Math.abs(cy - centerCY);
        const manhattan = dx + dy;
        if (manhattan > unloadRadiusChunks) enqueueUnload(cx, cy);
      }

      // region をロード距離ボックス（描画/初期表示共通）に更新
      region.minX = load.minX; region.maxX = load.maxX;
      region.minY = load.minY; region.maxY = load.maxY;

      if (taskQueue.length) void pumpLoads();
    }
  };
}
