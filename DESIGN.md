# ClawHQ Design System

**Version:** 2026.4 | **Theme:** Dark-native agent control plane

## 1. Visual Theme & Atmosphere

ClawHQ is a dense, keyboard-driven control plane for AI agents. The visual language is dark-native — darkness is the medium, not an option. Surfaces emerge from the background through luminance steps, not color. The aesthetic is precision-engineered: every border, badge, and status indicator earns its place. Think Linear meets terminal — functional without sacrificing craft.

**Key Characteristics:**
- Near-black base: `#0d0f14` with cool undertone
- Information density over whitespace padding
- Accent colors reserved for status and action (never decoration)
- Typography-forward — text hierarchy is the primary navigation system
- Semantic CSS variables everywhere — no hardcoded hex in components
- Status system (active/running/degraded/offline) as first-class design element

---

## 2. Color Palette & Roles

All colors defined as CSS variables in `globals.css`. Never use raw hex values in components.

### Backgrounds

| Token | Hex | Role |
|-------|-----|------|
| `--color-bg` | `#0d0f14` | Page canvas — deepest dark |
| `--color-surface` | `#13161e` | Card and panel backgrounds |
| `--color-surface-2` | `#1a1d28` | Elevated surfaces, dropdowns, inputs |
| `--color-surface-3` | `#21253a` | Hover states, selected rows |

### Text

| Token | Role |
|-------|------|
| `--color-text` | Primary text — near-white, warm cast |
| `--color-text-muted` | Secondary text, descriptions |
| `--color-text-subtle` | Timestamps, metadata, placeholders |

### Accents (use sparingly — status and action only)

| Token | Role |
|-------|------|
| `--color-primary` | Primary CTA, active nav, focus rings (`#7c6ef7`) |
| `--color-primary-dim` | Primary backgrounds, badge fills |
| `--color-secondary` | Success, healthy, active status (`#4fc3f7`) |
| `--color-secondary-dim` | Success badge backgrounds |
| `--color-accent` | Productivity / yellow-warm accent |
| `--color-accent-dim` | Accent badge backgrounds |
| `--color-warning` | Warnings, degraded, missing requirements (`#f59e0b`) |
| `--color-error` | Errors, failed status, critical (`#e05c5c`) |
| `--color-hermes` | Hermes-specific accent (distinct from primary) |

### Borders

| Token | Role |
|-------|------|
| `--color-border` | Standard card borders — semi-transparent |
| `--color-border-strong` | Input and interactive element borders |

---

## 3. Typography Rules

**Primary font:** System stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`  
**Display font:** `var(--font-display)` — used for card titles, stat values, headings  
**Mono font:** `ui-monospace, "SF Mono", Menlo, Monaco, monospace`

### Hierarchy

| Role | Classes | Notes |
|------|---------|-------|
| Page title | `text-xl font-bold` | Top of each page |
| Section header | `text-xs font-bold uppercase tracking-widest` + `--color-text-subtle` | Category dividers |
| Card title | `text-sm font-bold` + `--font-display` + `-0.01em letter-spacing` | Primary card labels |
| Body | `text-sm` + `--color-text` | Default content |
| Secondary | `text-sm` + `--color-text-muted` | Descriptions, subtitles |
| Label / meta | `text-xs` + `--color-text-muted` | Timestamps, tags, property labels |
| Stat value | `text-2xl font-bold` + `--font-display` | Dashboard metric numbers |
| Mono / ID | `text-xs font-mono` + `--color-text-subtle` | IDs, keys, hex values |

---

## 4. Component Stylings

### Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
}
.card-hover:hover {
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  border-color: var(--color-border-strong);
}
```

**Rules:**
- Never nest cards inside cards
- Active state: replace `border` with `border-top: 2px solid [accent]`, square the top corners, add accent glow shadow
- Loading skeleton: `animate-pulse` with `--color-surface-2` fill

### Status Badges

```tsx
// Active
background: color-mix(in srgb, [accentColor] 13%, transparent)
color: [accentColor]
border: 1px solid color-mix(in srgb, [accentColor] 27%, transparent)

// Inactive
background: var(--color-surface-2)
color: var(--color-text-subtle)
border: 1px solid var(--color-border)

// Warning
background: color-mix(in srgb, var(--color-warning) 10%, transparent)
color: var(--color-warning)
```

Pattern: `px-2.5 py-0.5 rounded-full text-xs font-medium`

### Toggle (active/inactive)

```tsx
// Track
background: active ? accentColor : "var(--color-surface-2)"
border: active ? none : "1px solid var(--color-border-strong)"
// Knob: absolute, white circle, translates right when active
```

### Buttons

