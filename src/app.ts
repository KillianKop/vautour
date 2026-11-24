/**
 * The application: owns the state, wires the modules together and runs the frame loop.
 *
 *   PositionSource (Simulator) ──NavState──> guidance ──Instruction──> banner
 *                                      │──> Camera ──> map renderer + pins
 *                                      └──> HUD, alerts, sound
 */
import { Sound } from "./audio/sound";
import { type Locale, setLocale, t } from "./i18n";
import { Camera, fitView, type View } from "./map/camera";
import { PinLayer } from "./map/pins";
import { drawMap, type MapScene } from "./map/renderer";
import { APPROACH_M, approachAnnouncement, instruction, segmentAnnouncement } from "./nav/guidance";
import type { NavState } from "./nav/position";
import { flownDistance, isClosedCircuit, type NavRoute, prepareRoute } from "./nav/route";
import { SIM_SPEEDS, Simulator } from "./nav/simulator";
import { Elevation } from "./package/elevation";
import { weatherAt } from "./package/queries";
import type { FlightPackage } from "./package/types";
import type { ReportKind } from "./reports/catalog";
import { reportIcon } from "./reports/catalog";
import { type DemoPilot, demoPilots, demoReports, pilotPosition } from "./reports/demo";
import { ReportStore } from "./reports/store";
import { renderBanner, setBannerVisible } from "./ui/banner";
import { type Dom, getDom, setHTML } from "./ui/dom";
import { attachGestures } from "./ui/gestures";
import { pilotIcon, UI_ICONS } from "./ui/icons";
import { hideAlert, showAlert, toast } from "./ui/notify";
import { showEnd, showMenu, showReportMenu, showStart } from "./ui/screens";
import { Sheet } from "./ui/sheet";
import { esc, fmt1, fmtDist, fmtDuration, fmtHour, fmtInt, fmtRate } from "./util/format";
import { clamp } from "./util/math";
import { keepScreenOn } from "./util/wakelock";

export type Mode = "start" | "nav" | "end";

/** Screen height fraction of the glider in navigation (Waze-like, low on the screen). */
const GLIDER_Y = 0.64;

export class App {
  readonly dom: Dom = getDom();
  readonly elevation: Elevation;
  readonly routes: NavRoute[];
  readonly camera = new Camera();
  readonly sound = new Sound();
  readonly sheet = new Sheet(this.dom);
  readonly reports = new ReportStore();
  readonly sim: Simulator;
  readonly layers = { lift: true, pilots: true, reports: true };
  private readonly pins = new PinLayer(this.dom.pins);
  private readonly ctx: CanvasRenderingContext2D;

  routeIndex = 0;
  route: NavRoute;
  mode: Mode = "start";
  overview = false;
  northUp = false;
  state: NavState;
  validated = new Set<number>();
  sent = 0;
  maxAlt = 0;
  pilots: DemoPilot[] = [];

  private pausedBeforeSheet = false;
  private lastSegment = -1;
  private spoken = new Set<string>();
  private w = 0;
  private h = 0;
  private dpr = 1;
  private scale = 1;
  private lastFrame = 0;

  constructor(
    readonly pkg: FlightPackage,
    private readonly terrain: HTMLImageElement,
    private readonly lift: HTMLCanvasElement[],
  ) {
    const ctx = this.dom.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.elevation = Elevation.fromPackage(pkg);
    this.routes = pkg.routes.map((r) => prepareRoute(pkg, r));
    this.route = this.routes[0];
    this.sim = new Simulator(this.route);
    this.state = this.sim.update(0, 0);
    this.bindControls();
    attachGestures(
      this.dom.canvas,
      this.camera,
      () => this.scale,
      () => this.showRecenter(),
    );
    window.addEventListener("resize", () => this.layout());
    this.selectRoute(0);
    this.applyStaticTexts();
    this.layout();
  }

  // ------------------------------------------------------------------ flow

