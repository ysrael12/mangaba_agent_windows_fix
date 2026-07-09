# 📖 Guia Completo de Testes E2E com Playwright

**Mangaba Agent Web Dashboard**

---

## Índice

1. [Introdução](#introdução)
2. [Instalação](#instalação)
3. [Estrutura de Testes](#estrutura-de-testes)
4. [Primeiros Passos](#primeiros-passos)
5. [Rodando Testes](#rodando-testes)
6. [Escrevendo Testes](#escrevendo-testes)
7. [Debugging](#debugging)
8. [Boas Práticas](#boas-práticas)
9. [Exemplos Práticos](#exemplos-práticos)
10. [Troubleshooting](#troubleshooting)

---

## 📌 Introdução

**Playwright** é um framework moderno para testes E2E (End-to-End) que permite automatizar testes em múltiplos browsers:
- ✅ Chromium (Chrome, Edge)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome
- ✅ Mobile Safari

### Por que Playwright?

```
┌─────────────────────────────────────────┐
│ Vantagens do Playwright                 │
├─────────────────────────────────────────┤
│ ✓ Suporte a múltiplos browsers          │
│ ✓ API moderna com async/await           │
│ ✓ Debug tools integradas                │
│ ✓ Relatórios HTML interativos           │
│ ✓ Vídeos e screenshots automáticos      │
│ ✓ Trace viewer para debugging           │
│ ✓ TypeScript first-class                │
│ ✓ CI/CD friendly                        │
└─────────────────────────────────────────┘
```

---

## 🚀 Instalação

### 1. Instalar Dependências

```bash
cd web
npm install -D @playwright/test
```

### 2. Instalar Browsers

```bash
npx playwright install
```

**Primeira vez?** Isso baixa ~500MB de browsers (uma única vez).

### 3. Verificar Instalação

```bash
npx playwright --version
# Saída esperada: Version 1.61.1 (ou superior)
```

---

## 📁 Estrutura de Testes

```
web/
├── e2e/                          # Testes end-to-end
│   ├── tests/                    # Arquivos de teste
│   │   ├── navigation.spec.ts    # Testes de navegação
│   │   ├── home.spec.ts          # Testes da home
│   │   ├── theme.spec.ts         # Testes de tema
│   │   ├── responsive.spec.ts    # Testes responsivos
│   │   └── accessibility.spec.ts # Testes de acessibilidade
│   ├── fixtures/                 # Setup/teardown
│   │   └── page.ts               # Fixture customizada
│   ├── utils/                    # Funções auxiliares
│   │   └── helpers.ts            # Helpers reutilizáveis
│   └── snapshots/                # Screenshots/snapshots
├── playwright.config.ts          # Configuração
├── playwright-report/            # Relatório HTML (gerado)
└── test-results/                 # Vídeos/screenshots (gerado)
```

---

## 🎯 Primeiros Passos

### Passo 1: Escrever seu Primeiro Teste

Crie arquivo `e2e/tests/exemplo.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Meu Primeiro Teste', () => {
  test('deve navegar para a home', async ({ page }) => {
    // 1. Navega para a página
    await page.goto('/home');
    
    // 2. Aguarda carregamento
    await page.waitForLoadState('networkidle');
    
    // 3. Verifica se URL está correta
    await expect(page).toHaveURL(/\/home/);
    
    // 4. Verifica se há conteúdo
    const main = page.locator('[role="main"]');
    await expect(main).toBeVisible();
  });

  test('deve ter título na página', async ({ page }) => {
    await page.goto('/home');
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
```

### Passo 2: Rodar o Teste

```bash
# Rodar arquivo específico
npx playwright test e2e/tests/exemplo.spec.ts

# Rodar com interface visual
npx playwright test --ui

# Rodar em modo debug
npx playwright test --debug
```

### Passo 3: Ver Resultados

```bash
# Abrir relatório HTML
npx playwright show-report
```

---

## ⚙️ Rodando Testes

### Scripts Disponíveis

```bash
# Rodar todos os testes (headless)
npm run test:e2e

# Interface interativa (recomendado para desenvolvimento)
npm run test:e2e:ui

# Modo debug com visualização ao vivo
npm run test:e2e:debug

# Teste com navegador visível
npm run test:e2e:headed

# Apenas Chromium
npm run test:e2e:chrome

# Apenas testes mobile
npm run test:e2e:mobile
```

### Exemplo de Execução

```bash
# Desenvolver novo teste
npm run test:e2e:ui

# Testar em CI/CD
npm run test:e2e

# Debug rápido
npm run test:e2e:debug
```

### Saída Esperada

```
Running 170 tests using 4 workers

  ✓ [chromium] › e2e/tests/navigation.spec.ts (4s)
  ✓ [firefox] › e2e/tests/home.spec.ts (3s)
  ✗ [mobile] › e2e/tests/responsive.spec.ts (timeout)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  145 passed (12m)
  25 failed
```

---

## ✍️ Escrevendo Testes

### Estrutura Básica

```typescript
import { test, expect } from '@playwright/test';

test.describe('Nome da Suite', () => {
  // Setup (executado antes de cada teste)
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
  });

  // Teste individual
  test('descrição do que testa', async ({ page }) => {
    // Arrange - preparar
    const button = page.locator('button');

    // Act - executar
    await button.click();

    // Assert - verificar
    await expect(page).toHaveURL(/\/novo-caminho/);
  });

  // Cleanup (executado após cada teste)
  test.afterEach(async ({ page }) => {
    // Limpeza se necessário
  });
});
```

### Seletores (Locators)

```typescript
// ✅ BONS - específicos e robustos
page.locator('a[href="/home"]')           // Por atributo
page.locator('button:has-text("Enviar")') // Por conteúdo
page.locator('[aria-label="fechar"]')     // Por acessibilidade
page.locator('id=myId')                   // Por ID

// ❌ RUINS - frágeis e genéricos
page.locator('div')                       // Muito genérico
page.locator('a, button').first()         // Ambíguo
page.locator('//*[@id="x"]')              // XPath frágil
page.locator('a').filter({ hasText: /texto/ }).nth(3)  // Frágil
```

### Interações Comuns

```typescript
// Navegação
await page.goto('/home');
await page.goBack();
await page.goForward();

// Clique
await page.click('button');
await page.locator('button').click();
await button.click();

// Preenchimento de Formulário
await page.fill('input[name="email"]', 'teste@exemplo.com');
await page.type('input[name="password"]', 'senha123');  // Digita caractere por caractere

// Checkbox/Radio
await page.check('input[type="checkbox"]');
await page.uncheck('input[type="checkbox"]');

// Seleção em dropdown
await page.selectOption('select', 'value-option');

// Scroll
await page.scrollIntoViewIfNeeded('button');  // Scroll até elemento
await page.evaluate(() => window.scrollBy(0, 100));  // Scroll manual

// Aguardar
await page.waitForLoadState('networkidle');  // Até rede ficar idle
await page.waitForURL(/\/novo-caminho/);     // Até URL mudar
await page.waitForSelector('button');        // Até elemento aparecer
await page.waitForFunction(() => document.body.innerHTML.includes('texto'));
```

### Assertions (Verificações)

```typescript
// Verificar URL
await expect(page).toHaveURL('/home');
await expect(page).toHaveURL(/\/home/);

// Verificar visibilidade
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();

// Verificar texto
await expect(locator).toContainText('Olá');
await expect(locator).toHaveText('Exatamente isto');

// Verificar atributos
await expect(locator).toHaveAttribute('href', '/home');

// Verificar count
await expect(locator).toHaveCount(5);

// Verificar classe
await expect(locator).toHaveClass('ativo');

// Verificar estado
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toBeEditable();
```

### Exemplo Completo

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('deve fazer login com sucesso', async ({ page }) => {
    // Navegar
    await page.goto('/login');
    
    // Preencher formulário
    await page.fill('input[name="email"]', 'usuario@exemplo.com');
    await page.fill('input[name="password"]', 'senha123');
    
    // Submeter
    await page.click('button[type="submit"]');
    
    // Aguardar sucesso
    await page.waitForURL('/dashboard');
    
    // Verificar
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

---

## 🐛 Debugging

### Modo Interativo (UI)

```bash
npm run test:e2e:ui
```

**Recursos:**
- ▶️ Play/Pause testes
- Step-through linha por linha
- Inspect elementos
- Network monitor
- Console

### Modo Debug

```bash
npm run test:e2e:debug
```

**Abre:**
- Inspector do Playwright (pause em cada ação)
- Browser com devtools abertos
- Trace viewer integrado

### Inspetor Automático

```bash
# Gera seletores automaticamente
npx playwright codegen http://localhost:5173
```

Clique nos elementos e o Playwright gera o código!

### Ver Traces

```bash
# Arquivo gerado em test-results/
npx playwright show-trace trace.zip
```

Vê exatamente o que aconteceu frame-by-frame!

### Debugging com Console

```typescript
test('debug com console', async ({ page }) => {
  await page.goto('/home');
  
  // Imprimir valores
  console.log('URL atual:', page.url());
  
  // Inspecionar elemento
  const element = page.locator('[role="main"]');
  console.log('HTML:', await element.innerHTML());
  
  // Debugar via browser console
  await page.evaluate(() => {
    console.log('Do navegador:', document.title);
  });
});
```

### Screenshots e Vídeos

Gerados automaticamente em falhas:
- `test-results/*/test-failed-1.png`
- `test-results/*/video.webm`
- `playwright-report/` (relatório interativo)

---

## ✨ Boas Práticas

### 1. Seletores Robustos

```typescript
// ✅ BOM - usa atributos específicos
const loginButton = page.locator('button[aria-label="Login"]');

// ✅ BOM - usa href
const homeLink = page.locator('a[href="/home"]');

// ✅ BOM - usa role + texto
const submitBtn = page.locator('[role="button"]:has-text("Enviar")');

// ❌ RUIM - muito genérico
const button = page.locator('button');

// ❌ RUIM - por posição
const btn = page.locator('button').nth(2);
```

### 2. Aguardar Apropriadamente

```typescript
// ✅ BOM - aguarda estado da rede
await page.waitForLoadState('networkidle');

// ✅ BOM - aguarda URL mudar
await page.waitForURL(/\/novo-caminho/);

// ✅ BOM - aguarda elemento
await expect(locator).toBeVisible();

// ❌ RUIM - hardcoded sleep
await page.waitForTimeout(1000);  // Evitar!
```

### 3. Setup e Cleanup

```typescript
test.beforeEach(async ({ page }) => {
  // Setup antes de cada teste
  await page.goto('/home');
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ page }) => {
  // Cleanup após cada teste
  // (página é fechada automaticamente)
});
```

### 4. Reutilizar Código

Criar helpers em `e2e/utils/helpers.ts`:

```typescript
export async function navigateTo(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

export async function clickNavLink(page, path) {
  const link = page.locator(`a[href="${path}"]`);
  await link.scrollIntoViewIfNeeded();
  await link.click();
}
```

Usar nos testes:

```typescript
import { navigateTo, clickNavLink } from '../utils/helpers';

test('teste', async ({ page }) => {
  await navigateTo(page, '/home');
  await clickNavLink(page, '/logs');
});
```

### 5. Fixtures Customizadas

Arquivo `e2e/fixtures/page.ts`:

```typescript
import { test as base } from '@playwright/test';
import { navigateTo } from '../utils/helpers';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Setup
    await navigateTo(page, '/home');
    
    // Use
    await use(page);
    
    // Cleanup
    // page.close() automático
  },
});
```

Usar:

```typescript
import { test, expect } from '../fixtures/page';

test('com fixture', async ({ authenticatedPage: page }) => {
  // page já está em /home
  await expect(page).toHaveURL(/\/home/);
});
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Teste de Navegação

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('deve navegar entre páginas', async ({ page }) => {
    // Home
    await page.goto('/home');
    await expect(page).toHaveURL(/\/home/);
    
    // Logs
    await page.click('a[href="/logs"]');
    await expect(page).toHaveURL(/\/logs/);
    
    // Voltar
    await page.goBack();
    await expect(page).toHaveURL(/\/home/);
  });
});
```

### Exemplo 2: Teste Responsivo

```typescript
test('layout responsivo', async ({ page }) => {
  // Desktop
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/home');
  
  let sidebar = await page.locator('aside').isVisible();
  expect(sidebar).toBeTruthy();
  
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  
  sidebar = await page.locator('aside').isVisible();
  expect(sidebar).toBeFalsy();  // drawer fechado
  
  // Abrir drawer
  await page.click('button[aria-label*="menu"]');
  sidebar = await page.locator('aside').isVisible();
  expect(sidebar).toBeTruthy();
});
```

### Exemplo 3: Teste de Formulário

```typescript
test('enviar formulário', async ({ page }) => {
  await page.goto('/configuracoes');
  
  // Preencher
  await page.fill('input[name="nome"]', 'João Silva');
  await page.fill('input[name="email"]', 'joao@exemplo.com');
  await page.check('input[type="checkbox"]');
  
  // Submeter
  await page.click('button:has-text("Salvar")');
  
  // Verificar sucesso
  await expect(page.locator('text=Salvo com sucesso')).toBeVisible();
});
```

### Exemplo 4: Teste com Mock

```typescript
test('interceptar requisições', async ({ page }) => {
  // Mock de resposta
  await page.route('**/api/users', route => {
    route.abort('blockedbyclient');
  });
  
  await page.goto('/users');
  
  // Página deve mostrar erro
  await expect(page.locator('text=Erro ao carregar')).toBeVisible();
});
```

### Exemplo 5: Teste de Acessibilidade

```typescript
test('navegação por teclado', async ({ page }) => {
  await page.goto('/home');
  
  // Tab para primeiro botão
  await page.keyboard.press('Tab');
  
  // Verifica que tem foco
  const focused = await page.evaluate(() => {
    return document.activeElement?.tagName;
  });
  expect(focused).toBe('BUTTON');
  
  // Enter para clicar
  await page.keyboard.press('Enter');
});
```

---

## 🔧 Troubleshooting

### Problema: Teste Timeout

**Causa:** Elemento não encontrado ou página não carrega

**Solução:**
```typescript
// Aumentar timeout
await expect(locator).toBeVisible({ timeout: 30000 });

// Ou verificar se existe
const exists = await locator.isVisible().catch(() => false);
if (exists) {
  // fazer algo
}
```

### Problema: Elemento Fora do Viewport

**Causa:** Elemento existe mas está fora da tela (mobile)

**Solução:**
```typescript
// Scroll antes de clicar
await element.scrollIntoViewIfNeeded();
await element.click();
```

### Problema: Strict Mode Violation

**Causa:** Seletor encontra múltiplos elementos

**Solução:**
```typescript
// ❌ RUIM
await page.locator('button').click();  // Qual dos muitos?

// ✅ BOM
await page.locator('button[type="submit"]').click();
await page.locator('button:has-text("Enviar")').first().click();
```

### Problema: Teste Passa Localmente, Falha no CI/CD

**Causa:** Diferença de timing ou viewport

**Solução:**
```typescript
// Não depender de hardcoded waits
// ❌ await page.waitForTimeout(1000);

// ✅ Aguardar estado específico
await page.waitForLoadState('networkidle');
await page.waitForURL(/\/novo-path/);
```

### Problema: Browser Não Inicia

**Causa:** Browsers não instalados

**Solução:**
```bash
npx playwright install
# Ou específico
npx playwright install chromium
```

---

## 📊 Visualizando Resultados

### Relatório HTML Interativo

```bash
npx playwright show-report
```

Abre em `http://localhost:9323`:
- ✓ Resumo de todos os testes
- ✓ Detalhes por browser
- ✓ Screenshots de falhas
- ✓ Vídeos de testes (se falhar)
- ✓ Traces completas

### Ver Vídeo Específico

```bash
# Localizar vídeo
ls test-results/*/video.webm

# Assistir (usar VLC ou browser)
start test-results/my-test-Mobile-Chrome/video.webm
```

### Comparar com Trace

```bash
# Arquivo gerado automaticamente
npx playwright show-trace test-results/trace.zip
```

Frame-by-frame do que o Playwright fez!

---

## 🚀 Próximos Passos

1. **Leia a documentação oficial:** https://playwright.dev
2. **Execute os testes:** `npm run test:e2e:ui`
3. **Estude os exemplos:** `e2e/tests/*.spec.ts`
4. **Escreva seu primeiro teste:** Copie um exemplo e customize
5. **Use o inspector:** `npx playwright codegen`

---

## 📞 Referência Rápida

| Tarefa | Comando |
|--------|---------|
| Instalar | `npm install -D @playwright/test` |
| Browsers | `npx playwright install` |
| Rodar testes | `npm run test:e2e` |
| Modo UI | `npm run test:e2e:ui` |
| Debug | `npm run test:e2e:debug` |
| Codegen | `npx playwright codegen URL` |
| Report | `npx playwright show-report` |
| Trace | `npx playwright show-trace file.zip` |

---

## 📝 Checklist para Novo Teste

- [ ] Arquivo criado em `e2e/tests/`
- [ ] Suite descrita com `test.describe()`
- [ ] Teste individual com descrição clara
- [ ] Seletores específicos e robustos
- [ ] Aguarda carregar com `waitForLoadState`
- [ ] Assertions verificam resultado
- [ ] Teste passa localmente
- [ ] Teste passa no CI/CD
- [ ] Documentado se é complexo

---

**Última atualização:** 2026-07-06  
**Versão Playwright:** 1.61.1+  
**Projeto:** Mangaba Agent Web Dashboard
