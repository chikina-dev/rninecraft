import type { AttackStats, DefenseStats, SkillId } from "./game";

// レアリティ: READMEの定義（コモン〜ミシック）
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

// 付与される属性（元素）
export type ElementalProperty = "fire" | "water" | "wind" | "earth" | "lightning";

// アイテムのジャンル（README準拠）
export type ItemCategory = "weapon" | "relic" | "tool" | "material" | "sellOnly";

// インベントリ上の占有サイズ（1x1, 2x2など）
export interface InventorySize {
  w: 1 | 2 | 3;
  h: 1 | 2 | 3;
}

// レアリティごとの重みや倍率など（設計用の補助型）
export interface Prefix {
  name: string;
  buff: Record<string, number>;
}

export interface RarityData {
  weight: number; // ドロップ率などの重み
  multiplier: number; // 価格/性能倍率
  color: string; // UI表示色
  prefix: Prefix[]; // 付与されうるprefix候補
}

// 共通: ステータス増減（装備やバフで加算されるイメージ）
export interface StatsDelta {
  attack?: Partial<AttackStats>;
  defense?: Partial<DefenseStats>;
  hp?: number;
  hpRegen?: number;
  attackSpeed?: number;
  speed?: number;
  critRate?: number;
  critDamage?: number;
  lifesteal?: number;
  itemDropRate?: number;
}

// 共通: 耐久度（武器や一部道具）
export interface Durability {
  current: number;
  max: number;
}

// 共通: スタック（素材/売却専用など）
export interface Stackable {
  count: number;
  max: number;
}

// ベースとなる共通項目
export interface BaseItem {
  readonly id: number; // インスタンスID（一意）
  name: string; // 表示名
  category: ItemCategory; // 判別子（discriminated union）
  size: InventorySize; // インベントリ上の占有サイズ
  rarity: Rarity; // レアリティ
  vendorValue?: number; // 売却価格のベース
  favorite?: boolean; // お気に入り
  prefix?: Prefix | null; // 鍛冶屋付与（任意）
  synthesisLevel?: number; // 合成段階（+1, +2...）
}

// 武器: メイン/サブ、スキル、耐久、攻撃速度など
export interface WeaponItem extends BaseItem {
  category: "weapon";
  slot: "main" | "sub"; // 装備種別（切り替え可能）
  durability: Durability; // 使用で消耗、0で破損
  skillId: SkillId; // 武器の攻撃/スキル
  range?: number; // 攻撃レンジ
  attackSpeedModifier?: number; // 攻撃速度補正
  elemental?: ElementalProperty[]; // 付与属性
  enhancementLevel?: number; // 強化段階
  effects?: StatsDelta; // ステータス増減
}

// 聖遺物: 最大5つ装備可能、主に常時効果
export interface RelicItem extends BaseItem {
  category: "relic";
  effects: StatsDelta; // 常時付与のステータス効果
  elemental?: ElementalProperty[];
}

// 道具: 消費や特殊効果（鍵開け/脱出/回復/一時バフなど）
export type ToolEffect =
  | { kind: "heal"; amount: number }
  | { kind: "buff"; effects: StatsDelta; durationSec: number }
  | { kind: "unlock"; target: "chest" | "door" }
  | { kind: "escape" };

export interface ToolItem extends BaseItem {
  category: "tool";
  consumable: boolean; // 消耗品か
  uses?: number; // 使用回数（消耗品の場合）
  durability?: Durability; // 使い切りではない耐久制の道具も許容
  effect: ToolEffect;
}

// 素材: 合成/強化で使用、基本スタック可能
export interface MaterialItem extends BaseItem {
  category: "material";
  stack: Stackable;
  grade?: "low" | "mid" | "high" | "legend"; // 材質/品質など
  tags?: string[]; // 金属/魔素/木材…などの属性タグ
}

// 売却専用: 高価でスタック可能、クエスト納品にも使用
export interface SellOnlyItem extends BaseItem {
  category: "sellOnly";
  stack: Stackable;
  vendorValue: number; // 売却価格（必須）
}

// すべてのアイテム型（判別共用体）
export type Item = WeaponItem | RelicItem | ToolItem | MaterialItem | SellOnlyItem;

// 互換性: 既存の名前を残しておく（外部で参照される可能性のため）
export type ItemType = Item["category"]; // 判別キーのみを取り出すユーティリティ

  