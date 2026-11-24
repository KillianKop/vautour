/**
 * Developer switches read from the query string, for screenshots and manual tests:
 *   ?autostart=1&route=0&dt=1.5&paused=1&sheet=report|crash|menu|end&alert=sink&overview=1&lang=en
 * `dt` is the time since takeoff in hours. Ignored when `autostart` is absent (except `lang`).
 */
import type { App } from "./app";
import type { Locale } from "./i18n";
import { LOCALES } from "./i18n";
import type { ReportKind } from "./reports/catalog";
import { showAlert } from "./ui/notify";
import { showMenu, showReportMenu, showReportVariant } from "./ui/screens";

export function applyDevParams(app: App, search: string): boolean {
  const q = new URLSearchParams(search);
  const lang = q.get("lang");
  if (lang && lang in LOCALES) app.setLocale(lang as Locale);
  if (!q.get("autostart")) return false;
  app.selectRoute(Math.min(Number(q.get("route") ?? 0), app.routes.length - 1));
  app.startFlight();
  app.sound.enabled = false;
  app.sim.seek(app.route.tStart + Number(q.get("dt") ?? 0));
  if (q.get("paused")) app.sim.paused = true;
  if (q.get("overview")) app.overview = true;
  const later = (fn: () => void) => window.setTimeout(fn, 300);
  switch (q.get("sheet")) {
    case "report":
      later(() => showReportMenu(app));
      break;
    case "crash":
      later(() => showReportVariant(app, "crash", 1));
      break;
    case "menu":
      later(() => showMenu(app));
      break;
    case "end":
      // Preview the summary of a completed flight: every turnpoint made, top of the highest climb
      for (const node of app.route.turnpoints.keys()) app.validated.add(node);
      app.maxAlt = Math.max(...app.route.segments.map((seg) => Math.max(seg.a0, seg.a1)));
      app.sim.seek(app.route.tEnd);
      break;
  }
  const alert = q.get("alert");
  if (alert) {
    later(() => {
      const r = app.reports.items.find((x) => x.kind === (alert as ReportKind)) ?? app.reports.items[0];
      if (r) showAlert(app.dom, r, null, () => undefined);
    });
  }
  return true;
}
