#!/usr/bin/env bash
#
# setup-channels.sh — Configuração interativa de canais do Mangaba Agent.
#
# O que faz:
#   1. Verifica se o Ollama está no ar (modelo local).
#   2. Deixa você ESCOLHER quais canais ativar (Telegram, WhatsApp, Discord,
#      Slack, Email).
#   3. Pede só os tokens dos canais marcados e grava no .env.
#   4. Sobe o gateway — em primeiro plano (teste) ou como serviço (24/7).
#
# Uso:
#   ./setup-channels.sh
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
cd "$PROJECT_DIR"

# --- cores -------------------------------------------------------------------
B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; C="\033[36m"; N="\033[0m"
say()  { echo -e "$@"; }
ok()   { echo -e "${G}✓${N} $*"; }
warn() { echo -e "${Y}!${N} $*"; }
err()  { echo -e "${R}✗${N} $*"; }
hr()   { echo -e "${C}────────────────────────────────────────────────────${N}"; }

# --- grava/atualiza uma chave no .env (remove linha antiga, comentada ou não) -
set_env() {
  local key="$1" val="$2"
  touch "$ENV_FILE"
  # remove qualquer linha existente (ativa ou comentada) dessa chave
  grep -vE "^[#[:space:]]*${key}=" "$ENV_FILE" > "$ENV_FILE.tmp" || true
  mv "$ENV_FILE.tmp" "$ENV_FILE"
  echo "${key}=${val}" >> "$ENV_FILE"
}

ask() { # ask "Pergunta" -> ecoa resposta
  local prompt="$1" ans
  read -r -p "$(echo -e "${B}${prompt}${N} ")" ans
  echo "$ans"
}

# =============================================================================
clear
say "${B}🥭 Mangaba Agent — Configuração de Canais${N}"
hr

# --- 1. Ollama ---------------------------------------------------------------
say "${B}1) Verificando modelo local (Ollama)...${N}"
if curl -s -m 4 http://localhost:11434/v1/models >/dev/null 2>&1; then
  ok "Ollama respondendo na porta 11434."
else
  warn "Ollama NÃO está respondendo."
  if command -v ollama >/dev/null 2>&1; then
    say "  Tentando iniciar com 'brew services start ollama'..."
    brew services start ollama >/dev/null 2>&1 || ollama serve >/dev/null 2>&1 &
    sleep 3
    if curl -s -m 4 http://localhost:11434/v1/models >/dev/null 2>&1; then
      ok "Ollama iniciado."
    else
      err "Não consegui subir o Ollama. Abra outro terminal e rode 'ollama serve'."
    fi
  else
    err "Ollama não instalado. Instale em https://ollama.com/download"
  fi
fi
hr

# --- 2. Seleção de canais ----------------------------------------------------
say "${B}2) Quais canais você quer ativar?${N}"
say "   Digite os números separados por espaço (ex: ${C}1 3${N}), ou Enter p/ só Telegram."
say ""
say "   ${C}1)${N} Telegram"
say "   ${C}2)${N} WhatsApp"
say "   ${C}3)${N} Discord"
say "   ${C}4)${N} Slack"
say "   ${C}5)${N} Email"
say ""
CHOICE="$(ask '➜ Canais:')"
CHOICE="${CHOICE:-1}"
hr

# --- 3. Coleta de tokens por canal -------------------------------------------
configure_telegram() {
  say "${B}📱 Telegram${N} — token do @BotFather"
  local tk uid
  tk="$(ask 'Bot token:')"
  [ -n "$tk" ] && set_env TELEGRAM_BOT_TOKEN "$tk"

  # Descobre o user ID automaticamente via API do Telegram (getUpdates).
  uid=""
  if [ -n "$tk" ]; then
    say ""
    say "${C}Agora abra seu bot no Telegram e mande qualquer mensagem (ex: 'oi').${N}"
    read -r -p "$(echo -e "${B}Pressione ENTER aqui depois de enviar a mensagem...${N} ")" _
    say "  Buscando seu ID..."
    uid="$(detect_telegram_id "$tk")"
    if [ -n "$uid" ]; then
      ok "ID detectado automaticamente: ${B}$uid${N}"
    else
      warn "Não consegui detectar o ID (você enviou a mensagem ao bot?)."
      uid="$(ask 'Informe seu user ID manualmente:')"
    fi
  fi

  [ -n "$uid" ] && { set_env TELEGRAM_ALLOWED_USERS "$uid"; set_env TELEGRAM_HOME_CHANNEL "$uid"; }
  ok "Telegram configurado."
}

# Consulta getUpdates e extrai o id do último remetente (sem dependências extras).
detect_telegram_id() {
  local token="$1" json id
  json="$(curl -s -m 10 "https://api.telegram.org/bot${token}/getUpdates" 2>/dev/null || true)"
  [ -z "$json" ] && return 0
  if have python3; then
    id="$(printf '%s' "$json" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    ids = [m.get("message", {}).get("from", {}).get("id")
           for m in d.get("result", []) if m.get("message")]
    ids = [i for i in ids if i]
    print(ids[-1] if ids else "")
