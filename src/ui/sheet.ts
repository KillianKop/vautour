/** Bottom sheet container (route choice, report menu, flight menu, end of flight). */
import type { Dom } from "./dom";

export class Sheet {
  isOpen = false;
  /** Called when the user taps the dimmed map behind a dismissable sheet. */
  onDismiss: (() => void) | null = null;

  constructor(private readonly dom: Dom) {
    dom.scrim.addEventListener("click", () => this.onDismiss?.());
  }

  /** Show `html`; a dismissable sheet dims the map and closes when it is tapped. */
  open(html: string, dismissable: boolean): HTMLElement {
    this.dom.sheet.innerHTML = `<div class="grab"></div>${html}`;
    this.dom.sheet.classList.add("on");
    this.dom.scrim.classList.toggle("on", dismissable);
    this.isOpen = true;
    return this.dom.sheet;
  }

  close(): void {
    this.dom.sheet.classList.remove("on");
    this.dom.scrim.classList.remove("on");
    this.isOpen = false;
    this.onDismiss = null;
  }
}
