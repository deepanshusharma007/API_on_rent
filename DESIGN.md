---
name: AIRent
description: Pay-per-use AI API rental for developers and students in India.
colors:
  midnight-slate-bg: "#0d1117"
  midnight-slate-surface: "#161b22"
  midnight-slate-raised: "#1c2128"
  midnight-slate-overlay: "#222930"
  border-default: "#30363d"
  border-interactive: "#484f58"
  text-primary: "#e6edf3"
  text-secondary: "#8b949e"
  text-muted: "#484f58"
  forest-pulse: "#10b981"
  forest-pulse-hi: "#34d399"
  forest-pulse-bg: "#052e16"
  forest-pulse-border: "#065f46"
  semantic-danger: "#f85149"
  semantic-warning: "#d29922"
  semantic-info: "#58a6ff"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 3vw, 2.4rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.08em"
  mono:
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "48px"
  2xl: "80px"
  3xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.forest-pulse}"
    textColor: "#022c22"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.forest-pulse-hi}"
    borderColor: "{colors.forest-pulse-hi}"
  button-secondary:
    backgroundColor: "{colors.midnight-slate-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.midnight-slate-overlay}"
    borderColor: "{colors.border-interactive}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.midnight-slate-surface}"
    rounded: "{rounded.md}"
    padding: "24px"
  input:
    backgroundColor: "{colors.midnight-slate-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "9px 13px"
---

# Design System: AIRent

## 1. Overview

**Creative North Star: "The Indie Studio"**

AIRent was built by one developer who hit a real wall and decided to remove it. The design system carries that same energy: made with genuine care, not assembled from a template. It does not try to look like a venture-backed startup. It does not imitate the ultra-minimal aesthetic of tools like Vercel or Linear. It has warmth where those tools have coldness, and character where they have blankness.

The physical scene: a student or indie developer, late at night at their desk, laptop screen the dominant light source, testing an idea before it becomes a product. The interface is the only thing between them and their work. Dark because the ambient light demands it. Not pitch black, because pure black is harsh and alienating. Midnight Slate: a tinted, breathing dark that feels like a well-lit studio at 11pm, not a server room at 3am.

The single accent, Forest Pulse emerald, earns its place precisely because it is rare. It marks action, success, and focus. It does not decorate. It does not appear on half the screen. Every emerald pixel is intentional. The system explicitly rejects: white-background SaaS corporate polish, pitch-black terminal minimalism, rainbow gradient startup playfulness, and the badge-heavy information overload of Indian fintech apps.

**Key Characteristics:**
- Tinted-dark surfaces in four steps, never pure black
- One accent color (Forest Pulse emerald), used on less than 10% of any surface
- Inter for everything: warm humanist sans, no serif, no display type
- Gently curved edges (8px on interactive elements, 12px on containers)
- Elevation through tonal layering, not drop shadows
- Dot-grid body texture: present but almost imperceptible (3% opacity)
- Framer Motion for scroll reveals; 300ms page fade-in on load

## 2. Colors: The Midnight Slate Palette

Four surface steps build depth without shadows; one accent provides all directed energy.

### Primary
- **Forest Pulse** (`#10b981`): The sole action color. Used on primary buttons, active states, focus rings, links, progress indicators, and the eyebrow label. Its rarity is its power. Appears on less than 10% of any given screen.
- **Forest Pulse Hi** (`#34d399`): Hover state of Forest Pulse. Slightly lighter and more vibrant, signaling responsiveness without introducing a second hue.

### Neutral (Surfaces)
- **Midnight Slate BG** (`#0d1117`): Page background. Slate-tinted, not pure black. Carries a subtle dot-grid texture (2px dots at 24px intervals, rgba(255,255,255,0.03)).
- **Midnight Slate Surface** (`#161b22`): First elevation layer. Cards, panels, sidebars. One step above the page.
- **Midnight Slate Raised** (`#1c2128`): Second elevation layer. Inputs, code blocks, nested content, table rows.
- **Midnight Slate Overlay** (`#222930`): Third elevation layer. Dropdowns, tooltips, hover states on interactive surfaces.
- **Border Default** (`#30363d`): All resting borders. Subtle but present.
- **Border Interactive** (`#484f58`): Border on hover or focus. Same hue family, more visible.

### Neutral (Text)
- **Text Primary** (`#e6edf3`): All body copy, headings. Off-white with a blue tint; never pure white.
- **Text Secondary** (`#8b949e`): Supporting copy, meta information, labels.
- **Text Muted** (`#484f58`): Placeholders, disabled text, ornamental punctuation.

### Semantic
- **Danger** (`#f85149`): Error states, destructive actions only.
- **Warning** (`#d29922`): The announcement banner; cautionary messages.
- **Info** (`#58a6ff`): Informational badges, GET method labels in the API docs.

