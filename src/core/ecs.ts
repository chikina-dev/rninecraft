// 最小限の関数型志向 ECS 実装
// 内部ではパフォーマンスのため Map を利用しつつ API はシンプルに保つ。
// コンポーネントは種類ごとに Map<EntityId, Component> で保持する。

import { COMPONENT_NAMES, type Entity, type ComponentName } from 'src/types/component';
import { type ECSWorld, type ComponentsOf, type QueryResult, type SystemSpec, type SystemMeta, type ComponentOf } from 'src/types/ecs';

// ワールド型と補助型は `src/types/ecs.ts` に集約

export function createWorld(): ECSWorld {
  // 全コンポーネント種類の空 Map を初期化
  const components = Object.fromEntries(
    COMPONENT_NAMES.map(n => [n, new Map()])
  ) as ECSWorld['components'];
  return { nextEntity: 1, components, systems: [] };
}

export function createEntity(world: ECSWorld): Entity { return world.nextEntity++; }

export function addComponent<K extends ComponentName>(world: ECSWorld, entity: Entity, component: ComponentOf<K>): void {
  world.components[component.name].set(entity, component as ComponentOf<K>);
}

export function getComponent<K extends ComponentName>(world: ECSWorld, entity: Entity, name: K): ComponentOf<K> | undefined {
  return world.components[name].get(entity) as ComponentOf<K> | undefined;
}

export function removeComponent<K extends ComponentName>(world: ECSWorld, entity: Entity, name: K): void {
  world.components[name].delete(entity);
}

export function hasComponents(world: ECSWorld, entity: Entity, names: ComponentName[]): boolean {
  return names.every(n => world.components[n].has(entity));
}

export function query<const Names extends readonly ComponentName[]>(world: ECSWorld, names: Names): QueryResult<Names>[] {
  if (names.length === 0) return [];
  // 最も小さい集合を基点にフィルタして走査コストを低減
  const sorted = [...names].sort((a, b) => world.components[a].size - world.components[b].size);
  const smallest = world.components[sorted[0]];
  const results: QueryResult<Names>[] = [];
  for (const entity of smallest.keys()) {
    if (hasComponents(world, entity, [...names] as ComponentName[])) {
      const compObj = Object.fromEntries(
        names.map(n => [n, world.components[n].get(entity)!])
      ) as ComponentsOf<Names>;
      results.push({ entity, components: compObj });
    }
  }
  return results;
}

// システム登録: SystemSpec のみを受け取り統一。priority 昇順で実行。
export type RawSystem = (world: ECSWorld, dt: number) => void;
export function registerSystem<Names extends readonly ComponentName[]>(world: ECSWorld, spec: SystemSpec<Names>): void {
  const priority = spec.priority ?? 0;
  const runner = createSystemRunner(spec);
  world.systems.push(runner);
  appendSystemMeta(world, { name: spec.name, priority, deps: spec.deps });
  reorderSystems(world);
}

// ---- メタ情報ヘルパ ----
function appendSystemMeta(world: ECSWorld, meta: SystemMeta): void {
  world.systemsMeta = world.systemsMeta ? [...world.systemsMeta, meta] : [meta];
}

function reorderSystems(world: ECSWorld): void {
  if (!world.systemsMeta) return;
  const pairs = world.systems.map((fn, i) => ({ fn, meta: world.systemsMeta![i] }));
  pairs.sort((a, b) => a.meta.priority - b.meta.priority);
  world.systems = pairs.map(p => p.fn);
  world.systemsMeta = pairs.map(p => p.meta);
}

export function createSystemRunner<Names extends readonly ComponentName[]>(spec: SystemSpec<Names>): RawSystem {
  return (w, dt) => {
    if (spec.pre) spec.pre(w);
    const results = query(w, spec.deps);
    const enriched = results.map(r => Object.assign({ entity: r.entity }, r.components)) as Array<{ entity: Entity } & ComponentsOf<Names>>;
    spec.update(enriched, w, dt);
    if (spec.post) spec.post(w);
  };
}

export function runSystems(world: ECSWorld, dt: number): void {
  for (const sys of world.systems) sys(world, dt);
}

// 毎フレームステップ (任意の事前処理を挟んで全システム実行)
export function step(world: ECSWorld, dt: number, pre?: (world: ECSWorld) => void): void {
  if (pre) pre(world);
  runSystems(world, dt);
}
