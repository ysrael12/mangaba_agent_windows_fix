#!/usr/bin/env bash
#
# package_appimage.sh — Create a Linux AppImage from PyInstaller output.
#
# Produces a single portable file: dist/MangabaDashboard-x86_64.AppImage
# No installation required — double-click to run on any Linux distro.
#
# Prerequisites:
#   - dist/mangaba-dashboard/ already built by build_exe.sh or pyinstaller
#   - appimagetool (downloaded automatically if missing)
#   - File already has execute permission (chmod +x)
#
# Usage:
#   ./scripts/package_appimage.sh [--appdir /path/to/custom/appdir]
#

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${MANGABA_VERSION:-$(python -c "import tomllib; print(tomllib.load(open('pyproject.toml','rb'))['project']['version'])" 2>/dev/null || echo "0.0.0-dev")}"
APP_NAME="MangabaDashboard"
APP_ID="dev.mangaba.dashboard"
ARCH="x86_64"
DIST_DIR="$ROOT/dist"
BUILD_DIR="$DIST_DIR/appimage-build"

echo "=== Mangaba Dashboard — AppImage Packaging ==="
echo "Version: $VERSION"
echo "Arch:    $ARCH"
echo ""

# ── 1. Verify PyInstaller output exists ──────────────────────────
DASHBOARD_DIR="$DIST_DIR/mangaba-dashboard"
if [ ! -d "$DASHBOARD_DIR" ]; then
    echo "ERROR: dist/mangaba-dashboard/ not found."
    echo "Run ./scripts/build_exe.sh first."
    exit 1
fi

# Find the main executable (no .exe extension on Linux)
MAIN_BIN="$DASHBOARD_DIR/mangaba-dashboard"
if [ ! -f "$MAIN_BIN" ]; then
    # Fallback: try mangaba (the CLI binary, used as dashboard launcher)
    MAIN_BIN="$DASHBOARD_DIR/mangaba"
fi
if [ ! -f "$MAIN_BIN" ]; then
    echo "ERROR: No executable found in dist/mangaba-dashboard/"
    echo "Expected: mangaba-dashboard or mangaba"
    exit 1
fi

echo "[1/5] Main executable: $MAIN_BIN"

# ── 2. Prepare AppDir structure ──────────────────────────────────
echo "[2/5] Preparing AppDir structure..."
rm -rf "$BUILD_DIR"
APPDIR="$BUILD_DIR/AppDir"
mkdir -p "$APPDIR/usr/bin"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$APPDIR/usr/share/icons/hicolor/512x512/apps"

