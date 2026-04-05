"""
Pack Researcher skill for Hermes.

Hermes uses this to research trending AI automation use cases and
synthesize a structured pack recommendation. Runs weekly via cron.

The skill uses web_search + web_fetch to pull current signals from:
  - Hacker News (show HN, ask HN, who's hiring)
  - Reddit (r/ChatGPT, r/MachineLearning, r/entrepreneur, r/automation)
  - GitHub trending repos
  - ProductHunt latest AI tools

Then synthesizes a pack recommendation doc with a Free vs Pro decision.

Output is written to HERMES_HOME/pack_recommendations/<YYYY-WW>.md
and optionally posted to a configured delivery channel.
"""

import os
import json
import datetime
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional

HERMES_HOME = os.environ.get("HERMES_HOME", "/opt/hermes")
RECOMMENDATIONS_DIR = os.path.join(HERMES_HOME, "pack_recommendations")

# Research sources
SOURCES = {
    "hackernews_ask": "https://hn.algolia.com/api/v1/search?query=AI+automation+use+case&tags=ask_hn&hitsPerPage=10",
    "hackernews_show": "https://hn.algolia.com/api/v1/search?query=AI+agent+workflow&tags=show_hn&hitsPerPage=10",
    "github_trending_ai": "https://api.github.com/search/repositories?q=ai+agent+automation&sort=stars&order=desc&per_page=10",
}


def _fetch(url: str, timeout: int = 15) -> Optional[str]:
    """Fetch a URL and return text content, or None on error."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ClawHQ-Hermes/1.0; research-bot)",
        "Accept": "application/json, text/plain, */*",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception:
        return None


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def get_research_signals() -> str:
    """
    Fetch current AI automation signals from public sources.

    Returns a JSON object with recent trends from Hacker News and GitHub.
    Call this first before synthesizing a pack recommendation.
    """
    signals = {}

    # Hacker News — Ask HN about AI use cases
    raw = _fetch(SOURCES["hackernews_ask"])
    if raw:
        try:
            data = json.loads(raw)
            hits = data.get("hits", [])
            signals["hackernews_ask"] = [
                {
                    "title": h.get("title"),
                    "points": h.get("points"),
                    "num_comments": h.get("num_comments"),
                    "url": h.get("url"),
                }
                for h in hits[:8]
            ]
        except Exception:
            signals["hackernews_ask"] = []

    # Hacker News — Show HN AI agents
    raw = _fetch(SOURCES["hackernews_show"])
    if raw:
        try:
            data = json.loads(raw)
            hits = data.get("hits", [])
            signals["hackernews_show"] = [
                {
                    "title": h.get("title"),
                    "points": h.get("points"),
                    "num_comments": h.get("num_comments"),
                }
                for h in hits[:8]
            ]
        except Exception:
            signals["hackernews_show"] = []

    # GitHub trending AI repos
    raw = _fetch(SOURCES["github_trending_ai"])
    if raw:
        try:
            data = json.loads(raw)
            items = data.get("items", [])
            signals["github_trending"] = [
                {
                    "name": r.get("name"),
                    "description": r.get("description"),
                    "stars": r.get("stargazers_count"),
                    "language": r.get("language"),
                }
                for r in items[:8]
            ]
        except Exception:
            signals["github_trending"] = []

    signals["fetched_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    return json.dumps(signals, indent=2)


def write_pack_recommendation(recommendation_markdown: str) -> str:
    """
    Write a pack recommendation to disk.

    Call this after you have synthesized a full pack recommendation.
    The recommendation should follow this structure:

    # Pack Recommendation: <Pack Name>
    **Week:** YYYY-WW
    **Researched by:** Hermes

    ## Problem
    <What pain or need this addresses>

    ## Pack Overview
    <Name, tagline, 2–3 sentence description>

    ## Agents
    - <agent-id>: <role and task description>

    ## Required Tools / MCPs
    - <tool name>: <why it's needed>

    ## Tier Decision: Free / Pro
    **Tier:** Free | Pro
    **Reasoning:** <why Free or Pro — audience size, willingness to pay, competitive pressure>

    ## Target User
    <Who specifically would install this>

    ## Confidence
    High / Medium / Low — <one line rationale>

    Args:
        recommendation_markdown: The full markdown recommendation document.

    Returns:
        Path to the written file, or an error message.
    """
    _ensure_dir(RECOMMENDATIONS_DIR)

    now = datetime.datetime.utcnow()
    week = now.strftime("%Y-W%W")
    filename = f"{week}.md"
    path = os.path.join(RECOMMENDATIONS_DIR, filename)

    # If file exists, append with a separator
    if os.path.exists(path):
        with open(path, "a", encoding="utf-8") as f:
            f.write("\n\n---\n\n")
            f.write(recommendation_markdown)
    else:
        with open(path, "w", encoding="utf-8") as f:
            f.write(recommendation_markdown)

    return f"Recommendation written to {path}"


def list_past_recommendations(limit: int = 10) -> str:
    """
    List past pack recommendations by week.

    Returns a JSON list of {week, path, preview} for recent recommendations.
    Use this to avoid recommending the same pack twice.

    Args:
        limit: Number of past recommendations to return (default 10).
    """
    if not os.path.exists(RECOMMENDATIONS_DIR):
        return json.dumps([])

    files = sorted(
        [f for f in os.listdir(RECOMMENDATIONS_DIR) if f.endswith(".md")],
        reverse=True,
    )[:limit]

    results = []
    for fname in files:
        path = os.path.join(RECOMMENDATIONS_DIR, fname)
        week = fname.replace(".md", "")
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            # Extract pack name from first h1
            lines = content.splitlines()
            preview = next((l for l in lines if l.startswith("# ")), lines[0] if lines else "")
            results.append({"week": week, "path": path, "preview": preview})
        except Exception:
            results.append({"week": week, "path": path, "preview": "(unreadable)"})

    return json.dumps(results, indent=2)
