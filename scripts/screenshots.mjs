// Regenerates the README screenshots in docs/img/ from a production build.
// Usage: npm run build && npm run screenshots   (needs `npx playwright install chromium`,
// or PW_CHROME_CHANNEL=chrome to use an installed Google Chrome)

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";

const DIST = new URL("../dist/", import.meta.url).pathname;
const OUT = new URL("../docs/img/", import.meta.url).pathname;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

const SHOTS = [
  ["start", ""],
  ["climb", "?autostart=1&dt=0.15&paused=1"],
  ["glide-alert", "?autostart=1&dt=0.8&paused=1&alert=sink"],
  ["report", "?autostart=1&dt=1.4&paused=1&sheet=report"],
  ["crash", "?autostart=1&dt=1.4&paused=1&sheet=crash"],
  ["menu", "?autostart=1&dt=2.1&paused=1&sheet=menu"],
  ["overview", "?autostart=1&dt=2.1&paused=1&overview=1"],
  ["end", "?autostart=1&sheet=end"],
  ["english", "?autostart=1&dt=0.8&paused=1&lang=en"],
];

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const body = await readFile(join(DIST, path.endsWith("/") ? `${path}index.html` : path));
    res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(
  process.env.PW_CHROME_CHANNEL ? { channel: process.env.PW_CHROME_CHANNEL } : {},
);
const errors = [];
async function shoot(name, query, viewport, isMobile) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on(
    "console",
    (m) => m.type() === "error" && !/fonts\./.test(m.location().url) && errors.push(`${name}: ${m.text()}`),
  );
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(base + query);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await page.close();
  console.log(`[screenshots] ${name}.png`);
}
for (const [name, query] of SHOTS) await shoot(name, query, { width: 390, height: 844 }, true);
await shoot("desktop", "?autostart=1&dt=0.8&paused=1", { width: 1100, height: 900 }, false);
await browser.close();
server.close();
if (errors.length) {
  console.error(`[screenshots] page errors:\n${errors.join("\n")}`);
  process.exit(1);
}
