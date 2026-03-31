"""
Agent Performance Metrics — Measure how well an agent performs tasks.

Used by the autoresearch skill to evaluate agent configurations.

Metrics:
- task_success_rate: % of test tasks completed successfully
- response_quality: Average quality score (0-1) across test tasks
- cost_per_task: Average cost per successfully completed task
- completion_rate: % of tasks that complete without errors
- consistency: Standard deviation of quality scores (lower = better)
"""
import json
import subprocess
import time
from pathlib import Path
from typing import Callable, Optional


class AgentMetrics:
    """Measure agent performance on a set of test tasks."""

    def __init__(self, agent_id: str, api_url: str = "http://localhost:4200/api"):
        self.agent_id = agent_id
        self.api_url = api_url

    def run_test_tasks(self, tasks: list[dict], timeout: int = 120) -> list[dict]:
        """
        Run a set of test tasks against the agent.

        Each task: {prompt: str, expected_keywords: list[str], max_tokens: int}
        Returns results with success, quality_score, cost, duration.
        """
        results = []
        for task in tasks:
            result = self._run_single_task(task, timeout)
            results.append(result)
        return results

    def calculate_metrics(self, results: list[dict]) -> dict:
        """Calculate aggregate metrics from test results."""
        if not results:
            return {"task_success_rate": 0, "response_quality": 0, "cost_per_task": 0, "completion_rate": 0}

        successful = [r for r in results if r.get("success")]
        completed = [r for r in results if not r.get("error")]

        return {
            "task_success_rate": len(successful) / len(results),
            "response_quality": sum(r.get("quality_score", 0) for r in results) / len(results),
            "cost_per_task": sum(r.get("cost", 0) for r in successful) / max(len(successful), 1),
            "completion_rate": len(completed) / len(results),
            "total_cost": sum(r.get("cost", 0) for r in results),
            "total_duration": sum(r.get("duration", 0) for r in results),
            "tasks_run": len(results),
            "tasks_successful": len(successful),
        }

    def _run_single_task(self, task: dict, timeout: int) -> dict:
        """Run a single test task against the agent."""
        prompt = task.get("prompt", "")
        expected_keywords = task.get("expected_keywords", [])

        start = time.time()
        try:
            import urllib.request
            payload = json.dumps({"message": prompt}).encode("utf-8")
            req = urllib.request.Request(
                f"{self.api_url}/agents/{self.agent_id}/message",
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            response = data.get("response", "")
            cost = data.get("cost_usd", 0)
            duration = time.time() - start

            # Evaluate success
            keyword_matches = sum(1 for kw in expected_keywords if kw.lower() in response.lower())
            quality_score = keyword_matches / max(len(expected_keywords), 1) if expected_keywords else 0.5

            return {
                "success": len(response) > 50,
                "quality_score": quality_score,
                "cost": cost,
                "duration": duration,
                "response_length": len(response),
                "error": None,
            }
        except Exception as e:
            return {
                "success": False,
                "quality_score": 0,
                "cost": 0,
                "duration": time.time() - start,
                "response_length": 0,
                "error": str(e),
            }


def create_test_tasks(task_file: str) -> list[dict]:
    """Load test tasks from a JSON file."""
    path = Path(task_file)
    if not path.exists():
        return []
    return json.loads(path.read_text())


def compare_metrics(baseline: dict, current: dict, direction: str = "higher") -> dict:
    """Compare two metric sets and determine if current is better."""
    primary_metric = "task_success_rate" if "task_success_rate" in baseline else list(baseline.keys())[0]

    baseline_val = baseline.get(primary_metric, 0)
    current_val = current.get(primary_metric, 0)

    if direction == "higher":
        improved = current_val > baseline_val
    else:
        improved = current_val < baseline_val

    delta = current_val - baseline_val
    delta_pct = (delta / max(abs(baseline_val), 0.001)) * 100

    return {
        "improved": improved,
        "metric": primary_metric,
        "baseline": baseline_val,
        "current": current_val,
        "delta": delta,
        "delta_pct": round(delta_pct, 2),
    }
