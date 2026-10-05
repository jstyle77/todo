import { expect, test } from "@playwright/test";

test("로그인하지 않으면 로그인 페이지로 이동한다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Google로 로그인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "GitHub로 로그인" })).toBeVisible();
});

test("로그인하지 않으면 API가 401을 반환한다", async ({ request }) => {
  const res = await request.post("/api/chat", { data: { message: "hi" } });
  expect(res.status()).toBe(401);
});
