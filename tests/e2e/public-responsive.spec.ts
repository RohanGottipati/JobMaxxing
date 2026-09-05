import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

const routes = ["/", "/extension", "/privacy", "/login", "/signup", "/forgot-password"];

test("public and auth surfaces do not clip at supported widths", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} overflowed at ${viewport.width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("marketing sections and mobile navigation remain reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByLabel("Open navigation").click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("link", { name: "FAQ" }).last().click();
  await expect(page.locator("#faq")).toBeInViewport();
});

test("public metadata and crawler routes describe only public pages", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Private Job Application Tracker/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https?:\/\/[^/]+\/?$/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /JobMaxxing/);
  expect(
    await page.locator('script[type="application\/ld\+json"]').textContent(),
  ).toContain("WebApplication");

  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  const xml = await sitemap.text();
  expect(sitemap.ok()).toBe(true);
  expect(xml).toContain("/extension");
  expect(xml).toContain("/privacy");
  expect(xml).not.toContain("/applications");
  expect(xml).not.toContain("/login");
});