**Primary:**
```css
background: var(--color-primary);
color: #fff;
border-radius: 8px;
padding: 0.5rem 1rem;
```

**Secondary/Ghost:**
```css
background: var(--color-surface-2);
color: var(--color-text-muted);
border: 1px solid var(--color-border);
```

**Destructive:**
```css
background: color-mix(in srgb, var(--color-error) 15%, transparent);
color: var(--color-error);
border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
```

### Inputs

```css
background: var(--color-surface-2);
border: 1px solid var(--color-border-strong);
border-radius: 8px;
color: var(--color-text);
```
Focus: `outline: none; border-color: var(--color-primary)`

### Navigation (Sidebar)

Active link:
```css
background: var(--color-primary-dim);
color: var(--color-primary);
border-left: 2px solid var(--color-primary); /* optional */
```

Hover: `background: var(--color-surface-2)` — never a full fill

---

## 5. Layout Principles

**Spacing scale (Tailwind):** 1 = 4px. Prefer `gap-3` (12px), `gap-4` (16px), `p-4` (16px), `p-6` (24px).

**Page structure:**
```
Sidebar (w-64, fixed) | Scrollable main content (flex-1, max-w-5xl)
```

**Grid patterns:**
- Stats row: `grid-cols-2 md:grid-cols-4 gap-4`
- Card grid: `grid-cols-1 md:grid-cols-2 gap-4`
- Full width: `space-y-6 max-w-5xl`

**Section headers:** Always `flex items-center gap-3 mb-4` with a 1px horizontal rule flex-growing between label and count badge.

**Whitespace philosophy:** Dense but scannable. `space-y-10` between major sections, `space-y-4` within. No gratuitous padding — every gap communicates hierarchy.

---

## 6. Depth & Elevation

Three elevation levels:

| Level | Token | Usage |
|-------|-------|-------|
| Base | `--color-bg` | Page canvas |
| Surface | `--color-surface` | Cards, panels |
| Elevated | `--color-surface-2` | Dropdowns, inputs, hover states |

Shadows are used only for active state emphasis, not decoration:
```css
/* Active card glow */
box-shadow: 0 0 0 1px color-mix(in srgb, [accent] 13%, transparent),
            0 4px 24px rgba(0,0,0,0.3);
```

No `shadow-lg` or heavier. No inner glows on inactive elements.

---

## 7. Do's and Don'ts

**Do:**
- Use CSS variable tokens — `var(--color-primary)`, never `#7c6ef7`
- Use `color-mix(in srgb, [color] N%, transparent)` for alpha variants
- Respect the status system — green for healthy, cyan for active, amber for warning, red for error
- Add `animate-fade-in` on page-level containers
- Use `transition-colors duration-150` on interactive elements
- Show skeleton loaders (`animate-pulse`) rather than spinners for initial loads
- Use `font-mono text-xs` for IDs, keys, and numeric identifiers

**Don't:**
- Nest cards inside cards
- Use pure black `#000` — always use `--color-bg` or deeper surfaces
- Use accent colors for decoration (only status and action)
- Use gray text on colored backgrounds
- Add heavy box shadows to static elements
- Use `border-radius` larger than `12px` for cards (use `rounded-full` only for badges/avatars)
- Mix inline style hex values with CSS variable tokens in the same component

---

## 8. Responsive Behavior

- **Sidebar:** Slides in as a sheet on mobile (`md:hidden` toggle)
- **Card grids:** `grid-cols-1 md:grid-cols-2` — single column on mobile
- **Stats row:** `grid-cols-2 md:grid-cols-4` — 2-up on mobile
- **Max content width:** `max-w-5xl` (1024px) — no full-bleed content
- **Touch targets:** Minimum `py-2 px-3` (40px height) for all interactive elements

---

## 9. Agent Prompt Guide

When asking AI to build UI for this dashboard:

```
Build a [component] for the ClawHQ dashboard.
Design system: dark-native, CSS variables (--color-bg, --color-surface, --color-surface-2, 
--color-primary, --color-secondary, --color-text, --color-text-muted, --color-text-subtle, 
--color-border, --color-error, --color-warning).
Pattern: .card class for containers, status badges with color-mix alpha fills, 
animate-fade-in on mount, skeleton loaders during fetch, text-sm body text.
No hardcoded hex. No nested cards. Accent colors for status only.
```

**Quick color reference:**
- Primary/CTA: `var(--color-primary)` 
- Healthy/active: `var(--color-secondary)`
- Warning/degraded: `var(--color-warning)` 
- Error/failed: `var(--color-error)`
- Card background: `var(--color-surface)`
- Input/elevated: `var(--color-surface-2)`
