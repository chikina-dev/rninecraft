import {
  createRenderer,
  type RendererState,
  startRenderLoop,
} from "src/functions/webgpu/renderer";
import type { color as JSXColor, VNode, TextureMap } from "../types/jsx";
import { VoxelHandle } from "src/functions/webgpu/resource/VoxelBuffer";

export type { VNode };

export interface Hook {
  state: any;
  deps?: any[];
  cleanup?: Function;
}

export interface Instance {
  tag: string | Function;
  props: any;
  children: Instance[];
  hostNode?: VoxelHandle;
  key?: string | number;
  hooks: Hook[];
}

export type ColorRGB = {
  r: number;
  g: number;
  b: number;
}

// Global state for hooks
let currentInstance: Instance | null = null;
let currentHookIndex = 0;
let pendingEffects: Function[] = [];
let rootRendererState: RendererState | null = null;
let rootVNode: VNode | VNode[] | null = null;
let isUpdateScheduled = false;

function scheduleUpdate() {
  if (isUpdateScheduled || !rootRendererState || !rootVNode) return;
  isUpdateScheduled = true;
  requestAnimationFrame(() => {
    isUpdateScheduled = false;
    if (rootRendererState && rootVNode) {
      update(rootRendererState, rootVNode);
    }
  });
}

export function useState<T>(
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const index = currentHookIndex++;
  const instance = currentInstance;
  if (!instance) throw new Error("Hooks called outside component");

  const hook = instance.hooks[index] || (instance.hooks[index] = {
    state: initial,
  });

  const setState = (newValue: T | ((prev: T) => T)) => {
    let nextState;
    if (typeof newValue === "function") {
      nextState = (newValue as Function)(hook.state);
    } else {
      nextState = newValue;
    }

    if (nextState !== hook.state) {
      hook.state = nextState;
      scheduleUpdate();
    }
  };

  return [hook.state, setState];
}

export function useEffect(effect: Function, deps?: any[]) {
  const index = currentHookIndex++;
  const instance = currentInstance;
  if (!instance) throw new Error("Hooks called outside component");

  const hook = instance.hooks[index];

  if (!hook) {
    // First render
    instance.hooks[index] = { state: null, deps };
    pendingEffects.push(() => {
      const cleanup = effect();
      if (typeof cleanup === "function") {
        instance.hooks[index].cleanup = cleanup;
      }
    });
  } else {
    // Subsequent render
    const hasChanged = !deps || !hook.deps ||
      deps.some((d, i) => d !== hook.deps![i]);
    if (hasChanged) {
      hook.deps = deps;
      pendingEffects.push(() => {
        if (hook.cleanup) hook.cleanup();
        const cleanup = effect();
        if (typeof cleanup === "function") {
          hook.cleanup = cleanup;
        }
      });
    }
  }
}

export function useRef<T>(initialValue: T): { current: T } {
  const [ref] = useState({ current: initialValue });
  return ref;
}

export function useMemo<T>(factory: () => T, deps: any[]): T {
  const index = currentHookIndex++;
  const instance = currentInstance;
  if (!instance) throw new Error("Hooks called outside component");

  const hook = instance.hooks[index];

  if (!hook) {
    const value = factory();
    instance.hooks[index] = { state: value, deps };
    return value;
  } else {
    const hasChanged = !deps || !hook.deps || deps.some((d, i) => d !== hook.deps![i]);
    if (hasChanged) {
      const value = factory();
      hook.state = value;
      hook.deps = deps;
      return value;
    }
    return hook.state;
  }
}

export function useRendererState(): RendererState | null {
  return rootRendererState;
}

export function parseColorString(colorStr: JSXColor): ColorRGB {
  if (typeof colorStr === "string" && colorStr.startsWith("#")) {
    const hex = colorStr.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return { r, g, b };
  }
  return typeof colorStr === "object" ? colorStr : { r: 0, g: 0, b: 0 };
}

export function h(
  type: string | Function,
  props: any,
  ...children: any[]
): VNode {
  const { key, ...rest } = props || {};
  return {
    type,
    props: rest || {},
    key,
    children: children.flat(Infinity).map((c) => {
      if (typeof c === "object" && c !== null && "type" in c) return c;
      return null;
    }).filter(Boolean) as VNode[],
  };
}

export const jsx = (type: any, props: any, key?: string) => {
  const { children, ...rest } = props || {};
  const childArray = Array.isArray(children)
    ? children
    : (children ? [children] : []);

  const propsWithKey = { ...rest };
  if (key !== undefined) {
    propsWithKey.key = key;
  }

  return h(type, propsWithKey, ...childArray);
};

export const jsxs = jsx;

