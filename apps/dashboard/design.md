# ClawHQ Dashboard — Design System

> Include this file in any prompt when building new dashboard components or UI.
> It codifies every token, pattern, and convention in one place so output stays consistent.

---

## Brand Identity

- **Product**: ClawHQ — B2B AI agent control plane
- **Aesthetic**: Modology dark-tool brand. Precise, data-dense, no decorative chrome.
- **Tone**: Confident but not flashy. Numbers and status are the hero — not gradients.

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| Body / UI | `Inter` (300–600) | All prose, labels, tables, form inputs |
| Display / Numbers | `Newsreader` (serif, italic-capable) | KPI values, headings, large numeric readouts |
| Mono | `SF Mono` / `Geist Mono` | Code blocks, session IDs, timestamps |

**CSS variables**: `var(--font-sans)`, `var(--font-display)`, `var(--font-mono)`

**Heading rules**: `font-family: var(--font-display)`, `font-weight: 600`, `letter-spacing: -0.01em`

**KPI values**: `text-xl font-bold tabular-nums`, font-family `var(--font-display)`, color `var(--color-text)`

**Labels / section headers**: `text-xs font-semibold uppercase tracking-wider`, color `var(--color-text-muted)`

---

## Color Palette

### Dark mode (default)

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg` | `#050507` | Page background |
| `--color-surface` | `#0c0c0f` | Card backgrounds |
| `--color-surface-2` | `#111115` | Nested surfaces, inputs, skeletons |
| `--color-border` | `rgba(255,255,255,0.07)` | All default borders |
| `--color-border-strong` | `rgba(255,255,255,0.14)` | Hover borders, active states |
| `--color-primary` | `#69daff` | Cyan — primary actions, links, focus rings |
| `--color-primary-dim` | `rgba(105,218,255,0.15)` | Primary highlight backgrounds |
| `--color-primary-glow` | `rgba(105,218,255,0.3)` | Glow box-shadow |
| `--color-secondary` | `#69f6b8` | Green — success, active agent status |
| `--color-secondary-dim` | `rgba(105,246,184,0.15)` | Secondary highlight backgrounds |
| `--color-accent` | `#ac8aff` | Purple — accent, session/memory indicators |
| `--color-accent-dim` | `rgba(172,138,255,0.15)` | Accent highlight backgrounds |
| `--color-hermes` | `#e879f9` | Magenta — Hermes adapter, special calls |
| `--color-warning` | `#f6d969` | Yellow — idle status, cost warnings |
| `--color-error` | `#ff6b6b` | Red — errors, failures |
| `--color-success` | `#69f6b8` | Same as secondary |
| `--color-text` | `#f5f5f7` | Primary text |
| `--color-text-muted` | `rgba(245,245,247,0.6)` | Secondary text, labels |
| `--color-text-subtle` | `rgba(245,245,247,0.35)` | Tertiary, placeholder text |
| `--color-on-brand` | `#050507` | Text ON bright gradient CTAs |

### Light mode overrides (`.html:not(.dark)`)

| Token | Value |
|-------|-------|
| `--color-bg` | `#fafaf8` |
| `--color-surface` | `#f0f0ee` |
| `--color-surface-2` | `#e6e6e4` |
| `--color-primary` | `#0066cc` |
| `--color-secondary` | `#1a9c6e` |
| `--color-accent` | `#6e44cf` |
| `--color-text` | `#0a0a0c` |

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-lg` | `1.125rem` | Cards, panels |
| `--radius-md` | `0.625rem` | Buttons, badges, dropdowns |
| `--radius-sm` | `0.375rem` | Inputs, small chips |

---

## Component Patterns

### Card

```html
<div class="card p-4">...</div>
```

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
```

Add `card-hover` for interactive cards (border-color + box-shadow + translateY(-2px) on hover).

Add `card-active-border` for a 2px top border in `--color-primary` to mark active/selected cards.

### Section header pattern (inside a card)

```html
<p class="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
  Section Title
</p>
```

### KPI Card

```html
<div class="card p-4 space-y-1">
  <div class="flex items-center gap-2">
    <Icon size={13} style={{ color: "var(--color-primary)" }} />
    <span class="text-xs" style={{ color: "var(--color-text-muted)" }}>Label</span>
  </div>
  <p class="text-xl font-bold tabular-nums truncate"
     style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
    Value
  </p>
  <p class="text-xs" style={{ color: "var(--color-text-subtle)" }}>Sub-label</p>
</div>
```

KPI grids: `grid grid-cols-2 gap-3 sm:grid-cols-4` for 4-up, `grid grid-cols-3 gap-4` for 3-up.

### Range Selector (tab pill group)

