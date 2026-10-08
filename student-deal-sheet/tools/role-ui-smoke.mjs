import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.APP_URL || "http://127.0.0.1:3000";
const temp = process.env.TEMP || process.cwd();
const browser = await chromium.launch({ headless: true });

async function openRole(page, group, expectedTitle, introPattern) {
  await page.goto(`${baseUrl}/?group=${group}`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#groupNames").fill("Ava and Eli");
  assert.equal(await page.locator(`[data-case="${group}"]`).getAttribute("aria-pressed"), "true");
  await page.locator("#setupForm button[type='submit']").click();
  await page.locator("#workspace").waitFor({ state: "visible" });
  assert.equal(await page.locator("#caseTitle").textContent(), expectedTitle);
  assert.match(await page.locator("#caseIntro").textContent(), introPattern);
  assert.equal(await page.locator("#negotiationTitle").count(), 0);
  assert.equal(await page.locator("#studioPlan").isVisible(), group === "A");
  assert.equal(await page.locator(".deal-term").count(), 5);
  assert.equal(await page.locator(".deal-term textarea").count(), 10);
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await openRole(page, "A", "You are the studio", /Choose the genre and the role/);
  await page.screenshot({ path: path.join(temp, "mcom2010-week7-student-role.png") });

  await page.locator("#answerSection").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(temp, "mcom2010-week7-student-deal.png") });

  await page.locator("#filmGenre").fill("Mystery comedy");
  await page.locator("#tillyRole").fill("The detective's rival");
  await page.locator("#submitButton").click();
  assert.match(await page.locator("#submitNotice").textContent(), /Complete both boxes for/);

  await openRole(page, "B", "You are the actors' union (SAG-AFTRA)", /before your union says yes/);
  await openRole(page, "C", "You are the AI company that made Tilly", /screen credit could help/);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openRole(mobile, "B", "You are the actors' union (SAG-AFTRA)", /before your union says yes/);
  const metrics = await mobile.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.equal(metrics.scroll, metrics.client, "The student page should not scroll sideways on mobile.");
  await mobile.locator("#answerSection").scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(temp, "mcom2010-week7-student-mobile.png") });

  const teacher = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await teacher.goto(`${baseUrl}/teach`, { waitUntil: "domcontentloaded" });
  assert.equal(await teacher.locator("#loginPanel").isVisible(), true);
  console.log("Student role UI smoke passed without writing a submission.");
} finally {
  await browser.close();
}
