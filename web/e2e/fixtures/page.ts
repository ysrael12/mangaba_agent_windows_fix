import { test as base, Page } from '@playwright/test';
import { navigateTo } from '../utils/helpers';

/**
 * Fixture customizada que estende a página padrão com métodos helpers
 */
interface TestFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: navega para a página inicial
    await navigateTo(page, '/home');

    // Use a página
    await use(page);

    // Cleanup: fecha página (opcional)
    // await page.close();
  },
});

export { expect } from '@playwright/test';
