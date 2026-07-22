# SPEC: Mangaba Agent — Executável Standalone

## Visão Geral

Transformar o mangaba-agent num executável standalone que o usuário final pode
baixar e rodar sem `git clone`, `uv`, `python`, ou `bootstrap.sh`.

**Ferramenta escolhida:** PyInstaller (madura, suporta Windows/Linux/macOS,
gerencia dependências nativas, bundle de dados).

**Formato de saída:** Um diretório (`--onedir`) contendo o executável + libs.
Motivo: `--onefile` extrai tudo para `/tmp` a cada execução (~2GB, lento).
O diretório pode ser distribuído como `.zip` (Windows) ou `.tar.gz` (Linux/macOS).

---

## Pré-requisitos do Usuário Final (Não Freezáveis)

Estes binários **não** podem ser embutidos no executável e devem estar no PATH:

| Ferramenta | Uso | Como detectar |
|------------|-----|---------------|
| `node` + `npm` | TUI (Ink/React), dashboard build, agent-browser | `node --version` |
| `git` | Checkpoints, skill sync, operações de versionamento | `git --version` |
| `ripgrep` (`rg`) | Ferramenta `search_files` | `rg --version` |
| `ffmpeg` | Processamento de mídia (TTS, vídeo) | `ffmpeg -version` |
| `docker` (opcional) | Backend de terminal Docker | `docker --version` |
| `python3` (opcional) | Ferramenta `execute_code` (sandbox) | `python3 --version` |

O executável deve verificar presença destas ferramentas no startup e emitir
avisos amigáveis quando faltarem (já existe `mangaba doctor` — estender).

---

## Estrutura do Bundle

```
mangaba-agent-dist/
├── mangaba.exe                    # Windows (ou mangaba no Linux/macOS)
├── mangaba-acp.exe                # ACP adapter
├── _internal/                     # PyInstaller internals
│   ├── *.pyd / *.so               # Native extensions
│   ├── *.dll / *.so               # Shared libraries
│   └── ...                        # Python stdlib compiled
├── mangaba_agent/                 # Código Python do agent (compiled .pyc)
├── mangaba_cli/                   # Código Python do CLI
├── agent/                         # Provider adapters, memory, caching
├── tools/                         # Tool implementations (source .py preservados)
├── toolsets.py
├── model_tools.py
├── run_agent.py
├── gateway/                       # Messaging gateway
├── cron/                          # Scheduler
├── tui_gateway/                   # TUI Python backend
├── acp_adapter/
├── providers/                     # Model providers
├── plugins/                       # Bundled plugins (plugin.yaml + __init__.py)
│   ├── memory/
│   ├── model-providers/
│   ├── context_engine/
│   └── ...
├── skills/                        # Bundled skills (SKILL.md + scripts/)
├── optional-skills/               # Optional skills
├── locales/                       # i18n YAML files
├── mangaba_cli/
│   ├── web_dist/                  # Dashboard SPA built (Vite output)
│   └── tui_dist/                  # TUI prebuilt (entry.js + deps)
│       └── entry.js
└── ui-tui/                        # TUI fallback (source, for rebuild se necessário)
```

---

## Plano de Implementação

### Fase 1: Adaptar o código para detecção de `sys.frozen`

Criar um módulo central `mangaba_agent/frozen.py`:

```python
import sys
from pathlib import Path

def is_frozen() -> bool:
    return getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')

def get_bundle_dir() -> Path:
    """Diretório-raiz do bundle (onde estão os .pyc, web_dist, etc.)."""
    if is_frozen():
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent

def get_executable_dir() -> Path:
    """Diretório do executável (para writes, configs ao lado do .exe)."""
    if is_frozen():
        return Path(sys.executable).parent
    return Path.cwd()

def resource_path(relative: str) -> Path:
    """Resolve um caminho relativo ao bundle."""
    return get_bundle_dir() / relative
```

### Fase 2: Corrigir as 30+ referências `Path(__file__)`

Cada referência crítica deve ser atualizada:

