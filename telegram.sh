#!/usr/bin/env bash
#
# telegram.sh — Do clone ao bot no ar com APENAS o token.
#
#   git clone https://github.com/dheiver2/mangaba-agent.git
#   cd mangaba-agent
#   ./telegram.sh
#
# Ele instala tudo (pré-requisitos, Python, Ollama + modelo), pede SÓ o
# token do @BotFather, detecta seu user ID automaticamente e sobe o bot.
#
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
ENV_FILE="$PROJECT_DIR/.env"

B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; C="\033[36m"; N="\033[0m"
ok()   { echo -e "${G}✓${N} $*"; }
warn() { echo -e "${Y}!${N} $*"; }
err()  { echo -e "${R}✗${N} $*"; }
have() { command -v "$1" >/dev/null 2>&1; }

set_env() {
  local key="$1" val="$2"; touch "$ENV_FILE"
  grep -vE "^[#[:space:]]*${key}=" "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || true
  mv "$ENV_FILE.tmp" "$ENV_FILE"; echo "${key}=${val}" >> "$ENV_FILE"
}

detect_telegram_id() {
  local token="$1" json
  json="$(curl -s -m 10 "https://api.telegram.org/bot${token}/getUpdates" 2>/dev/null || true)"
  [ -z "$json" ] && return 0
  if have python3; then
    printf '%s' "$json" | python3 -c '
import sys, json
try:
    d=json.load(sys.stdin)
    ids=[m.get("message",{}).get("from",{}).get("id") for m in d.get("result",[]) if m.get("message")]
    ids=[i for i in ids if i]
    print(ids[-1] if ids else "")
except Exception: print("")' 2>/dev/null
  else
    printf '%s' "$json" | grep -oE '"from":\{"id":[0-9]+' | grep -oE '[0-9]+$' | tail -1
  fi
}

clear
echo -e "${B}🥭 Mangaba no Telegram — instalação completa${N}"
echo -e "${C}──────────────────────────────────────────────${N}"

# --- 1. Instala tudo (delegado ao bootstrap, sem o menu de canais) -----------
echo -e "${B}1) Instalando pré-requisitos + modelo local (pode demorar na 1ª vez)...${N}"
BOOTSTRAP_NO_CHANNELS=true ./bootstrap.sh
# ativa o venv criado pelo bootstrap
# shellcheck disable=SC1091
source .venv/bin/activate 2>/dev/null || true
ok "Base instalada."

# --- 2. Pede SÓ o token ------------------------------------------------------
echo ""
echo -e "${B}2) Cole o token do seu bot${N} (pegue no @BotFather → /newbot)"
read -r -p "$(echo -e "${B}Token:${N} ")" TK
[ -z "$TK" ] && { err "Token vazio. Saindo."; exit 1; }
set_env TELEGRAM_BOT_TOKEN "$TK"

# valida o token
BOTNAME="$(curl -s -m 8 "https://api.telegram.org/bot${TK}/getMe" | grep -oE '"username":"[^"]*"' | head -1 | sed -E 's/.*:"(.*)"/\1/')"
[ -n "$BOTNAME" ] && ok "Token válido — bot: @$BOTNAME" || { err "Token inválido. Confira no @BotFather."; exit 1; }

# --- 3. Detecta seu ID automaticamente ---------------------------------------
echo ""
echo -e "${C}Abra @${BOTNAME} no Telegram e mande qualquer mensagem (ex: 'oi').${N}"
read -r -p "$(echo -e "${B}Pressione ENTER aqui depois de enviar...${N} ")" _
UID_TG="$(detect_telegram_id "$TK")"
if [ -n "$UID_TG" ]; then
  ok "ID detectado automaticamente: $UID_TG"
else
  warn "Não detectei (você enviou a mensagem?)."
  read -r -p "$(echo -e "${B}Informe seu user ID manualmente:${N} ")" UID_TG
fi
[ -n "$UID_TG" ] && { set_env TELEGRAM_ALLOWED_USERS "$UID_TG"; set_env TELEGRAM_HOME_CHANNEL "$UID_TG"; }

# --- 4. Sobe o bot -----------------------------------------------------------
echo ""
echo -e "${B}3) Subindo o bot...${N}"
echo -e "${C}Pronto! Vá ao Telegram e fale com @${BOTNAME}. (Ctrl+C aqui para parar)${N}"
exec mangaba gateway
