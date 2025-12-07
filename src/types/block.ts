import type { StyleObject } from "src/types/jsx";
import type { BiomeType } from "./map";


export interface BlockDef {
  id: number;
  name: string;
  jaName?: string;
  style: StyleObject;
  collision: boolean;
  biome: BiomeType;
}

export interface SpecialBlockDef extends BlockDef {
  damage?: {
    id: number;
    amount: number;
  };
  effect?: {
    id: number;
    amount: number;
  };
  onClick?: () => void;
}

// export const BLOCK: Record<number, BlockDef> = {
//   0: { id: 0, name: "Grass", style: { backgroundColor: "#3CB043" }, collision: false, biome: "Plains" },
//   1: { id: 1, name: "Dirt", style: { backgroundColor: "#8B5A2B" }, collision: true, biome: "Neutral" },
//   2: { id: 2, name: "Water", style: { backgroundColor: "#1E90FF" }, collision: false, biome: "Ocean" },
//   3: { id: 3, name: "Lava", style: { backgroundColor: "#FF4500" }, collision: false, biome: "Neutral" },
//   4: { id: 4, name: "Stone", style: { backgroundColor: "#7D7D7D" }, collision: true, biome: "Mountains" },
//   5: { id: 5, name: "Sand", style: { backgroundColor: "#EED28B" }, collision: false, biome: "Desert" },
//   6: { id: 6, name: "Ice", style: { backgroundColor: "#BFEFFF" }, collision: true, biome: "Snowy" },
//   7: { id: 7, name: "Snow", style: { backgroundColor: "#FFFFFF" }, collision: false, biome: "Snowy" },
//   8: { id: 8, name: "JungleGrass", style: { backgroundColor: "#228B22" }, collision: false, biome: "Jungle" },
//   9: { id: 9, name: "Podzol", style: { backgroundColor: "#5B3A29" }, collision: true, biome: "Taiga" },
//   10: { id:10, name: "Sandstone", style: { backgroundColor: "#F2E4C9" }, collision: true, biome: "Desert" },
//   11: { id:11, name: "Gravel", style: { backgroundColor: "#8A8A8A" }, collision: true, biome: "Mountains" },
//   12: { id:12, name: "Clay", style: { backgroundColor: "#6E7F80" }, collision: true, biome: "Swamp" },
//   13: { id:13, name: "Mycelium", style: { backgroundColor: "#8D6BA4" }, collision: true, biome: "MushroomFields" },
//   14: { id:14, name: "SavannaGrass", style: { backgroundColor: "#C2B280" }, collision: false, biome: "Savanna" },
//   15: { id:15, name: "DeepWater", style: { backgroundColor: "#0B3D91" }, collision: false, biome: "Ocean" },
//   16: { id:16, name: "Oak Log", style: { backgroundColor: "#6D4C41" }, collision: true, biome: "Forest" },
//   17: { id:17, name: "Leaves", style: { backgroundColor: "#2E7D32" }, collision: false, biome: "Forest" },
// };

const BASE_PATH = import.meta.env.BASE_URL;

const grassStyle: StyleObject = { // サンプルとして全てのブロックに実装
  textures: {
    top: {
      src: `${BASE_PATH}grass_block_top.png`,
      blur: true,
    },
    side: {
      src: `${BASE_PATH}grass_block_side.png`,
      blur: false,
    },
    bottom: {
      src: `${BASE_PATH}dirt.png`,
      blur: false,
    }
  }
};
const cobbleStoreStyle: StyleObject = {
  textures: {
    all: {
      src: `${BASE_PATH}cobblestone.png`,
      blur: false,
    }
  }
}
const logStyle: StyleObject = {
  textures: {
    all: {
      src: `${BASE_PATH}oak_log.png`,
      blur: false,
    }
  }
}

const planksStyle: StyleObject = {
  textures: {
    all: {
      src: `${BASE_PATH}oak_planks.png`,
      blur: false,
    }
  }
}
const door1Style: StyleObject = {
  textures: {
    all: {
      src: `${BASE_PATH}oak_door_top.png`,
      blur: false,
    }
  }
}

const door2Style: StyleObject = {
  textures: {
    all: {
      src: `${BASE_PATH}oak_door_bottom.png`,
      blur: false,
    }
  }
}

// const blurStyle: StyleObject = {
//   textures: {
//     all: {
//       src: `${BASE_PATH}test.png`,
//       blur: true,
//     }
//   }
// };

export const BLOCK: Record<number, BlockDef> = {
  0: { id: 0, name: "Grass", style: grassStyle, collision: true, biome: "Neutral" },
  1: { id: 1, name: "Dirt", style: grassStyle, collision: true, biome: "Neutral" },
  2: { id: 2, name: "Water", style: grassStyle, collision: true, biome: "Water" },
  3: { id: 3, name: "Stone", style: grassStyle, collision: true, biome: "Neutral" },
  4: { id: 4, name: "Sand", style: grassStyle, collision: true, biome: "Neutral" },
  5: { id: 5, name: "Ice", style: grassStyle, collision: true, biome: "Ice" },
  6: { id: 6, name: "Snow", style: grassStyle, collision: true, biome: "Ice" },
  7: { id: 7, name: "Wood", style: grassStyle, collision: true, biome: "Neutral" },
  8: { id: 8, name: "Leaves", style: grassStyle, collision: true, biome: "Neutral" },
  // 構造物のサンプル
  9: { id: 9, name: "Cobblestone", style: cobbleStoreStyle, collision: true, biome: "Neutral" },
  10: { id:10, name: "Oak Log", style: logStyle, collision: true, biome: "Neutral" },
  11: { id:11, name: "Oak Planks", style: planksStyle, collision: true, biome: "Neutral" },
  12: { id:12, name: "Oak Door Top", style: door1Style, collision: true, biome: "Neutral" },
  13: { id:13, name: "Oak Door Bottom", style: door2Style, collision: true, biome: "Neutral" },
};

export const SPECIAL_BLOCK: Record<number, SpecialBlockDef> = {
  100: { id: 100, name: "Lava", style: { backgroundColor: "#FF4500" }, collision: false, biome: "Fire", damage: { id: 1, amount: 30 } },
  101: { id: 101, name: "Mud", style: { backgroundColor: "#5B3A29" }, collision: true, biome: "Earth", effect: { id: 1, amount: 5 } },
  102: { id: 102, name: "Poison Swamp", style: { backgroundColor: "#800080" }, collision: false, biome: "Earth", effect: { id: 2, amount: 15 } },
  103: { id: 103, name: "Healing Water", style: { backgroundColor: "#FF69B4" }, collision: false, biome: "Water", effect: { id: 3, amount: 5 } },
  104: { id: 104, name: "Thunder Stone", style: grassStyle, collision: true, biome: "Lightning", effect: { id: 4, amount: 10 } },
  105: { id: 105, name: "Frost Crystal", style: grassStyle, collision: true, biome: "Ice", effect: { id: 5, amount: 8 } },

  200: { id: 200, name: "Explosive Block", style: grassStyle, collision: true, biome: "Neutral", damage: { id: 6, amount: 50 } },
};

export const EMPTY_BLOCK: BlockDef = { id: -1, name: "Empty", style: { backgroundColor: "#00000000" }, collision: false, biome: "Neutral" };

export const RootBoxBlock: BlockDef = { id: 999, name: "Root Box", style: grassStyle, collision: true, biome: "Neutral" };

export const ALL_BLOCKS: BlockDef[] = [
  ...Object.values(BLOCK),
  ...Object.values(SPECIAL_BLOCK),
  EMPTY_BLOCK,
  RootBoxBlock,
];