#!/usr/bin/env bash
# Prepara a API Mangaba para exposição pública:
#   • gera um API_SERVER_KEY forte (chave global do operador/admin)
#   • configura o .env para bind público (0.0.0.0) na porta 8642
#   • NÃO toca no dashboard (:9119) nem nos backends dedicados (:8700+)
#
# Depois deste script: reinicie o gateway e suba o proxy HTTPS (Caddyfile).
set -euo pipefail

ENV_FILE="${MANGABA_HOME:-$HOME/.mangaba}/.env"
mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"

# Gera chave se ainda não houver uma utilizável.
CURRENT_KEY="$(grep -E '^API_SERVER_KEY=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
if [ -z "${CURRENT_KEY}" ] || [ "${#CURRENT_KEY}" -lt 16 ]; then
  NEW_KEY="$(openssl rand -hex 32)"
else
  NEW_KEY="$CURRENT_KEY"
fi

# Remove linhas antigas das chaves que vamos definir e regrava.
TMP="$(mktemp)"
grep -vE '^(API_SERVER_ENABLED|API_SERVER_HOST|API_SERVER_PORT|API_SERVER_KEY)=' "$ENV_FILE" > "$TMP" || true
{
  echo "# API pública (proxy HTTPS na frente) — operador usa API_SERVER_KEY; clientes usam mk_live_"
  echo "API_SERVER_ENABLED=true"
  echo "API_SERVER_HOST=0.0.0.0"
  echo "API_SERVER_PORT=8642"
  echo "API_SERVER_KEY=$NEW_KEY"
} >> "$TMP"
mv "$TMP" "$ENV_FILE"
chmod 600 "$ENV_FILE" || true

echo "✓ .env atualizado: $ENV_FILE"
echo "  API_SERVER_HOST=0.0.0.0  API_SERVER_PORT=8642"
echo
echo "  API_SERVER_KEY (operador/admin — guarde em segredo):"
echo "    $NEW_KEY"
echo
echo "Próximos passos:"
echo "  1) mangaba gateway restart"
echo "  2) Edite scripts/deploy/Caddyfile.example (domínio) e rode:"
echo "       sudo caddy run --config scripts/deploy/Caddyfile.example"
echo "  3) Abra as portas 80/443 no firewall. NÃO exponha 9119 nem 8700+."
echo
echo "Aviso: os clientes consomem com a chave mk_live_… deles (aba Clientes & API)."
echo "       A API_SERVER_KEY acima é só para o operador/admin."
