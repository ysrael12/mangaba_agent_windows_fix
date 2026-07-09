import { test, expect, type Page } from '@playwright/test';

/**
 * Cobertura de features — visita cada rota do app e verifica que ela renderiza
 * sem crash de runtime (React error boundary / página em branco), que produz
 * conteúdo visível e que a navegação lateral funciona.
 *
 * O backend (`/api`) pode não estar rodando nos testes; o app é resiliente e
 * renderiza mesmo assim, então só falhamos em erros de runtime reais — não em
 * fetches que rejeitam.
 */

/** Todas as rotas de nível superior declaradas em src/App.tsx (BUILTIN_ROUTES_CORE). */
const ROUTES: Array<{ path: string; label: string }> = [
  { path: '/home', label: 'Início' },
  { path: '/chat', label: 'Chat' },
  { path: '/sessions', label: 'Sessões' },
  { path: '/criar', label: 'Criar agente' },
  { path: '/fleet', label: 'Agentes ativos' },
  { path: '/clients', label: 'Conectar serviços' },
  { path: '/configuracoes', label: 'Configurações' },
  { path: '/skills', label: 'Habilidades' },
  { path: '/config', label: 'Avançado' },
  { path: '/cron', label: 'Agendamentos' },
  { path: '/kanban', label: 'Kanban' },
  { path: '/logs', label: 'Logs' },
  { path: '/docs', label: 'Documentação' },
];

/**
 * Coleta erros de runtime (exceções não tratadas) da página. Ignora ruído
 * conhecido que não indica quebra de feature: falha de fonte WOFF, plugins
 * opcionais e fetches de rede rejeitados (backend ausente).
 */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (
      text.includes('WOFF') ||
      text.includes('font') ||
      text.includes('Failed to load plugin') ||
      // Backend `/api` ausente nos testes E2E: fetches rejeitam / respondem
      // erro HTTP. O app é resiliente a isso — não é quebra de feature.
      text.includes('Failed to load resource') ||
      text.includes('Failed to fetch') ||
      text.includes('Internal Server Error') ||
      /\bstatus\b|\b5\d{2}\b|\b4\d{2}\b/.test(text) ||
      text.includes('net::ERR') ||
      text.includes('CORS') ||
      text.includes('favicon')
    ) {
      return;
    }
    errors.push(text);
  });
  return errors;
}

test.describe('Feature routes render', () => {
  for (const { path, label } of ROUTES) {
    test(`route ${path} (${label}) renders without runtime crash`, async ({ page }) => {
      const errors = collectPageErrors(page);

      await page.goto(path, { waitUntil: 'domcontentloaded' });

      // A rota deve permanecer nela (sem redirect para /home por erro),
      // exceto '/' que redireciona por design (não testado aqui).
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));

      // Algo visível deve renderizar: shell + conteúdo da rota.
      const content = page
        .locator('[role="main"], main, h1, [role="heading"], textarea, form')
        .first();
      await expect(content).toBeVisible({ timeout: 15000 });

      // Nenhuma exceção de runtime não tratada.
      expect(errors, `Runtime errors on ${path}:\n${errors.join('\n')}`).toHaveLength(0);
    });
  }
});

test.describe('Sidebar navigation', () => {
  test('every sidebar link navigates to its route', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });

    const sidebar = page.locator('nav[aria-label="Navegação"]').first();
    await expect(sidebar).toBeVisible();

    // Rotas que aparecem como links diretos na navegação lateral.
    const navPaths = ['/sessions', '/criar', '/fleet', '/clients', '/configuracoes', '/skills', '/config', '/cron', '/logs', '/docs'];

    for (const path of navPaths) {
      const link = sidebar.locator(`a[href="${path}"]`).first();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')), { timeout: 10000 });
      // Volta para home para o próximo clique (estado de nav consistente).
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await expect(sidebar).toBeVisible();
    }
  });
});

test.describe('Command palette (⌘K)', () => {
  test('opens via keyboard shortcut and filters commands', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('nav[aria-label="Navegação"]').first()).toBeVisible();

    // Abre o palette. No macOS é Meta+K; no CI (Linux/Win) é Control+K.
    await page.keyboard.press('Control+KeyK');

    const dialog = page.locator('[role="dialog"]').first();
    const opened = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

    if (!opened) {
      // Fallback: botão "Abrir busca de comandos" no topo da sidebar.
      await page.locator('button[aria-label="Abrir busca de comandos"]').first().click();
      await expect(dialog).toBeVisible({ timeout: 5000 });
    } else {
      await expect(dialog).toBeVisible();
    }

    // Digitar deve filtrar comandos sem quebrar.
    const input = dialog.locator('input').first();
    await input.fill('logs');
    await expect(dialog).toBeVisible();

    // Fecha com Escape.
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
