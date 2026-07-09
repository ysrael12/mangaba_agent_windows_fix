# 📚 Guia do Usuário - Mangaba Agent Dashboard

**Bem-vindo ao Mangaba Agent!**

Aprenda a usar todas as funcionalidades do dashboard passo a passo.

---

## 📑 Índice

1. [Primeiros Passos](#primeiros-passos)
2. [Navegação](#navegação)
3. [Home - Dashboard Principal](#home---dashboard-principal)
4. [Chat - Conversar com Agentes](#chat---conversar-com-agentes)
5. [Sessões - Histórico de Conversas](#sessões---histórico-de-conversas)
6. [Criar Agente](#criar-agente)
7. [Agentes Ativos - Fleet](#agentes-ativos---fleet)
8. [Configurações](#configurações)
9. [Logs](#logs)
10. [Suporte & Ajuda](#suporte--ajuda)

---

## 🚀 Primeiros Passos

### Como Acessar

1. Abra seu navegador
2. Vá para: `http://localhost:5173` (desenvolvimento) ou URL de produção
3. Você verá a tela de **Home**

### Layout da Tela

```
┌─────────────────────────────────────────────────────┐
│ ☰ Menu  |  🎨 Tema  |  ⌘K Buscar  |  ⚙️ Configurar │
├────────┬───────────────────────────────────────────┤
│        │                                           │
│ MENU   │     CONTEÚDO PRINCIPAL                   │
│        │     (muda conforme página)                │
│        │                                           │
│ • Home │                                           │
│ • Chat │                                           │
│ • Logs │                                           │
│ • Etc  │                                           │
│        │                                           │
└────────┴───────────────────────────────────────────┘
```

### Mudar Tema (Claro/Escuro)

No topo da tela, clique no botão de **Tema**:
- 🌙 **Modo Noite** - Fundo escuro
- ☀️ **Modo Dia** - Fundo claro

O tema é salvo automaticamente em sua sessão.

---

## 🧭 Navegação

### Menu Lateral

Clique nos itens para navegar:

| Ícone | Seção | Opções |
|-------|-------|--------|
| 🏠 | **Começar** | Início, Ajuda |
| 💬 | **Conversar** | Minhas Sessões, Chat |
| ⚡ | **Agentes** | Criar Agente, Agentes Ativos, Conectar Serviços |
| ⚙️ | **Configurar** | Configurações, O que Sabe Fazer, Avançado |
| 🔄 | **Automatizar** | Agendamentos, Tarefas |
| 📋 | **Acompanhar** | Logs, Ajuda |

### Command Palette (Busca Rápida)

Pressione **⌘K** (Mac) ou **Ctrl+K** (Windows/Linux):

```
┌──────────────────────────────────────┐
│ 🔍 Search tests...                   │
├──────────────────────────────────────┤
│ > Início                             │
│ > Chat                               │
│ > Logs                               │
│ > Configurações                      │
│ > Mudar para tema escuro             │
└──────────────────────────────────────┘
```

**Dica:** Digite para filtrar: `chat`, `logs`, `config`, etc.

### Mobile (Smartphone)

Em telas pequenas (celular):
1. Clique no **☰** (hambúrguer) no topo
2. Menu desliza da esquerda
3. Clique em qualquer item para navegar

---

## 🏠 Home - Dashboard Principal

A primeira tela que você vê após fazer login.

### O que Você Vê

```
┌────────────────────────────────────────┐
│  Bem-vindo ao Mangaba Agent! 👋       │
├────────────────────────────────────────┤
│                                        │
│  📊 Resumo de Atividade                │
│  ├─ Agentes Ativos: 3                  │
│  ├─ Sessões Hoje: 12                   │
│  └─ Últimas Mensagens: 5               │
│                                        │
│  🔥 Ações Rápidas                      │
│  ├─ [+ Novo Agente]                    │
│  ├─ [▶ Iniciar Chat]                   │
│  └─ [⚙️ Configurar]                    │
│                                        │
│  📈 Gráficos Recentes                  │
│  └─ (Se houver dados)                  │
│                                        │
└────────────────────────────────────────┘
```

### Ações na Home

**Iniciar Chat:**
1. Clique em "Conversar" ou "Chat"
2. Comece a digitar uma mensagem
3. Pressione Enter ou clique em "Enviar"

**Criar Novo Agente:**
1. Clique em "Criar agente" (seção Agentes)
2. Preencha o formulário
3. Clique em "Criar"

---

## 💬 Chat - Conversar com Agentes

Aqui você fala com os agentes configurados.

### Tela de Chat

```
┌─────────────────────────────────────────┐
│  Chat com Agentes 🤖                   │
├─────────────────────────────────────────┤
│                                         │
│  [Conectando ao servidor...]            │
│                                         │
│  Agente: "Olá! Como posso ajudar?"     │
│                                         │
│  Você: [                             ]  │
│        [Enviar ⏎]                      │
│                                         │
└─────────────────────────────────────────┘
```

### Como Usar o Chat

1. **Aguarde Conexão:** "Conectando ao servidor..." desaparece quando pronto
2. **Digite Mensagem:** Clique na caixa de texto e digite
3. **Envie:** Pressione **Enter** ou clique **Enviar**
4. **Aguarde Resposta:** O agente responde em poucos segundos

### Dicas do Chat

- 📝 Digite normalmente, como conversa
- ⏳ Respostas podem levar alguns segundos
- 🔄 Atualização automática quando nova mensagem chega
- 💾 Histórico salvo em "Minhas Sessões"

---

## 📅 Sessões - Histórico de Conversas

Veja todas as suas conversas anteriores.

### Tela de Sessões

```
┌────────────────────────────────────────────┐
│  Minhas Sessões 📋                        │
├────────────────────────────────────────────┤
│                                            │
│  Hoje                                      │
│  ├─ 14:30 - "Como implementar...?" [▶]   │
│  ├─ 11:45 - "Qual é a melhor forma?" [▶]│
│  └─ 09:15 - "Pode ajudar com...?" [▶]    │
│                                            │
│  Ontem                                     │
│  ├─ 17:20 - "Dúvida sobre deploy" [▶]    │
│  └─ 14:10 - "Como começar?" [▶]          │
│                                            │
│  [Carregar Mais...]                        │
│                                            │
└────────────────────────────────────────────┘
```

### Como Usar Sessões

1. **Ver Histórico:** Clique em "Minhas Sessões"
2. **Abrir Conversa:** Clique em qualquer item
3. **Continuar Chat:** Digite novo mensagem
4. **Voltar:** Clique voltar ou em menu

---

## ➕ Criar Agente

Configure um novo agente customizado.

### Passo 1: Acesse Criação

1. Clique em **"Criar agente"** (menu lateral)
2. Você verá formulário

### Passo 2: Preencha Informações

```
Nome do Agente:
├─ [Seu nome aqui]
│
Descrição:
├─ [O que este agente faz?]
│
Modelo de IA:
├─ [Dropdown com opções]
│  ├─ GPT-4
│  ├─ Claude
│  └─ Outros...
│
Configurações Avançadas:
├─ [ ] Tem acesso a API
├─ [ ] Pode enviar emails
└─ [ ] Pode agendar tarefas
```

### Passo 3: Criar

1. Clique em **[Criar Agente]**
2. Aguarde confirmação
3. Você será redirecionado para o dashboard do agente

---

## 🤖 Agentes Ativos - Fleet

Veja todos os agentes que estão rodando.

### Tela de Fleet

```
┌──────────────────────────────────────────────┐
│  Agentes Ativos (Fleet) 🚀                   │
├──────────────────────────────────────────────┤
│                                              │
│  [Status em Tempo Real]                      │
│                                              │
│  Agente: "Assistente Principal" 🟢 ATIVO    │
│  ├─ Uptime: 24h 30m                         │
│  ├─ Requisições: 234                        │
│  └─ Próxima Ação: 14:32                     │
│                                              │
│  Agente: "Email Bot" 🟡 OCIOSO             │
│  ├─ Uptime: 2h 15m                          │
│  ├─ Requisições: 12                         │
│  └─ Próxima Ação: 15:00                     │
│                                              │
│  Agente: "Backup Agent" 🔴 ERRO             │
│  ├─ Erro: Conexão BD falhou                 │
│  └─ [Reiniciar] [Detalhes]                  │
│                                              │
└──────────────────────────────────────────────┘
```

### Entender Status

| Cor | Status | Significado |
|-----|--------|-------------|
| 🟢 | Ativo | Funcionando normalmente |
| 🟡 | Ocioso | Esperando próxima ação |
| 🔴 | Erro | Problema, verifique logs |
| ⚫ | Offline | Agente desligado |

### Ações Disponíveis

- **Clicar no agente:** Ver detalhes
- **[Reiniciar]:** Reinicia se houver erro
- **[Pausar]:** Para o agente temporariamente
- **[Editar]:** Modifica configurações

---

## ⚙️ Configurações

Personalize como o dashboard funciona para você.

### Tela de Configurações

```
┌────────────────────────────────────────┐
│  Configurações ⚙️                      │
├────────────────────────────────────────┤
│                                        │
│  📌 Gerais                             │
│  ├─ Seu Nome: [________________]      │
│  ├─ Email: [________________]          │
│  └─ Idioma: [Português ▼]             │
│                                        │
│  🔐 Segurança                          │
│  ├─ Senha: [Alterar]                   │
│  ├─ 2FA: [Ativar]                      │
│  └─ Sessões Ativas: [3 ▼]             │
│                                        │
│  🎨 Aparência                          │
│  ├─ Tema: [Automático ▼]              │
│  ├─ Tamanho Fonte: [Médio ▼]          │
│  └─ Notificações: [On/Off]            │
│                                        │
│  🔌 Integrações                        │
│  ├─ [Conectar Slack]                  │
│  ├─ [Conectar Discord]                │
│  └─ [Conectar GitHub]                 │
│                                        │
│  [Salvar] [Cancelar]                   │
│                                        │
└────────────────────────────────────────┘
```

### Opções Principais

**Perfil:**
- Atualize nome, foto, email
- Clique [Salvar] para confirmar

**Tema:**
- Escolha Claro, Escuro ou Automático
- Muda instantaneamente

**Notificações:**
- Ative/desative alertas
- Escolha canais (Email, Push, etc)

**Integrações:**
- Conecte com Slack, Discord, GitHub
- Autorize acesso se solicitado

---

## 📊 Logs

Acompanhe o que está acontecendo.

### Tela de Logs

```
┌──────────────────────────────────────────┐
│  Logs 📋                                 │
├──────────────────────────────────────────┤
│  Filtros: [Tipo ▼] [Data ▼] [Status ▼] │
├──────────────────────────────────────────┤
│                                          │
│  14:32:15 ℹ️  INFO    Chat iniciado    │
│  14:31:48 ✓ SUCCESS  Agente ativo     │
│  14:30:22 ⚠️  WARNING Latência alta   │
│  14:29:01 ❌ ERROR   API timeout      │
│  14:28:45 ℹ️  DEBUG   Config carregado │
│                                          │
│  [Carregar Mais...]                      │
│                                          │
└──────────────────────────────────────────┘
```

### Entender os Ícones

| Ícone | Tipo | Cor | Significado |
|-------|------|-----|-------------|
| ℹ️ | INFO | Azul | Informação geral |
| ✓ | SUCCESS | Verde | Operação bem-sucedida |
| ⚠️ | WARNING | Amarelo | Aviso, atenção necessária |
| ❌ | ERROR | Vermelho | Erro crítico |
| 🐛 | DEBUG | Cinza | Informação de debug |

### Como Filtrar

1. Clique em **[Tipo ▼]** - escolha: INFO, ERROR, WARNING
2. Clique em **[Data ▼]** - escolha: Hoje, Última semana, etc
3. Clique em **[Status ▼]** - escolha: Sucesso, Erro, etc
4. Logs atualizam automaticamente

### Exportar Logs

Se houver botão [Exportar]:
1. Clique [Exportar]
2. Escolha formato: CSV, JSON, PDF
3. Download é salvo automaticamente

---

## 🆘 Suporte & Ajuda

### Se Algo Não Funciona

**1. Verifique Conexão:**
- Abra DevTools (F12)
- Vá para aba "Network"
- Recarregue a página
- Procure por erros vermelhos

**2. Limpe Cache:**
- Pressione Ctrl+Shift+Delete
- Escolha "Cookies e dados" 
- Clique [Limpar dados]
- Recarregue página

**3. Tente Outro Navegador:**
- Chrome, Firefox, Safari
- Se funcionar, problema é no navegador original

**4. Reinicie Serviço:**
```bash
# Se você tem acesso ao terminal
systemctl restart mangaba-agent
# ou
docker restart mangaba-agent
```

### Mensagens de Erro Comuns

| Mensagem | Causa | Solução |
|----------|-------|---------|
| "Conectando ao servidor..." | Servidor offline | Aguarde ou reinicie |
| "Acesso Negado" | Sem permissão | Contate admin |
| "Timeout" | Requisição lenta | Tente novamente |
| "Página não encontrada" | URL incorreta | Use menu lateral |

### Contato de Suporte

- 📧 Email: `support@mangaba.ai`
- 💬 Discord: `discord.gg/mangaba`
- 🐛 Report Bug: `github.com/mangaba/agent/issues`
- 📞 Chat: Disponível em "Ajuda" no menu

---

## 📱 Usando em Celular

O dashboard é totalmente responsivo!

### Diferenças em Mobile

1. **Menu Hambúrguer:**
   - Clique ☰ para abrir menu lateral
   - Clique novamente para fechar

2. **Telas Menores:**
   - Deslize para ver conteúdo
   - Botões aumentam tamanho

3. **Toque:**
   - Toque = clique
   - Deslize = scroll
   - Long-press = menu contexto

4. **Orientação:**
   - Funciona em retrato (vertical)
   - Funciona em paisagem (horizontal)
   - Adapta automaticamente

---

## ⌨️ Atalhos de Teclado

| Atalho | Função |
|--------|--------|
| **⌘K** ou **Ctrl+K** | Abrir busca rápida |
| **Esc** | Fechar dialogo/menu |
| **Enter** | Enviar mensagem (em chat) |
| **Tab** | Navegar entre elementos |
| **Shift+Tab** | Navegar para trás |
| **F1** | Abrir ajuda |
| **Ctrl+Shift+Delete** | Limpar cache (Chrome) |

---

## 💾 Dados & Privacidade

### O Que Fica Salvo

✅ **Salvo Localmente:**
- Tema (claro/escuro)
- Preferências de idioma
- Tamanho da fonte

✅ **Salvo no Servidor:**
- Histórico de chats
- Configurações de agentes
- Logs de atividade

❌ **Não é Salvo:**
- Sua senha (nunca!)
- Tokens de autenticação em texto plano

### Como Fazer Logout

1. Clique em ⚙️ **Configurações**
2. Procure por "Desconectar" ou "Logout"
3. Clique [Sair]
4. Você volta para tela de login

### Deletar Dados

⚠️ **Cuidado:** Isso é permanente!

1. Vá para **Configurações**
2. Role para baixo até "Zona de Risco"
3. Clique [Deletar Minha Conta]
4. Confirme digitando sua senha
5. **TUDO será deletado**

---

## 🎓 Dicas & Truques

### Ser Mais Produtivo

1. **Use Command Palette:** ⌘K é mais rápido que clicar
2. **Customize Tema:** Modo escuro à noite economiza bateria
3. **Organize Agentes:** Nomeie claramente ("EmailBot-Diário", etc)
4. **Revise Logs:** Semanalmente, identifique problemas
5. **Backup Conversas:** Exporte sessões importantes

### Troubleshoot Rápido

Se agente não responde:
1. Verifique "Agentes Ativos" → está 🟢?
2. Verifique "Logs" → há erros?
3. Tente "Reiniciar" agente
4. Aguarde 30 segundos
5. Tente novamente

---

## ✨ Novidades & Atualizações

O dashboard recebe atualizações regularmente!

### Como Ficar Atualizado

- 📧 Verificaremos email se há nova versão
- 🔔 Notificação no dashboard quando disponível
- 📝 Leia "O que é Novo" na Ajuda
- 🐦 Siga redes sociais para anúncios

### Requisitos Mínimos

- **Navegador:** Chrome 90+, Firefox 88+, Safari 14+
- **Conexão:** Internet estável (3Mbps+)
- **Device:** Desktop, tablet, ou smartphone moderno
- **JavaScript:** Deve estar ativado

---

## 🎉 Conclusão

Parabéns! Agora você sabe como usar o Mangaba Agent Dashboard!

### Próximos Passos

1. ✅ Explore cada seção
2. ✅ Configure seus agentes
3. ✅ Inicie uma conversa no Chat
4. ✅ Revise os Logs
5. ✅ Customize Configurações

### Precisa de Ajuda?

- 📚 Releia este guia
- 🆘 Use "Ajuda" no menu
- 📧 Envie email para suporte
- 🐛 Reporte bugs no GitHub

---

**Bem-vindo ao Mangaba Agent! 🚀**

Aproveite!
