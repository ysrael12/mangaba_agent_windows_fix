#!/bin/bash
set -euo pipefail
cd "/mnt/c/Users/smart/Desktop/Projetos/lab mangaba/mangaba-agent"
echo '=== Step 1: Tool manifest ==='
python3 scripts/gen_tool_manifest.py
echo '=== Step 2: Setup pyinstaller ==='
pip install pyinstaller --break-system-packages 2>&1 | tail -3
echo '=== Step 3: PyInstaller build ==='
pyinstaller mangaba-agent.spec --noconfirm 2>&1 | tail -20
echo '=== Step 4: Create dashboard dir ==='
cp -r dist/mangaba dist/mangaba-dashboard
cp dist/mangaba-dashboard/mangaba dist/mangaba-dashboard/mangaba-dashboard
echo '=== Step 5: Package AppImage ==='
bash scripts/package_appimage.sh 2>&1 | tail -20
echo '=== DONE ==='
