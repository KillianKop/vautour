/** DOM markers over the map (launch, turnpoints, reports, other pilots), moved every frame. */

interface PinElement extends HTMLDivElement {
  _html?: string;
  _seen?: boolean;
}

export class PinLayer {
  private readonly pins = new Map<string, PinElement>();

  constructor(private readonly root: HTMLElement) {}

  /** Start a frame: pins not touched before `end()` are hidden. */
  begin(): void {
    for (const el of this.pins.values()) el._seen = false;
  }

  /** Get or create pin `id`; its HTML is rewritten only when it changes. */
  pin(id: string, html: string, className = ""): PinElement {
    let el = this.pins.get(id);
    if (!el) {
      el = document.createElement("div") as PinElement;
      el.className = `pin ${className}`.trim();
      this.root.appendChild(el);
      this.pins.set(id, el);
    }
    if (el._html !== html) {
      el.innerHTML = html;
      el._html = html;
    }
    el._seen = true;
    return el;
  }

  place(el: HTMLElement, x: number, y: number, w: number, h: number): void {
    const off = x < -60 || y < -60 || x > w + 60 || y > h + 60;
    el.style.display = off ? "none" : "";
    if (!off) el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  }

  end(): void {
    for (const el of this.pins.values()) if (!el._seen) el.style.display = "none";
  }

  clear(): void {
    for (const el of this.pins.values()) el.remove();
    this.pins.clear();
  }
}