  selectRoute(index: number): void {
    this.routeIndex = index;
    this.route = this.routes[index];
    this.sim.reset(this.route);
    this.reports.items = demoReports(this.pkg, this.route, this.elevation);
    this.pilots = demoPilots(this.pkg, this.route);
    this.pins.clear();
    this.camera.snap = true;
    this.state = this.sim.update(0, 0);
  }

  showStart(): void {
    this.mode = "start";
    this.sim.reset(this.route);
    this.state = this.sim.update(0, 0);
    this.camera.recenter();
    this.camera.snap = true;
    setBannerVisible(this.dom, false);
    hideAlert(this.dom);
    keepScreenOn(false);
    showStart(this);
  }

  startFlight(): void {
    this.mode = "nav";
    this.overview = false;
    this.sim.reset(this.route);
    this.sim.paused = false;
    this.validated = new Set();
    this.spoken = new Set();
    this.lastSegment = -1;
    this.maxAlt = 0;
    this.reports.rearm();
    this.camera.recenter();
    this.camera.snap = true;
    setBannerVisible(this.dom, true);
    keepScreenOn(true);
    this.renderControls();
  }

  stopFlight(): void {
    this.closeSheet();
    this.sound.stopSpeaking();
    this.showStart();
  }

  private finish(): void {
    this.mode = "end";
    for (const node of this.route.turnpoints.keys()) {
      if (node === this.route.endNode) this.validated.add(node);
    }
    this.sound.chime();
    this.sound.say(
      isClosedCircuit(this.route.kind) ? t().voice.endTriangle : t().voice.endFree,
      t().speechLang,
    );
    setBannerVisible(this.dom, false);
    keepScreenOn(false);
    showEnd(this);
  }

  sendReport(kind: ReportKind, variant: number): void {
    const { x, y } = this.state.fix;
    this.reports.add(kind, variant, x, y);
    this.sent++;
    this.closeSheet();
    this.sound.chime();
    toast(this.dom, t().report.sent(t().reports[kind].title), t().report.karmaSent);
  }

  /** Pause the simulation while a sheet is open in flight. */
  pauseForSheet(): void {
    if (!this.sheet.isOpen) this.pausedBeforeSheet = this.sim.paused;
    this.sim.paused = true;
    this.renderControls();
  }

  closeSheet(): void {
    this.sheet.close();
    if (this.mode === "nav") this.sim.paused = this.pausedBeforeSheet;
    this.renderControls();
  }

  setLocale(locale: Locale): void {
    setLocale(locale);
    this.applyStaticTexts();
  }

  // ------------------------------------------------------------------ controls

  private bindControls(): void {
    const d = this.dom;
    d.play.onclick = () => {
      this.sim.paused = !this.sim.paused;
      this.renderControls();
    };
    d.speed.onclick = () => {
      const i = SIM_SPEEDS.indexOf(this.sim.speed as (typeof SIM_SPEEDS)[number]);
      this.sim.speed = SIM_SPEEDS[(i + 1) % SIM_SPEEDS.length];
      this.renderControls();
    };
    d.sound.onclick = () => {
      this.sound.enabled = !this.sound.enabled;
      this.sound.unlock();
      if (!this.sound.enabled) this.sound.stopSpeaking();
      this.renderControls();
    };
    d.overview.onclick = () => {
      if (this.mode !== "nav") return;
      this.overview = !this.overview;
      this.camera.recenter();
      this.renderControls();
    };
    d.routes.onclick = () => this.mode === "nav" && showMenu(this);
    d.eta.onclick = () => this.mode === "nav" && showMenu(this);
    d.report.onclick = () => {
      if (this.mode === "nav") showReportMenu(this);
      else toast(this.dom, t().report.inFlightOnly, t().report.inFlightOnlySub);
    };
    d.compass.onclick = () => {
      this.northUp = !this.northUp;
      toast(this.dom, this.northUp ? t().toast.northUp : t().toast.trackUp);
    };
    d.recenter.onclick = () => {
      this.camera.recenter();
      d.recenter.classList.remove("on");
    };
    // First tap anywhere unlocks audio (required by Safari iOS).
    document.addEventListener("pointerdown", () => this.sound.unlock(), { once: true });
  }

