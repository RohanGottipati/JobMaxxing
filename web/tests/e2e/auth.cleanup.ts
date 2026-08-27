import { readFile, rm } from "node:fs/promises";
import { test as cleanup } from "@playwright/test";

cleanup("remove the representative application", async ({ page }) => {
  try {
    const fixture = JSON.parse(await readFile(".playwright/fixture.json", "utf8")) as { applicationId: string };
    await page.goto(`/applications/${fixture.applicationId}`);
    const deleteButton = page.getByRole("button", { name: "Delete application" });
    if (await deleteButton.count()) {
      await deleteButton.click();
      await page.getByRole("button", { name: "Delete permanently" }).click();
      await page.waitForURL(/\/applications$/);
    }
  } finally {
    await rm(".playwright", { recursive: true, force: true });
  }
});
