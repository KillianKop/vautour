/** Maneuver banner at the top of the screen and the "then…" line under it. */
import type { Instruction } from "../nav/guidance";
import { esc } from "../util/format";
import type { Dom } from "./dom";
import { setHTML } from "./dom";
import { MANEUVER_ICONS } from "./icons";

const TONE_CLASS = { sun: "sun", good: "good", warn: "warn", bad: "bad" } as const;

export function renderBanner(dom: Dom, ins: Instruction): void {
  setHTML(dom.bannerIcon, MANEUVER_ICONS[ins.maneuver]);
  dom.bannerIcon.classList.toggle("spin", ins.spin);
  setHTML(dom.bannerMain, `${ins.lead ? `<small>${esc(ins.lead)}</small>` : ""}${esc(ins.main)}`);
  setHTML(dom.bannerSub, esc(ins.sub));
  setHTML(
    dom.bannerMeta,
    ins.chips
      .map(
        (c) =>
          `<span class="chip ${c.tone ? TONE_CLASS[c.tone] : ""}">${c.tone && c.tone !== "sun" ? "<i></i>" : ""}${esc(c.text)}</span>`,
      )
      .join(""),
  );
  dom.bannerProgress.style.width = `${(ins.progress * 100).toFixed(1)}%`;
  dom.next.hidden = !ins.next;
  if (ins.next) setHTML(dom.next, `${MANEUVER_ICONS[ins.next.maneuver]}<span>${esc(ins.next.text)}</span>`);
  dom.next.style.top = `${dom.banner.offsetTop + dom.banner.offsetHeight - 12}px`;
}

export function setBannerVisible(dom: Dom, visible: boolean): void {
  dom.banner.classList.toggle("hide", !visible);
  if (!visible) dom.next.hidden = true;
}

/** Top (px) below the banner and the "then…" line, where cards can be shown. */
export function belowBanner(dom: Dom): number {
  if (dom.banner.classList.contains("hide")) return dom.banner.offsetTop;
  if (dom.next.hidden) return dom.banner.offsetTop + dom.banner.offsetHeight + 8;
  return dom.next.offsetTop + dom.next.offsetHeight + 8;
}
