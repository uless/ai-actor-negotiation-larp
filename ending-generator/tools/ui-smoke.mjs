import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.APP_URL || "http://127.0.0.1:4174";
const teacherCode = process.env.TEACHER_CODE;
if (!teacherCode) throw new Error("Set TEACHER_CODE before running the browser smoke test.");
const expectedTitles = [
  "Humans Only",
  "Lights, Camera, Strike",
  "Tilly, With Conditions",
  "Open Book",
  "Back to the Table"
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#teacherCode").fill(teacherCode);
  await page.locator("#loginForm button").click();
  await page.locator("#entryScreen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#demoLabel").isVisible(), true);
  assert.match(await page.locator("#modelName").textContent(), /claude-opus-5-5/);
  await page.screenshot({ path: path.join(process.env.TEMP || process.cwd(), "mcom2010-week7-entry.png") });

  for (let index = 0; index < expectedTitles.length; index += 1) {
    await page.locator("#sampleButtons button").nth(index).click();
    await page.locator("#showEndingButton").click();
    await page.locator("#endingScreen").waitFor({ state: "visible" });
    assert.equal(await page.locator("#endingTitle").textContent(), expectedTitles[index]);
    if (index === 0) {
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(process.env.TEMP || process.cwd(), "mcom2010-week7-ending.png") });
    }

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    if (index === 0) {
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(process.env.TEMP || process.cwd(), "mcom2010-week7-real-world.png") });
    }
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.locator("#collectionScreen").waitFor({ state: "visible" });
    assert.equal(await page.locator("#collectionHeading").textContent(), "Endings found: 1 of 5");

    if (index < expectedTitles.length - 1) {
      await page.locator("#startAgainButton").click();
      await page.locator("#entryScreen").waitFor({ state: "visible" });
    }
  }

  await page.locator("#showAllButton").click();
  for (const title of expectedTitles) {
    assert.equal(await page.getByRole("heading", { name: title }).isVisible(), true);
  }

  const screenshot = path.join(process.env.TEMP || process.cwd(), "mcom2010-week7-ending-app.png");
  await page.screenshot({ path: screenshot, fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.locator("#teacherCode").fill(teacherCode);
  await mobile.locator("#loginForm button").click();
  await mobile.locator("#entryScreen").waitFor({ state: "visible" });
  const metrics = await mobile.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.equal(metrics.scroll, metrics.width, "The mobile entry screen should not scroll sideways.");
  console.log(`UI smoke passed. Screenshot: ${screenshot}`);
} finally {
  await browser.close();
}
