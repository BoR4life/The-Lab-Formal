import { chromium } from "playwright";

const exe =
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const shots = [
  { url: "http://127.0.0.1:8765/brand/og.html", w: 1200, h: 630, out: "/workspace/.grok/brand/og-raw.png" },
  { url: "http://127.0.0.1:8765/brand/banner.html", w: 1200, h: 264, out: "/workspace/.grok/brand/banner-raw.png" },
];

const browser = await chromium.launch({
  executablePath: exe,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
});

for (const shot of shots) {
  const page = await browser.newPage({
    viewport: { width: shot.w, height: shot.h },
    deviceScaleFactor: 2,
  });
  await page.goto(shot.url, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const boxes = await page.evaluate(() => {
    const ids = ["name", "track", "tag", "lockup"];
    const out = {};
    for (const id of ids) {
      const r = document.getElementById(id).getBoundingClientRect();
      out[id] = { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    }
    out.fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`);
    return out;
  });
  console.log(shot.out, JSON.stringify(boxes, null, 2));
  await page.screenshot({ path: shot.out, type: "png" });
  await page.close();
}

await browser.close();
