export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | undefined> = {},
  children: Array<Node | string | null | undefined> = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (key === "className") {
      node.className = String(value);
      continue;
    }
    if (value === true) {
      node.setAttribute(key, "");
      continue;
    }
    node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