| Arquivo | Linha(s) | Atual | Novo |
|---------|----------|-------|------|
| `tools/registry.py` | 59 | `Path(__file__).resolve().parent` | `resource_path("tools")` |
| `mangaba_cli/plugins.py` | 65 | `Path(__file__).resolve().parent.parent / "plugins"` | `resource_path("plugins")` |
| `providers/__init__.py` | 49 | `Path(__file__).resolve().parent.parent / "plugins" / "model-providers"` | `resource_path("plugins/model-providers")` |
| `mangaba_cli/web_server.py` | 32 | `Path(__file__).parent.parent.resolve()` | `get_bundle_dir()` |
| `mangaba_cli/web_server.py` | 79 | `Path(__file__).parent / "web_dist"` | `resource_path("mangaba_cli/web_dist")` |
| `mangaba_cli/main.py` | 170 | `Path(__file__).parent.parent.resolve()` | `get_bundle_dir()` |
| `mangaba_cli/main.py` | 1296 | `Path(__file__).parent` | `resource_path("mangaba_cli")` |
| `mangaba_cli/config.py` | 228, 370 | `Path(__file__).parent.parent.resolve()` | `get_bundle_dir()` |
| `mangaba_cli/banner.py` | 254, 277 | `Path(__file__).parent.parent.resolve()` | `get_bundle_dir()` |
| `tools/skills_sync.py` | 49 | `Path(__file__).parent.parent / "skills"` | `resource_path("skills")` |
| `tools/skills_hub.py` | 2549 | `Path(__file__).parent.parent / "optional-skills"` | `resource_path("optional-skills")` |
| `agent/i18n.py` | 94 | `Path(__file__).resolve().parent.parent / "locales"` | `resource_path("locales")` |
| `gateway/run.py` | 676, 688 | `Path(__file__).parent.parent` | `get_bundle_dir()` |
| `acp_adapter/entry.py` | 237 | `Path(__file__).resolve().parent.parent` | `get_bundle_dir()` |
| `mangaba_cli/gateway.py` | 18 | `Path(__file__).parent.parent.resolve()` | `get_bundle_dir()` |
| `tools/code_execution_tool.py` | 1201 | `os.path.dirname(os.path.dirname(os.path.abspath(__file__)))` | `str(get_bundle_dir())` |
| `tools/cronjob_tools.py` | 21 | `Path(__file__).parent.parent` | `get_bundle_dir()` |
| `tools/browser_tool.py` | 1820 | `Path(__file__).parent.parent` | `get_bundle_dir()` |
| `mangaba_agent/trajectory_compressor.py` | 55 | `Path(__file__).parent / ".env"` | `resource_path("mangaba_agent/.env")` |
| `mangaba_agent/run_agent.py` | 94 | `Path(__file__).parent / '.env'` | `resource_path("mangaba_agent/.env")` |

### Fase 3: Substituir AST-based tool discovery

O `tools/registry.py` faz AST parsing de `.py` fonte — isso falha no bundle.
Criar um manifest estático `tools/_tool_manifest.json` gerado em build time:

```json
{
  "terminal": {"module": "tools.terminal_tool", "has_register": true},
  "search_files": {"module": "tools.search_tool", "has_register": true},
  "web_search": {"module": "tools.web_search_tool", "has_register": true},
  ...
}
```

`discover_builtin_tools()` no frozen mode lê o manifest em vez de AST:
- Sem frozen: comportamento atual (AST discovery)
- Com frozen: importa módulos listados no manifest

O manifest é gerado por um script `scripts/gen_tool_manifest.py` que percorre
`tools/*.py` e salva o JSON. Executado antes do PyInstaller build.

### Fase 4: Adaptar plugin/provider discovery

**Plugins:** `mangaba_cli/plugins.py` — o path `Path(__file__).parent.parent / "plugins"`
é corrigido via `resource_path("plugins")`. Para plugins do usuário
(`~/.mangaba/plugins/`), nada muda — é filesystem externo.

**Providers:** `providers/__init__.py` — substituir `Path(__file__).resolve().parent.parent / "plugins" / "model-providers"`
por `resource_path("plugins/model-providers")`.

**Pip entry points:** `importlib.metadata.entry_points()` — no bundle, entry points
de pip-installed plugins não existem. O código já faz fallback gracefully
(log e skip). Não requer mudança.

### Fase 5: Adaptar subprocess spawning

**`execute_code`:** Detectar `sys.frozen` e usar `sys.executable` como interpreter
(pois o executável PyInstaller suporta `--exec-arg=-c`). Se o usuário tem
Python standalone no PATH, preferir `python3`.

