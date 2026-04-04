# ClawHQ Agent Templates

Pre-built agent definitions ready to drop into any ClawHQ deployment.

## Available templates

| Template | Best for | Model |
|----------|---------|-------|
| [Research Assistant](./research-assistant.yaml) | On-demand research briefings | Sonnet |
| [Lead Qualification Bot](./lead-qualification.yaml) | B2B sales prospect research | Sonnet |
| [Code Review Agent](./code-review.yaml) | Bug finding, security review, code feedback | Sonnet |
| [Content Scheduler](./content-scheduler.yaml) | Social posts, newsletter drafts, weekly content | Sonnet |
| [Support Triage](./support-triage.yaml) | Classify and draft responses for support tickets | Haiku |
| [Daily Digest](./daily-digest.yaml) | Morning briefing with news and priorities | Haiku |

## Install a template

```bash
# Copy to your ClawHQ packs directory
cp templates/research-assistant.yaml ~/.clawhq/agents/

# Restart to load
docker compose restart paperclip

# Test it
# In Discord: @Felix research [topic]
```

## Use in onboarding

Templates surface in the ClawHQ onboarding wizard's goal selection step.
When a user selects "Research", the Research Assistant template is pre-selected.
When they select "Sales", the Lead Qualification Bot is offered.

## Build your own

Templates follow the `paperclip.ai/v1 Agent` schema. See the
[Agent Configuration Reference](https://docs.clawhqplatform.com/reference/agent-config) for all available fields.

Submit community templates via PR — add your YAML to this directory and
open a pull request with a description of what the agent does and who it's for.
