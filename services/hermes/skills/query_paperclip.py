"""
Paperclip orchestration skill for Hermes.

Allows Hermes to read the org chart, query scheduled workflows,
and trigger Paperclip pipelines on demand.

Environment:
  PAPERCLIP_INTERNAL_URL  URL of the Paperclip API (default: http://paperclip:3100)
"""

import os
import json
import urllib.request
import urllib.error
from typing import Optional

PAPERCLIP_URL = os.environ.get("PAPERCLIP_INTERNAL_URL", "http://paperclip:3100")


def _http(method: str, path: str, body: Optional[dict] = None) -> dict:
    url = f"{PAPERCLIP_URL}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "detail": e.read().decode()}
    except Exception as e:
        return {"error": str(e)}


def get_org_chart() -> str:
    """
    Retrieve the current org chart — who the agents are, their roles,
    and how they are structured in the team.
    Returns a JSON summary of the organization.
    """
    result = _http("GET", "/api/companies")
    if "error" in result:
        return f"Could not reach Paperclip: {result['error']}"
    companies = result if isinstance(result, list) else [result]
    return json.dumps(companies, indent=2)


def list_workflows() -> str:
    """
    List all scheduled workflows and pipelines in Paperclip.
    Returns name, schedule (cron), status, and last run time.
    """
    result = _http("GET", "/api/workflows")
    if "error" in result:
        return f"Could not reach Paperclip: {result['error']}"
    return json.dumps(result, indent=2)


def trigger_workflow(workflow_id: str, payload: Optional[dict] = None) -> str:
    """
    Trigger a Paperclip workflow immediately, bypassing its schedule.

    Args:
        workflow_id: The workflow ID or name to trigger.
        payload: Optional JSON data to pass to the workflow.

    Returns:
        Confirmation and run ID, or an error.
    """
    body = {"payload": payload or {}}
    result = _http("POST", f"/api/workflows/{workflow_id}/trigger", body)
    if "error" in result:
        return f"Failed to trigger workflow '{workflow_id}': {result['error']}"
    return json.dumps(result, indent=2)


def get_workflow_status(run_id: str) -> str:
    """
    Check the status of a workflow run.

    Args:
        run_id: The run ID returned by trigger_workflow.

    Returns:
        Current status (pending, running, completed, failed) and any output.
    """
    result = _http("GET", f"/api/runs/{run_id}")
    if "error" in result:
        return f"Could not get status for run '{run_id}': {result['error']}"
    return json.dumps(result, indent=2)
