import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const resumeText = `Playwright Candidate
playwright@example.test

PROFESSIONAL SUMMARY
Platform engineer focused on reliable systems.

EXPERIENCE
Platform Engineer
Example Systems
2022 - Present
- Reduced API latency by 30%.

EDUCATION
University of Toronto
BASc, Computer Engineering

SKILLS
PostgreSQL, TypeScript`;

test("imports, reviews, persists, edits, checkpoints, and exports a structured resume", async ({ page }) => {
  let importId: string | null = null;
  let resumeId: string | null = null;
  try {
    await page.goto("/resumes/import");
    await page.getByRole("tab", { name: /Paste/ }).click();
    await page.getByLabel("Resume text").fill(resumeText);
    await page.getByRole("button", { name: "Create review draft" }).click();
    await expect(page).toHaveURL(/\/resumes\/import\/[0-9a-f-]{36}\/review/);
    importId = page.url().match(/\/resumes\/import\/([0-9a-f-]{36})\/review/)?.[1] ?? null;
    expect(importId).not.toBeNull();
    await expect(page.getByRole("heading", { name: "Compare before saving" })).toBeVisible();

    await page.getByLabel("Resume name").fill("Phase One E2E Resume");
    await page.getByRole("button", { name: "Save review draft" }).click();
    await page.reload();
    await expect(page.getByLabel("Resume name")).toHaveValue("Phase One E2E Resume");

    await page.getByRole("button", { name: /Approve and create resume/ }).click();
    await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
    resumeId = page.url().match(/\/resumes\/([0-9a-f-]{36})$/)?.[1] ?? null;
    expect(resumeId).not.toBeNull();
    await expect(page.getByLabel("Resume name")).toHaveValue("Phase One E2E Resume");

    await page.getByLabel("Resume name").fill("Phase One E2E Resume Updated");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Save version" }).click();
    await expect(page.getByText("Version checkpoint saved")).toBeVisible();

    await page.getByRole("button", { name: "Export" }).click();
    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDF" }).click();
    expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);
  } finally {
    if (resumeId) {
      await page.goto(`/resumes/${resumeId}`);
      await page.getByRole("button", { name: "Delete resume" }).click();
      await page.getByRole("button", { name: "Delete permanently" }).click();
      await page.waitForURL(/\/resumes(?:\?|$)/);
    }
    if (importId) {
      const response = await page.request.delete(`/api/resume-imports/${importId}`);
      if (!response.ok() && response.status() !== 404) {
        throw new Error(`Could not remove E2E resume import (${response.status()}).`);
      }
    }
  }
});

test("Phase 1 data routes have no serious accessibility violations or root overflow", async ({ page }) => {
  for (const route of ["/profile", "/resumes", "/resumes/new", "/resumes/import"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} has root overflow`).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), `${route} has serious accessibility violations`).toEqual([]);
  }
});