# Copy the entire PyInstaller bundle
cp -r "$DASHBOARD_DIR"/* "$APPDIR/usr/bin/"
chmod +x "$APPDIR/usr/bin/mangaba-dashboard" "$APPDIR/usr/bin/mangaba" 2>/dev/null || true

# ── 3. Create .desktop file ─────────────────────────────────────
echo "[3/5] Creating .desktop file..."
cat > "$APPDIR/usr/share/applications/${APP_ID}.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Mangaba Dashboard
GenericName=AI Agent Dashboard
Comment=Mangaba Agent — AI assistant with integrated dashboard
Exec=mangaba-dashboard %U
Icon=mangaba-dashboard
Categories=Development;Utility;ArtificialIntelligence;
Keywords=ai;agent;dashboard;mangaba;
Terminal=false
StartupNotify=true
StartupWMClass=mangaba-dashboard
EOF

# Symlink for AppImage compatibility
ln -sf "usr/share/applications/${APP_ID}.desktop" "$APPDIR/${APP_ID}.desktop"

# ── 4. Create icon ──────────────────────────────────────────────
echo "[4/5] Setting up icon..."
# Icon sources: prefer .png, fall back to .ico (convert with ImageMagick)
ICON_PNG="$ROOT/installer/assets/icon.png"
ICON_ICO="$ROOT/instalador mangaba agent/mangaba_ai_logo.ico"
if [ -f "$ICON_PNG" ]; then
    cp "$ICON_PNG" "$APPDIR/usr/share/icons/hicolor/512x512/apps/mangaba-dashboard.png"
    if command -v convert &>/dev/null; then
        convert "$ICON_PNG" -resize 256x256 "$APPDIR/usr/share/icons/hicolor/256x256/apps/mangaba-dashboard.png"
    else
        cp "$ICON_PNG" "$APPDIR/usr/share/icons/hicolor/256x256/apps/mangaba-dashboard.png"
    fi
elif [ -f "$ICON_ICO" ] && command -v convert &>/dev/null; then
    echo "  Converting .ico to .png via ImageMagick..."
    convert "$ICON_ICO" -resize 512x512 "$APPDIR/usr/share/icons/hicolor/512x512/apps/mangaba-dashboard.png"
    convert "$ICON_ICO" -resize 256x256 "$APPDIR/usr/share/icons/hicolor/256x256/apps/mangaba-dashboard.png"
else
    echo "  WARNING: No icon found."
    echo "  Place a 512x512 PNG at installer/assets/icon.png or"
    echo "  install ImageMagick to convert from .ico."
fi

# Symlink icon for AppImage root
ln -sf "usr/share/icons/hicolor/512x512/apps/mangaba-dashboard.png" \
    "$APPDIR/mangaba-dashboard.png"

# Symlink the .desktop file at AppImage root (required by AppImage spec)
ln -sf "usr/share/applications/${APP_ID}.desktop" "$APPDIR/${APP_ID}.desktop"

# ── 5. Create AppRun wrapper ────────────────────────────────────
# This script sets up the environment before launching the real binary.
cat > "$APPDIR/AppRun" << 'APPRUN_EOF'
#!/bin/bash
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="$SELF_DIR/usr/bin:$PATH"

# Prefer bundled Node.js if available
if [ -x "$SELF_DIR/usr/bin/runtime/node/node" ]; then
    export PATH="$SELF_DIR/usr/bin/runtime/node:$PATH"
fi

# Set MANGABA_HOME if not already set
if [ -z "${MANGABA_HOME:-}" ]; then
    export MANGABA_HOME="$HOME/.mangaba"
fi
mkdir -p "$MANGABA_HOME" 2>/dev/null || true

# Launch the dashboard
exec "$SELF_DIR/usr/bin/mangaba-dashboard" "$@"
APPRUN_EOF
chmod +x "$APPDIR/AppRun"

# Also create a CLI entry point
cat > "$APPDIR/usr/bin/mangaba-cli" << 'CLI_EOF'
#!/bin/bash
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SELF_DIR/mangaba" "$@"
CLI_EOF
chmod +x "$APPDIR/usr/bin/mangaba-cli"

# ── 6. Download appimagetool ────────────────────────────────────
echo "[5/5] Building AppImage..."
APPIMAGETOOL="$BUILD_DIR/appimagetool"
if [ ! -f "$APPIMAGETOOL" ]; then
    echo "  Downloading appimagetool..."
    APPIMAGETOOL_URL="https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
    curl -fSL "$APPIMAGETOOL_URL" -o "$APPIMAGETOOL"
    chmod +x "$APPIMAGETOOL"
fi

# Build the AppImage
OUTPUT="$DIST_DIR/${APP_NAME}-${VERSION}-x86_64.AppImage"
ARCH="$ARCH" "$APPIMAGETOOL" "$APPDIR" "$OUTPUT" --no-appstream 2>&1 | tail -5

# ── 7. Summary ──────────────────────────────────────────────────
echo ""
echo "=== AppImage Build Complete ==="
echo ""
echo "Output: $OUTPUT"
echo "Size:   $(du -h "$OUTPUT" | cut -f1)"
echo ""
echo "To install (optional — AppImage is portable):"
echo "  chmod +x $OUTPUT"
echo "  ./$OUTPUT"
echo ""
echo "To install system-wide (adds to app menu):"
echo "  # Move to a persistent location"
echo "  mkdir -p ~/Applications"
echo "  mv $OUTPUT ~/Applications/"
echo "  # The .desktop entry is registered on first run"
echo ""
