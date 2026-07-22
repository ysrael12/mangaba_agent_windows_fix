#!/usr/bin/env bash
#
# build_exe.sh — Build mangaba-agent frozen executables (Linux/macOS).
#
# Produces dist/mangaba/ with the mangaba and mangaba-acp binaries,
# then packages into platform-native format:
#   - Linux: AppImage (portable, no install needed)
#   - macOS: .app bundle + .dmg disk image
#
# Prerequisites:
#   - Python 3.11+ on PATH
#   - Node.js 20+ and npm on PATH
#   - uv (installed automatically if missing)
#
# Usage:
#   ./scripts/build_exe.sh                    # Build + package
#   ./scripts/build_exe.sh --skip-package     # Build only, skip packaging
#   MANGABA_VERSION=1.4.0 ./scripts/build_exe.sh  # Set version
#

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_PACKAGE=false
for arg in "$@"; do
    case "$arg" in
        --skip-package) SKIP_PACKAGE=true ;;
    esac
done

echo "=== Mangaba Agent - Frozen Executable Build ==="
echo "Root: $ROOT"
echo ""

# ── 1. Generate tool manifest ────────────────────────────────────
echo "[1/6] Generating tool manifest..."
python scripts/gen_tool_manifest.py
echo ""

# ── 2. Ensure uv is available ────────────────────────────────────
if ! command -v uv &>/dev/null; then
    echo "Installing uv..."
    pip install uv
fi

# ── 3. Install Python dependencies ───────────────────────────────
echo "[2/6] Installing Python dependencies..."
if [ -d .venv ]; then
    source .venv/bin/activate 2>/dev/null || true
fi
uv pip install pyinstaller 2>/dev/null || pip install pyinstaller
echo ""

# ── 4. Build dashboard SPA ──────────────────────────────────────
echo "[3/6] Building dashboard SPA..."
if [ ! -d mangaba_cli/web_dist ]; then
    (cd web && npm install && npm run build)
else
    echo "  web_dist already exists, skipping. Delete mangaba_cli/web_dist to rebuild."
fi
echo ""

# ── 5. Build TUI ────────────────────────────────────────────────
echo "[4/6] Building TUI..."
if [ ! -d mangaba_cli/tui_dist ]; then
    (cd ui-tui && npm install && npm run build)
else
    echo "  tui_dist already exists, skipping. Delete mangaba_cli/tui_dist to rebuild."
fi
echo ""

# ── 6. PyInstaller build ────────────────────────────────────────
echo "[5/6] Running PyInstaller..."
pyinstaller mangaba-agent.spec --noconfirm
echo ""

# ── 7. Create mangaba-dashboard binary (Linux/macOS) ───────────
echo "[6/7] Creating mangaba-dashboard binary..."
if [ -d dist/mangaba ]; then
    cp -r dist/mangaba dist/mangaba-dashboard
    # On Linux/macOS, the binary has no .exe extension — rename the main binary
    if [ -f dist/mangaba-dashboard/mangaba ]; then
        cp dist/mangaba-dashboard/mangaba dist/mangaba-dashboard/mangaba-dashboard
        chmod +x dist/mangaba-dashboard/mangaba-dashboard
        echo "  Created dist/mangaba-dashboard/mangaba-dashboard"
    fi
fi
echo ""

# ── 8. Platform-native packaging ────────────────────────────────
echo "[7/7] Platform-native packaging..."
OS="$(uname -s)"
case "$OS" in
    Linux)
        if [ "$SKIP_PACKAGE" = false ]; then
            echo "  Linux detected → building AppImage..."
            bash "$ROOT/scripts/package_appimage.sh"
        else
            echo "  Linux detected → skipping package (--skip-package)"
            echo "  Manual: bash scripts/package_appimage.sh"
        fi
        ;;
    Darwin)
        if [ "$SKIP_PACKAGE" = false ]; then
            echo "  macOS detected → building .app + .dmg..."
            bash "$ROOT/scripts/package_macos.sh"
        else
            echo "  macOS detected → skipping package (--skip-package)"
            echo "  Manual: bash scripts/package_macos.sh"
        fi
        ;;
    *)
        echo "  Unknown OS ($OS) — skipping native packaging."
        echo "  Manual: tar czf mangaba-$OS-$(uname -m).tar.gz dist/mangaba/"
        ;;
esac
echo ""

# ── 9. Summary ──────────────────────────────────────────────────
echo "=== Build Complete ==="
echo ""
echo "Output directories:"
echo "  dist/mangaba/           - Main CLI bundle"
echo "  dist/mangaba-dashboard/ - Dashboard launcher"
echo "  dist/mangaba-acp/       - ACP adapter bundle"
echo ""

case "$OS" in
    Linux)
        echo "Portable distribution:"
        ls -lh dist/MangabaDashboard-*.AppImage 2>/dev/null || echo "  (AppImage not generated — run scripts/package_appimage.sh)"
        echo ""
        echo "Runtime prerequisites on target system:"
        echo "  - node + npm (for TUI/agent-browser)"
        echo "  - git (for checkpoints)"
        echo "  - ripgrep (for search_files)"
        echo "  - ffmpeg (for media processing, optional)"
        ;;
    Darwin)
        echo "Portable distribution:"
        ls -lh dist/MangabaDashboard-*.dmg 2>/dev/null || echo "  (DMG not generated — run scripts/package_macos.sh)"
        echo ""
        echo "Runtime prerequisites on target system:"
        echo "  - node + npm (for TUI/agent-browser)"
        echo "  - git (for checkpoints)"
        echo "  - ripgrep (for search_files)"
        ;;
    *)
        echo "To package for distribution:"
        echo "  cd dist && tar czf mangaba-$(uname -s)-$(uname -m).tar.gz mangaba/ mangaba-dashboard/"
        ;;
esac
