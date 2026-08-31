# Design Principles

This is the one-page reference document defining the visual tone of the screens
for a hiring solution built around problem-solving assessment in the AI era.
Since this is a B2B product used by both candidates and client companies
(HR/hiring managers), every screen must consistently convey a
**trustworthy, well-organized, calm, and professional impression**.

Every screen and component built from here on uses the three principles below as
a shared yardstick. If an individual screen deviates from these standards, fix
this document first — not the screen.

---

## Principle 1 — Generous Whitespace

Whitespace is not empty space; it is a tool for structuring information. Rather
than packing elements densely, use ample whitespace to naturally guide "what to
look at." The more generous the whitespace, the calmer the screen becomes, and
the more it builds the trust appropriate to the serious context of hiring.

**Practical guidelines**

- Between content blocks, use larger gaps the more distant their relationship.
  Express grouping through differences in spacing.
- Ensure sufficient padding around text and controls so nothing feels cramped.
- Do not try to fit everything on one screen. Lower the density, and do not fear
  scrolling.
- Do not pick whitespace values arbitrarily; choose only from the defined
  spacing scale.

---

## Principle 2 — Restrained Use of Color

Color is a resource for emphasis, and overusing it drains emphasis of its power.
Compose most of the screen from neutral achromatic colors (background, text,
borders), and use brand and accent colors sparingly — only to drive action or
signal state. Restrained color use leaves behind trust instead of flashiness.

**Practical guidelines**

- Build default screens primarily from achromatic colors, and use the accent
  color in only one or two places for the core action (e.g., submit).
- Use status colors (success, warning, error, info) only when their meaning is
  clear, never as decoration.
- Never convey information through color alone. Use text, icons, and shape
  together to preserve accessibility.
- Do not hardcode color values; reference them only through the color tokens to
  be defined later.

---

## Principle 3 — Clear Visual Hierarchy

When users open a screen, "the most important thing" must be immediately
apparent. Distinguish titles, body text, and supporting information clearly
through size, weight, and color contrast, and express elements of equal rank in
the same way. A clear hierarchy reduces the cognitive cost users pay to
interpret a screen.

**Practical guidelines**

- Each screen has only one primary focus (primary action / key information).
- Apply a consistent progression of size and weight from title → body →
  supporting text.
- Divide buttons into tiers by importance (primary, secondary, low-emphasis).
  As a rule, one primary button per screen.
- Group related information through alignment and spacing, and separate
  unrelated information.

---

## How to Use This Document

- When designing a new screen, use these three principles as a checklist.
- The concrete values behind the principles and the actual implementation
  (spacing, color, typography) are managed in separate design tokens. This
  document decides the "why" and the "what"; the tokens decide the "how much."
- If exceptions to a principle keep recurring, do not leave them unaddressed —
  update this document.
