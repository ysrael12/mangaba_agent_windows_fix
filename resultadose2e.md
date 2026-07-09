# Análise e Plano de Testes E2E - Mangaba Agent Web Dashboard

**Data:** 2026-07-06  
**Projeto:** Mangaba Agent Web UI  
**Status:** Planejamento Completo com Exemplos

---

## 1. Análise da Arquitetura do Projeto

### Stack Tecnológico

| Componente | Versão | Propósito |
|-----------|--------|----------|
| React | 19.2.4 | Framework principal |
| TypeScript | ~5.9.3 | Type-safety |
| Vite | 7.3.1 | Build tool e dev server |
| Tailwind CSS | 4.2.1 | Styling |
| React Router | 7.14.1 | Navegação |
| TanStack Query | 5.101.2 | Data fetching e caching |
| Vitest | 4.1.9 | Testes unitários (atualmente) |
| Motion | 12.38.0 | Animações |

### Estrutura do Projeto

```
web/
├── src/
│   ├── components/        # Componentes React reutilizáveis
│   │   ├── ui/           # Primitivos (Button, Input, Card, etc)
│   │   └── [outros]      # Componentes de domínio
│   ├── pages/            # Páginas/rotas principais
│   │   ├── HomePage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── FleetPage.tsx
│   │   ├── ConfigPage.tsx
│   │   ├── LogsPage.tsx
│   │   ├── CronPage.tsx
│   │   ├── SkillsPage.tsx
│   │   ├── ClientsPage.tsx
│   │   ├── GlobalSessionsPage.tsx
│   │   ├── AgentDashboardPage.tsx
│   │   ├── AgentWizardPage.tsx
│   │   └── [outras]
│   ├── lib/              # Utilitários e API client
│   │   ├── gatewayClient.ts  # Cliente HTTP com proxy
│   │   └── utils.ts      # Helpers (cn, etc)
│   ├── contexts/         # React contexts (temas, headers, etc)
│   ├── hooks/            # Custom hooks
│   ├── i18n/             # Internacionalização (14+ idiomas)
│   ├── themes/           # Sistema de temas
│   └── plugins/          # Sistema de plugins dinâmicos
├── vite.config.ts        # Configuração de build
├── vitest.config.ts      # Configuração de testes unitários
└── package.json
```

### Principais Rotas

| Rota | Página | Função |
|------|--------|--------|
| `/` | RootRedirect | Redireciona para `/home` |
| `/home` | HomePage | Dashboard inicial |
| `/chat` | ChatPage | Integração WebSocket para chat |
| `/sessions` | GlobalSessionsPage | Histórico de conversas |
| `/criar` | AgentWizardPage | Criação de novos agentes |
| `/fleet` | FleetPage | Agentes ativos em tempo real |
| `/clients` | ClientsPage | Conexão de serviços |
| `/configuracoes` | SimpleSettings | Configurações do usuário |
| `/config` | ConfigPage | Configuração avançada |
| `/skills` | SkillsPage | Capacidades disponíveis |
| `/cron` | CronPage | Agendamentos |
| `/kanban` | KanbanPage | Gerenciamento de tarefas |
| `/logs` | LogsPage | Visualização de logs |
| `/docs` | DocsPage | Documentação integrada |
| `/dashboard/agent/:id` | AgentDashboardPage | Dashboard de agente específico |

### Features Críticas

- ✅ **Navegação via sidebar** com 3+ seções
- ✅ **Responsividade mobile** (header colapsável, drawer)
- ✅ **Tema claro/escuro** com toggle
- ✅ **Command Palette** (⌘K) com navegação + ações
- ✅ **Multilíngue** (14 idiomas via i18n)
- ✅ **Real-time updates** via TanStack Query + WebSocket (chat)
- ✅ **Sistema de plugins** dinâmicos
- ✅ **Autenticação** via OAuth (modal integrado)
- ✅ **Rate limit banner** informativo
- ✅ **Toast notifications** para feedback

---

## 2. Ferramenta Recomendada: Playwright

### Por que Playwright?

