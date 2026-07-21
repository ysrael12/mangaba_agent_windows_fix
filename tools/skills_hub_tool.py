#!/usr/bin/env python3
"""
ClawHub Skill Search Tool

Lets the agent itself search the ClawHub online skill catalog during a
conversation — the user names what they need, the agent calls
``skill_search`` and presents the candidates, and once the user picks one
the agent calls ``skill_acquire`` to fetch/scan/install it. Mirrors the
REST endpoints ``GET /api/clawhub/search`` and ``POST /api/clawhub/install``
in ``mangaba_cli/web_server.py`` (used by the wizard's search box), calling
the same ``tools.skills_hub`` primitives directly instead of going over HTTP.
"""

import json
import logging

from tools.registry import registry, tool_error

logger = logging.getLogger(__name__)


def skill_search(query: str, limit: int = 10) -> str:
    """Search the ClawHub catalog for skills matching ``query``."""
    from tools.skills_hub import ClawHubSource

    query = (query or "").strip()
    if not query:
        return tool_error("query é obrigatório")

    try:
        source = ClawHubSource()
        results = source.search(query, limit=max(1, min(int(limit or 10), 20)))
    except Exception as e:  # noqa: BLE001
        logger.warning("skill_search failed for %r: %s", query, e)
        return tool_error(f"Falha ao buscar no ClawHub: {e}")

    skills = [
        {
            "slug": r.identifier,
            "name": r.name,
            "description": r.description,
            "tags": r.tags or [],
        }
        for r in results
    ]
    return json.dumps(
        {"success": True, "query": query, "count": len(skills), "skills": skills},
        ensure_ascii=False,
    )


def skill_acquire(slug: str) -> str:
    """Fetch, quarantine, security-scan and install a ClawHub skill by slug."""
    from tools.skills_hub import (
        ClawHubSource,
        SKILLS_DIR,
        install_from_quarantine,
        quarantine_bundle,
    )
    from tools.skills_guard import scan_skill

    slug = (slug or "").strip()
    if not slug:
        return tool_error("slug é obrigatório — use o valor 'slug' de um resultado do skill_search")

    try:
        source = ClawHubSource()
        bundle = source.fetch(slug)
        if bundle is None:
            return tool_error(f"Skill '{slug}' não encontrada no ClawHub")

        q_path = quarantine_bundle(bundle)
        if q_path is None:
            return tool_error("Falha ao colocar a skill em quarentena")

        result = scan_skill(q_path, source="clawhub")
        install_dir = install_from_quarantine(q_path, bundle.name, "", bundle, result)
    except ValueError as e:
        return tool_error(str(e))
    except Exception as e:  # noqa: BLE001
        logger.warning("skill_acquire failed for %r: %s", slug, e)
        return tool_error(f"Falha ao instalar a skill: {e}")

    try:
        from agent.prompt_builder import clear_skills_system_prompt_cache
        clear_skills_system_prompt_cache(clear_snapshot=True)
    except Exception:  # noqa: BLE001
        pass

    return json.dumps(
        {"success": True, "name": bundle.name, "path": str(install_dir.relative_to(SKILLS_DIR))},
        ensure_ascii=False,
    )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

SKILL_SEARCH_SCHEMA = {
    "name": "skill_search",
    "description": (
        "Search the ClawHub online skill catalog for skills matching a name or topic. "
        "Use this when the user asks the agent to find or acquire a skill it doesn't "
        "have yet. Returns candidate skills (slug, name, description, tags) — present "
        "them to the user and only call skill_acquire(slug) after the user picks one."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Skill name or topic to search for, e.g. 'planilhas', 'consulta de CEP', 'exportar PDF'.",
            },
            "limit": {
                "type": "integer",
                "description": "Max results to return (default 10, max 20).",
            },
        },
        "required": ["query"],
    },
}

SKILL_ACQUIRE_SCHEMA = {
    "name": "skill_acquire",
    "description": (
        "Install a skill from the ClawHub catalog by its slug, after the user has "
        "confirmed which one from the skill_search results. Fetches, quarantines and "
        "security-scans the skill bundle before installing it."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {
                "type": "string",
                "description": "The exact 'slug' field from a skill_search result.",
            },
        },
        "required": ["slug"],
    },
}

registry.register(
    name="skill_search",
    toolset="skills",
    schema=SKILL_SEARCH_SCHEMA,
    handler=lambda args, **kw: skill_search(args.get("query", ""), args.get("limit") or 10),
    emoji="🔎",
)

registry.register(
    name="skill_acquire",
    toolset="skills",
    schema=SKILL_ACQUIRE_SCHEMA,
    handler=lambda args, **kw: skill_acquire(args.get("slug", "")),
    emoji="📦",
)
