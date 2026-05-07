const ICON_PATHS = {
  search: `<circle cx="11" cy="11" r="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m20 20-3.5-3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  plus: `<path d="M12 5v14M5 12h14" stroke-linecap="round"/>`,
  minus: `<path d="M5 12h14" stroke-linecap="round"/>`,
  download: `<path d="M12 3v12m0 0 5-5m-5 5-5-5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21h14" stroke-linecap="round"/>`,
  youtubeOfficial: `<rect x="2" y="5" width="20" height="14" rx="4" fill="#ff0000" stroke="none"/><path d="M10 9v6l5.2-3L10 9z" fill="#fff" stroke="none"/>`,
  check: `<path d="M5 12l5 5 9-11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/>`,
  chevR: `<path d="M9 5l7 7-7 7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevL: `<path d="M15 5l-7 7 7 7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  play: `<path d="M8 5v14l11-7L8 5z"/>`,
  pause: `<rect x="7" y="5" width="3" height="14"/><rect x="14" y="5" width="3" height="14"/>`,
  mic: `<rect x="9" y="3" width="6" height="12" rx="3" fill="none"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke-linecap="round" fill="none"/>`,
  flame: `<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" fill="none" stroke-linejoin="round"/>`,
  timer: `<circle cx="12" cy="13" r="7" fill="none"/><path d="M12 9v4l2 2M9 3h6" stroke-linecap="round" fill="none"/>`,
  home: `<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4v-9z" fill="none" stroke-linejoin="round"/>`,
  book: `<path d="M5 4h7a3 3 0 0 1 3 3v13H7a2 2 0 0 0 2 2H5V4z" fill="none" stroke-linejoin="round"/>`,
  heart: `<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="none" stroke-linejoin="round"/>`,
  star: `<path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5-5.5-3.5L6.5 20.5 8 14 3 9.5l6.5-.5L12 3z" fill="none" stroke-linejoin="round"/>`,
  bell: `<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z" fill="none" stroke-linejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" fill="none" stroke-linecap="round"/>`,
  back: `<path d="M19 12H5m0 0l6-6m-6 6l6 6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  moon: `<path class="icon-theme-dark" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  sun: `<g class="icon-theme-light" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></g>`,
  youtube: `<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8z" fill="none" stroke-linejoin="round"/><path d="m10 9 5 3-5 3V9z" stroke-linejoin="round"/>`,
  settings: `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.38 1v.17a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-.38-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.38H2.83a2 2 0 1 1 0-4H3a1.7 1.7 0 0 0 1-.38 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .38-1V2.83a2 2 0 1 1 4 0V3a1.7 1.7 0 0 0 .38 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.22.35.55.68.95.84.2.08.43.13.65.13h.17a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1 .38 1.7 1.7 0 0 0-.6 1z"/></g>`,
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function icon(name: IconName, size = 14): string {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" fill="currentColor">${ICON_PATHS[name]}</svg>`;
}

export function iconElement(name: IconName, size = 14): SVGElement {
  const template = document.createElement("template");
  template.innerHTML = icon(name, size);
  return template.content.firstElementChild as SVGElement;
}
