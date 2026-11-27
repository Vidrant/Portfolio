# Rohit Baid — Portfolio

A single-page portfolio for **Rohit Baid**, an AI & Data Science engineering student in Mumbai. It opens on a live scatter plot of about a thousand data points, with one glowing outlier labelled **`rohit_baid`**. It's built with plain HTML, CSS and a `<canvas>`: no frameworks, no build step.

The hero borrows its idea from the [Smart Data Analyst](https://github.com/Vidrant/smart-data-analyst), which hunts anomalies with Isolation Forest. A seeded random generator draws the same "dataset" on every visit, and the points ease into their clusters like a model fitting. As your cursor moves over the plot, nearby points are pushed away and lines are drawn to the **7 nearest neighbours**, with live x/y coordinates. The rest of the page continues the data theme: a profile written as `df.describe()`, project cards that stack as you scroll, and a language bar built from real GitHub data.

---

## Live site

**[vidrant.github.io/Portfolio](https://vidrant.github.io/Portfolio/)**

Move your mouse across the hero to query the field, then scroll. On phones, just scroll: the field fits into the space above the name.

---

## Features

- **Outlier hero**: 700–1,400 seeded points (480 on phones) in clusters, plus one pulsing accent outlier with a data-style label.
- **kNN cursor lens**: points move away from the cursor, and lines connect it to the 7 nearest points, with a dashed radius ring and coordinates.
- **Stacked project cards**: four cards stick at the top and shrink back as the next one slides over (GSAP ScrollTrigger).
- **Hand-built visuals**: an analytics dashboard, a voice waveform, a CI pipeline and a real, scannable QR code, all made in SVG, HTML and CSS rather than screenshots.
- **Profile as a dataframe**: the about section is a `df.describe()` table with "0 missing · 1 anomaly (intentional)".
- **Archive with hover previews**: smaller repos are listed as rows, and a preview card follows the cursor.
- **Real GitHub data**: the toolkit's language bar comes from bytes of code across Rohit's public repos.
- **Paper, ink and one accent**: Instrument Serif, Geist and Geist Mono, a warm paper background, subtle grain and a single signal-orange accent.
- **Works without the extras**: smooth scrolling and animation are loaded from a CDN. If they fail, or the visitor prefers reduced motion, all content still shows.

---

## Page sections

| § | Section | What's there |
|---|---------|--------------|
| 00 | Hero | Live scatter field, name, intro and résumé link |
| 01 | Profile | Short statement and the `df.describe()` table |
| 02 | Selected work | Smart Data Analyst · AI Virtual Assistant · Attendance Tracker · UPI QR Generator |
| 03 | Archive | Tic-Tac-Toe, Hover Card Effect, Docker, Git and the v1 portfolio |
| 04 | Toolkit | Dark grid of skills and the GitHub language bar |
| 05 | Record | Education timeline and certificates with verify links |
| 06 | Contact | Email with a copy button, LinkedIn, GitHub and résumé |

---

## Quick start

1. Clone the repo:
   ```bash
   git clone https://github.com/Vidrant/html-portfolio.git
   cd html-portfolio
   ```
2. Start a local server:
   ```bash
   python -m http.server 5500
   ```
3. Open http://localhost:5500.

There's nothing to install. Double-clicking `index.html` also works, but a local server matches how GitHub Pages serves the site. You need an internet connection for the Google Fonts and the GSAP/Lenis CDN scripts.

---

## Project structure

```
html-portfolio/
├── index.html                  all page content
├── assets/
│   ├── css/style.css           design tokens, layout, responsive rules
│   ├── js/main.js              hero field, card visuals, previews, motion
│   ├── Rohit_Baid_Resume.pdf   linked from the hero and contact section
│   └── favicon.svg
└── README.md
```

---

## Updating content

Everything lives in `index.html`. You won't need to touch any data files.

**Add or edit a project card**: copy one of the `<article class="card">` blocks inside `.stack`. Each card picks a colour and a layout with two classes:

```html
<article class="card card--night card--a" data-card style="--i:0">
  <!-- card--night | card--sand | card--accent | card--light   (colour) -->
  <!-- card--a visual left · card--b stacked · card--c visual right · card--d visual left -->
  ...
</article>
```

Increase `--i` by one for each new card, so every card sticks 14px lower than the one before.

**Add an archive row**: copy a row in `<ol class="index">`. The `data-preview` value picks which hover preview appears:

```html
<li><a class="index__row" href="https://github.com/Vidrant/your-repo" data-preview="git">
  <span class="index__no mono">A.06</span>
  <span class="index__name">Your Repo</span>
  ...
</a></li>
```

> The available previews are `ttt`, `cards`, `docker`, `git` and `html`. To add another, put a new `<svg data-p="name">` inside `.preview`.

**Swap the résumé**: replace `assets/Rohit_Baid_Resume.pdf` and keep the filename.

**Update the language bar**: the `--w` values are relative weights, not percentages. Change them along with the legend text in the `.tile--lang` block.

> **After editing CSS or JS**, bump the version tag in `index.html` (for example `style.css?v=3` → `?v=4`). GitHub Pages lets browsers cache files for about 10 minutes, and the new tag makes phones fetch the fresh files right away.

---

## Tuning

| What | Where | Default | Effect |
|------|-------|---------|--------|
| Accent colour | `--accent` in `style.css` and `ACCENT` in `main.js` | `#FF4A1C` | Outlier, button arrows, highlights |
| Paper / ink | `--paper`, `--ink` in `style.css` | `#EFEBE3` / `#141412` | Base palette |
| Point count | `const n` in `layout()` | `w × h / 1000`, clamped to 700–1,400 (480 on phones) | Density of the field |
| Cluster shape | `clusters` array in `layout()` | 7 on desktop / 4 on phones | `[cx, cy, sx, sy, weight]` per cluster |
| Outlier spot | `out` in `layout()` | `0.34w, 0.36h` on desktop | Where the orange dot sits |
| Repel radius | `const R` in `draw()` | `150` | How far the cursor pushes points |
| Neighbours | `const K` in `draw()` | `7` | Number of kNN lines from the cursor |
| Card recede | `scale` / `--dim` in `initMotion()` | `.92` / `.32` | How much a card shrinks and darkens |
| Smooth scroll | `new Lenis({ lerp })` | `.1` | Lower values make scrolling floatier |

**Examples**

- Calmer field: change the clamp to `clamp(..., 400, 800)`.
- Bigger cursor lens: `const R = 200;`
- A different accent: set both `--accent` and `ACCENT`, plus the `#FF4A1C` fills in the preview SVGs, for example `#2F6BFF`.

---

## How it works

1. **Seeded data**: `rng(11)` produces the same points on every visit. About 94% are drawn from Gaussian clusters and the rest are random noise.
2. **Fitting intro**: each point starts at a random spot and eases into its cluster over 1.6s, with a small random delay so they don't all move at once. The outlier fades in at 1.3s, and its label at 1.9s.
3. **Every frame**: each point drifts gently on sine and cosine paths. Points near the cursor are pushed away, and every point is drawn as a tiny square.
4. **kNN lens**: the 7 points closest to the cursor are found and joined to it with hairlines, inside a dashed ring with a coordinate readout.
5. **The outlier**: it's drawn last, with a pulsing accent ring. Its text label is a normal HTML element positioned over the canvas, so the text stays crisp.
6. **Phones**: the field fits into the space between the caption and the hero text, measured from the real layout and measured again once web fonts load.
7. **Off-screen**: an `IntersectionObserver` pauses the animation whenever the hero scrolls out of view.

```
rng(11) ──► clusters + noise ──► home positions
random start ──► ease-out (1.6s) ──► home + drift
cursor ──► repel (R = 150) + kNN lines (K = 7)
outlier ──► accent dot + pulse ring + HTML label
hero off-screen ──► animation paused
```

Scroll motion is handled by **GSAP + ScrollTrigger** (reveals, the scrubbed profile statement, stacking cards, language-bar growth), with **Lenis** smoothing the scroll.

---

## Deploy

GitHub Pages serves this repo's `main` branch from the root. Every push to `main` updates the live site within a minute or two. Asset paths are relative, so the site works under the `/html-portfolio/` sub-path.

The original plain-HTML portfolio is preserved in history at commit [`7b1afcb`](https://github.com/Vidrant/html-portfolio/tree/7b1afcb).

---

## Browser support

The site works in current Chrome, Edge, Firefox and Safari, on desktop and mobile. It needs Canvas 2D and `requestAnimationFrame`, which every modern browser supports. If the visitor prefers reduced motion, the field is drawn once without animation, smooth scrolling is turned off, and all content stays visible.

---

## Credits & licensing

- **Content, résumé and personal details**: © 2026 Rohit Baid.
- **Code**: there's no license file, so default copyright applies. Add one (such as MIT) if you want others to reuse it.
- **Fonts**: [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif), [Geist and Geist Mono](https://fonts.google.com/specimen/Geist) via Google Fonts (SIL Open Font License).
- **Libraries**: [GSAP](https://gsap.com/) with ScrollTrigger, and [Lenis](https://github.com/darkroomengineering/lenis) (MIT).

---

*Every dataset has an outlier. Built in Mumbai. 📊*