  private renderControls(): void {
    const d = this.dom;
    const m = t();
    d.play.innerHTML = this.sim.paused ? UI_ICONS.play : UI_ICONS.pause;
    d.play.setAttribute("aria-label", this.sim.paused ? m.controls.play : m.controls.pause);
    d.speed.textContent = `×${this.sim.speed}`;
    d.sound.innerHTML = this.sound.enabled ? UI_ICONS.soundOn : UI_ICONS.soundOff;
    d.overview.classList.toggle("on", this.overview);
  }

  private applyStaticTexts(): void {
    const d = this.dom;
    const m = t();
    document.documentElement.lang = m.locale.slice(0, 2);
    d.phone.setAttribute("aria-label", m.appLabel);
    d.caption.textContent = m.demoCaption;
    d.varioUnit.textContent = m.hud.vario;
    d.report.innerHTML = UI_ICONS.report;
    d.overview.innerHTML = UI_ICONS.overview;
    d.routes.innerHTML = UI_ICONS.routes;
    const labels: [HTMLElement, string][] = [
      [d.speed, m.controls.speed],
      [d.overview, m.controls.overview],
      [d.sound, m.controls.sound],
      [d.routes, m.controls.routes],
      [d.report, m.controls.report],
      [d.compass, m.controls.compass],
      [d.eta, m.controls.menu],
    ];
    for (const [el, label] of labels) el.setAttribute("aria-label", label);
    d.recenter.querySelector("span")!.textContent = m.controls.recenter;
    this.renderControls();
  }

  private showRecenter(): void {
    this.dom.recenter.classList.toggle("on", this.camera.panned);
  }

  // ------------------------------------------------------------------ layout

  layout(): void {
    const d = this.dom;
    const framed = window.matchMedia("(min-width: 561px) and (min-height: 641px)").matches;
    this.scale = framed ? Math.min(1, (window.innerHeight - 70) / 868, (window.innerWidth - 24) / 414) : 1;
    document.documentElement.style.setProperty("--s", String(this.scale));
    this.w = d.phone.clientWidth;
    this.h = d.phone.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    d.canvas.width = Math.round(this.w * this.dpr);
    d.canvas.height = Math.round(this.h * this.dpr);
    const bar = d.bar.offsetHeight;
    d.vario.style.bottom = `${bar + 14}px`;
    d.report.style.bottom = `${bar + 14}px`;
    d.groundSpeed.style.bottom = `${bar + 18}px`;
    d.simBox.style.bottom = `${bar + 104}px`;
    d.recenter.style.bottom = `${bar + 104}px`;
    const top = getComputedStyle(d.phone).getPropertyValue("--safe-top").trim() || "0px";
    d.side.style.top = `calc(${top} + 200px)`;
  }

  // ------------------------------------------------------------------ frame loop

