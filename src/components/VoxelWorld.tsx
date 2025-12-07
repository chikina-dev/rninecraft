/** @jsxImportSource @jsx-webgpu */
import { useMemo } from '@jsx-webgpu/jsx';
import type { Chunk } from 'src/types/map';
import { BIOME_COLORS } from 'src/core/map/constants';

interface VoxelWorldProps {
  chunks: Chunk[];
  playerX: number;
  playerY: number;
  playerZ: number;
  entities?: any[];
  cellSize: number;
  mapRevision?: number;
}

export function VoxelWorld({ chunks, playerX, playerY, playerZ, entities = [] }: VoxelWorldProps) {
  const chunkVoxels = useMemo(() => {
    return chunks.map((chunk) => 
        // chunk.cells is now Cell[][][] (x, y, z)
        // We need to flatten it to render
        chunk.cells.map((column, _lx) => 
            column.map((zColumn, _ly) => 
                zColumn.map((cell) => {
                    if (cell.block.id === -1) return null;
                    
                    const wx = cell.x;
                    const wy = cell.y;
                    const z = cell.z;
                    
                    let vColor = "#FFFFFF";
                    let vTextures: any | undefined;
                    
                    if (cell.block && cell.block.style) {
                        if (cell.block.style.backgroundColor) {
                            vColor = cell.block.style.backgroundColor;
                        }
                        if (cell.block.style.textures) {
                            vTextures = cell.block.style.textures;
                            if (cell.biome && BIOME_COLORS[cell.biome]) {
                                vColor = BIOME_COLORS[cell.biome];
                            }
                        }
                    }
                    
                    return (
                      <voxel
                        key={`v:${wx},${wy},${z}`}
                        x={wx}
                        y={wy}
                        z={z}
                        color={vColor}
                        textures={vTextures}
                      />
                    );
                })
            )
        )
      );
  }, [chunks]);

  return (
    <>
      <camera-provider
        position={[playerX, playerY - 8, 12]}
        target={[playerX, playerY, playerZ - 1]}
      />
      {chunkVoxels}
      <voxel
        key="player"
        x={playerX - 0.5}
        y={playerY - 0.5}
        z={playerZ}
        color="#ff0000"
        border={true}
      />
      {entities.map(e => (
        <voxel
          key={`entity-${e.id}`}
          x={e.x - 0.5}
          y={e.y - 0.5}
          z={e.z}
          color={e.color || "#00ff00"}
          border={true}
        />
      ))}
    </>
  );
}
