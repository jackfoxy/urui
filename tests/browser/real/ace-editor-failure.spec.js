const {test, expect} = require('@playwright/test');

test('Ace initialization failure shows actionable UI', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ace', {
      configurable: false,
      get: () => undefined,
      set: () => undefined
    });
  });
  await page.goto('/apps/urui-fixture/');

  //  each host shows urui's own notice, and the tabs keep working
  const problem = page.locator('#editor-load-error');
  await expect(problem).toBeVisible();
  await expect(problem).toContainText('Editor unavailable');
  await expect(problem).toContainText('verify the Ace assets are installed');
  await expect(page.locator('#result-editor-load-error')).toBeVisible();
  await expect(page.locator('#editor')).toBeHidden();
  await expect(page.locator('#result-editor')).toBeHidden();
});
