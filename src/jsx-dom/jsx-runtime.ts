// TypeScript の react-jsx 変換に互換の最小自動JSXランタイム
// 基本的な組み込み要素(div, input)の className/style/属性/イベントに対応

export type StyleObject = Partial<{
  [K in keyof CSSStyleDeclaration]?: string | number | null | undefined;
}>;

export interface DivProps {
  className?: string;
  style?: StyleObject;
  children?: JSXChild | JSXChild[];
  [key: string]: any;
}

export type JSXChild = Node | string | number | boolean | null | undefined;
type Component<P = Record<string, unknown>> = (props: P) => JSXChild;

function appendChild(parent: HTMLElement | DocumentFragment, child: JSXChild): void {
  if (child == null || child === false) return;
  if (Array.isArray(child)) {
    for (const c of child) appendChild(parent, c as JSXChild);
    return;
  }
  if (child instanceof Node) {
    parent.appendChild(child);
  } else {
    parent.appendChild(document.createTextNode(String(child)));
  }
}

function applyStyle(el: HTMLElement, style?: StyleObject): void {
  if (!style) return;
  for (const key in style) {
    const val = style[key as keyof StyleObject];
    if (val == null) continue;
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    el.style.setProperty(cssKey, String(val));
  }
}

function setProps(el: HTMLElement, props: DivProps | null | undefined): void {
  if (!props) return;
  const { className, style, children, ...rest } = props ?? {};
  if (className) el.className = className;
  if (style) applyStyle(el, style);

  // events: onClick, onInput, onChange, etc.
  for (const key in rest) {
    const val = (rest as Record<string, unknown>)[key];
    if (val == null) continue;
    if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, val as EventListener);
      continue;
    }
    (el as any)[key] = val as any;
  }

  if (children !== undefined) {
    const kids = Array.isArray(children) ? children : [children];
    for (const k of kids) appendChild(el, k as JSXChild);
  }
}

function createElement(tag: string, props: DivProps | null | undefined): HTMLElement {
  const el = document.createElement(tag);
  setProps(el, props);
  return el;
}

// These functions are called by the automatic JSX transform.
export function jsx(
  type: string | Component<any>,
  props: DivProps | Record<string, unknown> | null,
  _key?: unknown
): Node {
  if (typeof type === 'function') {
    const result = (type as Component<any>)(Object(props ?? {}));
    if (result instanceof Node) return result;
    return document.createTextNode(String(result ?? ''));
  }
  return createElement(type, props as DivProps | null | undefined);
}

export const jsxs = jsx;

export function Fragment(props: { children?: JSXChild | JSXChild[] }): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (props && props.children !== undefined) {
    const kids = Array.isArray(props.children) ? props.children : [props.children];
    for (const k of kids) appendChild(frag, k as JSXChild);
  }
  return frag;
}
