export type SceneName = 'start' | 'upgrade' | 'game' | 'result' | 'map';
export type Biome = 'general' | 'fire' | 'water' | 'wind' | 'earth' | 'lightning' | 'default' | 'neutral';
export type BossType = 'Witch' | 'Titan' | 'Warden';
export type SkillId = 'melee' | 'homingMissile' | 'cleave' | 'piercingShot' | 'chainLightning' | 'groundStomp' | 'summonMinions';

export interface AttackStats {
  base: number;
  physical?: number;
  magic?: number;
  fire?: number;
  water?: number;
  wind?: number;
  earth?: number;
  lightning?: number;
  elementalMultiplier?: number;
  crit?: {
    rate: number;
    damage: number;
  }
}

export interface DefenseStats {
  base: number;
  percent?: number;
  physical?: number;
  magic?: number;
  fire?: number;
  water?: number;
  wind?: number;
  earth?: number;
  lightning?: number;
  crit?: {
    rate: number;
    damage: number;
  }
}

export interface PlayerStatus {
  level: number;
  exp: number;
  hp: number;
  hpRegen?: number;
  attack: AttackStats;
  defense: DefenseStats;
  attackSpeed: number;
  speed: number;
  kills: number;
  critRate?: number;
  critDamage?: number;
  lifesteal?: number;
  itemDropRate?: number;
  evasion?: {
    rate: number;
    invincibilityTime: number;
  };
  expValue?: number;
  goldValue?: number;
  stoneValue?: number;
  defaultSkillId: SkillId;
}