**`delegate_tool`:** Spawna subprocessos — detectar frozen e usar `sys.executable`
como binário base, passando `--exec-arg` ou script temp.

**TUI launcher:** Não muda — sempre requer `node` no PATH. O `entry.js`
pré-compilado é bundlado em `mangaba_cli/tui_dist/`.

### Fase 6: PyInstaller spec file

Criar `mangaba-agent.spec`:

```python
# mangaba-agent.spec
# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

block_cipher = None
ROOT = Path('.').resolve()

# ── Dados a incluir no bundle ──────────────────────────────────
datas = [
    # Dashboard SPA (Vite build output)
    (str(ROOT / 'mangaba_cli' / 'web_dist'), 'mangaba_cli/web_dist'),
    # TUI prebuilt
    (str(ROOT / 'mangaba_cli' / 'tui_dist'), 'mangaba_cli/tui_dist'),
    # Bundled skills
    (str(ROOT / 'skills'), 'skills'),
    # Optional skills
    (str(ROOT / 'optional-skills'), 'optional-skills'),
    # i18n locales
    (str(ROOT / 'locales'), 'locales'),
    # Bundled plugins (plugin.yaml + __init__.py)
    (str(ROOT / 'plugins'), 'plugins'),
    # Tool manifest (gerado em build time)
    (str(ROOT / 'tools' / '_tool_manifest.json'), 'tools'),
    # Tool source files (necessários para discovery em fallback)
    # NOTA: incluir apenas se AST discovery for mantida como fallback
]

# ── Hidden imports (PyInstaller não detecta automaticamente) ────
hiddenimports = [
    # Core
    'mangaba_agent.mangaba_bootstrap',
    'mangaba_agent.mangaba_constants',
    'mangaba_agent.run_agent',
    'mangaba_agent.cli',
    'mangaba_agent.trajectory_compressor',
    'mangaba_agent.toolset_distributions',
    'mangaba_agent.batch_runner',
    # CLI
    'mangaba_cli.main',
    'mangaba_cli.config',
    'mangaba_cli.plugins',
    'mangaba_cli.skin_engine',
    'mangaba_cli.setup',
    'mangaba_cli.banner',
    'mangaba_cli.curator',
    'mangaba_cli.kanban',
    # Agent internals
    'agent.auxiliary_client',
    'agent.context_engine',
    'agent.display',
    'agent.memory_manager',
    'agent.memory_provider',
    'agent.prompt_builder',
    'agent.skill_commands',
    'agent.skill_utils',
    'agent.process_bootstrap',
    # Tools
    'tools.registry',
    'tools.terminal_tool',
    'tools.search_tool',
    'tools.web_search_tool',
    'tools.web_extract_tool',
    'tools.read_file_tool',
    'tools.write_file_tool',
    'tools.patch_tool',
    'tools.vision_tool',
    'tools.browser_tool',
    'tools.code_execution_tool',
    'tools.delegate_tool',
    'tools.memory_tool',
    'tools.todo_tool',
    'tools.cronjob_tools',
    'tools.skill_manage_tool',
    'tools.skills_hub',
    'tools.skills_sync',
    'tools.file_ops_tool',
    'tools.tts_tool',
    'tools.image_gen_tool',
    'tools.checkpoint_manager',
    'tools.environments.local',
    # Gateway
    'gateway.run',
    'gateway.config',
    'gateway.status',
    'gateway.hooks',
    # Providers
    'providers.__init__',
    # Cron
    'cron.jobs',
    'cron.scheduler',
    # TUI gateway
    'tui_gateway.server',
    'tui_gateway.transport',
    # ACP
    'acp_adapter.entry',
    # Native extensions
    'psutil',
    'PyMuPDF',
    'fitz',
    'pydantic',
    'yaml',
    'rich',
    'prompt_toolkit',
    'openai',
    'httpx',
    'tenacity',
    'croniter',
    'jinja2',
    'jwt',
    'dotenv',
]

a = Analysis(
    ['mangaba_cli/main.py'],          # Entry point principal
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',     # GUI — não necessário
        'matplotlib',  # Pesado e não usado
        'numpy',       # Só se.Optional deps
        'pandas',
        'scipy',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ── Executável principal: mangaba ──────────────────────────────
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='mangaba',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,          # CLI interativo — precisa de console
    icon=None,             # Adicionar ícone .ico/.png depois
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='mangaba',
)

# ── Executável secundário: mangaba-acp ─────────────────────────
exe_acp = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='mangaba-acp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)

coll_acp = COLLECT(
    exe_acp,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='mangaba-acp',
)
```

