import { BROWSE_FRAGMENT } from "./render-browse";
import { DETAIL_FRAGMENT } from "./render-detail";
import { IMPORT_FRAGMENT } from "./render-import";
import { MISE_FRAGMENT } from "./render-mise";

export { BROWSE_FRAGMENT, DETAIL_FRAGMENT, IMPORT_FRAGMENT, MISE_FRAGMENT };

export function mountIndexFragments(opts: { ids: readonly string[] }): Record<string, HTMLElement> {
  document.body.innerHTML = `${BROWSE_FRAGMENT}${IMPORT_FRAGMENT}${DETAIL_FRAGMENT}${MISE_FRAGMENT}`;
  const refs: Record<string, HTMLElement> = {};
  for (const id of opts.ids) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`render-test-harness: #${id} not found in body`);
    refs[id] = el;
  }
  return refs;
}
