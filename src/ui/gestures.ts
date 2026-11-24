/** Map gestures: drag to pan, pinch or wheel to zoom. */
import type { Camera } from "../map/camera";

export function attachGestures(
  canvas: HTMLCanvasElement,
  camera: Camera,
  scale: () => number,
  onMove: () => void,
): void {
  const pointers = new Map<number, [number, number]>();
  let pinch = 0;
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
  });
  canvas.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 1) {
      const s = scale();
      camera.panX += (e.clientX - prev[0]) / s;
      camera.panY += (e.clientY - prev[1]) / s;
    } else {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) camera.zoomBy(d / pinch);
      pinch = d;
    }
    onMove();
  });
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinch = 0;
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      camera.zoomBy(Math.exp(-e.deltaY * 0.0015));
      onMove();
    },
    { passive: false },
  );
  // Safari iOS: stop the page itself from zooming on pinch (touch-action is not enough there).
  for (const type of ["gesturestart", "gesturechange"]) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }
}
