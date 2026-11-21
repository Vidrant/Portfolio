/* ==========================================================================
   Rohit Baid — portfolio interactions
   - hero: live scatter field with one outlier + kNN cursor lens
   - card visuals: scatter, histogram, heatmap, waveform, sparkline
   - archive hover previews, nav state, side rail, copy-to-clipboard
   - motion: GSAP + ScrollTrigger + Lenis (skipped for reduced motion)
   ========================================================================== */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const INK = '#141412';
  const PAPER = '#EFEBE3';
  const ACCENT = '#FF4A1C';

  // deterministic randomness so every visit draws the same "dataset"
  function rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  function gauss(r) {
    let u = 0, v = 0;
    while (!u) u = r();
    while (!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ---------- Mumbai clock ---------- */
  const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  const tickClock = () => {
    const t = timeFmt.format(new Date()) + ' IST';
    $$('[data-time]').forEach((el) => { el.textContent = t; });
  };
  tickClock();
  setInterval(tickClock, 20000);

  /* ---------- nav + rail on scroll ---------- */
  const nav = $('[data-nav]');
  const rows = $('[data-rows]');
  const darkSections = $$('[data-theme="dark"]');
  let lastY = window.scrollY;
  let scrollQueued = false;

  function onScroll() {
    scrollQueued = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (rows) rows.textContent = String(Math.round(clamp(y / max, 0, 1) * 1000)).padStart(4, '0');

    nav.classList.toggle('is-scrolled', y > 24);
    const probe = nav.offsetHeight / 2;
    nav.classList.toggle('is-dark', darkSections.some((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= probe && r.bottom >= probe;
    }));
    // tuck the nav away while reading downward, bring it back on the way up
    if (y > innerHeight && y > lastY + 4) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y < innerHeight) nav.classList.remove('is-hidden');
    lastY = y;
  }
  addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- hero field ---------- */
  function initField() {
    const canvas = $('[data-field]');
    if (!canvas) return;
    const hero = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const label = $('[data-outlier]');
    const countEl = $('[data-count]');
    const mouse = { x: -9999, y: -9999, on: false };
    let w = 0, h = 0, pts = [], out = { x: 0, y: 0 }, start = performance.now(), raf = 0, visible = true;

    function layout() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const narrow = w < 760;
      // On phones the copy fills most of the hero, so the field lives in the band
      // between the fig. caption and the copy, measured from the real layout.
      const inner = $('.hero__inner', hero);
      const fig = $('.hero__fig', hero);
      const bandTop = narrow ? fig.offsetTop + fig.offsetHeight + 18 : 0;
      const bandH = narrow ? Math.max(120, inner.offsetTop - 18 - bandTop) : h;
      // [cx, cy, sx, sy, weight] relative to the band; kept clear of the text and the outlier label
      const clusters = narrow
        ? [[.30, .26, .1, .11, 3], [.76, .2, .08, .1, 3], [.66, .5, .06, .08, 2], [.93, .38, .035, .07, 1]]
        : [[.62, .30, .075, .085, 5], [.81, .52, .06, .07, 4], [.47, .16, .05, .04, 2], [.91, .21, .04, .05, 2], [.73, .70, .045, .035, 1], [.16, .16, .05, .035, 1], [.96, .82, .025, .03, .5]];
      const total = clusters.reduce((a, c) => a + c[4], 0);
      const n = narrow ? 480 : clamp(Math.round((w * h) / 1000), 700, 1400);
      const r = rng(11);
      pts = [];
      for (let i = 0; i < n; i++) {
        let hx, hy;
        if (r() < .06) {
          hx = r(); hy = r() * (narrow ? 1 : .6);
        } else {
          let pick = r() * total, c = clusters[0];
          for (const k of clusters) { pick -= k[4]; if (pick <= 0) { c = k; break; } }
          hx = c[0] + gauss(r) * c[2];
          hy = c[1] + gauss(r) * c[3];
        }
        pts.push({
          hx: hx * w, hy: bandTop + hy * bandH,
          sx: r() * w, sy: r() * h,
          ph: r() * Math.PI * 2, sp: .4 + r() * .8,
          a: .32 + r() * .55,
          s: narrow ? (r() < .08 ? 2 : 1.3) : (r() < .08 ? 2.6 : 1.7),
          dl: r() * 700,
          ox: 0, oy: 0, x: 0, y: 0,
        });
      }
      out = narrow
        // low enough to sit apart from the clusters, high enough that the pulse ring clears the eyebrow
        ? { x: .1 * w, y: bandTop + bandH - 36 }
        : { x: .34 * w, y: Math.min(.36 * h, inner.offsetTop - 70) };
      if (label) {
        label.style.setProperty('--ox', `${out.x - 14}px`);
        label.style.setProperty('--oy', `${out.y - 10}px`);
      }
      if (countEl) countEl.textContent = n.toLocaleString('en-US');
    }

    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    function draw(now) {
      const t = reduce ? 1e9 : now - start;
      ctx.clearRect(0, 0, w, h);

      // technical grid of hairline crosses
      ctx.strokeStyle = 'rgba(20,20,18,.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const step = w < 760 ? 64 : 96;
      for (let x = step / 2; x < w; x += step) {
        for (let y = step / 2; y < h; y += step) {
          ctx.moveTo(x - 3, y + .5); ctx.lineTo(x + 4, y + .5);
          ctx.moveTo(x + .5, y - 3); ctx.lineTo(x + .5, y + 4);
        }
      }
      ctx.stroke();

      // points
      const R = 150;
      ctx.fillStyle = INK;
      for (const p of pts) {
        const k = easeOut(clamp((t - p.dl) / 1600, 0, 1));
        const drift = reduce ? 0 : 7;
        const tx = p.hx + Math.sin(now * .00035 * p.sp + p.ph) * drift;
        const ty = p.hy + Math.cos(now * .0003 * p.sp + p.ph) * drift;
        let fx = 0, fy = 0;
        if (mouse.on) {
          const dx = tx - mouse.x, dy = ty - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1, f = 1 - d / R;
            fx = (dx / d) * f * f * 42;
            fy = (dy / d) * f * f * 42;
          }
        }
        p.ox += (fx - p.ox) * .12;
        p.oy += (fy - p.oy) * .12;
        p.x = p.sx + (tx - p.sx) * k + p.ox;
        p.y = p.sy + (ty - p.sy) * k + p.oy;
        ctx.globalAlpha = p.a * (.25 + .75 * k);
        ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;

      // cursor lens: k nearest neighbours
      if (mouse.on) {
        const K = 7, best = [];
        for (const p of pts) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (best.length < K || d2 < best[best.length - 1].d2) {
            best.push({ p, d2 });
            best.sort((a, b) => a.d2 - b.d2);
            if (best.length > K) best.pop();
          }
        }
        ctx.strokeStyle = 'rgba(20,20,18,.45)';
        ctx.beginPath();
        for (const b of best) { ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(b.p.x, b.p.y); }
        ctx.stroke();
        for (const b of best) {
          ctx.beginPath(); ctx.arc(b.p.x, b.p.y, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = PAPER; ctx.fill();
          ctx.strokeStyle = INK; ctx.stroke();
        }
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = 'rgba(20,20,18,.3)';
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, R, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.font = '500 11px "Geist Mono", ui-monospace, monospace';
        ctx.fillStyle = 'rgba(20,20,18,.75)';
        ctx.fillText(`x ${(mouse.x / w).toFixed(2)}  y ${(1 - mouse.y / h).toFixed(2)}  k=${K}`, mouse.x + 14, mouse.y - 14);
      }

      // the outlier
      const ok = easeOut(clamp((t - 1300) / 900, 0, 1));
      if (ok > 0) {
        const ph = reduce ? .4 : (now % 2600) / 2600;
        ctx.strokeStyle = `rgba(255,74,28,${(1 - ph) * .7 * ok})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(out.x, out.y, 7 + ph * 26, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(out.x, out.y, 11, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(20,20,18,${.5 * ok})`; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(out.x, out.y, 5 * ok, 0, Math.PI * 2);
        ctx.fillStyle = ACCENT; ctx.fill();
      }

      if (!reduce && visible) raf = requestAnimationFrame(draw);
    }

    function startLoop() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }

    layout();
    startLoop();
    setTimeout(() => label && label.classList.add('is-on'), reduce ? 0 : 1900);
    // web fonts change the copy's height, so re-measure the band once they arrive
    // (the seeded rng regenerates the same points, so this is seamless)
    if (document.fonts) document.fonts.ready.then(() => { layout(); if (reduce) startLoop(); });

    let lastW = w, lastH = h, resizeTimer;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const nw = hero.clientWidth, nh = hero.clientHeight;
        // ignore mobile URL-bar jitter
        if (nw === lastW && Math.abs(nh - lastH) < 120) return;
        lastW = nw; lastH = nh;
        layout();
        start = performance.now() - 5000;
        startLoop();
      }, 150);
    });

    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
        mouse.on = true;
        if (reduce) startLoop();
      });
      hero.addEventListener('pointerleave', () => { mouse.on = false; if (reduce) startLoop(); });
    }

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce) startLoop();
    }).observe(hero);
  }

  /* ---------- card visuals ---------- */
  function buildScatter() {
    const svg = $('[data-scatter]');
    if (!svg) return;
    const r = rng(3);
    const X = (v) => 34 + v * 352, Y = (v) => 284 - v * 262;
    const g = svgEl('g', {});
    // axes
    g.appendChild(svgEl('path', { d: 'M34 20V284H390', fill: 'none', stroke: 'rgba(239,235,227,.18)', 'stroke-width': 1 }));
    for (let i = 1; i <= 4; i++) {
      g.appendChild(svgEl('path', { d: `M34 ${284 - i * 66}H390`, stroke: 'rgba(239,235,227,.06)', 'stroke-width': 1 }));
    }
    const lx = svgEl('text', { x: 390, y: 302, 'text-anchor': 'end', fill: 'rgba(239,235,227,.4)', 'font-size': 10, 'font-family': 'Geist Mono, monospace' });
    lx.textContent = 'quantity →';
    const ly = svgEl('text', { x: 40, y: 14, fill: 'rgba(239,235,227,.4)', 'font-size': 10, 'font-family': 'Geist Mono, monospace' });
    ly.textContent = '↑ revenue';
    g.append(lx, ly);
    for (let i = 0; i < 170; i++) {
      const x = clamp(.48 + gauss(r) * .17, .03, .97);
      const y = clamp(.14 + .62 * x + gauss(r) * .07, .03, .97);
      g.appendChild(svgEl('circle', { cx: X(x).toFixed(1), cy: Y(y).toFixed(1), r: 1.9, fill: 'rgba(239,235,227,.55)' }));
    }
    const anomalies = [[.14, .86], [.9, .16], [.33, .95], [.82, .98], [.06, .62], [.6, .07], [.97, .5]];
    for (const [x, y] of anomalies) {
      g.appendChild(svgEl('circle', { cx: X(x), cy: Y(y), r: 7, fill: 'none', stroke: ACCENT, 'stroke-opacity': .45 }));
      g.appendChild(svgEl('circle', { cx: X(x), cy: Y(y), r: 3.2, fill: ACCENT }));
    }
    svg.appendChild(g);
  }

  function buildHist() {
    const svg = $('[data-hist]');
    if (!svg) return;
    const r = rng(5), n = 22, bw = 200 / n;
    for (let i = 0; i < n; i++) {
      const v = Math.exp(-Math.pow(i - 7, 2) / 22) * .85 + Math.exp(-Math.pow(i - 15, 2) / 10) * .3 + r() * .08;
      const hgt = Math.max(2, v * 60);
      svg.appendChild(svgEl('rect', { x: (i * bw + 1).toFixed(1), y: (64 - hgt).toFixed(1), width: (bw - 2).toFixed(1), height: hgt.toFixed(1), rx: 1, fill: 'rgba(239,235,227,.6)' }));
    }
    svg.appendChild(svgEl('path', { d: 'M70 0V64', stroke: ACCENT, 'stroke-dasharray': '3 3', 'stroke-width': 1.2 }));
  }

  function buildHeat() {
    const el = $('[data-heat]');
    if (!el) return;
    const m = [
      [1, .82, .34, -.12, .56],
      [.82, 1, .41, -.08, .61],
      [.34, .41, 1, .22, .18],
      [-.12, -.08, .22, 1, -.31],
      [.56, .61, .18, -.31, 1],
    ];
    for (const row of m) {
      for (const v of row) {
        const i = document.createElement('i');
        i.style.background = v < 0 ? `rgba(255,74,28,${Math.abs(v) * 1.6})` : `rgba(239,235,227,${.06 + v * .78})`;
        i.title = v.toFixed(2);
        el.appendChild(i);
      }
    }
  }

  function buildWave() {
    const el = $('[data-wave]');
    if (!el) return;
    const r = rng(9), n = innerWidth < 640 ? 34 : 56;
    for (let i = 0; i < n; i++) {
      const center = 1 - Math.abs(i - (n - 1) / 2) / (n / 2);
      const bar = document.createElement('i');
      bar.style.setProperty('--h', (.18 + Math.pow(center, 1.4) * .82 * (.55 + r() * .45)).toFixed(3));
      bar.style.setProperty('--lo', (.12 + r() * .25).toFixed(2));
      bar.style.setProperty('--d', `${(.55 + r() * .9).toFixed(2)}s`);
      bar.style.setProperty('--dl', `${(-r() * 1.2).toFixed(2)}s`);
      if (Math.abs(i - (n - 1) / 2) < 3) bar.classList.add('hot');
      el.appendChild(bar);
    }
  }

  function buildSpark() {
    const svg = $('[data-spark]');
    if (!svg) return;
    const r = rng(21), n = 48, vals = [];
    let v = .45;
    for (let i = 0; i < n; i++) {
      v = clamp(v + (r() - .5) * .18 + (i === 30 ? .35 : 0) + (i === 33 ? -.3 : 0), .08, .95);
      vals.push(v);
    }
    const pt = (val, i) => `${((i / (n - 1)) * 300).toFixed(1)},${(60 - val * 54).toFixed(1)}`;
    const line = vals.map(pt).join(' ');
    svg.appendChild(svgEl('polygon', { points: `0,64 ${line} 300,64`, fill: 'rgba(255,74,28,.16)' }));
    svg.appendChild(svgEl('polyline', { points: line, fill: 'none', stroke: PAPER, 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }));
    const peak = ((30 / (n - 1)) * 300).toFixed(1);
    svg.appendChild(svgEl('path', { d: `M${peak} 0V64`, stroke: ACCENT, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', 'vector-effect': 'non-scaling-stroke' }));
  }

  /* pipeline steps light up once the card is on screen */
  function initPipe() {
    const pipe = $('[data-pipe]');
    if (!pipe) return;
    if (reduce) { pipe.classList.add('is-run'); return; }
    new IntersectionObserver((entries, io) => {
      if (entries[0].isIntersecting) { pipe.classList.add('is-run'); io.disconnect(); }
    }, { threshold: .4 }).observe(pipe);
  }

  /* ---------- archive hover preview ---------- */
  function initPreview() {
    const box = $('[data-previewer]');
    const list = $('[data-index]');
    if (!box || !list || !finePointer) return;
    const shots = $$('svg[data-p]', box);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;

    function follow() {
      x += (tx - x) * .16;
      y += (ty - y) * .16;
      box.style.setProperty('--px', `${x}px`);
      box.style.setProperty('--py', `${y}px`);
      box.style.setProperty('--pr', `${clamp((tx - x) * .04, -8, 8)}deg`);
      if (active || Math.abs(tx - x) > .5) raf = requestAnimationFrame(follow);
    }
    list.addEventListener('pointermove', (e) => {
      tx = e.clientX + 28;
      ty = e.clientY - 100;
      if (!active) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(follow);
    });
    $$('[data-preview]', list).forEach((row) => {
      row.addEventListener('pointerenter', (e) => {
        if (!active) { x = tx = e.clientX + 28; y = ty = e.clientY - 100; }
        active = true;
        shots.forEach((s) => s.classList.toggle('is-on', s.dataset.p === row.dataset.preview));
        box.classList.add('is-on');
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(follow);
      });
    });
    list.addEventListener('pointerleave', () => { active = false; box.classList.remove('is-on'); });
  }

  /* ---------- copy email ---------- */
  function initCopy() {
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          btn.textContent = 'Copied';
          btn.classList.add('is-done');
        } catch {
          btn.textContent = 'Press Ctrl+C';
        }
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 2000);
      });
    });
  }

  /* ---------- text splitting ---------- */
  function splitChars(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const chars = [];
    const walk = (node, into) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { into.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'c';
              c.textContent = ch;
              w.appendChild(c);
              chars.push(c);
            });
            into.appendChild(w);
          });
        } else if (child.nodeType === 1) {
          const clone = child.cloneNode(false);
          walk(child, clone);
          into.appendChild(clone);
        }
      });
    };
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    el.setAttribute('aria-label', label);
    [...el.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
    return chars;
  }

  function splitWords(el) {
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span');
            s.className = 'wd';
            s.textContent = part;
            frag.appendChild(s);
            words.push(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return words;
  }

  /* ---------- motion ---------- */
  function initMotion() {
    const { gsap, ScrollTrigger } = window;
    if (reduce || !gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // smooth scrolling
    if (window.Lenis) {
      const lenis = new window.Lenis({ lerp: .1, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href');
          const target = id === '#top' ? 0 : $(id);
          if (target === null) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: 0, duration: 1.4 });
          if (id === '#main') $('#main').focus({ preventScroll: true });
        });
      });
    }

    // hero entrance
    const title = $('[data-split]');
    if (title) {
      const chars = splitChars(title);
      gsap.from(chars, { yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: .045, delay: .2 });
    }
    gsap.from('.hero [data-fade]', { y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .09, delay: .65 });

    // reveals
    $$('[data-reveal]').forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.from(el, { y: 44, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('[data-stagger]').forEach((group) => {
      gsap.from(group.children, { y: 32, opacity: 0, duration: 1, ease: 'power3.out', stagger: .07, scrollTrigger: { trigger: group, start: 'top 85%' } });
    });

    // scrubbed statement reveal
    $$('[data-scrub]').forEach((el) => {
      const words = splitWords(el);
      gsap.fromTo(words, { opacity: .14 }, {
        opacity: 1, stagger: .06, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true },
      });
    });

    // language bar grows in
    gsap.from('.langbar span', {
      scaleX: 0, transformOrigin: '0 50%', duration: 1.4, ease: 'expo.out', stagger: .08,
      scrollTrigger: { trigger: '.langbar', start: 'top 88%' },
    });

    // stacked cards: each one recedes as the next slides over it
    const mm = gsap.matchMedia();
    mm.add('(min-width: 961px)', () => {
      const cards = $$('[data-card]');
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card, {
          scale: .92, '--dim': .32, ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 25%', scrub: true },
        });
      });
      // gentle parallax inside each visual
      cards.forEach((card) => {
        const v = $('.card__visual > *', card);
        gsap.fromTo(v, { y: 40 }, { y: -10, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top top', scrub: true } });
      });
    });

    // contact headline drifts up a touch as it arrives
    gsap.fromTo('.contact__title', { yPercent: 12 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'center center', scrub: true },
    });

    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- boot ---------- */
  initField();
  buildScatter();
  buildHist();
  buildHeat();
  buildWave();
  buildSpark();
  initPipe();
  initPreview();
  initCopy();
  initMotion();
})();