  start(): void {
    const loop = (now: number) => {
      this.frame(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private frame(now: number): void {
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.1) : 0;
    this.lastFrame = now;
    const flying = this.mode === "nav";
    if (flying) {
      this.state = this.sim.update(dt, now / 1000);
      this.maxAlt = Math.max(this.maxAlt, this.state.fix.alt);
      if (this.state.finished) this.finish();
      else this.guide(now);
    }
    this.updateCamera(dt);
    this.drawGlider();
    this.renderHud();
    drawMap(this.ctx, this.w, this.h, this.dpr, this.camera, this.scene());
    this.drawPins();
  }

  private guide(now: number): void {
    const { segment } = this.state;
    const s = this.route.segments[segment];
    const m = t();
    if (segment !== this.lastSegment) {
      const prev = this.route.segments[segment - 1];
      if (prev?.type === "glide") this.validateTurnpoint(prev.dst);
      this.sound.say(segmentAnnouncement(this.route, segment), m.speechLang);
      this.lastSegment = segment;
    }
    if (s.type === "glide") {
      const remaining = Math.hypot(s.x1 - this.state.fix.x, s.y1 - this.state.fix.y);
      const key = `approach-${segment}`;
      if (remaining < APPROACH_M && remaining > 300 && !this.spoken.has(key)) {
        this.spoken.add(key);
        this.sound.say(approachAnnouncement(this.pkg, this.route, segment, this.state.t), m.speechLang);
      }
    }
    renderBanner(this.dom, instruction(this.pkg, this.route, this.state));
    if (this.layers.reports) {
      const report = this.reports.nextAlert(this.state.fix.x, this.state.fix.y, s.bearing);
      if (report) {
        const d = Math.hypot(report.x - this.state.fix.x, report.y - this.state.fix.y);
        showAlert(this.dom, report, d, (still) => this.reports.vote(report, still));
        this.sound.tone(740, 0.12, 0.06);
        const k = m.reports[report.kind];
        this.sound.say(m.voice.hazardAhead(k.say, k.plural), m.speechLang);
      }
    }
    this.sound.vario(now, this.state.fix.vario, !this.sim.paused);
  }

  private validateTurnpoint(node: number): void {
    const label = this.route.turnpoints.get(node);
    if (!label || this.validated.has(node)) return;
    this.validated.add(node);
    this.sound.chime();
    toast(
      this.dom,
      t().toast.turnpoint(label),
      t().toast.ofTotal(this.validated.size, this.route.turnpoints.size),
    );
    window.setTimeout(() => this.sound.say(t().voice.turnpoint(label), t().speechLang), 50);
  }

  private updateCamera(dt: number): void {
    const cam = this.camera;
    const navigating = this.mode === "nav" && !this.overview;
    cam.anchorX = this.w / 2;
    cam.anchorY = this.h * (navigating ? GLIDER_Y : this.mode === "nav" ? 0.46 : 0.3);
    let target: View;
    if (navigating) {
      const s = this.route.segments[this.state.segment];
      const { x, y } = this.state.fix;
      const remaining = s.type === "glide" ? Math.hypot(s.x1 - x, s.y1 - y) : 600;
      target = {
        cx: x,
        cy: y,
        bearing: this.northUp ? 0 : s.bearing,
        zoom: s.type === "climb" ? 0.13 : clamp((this.h * 0.5) / Math.max(remaining, 1600), 0.045, 0.12),
      };
    } else {
      target = fitView(this.route.path, this.w - 30, this.h * (this.mode === "nav" ? 0.62 : 0.42));
    }
    cam.follow(target, dt);
  }

  private scene(): MapScene {
    const flying = this.mode === "nav";
    const featured = new Set<number>();
    const onRoute = new Set<number>();
    const segs = this.route.segments;
    for (const s of segs) if (s.type === "climb") onRoute.add(s.node);
    if (flying && !this.overview) {
      for (let j = this.state.segment, n = 0; j < segs.length && n < 4; j++) {
        const s = segs[j];
        if (s.type === "climb") {
          featured.add(s.node);
          n++;
        }
      }
    }
    return {
      pkg: this.pkg,
      terrain: this.terrain,
      lift: this.lift,
      route: this.route,
      alternatives: this.mode === "start" ? this.routes.filter((r) => r !== this.route) : [],
      hour: this.state.t,
      showLift: this.layers.lift,
      progress: flying
        ? { segment: this.state.segment, x: this.state.fix.x, y: this.state.fix.y }
        : undefined,
      featured,
      onRoute,
    };
  }

  private drawGlider(): void {
    const d = this.dom;
    const flying = this.mode === "nav";
    d.glider.style.display = flying ? "" : "none";
    if (!flying) return;
    const [x, y] = this.camera.project(this.state.fix.x, this.state.fix.y);
    d.glider.style.left = `${x}px`;
    d.glider.style.top = `${y}px`;
    d.arrow.style.transform = `rotate(${(((this.state.fix.heading - this.camera.bearing) * 180) / Math.PI).toFixed(1)}deg)`;
  }

  private renderHud(): void {
    const d = this.dom;
    const m = t();
    const { fix } = this.state;
    const agl = fix.alt - this.elevation.at(fix.x, fix.y);
    d.varioValue.textContent = fmtRate(fix.vario);
    d.vario.dataset.tone = fix.vario > 0.3 ? "up" : fix.vario < -1.6 ? "down" : "";
    setHTML(d.groundSpeed, `<b>${Math.round(fix.groundSpeed)}</b> <span>${esc(m.hud.groundSpeed)}</span>`);
    setHTML(
      d.altChip,
      `<b>${esc(fmtInt(fix.alt))} m</b> · ${esc(m.hud.aboveGround)} ${agl >= 0 ? "+" : "−"}${esc(fmtInt(Math.abs(agl)))}`,
    );
    const r = this.route;
    const flown = flownDistance(r, this.state.segment, fix.x, fix.y);
    d.etaTime.textContent = fmtHour(r.tEnd);
    d.etaSub.textContent = m.hud.eta(
      fmtDuration(r.tEnd - this.state.t),
      fmtDist(r.total - flown),
      fmt1(r.points),
    );
    d.clock.textContent = fmtHour(this.state.t);
    const w = weatherAt(this.pkg, this.state.t);
    d.windText.textContent = `${w.wind_aloft[0]} km/h`;
    const deg = (rad: number) => (rad * 180) / Math.PI;
    d.windArrow.setAttribute(
      "transform",
      `rotate(${(w.wind_aloft[1] + 180 - deg(this.camera.bearing)).toFixed(1)} 11 11)`,
    );
    d.needle.setAttribute("transform", `rotate(${(-deg(this.camera.bearing)).toFixed(1)} 13 13)`);
  }

  private drawPins(): void {
    const { pins, camera, pkg, route, w, h } = this;
    pins.begin();
    const launch = pkg.nodes[pkg.takeoff];
    let [x, y] = camera.project(launch.x, launch.y);
    pins.place(
      pins.pin("launch", `<div class="tp launch">${UI_ICONS.flag}${esc(t().launch)}</div>`),
      x,
      y,
      w,
      h,
    );
    for (const [node, label] of route.turnpoints) {
      const n = pkg.nodes[node];
      const done = this.validated.has(node);
      [x, y] = camera.project(n.x, n.y);
      const el = pins.pin(
        `tp-${node}`,
        `<div class="tp ${done ? "done" : ""}">${done ? UI_ICONS.check : UI_ICONS.flag}${esc(label)}</div>`,
      );
      pins.place(el, x, y - 14, w, h);
    }
    if (this.layers.reports) {
      for (const r of this.reports.items) {
        [x, y] = camera.project(r.x, r.y);
        const el = pins.pin(
          r.id,
          `<button type="button" class="bub">${reportIcon(r.kind)}</button>`,
          r.author === null ? "drop" : "",
        );
        el.onclick = () => {
          const d = this.mode === "nav" ? Math.hypot(r.x - this.state.fix.x, r.y - this.state.fix.y) : null;
          showAlert(this.dom, r, d, (still) => this.reports.vote(r, still));
        };
        pins.place(el, x, y, w, h);
      }
    }
    if (this.layers.pilots && this.mode === "nav") {
      for (const p of this.pilots) {
        const pos = pilotPosition(pkg, p, this.state.t * 3600);
        [x, y] = camera.project(pos.x, pos.y);
        const el = pins.pin(
          `pilot-${p.name}`,
          `<div class="pilot">${pilotIcon(p.color)}<span>${esc(p.name)}</span></div>`,
        );
        const icon = el.querySelector<SVGElement>("svg");
        if (icon)
          icon.style.transform = `rotate(${(((pos.heading - camera.bearing) * 180) / Math.PI).toFixed(0)}deg)`;
        pins.place(el, x, y, w, h);
      }
    }
    pins.end();
  }
}
