# What this site must not look or read like

Research done 2026-11-15, before any design work. Sources are at the bottom. Each tell
is something more than one source names, or something a source measured.

## Colour and surface

1. Blue/indigo-to-purple gradients on the hero, buttons and icons (Tailwind `indigo-500` default). [1][2][3][4][5]
2. Gradient-filled headline text. [4]
3. Aurora / blob / floating-orb backgrounds, coloured glows, glowing text on dark. [3][4][5]
4. Large coloured box-shadows; 1 px border with a huge blur shadow. [5][6]
5. Glassmorphism panels with no reason to be glass. [4][5]
6. Neon palettes where several saturated colours fight. [3]
7. Dark mode with medium-grey body text that barely passes contrast. [5]
8. Coloured top or left edge stripe on cards; a different colour per card. [3][4][5]
9. Status dots that do not stand for a real state. [3]

## Layout

10. Full-viewport centred hero: badge pill, centred H1, centred sub-line, two buttons. [1][2][4][5]
11. A row of three identical feature cards, icon on top, same radius and padding. [1][2][4][5]
12. Cards inside cards. [3][4]
13. Stat banner rows ("10,000+ users", "99.9%"). Invented metrics of any kind. [4][5]
14. Numbered 1-2-3 steps when the content is not a sequence. [5]
15. Bento grids used because they are fashionable. (task brief; consistent with [4] "default-attractor sameness")
16. Same section height, padding and gap all the way down the page. [1][4]
17. Everything centred. [4]
18. Stock nav and stock footer that could belong to any product. [4]
19. Fake browser, phone or IDE chrome redrawn around a mock-up instead of a real screenshot. [4]

## Type

20. Inter (or Geist, Roboto, Space Grotesk) for everything, no display face, no voice. [1][2][4][5][6]
21. One italic or serif accent word in a sans headline (Instrument Serif italic). [4][5]
22. Tracked-out all-caps eyebrow label above every heading. [4][5]
23. Numbers in tables that do not line up (no tabular figures). [4]
24. Straight quotes, double hyphens, three dots. [4]

## Imagery and icons

25. Emoji as icons or bullets (rocket, sparkles, light bulb). [1][3][4][5][6]
26. Generic thin-line icon above each feature. Mixed icon sets. [2][4]
27. Plastic 3D blobs and too-smooth generated illustrations. [1][4]
28. Stock "team at a laptop" photos; no real screenshots of the product. [1]
29. Three.js spinning a static object for decoration. [4]

## Motion

30. Fade-and-slide-up on every section as you scroll, all with the same timing. [1][4]
31. Bounce and elastic easing. [4]
32. Hover-only affordances; hover states that do nothing. [1][4]

## Copy

33. Slogan headlines that fit any product: "Build faster. Ship smarter.", "Your all-in-one platform". [1][2]
34. Buzzwords: seamless, robust, cutting-edge, unlock, elevate, revolutionize, streamline, best-in-class. [1]
35. Hedging: "may help you", "can potentially". [1]
36. Em dashes in nearly every sentence; "In today's fast-paced world". [1][6]
37. Copy that never says who the product is for. [2]
38. "Get started" / "Get started for free" on a gradient button, repeated. [2]
39. Testimonials, customer logos and placeholder people (Jane Doe) that are not real. [1][4]
40. Labels that explain the obvious. [6]

## Code and metadata

41. Same or missing meta description on every page; default or missing OG image. [1]
42. Alt text that says "image" or is missing. [1]
43. `width: 100vw` (causes sideways scroll), magic z-index numbers, inline values that bypass tokens. [4]
44. Lazy-loading the largest element on the page. [4]

## What this site does instead

- Colour: the app's own black `#0E0E0F` and gold `#C9A24B`, flat. No gradients. The only other
  colours are the three the Checker uses to grade a shot, and they only appear on shots.
- Hero: a left-aligned headline with a live survey illustration under it. It is the product's
  subject, not decoration, it is labelled as synthetic, and it has a pause control and a still
  fallback. (This is the answer to tell 29: the 3D is the content.)
- The workflow is numbered 1-2-3 because it is an order of work: Tag, Convert, Check.
- No cards. Sections are separated by rules and space. Each section is built for its content:
  screenshot rows, a numbered notes list, a requirements table, a plain FAQ.
- Real screenshots of the app, taken by script from the app page, with no fake window chrome.
- Type: Big Shoulders (display, condensed, the look of site signage and drawing titles),
  Work Sans (text), IBM Plex Mono for figures only, as in the app. Sentence case. No eyebrows.
- No scroll animations. Motion is the hero and things that answer a click.
- Copy: short sentences, says who it is for, says what the app refuses to do, no price,
  no statistics about users or accuracy, no testimonials, no logos.
- Every page has its own title and description. One OG image, rendered from the real hero.

## Sources

1. Jocelyn Lecamus, "The 'Built with AI' Tell: 12 Signals That Drop Trust in 2026", Utsubo, 2026-06-23. https://www.utsubo.com/blog/built-with-ai-trust-signals-2026
2. "AI Slop Fonts and Gradients: The Tells That Give Away AI Design", 925Studios, 2026-06-14. https://www.925studios.co/blog/ai-slop-design-tells
3. Jeff Humble, "7 Signs a UI Has Been Vibe Coded (And How to Avoid Them)", The Fountain Institute, 2026-04-24. https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui
4. "What Anti-Patterns Does Hallmark Detect? The Complete Catalogue of AI UI Tells" (42 patterns in the Nutlope/hallmark tool). https://instagit.com/Nutlope/hallmark/hallmark-anti-patterns-detected/
5. Adrian Krebs, "Scoring Show HN submissions for AI design patterns", 2026-04-20 (deterministic DOM/CSS checks on about 1,590 Show HN sites; 22% showed four or more patterns). https://adriankrebs.ch/blog/design-slop/
6. Hacker News, "Ask HN: How can you tell a site/app is vibe coded?", 2026. https://news.ycombinator.com/item?id=49290499
