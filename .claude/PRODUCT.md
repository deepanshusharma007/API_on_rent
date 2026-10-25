# AIRent — Product Context

## Product Purpose
AIRent is an AI API rental marketplace. Users pay a small flat fee to rent a virtual API key for a fixed duration (15 min to 24 hours) and token budget. They get immediate access to GPT-4o, Gemini, and Claude models via an OpenAI-compatible endpoint — no subscription, no monthly commitment, no credit card required for long-term lock-in. Pay once, use now, gone when expired.

## Register
product

## Users
**Primary:** Indie developers, students, hackathon participants, and researchers who need burst access to frontier AI models without committing to a monthly API subscription. Budget-conscious, technically literate, allergic to friction. They compare prices in their head while reading the pricing table. They want the key in their clipboard in under 60 seconds.

**Secondary:** Small teams evaluating models for a project. They rent, test, and decide — then graduate to their own API keys or come back for more.

**Anti-user:** Enterprise procurement teams, companies needing SLAs, users who don't know what an API is.

## Brand
- **Name:** AIRent
- **Tone:** Direct, technical, no-nonsense. Writes like a good CLI help message: terse, precise, no adjectives that don't add information.
- **Not:** Startup-hype, "revolutionary", "seamless", "cutting-edge". Never em dashes.
- **Voice sample:** "Rent a GPT-4o key. 15 minutes. 20K tokens. Expires automatically." Not: "Experience the future of AI with our seamless, cutting-edge API rental platform."

## Strategic Principles
1. **Speed over features.** The path from landing to active key should be the shortest in the product.
2. **Honest pricing.** No dark patterns, no hidden fees, no upsell modals mid-checkout.
3. **Provider agnostic.** OpenAI, Gemini, Anthropic — the user picks, we route.
4. **Self-expiring.** Keys expire automatically. No cancellation flow needed.

## Anti-references (do NOT look like these)
- Replicate.com (too developer-portal heavy)
- OpenAI platform (too corporate, too blue)
- Any SaaS with a purple gradient hero and "Start for free" CTA
- Glassmorphism card grids with blur backgrounds

## Pages
- **LandingPage** — hero, how-it-works, pricing teaser, provider logos, CTA
- **Marketplace** — 3-step flow: pick provider, pick plan, pay
- **Dashboard** — active rentals with countdown timers, token bars, key copy, invoice
- **Playground** — test your virtual key live, send a chat message, see the response
- **AdminPanel** — manage provider keys (add/toggle/budget), plans (CRUD), view users/stats/rentals
- **Login / Register** — minimal auth forms
- **Pricing** — full plan comparison table
- **ApiDocs** — curl/Python/JS usage examples
- **About, FAQ, Contact, Status** — supporting pages
