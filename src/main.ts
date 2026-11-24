/** Entry point: load the flight package and the images, then start the app. */
import "./styles.css";
import { App } from "./app";
import { applyDevParams } from "./dev";
import { t } from "./i18n";
import { colorizeLift } from "./map/lift";
import { loadPackage } from "./package/load";
import { byId } from "./ui/dom";

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be decoded"));
    img.src = src;
  });

async function main(): Promise<void> {
  const loading = byId("loading");
  loading.textContent = t().loading;
  try {
    const pkg = await loadPackage(new URLSearchParams(location.search).get("package") ?? "flight.json");
    const terrain = await loadImage(pkg.terrain.image);
    const lift = (await Promise.all(pkg.lift.frames.map(loadImage))).map(colorizeLift);
    const app = new App(pkg, terrain, lift);
    loading.remove();
    if (!applyDevParams(app, location.search)) app.showStart();
    app.start();
  } catch (err) {
    console.error(err);
    loading.textContent = `${t().loadError} ${err instanceof Error ? err.message : ""}`;
  }
}

void main();
