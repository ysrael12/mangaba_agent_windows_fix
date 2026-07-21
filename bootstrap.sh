#!/usr/bin/env bash
#
# bootstrap.sh — Instalação COMPLETA do Mangaba Agent em um comando.
#
# Para o usuário final:
#   git clone <repo> && cd mangaba-agent
#   ./bootstrap.sh
#
# O que ele faz, do zero:
#   1. Prepara o Mangaba Home DENTRO do projeto (./.mangaba-home) — migra um
#      ~/.mangaba existente se houver, ou cria um novo do zero se não houver.
#   2. Instala pré-requisitos do sistema (Homebrew, git, node, ripgrep,
#      ffmpeg, @openai/codex) — macOS (brew) ou Linux (apt).
#   3. Instala o uv (gerenciador Python) e cria o ambiente + o pacote.
#   4. Verifica se Ollama está rodando e baixa o modelo se faltar (ollama pull).
#   5. Escreve a config do modelo em $MANGABA_HOME/config.yaml.
#   6. Abre o dashboard — configure o modelo via interface web.
#
# Windows nativo (Git Bash/MSYS2): suportado nos passos 2-5 (uv, venv, Ollama
# via winget, config, canais). O passo 1 não auto-instala git/node/ripgrep/
# ffmpeg por aqui — para isso, use scripts/install.ps1 antes ou depois.
#   MANGABA_PROVIDER=openai-codex MANGABA_MODEL=gpt-5.5 ./bootstrap.sh
#      pula o Ollama e usa ChatGPT (Codex) como cérebro.
#      Conecte sua conta no dashboard depois da instalação.
#   MANGABA_PROVIDER=gateway MANGABA_GATEWAY_URL=https://seu-endpoint ./bootstrap.sh
#      pula o Ollama por completo e usa um gateway OpenAI-compatível remoto.
#   BOOTSTRAP_OPEN_DASHBOARD=true ./bootstrap.sh
#      ao final, já builda e sobe o painel web (`mangaba dashboard`) e abre o
#      navegador sozinho — ver GUIA_DASHBOARD.md. Combine com
#      BOOTSTRAP_NO_CHANNELS=true para pular o configurador interativo de
#      canais (o painel também permite configurar canais depois).
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; C="\033[36m"; N="\033[0m"
step() { echo -e "\n${C}━━━ $* ━━━${N}"; }
ok()   { echo -e "${G}✓${N} $*"; }
warn() { echo -e "${Y}!${N} $*"; }
err()  { echo -e "${R}✗${N} $*"; }
have() { command -v "$1" >/dev/null 2>&1; }

OS="$(uname -s)"
IS_WINDOWS=false
case "$OS" in MINGW*|MSYS*|CYGWIN*) IS_WINDOWS=true ;; esac   # Git Bash/MSYS2 no Windows nativo
MODEL="${MANGABA_MODEL:-gemma4:e4b}"   # override: MANGABA_MODEL=... ./bootstrap.sh
SKIP_BROWSER="${SKIP_BROWSER:-false}"           # SKIP_BROWSER=true pula o Chromium/Playwright (download pesado)

# PROVIDER=openai-codex pula o Ollama local e usa o ChatGPT (Codex) como cérebro.
# Requer uma conta ChatGPT (Plus/Pro para o modelo completo; Free funciona com
# modelos limitados). Conecte a conta no dashboard depois da instalação.
#   MANGABA_PROVIDER=openai-codex MANGABA_MODEL=gpt-5.5 ./bootstrap.sh
# PROVIDER=gateway pula o Ollama local e aponta para um gateway OpenAI-compatível
# próprio (ex.: seu pool de modelos Mangaba atrás de um túnel). Requer MANGABA_GATEWAY_URL.
#   MANGABA_PROVIDER=gateway MANGABA_GATEWAY_URL=https://seu-endpoint ./bootstrap.sh
PROVIDER="${MANGABA_PROVIDER:-ollama}"
GATEWAY_URL="${MANGABA_GATEWAY_URL:-}"
GATEWAY_KEY="${MANGABA_GATEWAY_KEY:-x}"
GATEWAY_MODEL="${MANGABA_GATEWAY_MODEL:-mangaba-vision-q8}"
if [ "$PROVIDER" = "gateway" ] && [ -z "$GATEWAY_URL" ]; then
  err "MANGABA_PROVIDER=gateway exige MANGABA_GATEWAY_URL (ex.: https://seu-endpoint)."
  exit 1
