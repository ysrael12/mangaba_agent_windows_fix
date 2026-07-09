# 🎬 Índice de Screenshots e Vídeos

Referência completa de todos os artefatos visuais dos testes E2E.

---

## 📁 Localização dos Arquivos

```
web/
├── docs/
│   ├── screenshots/              ← Screenshots de exemplo
│   │   ├── home-page-desktop.png
│   │   ├── navegacao-sidebar.png
│   │   ├── chat-interface.png
│   │   ├── tema-claro-escuro.png
│   │   └── mobile-responsive.png
│   │
│   ├── GUIA_VISUAL.md            ← Referências com imagens
│   └── INDEX_VISUAL.md           ← Este arquivo
│
└── test-results/                 ← Artefatos dos testes
    ├── navigation-Navigation-*/
    ├── home-Home-Page-*/
    ├── theme-Theme-*/
    ├── responsive-Responsive-*/
    ├── accessibility-Accessibility-*/
    └── playwright-report/        ← Relatório HTML interativo
```

---

## 📸 Screenshots Disponíveis

### 1. Home Page - Desktop
**Arquivo:** `docs/screenshots/home-page-desktop.png`

**Mostra:**
- Layout principal do dashboard
- Bem-vindo ao usuário
- Resumo de agentes
- Cards de ações rápidas
- Sidebar completo

**Tamanho:** ~150KB  
**Resolução:** 1280x720 (desktop)

### 2. Navegação - Sidebar
**Arquivo:** `docs/screenshots/navegacao-sidebar.png`

**Mostra:**
- Menu lateral completo
- Todas as opções disponíveis
- Agrupamento por seções
- Ícones e labels

**Tamanho:** ~145KB  
**Resolução:** 1280x720

### 3. Chat - Interface
**Arquivo:** `docs/screenshots/chat-interface.png`

**Mostra:**
- Tela de chat em ação
- Área de mensagens
- Campo de entrada
- Indicador de status
- Layout conversacional

**Tamanho:** ~200KB  
**Resolução:** 1280x720

### 4. Tema - Claro/Escuro
**Arquivo:** `docs/screenshots/tema-claro-escuro.png`

**Mostra:**
- Botão de tema no topo
- Mudança de cores
- Modo claro vs escuro
- Indicador visual

**Tamanho:** ~200KB  
**Resolução:** 1280x720

### 5. Mobile - Responsivo
**Arquivo:** `docs/screenshots/mobile-responsive.png`

**Mostra:**
- Versão mobile do dashboard
- Menu hambúrguer
- Layout adaptado
- Botões maiores

**Tamanho:** ~210KB  
**Resolução:** 375x667 (mobile)

---

## 🎥 Vídeos dos Testes

### Localização dos Vídeos

Todos em: `web/test-results/`

**Subpastas:**
- `navigation-Navigation-*/` - Vídeos de navegação
- `home-Home-Page-*/` - Vídeos da home
- `theme-Theme-Switching-*/` - Vídeos de tema
- `responsive-Responsive-Design-*/` - Vídeos responsivos
- `accessibility-Accessibility-*/` - Vídeos de acessibilidade

**Em cada pasta:**
```
video.webm               ← Vídeo da ação
test-failed-1.png       ← Screenshot se falhou
error-context.md        ← Detalhes do erro (se houver)
```

### Exemplos de Vídeos

| Teste | Mostra | Tamanho |
|-------|--------|---------|
| `navigation-page-loads` | Carregamento inicial | ~76KB |
| `navigation-redirect-root` | Redirecionamento /→/home | ~100KB |
| `chat-page-loads` | Chat carregando | ~155KB |
| `theme-toggle` | Mudança de tema | ~190KB |
| `responsive-mobile-drawer` | Drawer em mobile | ~200KB |
| `accessibility-keyboard-nav` | Navegação por teclado | ~500KB+ |

### Como Ver Vídeos

**No Windows:**
```bash
# Abrir vídeo no player padrão
start "C:\...\test-results\navigation\video.webm"
```

**No Mac:**
```bash
open ~/..../test-results/navigation/video.webm
```

**No Linux:**
```bash
vlc ~/..../test-results/navigation/video.webm
```

**No Navegador:**
1. Arraste `video.webm` para aba do browser
2. Clique duas vezes no arquivo
3. Ou use `npx playwright show-report`

---

## 🎬 Relatório HTML Interativo

### Acessar Relatório

```bash
# Comando
npx playwright show-report

# Abre em
http://localhost:9323
```

### O Que Contém

✅ **Resumo:** Testes passados/falhados  
✅ **Detalhes:** Por browser e arquivo  
✅ **Screenshots:** De cada teste falhado  
✅ **Vídeos:** De ações dos testes  
✅ **Traces:** Timeline completa  
✅ **Logs:** Console output  

### Navegação

