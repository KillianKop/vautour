/** Typed access to the static elements of index.html. */

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id} in index.html`);
  return el as T;
}

const lastHtml = new WeakMap<Element, string>();

/** Set innerHTML only when it changes (called every frame). */
export function setHTML(el: Element, html: string): void {
  if (lastHtml.get(el) === html) return;
  el.innerHTML = html;
  lastHtml.set(el, html);
}

export function getDom() {
  return {
    phone: byId("phone"),
    canvas: byId<HTMLCanvasElement>("map"),
    pins: byId("pins"),
    clock: byId("clock"),
    glider: byId("glider"),
    arrow: byId("arrow"),
    altChip: byId("altchip"),
    banner: byId("banner"),
    bannerIcon: byId("bicon"),
    bannerMain: byId("bmain"),
    bannerSub: byId("bsub"),
    bannerMeta: byId("bmeta"),
    bannerProgress: byId("bprog-bar"),
    next: byId("next"),
    alert: byId("alert"),
    side: byId("side"),
    compass: byId<HTMLButtonElement>("compass"),
    needle: byId("needle"),
    windArrow: byId("windarrow"),
    windText: byId("windtxt"),
    simBox: byId("simbox"),
    play: byId<HTMLButtonElement>("play"),
    speed: byId<HTMLButtonElement>("speed"),
    recenter: byId<HTMLButtonElement>("recenter"),
    vario: byId("vario"),
    varioValue: byId("vval"),
    varioUnit: byId("vunit"),
    groundSpeed: byId("gs"),
    report: byId<HTMLButtonElement>("report"),
    bar: byId("bar"),
    overview: byId<HTMLButtonElement>("overview"),
    eta: byId<HTMLButtonElement>("eta"),
    etaTime: byId("etat"),
    etaSub: byId("etas"),
    sound: byId<HTMLButtonElement>("sound"),
    routes: byId<HTMLButtonElement>("routes"),
    scrim: byId("scrim"),
    sheet: byId("sheet"),
    toast: byId("toast"),
    loading: byId("loading"),
    caption: byId("caption"),
  };
}

export type Dom = ReturnType<typeof getDom>;
