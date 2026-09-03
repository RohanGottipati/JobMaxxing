import { expect, test } from "@playwright/test";

test("LaTeX Studio home is reachable and isolated", async ({ page }) => {
  const response = await page.goto("/latex");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "LaTeX Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open in Studio" }).first()).toBeVisible();

  const headers = response?.headers() ?? {};
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-embedder-policy"]).toBe("require-corp");
});
