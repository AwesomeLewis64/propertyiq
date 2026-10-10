import { test, expect } from "@playwright/test";

test("criteria, maximum offer, what breaks first and yearly cash-on-cash", async ({
  page,
}) => {
  await page.goto("/#monthly/maple-grove-shared/decisionlab");
  await page
    .getByRole("tab", { name: "Maximum offer & criteria", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Investment criteria", exact: true }),
  ).toBeVisible();
  // The sample's only set target is its required return, which it meets.
  const targets = page.getByRole("list", { name: "Investment criteria" });
  await expect(targets.getByText("Meets", { exact: true })).toHaveCount(1);
  await expect(
    targets.getByText("Not enough information", { exact: true }),
  ).toHaveCount(3);
  await expect(page.getByText("sets the maximum offer")).toBeVisible();

  // A blank optional target is not an error, and setting one judges it.
  const equity = page.getByLabel("Maximum initial equity (optional)");
  await expect(equity).toHaveAttribute("aria-invalid", "false");
  await equity.fill("1000000");
  await expect(targets.getByText("Misses", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Set by: Maximum initial equity")).toBeVisible();
  await equity.fill("");
  await expect(targets.getByText("Misses", { exact: true })).toHaveCount(0);

  await page
    .getByRole("tab", { name: "Break-even dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What breaks first?", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Not applicable: every loan is fixed-rate"),
  ).toBeVisible();

  await page.goto("/#quick/cash");
  await expect(
    page.getByRole("heading", { name: "Cash-on-cash by year", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
