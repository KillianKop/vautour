/** Content of the bottom sheets. Every value inserted as HTML goes through `esc`. */
import type { App } from "../app";
import { getLocale, LOCALES, type Locale, t } from "../i18n";
import { climbCount, isClosedCircuit, type NavRoute } from "../nav/route";
import { SIM_SPEEDS } from "../nav/simulator";
import { weatherAt } from "../package/queries";
import { REPORT_KINDS, type ReportKind, reportIcon } from "../reports/catalog";
import { cardinal, esc, fmt1, fmtAlt, fmtDuration, fmtHour, fmtInt } from "../util/format";

const LOCALE_NAMES: Record<Locale, string> = { fr: "Français", en: "English" };

function routeGlyph(app: App, route: NavRoute): string {
  const pts = route.scoring.map((i) => app.pkg.nodes[i]);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
  const poly = pts
    .map((p) => `${(6 + ((p.x - x0) / size) * 46).toFixed(1)},${(52 - ((p.y - y0) / size) * 46).toFixed(1)}`)
    .join(" ");
  const fill = isClosedCircuit(route.kind) ? "rgba(140,92,255,.18)" : "none";
  return `<svg viewBox="0 0 58 58" aria-hidden="true"><polyline points="${poly}" fill="${fill}" stroke="#8c5cff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function routeCards(app: App): string {
  const m = t();
  return `<div class="cards">${app.routes
    .map(
      (r, k) =>
        `<button type="button" class="rc ${k === app.routeIndex ? "sel" : ""}" data-route="${k}">` +
        `<span class="k">${esc(m.routeKinds[r.kind])}</span><span class="d">${esc(fmt1(r.distanceKm))} km</span>` +
        `<span class="m">${esc(m.start.card(fmt1(r.points), fmtHour(r.tStart), fmtHour(r.tEnd)))}</span>${routeGlyph(app, r)}</button>`,
    )
    .join("")}</div>`;
}

function bindRouteCards(app: App, root: HTMLElement, after: () => void): void {
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-route]")) {
    b.onclick = () => {
      app.selectRoute(Number(b.dataset.route));
      after();
    };
  }
}

function weatherLine(app: App): string {
  const m = t();
  const w = weatherAt(app.pkg, 13.5);
  const items = [
    m.start.wind(w.wind[0], m.aspects[cardinal(w.wind[1])]),
    m.start.aloft(w.wind_aloft[0]),
    m.start.ceiling(fmtAlt(w.ceiling)),
    m.start.base(fmtAlt(w.base)),
  ];
  return `<div class="wx">${items.map((s) => `<span>${esc(s)}</span>`).join("")}</div>`;
}

export function showStart(app: App): void {
  const m = t();
  const launch = app.pkg.nodes[app.pkg.takeoff];
  const root = app.sheet.open(
    `<h2>${esc(m.start.title)}</h2><p class="lead">${esc(m.start.lead(fmtAlt(launch.z), climbCount(app.route)))}</p>` +
      `${routeCards(app)}${weatherLine(app)}<button type="button" class="big" id="go">${esc(m.start.go)}</button>` +
      `<p class="credits">${app.pkg.meta.attribution.map((a) => esc(a)).join("<br>")}</p>`,
    false,
  );
  bindRouteCards(app, root, () => showStart(app));
  root.querySelector<HTMLButtonElement>("#go")!.onclick = () => {
    app.sound.unlock();
    app.sheet.close();
    app.startFlight();
  };
}

export function showReportMenu(app: App): void {
  const m = t();
  app.pauseForSheet();
  const root = app.sheet.open(
    `<h2>${esc(m.report.title)}</h2><p class="lead">${esc(m.report.lead)}</p><div class="grid3">${REPORT_KINDS.map(
      (k) =>
        `<button type="button" class="tile" data-kind="${k}">${reportIcon(k)}<span>${esc(m.reports[k].title)}</span></button>`,
    ).join("")}</div>`,
    true,
  );
  app.sheet.onDismiss = () => app.closeSheet();
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-kind]")) {
    b.onclick = () => showReportVariant(app, b.dataset.kind as ReportKind, 0);
  }
}

export function showReportVariant(app: App, kind: ReportKind, selected: number): void {
  const m = t();
  const k = m.reports[kind];
  const sos =
    kind === "crash"
      ? `<p class="sos">${esc(m.report.sosBefore)}<a href="tel:${m.report.sosNumber}">${esc(m.report.sosNumber)}</a>${esc(m.report.sosAfter)}</p>`
      : "";
  const root = app.sheet.open(
    `<div class="head">${reportIcon(kind)}<div><h2>${esc(k.title)}</h2><p class="lead flush">${esc(m.report.here(fmtAlt(app.state.fix.alt)))}</p></div></div>` +
      `${sos}<div class="opts">${k.variants
        .map(
          (v, i) =>
            `<button type="button" class="opt ${i === selected ? "sel" : ""}" data-variant="${i}">${esc(v)}<span class="dot"></span></button>`,
        )
        .join("")}</div>` +
      `<button type="button" class="big" id="send">${esc(m.report.send)}</button><button type="button" class="ghost" id="back">${esc(m.report.back)}</button>`,
    true,
  );
  app.sheet.onDismiss = () => app.closeSheet();
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-variant]")) {
    b.onclick = () => showReportVariant(app, kind, Number(b.dataset.variant));
  }
  root.querySelector<HTMLButtonElement>("#send")!.onclick = () => app.sendReport(kind, selected);
  root.querySelector<HTMLButtonElement>("#back")!.onclick = () => showReportMenu(app);
}

export function showMenu(app: App): void {
  const m = t();
  app.pauseForSheet();
  const pill = (attr: string, value: string, label: string, on: boolean) =>
    `<button type="button" class="pill ${on ? "on" : ""}" ${attr}="${value}">${esc(label)}</button>`;
  const layerKeys = ["lift", "pilots", "reports"] as const;
  const root = app.sheet.open(
    `<h2>${esc(m.routeKinds[app.route.kind])} · ${esc(fmt1(app.route.distanceKm))} km</h2>` +
      `<p class="lead">${esc(m.menu.summary(fmt1(app.route.points), fmtHour(app.route.tEnd)))}</p>` +
      `<div class="sec">${esc(m.menu.changeRoute)}</div>${routeCards(app)}` +
      `<div class="sec">${esc(m.menu.simSpeed)}</div><div class="row">${SIM_SPEEDS.map((v) => pill("data-speed", String(v), `×${v}`, v === app.sim.speed)).join("")}</div>` +
      `<div class="sec">${esc(m.menu.onMap)}</div><div class="row">${layerKeys.map((k) => pill("data-layer", k, m.menu.layers[k], app.layers[k])).join("")}</div>` +
      `<div class="sec">${esc(m.menu.language)}</div><div class="row">${(Object.keys(LOCALES) as Locale[]).map((l) => pill("data-locale", l, LOCALE_NAMES[l], l === getLocale())).join("")}</div>` +
      `<button type="button" class="ghost" id="stop">${esc(m.menu.stop)}</button>`,
    true,
  );
  app.sheet.onDismiss = () => app.closeSheet();
  bindRouteCards(app, root, () => {
    app.closeSheet();
    app.startFlight();
  });
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-speed]")) {
    b.onclick = () => {
      app.sim.speed = Number(b.dataset.speed);
      showMenu(app);
    };
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-layer]")) {
    b.onclick = () => {
      const key = b.dataset.layer as (typeof layerKeys)[number];
      app.layers[key] = !app.layers[key];
      showMenu(app);
    };
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-locale]")) {
    b.onclick = () => {
      app.setLocale(b.dataset.locale as Locale);
      showMenu(app);
    };
  }
  root.querySelector<HTMLButtonElement>("#stop")!.onclick = () => app.stopFlight();
}

export function showEnd(app: App): void {
  const m = t();
  const r = app.route;
  const stat = (value: string, label: string) => `<div><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
  const root = app.sheet.open(
    `<h2>${esc(isClosedCircuit(r.kind) ? m.end.triangle : m.end.free)}</h2>` +
      `<p class="lead">${esc(m.end.lead(m.routeKinds[r.kind], `${fmt1(r.distanceKm)} km`, fmtHour(r.tEnd)))}</p>` +
      `<div class="stats">${stat(fmt1(r.points), m.end.points)}${stat(fmtDuration(r.tEnd - r.tStart), m.end.airborne)}${stat(fmtInt(app.maxAlt), m.end.maxAlt)}` +
      `${stat(`${app.validated.size}/${r.turnpoints.size}`, m.end.turnpoints)}${stat(String(climbCount(r)), m.end.thermals)}${stat(String(app.sent), m.end.reports)}</div>` +
      `<button type="button" class="big" id="again">${esc(m.end.again)}</button><button type="button" class="ghost" id="other">${esc(m.end.other)}</button>`,
    false,
  );
  root.querySelector<HTMLButtonElement>("#again")!.onclick = () => {
    app.sheet.close();
    app.startFlight();
  };
  root.querySelector<HTMLButtonElement>("#other")!.onclick = () => {
    app.sheet.close();
    app.showStart();
  };
}
