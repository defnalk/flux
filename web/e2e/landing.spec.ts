import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("hero, chat input, and example prompts render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Talk to the grid." })).toBeVisible();
    await expect(page.getByRole("link", { name: "About" })).toBeVisible();
    await expect(
      page.getByPlaceholder(/Ask about Europe's electricity mix/i),
    ).toBeVisible();
    const examples = page.getByRole("button", { name: /Germany|wind|EU ETS/i });
    await expect(examples.first()).toBeVisible();
  });

  test("submitting a question routes to /chat with the query", async ({ page }) => {
    await page.goto("/");
    await page
      .getByPlaceholder(/Ask about Europe's electricity mix/i)
      .fill("test question");
    await page.getByRole("button", { name: "Ask Flux" }).click();
    await page.waitForURL(/\/chat\?q=test%20question/);
    await expect(page.getByRole("heading", { name: "test question" })).toBeVisible();
  });
});

test.describe("chat page (demo mode)", () => {
  test("streams an answer for the canned German coal example", async ({ page }) => {
    await page.goto(
      "/chat?q=" +
        encodeURIComponent("How did Germany's coal share change between 2015 and 2024?"),
    );
    await expect(page.getByRole("heading", { name: /coal share/i })).toBeVisible();
    // Streaming text should arrive within a few seconds.
    await expect(page.getByText(/coal-fired generation/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/EMBER/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
