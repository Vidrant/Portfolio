# Rohit Baid — Portfolio

A static, no-build portfolio site: plain HTML, CSS and JavaScript. Motion comes from GSAP, ScrollTrigger and Lenis, all loaded from a CDN. If they fail to load, the page still works without animation.

```
index.html              page content
assets/css/style.css    design system and layout
assets/js/main.js       hero scatter field, card visuals, motion
assets/Rohit_Baid_Resume.pdf
assets/favicon.svg
```

## Run locally

```bash
python -m http.server 5500
```

Then open http://localhost:5500.

## Deploy

GitHub Pages serves this repo's `main` branch from the root. Every push to `main` updates https://vidrant.github.io/html-portfolio/ within a minute or two.

The original plain-HTML portfolio remains in history at commit `7b1afcb`.

## Updating content

- **Projects**: the four `<article class="card">` blocks in `index.html`.
- **Archive rows**: the `<ol class="index">` list.
- **Language bar**: a snapshot of GitHub bytes per language (Nov 2026). Edit the `--w` values and the legend.
- **Résumé**: replace `assets/Rohit_Baid_Resume.pdf`.