except Exception:
    print("")' 2>/dev/null)"
  else
    # fallback sem python: pega o primeiro "id" dentro de "from"
    id="$(printf '%s' "$json" | grep -oE '"from":\{"id":[0-9]+' | grep -oE '[0-9]+$' | tail -1)"
  fi
  printf '%s' "$id"
}
configure_whatsapp() {
  say "${B}💬 WhatsApp${N} — pareamento via QR depois (rode: mangaba whatsapp)"
  local num
  num="$(ask 'Seu número permitido (ex: 5571999999999):')"
  set_env WHATSAPP_ENABLED true
  [ -n "$num" ] && set_env WHATSAPP_ALLOWED_USERS "$num"
  ok "WhatsApp ativado (pareie o QR após subir o gateway)."
}
configure_discord() {
  say "${B}🎮 Discord${N} — token do Developer Portal"
  local tk uid
  tk="$(ask 'Bot token:')"
  if [ -n "$tk" ]; then
    set_env DISCORD_BOT_TOKEN "$tk"
    # valida o token (retorna os dados do PRÓPRIO bot, confirmando que funciona)
    local botname
    botname="$(curl -s -m 8 -H "Authorization: Bot $tk" "https://discord.com/api/v10/users/@me" \
                 | grep -oE '"username":"[^"]*"' | head -1 | sed -E 's/.*:"(.*)"/\1/')"
    [ -n "$botname" ] && ok "Token válido — bot: $botname" || warn "Não validei o token (cheque se está correto)."
  fi
  # O ID humano no Discord não vem por REST simples — guia de cópia em 1 clique:
  say "  ${C}Para pegar SEU ID:${N} Configurações → Avançado → ative ${B}Modo de Desenvolvedor${N},"
  say "  depois clique com botão direito no seu nome → ${B}Copiar ID do Usuário${N}."
  uid="$(ask 'Cole seu user ID (DISCORD_ALLOWED_USERS):')"
  [ -n "$uid" ] && set_env DISCORD_ALLOWED_USERS "$uid"
  ok "Discord configurado."
}
configure_slack() {
  say "${B}💼 Slack${N} — Bot Token (xoxb-) + App Token (xapp-)"
  local bt at uid
  bt="$(ask 'Bot token (xoxb-...):')"
  at="$(ask 'App token (xapp-...):')"
  [ -n "$bt" ] && set_env SLACK_BOT_TOKEN "$bt"
  [ -n "$at" ] && set_env SLACK_APP_TOKEN "$at"
  if [ -n "$bt" ]; then
    # auth.test valida o token e confirma o workspace
    local team
    team="$(curl -s -m 8 -H "Authorization: Bearer $bt" "https://slack.com/api/auth.test" \
              | grep -oE '"team":"[^"]*"' | head -1 | sed -E 's/.*:"(.*)"/\1/')"
    [ -n "$team" ] && ok "Token válido — workspace: $team" || warn "Token não validou (cheque os escopos)."
    # tenta achar SEU id pelo e-mail (precisa do escopo users:read.email)
    local email mail_id
    email="$(ask 'Seu e-mail do Slack (Enter p/ pular auto-detecção):')"
    if [ -n "$email" ]; then
      mail_id="$(curl -s -m 8 -H "Authorization: Bearer $bt" \
                  "https://slack.com/api/users.lookupByEmail?email=${email}" \
                  | grep -oE '"id":"[^"]*"' | head -1 | sed -E 's/.*:"(.*)"/\1/')"
      [ -n "$mail_id" ] && { uid="$mail_id"; ok "ID detectado: $uid"; }
    fi
  fi
  [ -z "${uid:-}" ] && uid="$(ask 'Seu user ID (SLACK_ALLOWED_USERS):')"
  [ -n "$uid" ] && set_env SLACK_ALLOWED_USERS "$uid"
  ok "Slack configurado."
}
configure_email() {
  say "${B}📧 Email${N} — IMAP/SMTP (Gmail: use App Password)"
  local addr pass
  addr="$(ask 'Endereço de email:')"
  pass="$(ask 'Senha / App Password:')"
  [ -n "$addr" ] && { set_env EMAIL_ADDRESS "$addr"; set_env EMAIL_ALLOWED_USERS "$addr"; set_env EMAIL_HOME_ADDRESS "$addr"; }
  [ -n "$pass" ] && set_env EMAIL_PASSWORD "$pass"
  set_env EMAIL_IMAP_HOST imap.gmail.com
  set_env EMAIL_IMAP_PORT 993
  set_env EMAIL_SMTP_HOST smtp.gmail.com
  set_env EMAIL_SMTP_PORT 587
  ok "Email configurado (ajuste os hosts no .env se não for Gmail)."
}

for n in $CHOICE; do
  case "$n" in
    1) configure_telegram ;;
    2) configure_whatsapp ;;
    3) configure_discord ;;
    4) configure_slack ;;
    5) configure_email ;;
    *) warn "Opção '$n' ignorada." ;;
  esac
  echo ""
done
hr

# --- 4. Subir o gateway ------------------------------------------------------
say "${B}3) Como você quer rodar o gateway?${N}"
say "   ${C}1)${N} Agora em primeiro plano (teste — fecha ao sair do terminal)"
say "   ${C}2)${N} Como serviço 24/7 (launchd — sobe no login, reinicia sozinho)"
say "   ${C}3)${N} Não subir agora"
MODE="$(ask '➜ Opção [1]:')"
MODE="${MODE:-1}"

case "$MODE" in
  1) ok "Iniciando gateway... (Ctrl+C para parar)"; exec mangaba gateway ;;
  2)
     ./scripts/mangaba-gateway install
     ok "Serviço instalado. Comandos: ./scripts/mangaba-gateway {status|stop|start|restart}"
     ;;
  *) ok "Tudo configurado. Suba quando quiser com: mangaba gateway" ;;
esac
