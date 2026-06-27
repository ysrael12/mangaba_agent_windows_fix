#!/usr/bin/env bash
# Instala o LaunchAgent que mantém o dashboard Mangaba sempre no ar (macOS).
# Idempotente: rode de novo para atualizar os caminhos.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_BIN="$PROJECT_DIR/.venv/bin"
MANGABA_BIN="$VENV_BIN/mangaba"
LABEL="com.mangaba.dashboard"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ ! -x "$MANGABA_BIN" ]; then
  echo "✗ Não encontrei $MANGABA_BIN — ative/instale o venv primeiro." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/.mangaba/logs"

sed -e "s#__MANGABA_BIN__#$MANGABA_BIN#g" \
    -e "s#__PROJECT_DIR__#$PROJECT_DIR#g" \
    -e "s#__VENV_BIN__#$VENV_BIN#g" \
    -e "s#__HOME__#$HOME#g" \
    "$PROJECT_DIR/scripts/macos/com.mangaba.dashboard.plist" > "$DEST"

# Recarrega (bootout ignora erro se ainda não estava carregado).
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
launchctl enable "gui/$(id -u)/$LABEL"

echo "✓ Auto-restart instalado: $DEST"
echo "  O dashboard sobe sozinho no login e reinicia se cair."
echo "  Status:  launchctl print gui/$(id -u)/$LABEL | grep state"
echo "  Logs:    tail -f ~/.mangaba/logs/dashboard.err.log"
echo "  Remover: launchctl bootout gui/$(id -u)/$LABEL && rm $DEST"
