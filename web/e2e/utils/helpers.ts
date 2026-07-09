import { Page, expect } from '@playwright/test';

/**
 * Helpers para testes E2E do Mangaba Agent
 */

/**
 * Navega para um caminho e aguarda o app React montar.
 *
 * NÃO usamos `networkidle`: o Vite dev server mantém um websocket de HMR
 * sempre aberto (e o app faz polling em `/api`), então a rede nunca fica
 * ociosa e o wait estoura o timeout. Em vez disso esperamos o DOM e o
 * shell do app (sidebar de navegação) — que é o sinal real de "carregou".
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Shell do app montado: sidebar de navegação ou o <main> da rota.
  await page
    .locator('aside#app-sidebar, nav[aria-label="Navegação"], [role="main"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {
      /* rotas full-height (chat/docs) podem não ter esses marcadores */
    });
}

/**
 * Clica em um elemento e aguarda navegação se necessário
 */
export async function clickAndNavigate(page: Page, selector: string, options?: { waitForNav?: boolean }) {
  const element = page.locator(selector).first();

  if (!await element.isVisible()) {
    throw new Error(`Element not visible: ${selector}`);
  }

  // Scroll para garantir visibilidade em mobile
  await element.scrollIntoViewIfNeeded();
  await element.click();

  // Aguarda navegação se necessário (DOM pronto — nunca networkidle, ver navigateTo)
  if (options?.waitForNav !== false) {
    await page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Aguarda e verifica visibilidade de um elemento
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible({ timeout });
  return element;
}

/**
 * Encontra link por href ou texto
 */
export function getNavLink(page: Page, path: string, text?: string) {
  if (path) {
    return page.locator(`a[href="${path}"]`).first();
  }
  return page.locator(`a, button`).filter({ hasText: new RegExp(text || '', 'i') }).first();
}

/**
 * Verifica se viewport é mobile
 */
export function isMobileViewport(viewportWidth: number) {
  return viewportWidth < 768;
}

/**
 * Aguarda elemento desaparecer
 */
export async function waitForElementToDisappear(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector).first();
  await expect(element).not.toBeVisible({ timeout });
}

/**
 * Obtém texto visível de um elemento
 */
export async function getVisibleText(page: Page, selector: string) {
  const element = page.locator(selector).first();
  const isVisible = await element.isVisible().catch(() => false);

  if (!isVisible) {
    return null;
  }

  return await element.textContent();
}
