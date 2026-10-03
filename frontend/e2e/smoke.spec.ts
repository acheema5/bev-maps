import { expect, test } from "@playwright/test";

// The whole v1 loop, at a desk: tap Find Bev, enable the (fake) camera,
// follow the simulated walk to the store, and come home (VISION → Done means).
test("Find Bev → navigate with guide and minimap → You found Bev → home", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/?sim=25");
  await page.getByRole("button", { name: "Find Bev", exact: true }).click();

  await expect(page.getByText("7-Eleven · 4 min")).toBeVisible();
  await page.getByRole("button", { name: "Enable camera" }).click();

  // The camera view: live (fake) video, the guide, the minimap, the way out.
  await expect(page.getByRole("button", { name: "End navigation" })).toBeVisible();
  await expect(page.locator("video")).toBeVisible();
  await expect(page.getByTestId("guide")).toBeAttached();
  await expect(page.locator("polyline")).toHaveAttribute("points", /\d/);

  await expect(page.getByText("You found Bev")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Find Bev", exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

// Real geolocation path (no sim), with a canned "nothing open" answer.
test("no bev open nearby shows one calm line and Try again", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.7553, longitude: -73.9563, accuracy: 12 });

  await page.goto("/?fixture=none");
  await page.getByRole("button", { name: "Find Bev", exact: true }).click();

  await expect(page.getByText("No bev open nearby.")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Finding Bev" })).toBeVisible();
});

test.describe("on a computer", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  });

  test("gets the phone-only line", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Bev Maps lives on your phone.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Find Bev", exact: true })).toHaveCount(0);
  });
});
