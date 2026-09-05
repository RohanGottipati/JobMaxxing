import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function fixtureId() {
  const fixture = JSON.parse(await readFile(".playwright/fixture.json", "utf8")) as { applicationId: string };
  return fixture.applicationId;
}

async function expectNoRootOverflow(page: import("@playwright/test").Page, route: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${route} has unintended root overflow`).toBeLessThanOrEqual(1);
}

test("authenticated routes remain visible and vertically reachable", async ({ page }) => {
  const applicationId = await fixtureId();
  const routes = [
    "/dashboard",
    "/applications",
    "/applications/new",
    `/applications/${applicationId}`,
    `/applications/${applicationId}/edit`,
    `/applications/${applicationId}/package`,
    `/applications/${applicationId}/match`,
    "/resumes",
    "/resumes/new",
    "/resumes/versions/new",
    "/cover-letters",
    "/cover-letters/new",
    "/profile",
    "/documentation",
    "/documentation/getting-started",
    "/maxwell",
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("#app-scroll-container")).toBeVisible();
    await expectNoRootOverflow(page, route);
    await page.locator("#app-scroll-container").evaluate((node) => { node.scrollTop = node.scrollHeight; });
    const reachedBottom = await page.locator("#app-scroll-container").evaluate((node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2);
    expect(reachedBottom, `${route} could not reach its bottom`).toBe(true);
  }
});

test("application list, filters, and local detail tabs remain reachable", async ({ page }) => {
  const applicationId = await fixtureId();
  await page.goto(`/applications?id=${applicationId}`);

  await expect(page.getByRole("group", { name: "Application scope" })).toBeVisible();
  await expect(page.getByLabel("Search applications")).toBeVisible();
  await expect(page.getByLabel("Application status")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Application details" })).toBeVisible();
  await page.getByRole("button", { name: "Job post" }).click();
  await expect(page).toHaveURL(/view=job-description/);
  await page.getByRole("button", { name: "Overview" }).click();
  await expect(page.getByText("Submitted files")).toBeVisible();
  await page.getByRole("link", { name: "Manage application package" }).click();
  await expect(page).toHaveURL(new RegExp(`/applications/${applicationId}/package$`));
  await expect(page.getByRole("heading", { name: "Application package" })).toBeVisible();
});

test("Maxwell is a full route with history, context, and streaming chat", async ({ page }) => {
  const thread = { id: "11111111-1111-4111-8111-111111111111", title: "UI test", summary: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const message = { id: "22222222-2222-4222-8222-222222222222", threadId: thread.id, role: "assistant", content: "Everything is reachable.", metadata: {}, clientMessageId: null, createdAt: new Date().toISOString(), attachments: [], actions: [] };
  await page.route("**/api/maxwell/threads", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { threads: [] } });
      return;
    }
    await route.fulfill({ status: 201, json: { thread: { id: "11111111-1111-4111-8111-111111111111", title: "New conversation", summary: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } });
  });
  await page.route("**/api/maxwell/threads/**", async (route) => {
    await route.fulfill({ json: { thread, messages: [message] } });
  });
  await page.route("**/api/maxwell/chat", async (route) => {
    const body = `data: ${JSON.stringify({ type: "thread", thread })}\n\ndata: ${JSON.stringify({ type: "message_delta", delta: message.content })}\n\ndata: ${JSON.stringify({ type: "message_done", message })}\n\n`;
    await route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });

  await page.goto("/dashboard");
  if (await page.getByRole("button", { name: "Toggle sidebar" }).isVisible()) {
    await page.getByRole("button", { name: "Toggle sidebar" }).click();
  }
  await page.getByRole("link", { name: "Maxwell" }).click();
  await expect(page).toHaveURL(/\/maxwell\?from=%2Fdashboard/);
  await expect(page.getByRole("region", { name: "Maxwell assistant" })).toBeVisible();
  await expect(page.getByText("Workspace context")).toBeVisible();
  await page.getByPlaceholder(/Ask Maxwell/).fill("Can I reach everything?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Everything is reachable.")).toBeVisible();
});