### Fase 7: Script de build

Criar `scripts/build_exe.sh` (Linux/macOS) e `scripts/build_exe.ps1` (Windows):

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Mangaba Agent — Build do Executável ==="

# 1. Gerar tool manifest
python scripts/gen_tool_manifest.py

# 2. Build do dashboard (se não existir)
if [ ! -d mangaba_cli/web_dist ]; then
    echo "Building dashboard..."
    (cd web && npm install && npm run build)
fi

# 3. Build do TUI (se não existir)
if [ ! -d mangaba_cli/tui_dist ]; then
    echo "Building TUI..."
    (cd ui-tui && npm install && npm run build)
fi

# 4. Instalar PyInstaller + deps
pip install pyinstaller

# 5. Gerar spec JSON do tool manifest
python scripts/gen_tool_manifest.py

# 6. PyInstaller build
pyinstaller mangaba-agent.spec --noconfirm

# 7. Copiar para dist/
echo "Build completo em: dist/mangaba/"
```

### Fase 8: Gerador de tool manifest

Criar `scripts/gen_tool_manifest.py`:

```python
"""Gera tools/_tool_manifest.json a partir de AST parsing dos fontes."""
import ast, json, sys
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent.parent / "tools"
OUTPUT = TOOLS_DIR / "_tool_manifest.json"

def has_registry_register(filepath: Path) -> bool:
    try:
        tree = ast.parse(filepath.read_text(encoding="utf-8"))
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Attribute) and func.attr == "register":
                    return True
                if isinstance(func, ast.Name) and func.id == "register":
                    return True
    except Exception:
        pass
    return False

def main():
    manifest = {}
    for py_file in sorted(TOOLS_DIR.glob("*.py")):
        if py_file.stem in ("__init__", "registry", "_tool_manifest"):
            continue
        if has_registry_register(py_file):
            module_name = f"tools.{py_file.stem}"
            manifest[py_file.stem] = {
                "module": module_name,
                "has_register": True,
            }
            print(f"  ✓ {py_file.stem} → {module_name}")

    OUTPUT.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    print(f"\nManifest gerado: {OUTPUT} ({len(manifest)} tools)")

if __name__ == "__main__":
    main()
```

### Fase 9: CI/CD — GitHub Actions

Adicionar workflow `.github/workflows/build-exe.yml`:

```yaml
name: Build Executável

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install uv
        run: pip install uv

      - name: Install Python deps
        run: uv pip install -e ".[all]" pyinstaller

      - name: Build Dashboard
        run: cd web && npm install && npm run build

      - name: Build TUI
        run: cd ui-tui && npm install && npm run build

      - name: Generate tool manifest
        run: python scripts/gen_tool_manifest.py

      - name: PyInstaller Build
        run: pyinstaller mangaba-agent.spec --noconfirm

      - name: Package
        shell: bash
        run: |
          cd dist
          if [[ "${{ runner.os }}" == "Windows" ]]; then
            7z a -tzip mangaba-${{ runner.os }}-x64.zip mangaba/
          else
            tar czf mangaba-${{ runner.os }}-x64.tar.gz mangaba/
          fi

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: mangaba-${{ runner.os }}-x64
          path: dist/mangaba-*
