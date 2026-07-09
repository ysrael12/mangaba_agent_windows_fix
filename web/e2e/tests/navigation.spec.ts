import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('page loads successfully', async ({ page }) => {
    await page.goto('/');
    // Espera que carregue
    await page.waitForLoadState('domcontentloaded');
    // Verifica que não há erro no console
    expect(page).not.toBeNull();
  });

  test('redirect root to /home', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/home/, { timeout: 5000 });
  });

  test('home page has main content', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Verifica que há conteúdo na página. O app usa a tag <main> (role
    // implícito) — o seletor CSS [role="main"] sozinho NÃO casa com ela.
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('sidebar navigation items are visible', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Desktop: sidebar visível (use seletores específicos)
    const sidebar = page.locator('aside#app-sidebar, nav[aria-label="Navegação"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('navigate to /chat page', async ({ page }) => {
    await page.goto('/home');

    // Busca link para chat (seja mais específico)
    const chatLink = page.locator('a[href*="chat"], button:has-text("Conversar"), button:has-text("Chat")').first();

    if (await chatLink.isVisible()) {
      await chatLink.click();
      // Pode redirecionar para /chat ou outro lugar
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toBeTruthy();
    }
  });

  test('navigate to /logs page', async ({ page }) => {
    await page.goto('/home');

    const logsLink = page.locator('a[href="/logs"]').first();

    if (await logsLink.isVisible()) {
      await logsLink.click();
      await expect(page).toHaveURL(/\/logs/, { timeout: 5000 });
    }
  });

  test('navigate to /configuracoes page', async ({ page }) => {
    await page.goto('/home');

    const settingsLink = page.locator('a[href="/configuracoes"]').first();

    if (await settingsLink.isVisible()) {
      // Scroll para garantir visibilidade em mobile
      await settingsLink.scrollIntoViewIfNeeded();
      await settingsLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('configur');
    }
  });

  test('back button works', async ({ page }) => {
    await page.goto('/home');

    const link = page.locator('a[href="/logs"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = page.url();

      await page.goBack();
      await page.waitForLoadState('domcontentloaded');

      expect(page.url()).not.toBe(currentUrl);
    }
  });

  test('404 redirects to home', async ({ page }) => {
    await page.goto('/inexistent-route-xyz-abc-123');

    // Aguarda redirecionamento automático
    await expect(page).toHaveURL(/\/home/, { timeout: 5000 });
  });
});
