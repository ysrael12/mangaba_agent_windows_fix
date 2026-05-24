<p align="center">
  <img src="assets/banner.png" alt="Mangaba Agent" width="100%">
</p>

<p align="center">
  <a href="https://dheiver2.github.io/mangaba-agent"><img src="https://img.shields.io/badge/Docs-dheiver2.github.io/mangaba--agent-8B5CF6?style=for-the-badge" alt="Documentação"></a>
  <a href="https://github.com/dheiver2/mangaba-agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/Licença-MIT-green?style=for-the-badge" alt="Licença MIT"></a>
  <a href="https://github.com/dheiver2/mangaba-agent/issues"><img src="https://img.shields.io/badge/Issues-GitHub-E07830?style=for-the-badge&logo=github" alt="Issues"></a>
  <a href="https://openrouter.ai"><img src="https://img.shields.io/badge/200%2B_Modelos-OpenRouter-F59E0B?style=for-the-badge" alt="200+ Modelos"></a>
</p>

**O agente de IA auto-aperfeiçoável feito para evoluir com você.** O único agente com um loop de aprendizado embutido — cria habilidades a partir das experiências, as melhora durante o uso, persiste conhecimento entre sessões e constrói um modelo profundo de quem você é ao longo do tempo. Rode em um VPS de $5, num cluster GPU, ou em infraestrutura serverless que custa quase nada quando ocioso. Não está preso ao seu laptop — fale com ele pelo Telegram enquanto ele trabalha numa VM na nuvem.

Use qualquer modelo que quiser — [OpenRouter](https://openrouter.ai) (200+ modelos), [NVIDIA NIM](https://build.nvidia.com) (Nemotron), [Hugging Face](https://huggingface.co), OpenAI, ou seu próprio endpoint. Troque com `mangaba model` — sem mudanças de código, sem lock-in.

<table>
<tr><td><b>Interface de terminal completa</b></td><td>TUI com edição multilinhas, autocomplete de slash-commands, histórico de conversas, interrupção e redirecionamento, e saída de ferramentas em streaming.</td></tr>
<tr><td><b>Vive onde você está</b></td><td>Telegram, Discord, Slack, WhatsApp, Signal e CLI — tudo de um único processo gateway. Transcrição de mensagens de voz, continuidade de conversa entre plataformas.</td></tr>
<tr><td><b>Loop de aprendizado fechado</b></td><td>Memória curada pelo agente com nudges periódicos. Criação autônoma de habilidades após tarefas complexas. Habilidades se auto-melhoram durante o uso. Busca FTS5 de sessões com sumarização por LLM para recall entre sessões.</td></tr>
<tr><td><b>Automações agendadas</b></td><td>Agendador cron integrado com entrega em qualquer plataforma. Relatórios diários, backups noturnos, auditorias semanais — tudo em linguagem natural, rodando sem supervisão.</td></tr>
<tr><td><b>Delega e paraleliza</b></td><td>Spawn de sub-agentes isolados para fluxos paralelos. Escreva scripts Python que chamam ferramentas via RPC, colapsando pipelines multi-etapa em turnos de custo zero de contexto.</td></tr>
<tr><td><b>Roda em qualquer lugar</b></td><td>Sete backends de terminal — local, Docker, SSH, Singularity, Modal, Daytona e Vercel Sandbox. Modal e Daytona oferecem persistência serverless — o ambiente hiberna quando ocioso e acorda sob demanda.</td></tr>
<tr><td><b>Pronto para pesquisa</b></td><td>Geração de trajetórias em lote, compressão de trajetórias para treinamento da próxima geração de modelos com chamadas de ferramentas.</td></tr>
</table>

---

## Instalação Rápida

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

> **Android / Termux:** O caminho manual testado está documentado no [guia Termux](https://dheiver2.github.io/mangaba-agent/docs/getting-started/termux).

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

📖 **[Documentação completa →](https://dheiver2.github.io/mangaba-agent)**

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
  🥭 Feito no Brasil · Baseado no <a href="https://github.com/nousresearch/hermes-agent">Hermes Agent</a> (NousResearch) · MIT License
</p>