export function Fragment(props: { children: any[] }) {
  return props.children;
}

const instanceMap = new WeakMap<RendererState, Instance[]>();

export function createRoot(canvas: HTMLCanvasElement) {
  return {
    render: async (vnode: VNode | VNode[]) => {
      const rendererState = await createRenderer(canvas);
      rootRendererState = rendererState;
      rootVNode = vnode;

      // Initialize texture paths set
      (rendererState as any)._frameTexturePaths = new Set<string>();

      pendingEffects = [];
      const instances = reconcileChildren(
        rendererState,
        [],
        Array.isArray(vnode) ? vnode : [vnode],
      );
      instanceMap.set(rendererState, instances);

      // Load textures for initial render
      const paths = Array.from((rendererState as any)._frameTexturePaths as Set<string>);
      if (paths.length > 0) {
        rendererState.textureAtlas.loadTextures(rendererState.deviceContext.device, paths).then((didLoad) => {
          if (didLoad) {
            rendererState.material.updateBindGroup(rendererState.textureAtlas.texture!, rendererState.textureAtlas.sampler!);
            scheduleUpdate();
          }
        });
      }

      // Run effects
      pendingEffects.forEach((effect) => effect());
      pendingEffects = [];

      startRenderLoop(rendererState);
      return rendererState;
    },
  };
}

export async function render(
  canvas: HTMLCanvasElement,
  vnode: VNode | VNode[],
) {
  return createRoot(canvas).render(vnode);
}

export function update(
  rendererState: RendererState,
  vnode: VNode | VNode[],
) {
  const oldInstances = instanceMap.get(rendererState) || [];
  const vnodes = Array.isArray(vnode) ? vnode : [vnode];

  // Reset texture paths collector
  (rendererState as any)._frameTexturePaths = new Set<string>();

  pendingEffects = [];
  const newInstances = reconcileChildren(rendererState, oldInstances, vnodes);
  instanceMap.set(rendererState, newInstances);

  // Load textures
  const paths = Array.from((rendererState as any)._frameTexturePaths as Set<string>);
  if (paths.length > 0) {
    rendererState.textureAtlas.loadTextures(rendererState.deviceContext.device, paths).then((didLoad) => {
      if (didLoad) {
        // Update material bind group with new texture
        rendererState.material.updateBindGroup(rendererState.textureAtlas.texture!, rendererState.textureAtlas.sampler!);
        // Trigger re-render to update indices
        scheduleUpdate();
      }
    });
  }

  // Run effects
  pendingEffects.forEach((effect) => effect());
  pendingEffects = [];
}

function reconcileChildren(
  state: RendererState,
  oldInstances: Instance[],
  newVNodes: VNode[],
): Instance[] {
  const newInstances: Instance[] = [];

  const oldMap = new Map<string | number, Instance>();
  oldInstances.forEach((inst, i) => {
    const key = inst.key ?? i;
    if (oldMap.has(key)) {
      const prev = oldMap.get(key)!;
      console.warn(`Duplicate key detected: ${key} (tag: ${inst.tag}). Unmounting previous instance to prevent leak. Prev tag: ${prev.tag}`);
      unmountInstance(state, prev);
    }
    oldMap.set(key, inst);
  });

  newVNodes.forEach((vnode, i) => {
    const key = vnode.key ?? i;
    const oldInstance = oldMap.get(key);

    if (oldInstance && oldInstance.tag === vnode.type) {
      oldMap.delete(key);
      newInstances.push(updateInstance(state, oldInstance, vnode));
    } else {
      newInstances.push(mountInstance(state, vnode));
    }
  });

  oldMap.forEach((inst) => unmountInstance(state, inst));

  return newInstances;
}

function resolveTextureIndices(state: RendererState, textures?: TextureMap): number[] {
  if (!textures) return [];
  
  const get = (key: keyof TextureMap, fallback?: keyof TextureMap) => {
    return textures[key] || (fallback ? textures[fallback] : undefined) || textures.all;
  }

  const front = get('front', 'side');
  const back = get('back', 'side');
  const top = get('top');
  const bottom = get('bottom');
  const right = get('right', 'side');
  const left = get('left', 'side');

  const paths = [front, back, top, bottom, right, left];
  
  paths.forEach(p => {
    if (typeof p === 'string') {
      (state as any)._frameTexturePaths.add(p);
    } else if (p && typeof p.src === 'string') {
      (state as any)._frameTexturePaths.add(p.src);
    }
  });

  return paths.map(p => {
    if (typeof p === 'string') return state.textureAtlas.getTextureIndex(p);
    if (p && typeof p.src === 'string') return state.textureAtlas.getTextureIndex(p.src);
    return -1;
  });
}

