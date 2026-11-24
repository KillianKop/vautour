/** Colouring of the grayscale lift frames of the package into a translucent overlay. */
import { clamp, lerp } from "../util/math";

/** RGBA colour (0-255) of a lift index in [0, 1]: transparent when weak, yellow to red when strong. */
export function liftColor(v: number): [number, number, number, number] {
  const k = clamp((v - 0.22) / 0.45, 0, 1);
  const alpha = v < 0.2 ? 0 : Math.round(255 * (0.15 + 0.55 * k));
  return [255, Math.round(lerp(205, 85, k)), Math.round(lerp(40, 30, k)), alpha];
}

export function colorizeLift(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, canvas.width, canvas.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const [r, gr, b, a] = liftColor(p[i] / 255);
    p[i] = r;
    p[i + 1] = gr;
    p[i + 2] = b;
    p[i + 3] = a;
  }
  g.putImageData(data, 0, 0);
  return canvas;
}
