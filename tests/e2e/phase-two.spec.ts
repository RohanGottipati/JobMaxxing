import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function fixtureId() {
  const fixture = JSON.parse(await readFile(".playwright/fixture.json", "utf8")) as {
    applicationId: string;
  };
  return fixture.applicationId;
}

test("application match workspace is reachable, responsive, and accessible before analysis", async ({ page }) => {
  const applicationId = await fixtureId();
  await page.goto(`/applications/${applicationId}/match`);

  await expect(page.getByRole("heading", { name: "Career match" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "1. Job review" })).toBeVisible();
  await expect(page.getByText("No job analysis yet")).toBeVisible();

  const rootOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(rootOverflow).toBeLessThanOrEqual(1);
  const appScroll = page.locator("#app-scroll-container");
  await appScroll.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect.poll(() => appScroll.evaluate(
    (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2,
  )).toBe(true);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")),
  ).toEqual([]);
});
