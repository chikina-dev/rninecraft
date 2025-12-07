import type { GameComponent, ComponentName, Entity } from 'src/types/component';

export type ComponentOf<N extends ComponentName> = Extract<GameComponent, { name: N }>;
export type ComponentsOf<Names extends readonly ComponentName[]> = { [K in Names[number]]: ComponentOf<K> };

// ECS ワールドの型 (状態 + システム)
export interface ECSWorld {
  nextEntity: number;
  components: { [K in ComponentName]: Map<Entity, ComponentOf<K>> };
  systems: Array<(world: ECSWorld, dt: number) => void>;
  systemsMeta?: SystemMeta[];
}

// クエリ結果 (エンティティ + 依存コンポーネント群)
export interface QueryResult<Names extends readonly ComponentName[]> {
  entity: Entity;
  components: ComponentsOf<Names>;
}

export interface SystemMeta {
  name?: string;
  priority: number;
  deps?: readonly ComponentName[];
}

export interface SystemSpec<Names extends readonly ComponentName[]> {
  name?: string;
  priority?: number;
  deps: Names; // 自動クエリ対象
  pre?: (world: ECSWorld) => void; // 前処理
  post?: (world: ECSWorld) => void; // 後処理
  update: (entities: Array<{ entity: Entity } & ComponentsOf<Names>>, world: ECSWorld, dt: number) => void;
}


