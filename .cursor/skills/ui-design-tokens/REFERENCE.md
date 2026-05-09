# UI Design Tokens — Reference

## Recommended scale tokens for Theme.qml

Add this block after the color role properties (after line 103 in the current file).

```qml
// ── Scale tokens ─────────────────────────────────────────────────────────
// Spacing — 4 px base grid
readonly property int sp1:  4
readonly property int sp2:  8
readonly property int sp3:  12
readonly property int sp4:  16
readonly property int sp6:  24
readonly property int sp8:  32
readonly property int sp12: 48

// Type scale — role names, not sizes
readonly property int typeXs:    9   // nav labels, badges, timestamps
readonly property int typeSm:    11  // captions, metadata, secondary info
readonly property int typeMd:    13  // body text, inputs, list items
readonly property int typeLg:    16  // card content, section subheadings
readonly property int typeXl:    20  // page titles, hero text

// Corner radius scale
readonly property int radiusSm:  6   // chips, badges, small buttons
readonly property int radiusMd:  10  // cards, panels, list items
readonly property int radiusLg:  16  // dialogs, drawers, large surfaces
readonly property int radiusFull: 9999 // pills, circular avatars

// Motion / duration scale
readonly property int durFast:   80   // micro: button press, scale bounce
readonly property int durNormal: 150  // standard: color, opacity transitions
readonly property int durSlow:   300  // structural: panel slide, page push
```

---

## Catppuccin role mapping

Catppuccin does NOT define "orange" separately from "peach" in Mocha. The current `_mOrange = _mPeach = #FAB387`. Remove `orange` and use `peach` for warm accent (warnings, heat). Use `yellow` for caution/highlight.

| Semantic role    | Catppuccin token | Use for |
|---|---|---|
| `interactive`    | `blue`           | Primary buttons, links, active state |
| `accent`         | `mauve`          | Secondary accent, selected items |
| `positive`       | `green`          | Success, correct answers |
| `negative`       | `red`            | Errors, destructive actions |
| `caution`        | `yellow`         | Warnings, borderline states |
| `warm`           | `peach`          | Leeches, heat/urgency indicators |
| `info`           | `sapphire`       | Info badges, tooltips |
| `surface`        | `surface`        | Card background |
| `surface2`       | `surface2`       | Input fields, inset elements |
| `interactive-bg` | `activeP`        | Hovered/selected nav item bg |

---

## W3C Design Token type reference

| Token type   | QML property type | Example |
|---|---|---|
| `color`      | `color`           | `Theme.blue` |
| `dimension`  | `int` / `real`    | `Theme.sp4` (16 px) |
| `fontSizes`  | `int`             | `Theme.typeMd` (13) |
| `duration`   | `int`             | `Theme.durNormal` (150) |
| `borderRadius` | `int`           | `Theme.radiusMd` (10) |

W3C rule: **alias tokens** must reference another token by name, not a raw value.  
Bad: `Theme.cardRadius = 10`  
Good: `Theme.cardRadius = Theme.radiusMd`

(QML doesn't support property-to-property aliases for value types, so document aliases in a comment: `readonly property int cardRadius: radiusMd // alias`)

---

## Audit — common raw values to replace per file

Run this grep to find all raw numbers that should become tokens:

```bash
# Font sizes
rg 'font\.pixelSize:\s*\d+' ui/qml/ -o | sort | uniq -c | sort -rn

# Radii
rg 'radius:\s*\d+' ui/qml/ -o | sort | uniq -c | sort -rn

# Durations
rg 'duration:\s*\d+' ui/qml/ -o | sort | uniq -c | sort -rn

# Spacing (margins/padding/spacing)
rg '(leftMargin|rightMargin|topMargin|bottomMargin|spacing|padding):\s*\d+' ui/qml/ -o \
  | sort | uniq -c | sort -rn
```

---

## Migration checklist per file

- [ ] Replace `font.pixelSize: <n>` with `Theme.typeXx`
- [ ] Replace `radius: <n>` with `Theme.radiusXx`
- [ ] Replace `spacing: <n>` with `Theme.spN`
- [ ] Replace `*Margin: <n>` with `Theme.spN`
- [ ] Replace `duration: <n>` in `NumberAnimation`/`ColorAnimation` with `Theme.durXx`
- [ ] Verify no `border.color: "#hex"` — use `Theme.*` color role
- [ ] No hardcoded grey `"#6C..."` — use `Theme.subtext` or `Theme.textDim`
- [ ] Build and run app; check visually for misalignments

---

## Refactoring UI — five highest-ROI changes for this app

1. **Reduce font size count to 5** — the current 14 sizes create no clear hierarchy.
2. **Add `font.weight: Font.Medium` to interactive labels** — weight signals clickability faster than color alone.
3. **Replace thin borders with background shifts** — `border.width: 1; border.color: Theme.overlay` → change card bg to `Theme.surface2` instead.
4. **Use `Theme.sp*` for all margins** — visual rhythm comes from consistent spacing, not consistent widget size.
5. **Give empty states a CTA** — most empty states in the app are just a label; add a button that takes the user directly to the action.
