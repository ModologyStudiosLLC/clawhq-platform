---
name: autoresearch
description: Autonomous agent self-improvement through experimentation. Modify → test → measure → keep/discard → repeat. Inspired by Karpathy's autoresearch pattern.
metadata: {"clawdbot":{"emoji":"🔬"}}
---

# Autoresearch — Agent Self-Improvement

Give an agent a target file, a metric, and a time budget. Let it experiment autonomously overnight. You wake up to a log of experiments and (hopefully) a better agent.

## How It Works

Three files matter:
- **`target.md`** — the file the agent modifies (SKILL.md, program.md, config)
- **`program.md`** — experiment instructions (you edit this)
- **`metrics.py`** — how to measure success (you define this)

The agent:
1. Reads program.md for experiment instructions
2. Modifies target.md based on a hypothesis
3. Runs test tasks to measure performance
4. Compares to baseline
5. Keeps if improved, discards if not
6. Repeats until time budget exhausted

## Quick Start

```bash
# 1. Set up experiment
python3 ~/.openclaw/workspace/skills/autoresearch/experiment_runner.py setup \
  --name "optimize-researcher-prompt" \
  --target ~/.openfang/workspaces/researcher-hand/workspace/skills/research/SKILL.md \
  --metric task_success_rate \
  --direction higher \
  --budget 1800

# 2. Agent runs experiments (automated)
python3 ~/.openclaw/workspace/skills/autoresearch/experiment_runner.py run \
  --name "optimize-researcher-prompt" \
  --max-variants 20

# 3. Check results
python3 ~/.openclaw/workspace/skills/autoresearch/experiment_runner.py results \
  --name "optimize-researcher-prompt"
```

## What You Can Experiment With

| Target | Metric | Time Budget |
|--------|--------|-------------|
| Agent SKILL.md instructions | Task success rate | 30 min/variant |
| Prompt templates | Response quality score | 15 min/variant |
| Model routing config | Cost per successful task | 30 min/variant |
| Tool usage patterns | Completion rate | 20 min/variant |
| Temperature/settings | Output consistency | 10 min/variant |

## Rules (from Karpathy)

1. **One change at a time.** Each experiment modifies ONE thing. Isolate variables.
2. **Fixed time budget.** No extensions. Direct comparison across variants.
3. **Keep or discard.** Metric improved → keep. Not improved → restore from best.
4. **Log everything.** Append-only experiment log with hash, metric, decision.
5. **Don't touch the runner.** Only modify the target file.

## Program Template

Create a `program.md` for each experiment:

```markdown
# Experiment: [NAME]

## Hypothesis
[What change do you think will improve the metric and why?]

## Target
`[path/to/target.md]` — the file you modify.

## Metric
**Name:** [task_success_rate | response_quality | cost_per_task | completion_rate]
**Direction:** [higher | lower] is better
**How to measure:** [describe the test task and evaluation criteria]

## Variants to Try
- [ ] [Variant 1 description]
- [ ] [Variant 2 description]
- [ ] [Variant 3 description]

## Rules
- Change ONE thing per variant
- Use the EXACT time budget
- Log every experiment
- Keep the best, restore after bad ones
```

## Integration with ClawHQ

The autoresearch skill works with ClawHQ's security layer:
- **Sandbox:** Agent can only modify the target file (enforced)
- **Audit:** Every modification logged
- **Rate limits:** Experiments respect per-agent limits
- **Cost tracking:** Each experiment's cost tracked and budget-enforced

## Overnight Autonomy

To run overnight, use a cron job:

```json
{
  "name": "autoresearch-nightly",
  "schedule": { "expr": "0 3 * * *", "kind": "cron", "tz": "America/New_York" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Read the autoresearch skill SKILL.md, then run experiments on the researcher-hand prompt template. You have 2 hours. Goal: improve task success rate by finding better instructions. Log all experiments to the experiment log."
  }
}
```

## Results Format

Each experiment is logged as:
```
## ✅ v1-shorter-instructions — 2026-03-31T03:15:00
- task_success_rate: 0.82 (baseline: 0.75, Δ +9.3%)
- Decision: KEPT
- Target hash: `a1b2c3d4`
- Duration: 45.2s
```

The `best/` directory preserves the winning variant. The target file is automatically restored after a discarded variant.
