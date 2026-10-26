/* TRC High Performance — page behavior: routing + page transition, scroll effects, and small interactions. */
(function () {
  'use strict';

  // ── Content ──────────────────────────────────────────────
  // rows × cols on wide screens; everything collapses to 1×1 on phones.
  const GALLERY = [
    { rows: 2, cols: 2, label: 'Feature photo or video still', photo: '' },
    { rows: 1, cols: 1, label: 'Photo', photo: '' },
    { rows: 1, cols: 1, label: 'Photo', photo: '' },
    { rows: 2, cols: 1, label: 'Tall photo', photo: '' },
    { rows: 1, cols: 1, label: 'Photo', photo: '' },
    { rows: 1, cols: 2, label: 'Wide photo', photo: '' },
    { rows: 1, cols: 1, label: 'Photo', photo: '' },
    { rows: 1, cols: 1, label: 'Photo', photo: '' },
    { rows: 1, cols: 1, label: 'Photo', photo: '' },
  ];

  const PAGES = ['home', 'about', 'support', 'media'];
  const LABELS = { home: 'Home', about: 'About Us', support: 'Support Us', media: 'Media' };
  const TITLES = { home: 'TRC High Performance', about: 'About · TRC HP', support: 'Support Us · TRC HP', media: 'Media · TRC HP' };

  // ── Helpers ──────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const fmt = (n) => '$' + (Math.round(n / 10) * 10).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isWide = () => window.innerWidth >= 720;
  const slot = (label, photo, alt) => `<div class="slot" data-label="${esc(label)}">${photo ? `<img src="${esc(photo)}" alt="${esc(alt || '')}" loading="lazy">` : ''}</div>`;

  // ── Render data-driven sections ──────────────────────────
  function renderGallery() {
    $('[data-gallery]').innerHTML = GALLERY.map((p, i) =>
      `<div class="tile" data-rows="${p.rows}" data-cols="${p.cols}" style="animation-duration:${6 + (i % 3)}s;animation-delay:${-i * 0.9}s">${slot(p.label, p.photo, p.label)}</div>`
    ).join('');
  }

  // ── Routing + page transition ────────────────────────────
  const transition = $('[data-transition]');
  const tBoat = $('[data-transition-boat]');
  const tLabel = $('[data-transition-label]');
  const announce = $('[data-announce]');
  let page = null, busy = false, transitioning = false, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function pageFromHash() {
    const m = /^#\/(\w+)/.exec(location.hash);
    return m && PAGES.includes(m[1]) ? m[1] : 'home';
  }

  function showPage(next, fund) {
    page = next;
    $$('[data-page]').forEach((el) => { el.hidden = el.dataset.page !== next; });
    $$('[data-go]').forEach((a) => {
      if (a.dataset.go === next && next !== 'home') a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITLES[next];
    // Reset per-page effects so they replay on the next visit.
    tank.played = null; tank.set(0);
    $('[data-values]').classList.remove('is-on');
    river.lastH = -1;
    signup.reset();
    setFund(fund || fundState);
    const n = PAGES[(PAGES.indexOf(next) + 1) % PAGES.length];
    $('[data-next]').dataset.target = n;
    $('[data-next-kicker]').textContent = n === 'home' ? 'Back to the start' : 'Up next';
    $('[data-next-label]').textContent = n === 'home' ? 'Row back' : LABELS[n];
    $('[data-next-icon]').setAttribute('d', n === 'home' ? 'M12 19V5M6 11l6-6 6 6' : 'M5 12h14M13 6l6 6-6 6');
  }

  function go(next, fund, push = true) {
    if (busy) return;
    setMenu(false);
    if (next === page) {
      if (fund) setFund(fund);
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    const swap = () => {
      showPage(next, fund);
      if (push) history.pushState(null, '', next === 'home' ? '#/' : '#/' + next);
      window.scrollTo(0, 0);
      announce.textContent = LABELS[next];
      setTimeout(measure, 60);
    };
    if (reducedMotion) { swap(); return; }

    busy = true; transitioning = true;
    tLabel.textContent = LABELS[next];
    transition.style.transition = 'transform .8s cubic-bezier(.7,0,.25,1)';
    transition.style.transform = 'translateY(0%)';
    tBoat.style.transition = 'transform 1.9s cubic-bezier(.45,0,.35,1)';
    tBoat.style.transform = `translateX(${window.innerWidth + 460}px)`;
    later(() => {
      swap();
      later(() => {
        transition.style.transition = 'transform .9s cubic-bezier(.6,0,.3,1)';
        transition.style.transform = 'translateY(-120%)';
      }, 260);
    }, 820);
    later(() => {
      transition.style.transition = 'none'; transition.style.transform = 'translateY(110%)';
      tBoat.style.transition = 'none'; tBoat.style.transform = 'translateX(-440px)';
      busy = false; transitioning = false;
      // Catch up if the user hit back/forward mid-transition.
      if (pageFromHash() !== page) go(pageFromHash(), null, false);
    }, 2100);
  }

  function scrollToContact() {
    setMenu(false);
    const el = document.getElementById('contact');
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 20, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    if (a) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let "open in new tab" work
      e.preventDefault();
      const key = a.dataset.go;
      if (key === 'contact') scrollToContact();
      else if (key === 'donate') go('support', 'athlete');
      else go(key);
      return;
    }
    const todo = e.target.closest('[data-todo]');
    if (todo && todo.getAttribute('href') === '#') e.preventDefault();
  });
  window.addEventListener('popstate', () => { if (location.hash !== '#contact') go(pageFromHash(), null, false); });
  $('[data-next]').addEventListener('click', (e) => go(e.currentTarget.dataset.target));

  // ── Mobile menu ──────────────────────────────────────────
  const menu = $('#menu'), menuBtn = $('[data-menu-toggle]');
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('path').setAttribute('d', open ? 'M6 6l12 12M18 6L6 18' : 'M4 8h16M4 16h16');
  }
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $('[data-menu-close]').addEventListener('click', () => { setMenu(false); menuBtn.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  // ── About: the river ─────────────────────────────────────
  const river = {
    track: $('[data-river-track]'),
    svg: $('[data-river-svg]'),
    paths: $$('[data-river-svg] path'),
    progress: $('.river-progress'),
    markers: $$('.river-stop'),
    boat: $('[data-river-boat]'),
    stops: $$('[data-stop]'),
    values: $('[data-values]'),
    lastH: -1, lastW: -1,
    measure(vh) {
      const r = this.track.getBoundingClientRect(), H = this.track.offsetHeight;
      const wide = isWide(), W = wide ? 200 : 64, cx = W / 2, amp = wide ? 20 : 6, k = 230;
      const fx = (y) => cx + amp * Math.sin(y / k), fp = (y) => (amp / k) * Math.cos(y / k);
      if (H !== this.lastH || W !== this.lastW) {
        let d = '';
        for (let y = 0; y <= H; y += 16) d += (y ? 'L' : 'M') + fx(y).toFixed(1) + ' ' + y + ' ';
        this.svg.setAttribute('width', W); this.svg.setAttribute('height', H);
        this.paths.forEach((p) => p.setAttribute('d', d));
        this.lastH = H; this.lastW = W;
      }
      const p = clamp((vh * 0.45 - r.top) / H), y = 70 + p * Math.max(0, H - 140);
      const stops = this.stops.map((s) => s.getBoundingClientRect().top - r.top + 8);
      this.progress.setAttribute('stroke-dasharray', (p * 100).toFixed(2) + ' 100');
      this.markers.forEach((m, i) => {
        m.style.transform = `translate(${fx(stops[i]).toFixed(1)}px, ${stops[i].toFixed(1)}px)`;
        m.classList.toggle('is-on', y >= stops[i] - 4);
      });
      const a = Math.atan2(1, fp(y)) * 180 / Math.PI;
      this.boat.style.transform = `translate(${fx(y).toFixed(1)}px, ${y.toFixed(1)}px) rotate(${a.toFixed(1)}deg)`;
      this.values.classList.toggle('is-on', stops[2] > 0 && y >= stops[2] - 4);
    },
  };

  // ── Support: fund picker + cost tank ─────────────────────
  let fundState = 'athlete';
  function setFund(f) {
    fundState = f;
    $$('[data-fund]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.fund === f)));
    $$('[data-fund-panel]').forEach((p) => { p.hidden = p.dataset.fundPanel !== f; });
  }
  $$('[data-fund]').forEach((b) => b.addEventListener('click', () => {
    if (fundState === b.dataset.fund) return;
    tank.played = null; tank.set(0);
    setFund(b.dataset.fund);
  }));

  const tank = {
    el: $('[data-tank]'), water: $('[data-tank-water]'), wet: $('[data-tank-wet]'), texts: $$('[data-tank-text]'),
    played: null, raf: 0, max: 64,
    // Final water level: just over the amount so it ends fully submerged (white), clear of the label above.
    fit() {
      const tankTop = this.el.getBoundingClientRect().top;
      const amountTop = this.texts[0].getBoundingClientRect().top - tankTop;
      this.max = Math.max(0, Math.min(90, (this.el.clientHeight - (amountTop - 10)) / this.el.clientHeight * 100));
    },
    set(t) {
      const h = t * this.max;
      this.water.style.height = h.toFixed(2) + '%';
      // The wave's midline sits ~14px above the top of the water body.
      this.wet.style.clipPath = `inset(calc(${(100 - h).toFixed(2)}% - 14px) 0 0 0)`;
      const label = fmt(8000 * t) + ' – ' + fmt(20000 * t);
      this.texts.forEach((el) => { el.textContent = label; });
    },
    run() {
      cancelAnimationFrame(this.raf);
      this.fit();
      if (reducedMotion) { this.set(1); return; }
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 2200);
        this.set(1 - Math.pow(1 - k, 3));
        if (k < 1) this.raf = requestAnimationFrame(step);
      };
      this.set(0); this.raf = requestAnimationFrame(step);
    },
  };
  // Fill the tank once it is fully on screen (or fills the screen, on very short viewports).
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || tank.played === fundState) return;
    const fits = e.intersectionRatio >= 0.99 || (e.rootBounds && e.intersectionRect.height >= e.rootBounds.height - 2);
    if (fits) { tank.played = fundState; tank.run(); }
  }, { threshold: [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1] }).observe(tank.el);
  window.addEventListener('resize', () => {
    if (tank.played === fundState && tank.el.offsetParent) { cancelAnimationFrame(tank.raf); tank.fit(); tank.set(1); }
  });

  // ── Scroll-driven effects ────────────────────────────────
  const ttGrid = $('[data-reveal]');
  function measure() {
    const vh = window.innerHeight;
    if (isWide() && !menu.hidden) setMenu(false);
    if (page === 'home') {
      const r = ttGrid.parentElement.getBoundingClientRect();
      const p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.1));
      ttGrid.classList.toggle('is-in', p > 0.06);
    }
    if (page === 'about') river.measure(vh);
  }
  let raf = 0;
  const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // ── Media: newsletter sign-up ────────────────────────────
  const signup = {
    form: $('[data-signup]'),
    reset() {
      this.form.querySelector('button').textContent = 'Sign Up';
      this.form.querySelector('.bubbles').innerHTML = '';
    },
  };
  signup.form.addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: send signup.form.email.value to the newsletter provider (Mailchimp, Buttondown, …).
    signup.form.querySelector('button').textContent = 'Signed up';
    signup.form.querySelector('.bubbles').innerHTML = [[-20, 10, 0], [0, 14, 0.15], [18, 8, 0.3], [-6, 12, 0.45], [26, 10, 0.6]]
      .map(([x, s, d]) => `<i style="left:${x}px;width:${s}px;height:${s}px;animation-delay:${d}s"></i>`).join('');
    announce.textContent = 'Thanks — you’re signed up.';
  });
  signup.form.email.addEventListener('input', () => signup.reset());

  // ── Footer: copy email ───────────────────────────────────
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    try { navigator.clipboard.writeText(b.dataset.copy); } catch (err) { /* clipboard unavailable */ }
    const label = b.querySelector('span');
    b.classList.remove('is-copied'); void b.offsetWidth; b.classList.add('is-copied');
    label.textContent = 'Copied';
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.classList.remove('is-copied'); label.textContent = 'Copy email'; }, 1800);
  }));

  // ── Boot ─────────────────────────────────────────────────
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  renderGallery();
  new Scull(river.boat, { mode: 'scroll', active: () => page === 'about' });
  new Scull(tBoat, { mode: 'time', dark: true, rate: 30, active: () => transitioning });
  showPage(pageFromHash());
  if (location.hash === '#contact') setTimeout(scrollToContact, 100);
  setTimeout(measure, 120);
})();
