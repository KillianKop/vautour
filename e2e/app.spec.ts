import { expect, type Page, test } from "@playwright/test";

/** Fail the test on any uncaught error or console error of the page. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    const fromFont = /fonts\.(googleapis|gstatic)\.com/.test(msg.location().url);
    if (msg.type() === "error" && !fromFont) errors.push(`${msg.text()} (${msg.location().url})`);
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  // The Google font is optional: do not depend on the network in tests.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
});

test("start screen offers the routes and takes off", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Où on vole aujourd'hui ?" })).toBeVisible();
  await expect(page.locator(".rc")).toHaveCount(4);
  await expect(page.locator(".credits")).toContainText("Copernicus");
  await page.getByRole("button", { name: "Décoller" }).tap();
  await expect(page.locator("#banner")).not.toHaveClass(/hide/);
  await expect(page.locator("#bsub")).toHaveText("Thermique du déco");
  await expect(page.locator("#bmain")).toContainText("Enroule jusqu'à");
  await expect(page.locator("#vval")).toHaveText(/^[+−]\d+,\d$/);
  expect(errors).toEqual([]);
});

test("a glide shows distance, speed to fly and arrival margin", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./?autostart=1&dt=0.8&paused=1");
  await expect(page.locator("#bmain")).toHaveText(/^\d+(,\d)? (km|m)$/);
  await expect(page.locator("#bmeta .chip")).toHaveCount(2);
  await expect(page.locator("#bmeta")).toContainText("Arrivée +");
  await expect(page.locator("#next")).toBeVisible();
  expect(errors).toEqual([]);
});

test("reporting a crash: categories, safety line, send", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./?autostart=1&dt=1.4&paused=1");
  await page.locator("#report").tap();
  await expect(page.locator(".tile")).toHaveCount(9);
  await page.getByRole("button", { name: "Crash" }).tap();
  await expect(page.locator(".sos")).toContainText("112");
  await page.getByRole("button", { name: "Dans les sapins" }).tap();
  await expect(page.locator(".opt.sel")).toHaveText("Dans les sapins");
  await page.getByRole("button", { name: "Envoyer" }).tap();
  await expect(page.locator("#toast")).toContainText("Crash signalé");
  await expect(page.locator(".pin.drop")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("flight menu switches the language to English", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./?autostart=1&dt=0.3");
  await page.locator("#eta").tap();
  await expect(page.getByText("Changer de parcours")).toBeVisible();
  await page.getByRole("button", { name: "English" }).tap();
  await expect(page.getByText("Change route")).toBeVisible();
  await page.locator("#scrim").tap({ position: { x: 20, y: 20 } });
  await expect(page.locator("#sheet")).not.toHaveClass(/\bon\b/);
  // the choice is remembered on the next visit
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Where are we flying today?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Take off" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("end of flight summary", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./?autostart=1&sheet=end");
  await expect(page.getByRole("heading", { name: "Triangle bouclé !" })).toBeVisible();
  await expect(page.locator(".stats > div")).toHaveCount(6);
  expect(errors).toEqual([]);
});

test("layout fits the phone screen without horizontal scroll", async ({ page }) => {
  await page.goto("./?autostart=1&dt=0.8&paused=1");
  const size = page.viewportSize()!;
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const id of ["#bar", "#report", "#vario", "#banner"]) {
    const box = (await page.locator(id).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
  }
});
