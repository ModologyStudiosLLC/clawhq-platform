#!/usr/bin/env python3
"""
Reddit Intelligence Scanner
Fetches posts from target subreddits and keywords using Reddit's public JSON API.
No credentials required for public subreddits. Outputs JSON to stdout.

Usage: python3 reddit_scan.py [--config /path/to/config.toml]
"""

import json
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
import argparse
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "subreddits": [
        "selfhosted",
        "LocalLLaMA",
        "MachineLearning",
        "homelab",
        "artificial",
        "sysadmin",
        "devops",
    ],
    "keywords": [
        "AI agent",
        "self-hosted AI",
        "OpenClaw",
        "ClawHQ",
        "agent platform",
        "LLM agent",
        "autonomous agent",
    ],
    "competitor_keywords": [
        "AutoGPT",
        "AgentGPT",
        "n8n",
        "CrewAI",
        "LangChain agent",
        "Flowise",
    ],
    "posts_per_query": 25,
    "time_filter": "week",   # hour, day, week, month, year, all
    "request_delay_ms": 1000,  # be polite to Reddit's servers
}


def load_config(config_path: str | None) -> dict:
    """Load config from TOML file, falling back to defaults."""
    if config_path and Path(config_path).exists():
        try:
            import tomllib  # Python 3.11+
        except ImportError:
            try:
                import tomli as tomllib  # pip install tomli
            except ImportError:
                tomllib = None

        if tomllib:
            with open(config_path, "rb") as f:
                user_config = tomllib.load(f)
            return {**DEFAULT_CONFIG, **user_config}

    return DEFAULT_CONFIG


def reddit_get(url: str) -> dict | None:
    """Fetch a Reddit JSON endpoint with a browser-like User-Agent."""
    headers = {
        "User-Agent": "ClawHQ-RedditIntel/1.0 (self-hosted AI monitoring; contact: ops@clawhq.local)",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"[warn] Rate limited on {url}, sleeping 60s", file=sys.stderr)
            time.sleep(60)
        else:
            print(f"[warn] HTTP {e.code} for {url}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[warn] Request failed for {url}: {e}", file=sys.stderr)
        return None


def search_subreddit(subreddit: str, query: str, limit: int, time_filter: str) -> list[dict]:
    """Search within a subreddit for a query."""
    encoded = urllib.parse.quote(query)
    url = (
        f"https://www.reddit.com/r/{subreddit}/search.json"
        f"?q={encoded}&sort=relevance&t={time_filter}&limit={limit}&restrict_sr=1"
    )
    data = reddit_get(url)
    if not data:
        return []
    return [post["data"] for post in data.get("data", {}).get("children", [])
            if post.get("kind") == "t3"]


def search_global(query: str, limit: int, time_filter: str) -> list[dict]:
    """Global Reddit search for a query."""
    encoded = urllib.parse.quote(query)
    url = (
        f"https://www.reddit.com/search.json"
        f"?q={encoded}&sort=relevance&t={time_filter}&limit={limit}"
    )
    data = reddit_get(url)
    if not data:
        return []
    return [post["data"] for post in data.get("data", {}).get("children", [])
            if post.get("kind") == "t3"]


def normalise_post(raw: dict, keyword: str, search_type: str) -> dict:
    """Extract the fields we care about from a raw Reddit post."""
    return {
        "id": raw.get("id", ""),
        "title": raw.get("title", ""),
        "selftext": (raw.get("selftext", "") or "")[:500],  # first 500 chars
        "subreddit": raw.get("subreddit", ""),
        "author": raw.get("author", "[deleted]"),
        "score": raw.get("score", 0),
        "upvote_ratio": raw.get("upvote_ratio", 0.5),
        "num_comments": raw.get("num_comments", 0),
        "created_utc": raw.get("created_utc", 0),
        "url": f"https://reddit.com{raw.get('permalink', '')}",
        "flair": raw.get("link_flair_text", ""),
        "matched_keyword": keyword,
        "search_type": search_type,  # "keyword" | "competitor"
    }


def run_scan(config: dict) -> dict:
    """Execute the full Reddit scan and return structured results."""
    results = {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "config": {
            "subreddits": config["subreddits"],
            "keywords": config["keywords"],
            "competitor_keywords": config["competitor_keywords"],
            "time_filter": config["time_filter"],
        },
        "keyword_posts": [],
        "competitor_posts": [],
        "subreddit_posts": [],
        "errors": [],
    }

    delay = config["request_delay_ms"] / 1000
    limit = config["posts_per_query"]
    time_filter = config["time_filter"]

    # ── Keyword scans (global search) ─────────────────────────────────────────
    for keyword in config["keywords"]:
        print(f"[scan] keyword: {keyword}", file=sys.stderr)
        posts = search_global(keyword, limit, time_filter)
        for p in posts:
            results["keyword_posts"].append(normalise_post(p, keyword, "keyword"))
        time.sleep(delay)

    # ── Competitor keyword scans ───────────────────────────────────────────────
    for keyword in config["competitor_keywords"]:
        print(f"[scan] competitor: {keyword}", file=sys.stderr)
        posts = search_global(keyword, limit, time_filter)
        for p in posts:
            results["competitor_posts"].append(normalise_post(p, keyword, "competitor"))
        time.sleep(delay)

    # ── Per-subreddit hot/new feed ─────────────────────────────────────────────
    for subreddit in config["subreddits"]:
        print(f"[scan] subreddit: r/{subreddit}", file=sys.stderr)
        url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit=10"
        data = reddit_get(url)
        if data:
            for post in data.get("data", {}).get("children", []):
                if post.get("kind") == "t3":
                    results["subreddit_posts"].append(
                        normalise_post(post["data"], subreddit, "subreddit_hot")
                    )
        time.sleep(delay)

    # ── Dedup by post ID ──────────────────────────────────────────────────────
    seen = set()
    for key in ("keyword_posts", "competitor_posts", "subreddit_posts"):
        deduped = []
        for p in results[key]:
            if p["id"] not in seen:
                seen.add(p["id"])
                deduped.append(p)
        results[key] = deduped

    results["total_posts"] = len(seen)
    return results


def main():
    parser = argparse.ArgumentParser(description="Reddit Intelligence Scanner")
    parser.add_argument("--config", default="/opt/openfang/agents/reddit-intel/config.toml",
                        help="Path to config TOML file")
    args = parser.parse_args()

    config = load_config(args.config)
    results = run_scan(config)
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
