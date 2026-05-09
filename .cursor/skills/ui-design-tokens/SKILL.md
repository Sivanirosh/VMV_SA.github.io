---
name: ui-design-tokens
description: Improve visual design using Refactoring UI principles and W3C Design Token structure. Extends Theme.qml with spacing, type, radius, and duration scales. Use when user mentions improving UI design, visual hierarchy, design tokens, spacing system, type scale, Theme.qml, or wants to reduce hardcoded values in QML files.
---

# UI Design Tokens

Combines two frameworks: **Refactoring UI** (what to fix and why) + **W3C Design Tokens** (how to encode the decisions). The output always lands in `ui/qml/Theme.qml`.

## Quick start

1. Run the audit: grep for raw numbers in QML files — font sizes, margins, radii, durations.
2. Identify which of the four scales is most inconsistent (see Workflow).
3. Define the scale in Theme.qml's token section.
4. Replace raw values in components one file at a time.

## Workflow

### Step 1 — Audit (read-only)
- Count distinct `font.pixelSize` values → should be ≤ 7
- Count distinct `radius` values → should be ≤ 5
- Count distinct `spacing/margin/padding` values → should be ≤ 8
- Count distinct animation `duration` values → should be ≤ 4

### Step 2 — Define scales in Theme.qml

Add a "Scale tokens" section **below** the color role properties.

See [REFERENCE.md](REFERENCE.md) for the exact token table and Catppuccin-specific notes.

### Step 3 — Replace raw values
Replace in priority order: **type → spacing → radius → duration**.
Do one file at a time; build and verify visually between files.

### Step 4 — Validate W3C token rules
- Every token has a semantic name (never `blue`, always `interactive` or `accent`).
- Raw palette values (`_mBlue`) are private (prefixed `_`). ✓ Already done.
- Alias tokens reference other tokens, not hex strings.
- No component should use a raw value that has a token equivalent.

## Key Refactoring UI rules

1. **Hierarchy ≠ size alone** — use weight + color + space together.
2. **Spacing scale is not linear** — use exponential steps (4, 8, 12, 16, 24, 32, 48).
3. **Don't use grey on color** — on a colored bg, use a semi-transparent version of the bg color.
4. **Limit border use** — prefer background difference or subtle shadow over `border.width: 1`.
5. **Empty states need personality** — large icon + heading + subtext + CTA, not just a message.

## Advanced

See [REFERENCE.md](REFERENCE.md) for:
- Full token table with recommended values for this codebase
- Catppuccin-specific role mapping
- W3C token type reference
- Migration checklist per QML file