fi

# BOOTSTRAP_OPEN_DASHBOARD=true faz o bootstrap terminar já com o painel web
# no ar (builda o front, sobe o backend e abre o navegador) — ver
# GUIA_DASHBOARD.md. Ligado por padrão agora (ir direto ao dashboard).
OPEN_DASHBOARD="${BOOTSTRAP_OPEN_DASHBOARD:-true}"
DASHBOARD_NO_OPEN="${BOOTSTRAP_DASHBOARD_NO_OPEN:-false}"
# BOOTSTRAP_NO_CHANNELS=true pula o configurador interativo — o dashboard
# permite configurar canais depois. Ligado por padrão agora.
BOOTSTRAP_NO_CHANNELS="${BOOTSTRAP_NO_CHANNELS:-true}"

open_dashboard() {
  step "Abrindo o dashboard"
  echo "  Buildando o painel web e subindo o servidor (mangaba dashboard)..."
  local flags=()
  [ "$DASHBOARD_NO_OPEN" = "true" ] && flags+=(--no-open)
  # Primeira tela do setup deve ser o wizard "Criar agente" (/criar).
  MANGABA_DASHBOARD_OPEN_PATH="${MANGABA_DASHBOARD_OPEN_PATH:-/criar}" \
    "$PY_CMD" -m mangaba_cli.main dashboard "${flags[@]}"
}

# =============================================================================
step "1/6  Mangaba Home (./.mangaba-home, dentro do projeto)"

# MANGABA_HOME é a raiz de tudo que o Mangaba persiste — config.yaml,
# auth.json, .env, SOUL.md, sessions/, cron/, skills/, rag/. Por padrão o
# projeto guarda isso dentro de si mesmo (./.mangaba-home) em vez do
# tradicional ~/.mangaba, para não depender do diretório de usuário.
#
# Setup geral (comportamento cobre os dois casos):
#   - Já existe ~/.mangaba na máquina (instalação anterior)? Migra tudo para
#     ./.mangaba-home (o ~/.mangaba original é preservado, não é apagado).
#   - Não existe nada ainda (máquina nova)? Cria ./.mangaba-home vazio — o
#     restante do bootstrap (passo 5/6) e o próprio app populam config.yaml/
#     SOUL.md/etc. no primeiro uso, como sempre fizeram em ~/.mangaba.
MANGABA_HOME_DIR="$PROJECT_DIR/.mangaba-home"
LEGACY_HOME_DIR="$HOME/.mangaba"
MIGRATED_HOME=false

if [ -d "$MANGABA_HOME_DIR" ]; then
  ok "Mangaba Home já existe em $MANGABA_HOME_DIR — reaproveitando."
elif [ -d "$LEGACY_HOME_DIR" ]; then
  echo "  Encontrado Mangaba Home existente em $LEGACY_HOME_DIR — migrando para o projeto..."
  mkdir -p "$MANGABA_HOME_DIR"
  if cp -a "$LEGACY_HOME_DIR/." "$MANGABA_HOME_DIR/"; then
    ok "Migrado $LEGACY_HOME_DIR -> $MANGABA_HOME_DIR (original preservado como backup)."
    MIGRATED_HOME=true
  else
    err "Falha ao migrar $LEGACY_HOME_DIR — seguindo com Mangaba Home vazio em $MANGABA_HOME_DIR."
  fi