### Named Rules
**The Forest Pulse Rule.** The emerald accent appears on fewer than 10% of any screen. It is used for exactly three things: primary action, active/selected state, and focus ring. If you are reaching for it to add visual interest, stop and find a structural solution instead.

**The Tinted Neutrals Rule.** Every surface is tinted toward the slate-indigo hue. `#000000` and `#ffffff` are forbidden. If a color looks like it came from a default palette, it is wrong.

## 3. Typography

**Body Font:** Inter (with -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif fallback stack)
**Mono Font:** JetBrains Mono (with Fira Code, ui-monospace fallback)

**Character:** Inter is the workhorse. Warm humanist geometry; legible at every size; honest without being cold. No serif, no display typeface. The mono stack handles all code, API keys, and technical strings; it signals precision without switching personality.

### Hierarchy
- **Display** (800 weight, clamp(2.5rem, 6vw, 4rem), line-height 1.08, -0.035em tracking): Hero headlines only. One per page.
- **Headline** (800 weight, clamp(1.7rem, 3vw, 2.4rem), line-height 1.2, -0.025em tracking): Section titles. Tight tracking pulls weight into authority without decoration.
- **Title** (700 weight, 1.25rem, line-height 1.4, -0.01em tracking): Card headings, modal titles, sidebar labels.
- **Body** (400 weight, 1rem, line-height 1.65): All prose. Maximum line length 65ch enforced via `.prose-width`. The generous line-height is deliberate: this product's copy is read carefully, not scanned.
- **Label / Eyebrow** (700 weight, 0.7rem, line-height 1.5, 0.08em tracking, uppercase): Section eyebrows, badge text, table headers, status chips. Uniform tracking at 0.08em across both `.badge` and `.eyebrow`.

### Named Rules
**The Single Stack Rule.** Inter handles everything except code. No mixing of serif and sans. No decorative display faces. If a moment calls for visual drama, achieve it through weight contrast and scale, not a different font.

**The Tight Headline Rule.** Negative letter-spacing (-0.025em to -0.035em) on display and headline sizes. At small sizes (label, body), letter-spacing is neutral or slightly open. Never apply negative tracking to body copy.

## 4. Elevation

This system is tonal, not shadow-based. Depth is communicated through the four Midnight Slate surface steps: BG, Surface, Raised, Overlay. Each step is approximately 6-7 lightness points above the last in the slate-indigo direction. A card sits on Surface; an input inside that card sits on Raised; a dropdown from that input sits on Overlay.

Cards carry one structural shadow (`0 1px 3px rgba(0,0,0,0.4)`) for gentle physical separation from the background. This is ambient lift, not decorative depth. The shadow is never increased on hover; border color shifts to Border Interactive instead.

The focus ring (`2px solid #10b981, offset 2px`) is the only element that uses the accent color for elevation-adjacent purposes. It floats above everything else intentionally.

### Shadow Vocabulary
- **Ambient lift** (`box-shadow: 0 1px 3px rgba(0,0,0,0.4)`): Cards and surface containers only. Separates content from background without theatrics.
- **Focus glow** (`box-shadow: 0 0 0 3px rgba(16,185,129,0.15)`): Inputs on focus. Soft emerald halo; confirms keyboard position.
- **Error glow** (`box-shadow: 0 0 0 3px rgba(248,81,73,0.15)`): Inputs in error state.

### Named Rules
**The Tonal Depth Rule.** Shadows do not create hierarchy; surface steps do. The four-step surface ramp is the elevation system. Shadows appear only as ambient lift on cards and focus/error glows on inputs. Any other shadow is an invention.

## 5. Components

Components are warm and grounded. Edges are slightly soft (8px on interactive elements, 12px on containers). Nothing has sharp 0px corners; nothing is fully pill-shaped except explicit status indicators. Every interactive element responds within 150ms.

### Buttons
- **Shape:** Gently curved (8px radius)
- **Primary:** Forest Pulse background (`#10b981`), very dark emerald text (`#022c22`), 10px 20px padding, 0.875rem 600-weight Inter. The dark text on the bright accent is deliberate; white text would push it toward generic SaaS green.
- **Hover / Focus:** Background shifts to Forest Pulse Hi (`#34d399`); 150ms ease transition. Focus ring is 2px Forest Pulse, offset 2px.
- **Secondary:** Midnight Slate Raised background, Text Primary color, Border Default border. Hover lifts to Overlay background with Border Interactive border.
- **Ghost:** Transparent background, Text Secondary color. Hover brings a Raised background. Used for low-priority actions in dense contexts.
- **Disabled:** 50% opacity across all variants. `pointer-events: none`.

