"""Generate ``tools/_tool_manifest.json`` from AST parsing of the tool sources.

AST-based tool discovery (``tools/registry.discover_builtin_tools``) reads and
parses ``tools/*.py`` at runtime. That works from source but breaks in a frozen
PyInstaller bundle, where the ``.py`` sources may be absent or compiled. This
script pre-computes the same discovery result into a static JSON manifest that
the frozen build ships and reads instead.

The detection mirrors ``tools/registry.py`` exactly (a top-level
``registry.register(...)`` call, same excluded files) so the manifest matches
what AST discovery would find. Run it before the PyInstaller build.
"""

from __future__ import annotations

import ast
import json
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent.parent / "tools"
OUTPUT = TOOLS_DIR / "_tool_manifest.json"

# Kept in sync with tools/registry.py::discover_builtin_tools excludes.
_EXCLUDED = {"__init__.py", "registry.py", "mcp_tool.py", "_tool_manifest.py"}


def _is_registry_register_call(node: ast.AST) -> bool:
    """True when *node* is a top-level ``registry.register(...)`` expression.

    Mirror of ``tools.registry._is_registry_register_call``.
    """
    if not isinstance(node, ast.Expr) or not isinstance(node.value, ast.Call):
        return False
    func = node.value.func
    return (
        isinstance(func, ast.Attribute)
        and func.attr == "register"
        and isinstance(func.value, ast.Name)
        and func.value.id == "registry"
    )


def _module_registers_tools(filepath: Path) -> bool:
    try:
        tree = ast.parse(filepath.read_text(encoding="utf-8"), filename=str(filepath))
    except (OSError, SyntaxError):
        return False
    return any(_is_registry_register_call(stmt) for stmt in tree.body)


def main() -> int:
    manifest: dict[str, dict[str, object]] = {}
    for py_file in sorted(TOOLS_DIR.glob("*.py")):
        if py_file.name in _EXCLUDED:
            continue
        if _module_registers_tools(py_file):
            module_name = f"tools.{py_file.stem}"
            manifest[py_file.stem] = {"module": module_name, "has_register": True}
            print(f"  [ok] {py_file.stem} -> {module_name}")

    OUTPUT.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"\nManifest generated: {OUTPUT} ({len(manifest)} tools)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
