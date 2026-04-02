# ClawHQ Use Case Packs

Pre-built agent workflow packs for common team use cases. Each pack includes
3 agents, pre-configured triggers, and delivery to Discord/Slack/email.

## Available Packs

| Pack | Agents | Best for |
|------|--------|----------|
| [Engineering Team](./engineering-team.yaml) | PR Reviewer, Release Notes Writer, Bug Triage | Dev teams on GitHub |
| [Sales Team](./sales-team.yaml) | Lead Researcher, Outreach Drafter, CRM Note Taker | Sales and RevOps |
| [Customer Support](./customer-support.yaml) | Ticket Classifier, KB Search, Reply Drafter | Support teams |
| [Ops & Leadership](./ops-leadership.yaml) | Daily Briefing, Meeting Summarizer, Status Reporter | Founders, COOs, team leads |

## Deploy a Pack

1. Copy the pack YAML to your ClawHQ workspace
2. Add the required env vars to your `.env` (listed at the bottom of each file)
3. Restart: `docker compose restart paperclip`

Each agent starts responding as soon as Paperclip picks up the config.
No code changes required.

## Build Your Own

Packs follow the `paperclip.ai/v1 AgentPack` schema. See the
[Paperclip docs](../services/paperclip/doc/SPEC.md) for the full spec.
