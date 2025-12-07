// 簡易JSXファクトリ（className/style対応の<div>のみをサポート）

export type StyleObject = Partial<{
  [K in keyof CSSStyleDeclaration]?: string | number | null | undefined
}>;

export interface DivProps {
  className?: string;
  style?: StyleObject;
  children?: JSXChild | JSXChild[];
}

export type JSXChild = Node | string | number | null | undefined | boolean;

function appendChild(parent: HTMLElement, child: JSXChild): void {
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
    // Convert camelCase to kebab-case for setProperty
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    el.style.setProperty(cssKey, String(val));
  }
}

// 旧来のJSXファクトリ（自動ランタイム利用時は未使用だが互換のため残す）
export function h(type: 'div', props: DivProps | null, ...children: JSXChild[]): HTMLDivElement {
  if (type !== 'div') {
    throw new Error(`Only <div> is supported. Received <${type}>.`);
  }
  const el = document.createElement('div');

  if (props) {
    if (props.className) el.className = props.className;
    if (props.style) applyStyle(el, props.style);
    if (props.children !== undefined) {
      const propChildren = Array.isArray(props.children) ? props.children : [props.children];
      for (const c of propChildren) appendChild(el, c as JSXChild);
    }
  }

  for (const c of children) appendChild(el, c);

  return el as HTMLDivElement;
}

// コンテナへマウントするヘルパ
export function render(container: Element | null, node: Node): void {
  if (!container) throw new Error('Render target not found');
  // 既存の単一子ノードと同じ参照なら何もしない（無駄な再描画を避ける）
  if (container.childNodes.length === 1 && container.firstChild === node) return;

  // Replace existing children for deterministic rerenders
  if ('replaceChildren' in container && typeof container.replaceChildren === 'function') {
    container.replaceChildren(node);
  } else {
    container.innerHTML = '';
    container.appendChild(node);
  }
}

export default h;
