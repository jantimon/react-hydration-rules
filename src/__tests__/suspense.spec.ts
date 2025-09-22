import { test, expect } from "@playwright/test";
import * as glob from "fast-glob";

// Auto-discover components using fast-glob
const allComponents = glob
  .sync("src/*.tsx", { ignore: ["src/fixtures/**"] })
  .map((path) => path.replace("src/", "").replace(".tsx", ""));

const noSuspenseComponents = allComponents.filter((name) =>
  name.startsWith("NoSuspenseFallback"),
);
const suspenseComponents = allComponents.filter((name) =>
  name.startsWith("SuspenseFallback"),
);

// Generate React Compiler component names based on SuspenseFallback components
const reactCompilerComponents = suspenseComponents.map(
  (name) => `ReactCompiler${name.replace("SuspenseFallbackOn", "")}`,
);

// Test components that maintain Suspense content during transitions
test.describe("Components that DON'T trigger suspense fallback", () => {
  for (const componentName of noSuspenseComponents) {
    test(`${componentName} maintains suspense content`, async ({ page }) => {
      await page.goto(
        `file://${process.cwd()}/dist/${componentName}/index.html`,
      );
      await page.waitForLoadState("networkidle");

      // Click button to trigger state change
      await page.locator("button").first().click();

      // Wait 100ms and verify content is still maintained
      await page.waitForTimeout(100);

      const hasNoFallback = await page
        .locator("text=Suspense Boundary Content")
        .isVisible();
      expect(
        hasNoFallback,
        `${componentName} should maintain suspense content and not trigger fallback`,
      ).toBe(true);
    });
  }
});

// Test components that trigger Suspense fallback during transitions
test.describe("Components that DO trigger suspense fallback", () => {
  for (const componentName of suspenseComponents) {
    test(`${componentName} triggers suspense fallback`, async ({ page }) => {
      await page.goto(
        `file://${process.cwd()}/dist/${componentName}/index.html`,
      );
      await page.waitForLoadState("networkidle");

      // Click button to trigger state change
      await page.locator("button").first().click();

      // Wait 100ms and verify fallback appears
      await page.waitForTimeout(100);

      const hasFallback = await page
        .locator("text=Suspense Boundary Fallback")
        .isVisible();
      expect(
        hasFallback,
        `${componentName} should replace the content and show instead the triggered suspense fallback`,
      ).toBe(true);
    });
  }
});

// Test React Compiler components - automatic memoization should prevent all fallbacks
test.describe("React Compiler - Components that prevent suspense fallback", () => {
  for (const componentName of reactCompilerComponents) {
    test(`${componentName} prevents suspense fallback with React Compiler`, async ({
      page,
    }) => {
      await page.goto(
        `file://${process.cwd()}/dist/${componentName}/index.html`,
      );
      await page.waitForLoadState("networkidle");

      // Click button to trigger state change
      await page.locator("button").first().click();

      // Wait 100ms and verify content is maintained (no fallback)
      await page.waitForTimeout(100);

      const hasContent = await page
        .locator("text=Suspense Boundary Content")
        .isVisible();
      expect(
        hasContent,
        `${componentName} with React Compiler should maintain suspense content and not trigger fallback`,
      ).toBe(true);
    });
  }
});