```
┌─────────────────────────────────────┐
│ Playwright Test Report              │
├─────────────────────────────────────┤
│                                     │
│ [All] [Passed] [Failed]             │
│ [Search...] [Settings]              │
│                                     │
│ navigation-spec.ts                  │
│  ├─ ✓ Page loads                   │
│  ├─ ✓ Redirect root                │
│  ├─ ✗ Navigate to chat             │
│  └─ ✗ Back button fails            │
│                                     │
│ [Ver detalhes]                      │
│                                     │
└─────────────────────────────────────┘
```

---

## 📊 Cobertura Visual

### Screenshots Inclusos
- ✓ Home page
- ✓ Navegação
- ✓ Chat
- ✓ Tema
- ✓ Mobile

### Vídeos Gerados
- ✓ ~15+ vídeos de testes
- ✓ Tamanhos 50-700KB cada
- ✓ Qualidade HD (quando não falham)
- ✓ Formato WebM (moderno, comprimido)

### Relatório
- ✓ HTML interativo
- ✓ Todas as métricas
- ✓ Acesso local

---

## 🎯 Como Usar os Artefatos

### Para Aprender

**Passo 1:** Abra `GUIA_VISUAL.md`  
**Passo 2:** Veja screenshots correspondentes  
**Passo 3:** Se quiser movimento, veja vídeo  
**Passo 4:** Leia descrição no guia  

### Para Reportar Bug

**Passo 1:** Reproduza problema  
**Passo 2:** Tire screenshot  
**Passo 3:** Compare com `screenshots/`  
**Passo 4:** Se diferente, reporte com evidence  

### Para Validar Testes

**Passo 1:** Rode `npm run test:e2e`  
**Passo 2:** Abra `npx playwright show-report`  
**Passo 3:** Verifique vídeos de falhas  
**Passo 4:** Corrija baseado no vídeo  

### Para Documentação

**Passo 1:** Use screenshots do `docs/screenshots/`  
**Passo 2:** Para apresentações
**Passo 3:** Para treinamento
**Passo 4:** Para manuais

---

## 📈 Estatísticas

### Screenshots
- **Quantidade:** 5 principais
- **Tamanho Total:** ~910KB
- **Formato:** PNG (não comprimido)
- **Qualidade:** 100% (lossless)

### Vídeos
- **Quantidade:** 15+
- **Tamanho Total:** ~5-10MB
- **Formato:** WebM (VP9)
- **Qualidade:** HD quando possível

### Relatório
- **Tamanho:** ~2-3MB
- **Formato:** HTML5 + JSON
- **Interativo:** Sim
- **Offline:** Não (precisa servidor local)

---

## 🔍 Dicas de Visualização

### Screenshots Grandes
- Clique para ampliar
- Ctrl+Scroll para zoom
- Salve em alta resolução

### Vídeos Lento?
- Verifique conexão
- Reduza qualidade do vídeo
- Use player VLC (mais eficiente)

### Relatório Não Carrega?
```bash
# Se porta 9323 está em uso
npx playwright show-report --port 9324

# Ou limpe cache
rm -rf playwright-report/.playwright
```

---

## 💾 Backup de Artefatos

### Salvar Screenshots Importantes

```bash
# Copiar para backup
cp -r docs/screenshots/ backup/screenshots/

# Ou compactar
zip -r screenshots-backup.zip docs/screenshots/
```

### Salvar Vídeos de Falhas

```bash
# Copiar test-results
cp -r test-results/ backup/test-results-{date}/

# Ou apenas vídeos
find test-results -name "*.webm" -exec cp {} backup/videos/ \;
```

### Exportar Relatório

```bash
# O relatório é auto-gerado, mas se quiser salvar:
cp -r playwright-report/ backup/report-{date}/
```

---

## 🎓 Exemplos de Uso

### Caso 1: Aprender a Usar Chat

1. Abra `docs/GUIA_VISUAL.md`
2. Procure seção "Chat"
3. Veja screenshot `chat-interface.png`
4. Leia instruções em `GUIA_DO_USUARIO.md`
5. Experimente no dashboard

### Caso 2: Reportar Erro Responsividade

1. Tire screenshot do problema
2. Compare com `mobile-responsive.png`
3. Note diferenças
4. Copie vídeo relevante de `test-results/responsive-*/`
5. Envie ambos para suporte

### Caso 3: Validar Novo Teste

1. Rode novo teste: `npx playwright test meu-teste.spec.ts`
2. Abra relatório: `npx playwright show-report`
3. Veja vídeo do teste
4. Se passou ✓ está tudo bem
5. Se falhou ✗ veja screenshot/vídeo para debug

---

## ✨ Conclusão

Você tem acesso a:
- ✓ Screenshots reais da aplicação
- ✓ Vídeos de testes funcionando
- ✓ Relatório interativo completo
- ✓ Documentação com imagens

**Use para aprender, reportar bugs, e validar!**

---

**Última atualização:** 2026-07-07  
**Artefatos:** Do Playwright E2E Tests  
**Total:** 5 screenshots + 15+ vídeos + 1 relatório HTML
