import { BROWSE_FRAGMENT } from "./render-browse";
import { DETAIL_FRAGMENT } from "./render-detail";
import { EDITOR_FRAGMENT } from "./render-editor";
import { IMPORT_FRAGMENT } from "./render-import";

export { BROWSE_FRAGMENT, DETAIL_FRAGMENT, EDITOR_FRAGMENT, IMPORT_FRAGMENT };

export function mountIndexFragments(opts: { ids: readonly string[] }): Record<string, HTMLElement> {
  document.body.innerHTML = `${BROWSE_FRAGMENT}${IMPORT_FRAGMENT}${DETAIL_FRAGMENT}${EDITOR_FRAGMENT}`;
  const refs: Record<string, HTMLElement> = {};
  for (const id of opts.ids) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`render-test-harness: #${id} not found in body`);
    refs[id] = el;
  }
  return refs;
}
