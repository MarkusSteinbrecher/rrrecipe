import { BROWSE_FRAGMENT } from "./render-browse";

export { BROWSE_FRAGMENT };

export function mountIndexFragments(opts: { ids: readonly string[] }): Record<string, HTMLElement> {
  document.body.innerHTML = BROWSE_FRAGMENT;
  const refs: Record<string, HTMLElement> = {};
  for (const id of opts.ids) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`render-test-harness: #${id} not found in body`);
    refs[id] = el;
  }
  return refs;
}