```html
<div class="flex gap-1 p-1 rounded-lg" style={{ background: "var(--color-surface)" }}>
  {OPTIONS.map(o => (
    <button
      key={o.key}
      onClick={() => setActive(o.key)}
      className="px-3 py-1 text-xs font-medium rounded-md transition-all"
      style={{
        background: active === o.key ? "var(--color-primary)" : "transparent",
        color: active === o.key ? "#fff" : "var(--color-text-muted)",
      }}
    >{o.label}</button>
  ))}
</div>
```

### Pill Buttons

| Class | Appearance |
|-------|-----------|
| `btn-pill btn-pill-solid` | White fill, dark text — primary action |
| `btn-pill btn-pill-outline` | Transparent, muted text, subtle border — secondary |

### Status Dots

```html
<span class="status-dot active" />   <!-- green glow — running -->
<span class="status-dot idle" />     <!-- yellow — idle/waiting -->
<span class="status-dot error" />    <!-- red — failed -->
<span class="status-dot offline" />  <!-- subtle — stopped -->
```

### Glass surface

```css
.glass {
  background: rgba(128,128,128,0.04);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
}
```

### Gradient text

```html
<span class="gradient-text-primary">Primary → Secondary</span>   <!-- cyan → green -->
<span class="gradient-text-accent">Accent → Primary</span>        <!-- purple → cyan -->
```

---

## Chart Conventions (Recharts)

All charts share these base styles:

**Tooltip**:
```js
contentStyle={{
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 11,
}}
```

**Axis ticks**: `{ fontSize: 10, fill: "var(--color-text-muted)" }`, `axisLine={false}`, `tickLine={false}`

**Area gradient**: `stopOpacity={0.35}` at 5%, `stopOpacity={0}` at 95%

**Area stroke**: `strokeWidth={1.5}`, `dot={false}`

**Bar radius**: `radius={[0, 4, 4, 0]}` for horizontal bars (right side rounded)

**Multi-agent color palette** (10 colors, index % 10):
```js
const COLORS = [
  "var(--color-primary)",    // cyan
  "var(--color-secondary)",  // green
  "var(--color-accent)",     // purple
  "var(--color-warning)",    // yellow
  "#a78bfa",  "#34d399",  "#f472b6",  "#60a5fa",  "#fb923c",  "#e879f9",
];
```

---

## Animations

| Class | Keyframe | Use |
|-------|----------|-----|
| `animate-fade-in` | opacity 0→1, translateY 4px→0, 0.3s ease-out | Page-level content reveals |
| `animate-slide-up` | opacity 0→1, translateY 16px→0, 0.4s cubic | Panel entries |
| `reveal` + `reveal-delay-{1-4}` | opacity 0→1, translateY 12px→0, 80ms stagger | Staggered list items |
| `animate-pulse-slow` | opacity 1→0.5, 3s | Skeleton loading |
| `animate-float` | translateY 0→-8px, 6s | Decorative floating elements |

**Page entry**: wrap page root with `class="space-y-6 animate-fade-in"`.

---

## Loading States

**Skeleton block**:
```html
<div class="h-48 animate-pulse rounded-lg"
     style={{ background: "var(--color-surface-2)" }} />
```

**Empty state card**:
```html
<div class="card p-8 text-center space-y-2">
  <p class="text-3xl">📊</p>
  <p class="text-sm font-medium" style={{ color: "var(--color-text)" }}>
    No data yet
  </p>
  <p class="text-xs" style={{ color: "var(--color-text-muted)" }}>
    Explanation of when data will appear.
  </p>
</div>
```

**Error state**:
```html
<div class="card p-4 text-sm" style={{ color: "var(--color-warning)" }}>
  Failed to load: {error}
</div>
```

---

## Data Formatting Helpers

These are standard across all dashboard components — copy verbatim, do not invent new formatters:

```ts
function fmtDollars(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1) return `$${dollars.toFixed(2)}`;
  return `$${dollars.toFixed(4)}`;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
```

---

## Component File Conventions

- All dashboard components: `"use client"` at top if they use hooks/state
- State + fetch in the same component unless the fetch is shared across 3+ components
- CSS variables via `style={{ ... }}` inline — do not add new Tailwind config entries
- Icons: `lucide-react` only — import by name, size 12–16 for UI chrome, 20–24 for empty states
- No component wraps a layout — use `space-y-6` at the root, `space-y-3` inside cards
- No `className` string concatenation — use separate `style` props for dynamic values

---

## What NOT to do

- No colored backgrounds on cards (surface only — no blue/green/purple cards)
- No shadows except via `card-hover` and `glow-primary` utilities
- No `font-size` above `text-2xl` in dashboard UI (KPI values max)
- No `text-white` / `text-black` — always use color tokens
- No hardcoded hex values in component files — reference CSS variables
- No decorative illustrations or icon-heavy empty states beyond the single emoji convention
