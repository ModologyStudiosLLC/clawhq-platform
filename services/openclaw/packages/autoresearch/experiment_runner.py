#!/usr/bin/env python3
"""
Autoresearch Experiment Runner — Agent self-improvement through experimentation.

Usage:
    python3 experiment_runner.py setup --name "optimize-prompt" --target path/to/SKILL.md --metric task_success_rate --direction higher --budget 1800
    python3 experiment_runner.py run --name "optimize-prompt" --max-variants 20
    python3 experiment_runner.py results --name "optimize-prompt"
    python3 experiment_runner.py status --name "optimize-prompt"
"""
import json
import sys
import os
import hashlib
import shutil
import time
import subprocess
from datetime import datetime
from pathlib import Path

WORKSPACE = Path.home() / ".openclaw/workspace"
EXPERIMENTS_DIR = WORKSPACE / "skills/autoresearch/experiments"
sys.path.insert(0, str(WORKSPACE))

from harness.experiment_engine import ExperimentEngine


def setup_experiment(name: str, target: str, metric: str, direction: str = "higher", budget: int = 1800, description: str = ""):
    """Set up a new autoresearch experiment."""
    engine = ExperimentEngine(name, base_dir=str(EXPERIMENTS_DIR))
    config = engine.setup(
        target_file=target,
        metric_name=metric,
        metric_direction=direction,
        time_budget_seconds=budget,
        measurement_fn="manual",
        description=description or f"Autoresearch: optimize {metric} via {Path(target).name}",
    )

    # Create program.md template
    program_dir = EXPERIMENTS_DIR / name
    program_path = program_dir / "program.md"
    if not program_path.exists():
        program_path.write_text(f"""# Experiment: {name}

## Hypothesis
[What change do you think will improve {metric} and why?]

## Target
`{target}` — the file you modify.

## Metric
**Name:** {metric}
**Direction:** {direction} is better
**How to measure:** [describe the test task and evaluation criteria]

## Variants to Try
- [ ] [Variant 1 description]
- [ ] [Variant 2 description]
- [ ] [Variant 3 description]

## Rules
- Change ONE thing per variant
- Use the EXACT time budget ({budget}s per variant)
- Log every experiment
- Keep the best, restore after bad ones
""")

    print(f"✅ Autoresearch experiment '{name}' set up")
    print(f"   Target: {target}")
    print(f"   Metric: {metric} ({direction} is better)")
    print(f"   Budget: {budget}s per variant")
    print(f"   Program: {program_path}")
    print(f"   Log: {engine.log_file}")
    return engine


def run_experiments(name: str, max_variants: int = 20):
    """
    Run autoresearch experiments.

    This is designed to be called by an agent (Felix/sub-agent) that:
    1. Reads program.md for instructions
    2. Modifies the target file
    3. Calls this function to measure and log

    The agent handles the actual modification + testing.
    This function handles measurement, comparison, and keep/discard.
    """
    engine = ExperimentEngine(name, base_dir=str(EXPERIMENTS_DIR))
    if not engine.config:
        print(f"❌ Experiment '{name}' not found. Run 'setup' first.")
        return

    status = engine.status()
    print(f"\n🔬 Autoresearch: {name}")
    print(f"   Target: {status['target']}")
    print(f"   Metric: {status['metric']} ({status['direction']} is better)")
    print(f"   Experiments run: {status['experiments_run']}")
    print(f"   Best: {status['best_value']} ({status['best_variant']})")
    print(f"\n   Program.md: {EXPERIMENTS_DIR / name / 'program.md'}")
    print(f"\n   Agent: Read program.md, modify target, then run:")
    print(f"   python3 experiment_runner.py measure {name} -v <variant-name> --value <metric-value>")
    print(f"\n   Repeat up to {max_variants} times or until time budget exhausted.")


def measure_variant(name: str, variant: str, value: float, notes: str = ""):
    """Measure a variant and make keep/discard decision."""
    engine = ExperimentEngine(name, base_dir=str(EXPERIMENTS_DIR))
    if not engine.config:
        print(f"❌ Experiment '{name}' not found.")
        return

    result = engine.measure(variant, notes=notes, manual_value=value)
    icon = "✅ KEPT" if result.kept else "❌ DISCARDED"
    print(f"{icon} {variant}")
    print(f"   {result.metric_name}: {result.metric_value} (baseline: {result.baseline_value}, Δ {result.delta_pct:+.1f}%)")
    return result


def show_results(name: str):
    """Show experiment results summary."""
    engine = ExperimentEngine(name, base_dir=str(EXPERIMENTS_DIR))
    if not engine.config:
        print(f"❌ Experiment '{name}' not found.")
        return
    print(engine.summary())


def show_status(name: str):
    """Show experiment status as JSON."""
    engine = ExperimentEngine(name, base_dir=str(EXPERIMENTS_DIR))
    if not engine.config:
        print(f"❌ Experiment '{name}' not found.")
        return
    print(json.dumps(engine.status(), indent=2))


def list_experiments():
    """List all autoresearch experiments."""
    if not EXPERIMENTS_DIR.exists():
        print("No experiments found.")
        return

    for d in sorted(EXPERIMENTS_DIR.iterdir()):
        if d.is_dir() and (d / "config.json").exists():
            config = json.loads((d / "config.json").read_text())
            print(f"  • {d.name}")
            print(f"    Target: {config.get('target_file', '?')}")
            print(f"    Metric: {config.get('metric_name', '?')} | Experiments: {config.get('total_experiments', 0)}")
            best = config.get("best_result")
            if best:
                print(f"    Best: {best.get('metric_value', '?')} ({best.get('variant_name', '?')})")


# ── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("🔬 Autoresearch Experiment Runner\n")
        print("Usage:")
        print("  setup   --name <name> --target <path> --metric <metric> [--direction higher|lower] [--budget <seconds>]")
        print("  run     --name <name> [--max-variants <n>]")
        print("  measure --name <name> -v <variant> --value <number>")
        print("  results --name <name>")
        print("  status  --name <name>")
        print("  list")
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "list":
        list_experiments()
    elif cmd == "setup":
        import argparse
        p = argparse.ArgumentParser()
        p.add_argument("--name", required=True)
        p.add_argument("--target", required=True)
        p.add_argument("--metric", required=True)
        p.add_argument("--direction", default="higher")
        p.add_argument("--budget", type=int, default=1800)
        p.add_argument("--description", default="")
        args = p.parse_args(sys.argv[2:])
        setup_experiment(args.name, args.target, args.metric, args.direction, args.budget, args.description)
    elif cmd == "run":
        import argparse
        p = argparse.ArgumentParser()
        p.add_argument("--name", required=True)
        p.add_argument("--max-variants", type=int, default=20)
        args = p.parse_args(sys.argv[2:])
        run_experiments(args.name, args.max_variants)
    elif cmd == "measure":
        import argparse
        p = argparse.ArgumentParser()
        p.add_argument("--name", required=True)
        p.add_argument("-v", "--variant", required=True)
        p.add_argument("--value", type=float, required=True)
        p.add_argument("--notes", default="")
        args = p.parse_args(sys.argv[2:])
        measure_variant(args.name, args.variant, args.value, args.notes)
    elif cmd == "results":
        name = sys.argv[2] if len(sys.argv) > 2 else ""
        show_results(name)
    elif cmd == "status":
        name = sys.argv[2] if len(sys.argv) > 2 else ""
        show_status(name)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
