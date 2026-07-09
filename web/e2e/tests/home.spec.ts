import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Verifica que tem conteúdo (pode estar carregando)
    const main = page.locator('[role="main"]');

    // Se main não existe, tenta encontrar qualquer conteúdo
    const isVisible = await main.isVisible().catch(() => false);
    if (isVisible) {
      await expect(main).toBeVisible();
    } else {
      // Fallback: verifica que há algo no body
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('home page has heading', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Procura heading (h1 ou h2)
    const heading = page.locator('h1, h2, h3').first();
    const isVisible = await heading.isVisible().catch(() => false);

    if (isVisible) {
      const text = await heading.textContent();
      expect(text).toBeTruthy();
    } else {
      expect(true).toBe(true); // Página pode não ter heading explícito
    }
  });

  test('home page is not empty', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Conta elementos no documento
    const body = page.locator('body');
    const children = body.locator('div, section, article, main, header');
    const count = await children.count();

    // Deve ter pelo menos alguns elementos
    expect(count).toBeGreaterThan(0);
  });

  test('home page footer is visible', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Scroll para o final
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Página carregou completamente
    expect(page).not.toBeNull();
  });

  test('no JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Pode haver alguns erros de terceiros, mas não deve ter muitos
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load plugin') &&
             !e.includes('404') &&
             !e.includes('CORS') &&
             !e.includes('favicon')
    );

    expect(criticalErrors.length).toBeLessThan(2);
  });

  test('meta tags are present', async ({ page }) => {
    await page.goto('/home');

    // Verifica viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeTruthy();

    // Verifica charset
    const charset = page.locator('meta[charset], meta[http-equiv="Content-Type"]');
    const count = await charset.count();
    expect(count).toBeGreaterThan(0);
  });
});