```

---

## Checklist de Módulos Críticos

Cada módulo que usa `Path(__file__)` para localizar recursos precisa ser
adaptado. Status:

| Módulo | Criticidade | Esforço | Notas |
|--------|-------------|---------|-------|
| `tools/registry.py` | CRÍTICO | Alto | Substituir AST discovery por manifest JSON |
| `mangaba_cli/plugins.py` | CRÍTICO | Médio | Corrigir path do bundled plugins dir |
| `providers/__init__.py` | CRÍTICO | Médio | Corrigir path do model-providers dir |
| `mangaba_cli/web_server.py` | ALTO | Baixo | Corrigir web_dist + PROJECT_ROOT |
| `mangaba_cli/main.py` | ALTO | Baixo | Corrigir PROJECT_ROOT |
| `mangaba_cli/config.py` | ALTO | Baixo | Corrigir project_root |
| `mangaba_cli/banner.py` | MÉDIO | Baixo | Corrigir repo_dir |
| `agent/i18n.py` | MÉDIO | Baixo | Corrigir locales dir |
| `tools/skills_sync.py` | MÉDIO | Baixo | Corrigir bundled skills dir |
| `tools/skills_hub.py` | MÉDIO | Baixo | Corrigir optional-skills dir |
| `gateway/run.py` | MÉDIO | Baixo | Corrigir sys.path + project env |
| `tools/code_execution_tool.py` | ALTO | Médio | Adaptar subprocess Python discovery |
| `tools/delegate_tool.py` | ALTO | Médio | Adaptar subprocess spawning |
| `tools/browser_tool.py` | BAIXO | Baixo | agent-browser já é externo |
| `tools/cronjob_tools.py` | BAIXO | Baixo | sys.path insert |

---

## Decisões de Design

### Por que `--onedir` e não `--onefile`?

- `--onefile` extrai ~2GB para `/tmp` a cada execução (lento, consome disco)
- `--onedir` permite updates incrementais (só atualizar binário, manter dados)
- Usuários podem inspecionar/modificar o bundle (plugins, skills customizadas)
- Anti-vírus não bloqueiam (pela extração de tempfile)

### Por que não Nuitka ou cx_Freeze?

- **Nuitka**: compila C — build 10-30x mais lento, problemas com importlib dinâmico
- **cx_Freeze**: menos suporte a data files e menos ativo que PyInstaller
- **PyInstaller**: maior ecossistema, melhor suporte a hidden imports, mais docs

### Como lidar com `execute_code` (Python sandbox)?

Quando `sys.frozen == True`:
1. Se `python3` está no PATH → usar `python3 -c "..."` (preferido)
2. Se não → usar `sys.executable` com `--exec-arg=-c` (PyInstaller suporta)
3. Se nenhum → erro amigável "execute_code requer Python 3.11+ no PATH"

### Como lidar com o TUI (Node.js)?

- O TUI **não** é freezável (é Ink/React/Node.js)
- O bundle inclui `mangaba_cli/tui_dist/entry.js` (pré-compilado)
- O executável detecta `node` no PATH → se ausente, desabilita TUI com aviso
- Dashboard `/chat` continua funcionando (usa Python backend por trás)

### Como lidar com Playwright (browser tool)?

- Playwright browsers (~400MB) **não** são bundlados
- Usuário roda `playwright install chromium` separadamente
- O executável detecta e avisa se faltar (extendendo `mangaba doctor`)

---

## Ordens de Build

### Windows (Git Bash)
```bash
scripts/build_exe.sh
# Saída: dist/mangaba/
# Empacotar: dist/mangaba-win-x64.zip
```

### Linux
```bash
scripts/build_exe.sh
# Saída: dist/mangaba/
# Empacotar: dist/mangaba-linux-x64.tar.gz
```

### macOS
```bash
scripts/build_exe.sh
# Saída: dist/mangaba.app/ ou dist/mangaba/
# Empacotar: dist/mangaba-macos-arm64.tar.gz
```

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| PyInstaller não encontra hidden import | Executável crasha no import | Testar import completo em subprocess |
| `__file__` em `.pyc` não resolve corretamente | Path resolution falha | Usar `resource_path()` centralizado |
| Native extension incompatível com plataforma | Crash em runtime | Build CI multi-plataforma |
| Atualização quebra compatibilidade com manifest | Tools não são descobertas | Validar manifest no `mangaba doctor` |
| Usuário sem node/ripgrep/ffmpeg no PATH | Funcionalidades limitadas | Verificar e orientar no startup |

---

## Próximos Passos Imediatos

1. Criar `mangaba_agent/frozen.py` com `is_frozen()`, `get_bundle_dir()`, `resource_path()`
2. Criar `scripts/gen_tool_manifest.py`
3. Adaptar `tools/registry.py` para suportar manifest JSON
4. Adaptar os 20+ arquivos com `Path(__file__)` para usar `resource_path()`
5. Criar `mangaba-agent.spec`
6. Criar `scripts/build_exe.sh` e `scripts/build_exe.ps1`
7. Testar build Windows primeiro (plataforma do dev)
8. Criar workflow CI multi-plataforma
