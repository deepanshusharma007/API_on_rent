# AIRent — Design System

## Aesthetic
**Neon-Brutalist.** Deep navy-black background, electric green accent, structural visible grid lines, sharp corners (border-radius: 4px max), no shadows, no glass. The grid is part of the design — 1px navy lines showing through component gaps. Feels like a terminal that grew up.

## Color Strategy: Committed
Electric green carries ~40% of interactive surfaces. Navy is the canvas. No gradients on text (ever). No purple. No violet-fuchsia.

## Palette (OKLCH)
```
--nb-bg:           oklch(12% 0.028 255)   /* deep navy-black — body background */
--nb-surface:      oklch(16% 0.032 255)   /* card background */
--nb-raised:       oklch(20% 0.034 255)   /* input fields, code blocks */
--nb-overlay:      oklch(24% 0.034 255)   /* hover state surfaces */

--nb-grid:         oklch(22% 0.038 255)   /* visible 1px structural grid lines */
--nb-border:       oklch(26% 0.036 255)   /* default component borders */
--nb-border-hi:    oklch(38% 0.04 255)    /* hovered/active borders */

--nb-text:         oklch(93% 0.008 255)   /* primary text — cool off-white */
--nb-text-2:       oklch(68% 0.014 255)   /* secondary text */
--nb-text-3:       oklch(48% 0.018 255)   /* muted text */
--nb-text-4:       oklch(32% 0.022 255)   /* disabled / placeholder */

--nb-green:        oklch(78% 0.22 145)    /* electric green — primary accent */
--nb-green-hi:     oklch(84% 0.2 145)     /* hover state */
--nb-green-dim:    oklch(78% 0.22 145 / 0.12)  /* focus ring, subtle tint */
--nb-green-bg:     oklch(16% 0.06 145)    /* green-tinted surface */
--nb-green-border: oklch(30% 0.1 145)     /* green-tinted border */

--nb-danger:       oklch(65% 0.22 25)
--nb-warning:      oklch(75% 0.18 75)
--nb-info:         oklch(68% 0.18 240)
```

## Typography
- **Headings:** Geist Sans — geometric, structural, tight tracking (-0.04em display, -0.025em headline)
- **Body:** Inter — 15px / 1.72 line-height
- **Mono:** Geist Mono — used for labels, badges, eyebrows, code
- **Scale:** display (clamp 3rem→6.5rem) / headline (1.5rem→2.4rem) / title (1rem) / body (0.9375rem) / small (0.8125rem) / label (0.6875rem mono uppercase)
- **Line length:** body prose capped at 62ch

## Layout
- **Grid:** 12-column, 1px gaps show as structural lines via `--nb-grid` background-color on the container
- **Spacing:** non-uniform — hero has generous padding, cards are tighter, labels are compact
- **Bento grid:** primary layout pattern for feature sections and dashboards. 6-column at desktop, collapses to 2 then 1 on mobile
- **Max width:** 1280px content, 900px for focused flows (auth, checkout steps)
- **Border radius:** 4px everywhere. Nothing rounder.

## Component Patterns
- **Cards:** `background: --nb-surface`, `border: 1px solid --nb-border`, `border-radius: 4px`. Hover lifts border color to `--nb-border-hi`. No shadow.
- **Buttons — Primary:** `background: --nb-green`, dark text `oklch(12% 0.04 145)`, `font-weight: 700`
- **Buttons — Secondary:** transparent bg, `border: 1px solid --nb-border`, hover shows surface
- **Badges:** Geist Mono, 0.6375rem, uppercase, green-tinted bg, green border, 2px radius
- **Form fields:** `background: --nb-raised`, green focus ring (`box-shadow: 0 0 0 3px --nb-green-dim`), no rounded corners
- **Dividers:** `height: 1px; background: --nb-border` — used as section separators

## Motion
- `fadeUp`: `translateY(16px) → 0`, 450ms `cubic-bezier(0.22,1,0.36,1)`
- `fadeIn`: opacity 0→1, 350ms ease
- No bounce, no elastic, no layout-property animation
- Marquee: `translateX(0 → -50%)`, 32s linear

## Absolute Bans (enforced)
- No gradient text (`background-clip: text`)
- No glassmorphism (backdrop-filter blur on decorative cards)
- No side-stripe `border-left` accents > 1px
- No hero-metric template (big number + gradient circle)
- No identical card grids (icon + heading + text × N)
- No purple, violet, fuchsia — the previous palette. Fully replaced by electric green.
- No em dashes in copy

## Visible Grid Pattern
```css
.nb-grid-bg {
  background-image:
    linear-gradient(var(--nb-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--nb-grid) 1px, transparent 1px);
  background-size: 80px 80px;
}
```
Used on hero backgrounds and section backgrounds. The grid IS the texture — no noise, no gradient blobs.

## Page-specific Notes
- **Landing hero:** full-viewport, grid texture bg, display type, single green CTA, provider logos below fold
- **Marketplace:** 3-column step layout at desktop. Steps are numbered rows, not tabs. Selected state uses green border on the card.
- **Dashboard:** bento layout — rental cards are bento cells. Token bar uses green fill. Countdown uses mono font.
- **Playground:** split layout — left is the chat input/model selector, right is the response pane with mono font
- **AdminPanel:** dense data table layout. Tabs for sections. No decorative elements.
