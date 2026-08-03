import { mkdir, writeFile } from "node:fs/promises";
import { test as setup, expect } from "@playwright/test";

const authFile = ".playwright/auth/user.json";
const fixtureFile = ".playwright/fixture.json";
const fixtureCompany = "JobMaxxing E2E Fixture";

setup("authenticate and prepare a representative application", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD must identify a dedicated Playwright test account.");
  }

  await mkdir(".playwright/auth", { recursive: true });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: authFile });

  await page.goto(`/applications?q=${encodeURIComponent(fixtureCompany)}`);
  await page.getByLabel("Table view").click();
  const existing = page.getByRole("link", { name: /Responsive UI audit/i }).first();
  let applicationId: string | null = null;
  if (await existing.count()) {
    applicationId = (await existing.getAttribute("href"))?.split("/").at(-1) ?? null;
  } else {
    await page.goto("/applications/new");
    await page.getByLabel(/Company name/).fill(fixtureCompany);
    await page.getByLabel(/Job title/).fill("Responsive UI audit");
    await page.getByLabel("Location").fill("Remote");
    await page.getByLabel("Next action").fill("Verify the final table column is reachable");
    await page.getByRole("button", { name: "Add application" }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/i);
    applicationId = page.url().split("/").at(-1) ?? null;
  }

  if (!applicationId) throw new Error("Could not determine the E2E fixture application id.");
  await writeFile(fixtureFile, JSON.stringify({ applicationId, fixtureCompany }), "utf8");
});
