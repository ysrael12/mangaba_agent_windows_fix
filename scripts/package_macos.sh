#!/usr/bin/env bash
#
# package_macos.sh — Create a macOS .app bundle and .dmg disk image.
#
# Produces:
#   dist/MangabaDashboard.app     — macOS application bundle
#   dist/MangabaDashboard-x64.dmg — Disk image for distribution
#
# Prerequisites:
#   - dist/mangaba-dashboard/ already built by build_exe.sh or pyinstaller
#   - macOS with Xcode Command Line Tools (for hdiutil, codesign)
#   - iconutil (included with macOS) for .icns conversion
#
# Usage:
#   ./scripts/package_macos.sh [--sign "Developer ID Application: ..."]
#

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${MANGABA_VERSION:-$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml','rb'))['project']['version'])" 2>/dev/null || echo "0.0.0-dev")}"
APP_NAME="MangabaDashboard"
BUNDLE_ID="dev.mangaba.dashboard"
DIST_DIR="$ROOT/dist"
BUILD_DIR="$DIST_DIR/macos-build"
SIGN_IDENTITY=""

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --sign) SIGN_IDENTITY="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "=== Mangaba Dashboard — macOS .app + .dmg Packaging ==="
echo "Version: $VERSION"
echo "Bundle:  $BUNDLE_ID"
echo ""

# ── 1. Verify PyInstaller output exists ──────────────────────────
DASHBOARD_DIR="$DIST_DIR/mangaba-dashboard"
if [ ! -d "$DASHBOARD_DIR" ]; then
    echo "ERROR: dist/mangaba-dashboard/ not found."
    echo "Run ./scripts/build_exe.sh first."
    exit 1
fi

MAIN_BIN="$DASHBOARD_DIR/mangaba-dashboard"
if [ ! -f "$MAIN_BIN" ]; then
    MAIN_BIN="$DASHBOARD_DIR/mangaba"
fi
if [ ! -f "$MAIN_BIN" ]; then
    echo "ERROR: No executable found in dist/mangaba-dashboard/"
    exit 1
fi

echo "[1/6] Main executable: $MAIN_BIN"

# ── 2. Create .app bundle structure ─────────────────────────────
echo "[2/6] Creating .app bundle..."
rm -rf "$BUILD_DIR"
APP="$BUILD_DIR/$APP_NAME.app"
CONTENTS="$APP/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"

mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES"

