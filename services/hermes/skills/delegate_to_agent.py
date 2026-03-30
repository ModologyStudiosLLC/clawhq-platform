"""
OpenFang delegation skill for Hermes.

Allows Hermes to assign tasks to specialized agents running in OpenFang.
Hermes calls these functions when it decides a task is better handled by
a specific agent (research, writing, data analysis, etc.).

Environment:
  OPENFANG_INTERNAL_URL  URL of the OpenFang API (default: http://openfang:4200)
"""

import os
import json
import asyncio
import urllib.request
import urllib.error
from typing import Optional

OPENFANG_URL = os.environ.get("OPENFANG_INTERNAL_URL", "http://openfang:4200")


def _http(method: str, path: str, body: Optional[dict] = None) -> dict:
    """Minimal synchronous HTTP helper — no extra dependencies."""
    url = f"{OPENFANG_URL}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "detail": e.read().decode()}
    except Exception as e:
        return {"error": str(e)}


def list_agents() -> str:
    """
    List all available agents in OpenFang with their name, role, and current state.
    Call this first to find the right agent for a task.
    Returns a JSON list of agents.
    """
    result = _http("GET", "/api/agents")
    if "error" in result:
        return f"Could not reach OpenFang: {result['error']}"
    agents = result if isinstance(result, list) else result.get("agents", [])
    summary = [
        {
            "id": a.get("id"),
            "name": a.get("name"),
            "profile": a.get("profile"),
            "provider": a.get("model_provider"),
            "state": a.get("state"),
            "ready": a.get("ready", False),
        }
        for a in agents
    ]
    return json.dumps(summary, indent=2)


def delegate_task(agent_name: str, task: str) -> str:
    """
    Send a task to a named OpenFang agent and return its response.

    Use this to delegate work to a specialist:
    - Research tasks → agent named "Scout" or with profile "research"
    - Writing tasks → agent named "Scribe" or with profile "content"
    - Data/analysis → agent with profile "analyst"
    - Code tasks → agent with profile "coding"

    Args:
        agent_name: The agent's name (case-insensitive) or agent ID.
        task: The full task description to send to the agent.

    Returns:
        The agent's response, or an error message.
    """
    # Find the agent by name or ID
    agents_raw = _http("GET", "/api/agents")
    if "error" in agents_raw:
        return f"Could not reach OpenFang: {agents_raw['error']}"

    agents = agents_raw if isinstance(agents_raw, list) else agents_raw.get("agents", [])

    agent = None
    name_lower = agent_name.lower()
    for a in agents:
        if a.get("id") == agent_name or a.get("name", "").lower() == name_lower:
            agent = a
            break

    if not agent:
        # Try fuzzy match on name
        for a in agents:
            if name_lower in a.get("name", "").lower():
                agent = a
                break

    if not agent:
        available = [a.get("name") for a in agents]
        return f"No agent found named '{agent_name}'. Available: {available}"

    if agent.get("state") != "Running":
        return f"Agent '{agent['name']}' is not running (state: {agent.get('state')}). Cannot delegate."

    agent_id = agent["id"]

    # Create a session
    session = _http("POST", f"/api/agents/{agent_id}/sessions", {})
    if "error" in session:
        return f"Failed to create session with {agent['name']}: {session['error']}"

    session_id = session.get("session_id") or session.get("id")
    if not session_id:
        return f"No session ID returned from {agent['name']}"

    # Send the task (non-streaming — wait for full response)
    response = _http("POST", f"/api/agents/{agent_id}/message", {
        "session_id": session_id,
        "message": task,
    })

    if "error" in response:
        return f"Agent '{agent['name']}' returned an error: {response['error']}"

    content = (
        response.get("content")
        or response.get("message")
        or response.get("response")
        or json.dumps(response)
    )
    return f"[{agent['name']}]: {content}"


def delegate_task_by_profile(profile: str, task: str) -> str:
    """
    Send a task to the best available agent matching a given profile/role.
    Profiles: general, coding, messaging, research, custom

    Use this when you know the type of work but not the specific agent name.

    Args:
        profile: The agent profile to look for (e.g. "research", "coding").
        task: The full task description.

    Returns:
        The agent's response, or an error message.
    """
    agents_raw = _http("GET", "/api/agents")
    if "error" in agents_raw:
        return f"Could not reach OpenFang: {agents_raw['error']}"

    agents = agents_raw if isinstance(agents_raw, list) else agents_raw.get("agents", [])
    profile_lower = profile.lower()

    # Find running agents matching the profile
    matches = [
        a for a in agents
        if a.get("state") == "Running"
        and (
            a.get("profile", "").lower() == profile_lower
            or profile_lower in a.get("name", "").lower()
        )
    ]

    if not matches:
        # Fall back to any running agent
        matches = [a for a in agents if a.get("state") == "Running"]

    if not matches:
        return f"No running agents available for profile '{profile}'."

    # Use the first match
    return delegate_task(matches[0]["name"], task)