else
  echo "  Nenhum Mangaba Home encontrado nesta máquina — criando um novo em $MANGABA_HOME_DIR."
  mkdir -p "$MANGABA_HOME_DIR"
  ok "Mangaba Home criado (config.yaml/SOUL.md serão populados no primeiro uso)."
fi

export MANGABA_HOME="$MANGABA_HOME_DIR"

# Persiste MANGABA_HOME além desta sessão do script, para terminais/serviços
# futuros (novo shell, gateway instalado como serviço, etc.) apontarem pro
# mesmo lugar sem precisar re-exportar manualmente.
if $IS_WINDOWS; then
  if have setx; then
    WIN_HOME_PATH="$(cygpath -w "$MANGABA_HOME_DIR" 2>/dev/null || echo "$MANGABA_HOME_DIR")"
    if setx MANGABA_HOME "$WIN_HOME_PATH" >/dev/null 2>&1; then
      ok "MANGABA_HOME persistido (setx, variável de usuário do Windows): $WIN_HOME_PATH"
      warn "Terminais já abertos não veem a mudança — só os novos (o bootstrap segue usando esta sessão)."
    else
      warn "Não consegui persistir MANGABA_HOME via setx — exporte manualmente em novas sessões:"
      warn "  setx MANGABA_HOME \"$WIN_HOME_PATH\""
    fi
  else
    warn "'setx' não encontrado — MANGABA_HOME só vale para esta sessão do bootstrap."
  fi
else
  MANGABA_HOME_LINE="export MANGABA_HOME=\"$MANGABA_HOME_DIR\""
  for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    [ -f "$rc" ] || continue
    grep -qF "$MANGABA_HOME_LINE" "$rc" 2>/dev/null && continue
    # remove uma linha MANGABA_HOME antiga (se apontava pra outro lugar) antes
    # de acrescentar a nova, pra não deixar duas exportações conflitantes.
    sed -i.mangababak '/^export MANGABA_HOME=/d' "$rc" 2>/dev/null && rm -f "$rc.mangababak"
    printf '\n%s\n' "$MANGABA_HOME_LINE" >> "$rc"
    ok "MANGABA_HOME persistido em $rc"
  done
fi

# =============================================================================
step "2/6  Pré-requisitos do sistema"