✅ **Moderno e rápido** — Múltiplos navegadores (Chromium, Firefox, WebKit)  
✅ **Web-first** — APIs otimizadas para aplicações modernas  
✅ **Suporte nativo a async** — Promises nativas sem callbacks  
✅ **Debug tools** — Inspector, trace viewer, headed mode  
✅ **Multiplataforma** — Windows, macOS, Linux  
✅ **CI/CD friendly** — Reportes HTML, vídeos, screenshots  
✅ **TypeScript first-class** — Tipos automáticos  

### Alternativas Consideradas

| Ferramenta | Pros | Contras |
|-----------|------|---------|
| **Playwright** | Moderno, rápido, multiplataforma | Curva de aprendizado inicial |
| Cypress | Ótima DX, debugging integrado | Menos eficiente, browser único |
| Puppeteer | Leve, Chromium nativo | Menos features, documentação menor |
| WebdriverIO | Padrão W3C | Setup mais complexo |

---

## 3. Configuração do Playwright

### 3.1 Instalação

```bash
# Instalar Playwright e suas dependências
npm install -D @playwright/test

# Instalar browsers (uma vez)
npx playwright install
```

### 3.2 Arquivo de Configuração (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração E2E para Mangaba Agent Web Dashboard
 * 
 * Executa testes contra:
 * - Vite dev server (http://localhost:5173) OR
 * - Backend dashboard (http://127.0.0.1:9119)
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],
  
  use: {
    // URL base para todos os testes
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Trace para debugging
    trace: 'on-first-retry',
    
    // Screenshot em caso de falha
    screenshot: 'only-on-failure',
    
    // Video em caso de falha
    video: 'retain-on-failure',
  },

  // Servidor de desenvolvimento (inicia automaticamente)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

### 3.3 Estrutura de Diretórios

```
web/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.ts           # Fixture para login/autenticação
│   │   └── database.ts       # Mock de dados de teste
│   ├── tests/
│   │   ├── navigation.spec.ts
│   │   ├── home.spec.ts
│   │   ├── chat.spec.ts
│   │   ├── theme.spec.ts
│   │   ├── command-palette.spec.ts
│   │   ├── responsive.spec.ts
│   │   └── accessibility.spec.ts
│   └── utils/
│       └── helpers.ts        # Funções auxiliares
└── playwright.config.ts
```

---

## 4. Plano Detalhado de Testes E2E

### Categorias de Testes

#### A. **Testes de Navegação** (Crítico)
- ✅ Redirecionamento `/` → `/home`
- ✅ Clique em itens da sidebar navega corretamente
- ✅ URLs diretas carregam páginas corretas
- ✅ Voltar/avançar do browser funciona
- ✅ 404s redirecionam para home
- ✅ Plugin routes carregam dinamicamente

#### B. **Testes de Páginas Principais** (Alto)
- ✅ **HomePage** — Layout básico, cards carregam
- ✅ **ChatPage** — WebSocket conecta, mensagens enviam/recebem
- ✅ **FleetPage** — Lista agentes, status atualiza em tempo real
- ✅ **ConfigPage** — Schema dinâmico carrega, valores salvam
- ✅ **LogsPage** — Logs carregam, filtros funcionam
- ✅ **SkillsPage** — Lista habilidades, informações exibem

#### C. **Testes de UI/UX** (Alto)
- ✅ **Tema claro/escuro** — Toggle muda tema, persiste localStorage
- ✅ **Command Palette** (⌘K) — Abre, navega, executa ações
- ✅ **Responsividade** — Mobile drawer abre/fecha, layout reflow
- ✅ **Rate limit banner** — Exibe/esconde baseado em estado
- ✅ **Toasts** — Notificações aparecem e desaparecem
- ✅ **Modals** — OAuth, confirm dialogs funcionam

#### D. **Testes de Internacionalização** (Médio)
- ✅ i18n carrega idioma correto
- ✅ Trocar idioma atualiza texto
- ✅ Persistência de idioma

#### E. **Testes de Acessibilidade** (Médio)
- ✅ Navegação via teclado (Tab, Enter, Escape)
- ✅ ARIA labels presentes
- ✅ Contraste adequado (não testar, apenas validar)
- ✅ Screen reader friendly

#### F. **Testes de Performance** (Baixo)
- ✅ Carregamento de página < 3s
- ✅ Smooth animations (60fps onde aplicável)
- ✅ Bundle size checks

---

## 5. Exemplos de Testes

### 5.1 Teste de Navegação Básica

```typescript
// e2e/tests/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('redirect root to /home', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/home/);
  });

  test('click sidebar item navigates', async ({ page }) => {
    await page.goto('/home');
    
    // Clica em "Agentes ativos" na sidebar
    await page.click('text=Agentes ativos');
    
    // Verifica que a URL mudou
    await expect(page).toHaveURL(/\/fleet/);
    
    // Verifica que a página carregou
    await expect(page.locator('text=Agentes ativos')).toBeVisible();
  });

  test('direct URL loads correct page', async ({ page }) => {
    await page.goto('/logs');
    
    // Verifica que estamos na página de logs
    await expect(page).toHaveURL(/\/logs/);
    
    // Sidebar item correspondente destaca
    await expect(page.locator('[aria-current="page"]')).toContainText('Logs');
  });

  test('back button works', async ({ page }) => {
    await page.goto('/home');
    await page.click('text=Configurações');
    await expect(page).toHaveURL(/\/configuracoes/);
    
    await page.goBack();
    await expect(page).toHaveURL(/\/home/);
  });

  test('404 redirects to home', async ({ page }) => {
    await page.goto('/inexistent-route-xyz');
    
    // Aguarda redirecionamento automático
    await expect(page).toHaveURL(/\/home/, { timeout: 5000 });
  });
});
```

### 5.2 Teste de Tema (Claro/Escuro)

```typescript
// e2e/tests/theme.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test('toggle between light and dark theme', async ({ page }) => {
    await page.goto('/home');
    
    // Verifica tema inicial
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    
    // Clica no toggle de tema (button com icon Moon/Sun)
    const themeToggle = page.locator('button[title*="Mudar para"]').first();
    await themeToggle.click();
    
    // Aguarda mudança visual
    await page.waitForTimeout(300);
    
    // Verifica que tema mudou
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('theme preference persists across navigation', async ({ page }) => {
    await page.goto('/home');
    
    // Muda para dark
    const themeToggle = page.locator('button[title*="Mudar para"]').first();
    await themeToggle.click();
    
    // Navega para outra página
    await page.click('text=Logs');
    await expect(page).toHaveURL(/\/logs/);
    
    // Verifica que tema permanece dark
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(theme).toBe('dark');
  });

  test('localStorage stores theme preference', async ({ page }) => {
    await page.goto('/home');
    
    // Pega tema inicial
    const themeToggle = page.locator('button[title*="Mudar para"]').first();
    await themeToggle.click();
    
    // Verifica localStorage
    const theme = await page.evaluate(() => {
      return localStorage.getItem('theme');
    });
    
    expect(theme).toBeTruthy();
  });
});
```

### 5.3 Teste de Command Palette

```typescript
// e2e/tests/command-palette.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Command Palette (⌘K)', () => {
  test('opens with keyboard shortcut', async ({ page }) => {
    await page.goto('/home');
    
    // Pressiona Ctrl+K (ou Cmd+K no Mac)
    await page.keyboard.press('Control+K');
    
    // Procura o dialog da palette
    const palette = page.locator('[role="dialog"]');
    await expect(palette).toBeVisible();
    
    // Input está focado
    const input = page.locator('input[placeholder*="comando"]');
    await expect(input).toBeFocused();
  });

  test('search filters commands', async ({ page }) => {
    await page.goto('/home');
    
    await page.keyboard.press('Control+K');
    
    // Digita "fleet"
    await page.keyboard.type('fleet');
    
    // Verifica que apenas "Agentes ativos" aparece
    const items = page.locator('[role="option"]');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Agentes ativos');
  });

  test('navigate with arrow keys and enter', async ({ page }) => {
    await page.goto('/home');
    
    await page.keyboard.press('Control+K');
    
    // Seta para baixo
    await page.keyboard.press('ArrowDown');
    
    // Enter para navegar
    await page.keyboard.press('Enter');
    
    // Verifica que navegou para primeira opção
    const heading = page.locator('h1, h2, h3');
    await expect(heading).toBeVisible();
  });

  test('closes with Escape key', async ({ page }) => {
    await page.goto('/home');
    
    await page.keyboard.press('Control+K');
    const palette = page.locator('[role="dialog"]');
    await expect(palette).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(palette).not.toBeVisible();
  });
});
```

### 5.4 Teste de Chat (WebSocket)

```typescript
// e2e/tests/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Page', () => {
  test('chat page loads with placeholder message', async ({ page }) => {
    await page.goto('/chat');
    
    // Espera que o placeholder carregue
    const placeholder = page.locator('text=Conectando ao servidor');
    await expect(placeholder).toBeVisible();
  });

  test('chat input is visible and focused', async ({ page }) => {
    await page.goto('/chat');
    
    // Aguarda carregamento
    await page.waitForTimeout(1000);
    
    // Encontra input de chat
    const input = page.locator('textarea, input[placeholder*="mensagem"]');
    await expect(input).toBeVisible();
  });

  test('can type message in chat input', async ({ page }) => {
    await page.goto('/chat');
    
    const input = page.locator('textarea, input[placeholder*="mensagem"]');
    
    await input.fill('Olá, assistente!');
    
    await expect(input).toHaveValue('Olá, assistente!');
  });

  test('layout is full-height', async ({ page }) => {
    await page.goto('/chat');
    
    // Chat é página full-height (sem padding dos outros)
    const main = page.locator('main, [role="main"]');
    
    // Verifica que ocupa altura total
    const boundingBox = await main.boundingBox();
    expect(boundingBox?.height).toBeGreaterThan(500);
  });
});
```

### 5.5 Teste de Responsividade Mobile

```typescript
// e2e/tests/responsive.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('mobile drawer opens and closes', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/home');
    
    // Verifica que hamburger menu está visível
    const menuButton = page.locator('button[aria-label*="navigation"]');
    await expect(menuButton).toBeVisible();
    
    // Clica para abrir drawer
    await menuButton.click();
    
    // Sidebar fica visível
    const sidebar = page.locator('nav, aside');
    await expect(sidebar).toBeVisible();
    
    // Clica para fechar (Escape ou botão)
    await page.keyboard.press('Escape');
    
    // Sidebar some (em mobile)
    await page.waitForTimeout(300);
  });

  test('desktop hides hamburger menu', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    await page.goto('/home');
    
    // Hamburger menu escondido
    const menuButton = page.locator('button[aria-label*="navigation"]');
    await expect(menuButton).not.toBeVisible();
    
    // Sidebar sempre visível
    const sidebar = page.locator('nav, aside');
    await expect(sidebar).toBeVisible();
  });

  test('content reflows on resize', async ({ page }) => {
    await page.goto('/home');
    
    // Pega elemento principal
    const content = page.locator('[role="main"]');
    
    // Mede largura em desktop
    let box = await content.boundingBox();
    const desktopWidth = box?.width;
    
    // Redimensiona para mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Aguarda reflow
    await page.waitForTimeout(500);
    
    // Mede novamente
    box = await content.boundingBox();
    const mobileWidth = box?.width;
    
    // Mobile é menor que desktop
    expect(mobileWidth).toBeLessThan(desktopWidth || 999);
  });

  test('header adjusts on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/home');
    
    // Header é compacto em mobile
    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    
    expect(headerBox?.height).toBeLessThan(80);
  });
});
```

### 5.6 Teste de Acessibilidade Básica

```typescript
// e2e/tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/home');
    
    // Tab pelo documento
    await page.keyboard.press('Tab');
    
    // Algum elemento deve estar focado
    const focused = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focused).not.toBe('BODY');
  });

  test('sidebar items have aria-current when active', async ({ page }) => {
    await page.goto('/logs');
    
    // Item ativo deve ter aria-current="page"
    const activeItem = page.locator('[aria-current="page"]');
    await expect(activeItem).toContainText('Logs');
  });

  test('buttons have proper labels', async ({ page }) => {
    await page.goto('/home');
    
    // Verifica que buttons têm aria-label ou text
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const label = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Deve ter label ou texto
      expect(label || text?.trim()).toBeTruthy();
    }
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/configuracoes');
    
    // Encontra inputs
    const inputs = page.locator('input, textarea, select');
    
    for (let i = 0; i < await inputs.count(); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      
      if (id) {
        // Deve ter label associado
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  });

  test('modals have proper ARIA roles', async ({ page }) => {
    await page.goto('/home');
    
    // Abre command palette
    await page.keyboard.press('Control+K');
    
    // Dialog tem role correto
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });
});
```

### 5.7 Teste de Internacionalização

```typescript
// e2e/tests/i18n.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('default language loads', async ({ page }) => {
    // Simula navegador em português
    await page.goto('/home', {
      waitUntil: 'networkidle',
    });
    
    // Busca texto em português
    const homeTitle = page.locator('text=Início');
    await expect(homeTitle).toBeVisible();
  });

  test('can switch language', async ({ page }) => {
    await page.goto('/configuracoes');
    
    // Busca seletor de idioma
    const langButton = page.locator('button:has-text("português")');
    
    if (await langButton.isVisible()) {
      await langButton.click();
      
      // Seleciona inglês
      await page.click('text=English');
      
      // Aguarda tradução
      await page.waitForTimeout(500);
      
      // Verifica que texto mudou para inglês
      const englishText = page.locator('text=Home, Settings');
      await expect(englishText).toBeVisible();
    }
  });
});
```

---

## 6. Scripts no `package.json`

Adicionar ao `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run --config vitest.config.ts",
    "test:watch": "vitest --config vitest.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:chrome": "playwright test --project=chromium",
    "test:e2e:mobile": "playwright test --project='Mobile Chrome' --project='Mobile Safari'"
  }
}
```

---

## 7. Configuração de CI/CD

### GitHub Actions (`.github/workflows/e2e.yml`)

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        working-directory: web
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        working-directory: web
      
      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: web
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: web/playwright-report/
          retention-days: 30
```

---

## 8. Guia de Execução

### Pré-requisitos

```bash
# Node.js 18+ (verificar com `node --version`)
node --version

# Backend Mangaba rodando
python -m mangaba_cli.main web --no-open
```

### Instalação Inicial

```bash
cd web

# 1. Instalar dependências
npm install

# 2. Instalar Playwright + browsers
npm install -D @playwright/test
npx playwright install

# 3. Criar estrutura E2E
mkdir -p e2e/tests e2e/fixtures e2e/utils
```

### Execução dos Testes

```bash
# Executar todos os testes (headless)
npm run test:e2e

# Executar com UI interativo
npm run test:e2e:ui

# Executar em modo debug (com vídeo/trace)
npm run test:e2e:debug

# Executar com navegador visível (headed)
npm run test:e2e:headed

# Executar apenas Chromium
npm run test:e2e:chrome

# Executar apenas testes mobile
npm run test:e2e:mobile

# Executar arquivo específico
npx playwright test e2e/tests/navigation.spec.ts

# Executar teste específico
npx playwright test e2e/tests/navigation.spec.ts -g "redirect root"

# Executar com configuração customizada
npx playwright test --project=firefox --headed
```

### Visualizar Resultados

```bash
# Abrir report HTML (gerado automaticamente)
npx playwright show-report

# Reproducir falha com trace
npx playwright show-trace trace.zip
```

---

## 9. Estimativa de Esforço

### Fases de Implementação

| Fase | Tarefas | Horas | Notas |
|------|---------|-------|-------|
| **1. Setup** | Config Playwright, estrutura diretórios, npm scripts | 2-3h | Única vez |
| **2. Fundações** | Fixtures (auth, helpers), base test template | 2-3h | Reutilizável |
| **3. Smoke Tests** | Navigation, home, 404 redirects | 3-4h | Testes críticos |
| **4. Feature Tests** | Chat, Fleet, Config, Logs, Pages | 12-16h | ~2-3h por página |
| **5. UX Tests** | Theme, Command Palette, Mobile, Toasts | 6-8h | ~1.5-2h por feature |
| **6. A11y Tests** | Keyboard nav, ARIA, semantic HTML | 4-5h | Validação |
| **7. i18n Tests** | Troca de idioma, persistência | 2-3h | Simples |
| **8. CI/CD** | GitHub Actions, artifacts, reporting | 2-3h | Automação |
| **TOTAL** | | **34-45 horas** | ~1 semana de dev |

### Priorização Recomendada

**Curto Prazo (Semana 1):**
- ✅ Setup + fixtures
- ✅ Navigation tests
- ✅ Home page smoke test
- ✅ Theme toggle

**Médio Prazo (Semana 2):**
- ✅ Chat page (WebSocket)
- ✅ Fleet page
- ✅ Command Palette
- ✅ Mobile responsividade

**Longo Prazo (Semana 3+):**
- ✅ Testes de todas as páginas
- ✅ Acessibilidade completa
- ✅ CI/CD automático

---

## 10. Checklist de Implementação

### ✅ Infraestrutura
- [ ] `npm install -D @playwright/test`
- [ ] Criar `playwright.config.ts`
- [ ] Estrutura de diretórios e2e/
- [ ] Scripts no package.json
- [ ] `.gitignore` com `test-results/`, `playwright-report/`

### ✅ Testes Críticos
- [ ] Navigation (7 testes)
- [ ] Theme switching (3 testes)
- [ ] Command Palette (4 testes)
- [ ] Home page (smoke test)

### ✅ Testes de Página
- [ ] Chat page (WebSocket, inputs)
- [ ] Fleet page (lista dinâmica)
- [ ] Logs page (carregamento)
- [ ] Config page (schema dinâmico)
- [ ] Skills page
- [ ] Sessions page

### ✅ Testes de UX
- [ ] Mobile drawer
- [ ] Responsive layout
- [ ] Toast notifications
- [ ] Rate limit banner
- [ ] Modal dialogs

### ✅ Testes de Acessibilidade
- [ ] Navegação via teclado
- [ ] ARIA labels
- [ ] Focus management
- [ ] Form associations

### ✅ CI/CD & Maintenance
- [ ] GitHub Actions workflow
- [ ] Artifact uploads
- [ ] Reportes HTML
- [ ] Documentation

---

## 11. Referências & Recursos

### Documentação
- [Playwright Documentation](https://playwright.dev)
- [Best Practices E2E Testing](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Selectors Guide](https://playwright.dev/docs/selectors)

### Padrões Recomendados
```typescript
// ✅ Bom: Espera por elemento e depois interage
await page.locator('button:has-text("Enviar")').click();

// ✅ Bom: Usa await para sincronização automática
await expect(page).toHaveURL(/\/logs/);

// ❌ Ruim: Hardcode sleeps
await page.waitForTimeout(1000);

// ❌ Ruim: XPath frágil
await page.click('/html/body/div[1]/button[2]');
```

### Tools Úteis
- **Playwright Inspector** — `npx playwright codegen http://localhost:5173`
- **Trace Viewer** — `npx playwright show-trace trace.zip`
- **VS Code Extension** — [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)

---

## 12. Conclusão

Este plano fornece uma base sólida para implementar testes E2E no Mangaba Agent Web Dashboard. 

### Próximos Passos

1. **Hoje**: Setup inicial (Playwright install, config, estrutura)
2. **Dia 2-3**: Implementar fixtures e testes de navegação
3. **Dia 4-5**: Adicionar testes de página principais
4. **Dia 6-7**: Testes de UX, acessibilidade e CI/CD

O custo inicial de setup (~5h) é compensado rapidamente pela confiança em regressões e maior velocidade de desenvolvimento a longo prazo.

**Estimado: 34-45 horas para cobertura completa**

---

**Documento preparado em:** 2026-07-06  
**Próxima revisão:** Após implementação inicial (Week 1)