function resolveBlurMask(textures: any): number {
  if (!textures) return 0;

  const getBlur = (key: string, fallback?: string): boolean => {
    let val = textures[key];
    if (val && typeof val === 'object' && val.blur) return true;
    
    if (fallback) {
      val = textures[fallback];
      if (val && typeof val === 'object' && val.blur) return true;
    }
    
    val = textures.all;
    if (val && typeof val === 'object' && val.blur) return true;
    
    return false;
  };

  const front = getBlur('front', 'side');
  const back = getBlur('back', 'side');
  const top = getBlur('top');
  const bottom = getBlur('bottom');
  const right = getBlur('right', 'side');
  const left = getBlur('left', 'side');

  let mask = 0;
  if (front) mask |= 1;
  if (back) mask |= 2;
  if (top) mask |= 4;
  if (bottom) mask |= 8;
  if (right) mask |= 16;
  if (left) mask |= 32;

  return mask;
}

function mountInstance(state: RendererState, vnode: VNode): Instance {
  const instance: Instance = {
    tag: vnode.type,
    props: vnode.props,
    children: [],
    key: vnode.key,
    hooks: [],
  };

  if (typeof vnode.type === "string") {
    if (vnode.type === "voxel") {
      const color = parseColorString(vnode.props.color);
      
      const textureIndices = resolveTextureIndices(state, vnode.props.textures);
      const blurMask = resolveBlurMask(vnode.props.textures);

      const handle = state.voxelBuffer.addVoxel(
        Number(vnode.props.x || 0),
        Number(vnode.props.y || 0),
        Number(vnode.props.z || 0),
        Number(color.r || 0),
        Number(color.g || 0),
        Number(color.b || 0),
        Boolean(vnode.props.border),
        textureIndices,
        blurMask
      );
      if (handle) {
        instance.hostNode = handle;
      }
    } else if (vnode.type === "camera-provider") {
      if (vnode.props.position && vnode.props.target) {
        state.cameraConfig = {
          position: vnode.props.position,
          target: vnode.props.target,
        };
      }
    }

    instance.children = reconcileChildren(state, [], vnode.children);
  } else if (typeof vnode.type === "function") {
    currentInstance = instance;
    currentHookIndex = 0;

    const childVNode = vnode.type({ ...vnode.props, children: vnode.children });

    currentInstance = null;

    const childVNodes = Array.isArray(childVNode)
      ? childVNode
      : (childVNode ? [childVNode] : []);

    instance.children = reconcileChildren(state, [], childVNodes);
  }

  return instance;
}

function updateInstance(
  state: RendererState,
  instance: Instance,
  vnode: VNode,
): Instance {
  instance.props = vnode.props;
  instance.key = vnode.key;

  if (typeof instance.tag === "string") {
    if (instance.tag === "voxel") {
      const color = parseColorString(vnode.props.color);
      
      const textureIndices = resolveTextureIndices(state, vnode.props.textures);
      const blurMask = resolveBlurMask(vnode.props.textures);

      if (instance.hostNode) {
        state.voxelBuffer.updateVoxel(
          instance.hostNode,
          Number(vnode.props.x || 0),
          Number(vnode.props.y || 0),
          Number(vnode.props.z || 0),
          Number(color.r || 0),
          Number(color.g || 0),
          Number(color.b || 0),
          Boolean(vnode.props.border),
          textureIndices,
          blurMask
        );
      }
    } else if (instance.tag === "camera-provider") {
      if (vnode.props.position && vnode.props.target) {
        state.cameraConfig = {
          position: vnode.props.position,
          target: vnode.props.target,
        };
      }
    }

    instance.children = reconcileChildren(
      state,
      instance.children,
      vnode.children,
    );
  } else if (typeof instance.tag === "function") {
    currentInstance = instance;
    currentHookIndex = 0;

    const childVNode = instance.tag({
      ...vnode.props,
      children: vnode.children,
    });

    currentInstance = null;

    const childVNodes = Array.isArray(childVNode)
      ? childVNode
      : (childVNode ? [childVNode] : []);
    instance.children = reconcileChildren(
      state,
      instance.children,
      childVNodes,
    );
  }

  return instance;
}

function unmountInstance(state: RendererState, instance: Instance) {
  if (instance.tag === "voxel" && instance.hostNode) {
    state.voxelBuffer.removeVoxel(instance.hostNode);
  }

  // Cleanup hooks
  instance.hooks.forEach((hook) => {
    if (hook.cleanup) hook.cleanup();
  });

  instance.children.forEach((child) => unmountInstance(state, child));
}

export default h;