# Copy the entire PyInstaller bundle into Resources/
# The executable in MacOS/ will be a wrapper that launches from Resources/
cp -r "$DASHBOARD_DIR"/* "$RESOURCES/"

# ── 3. Create the launcher script ───────────────────────────────
# macOS .app bundles need a wrapper that cd's to the right dir
cat > "$MACOS_DIR/$APP_NAME" << 'LAUNCHER_EOF'
#!/bin/bash
# Mangaba Dashboard launcher — macOS .app wrapper
# Resolves the real bundle directory and launches mangaba-dashboard.

BUNDLE_DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"

# Prefer bundled Node if available
if [ -x "$BUNDLE_DIR/runtime/node/bin/node" ]; then
    export PATH="$BUNDLE_DIR/runtime/node/bin:$PATH"
fi

# Set MANGABA_HOME
if [ -z "${MANGABA_HOME:-}" ]; then
    export MANGABA_HOME="$HOME/.mangaba"
fi
mkdir -p "$MANGABA_HOME" 2>/dev/null || true

# Ensure the web dist is findable
if [ -z "${MANGABA_WEB_DIST:-}" ]; then
    if [ -d "$BUNDLE_DIR/mangaba_cli/web_dist" ]; then
        export MANGABA_WEB_DIST="$BUNDLE_DIR/mangaba_cli/web_dist"
    fi
fi

# Launch
exec "$BUNDLE_DIR/mangaba-dashboard" "$@"
LAUNCHER_EOF
chmod +x "$MACOS_DIR/$APP_NAME"

# ── 4. Create Info.plist ────────────────────────────────────────
echo "[3/6] Creating Info.plist..."
cat > "$CONTENTS/Info.plist" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Mangaba Dashboard</string>
    <key>CFBundleDisplayName</key>
    <string>Mangaba Dashboard</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.developer-tools</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright (c) Mangaba. MIT License.</string>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>mangaba</string>
            </array>
            <key>CFBundleURLName</key>
            <string>dev.mangaba.dashboard</string>
        </dict>
    </array>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
PLIST_EOF

# ── 5. Create .icns icon ────────────────────────────────────────
echo "[4/6] Creating .icns icon..."
ICON_PNG="$ROOT/installer/assets/icon.png"
ICON_ICO="$ROOT/instalador mangaba agent/mangaba_ai_logo.ico"
ICONSET="$BUILD_DIR/AppIcon.iconset"
ICNS="$RESOURCES/AppIcon.icns"

mkdir -p "$ICONSET"

# Resolve the source icon: prefer .png, fall back to .ico conversion
SRC_ICON=""
if [ -f "$ICON_PNG" ]; then
    SRC_ICON="$ICON_PNG"
elif [ -f "$ICON_ICO" ]; then
    echo "  Converting .ico to .png via sips..."
    # sips can read .ico directly on macOS
    SRC_ICON="$BUILD_DIR/icon_converted.png"
    sips -s format png "$ICON_ICO" --out "$SRC_ICON" >/dev/null 2>&1 || SRC_ICON=""
fi

if [ -n "$SRC_ICON" ] && [ -f "$SRC_ICON" ]; then
    # Generate all required sizes from the source icon
    SIZES=(16 32 64 128 256 512)
    for SIZE in "${SIZES[@]}"; do
        sips -z "$SIZE" "$SIZE" "$SRC_ICON" --out "$ICONSET/icon_${SIZE}x${SIZE}.png" >/dev/null 2>&1
        DOUBLE=$((SIZE * 2))
        if [ "$DOUBLE" -le 1024 ]; then
            sips -z "$DOUBLE" "$DOUBLE" "$SRC_ICON" --out "$ICONSET/icon_${SIZE}x${SIZE}@2x.png" >/dev/null 2>&1
        fi
    done
    iconutil -c icns "$ICONSET" -o "$ICNS"
    echo "  Created AppIcon.icns"
else
    echo "  WARNING: No icon found at installer/assets/icon.png or"
    echo "  'instalador mangaba agent/mangaba_ai_logo.ico'."
    echo "  Place a 1024x1024 PNG at installer/assets/icon.png before release."
fi

# ── 6. Code sign (optional) ─────────────────────────────────────
if [ -n "$SIGN_IDENTITY" ]; then
    echo "[5/6] Code signing with: $SIGN_IDENTITY"
    codesign --force --deep --sign "$SIGN_IDENTITY" \
        --options runtime \
        --timestamp \
        "$APP"
    echo "  Signed successfully."
else
    echo "[5/6] Skipping code signing (no --sign identity provided)."
    echo "  To sign: ./scripts/package_macos.sh --sign 'Developer ID Application: Your Name (TEAMID)'"
fi

# ── 7. Create .dmg ──────────────────────────────────────────────
echo "[6/6] Creating .dmg disk image..."
DMG_OUTPUT="$DIST_DIR/${APP_NAME}-${VERSION}-$(uname -m).dmg"
DMG_TEMP="$BUILD_DIR/dmg-temp"

rm -rf "$DMG_TEMP"
mkdir -p "$DMG_TEMP"
cp -r "$APP" "$DMG_TEMP/"

# Create a symlink to /Applications for drag-to-install
ln -sf /Applications "$DMG_TEMP/Applications"

# Calculate DMG size (bundle size + 20MB headroom)
BUNDLE_SIZE=$(du -sm "$DMG_TEMP" | cut -f1)
DMG_SIZE=$((BUNDLE_SIZE + 20))

# Build the DMG
hdiutil create \
    -volname "$APP_NAME" \
    -srcfolder "$DMG_TEMP" \
    -ov \
    -format UDZO \
    -size "${DMG_SIZE}m" \
    "$DMG_OUTPUT"

# ── 8. Summary ──────────────────────────────────────────────────
echo ""
echo "=== macOS Build Complete ==="
echo ""
echo "Output:"
echo "  .app:  $APP"
echo "  .dmg:  $DMG_OUTPUT"
echo "  Size:  $(du -h "$DMG_OUTPUT" | cut -f1)"
echo ""
echo "To test locally:"
echo "  open $DMG_OUTPUT"
echo "  # Drag Mangaba Dashboard to Applications"
echo ""
echo "To distribute:"
echo "  Upload $DMG_OUTPUT to GitHub Releases or your website."
echo "  Users double-click .dmg → drag to Applications → done."
echo ""
if [ -z "$SIGN_IDENTITY" ]; then
    echo "⚠  NOT SIGNED — Gatekeeper will block on fresh macOS installs."
    echo "  To fix: re-run with --sign 'Developer ID Application: ...'"
    echo ""
fi
