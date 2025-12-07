// import type { BiomeType } from 'src/types/map';

export interface MapItemDef {
  key: string;
  name: string;
  icon: string; // emoji or short text
}

export const ITEMS: Record<string, MapItemDef> = {
};

// export const BIOME_ITEM_POOLS: Record<BiomeType, Array<[keyof typeof ITEMS, number]>> = {};
