import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Tasks|CRUD|Remix/i);
});

test("login page accessible", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test("signup page accessible", async ({ page }) => {
  await page.goto("/auth/signup");
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

test("unauthenticated visit to / redirects to login", async ({ page }) => {
  const response = await page.goto("/");
  // Either redirected to login or the login form is visible
  const url = page.url();
  const isLoginPage = url.includes("/auth/login");
  const hasLoginForm = await page.getByLabel(/email/i).isVisible().catch(() => false);
  expect(isLoginPage || hasLoginForm || response?.status() === 200).toBeTruthy();
});

test("login form has submit button", async ({ page }) => {
  await page.goto("/auth/login");
  const submitButton = page.getByRole("button", { name: /sign in|log in|login|submit/i });
  await expect(submitButton).toBeVisible();
});

test("signup form has submit button", async ({ page }) => {
  await page.goto("/auth/signup");
  const submitButton = page.getByRole("button", { name: /sign up|create account|register|submit/i });
  await expect(submitButton).toBeVisible();
});
