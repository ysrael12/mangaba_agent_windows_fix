<div align="center">
  <img src="assets/mangaba-logo.svg" alt="Mangaba AI" width="140"/>

  [![Mangaba AI](https://img.shields.io/badge/Mangaba-AI-F97518?style=for-the-badge)](https://mangaba-agent.online)
  [![Site](https://img.shields.io/badge/mangaba--agent.online-1E0D01?style=for-the-badge)](https://mangaba-agent.online)
</div>

<p align="center">
  <img src="assets/banner.png" alt="Mangaba Agent" width="100%">
</p>

<p align="center">
  <a href="https://mangaba-agent.online"><img src="https://img.shields.io/badge/Docs-mangaba--agent.online-8B5CF6?style=for-the-badge" alt="Documentação"></a>
  <a href="https://github.com/dheiver2/mangaba-agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/Licença-MIT-green?style=for-the-badge" alt="Licença MIT"></a>
  <a href="https://github.com/dheiver2/mangaba-agent/issues"><img src="https://img.shields.io/badge/Issues-GitHub-E07830?style=for-the-badge&logo=github" alt="Issues"></a>
  <a href="https://openrouter.ai"><img src="https://img.shields.io/badge/200%2B_Modelos-OpenRouter-F59E0B?style=for-the-badge" alt="200+ Modelos"></a>
</p>

**A infraestrutura de IA para tornar empresas agênticas.** O Mangaba é a camada que transforma processos da sua empresa em **agentes que executam** — atendem, vendem, operam e decidem — em **qualquer canal**, com **qualquer modelo** (local ou nuvem), conectados às suas ferramentas. Self-host, privado e **seguro por padrão**.

Três coisas que o tornam diferente:
- **🇧🇷 Vertical brasileiro pronto** — uma empresa vira agêntica de verdade no WhatsApp: PIX (código real, não promessa), catálogo, nota fiscal, atendimento e LGPD.
- **🆓 Funciona grátis, com modelo local fraco** — recursos determinísticos (instintos, skills de papel, security scan) fazem um modelo local pequeno ser confiável, sem depender de API cara.
- **🛡️ Seguro por padrão** — varredura anti-vazamento de segredos e conformidade LGPD embutidas.

E sem abrir mão de potência: multicanal (Telegram, Discord, Slack, WhatsApp, Signal, CLI), multi-modelo ([OpenRouter](https://openrouter.ai) 200+ modelos, [NVIDIA NIM](https://build.nvidia.com), [Hugging Face](https://huggingface.co), OpenAI, Ollama ou endpoint próprio — troque com `mangaba model`, sem lock-in), aprendizado contínuo, sub-agentes e automações agendadas. Rode num VPS de $5, numa GPU local, ou serverless que hiberna quando ocioso.

<table>
<tr><td><b>🇧🇷 WhatsApp-Business brasileiro</b></td><td>Cobrança PIX válida (copia-e-cola + QR, código real), catálogo de produtos, triagem de nota fiscal, atendimento ponta a ponta e guarda LGPD — prontos, locais e grátis.</td></tr>
<tr><td><b>🆓 Confiável em modelo local fraco</b></td><td>Instintos (regras "quando X → faça Y" auto-injetadas), skills de papel com checklist fixo e quick-commands determinísticos — o agente acerta sem depender de modelo caro.</td></tr>
<tr><td><b>🛡️ Segurança e LGPD por padrão</b></td><td>Varredura anti-vazamento de segredos (segredos em git, .env, MCP/hooks) com hook de pre-commit, e conformidade LGPD no atendimento.</td></tr>
<tr><td><b>Interface de terminal completa</b></td><td>TUI com edição multilinhas, autocomplete de slash-commands, histórico de conversas, interrupção e redirecionamento, e saída de ferramentas em streaming.</td></tr>
<tr><td><b>Vive onde você está</b></td><td>Telegram, Discord, Slack, WhatsApp, Signal e CLI — tudo de um único processo gateway. Transcrição de mensagens de voz, continuidade de conversa entre plataformas.</td></tr>
<tr><td><b>Loop de aprendizado fechado</b></td><td>Memória curada pelo agente com nudges periódicos. Criação autônoma de habilidades após tarefas complexas. Habilidades se auto-melhoram durante o uso. Busca FTS5 de sessões com sumarização por LLM para recall entre sessões.</td></tr>
<tr><td><b>Automações agendadas</b></td><td>Agendador cron integrado com entrega em qualquer plataforma. Relatórios diários, backups noturnos, auditorias semanais — tudo em linguagem natural, rodando sem supervisão.</td></tr>
<tr><td><b>Delega e paraleliza</b></td><td>Spawn de sub-agentes isolados para fluxos paralelos. Escreva scripts Python que chamam ferramentas via RPC, colapsando pipelines multi-etapa em turnos de custo zero de contexto.</td></tr>
<tr><td><b>Roda em qualquer lugar</b></td><td>Sete backends de terminal — local, Docker, SSH, Singularity, Modal, Daytona e Vercel Sandbox. Modal e Daytona oferecem persistência serverless — o ambiente hiberna quando ocioso e acorda sob demanda.</td></tr>
<tr><td><b>Pronto para pesquisa</b></td><td>Geração de trajetórias em lote, compressão de trajetórias para treinamento da próxima geração de modelos com chamadas de ferramentas.</td></tr>
</table>

---

## Telegram em 3 passos (só o token)

O caminho mais simples: clonar, rodar **um** script e colar o token. O resto — pré-requisitos, modelo local (Ollama) e seu user ID — é automático.

```bash
git clone https://github.com/dheiver2/mangaba-agent.git
cd mangaba-agent
./telegram.sh
```

1. O script instala **tudo** (pré-requisitos, Python, Ollama + modelo).
2. Pede **só o token** do [@BotFather](https://t.me/BotFather) (`/newbot`).
3. Você manda uma mensagem ao bot, ele **detecta seu ID sozinho** e sobe — pronto, é só conversar no Telegram.

---

## Instalação em 1 Comando (do zero ao bot no ar)

Para quem quer **clonar e ter tudo funcionando** — pré-requisitos, modelo local (Ollama) e canais de mensagem — sem configurar nada na mão:

```bash
git clone https://github.com/dheiver2/mangaba-agent.git
cd mangaba-agent
./bootstrap.sh
```

O [`bootstrap.sh`](bootstrap.sh) faz, em sequência:

1. **Pré-requisitos do sistema** — Homebrew (se faltar), Xcode Command Line Tools (macOS), build tools (Linux: `build-essential`, `python3-dev`, `libffi-dev`), git, Node.js, ripgrep, ffmpeg. As dependências extras (incluindo **Playwright/Chromium** para as ferramentas de navegador) são instaladas via `scripts/install.sh --ensure`. Pule o navegador com `SKIP_BROWSER=true ./bootstrap.sh`.
2. **Ambiente Python** — instala `uv`, cria o `.venv` e instala o pacote.
3. **Ollama + modelo local** — instala o Ollama, sobe o servidor e baixa o modelo (`gemma4:e4b` por padrão — 64K de contexto nativo).
4. **Config do modelo** — aponta `~/.mangaba/config.yaml` para o Ollama local.
5. **Canais + gateway** — abre o [`setup-channels.sh`](setup-channels.sh) interativo: você **escolhe quais canais ativar** (os 13 suportados — Telegram, WhatsApp, Discord, Slack, Email, Signal, Matrix, Mattermost, SMS/Twilio, DingTalk, Feishu/Lark, WeCom, WeChat), informa os tokens, e sobe o gateway em primeiro plano ou como **serviço 24/7** (launchd/systemd: inicia no login e reinicia sozinho).

> Trocar o modelo baixado: `MANGABA_MODEL=qwen3:4b ./bootstrap.sh`
> O script é **idempotente** — rode quantas vezes quiser para adicionar canais ou reconfigurar.

> **Telegram sem descobrir o ID manualmente:** ao escolher o Telegram, o `setup-channels.sh` pede só o token, manda você enviar uma mensagem ao bot e **detecta seu user ID automaticamente** via API do Telegram (`getUpdates`). Requisitos: o gateway **não** pode estar rodando ainda (ele consumiria os updates) e a mensagem deve ser recente. Se a detecção falhar, ele pede o ID manualmente como fallback.

### Só configurar canais (já instalado)

Se o Mangaba já está instalado e você só quer ativar/trocar canais:

```bash
./setup-channels.sh
```

---

## Instalação Rápida (somente o CLI)

### Linux, macOS, WSL2, Termux

```bash
curl -fsSL https://raw.githubusercontent.com/dheiver2/mangaba-agent/main/scripts/install.sh | bash
```

### Windows (nativo, PowerShell) — Beta Inicial

> **Atenção:** O suporte nativo ao Windows está em **beta inicial**. Instala e executa, mas não foi testado tão amplamente quanto os caminhos Linux/macOS/WSL2. Por favor [reporte problemas](https://github.com/dheiver2/mangaba-agent/issues) quando encontrar dificuldades. Para o setup Windows mais testado hoje, rode o one-liner Linux/macOS acima dentro do **WSL2**.

Execute no PowerShell:

```powershell
iex (irm https://raw.githubusercontent.com/dheiver2/mangaba-agent/main/scripts/install.ps1)
```

O instalador cuida de tudo: uv, Python 3.11, Node.js, ripgrep, ffmpeg e **um Git Bash portátil** (MinGit, descompactado em `%LOCALAPPDATA%\mangaba\git` — sem necessidade de admin, completamente isolado de qualquer instalação Git do sistema).

> **Android / Termux:** O caminho manual testado está documentado no [guia Termux](https://github.com/dheiver2/mangaba-agent/blob/main/website/docs/getting-started/termux.md).

Após a instalação:

```bash
source ~/.bashrc    # recarregar shell (ou: source ~/.zshrc)
mangaba             # começar a conversar!
```

---

## Primeiros Passos

```bash
mangaba              # CLI interativo — iniciar uma conversa
mangaba model        # Escolher provedor e modelo de LLM
mangaba tools        # Configurar quais ferramentas estão habilitadas
mangaba config set   # Definir valores individuais de configuração
mangaba gateway      # Iniciar o gateway de mensagens (Telegram, Discord, etc.)
mangaba setup        # Executar o assistente de configuração completo
mangaba update       # Atualizar para a versão mais recente
mangaba doctor       # Diagnosticar problemas
```

📖 **[Documentação completa →](https://mangaba-agent.online)**

---

## Configuração pelos Canais (Telegram, Discord…)

Você configura o agente **sem voltar ao terminal** — direto pelo chat. Ative uma vez no `~/.mangaba/config.yaml`:

```yaml
gateway:
  expose_admin_commands: true
```

### Fale naturalmente — o agente monta o workflow

Você **não precisa decorar comandos**. Descreva o objetivo e o agente **escolhe as ferramentas e skills** e executa os passos sozinho (planeja → executa → entrega no chat):

```
pesquise as 3 maiores novidades de IA desta semana, resuma cada uma em 2 linhas e salve em novidades.md
me lembre todo dia às 9h de revisar a agenda
resuma este PDF   (com o arquivo anexado)
```

A busca web já funciona **grátis** (DuckDuckGo, sem chave). Os comandos `/` abaixo são atalhos opcionais para configuração rápida.

### Resolver pedidos complexos pelo canal

Pedido de vários passos? O Mangaba **decompõe sozinho** (determinístico, sem depender do modelo)
e injeta o plano pronto no contexto do agente — então até um modelo local fraco só executa o checklist.

```
"pesquise o cliente, gere um relatório PDF, me mande aqui e depois agende um follow-up em 2h"
```
→ vira um plano de 4 etapas, cada uma com a skill sugerida, e o agente executa entregando o
resultado de cada uma no chat. Veja o plano antes com `/tarefa <pedido>` (ou `mangaba tarefa`).

**Adapta-se ao modelo (gemma é o default, mas vale qualquer modelo do gateway):** com
`orchestration.auto_plan: auto` (padrão), o plano pronto só é injetado quando o modelo é
**fraco** (ex.: gemma local) — um modelo forte vindo do gateway (Claude, GPT, Gemini…)
planeja melhor sozinho e não é engessado. Force com `true`/`false` se quiser.

### Comandos de configuração no canal

Depois, no próprio canal:

| Comando | Função |
|---|---|
| `/config` | Ver configuração atual (modelo, provider, contexto, plataformas) |
| `/set model.context_length 65536` | Definir qualquer valor de config (tokens vão pro `.env`) |
| `/soul show` · `/soul set <texto>` | Ver/editar a identidade do agente (SOUL.md) |
| `/rules show` · `/rules set <texto>` | Ver/editar regras de trabalho (MANGABA.md) |
| `/model qwen3:4b` | Trocar o modelo |
| `/modelo` (ou `/tier`) | Ver o modelo ativo, seu tier (capaz/fraco) e o que ele ativa |
| `/tools list` · `/tools enable web` · `/tools disable browser` | Gerenciar ferramentas |
| `/skills list` · `/skills <categoria>` | Listar habilidades |
| `/cron add 0 9 * * * :: me mande o resumo do dia` | Agendar tarefa (entrega no chat) |
| `/cron list` · `/cron remove <id>` · `/cron pause <id>` | Gerenciar agendamentos |
| `/personality` · `/goal` · `/reasoning` | Ajustar comportamento |
| `/exemplos [baixa\|media\|alta]` | Catálogo de tarefas por complexidade |
| `/mcp list` · `/mcp add <nome> <url>` · `/mcp remove <nome>` | Conectar servidores MCP |
| `/mcp composio <api_key> gmail` | Conectar Google (hosted, sem Google Cloud) |
| `/fleet` (ou `/frota`) | Frota de agentes: status, logs, reiniciar e broadcast pelo canal |
| `/tarefa <pedido>` (ou `/plano`) | Decompõe um pedido complexo em plano por etapas e executa |
| `/followup add 2h :: <msg>` | Agenda follow-up proativo na conversa (heartbeat) |
| `/security` (ou `/scan`) | Varredura de segurança: segredos vazados, `.env`, MCP/hooks |
| `/new` · `/whoami` · `/help` | Sessão, acesso e ajuda |

### 🛡️ Scan de segurança (anti-vazamento de segredos)

Varre a sua instalação atrás de risco que você mesmo pode ter criado — chaves/tokens
em arquivos **rastreados pelo git**, `.env` com permissão aberta, servidores MCP em
`http://` e shell perigoso em hooks. Pelo canal use `/security`; no terminal:

```bash
mangaba security-scan              # relatório priorizado (CRITICAL→LOW)
mangaba security-scan --install-hook   # bloqueia commits que vazariam segredos
```

O hook roda `mangaba security-scan --staged --quiet` no pre-commit e **aborta o commit**
se encontrar segredo. Inspirado no AgentShield do [ECC](https://github.com/affaan-m/ECC).

📖 **Tutoriais:** [Criar agentes pelos canais](https://github.com/dheiver2/mangaba-agent/blob/main/website/docs/guides/criar-agente-pelos-canais.md) · [Tarefas por complexidade](https://github.com/dheiver2/mangaba-agent/blob/main/website/docs/guides/catalogo-de-tarefas.md) · [Tarefas em qualquer modelo](https://github.com/dheiver2/mangaba-agent/blob/main/website/docs/guides/tarefas-independentes-de-modelo.md)

---

## Modelo local: escolha pela sua RAM

O agente exige **≥64K de contexto nativo** para usar ferramentas. Isso **elimina o qwen2.5** (7B/14B, só 32K). Recomendado por RAM:

| RAM | Modelo | Contexto | Nota |
|---|---|---|---|
| 8 GB | `qwen3:4b` | nativo grande | leve |
| 16 GB | **`gemma4:e4b`** (gemma 3n) | 256K | ~3.4 GB a 64K, 100% GPU — validado |
| 32 GB+ | `llama3.1:8b` / `qwen3:8b` | 128K | mais capaz |

O `bootstrap.sh` já usa `gemma4:e4b` por padrão. 📖 [Guia de modelo local](https://github.com/dheiver2/mangaba-agent/blob/main/website/docs/guides/local-llm-on-mac.md).

---

## Ecossistema Google e Email

| Caminho | O que cobre | Setup |
|---|---|---|
| **Composio (hosted)** | Gmail, Calendar, Drive, Sheets | 1 clique no site + `/mcp composio <key>` — sem Google Cloud |
| **Workspace MCP self-host** | Tudo (72 ferramentas) | seu app OAuth (Google Cloud 1x) — privado |
| **Email (IMAP/SMTP)** | Só Gmail | Senha de App — sem Google Cloud, 100% local |

📖 [Google Workspace via MCP](https://github.com/dheiver2/mangaba-agent/blob/main/website/docs/guides/google-workspace-mcp.md). Peça em linguagem natural ("conecte meu google pelo composio") ou use o comando direto.

---

## Referência Rápida: CLI vs Mensageria

| Situação | CLI | Gateway |
|---|---|---|
| Uso geral no terminal | ✅ principal | alternativo |
| Telefone / fora do computador | via SSH | ✅ principal |
| Múltiplos usuários | ❌ | ✅ |
| Automações sem supervisão | cron/scripts | ✅ gateway + cron |

---

## Loop de Aprendizado

O Mangaba Agent observa o que funciona e melhora automaticamente:

```
Você faz uma tarefa complexa
        ↓
Mangaba executa com 40+ ferramentas
        ↓
Loop de aprendizado extrai a solução como habilidade
        ↓
Habilidade é salva, indexada e melhorada
        ↓
Próxima sessão começa mais inteligente
```

### 🧠 Instintos (aprendizado independente de modelo)

Skills exigem que o modelo **decida** invocá-las — um modelo local pequeno
raramente faz isso. **Instintos** resolvem: são regras curtas "quando X → faça Y"
capturadas de forma **determinística** (sem depender do modelo) e **injetadas
automaticamente** no prompt de toda sessão. Reforçam confiança a cada repetição.

```bash
# Ensine em linguagem natural, no próprio canal:
"lembre disso: quando o cliente pedir nota fiscal, peça o CNPJ antes"

# Ou por comando (canal ou CLI):
/instinct add ao gerar relatório :: sempre inclua o total no rodapé
/instinct list                       # ver todos, por confiança
mangaba instincts list               # idem no terminal
```

Instintos com ≥85% de confiança e ≥4 usos viram **candidatos a skill** (`/instinct promote`).

**Auto-extração (loop fechado):** no fim de uma conversa, o agente pode ler a sessão
e propor instintos sozinho — via `/instinct extract` (sob demanda) ou automaticamente
ativando `instincts.auto_extract: true` no `config.yaml`. Instintos auto-extraídos
entram como **provisórios** (não injetados) até serem confirmados ou recorrerem — assim
um modelo auxiliar fraco não polui o prompt.

Inspirado no "Continuous Learning v2" do [ECC](https://github.com/affaan-m/ECC).

### Memória Persistente

- **Busca FTS5** — encontra conversas passadas relevantes instantaneamente
- **Sumarização por LLM** — condensa sessões longas para recall eficiente
- **Modelagem de usuário** — aprende suas preferências, estilo e contexto ao longo do tempo
- **Nudges periódicos** — o agente se auto-lembra de persistir conhecimento importante

---

## Plataformas de Comunicação

```
Terminal UI  ─┐
Telegram     ─┤
Discord      ─┤──► Mangaba Agent Core ──► 40+ Ferramentas
Slack        ─┤
WhatsApp     ─┤
Signal       ─┤
Email        ─┘
```

---

## Infraestrutura Flexível

| Backend | Descrição |
|---|---|
| **Local** | Roda direto na sua máquina |
| **Docker** | Container isolado e reproduzível |
| **SSH** | Conecta a qualquer servidor remoto |
| **Modal** | Serverless — hiberna quando ocioso |
| **Daytona** | Workspace cloud com persistência |
| **Vercel Sandbox** | Execução serverless leve |
| **Singularity** | Ambientes HPC / cluster |

---

## Provedores de Modelos

| Provedor | Modelos |
|---|---|
| OpenRouter | 200+ modelos (Claude, GPT, Gemini, Llama...) |
| OpenAI | GPT-4o, GPT-4.1, o3... |
| NVIDIA NIM | Nemotron e outros |
| Hugging Face | Modelos open-source |
| Endpoint próprio | Qualquer API compatível com OpenAI |

Troque de modelo a qualquer momento:

```bash
mangaba model set openrouter/anthropic/claude-sonnet-4-6
mangaba model set openai/gpt-4o
mangaba model set openrouter/meta-llama/llama-3.3-70b-instruct
```

---

## Ferramentas Integradas (40+)

- **Código**: execução Python, Bash, Node.js, compilação
- **Web**: navegação, scraping, busca, download
- **Arquivos**: leitura, escrita, edição, busca
- **APIs**: REST, GraphQL, webhooks
- **Banco de dados**: SQLite, PostgreSQL, Redis
- **Mídia**: processamento de imagem, áudio, vídeo
- **Comunicação**: email, Slack, Discord, Telegram

---

## Sub-agentes e Paralelismo

```python
# Spawne agentes isolados para tarefas paralelas
agente_pesquisa = mangaba.spawn("pesquise sobre X")
agente_codigo   = mangaba.spawn("escreva testes para Y")
agente_docs     = mangaba.spawn("atualize a documentação de Z")

# Resultados chegam em paralelo
resultados = await asyncio.gather(
    agente_pesquisa, agente_codigo, agente_docs
)
```

### Frota: gerenciar N agentes (multi-empresa)

Cada **profile** é um agente independente (identidade, modelo, skills e memória próprios),
rodando como **um gateway por profile** — ideal para multi-empresa/multi-bot, todos no mesmo
Ollama. A frota é gerenciada de um lugar só (e pelo canal):

```bash
mangaba profile create empresa1 --description "Padaria — atende e gera PIX"
mangaba fleet list                      # quem está no ar, modelo, pid
mangaba fleet logs empresa1 -n 50       # logs do gateway de um agente
mangaba fleet restart empresa1
mangaba fleet broadcast "manutenção às 22h"   # aviso ao canal-operador de todos
mangaba fleet stop --all                # (start/stop em massa no terminal)
```
No canal-operador: `/fleet` (status), `/fleet logs [nome]`, `/fleet restart <nome>` e
`/fleet broadcast <aviso>`. O **broadcast** atinge só o `home_channel` (canal-operador) de
cada agente — **nunca os chats de clientes** — e é entregue pelo heartbeat de cada gateway.
Start/stop de outros agentes ficam no terminal por segurança. Isolamento total por agente =
**dados de cada empresa separados** (exigência de LGPD).

### Papéis especializados (skills de escopo estreito)

Modelos pequenos erram menos quando a tarefa é **estreita e com checklist fixo**.
Por isso há skills de "papel" — sub-agentes especializados que seguem um
procedimento curto em vez de improvisar:

- **`revisor-de-resposta`** — revisa um rascunho antes de enviar ao cliente (tom, completude, vazamento de dados).
- **`triagem-e-roteamento`** — classifica o pedido por complexidade e escolhe o caminho (resposta direta, skill, script ou sub-agente).

Use por linguagem natural (_"revise antes de mandar"_, _"faça a triagem disso"_) ou liste com `/skills list`.

---

## 🇧🇷 WhatsApp-Business (vertical brasileiro)

O que **nenhum agente global faz**: ferramentas prontas para um negócio brasileiro
atender e vender pelo WhatsApp — local, grátis, sem API paga.

- **`pix-cobranca`** — gera **cobrança PIX válida** (copia-e-cola + QR Code) localmente.
  É código determinístico (BR Code EMV + CRC16), não um chute do modelo:
  ```bash
  python skills/whatsapp-business/pix/scripts/pix_payload.py \
      --key chave@email.com --name "Loja" --city "Sao Paulo" --amount 49.90 --qr pix.png
  ```
- **`atendimento-completo`** — fluxo de atendimento de ponta a ponta (saudação → entender → resolver → cobrar → fechar).
- **`catalogo-produtos`** — catálogo a partir de CSV/JSON; busca e preço **exatos** do arquivo (nunca inventa preço).
- **`nota-fiscal`** — triagem NF-e/NFS-e/NFC-e, valida CPF/CNPJ e prepara a emissão.
- **`lgpd-atendimento`** — guarda de privacidade: minimiza coleta, isola dados entre clientes, consentimento.
- **`followup-cliente`** — **heartbeat proativo**: o agente volta a falar sozinho (PIX não pago em 2h, cliente sumiu). Recuperação de venda automática.

Fale natural: _"gere um PIX de R$ 49,90"_, _"atenda esse cliente"_, _"o que temos no catálogo?"_.

**Follow-up proativo** (o agente inicia a conversa, não só responde):
```
/followup add 2h :: Oi! 😊 Vi que o PIX ainda não caiu. Posso te ajudar a finalizar?
```
Aceita `30min`, `2h`, `1h30min`, `1 dia`. O gateway entrega no horário; gerencie com `/followup list|cancel` ou `mangaba followups`.

---

## Automações Agendadas

```bash
# Resumo diário de emails às 9h
mangaba cron add "0 9 * * *" "resumo dos emails de hoje"

# Backup semanal às sextas
mangaba cron add "0 18 * * 5" "faça backup dos projetos importantes"

# Monitoramento contínuo a cada hora
mangaba cron add "0 * * * *" "verifique alertas do sistema"

# Listar automações ativas
mangaba cron list
```

---

## Configuração

```bash
# Assistente de configuração completo
mangaba setup

# Configurar modelo
mangaba model

# Ver configurações atuais
mangaba config show

# Definir valor individual
mangaba config set modelo openrouter/anthropic/claude-sonnet-4-6
```

### Arquivo de configuração (`~/.mangaba/config.yaml`)

```yaml
modelo: openrouter/anthropic/claude-sonnet-4-6
tema: escuro
lingua: pt-BR
gateway:
  telegram:
    token: SEU_TOKEN
```

---

## Estrutura do Projeto

```
mangaba-agent/
├── agent/              # Lógica central do agente
├── mangaba_cli/        # Interface de linha de comando
├── skills/             # Habilidades criadas e curadas
├── tools/              # 40+ ferramentas integradas
├── gateway/            # Integrações com plataformas
├── plugins/            # Framework de extensibilidade
├── providers/          # Adaptadores de LLM
├── cron/               # Agendador de tarefas
├── docs/               # GitHub Page
└── website/            # Site de documentação
```

---

## Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

```bash
# Fork e clone
git clone https://github.com/SEU_USUARIO/mangaba-agent.git
cd mangaba-agent

# Instalar em modo dev
pip install -e ".[dev]"

# Criar branch
git checkout -b feat/minha-feature

# Testar
pytest tests/

# Enviar PR
git push origin feat/minha-feature
```

---

## Diagnóstico

```bash
# Verificar instalação
mangaba doctor

# Ver logs
mangaba logs

# Atualizar
mangaba update
```

---

## Licença

MIT License — veja [LICENSE](LICENSE) para detalhes.

---

<p align="center">
  🥭 Feito no Brasil · MIT License
</p>