### Badges / Chips
- **Style:** Forest Pulse Bg background (`#052e16`), Forest Pulse Hi text (`#34d399`), Forest Pulse Border border (`#065f46`). 4px radius, 0.7rem 600-weight, 0.08em tracking, uppercase.
- **Purpose:** Status labels, plan tier indicators, feature callouts. Never used decoratively.

### Cards / Containers
- **Corner style:** Gently rounded (12px radius)
- **Background:** Midnight Slate Surface (`#161b22`)
- **Shadow:** Ambient lift only (`0 1px 3px rgba(0,0,0,0.4)`)
- **Border:** Border Default at rest; Border Interactive on hover
- **Internal padding:** 24px standard; 32px for prominent founder/feature cards
- **Rule:** One level only. Cards do not contain cards.

### Inputs / Fields
- **Style:** Midnight Slate Raised background, Border Default border, 8px radius, 9px 13px padding
- **Focus:** Border shifts to Forest Pulse; soft focus glow (`0 0 0 3px rgba(16,185,129,0.15)`)
- **Error:** Border shifts to Danger red; error glow (`0 0 0 3px rgba(248,81,73,0.15)`)
- **Placeholder:** Text Muted (`#484f58`)
- **Hover:** Border shifts to Border Interactive

### Navigation (Navbar)
- Fixed top, full width, Midnight Slate Surface background with Border Default bottom border
- Logo left, links center-right, CTAs far right
- Active link: Text Primary color, no underline
- Inactive links: Text Secondary; hover to Text Primary with 150ms transition
- Mobile: collapses to hamburger; full-screen or slide-in drawer

### Eyebrow / Section Label
- Uppercase Inter, 0.7rem, 700 weight, 0.08em tracking, Forest Pulse color
- Appears above section headlines to provide category context
- Never used inside cards; it lives at section level only

### Announcement Banner
- Fixed top, amber-600 background (`#d97706`), dark text (`#1c1917`), 2px Border Default bottom border, 40px height
- Scrolling marquee (55s, pauses on hover) for low-priority system messages
- Dismiss button far right with hover state

## 6. Do's and Don'ts

### Do:
- **Do** use the four Midnight Slate surface steps to communicate depth. BG for the page, Surface for panels, Raised for inputs and nested content, Overlay for dropdowns.
- **Do** keep Forest Pulse on fewer than 10% of any screen. Its rarity is what makes primary actions feel decisive.
- **Do** tint every neutral toward the slate-indigo hue. Test by asking: does this look like it could be from a default browser stylesheet? If yes, it needs a tint.
- **Do** use negative letter-spacing on headlines (-0.025em to -0.035em) and slightly open tracking on labels (0.08em). Scale and weight do the hierarchy work; tracking reinforces it.
- **Do** cap body copy at 65ch using `.prose-width`. Long lines break the warmth.
- **Do** use Framer Motion ease-out expo curves for scroll reveals. `[0.22, 1, 0.36, 1]` is the standard easing. Offsets: 20px vertical, 24px horizontal. Duration: 0.5s.
- **Do** write copy that is direct and honest. "Rent a key" not "Access our premium API gateway." This is a product that respects its users' intelligence.
- **Do** use INR amounts, UPI references, and Indian developer context as first-class content. They are not localization footnotes.

### Don't:
- **Don't** use white or light backgrounds. AIRent is a dark-surface product. The physical scene is a developer at night. A light mode would break the system's identity.
- **Don't** use `#000000` or `#ffffff` anywhere. Tinted or nothing.
- **Don't** use gradient text (`background-clip: text` with a gradient). Single solid color only. Emphasis through weight or size.
- **Don't** use side-stripe borders (colored `border-left` or `border-right` greater than 1px as an accent). Use full borders, background tints, or leading icons instead.
- **Don't** use glassmorphism (backdrop-filter blur used decoratively). Rare and purposeful, or removed entirely.
- **Don't** build a hero-metric template (big number, small label, gradient accent, supporting stats grid). It is SaaS cliché and contradicts the Earned Confidence principle.
- **Don't** make identical card grids (same-height cards, same icon/heading/text structure repeated). Vary layout, vary proportion, use lists and inline patterns before defaulting to a card.
- **Don't** reach for a modal as a first response. Exhaust inline, progressive disclosure, and page-level alternatives first.
- **Don't** imitate OpenAI's white/blue corporate aesthetic, Vercel's pitch-black ultra-minimalism, or colorful-startup rainbow gradients. These are the explicit anti-references from PRODUCT.md and they are prohibited here.
- **Don't** add a second accent color. Forest Pulse is the only accent. Semantic colors (Danger, Warning, Info) serve feedback only and are not brand accents.
- **Don't** use em dashes (—) in UI copy. Commas, colons, semicolons, and parentheses carry the same meaning without the typographic formality.