# --- ferramentas de compilação (necessárias p/ algumas deps Python) ----------
if [ "$OS" = "Darwin" ]; then
  if ! xcode-select -p >/dev/null 2>&1; then
    warn "Xcode Command Line Tools ausentes — disparando instalação (pode abrir um popup)..."
    xcode-select --install 2>/dev/null || true
    warn "Se um popup apareceu, conclua a instalação do CLT e rode ./bootstrap.sh de novo."
  fi
  ok "Xcode Command Line Tools ok."
  # detecta brew em locais conhecidos (mesmo fora do PATH deste shell)
  if ! have brew; then
    [ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
    [ -x /usr/local/bin/brew ]    && eval "$(/usr/local/bin/brew shellenv)"
  fi
  if ! have brew; then
    warn "Homebrew não encontrado — tentando instalar (precisa de admin)..."
    # não pode abortar o script todo se falhar (sudo/sem TTY)
    if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
      [ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
      [ -x /usr/local/bin/brew ]    && eval "$(/usr/local/bin/brew shellenv)"
    else
      warn "Não instalei o Homebrew automaticamente."
      warn "Instale manualmente em https://brew.sh e rode ./bootstrap.sh de novo,"
      warn "ou garanta git/node/ripgrep/ffmpeg por conta própria. Seguindo mesmo assim..."
    fi
  fi
  if have brew; then
    ok "Homebrew pronto."
    for pkg in git node ripgrep ffmpeg; do
      if brew list "$pkg" >/dev/null 2>&1 || have "${pkg/ripgrep/rg}"; then
        ok "$pkg já instalado."
      else
        echo "  instalando $pkg..."; brew install "$pkg" || warn "Falha ao instalar $pkg (siga mesmo assim)."
      fi
    done
  else
    warn "Sem brew — pulando git/node/ripgrep/ffmpeg. O núcleo do agente ainda funciona via uv."
  fi
elif [ "$OS" = "Linux" ] && have apt-get; then
  sudo apt-get update -y
  # inclui build tools (build-essential, python3-dev, libffi-dev) p/ compilar deps Python
  sudo apt-get install -y git nodejs npm ripgrep ffmpeg curl \
       build-essential python3-dev libffi-dev || warn "Alguns pacotes apt falharam."
  ok "Pacotes de sistema + build tools instalados (apt)."
elif $IS_WINDOWS; then
  warn "Windows nativo detectado — git/node/ripgrep/ffmpeg não são auto-instalados por aqui."
  warn "Para suporte completo (inclui esses pacotes via winget), use o instalador PowerShell:"
  warn "  iex (irm https://raw.githubusercontent.com/dheiver2/mangaba-agent/main/scripts/install.ps1)"
  ok "Seguindo com uv/venv/Ollama, que funcionam em Windows nativo."
else
  warn "SO não reconhecido para auto-instalação ($OS). Garanta git/node/ripgrep/ffmpeg manualmente."
fi

# --- delega ao instalador oficial as deps extras (node bridges + browser) ----
# O modo --ensure NÃO clona nem recria venv: só instala dependências testadas.
# No Windows nativo, scripts/install.sh já recusa e aponta para install.ps1 — pular
# evita ruído (um "✗" vermelho redundante com o aviso acima).
if ! $IS_WINDOWS && [ -f scripts/install.sh ]; then
  echo "  garantindo dependências extras via instalador oficial (--ensure)..."
  ENSURE_LIST="node,ripgrep,ffmpeg"
  [ "$SKIP_BROWSER" = "true" ] || ENSURE_LIST="node,browser,ripgrep,ffmpeg"
  bash scripts/install.sh --ensure "$ENSURE_LIST" || warn "Algumas deps extras falharam (siga mesmo assim)."
  ok "Dependências extras verificadas (browser/Playwright incluído salvo SKIP_BROWSER=true)."
fi

# --- OpenAI Codex CLI (login por dispositivo p/ ChatGPT Plus/Pro) -----------
# Necessário para o provider "openai-codex" no gateway (OAuth device_code).
if have npm; then
  if npm ls -g @openai/codex >/dev/null 2>&1; then
    ok "Codex CLI já instalado."
  else
    echo "  instalando Codex CLI (npm install -g @openai/codex)..."
    npm install -g @openai/codex >/dev/null 2>&1 \
      && ok "Codex CLI instalado ($(codex --version 2>/dev/null))." \
      || warn "Falha ao instalar Codex CLI (siga mesmo assim)."
  fi
fi

# =============================================================================
step "3/6  Ambiente Python (uv) + pacote Mangaba"

if ! have uv; then
  warn "uv não encontrado — instalando..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi
have uv && ok "uv pronto ($(uv --version 2>/dev/null))."

if [ ! -d ".venv" ]; then
  echo "  criando ambiente virtual..."
  uv venv --python 3.11 .venv
fi
# ativa o venv para os passos seguintes (config, gateway)
# Windows (uv venv nativo) usa .venv/Scripts/activate; Unix usa .venv/bin/activate.
# shellcheck disable=SC1091
if [ -f ".venv/Scripts/activate" ]; then
  source .venv/Scripts/activate
else
  source .venv/bin/activate
fi
# Resolve o interpretador do venv por caminho absoluto (reusado no passo 4).
# NÃO usar "have python3"/PATH aqui: no Windows, python3 no PATH costuma ser o
# stub da Microsoft Store (App Execution Alias) — "existe" mas não roda nada,
# e mascararia o python real do venv (.venv/Scripts/python.exe só tem "python").
if [ -x "$PROJECT_DIR/.venv/Scripts/python.exe" ]; then
  PY_CMD="$PROJECT_DIR/.venv/Scripts/python.exe"
elif [ -x "$PROJECT_DIR/.venv/bin/python3" ]; then
  PY_CMD="$PROJECT_DIR/.venv/bin/python3"
elif [ -x "$PROJECT_DIR/.venv/bin/python" ]; then
  PY_CMD="$PROJECT_DIR/.venv/bin/python"
else
  err "Interpretador Python do venv não encontrado."
  exit 1
fi
echo "  instalando o pacote (pode demorar na 1ª vez)..."
# inclui o extra [web] (fastapi/uvicorn) — o passo 6/6 abre o dashboard por
# padrão (OPEN_DASHBOARD=true) e ele depende desses pacotes para subir.
uv pip install -e ".[web]" >/dev/null
ok "Mangaba instalado no venv."
# extras úteis: busca web grátis (DuckDuckGo) + leitura de PDF/DOCX —
# fazem 'pesquise…' e 'resuma este PDF' funcionarem sem chave de API.
echo "  instalando extras (busca web grátis + PDF)..."
uv pip install ddgs pypdf pdfplumber python-docx openpyxl "qrcode[pil]" "mcp==1.26.0" google-api-python-client google-auth-oauthlib google-auth-httplib2 >/dev/null 2>&1 \
  && ok "Extras instalados (ddgs, pypdf, pdfplumber, docx, xlsx, qrcode/PIX)." \
  || warn "Alguns extras falharam (siga mesmo assim)."

# Se migramos um Mangaba Home existente (passo 1/6), um gateway pode já estar
# rodando apontado pro ~/.mangaba antigo. Reinicia sob o novo MANGABA_HOME
# para ele passar a ler/gravar em ./.mangaba-home a partir de agora — sem
# isso, o gateway continuaria "preso" no diretório antigo até um restart manual.
# Instalação nova (sem migração) não tem gateway rodando ainda, então não
# há nada para reiniciar aqui — ele já nasce apontando pro Mangaba Home certo.
if [ "$MIGRATED_HOME" = "true" ]; then
  # 'gateway status' só imprime texto (sempre sai com código 0) — usa
  # find_gateway_pids() diretamente para saber se realmente há um processo
  # rodando antes de tentar reiniciar algo que não existe.
  if "$PY_CMD" -c "from mangaba_cli.gateway import find_gateway_pids; import sys; sys.exit(0 if find_gateway_pids() else 1)" 2>/dev/null; then
    echo "  Gateway em execução detectado — reiniciando sob o novo Mangaba Home..."
    if "$PY_CMD" -m mangaba_cli.main gateway restart >/dev/null 2>&1; then
      ok "Gateway reiniciado com MANGABA_HOME=$MANGABA_HOME_DIR."
    else
      warn "Não consegui reiniciar o gateway automaticamente."
      warn "Rode manualmente: MANGABA_HOME=\"$MANGABA_HOME_DIR\" mangaba gateway restart"
    fi
  else
    ok "Nenhum gateway em execução — nada para reiniciar."
  fi
fi

# =============================================================================
if [ "$PROVIDER" = "gateway" ]; then
  step "4/6  Modelo remoto (gateway) — pulando Ollama local"
  ok "PROVIDER=gateway — usando $GATEWAY_URL, modelo padrão $GATEWAY_MODEL."
elif [ "$PROVIDER" = "openai-codex" ]; then
  step "4/6  ChatGPT (Codex) — pulando Ollama local"
  ok "PROVIDER=openai-codex — usando ChatGPT ($MODEL). Conecte sua conta no dashboard depois (seção 4 do GUIA_DASHBOARD.md)."
else
  # Verifica se Ollama está rodando E se o modelo configurado existe. Sem o
  # segundo passo, a instalação nasce apontando para um modelo ausente e toda
  # mensagem falha com "provedor falhou" (o config aponta pra um modelo que o
  # Ollama não tem baixado).
  if curl -s -m 4 http://localhost:11434/v1/models >/dev/null 2>&1; then
    if curl -s -m 4 http://localhost:11434/api/tags 2>/dev/null | grep -q "\"$MODEL\""; then
      :
    elif have ollama; then
      ollama pull "$MODEL" || true
    fi
  fi
fi

# =============================================================================
step "5/6  Config do modelo ($MANGABA_HOME/config.yaml)"

CFG_DIR="$MANGABA_HOME"; CFG="$CFG_DIR/config.yaml"
mkdir -p "$CFG_DIR"
[ -f "$CFG" ] || echo "onboarding:\n  seen:\n    busy_input_prompt: true" > "$CFG"

# remove blocos model:/custom_providers: antigos (se houver) e regrava — simples e idempotente
"$PY_CMD" - "$CFG" "$PROVIDER" "$MODEL" "$GATEWAY_URL" "$GATEWAY_KEY" "$GATEWAY_MODEL" <<'PY'
import sys, re, pathlib
cfg, provider, model, gateway_url, gateway_key, gateway_model = sys.argv[1:7]
cfg = pathlib.Path(cfg)
text = cfg.read_text() if cfg.exists() else ""
# remove blocos "model:" e "custom_providers:" existentes (linhas indentadas que os seguem)
text = re.sub(r'(?ms)^model:\n(?:[ \t]+.*\n?)*', '', text)
text = re.sub(r'(?ms)^custom_providers:\n(?:[ \t]+.*\n?)*', '', text)

if provider == "gateway":
    base_url = gateway_url.rstrip("/") + "/v1"
    block = (
        "model:\n"
        "  provider: custom\n"
        f"  base_url: {base_url}\n"
        f"  api_key: {gateway_key}\n"
        f"  default: {gateway_model}\n"
        "custom_providers:\n"
        "  - name: mangaba-gateway\n"
        f"    base_url: {base_url}\n"
        f"    api_key: {gateway_key}\n"
        "    discover_models: true\n"
        f"    default_model: {gateway_model}\n"
    )
elif provider == "openai-codex":
    block = (
        "model:\n"
        "  provider: openai-codex\n"
        f"  default: {model}\n"
        f"  name: {model}\n"
    )
else:
    block = (
        "model:\n"
        f"  default: {model}\n"
        "  provider: ollama\n"
        "  base_url: http://localhost:11434/v1\n"
        "  api_key: ollama\n"
        "  context_length: 65536\n"
        "  ollama_num_ctx: 65536\n"
    )

if not text.endswith("\n") and text:
    text += "\n"
cfg.write_text(text + block)
print("config.yaml atualizado")
PY
if [ "$PROVIDER" = "gateway" ]; then
  ok "Modelo apontado para o gateway $GATEWAY_URL ($GATEWAY_MODEL)."
  warn "Agentes que chamam MCP/ferramentas exigem um modelo tool-capable (ex.: mangaba-vision-q8)."
  warn "Modelos só-chat (ex.: mangaba-lite-q4) servem apenas para agentes conversacionais."
elif [ "$PROVIDER" = "openai-codex" ]; then
  ok "Modelo apontado para ChatGPT ($MODEL). Conecte sua conta no dashboard (seção 4 do GUIA_DASHBOARD.md)."
else
  ok "Modelo apontado para Ollama local."
fi

# =============================================================================
# Quando BOOTSTRAP_NO_CHANNELS=true, pula o configurador interativo de canais
# — o dashboard permite configurar canais depois.
if [ "$BOOTSTRAP_NO_CHANNELS" = "true" ]; then
  ok "Instalação base concluída."
  if [ "$OPEN_DASHBOARD" = "true" ]; then
    step "6/6  Abrindo dashboard"
    open_dashboard
  fi
  exit 0
fi

step "6/6  Canais + gateway"
echo "  Abrindo o configurador de canais..."
if [ "$OPEN_DASHBOARD" = "true" ]; then
  # não usa exec aqui: precisamos voltar pro script depois do configurador
  # de canais para então subir o dashboard.
  ./setup-channels.sh
  open_dashboard
else
  exec ./setup-channels.sh
fi
