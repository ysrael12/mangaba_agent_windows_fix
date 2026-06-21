#!/usr/bin/env bash
#
# bootstrap.sh — Instalação COMPLETA do Mangaba Agent em um comando.
#
# Para o usuário final:
#   git clone <repo> && cd mangaba-agent
#   ./bootstrap.sh
#
# O que ele faz, do zero:
#   1. Instala pré-requisitos do sistema (Homebrew, git, node, ripgrep,
#      ffmpeg) — macOS (brew) ou Linux (apt).
#   2. Instala o uv (gerenciador Python) e cria o ambiente + o pacote.
#   3. Instala o Ollama e baixa um modelo local.
#   4. Escreve a config do modelo em ~/.mangaba/config.yaml.
#   5. Chama setup-channels.sh para escolher e configurar os canais,
#      e subir o gateway (em primeiro plano ou como serviço 24/7).
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
MODEL="${MANGABA_MODEL:-qwen2.5:7b-instruct}"   # override: MANGABA_MODEL=... ./bootstrap.sh
SKIP_BROWSER="${SKIP_BROWSER:-false}"           # SKIP_BROWSER=true pula o Chromium/Playwright (download pesado)

# =============================================================================
step "1/5  Pré-requisitos do sistema"

# --- ferramentas de compilação (necessárias p/ algumas deps Python) ----------
if [ "$OS" = "Darwin" ]; then
  if ! xcode-select -p >/dev/null 2>&1; then
    warn "Xcode Command Line Tools ausentes — disparando instalação (pode abrir um popup)..."
    xcode-select --install 2>/dev/null || true
    warn "Se um popup apareceu, conclua a instalação do CLT e rode ./bootstrap.sh de novo."
  fi
  ok "Xcode Command Line Tools ok."
  if ! have brew; then
    warn "Homebrew não encontrado — instalando..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    [ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
    [ -x /usr/local/bin/brew ]    && eval "$(/usr/local/bin/brew shellenv)"
  fi
  ok "Homebrew pronto."
  for pkg in git node ripgrep ffmpeg; do
    if brew list "$pkg" >/dev/null 2>&1 || have "${pkg/ripgrep/rg}"; then
      ok "$pkg já instalado."
    else
      echo "  instalando $pkg..."; brew install "$pkg" || warn "Falha ao instalar $pkg (siga mesmo assim)."
    fi
  done
elif [ "$OS" = "Linux" ] && have apt-get; then
  sudo apt-get update -y
  # inclui build tools (build-essential, python3-dev, libffi-dev) p/ compilar deps Python
  sudo apt-get install -y git nodejs npm ripgrep ffmpeg curl \
       build-essential python3-dev libffi-dev || warn "Alguns pacotes apt falharam."
  ok "Pacotes de sistema + build tools instalados (apt)."
else
  warn "SO não reconhecido para auto-instalação ($OS). Garanta git/node/ripgrep/ffmpeg manualmente."
fi

# --- delega ao instalador oficial as deps extras (node bridges + browser) ----
# O modo --ensure NÃO clona nem recria venv: só instala dependências testadas.
if [ -f scripts/install.sh ]; then
  echo "  garantindo dependências extras via instalador oficial (--ensure)..."
  ENSURE_LIST="node,ripgrep,ffmpeg"
  [ "$SKIP_BROWSER" = "true" ] || ENSURE_LIST="node,browser,ripgrep,ffmpeg"
  bash scripts/install.sh --ensure "$ENSURE_LIST" || warn "Algumas deps extras falharam (siga mesmo assim)."
  ok "Dependências extras verificadas (browser/Playwright incluído salvo SKIP_BROWSER=true)."
fi

# =============================================================================
step "2/5  Ambiente Python (uv) + pacote Mangaba"

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
# shellcheck disable=SC1091
source .venv/bin/activate
echo "  instalando o pacote (pode demorar na 1ª vez)..."
uv pip install -e . >/dev/null
ok "Mangaba instalado no venv."

# =============================================================================
step "3/5  Ollama + modelo local ($MODEL)"

if ! have ollama; then
  warn "Ollama não encontrado — instalando..."
  if [ "$OS" = "Darwin" ]; then
    brew install ollama || { err "Falha ao instalar Ollama. Veja https://ollama.com/download"; }
  else
    curl -fsSL https://ollama.com/install.sh | sh || err "Falha ao instalar Ollama."
  fi
fi

# garante o servidor no ar
if ! curl -s -m 4 http://localhost:11434/v1/models >/dev/null 2>&1; then
  echo "  iniciando o servidor Ollama..."
  if [ "$OS" = "Darwin" ]; then brew services start ollama >/dev/null 2>&1 || (ollama serve >/dev/null 2>&1 &)
  else (ollama serve >/dev/null 2>&1 &); fi
  sleep 4
fi
curl -s -m 4 http://localhost:11434/v1/models >/dev/null 2>&1 && ok "Ollama no ar." || warn "Ollama não respondeu — verifique 'ollama serve'."

# baixa o modelo se ainda não existir
if ollama list 2>/dev/null | grep -q "${MODEL%%:*}"; then
  ok "Modelo $MODEL já baixado."
else
  echo "  baixando $MODEL (download grande, aguarde)..."
  ollama pull "$MODEL" && ok "Modelo baixado." || warn "Falha ao baixar $MODEL."
fi

# =============================================================================
step "4/5  Config do modelo (~/.mangaba/config.yaml)"

CFG_DIR="$HOME/.mangaba"; CFG="$CFG_DIR/config.yaml"
mkdir -p "$CFG_DIR"
[ -f "$CFG" ] || echo "onboarding:\n  seen:\n    busy_input_prompt: true" > "$CFG"

# remove bloco model: antigo (se houver) e regrava — simples e idempotente
python3 - "$CFG" "$MODEL" <<'PY'
import sys, re, pathlib
cfg, model = pathlib.Path(sys.argv[1]), sys.argv[2]
text = cfg.read_text() if cfg.exists() else ""
# remove um bloco "model:" existente (linhas indentadas que o seguem)
text = re.sub(r'(?ms)^model:\n(?:[ \t]+.*\n?)*', '', text)
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
ok "Modelo apontado para Ollama local."

# =============================================================================
step "5/5  Canais + gateway"
echo "  Abrindo o configurador de canais..."
exec ./setup-channels.sh
