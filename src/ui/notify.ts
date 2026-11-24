/** Toast messages and report alert cards. */
import { t } from "../i18n";
import { REPORT_KINDS, reportIcon } from "../reports/catalog";
import type { Report } from "../reports/store";
import { esc, fmtDist } from "../util/format";
import { belowBanner } from "./banner";
import type { Dom } from "./dom";
import { UI_ICONS } from "./icons";

let toastTimer = 0;

export function toast(dom: Dom, title: string, detail?: string): void {
  dom.toast.innerHTML = `${esc(title)}${detail ? `<small>${esc(detail)}</small>` : ""}`;
  dom.toast.classList.add("on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("on"), 2200);
}

let alertTimer = 0;

/** Show the alert card of a report; `distance` is omitted when the pilot is not flying. */
export function showAlert(
  dom: Dom,
  report: Report,
  distance: number | null,
  onVote: (stillThere: boolean) => void,
): void {
  if (!REPORT_KINDS.includes(report.kind)) return;
  const m = t();
  const k = m.reports[report.kind];
  const parts = [k.variants[report.variant] ?? ""];
  if (distance !== null) parts.push(m.alert.ahead(fmtDist(distance)));
  parts.push(report.author === null ? m.alert.byYou : m.alert.byOther(report.minutesAgo, report.author));
  dom.alert.innerHTML =
    `<div class="ic">${reportIcon(report.kind)}</div><div><h3>${esc(k.title)}</h3><p>${esc(parts.join(" · "))}</p></div>` +
    `<div class="acts"><button type="button" data-v="1">${UI_ICONS.thumbUp}${esc(m.alert.stillThere)}</button>` +
    `<button type="button" data-v="0">${UI_ICONS.thumbDown}${esc(m.alert.gone)}</button></div>`;
  dom.alert.style.top = `${belowBanner(dom)}px`;
  dom.alert.classList.add("on");
  for (const b of dom.alert.querySelectorAll<HTMLButtonElement>("button")) {
    b.onclick = () => {
      dom.alert.classList.remove("on");
      onVote(b.dataset.v === "1");
      toast(dom, m.alert.thanks, m.alert.karmaVote);
    };
  }
  window.clearTimeout(alertTimer);
  alertTimer = window.setTimeout(() => dom.alert.classList.remove("on"), 7000);
}

export function hideAlert(dom: Dom): void {
  dom.alert.classList.remove("on");
}
