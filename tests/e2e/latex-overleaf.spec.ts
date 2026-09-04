import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function fixture() {
  return JSON.parse(await readFile(".playwright/fixture.json", "utf8")) as {
    fixtureCompany: string;
  };
}

test("Overleaf workspace explains the cloud handoff", async ({ page }) => {
  const response = await page.goto("/latex");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "LaTeX with Overleaf" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Overleaf" }).first()).toBeVisible();
  await expect(page.getByLabel("Overleaf capabilities")).toContainText("Project import");
  await expect(page.getByLabel("Overleaf capabilities")).toContainText("Cloud compile");
  await expect(page.getByLabel("Overleaf capabilities")).toContainText("Final PDF handoff");

  const headers = response?.headers() ?? {};
  expect(headers["cross-origin-opener-policy"]).toBeUndefined();
  expect(headers["cross-origin-embedder-policy"]).toBeUndefined();
});

test("LaTeX documents are packaged for Overleaf", async ({ page }) => {
  const { fixtureCompany } = await fixture();

  await page.goto("/latex");
  await page.getByRole("tab", { name: "Cover letter" }).click();
  await page.getByLabel("Application").click();
  await page.getByRole("option", { name: new RegExp(fixtureCompany) }).click();
  await page.getByLabel("Title").fill(`Overleaf handoff ${Date.now()}`);
  await page.getByRole("button", { name: "Continue to Overleaf" }).click();

  await expect(page).toHaveURL(/\/latex\/cover_letter\/[0-9a-f-]{36}$/i);
  await expect(page.getByRole("heading", { name: "Open in Overleaf" })).toBeVisible();

  const form = page.locator('form[action="https://www.overleaf.com/docs"]');
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("target", "_blank");
  await expect(form.locator('input[name="snip_uri"]')).toHaveValue(
    /^data:application\/zip;base64,UEs/,
  );
  await expect(form.locator('input[name="main_document"]')).toHaveValue("main.tex");
  await expect(form.locator('input[name="engine"]')).toHaveValue("pdflatex");
  await expect(page.getByText("Attach a PDF or DOCX")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as submitted" })).toBeDisabled();
});
