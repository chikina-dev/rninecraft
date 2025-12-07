// ECS準拠

export type Entity = number;

export interface BaseComponent { _type: "component" }

export type Component<T> = BaseComponent & T;

export interface Position extends Component<{ name: "position"; x: number; y: number; z: number }> {}
export interface Velocity extends Component<{ name: "velocity"; vx: number; vy: number; vz: number; grounded?: boolean }> {}
export interface Acceleration extends Component<{ name: "acceleration"; ax: number; ay: number }> {}
export interface Render extends Component<{ name: "render"; color: string; radius: number; }> {}
export interface PlayerControlled extends Component<{ name: "playerControlled" }> {}
export interface Enemy extends Component<{ name: "enemy"; targetId?: Entity }> {}
export interface Health extends Component<{ name: "health"; current: number; max: number }> {}

// このゲームにおけるスキルとは攻撃相手のターゲットを決める行為である
// これは敵味方関係なく、攻撃を行うエンティティに付与される
export interface Skill extends Component<{
  name: "skill";
  id: string;
  damage: number;
  range: number;
  cooldown: number;
  execute: (attacker: Entity, direction: number) => Entity[];
}> {}

export type GameComponent = Position | Velocity | Acceleration | Render | PlayerControlled | Enemy | Health | Skill;

export type ComponentName = GameComponent["name"];

export type ComponentMap = {
  [K in ComponentName]: Extract<GameComponent, { name: K }>
};

export type PlayerComponents = Pick<ComponentMap, 'position' | 'velocity' | 'acceleration' | 'render' | 'playerControlled' | 'health' | 'skill'>;
export type EnemyComponents = Pick<ComponentMap, 'position' | 'velocity' | 'acceleration' | 'render' | 'enemy' | 'health' | 'skill'>;
export type ObstacleComponents = Pick<ComponentMap, 'position' | 'render'>;

export const COMPONENT_NAMES: readonly ComponentName[] = [
  'position',
  'velocity',
  'acceleration',
  'render',
  'playerControlled',
  'enemy',
  'health',
  'skill'
] as const;