---
name: decision-brief
description: >
  Transform scattered, unstructured product notes into one execution-ready decision brief with clear next
  actions in under 2 minutes. Accepts raw notes, transcripts, Slack threads, interview notes, or any
  mixed-format input and synthesizes them into a structured recommendation with confidence scoring.
license: paid
allowed-tools: []
metadata:
  author: modology-studios
  version: "1.0.0"
  pack: true
---

# Decision Brief

Transform scattered, unstructured product notes into one execution-ready decision brief with clear next actions in under 2 minutes.

## When to Invoke This Skill

Use this skill when you have:
- Notes from user interviews, team discussions, or research sessions
- Mixed formats: paper, Slack, Google Docs, email threads
- A decision deadline approaching and no clean summary exists
- Multiple data points that need synthesis into a recommendation

## Input Requirements

- Raw text input: any combination of notes, transcripts, chat logs, or document excerpts
- Minimum viable input: at least 2 distinct pieces of information or observations
- No required format: the skill handles normalization internally
- Optional context tags: urgency level, decision owner, timeline constraint

## Step-by-Step Execution Protocol

### Step 1: Input Normalization

Accept raw text from any source. Parse into standardized records containing:
- content: the raw note or observation
- source: where it came from (document name, channel, timestamp)
- provenance_id: unique identifier linking back to original
- context_tags: any provided tags (urgency, owner, segment)

### Step 2: Signal Extraction

Process each normalized record to extract:
- blocker: explicit obstacle or concern mentioned
- next_action: suggested task or decision point
- owner: person or role responsible
- signal_confidence: 0-100 score based on specificity and evidence strength

### Step 3: Gap Identification

Scan for missing information that would change the recommendation:
- Unanswered questions from stated hypotheses
- Contradictory signals without resolution
- Stakeholder input referenced but not present

### Step 4: Pattern Synthesis

Analyze extracted signals across all records to identify:
- Convergence: multiple sources pointing to same conclusion
- Divergence: conflicting signals requiring explicit trade-off
- Emergent insight: pattern not visible in any single record

### Step 5: Score Application

Apply weighted scoring model:
- Urgency weight (40%): timeline pressure and deadline proximity
- Impact weight (35%): potential outcome magnitude
- Confidence weight (25%): evidence quality and source reliability

### Step 6: Output Generation

Produce two formats simultaneously:
- Human-readable brief: narrative summary, key findings, recommendation with confidence, next actions, risk flags
- Machine-ready JSON: structured payload for automation or further processing

## Output Format Specification

### Human-Readable Brief

```
## Decision Brief — [topic]

### Key Findings
- [Finding 1] — Source: [provenance]
- [Finding 2] — Source: [provenance]

### Recommendation
[Primary recommendation with confidence %]

### Next Actions
1. [Action] — Owner: [name] — Due: [date]
2. [Action] — Owner: [name] — Due: [date]

### Evidence Gaps
- [Gap 1]
- [Gap 2]

### Risk Flags
- [Risk 1]
- [Risk 2]
```

### JSON Output

```json
{
  "decision_brief": {
    "topic": "...",
    "recommendation": "...",
    "confidence": 0,
    "key_findings": [],
    "next_actions": [],
    "evidence_gaps": [],
    "risk_flags": [],
    "synthesis_notes": "..."
  },
  "metadata": {
    "input_sources": [],
    "processing_time_seconds": 2,
    "version": "1.0.0"
  }
}
```

## Edge Case Handling

### Edge Case 1: Single Input Source
When only one note or document is provided, skip pattern synthesis (Step 4) and note "limited synthesis: single source" in metadata. Adjust confidence score downward by 20%.

### Edge Case 2: Contradictory Signals
When signals conflict without resolution, present both paths with explicit trade-off analysis. Do not force a single recommendation. Mark confidence as "reduced — conflicting evidence" and flag for human review.

### Edge Case 3: Insufficient Context
When input lacks enough specificity to extract actionable signals, output a structured request for clarification: "To proceed, I need: [specific questions]." Do not hallucinate context.

### Edge Case 4: No Clear Next Action
When findings suggest a decision but no specific action emerges, output a "monitor" recommendation with explicit trigger conditions for when to revisit.

### Edge Case 5: PII Detected
When input contains personally identifiable information, redact before processing. Log redaction event in metadata without exposing the redacted content.

## What This Skill Will NOT Do

- Make value judgments about business strategy — it synthesizes evidence, not opinions
- Generate recommendations from insufficient input — it flags gaps rather than hallucinate
- Preserve confidential data in outputs — it applies redaction protocols automatically
- Replace stakeholder review — it produces briefs for human decision-makers
- Handle real-time data ingestion — it processes static inputs only

External dependency: None. Runs entirely within your agent's context.
