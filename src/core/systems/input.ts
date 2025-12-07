import type { SystemSpec } from 'src/types/ecs';

export interface KeyBindings {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  jump: string[];
}

const DEFAULT_BINDINGS: KeyBindings = {
  up: ['w', 'arrowup'],
  down: ['s', 'arrowdown'],
  left: ['a', 'arrowleft'],
  right: ['d', 'arrowright'],
  jump: [' '], // Space key
};

export interface InputState {
  pressed: Set<string>;
  mouse: {
    x: number;
    y: number;
    left: boolean;
    right: boolean;
    width: number;
    height: number;
  };
}

export interface InputSystemOptions {
  bindings?: Partial<KeyBindings>;
  input: InputState;
}

function normalizeBindings(partial?: Partial<KeyBindings>): KeyBindings {
  if (!partial) return DEFAULT_BINDINGS;
  return {
    up: partial.up ?? DEFAULT_BINDINGS.up,
    down: partial.down ?? DEFAULT_BINDINGS.down,
    left: partial.left ?? DEFAULT_BINDINGS.left,
    right: partial.right ?? DEFAULT_BINDINGS.right,
    jump: partial.jump ?? DEFAULT_BINDINGS.jump,
  };
}

// 入力システム: 押下キー集合から velocity を更新
export function createInputSystem(opts: InputSystemOptions): SystemSpec<['velocity','playerControlled']> {
  const bindings = normalizeBindings(opts.bindings);
  const { input } = opts;
  return {
    name: 'input',
    deps: ['velocity','playerControlled'],
    update: (entities) => {
      for (const e of entities) {
        const velocity = e.velocity;
        let vx = 0; let vy = 0;
        const hasAny = (keys: string[]) => keys.some(k => input.pressed.has(k));
        if (hasAny(bindings.left)) vx -= 1;
        if (hasAny(bindings.right)) vx += 1;
        if (hasAny(bindings.up)) vy += 1;
        if (hasAny(bindings.down)) vy -= 1;
        velocity.vx = vx; velocity.vy = vy;
        
        // Jump input - use grounded flag from collision system
        if (hasAny(bindings.jump) && velocity.grounded) {
           velocity.vz = 8; // Jump impulse
           velocity.grounded = false;
        }
      }
    }
  };
}

// キーイベントを監視して pressed Set を管理するユーティリティ（破棄関数を返す）
export function attachInput(input: InputState, target: Window | HTMLElement = window): () => void {
  const down = (e: KeyboardEvent) => { input.pressed.add(e.key.toLowerCase()); };
  const up = (e: KeyboardEvent) => { input.pressed.delete(e.key.toLowerCase()); };
  
  const mousedown = (e: MouseEvent) => {
    if (e.button === 0) input.mouse.left = true;
    if (e.button === 2) input.mouse.right = true;
  };
  const mouseup = (e: MouseEvent) => {
    if (e.button === 0) input.mouse.left = false;
    if (e.button === 2) input.mouse.right = false;
  };
  const mousemove = (e: MouseEvent) => {
    const rect = (target as HTMLElement).getBoundingClientRect ? (target as HTMLElement).getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    input.mouse.x = e.clientX - rect.left;
    input.mouse.y = e.clientY - rect.top;
    input.mouse.width = rect.width;
    input.mouse.height = rect.height;
  };
  const contextmenu = (e: MouseEvent) => { e.preventDefault(); };

  // Keyboard events always on window to ensure we catch them even if canvas isn't focused
  window.addEventListener('keydown', down as EventListener);
  window.addEventListener('keyup', up as EventListener);
  
  target.addEventListener('mousedown', mousedown as EventListener);
  target.addEventListener('mouseup', mouseup as EventListener);
  target.addEventListener('mousemove', mousemove as EventListener);
  target.addEventListener('contextmenu', contextmenu as EventListener);

  return () => {
    window.removeEventListener('keydown', down as EventListener);
    window.removeEventListener('keyup', up as EventListener);
    target.removeEventListener('mousedown', mousedown as EventListener);
    target.removeEventListener('mouseup', mouseup as EventListener);
    target.removeEventListener('mousemove', mousemove as EventListener);
    target.removeEventListener('contextmenu', contextmenu as EventListener);
  };
}
