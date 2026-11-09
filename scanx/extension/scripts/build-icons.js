// Renders icons/icon.svg to PNGs required by the manifest.
// Usage: node scripts/build-icons.js   (needs Playwright + Chromium installed)
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const dir = path.join(__dirname, "..", "icons");
  const svg = fs.readFileSync(path.join(dir, "icon.svg"), "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace("<svg", `<svg width="${size}" height="${size}"`)}</body></html>`,
    );
    await page.screenshot({ path: path.join(dir, `icon-${size}.png`), omitBackground: true });
    console.log(`icon-${size}.png`);
  }
  await browser.close();
})();
