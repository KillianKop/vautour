/**
 * Canvas drawing of the moving map: terrain, lift overlay, routes, scoring polygon, thermals.
 * Only the visible part of the large images is drawn: drawing a huge, rotated, scaled image
 * gives wrong results in some software renderers and wastes time on phones.
 */
import type { NavRoute } from "../nav/route";
import { climbAt } from "../package/queries";
import type { FlightPackage } from "../package/types";
import { fmtRate } from "../util/format";
import { clamp } from "../util/math";
import type { Camera } from "./camera";

export interface MapScene {
  pkg: FlightPackage;
  terrain: HTMLImageElement;
  lift: HTMLCanvasElement[];
  route: NavRoute;
  /** Other candidate routes, drawn thin (route choice screen). */
  alternatives: NavRoute[];
  hour: number;
  showLift: boolean;
  /** In flight: the flown part of the route is greyed up to this point. */
  progress?: { segment: number; x: number; y: number };
  /** Thermals drawn large with their climb rate. */
  featured: Set<number>;
  /** Route thermals drawn as plain dots. */
  onRoute: Set<number>;
}

type Rect = [number, number, number, number];

/** World rectangle visible on screen, clipped to the map extent; null when the map is off screen. */
export function visibleRect(
  camera: Camera,
  w: number,
  h: number,
  width: number,
  height: number,
): Rect | null {
  const corners = [
    camera.unproject(0, 0),
    camera.unproject(w, 0),
    camera.unproject(0, h),
    camera.unproject(w, h),
  ];
  const x0 = Math.max(0, Math.min(...corners.map((c) => c[0])));
  const x1 = Math.min(width, Math.max(...corners.map((c) => c[0])));
  const y0 = Math.max(0, Math.min(...corners.map((c) => c[1])));
  const y1 = Math.min(height, Math.max(...corners.map((c) => c[1])));
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
}

function drawPart(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  rect: Rect | null,
  width: number,
  height: number,
  alpha: number,
): void {
  if (!rect || alpha <= 0) return;
  const [x0, y0, x1, y1] = rect;
  const iw = img.width;
  const ih = img.height;
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    img,
    (x0 / width) * iw,
    ((height - y1) / height) * ih,
    ((x1 - x0) / width) * iw,
    ((y1 - y0) / height) * ih,
    x0,
    -y1,
    x1 - x0,
    y1 - y0,
  );
  ctx.globalAlpha = 1;
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  cam: Camera,
  scene: MapScene,
): void {
  const { pkg, route } = scene;
  const { width, height } = pkg.extent;
  const rect = visibleRect(cam, w, h, width, height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#e1e7d6";
  ctx.fillRect(0, 0, w, h);

  // World layers: canvas transform matching Camera.project (world y is flipped).
  ctx.save();
  ctx.translate(cam.anchorX + cam.panX, cam.anchorY + cam.panY);
  ctx.rotate(-cam.bearing);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.cx, cam.cy);
  ctx.imageSmoothingQuality = "high";
  drawPart(ctx, scene.terrain, rect, width, height, 1);
  if (scene.showLift && scene.lift.length) {
    const hours = pkg.lift.hours;
    const hour = clamp(scene.hour, hours[0], hours[hours.length - 1]);
    let k = 0;
    while (k < hours.length - 2 && hour > hours[k + 1]) k++;
    const f = clamp((hour - hours[k]) / (hours[k + 1] - hours[k] || 1), 0, 1);
    drawPart(ctx, scene.lift[k], rect, width, height, 0.55 * (1 - f));
    if (scene.lift[k + 1]) drawPart(ctx, scene.lift[k + 1], rect, width, height, 0.55 * f);
  }
  const line = (pts: [number, number][], px: number, color: string, dash: number[] = []) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i) ctx.lineTo(x, -y);
      else ctx.moveTo(x, -y);
    });
    ctx.lineWidth = px / cam.zoom;
    ctx.strokeStyle = color;
    ctx.setLineDash(dash.map((v) => v / cam.zoom));
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const alt of scene.alternatives) line(alt.path, 6, "rgba(110,90,170,.45)");
  line(
    route.scoring.map((i) => [pkg.nodes[i].x, pkg.nodes[i].y] as [number, number]),
    2.2,
    "rgba(61,31,153,.55)",
    [8, 7],
  );
  if (scene.progress) {
    const { segment, x, y } = scene.progress;
    let done = 0;
    for (let j = 0; j < segment; j++) if (route.segments[j].type === "glide") done++;
    line([...route.path.slice(0, done + 1), [x, y]], 6, "rgba(120,112,150,.55)");
    const todo: [number, number][] = [[x, y], ...route.path.slice(done + 1)];
    line(todo, 12, "#3d1f99");
    line(todo, 8, "#8c5cff");
  } else {
    line(route.path, 12, "#3d1f99");
    line(route.path, 8, "#8c5cff");
  }
  ctx.restore();

  // Thermals, upright, in screen space.
  ctx.font = "600 12px Rubik, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  pkg.nodes.forEach((n, i) => {
    if (i === pkg.takeoff) return;
    const [x, y] = cam.project(n.x, n.y);
    if (x < -40 || y < -40 || x > w + 40 || y > h + 40) return;
    const climb = climbAt(pkg, i, scene.hour);
    if (!scene.featured.has(i)) {
      const onRoute = scene.onRoute.has(i);
      if (climb < 0.5 && !onRoute) return;
      ctx.beginPath();
      ctx.arc(x, y, onRoute ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = onRoute ? "#ff9f1c" : "rgba(255,159,28,.8)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      return;
    }
    drawSun(ctx, x, y, fmtRate(climb));
  });
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, label: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#ff9f1c";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 11, Math.sin(angle) * 11);
    ctx.lineTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 8.5, 0, 2 * Math.PI);
  ctx.fillStyle = "#ff9f1c";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(17, -10, tw + 12, 20, 8);
  else ctx.rect(17, -10, tw + 12, 20);
  ctx.fill();
  ctx.fillStyle = "#7a4300";
  ctx.fillText(label, 23, 0.5);
  ctx.restore();
}
