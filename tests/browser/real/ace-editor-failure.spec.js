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

  const problem = page.locator('#editor-load-error');
  await expect(problem).toBeVisible();
  await expect(problem).toContainText('Source editors unavailable');
  await expect(problem).toContainText('Reload after checking the Ace assets');
  await expect(page.locator('#editor')).toBeHidden();
  await expect(page.locator('#result-editor')).toBeHidden();
});
