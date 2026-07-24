#
# build_exe.ps1 - Build mangaba-agent frozen executables (Windows).
#
# Produces dist/mangaba/ with the mangaba.exe and mangaba-acp.exe binaries.
#
# Prerequisites:
#   - Python 3.11+ on PATH
#   - Node.js 20+ and npm on PATH
#
# Usage:
#   .\scripts\build_exe.ps1
#

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "=== Mangaba Agent - Frozen Executable Build ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

# ── 1. Generate tool manifest ────────────────────────────────────
Write-Host "[1/6] Generating tool manifest..." -ForegroundColor Yellow
python scripts\gen_tool_manifest.py
Write-Host ""

# ── 2. Install Python dependencies ───────────────────────────────
Write-Host "[2/6] Installing Python dependencies..." -ForegroundColor Yellow
if (Get-Command pyinstaller -ErrorAction SilentlyContinue) {
    Write-Host "  PyInstaller already installed."
} else {
    pip install pyinstaller
}
# `voice` (faster-whisper/ctranslate2/onnxruntime/numpy) is intentionally
# excluded from the pip/uv `[all]` extra -- it's meant to be lazy-installed
# at runtime via tools/lazy_deps.py. That lazy-install path shells out to
# `sys.executable -m pip`, which doesn't work once frozen (mangaba.exe has
# no python.exe/pip to invoke). So the frozen build bundles it directly
# (see mangaba-agent.spec hiddenimports) and needs the exact same specs
# from pyproject.toml's `voice` extra present in THIS venv before
# PyInstaller runs, regardless of what extras were synced earlier.
pip install "faster-whisper==1.2.1" "sounddevice==0.5.5" "numpy==2.4.3"
Write-Host ""

# ── 3. Build dashboard SPA ──────────────────────────────────────
Write-Host "[3/6] Building dashboard SPA..." -ForegroundColor Yellow
if (-not (Test-Path "mangaba_cli\web_dist")) {
    Push-Location web
    npm install
    npm run build
    Pop-Location
} else {
    Write-Host "  web_dist already exists, skipping."
}
Write-Host ""

# ── 4. Build TUI ────────────────────────────────────────────────
Write-Host "[4/6] Building TUI..." -ForegroundColor Yellow
if (-not (Test-Path "mangaba_cli\tui_dist")) {
    Push-Location ui-tui
    npm install
    npm run build
    Pop-Location
} else {
    Write-Host "  tui_dist already exists, skipping."
}
Write-Host ""

# ── 5. PyInstaller build ────────────────────────────────────────
Write-Host "[5/6] Running PyInstaller..." -ForegroundColor Yellow
pyinstaller mangaba-agent.spec --noconfirm
Write-Host ""

# ── 6. Create mangaba-dashboard.exe (renamed copy) ─────────────
Write-Host "[6/7] Creating mangaba-dashboard.exe..." -ForegroundColor Yellow
if (Test-Path "dist\mangaba") {
    Copy-Item -Path "dist\mangaba" -Destination "dist\mangaba-dashboard" -Recurse -Force
    if (Test-Path "dist\mangaba-dashboard\mangaba.exe") {
        Copy-Item -Path "dist\mangaba-dashboard\mangaba.exe" -Destination "dist\mangaba-dashboard\mangaba-dashboard.exe" -Force
        Write-Host "  Created dist\mangaba-dashboard\mangaba-dashboard.exe"
    }
}
Write-Host ""

# ── 7. Summary ──────────────────────────────────────────────────
Write-Host "[7/7] Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Output directories:" -ForegroundColor Cyan
Write-Host "  dist\mangaba\           - Main CLI bundle"
Write-Host "  dist\mangaba-dashboard\ - Dashboard launcher (double-click to start)"
Write-Host "  dist\mangaba-acp\       - ACP adapter bundle"
Write-Host ""
Write-Host "To package for distribution:" -ForegroundColor Cyan
Write-Host "  Compress-Archive -Path dist\mangaba,dist\mangaba-dashboard -DestinationPath dist\mangaba-win-x64.zip"
Write-Host ""
Write-Host "Runtime prerequisites on target system:" -ForegroundColor Cyan
Write-Host "  - node + npm (for TUI)"
Write-Host "  - git (for checkpoints)"
Write-Host "  - ripgrep (for search_files)"
Write-Host "  - ffmpeg (for media processing, optional)"
