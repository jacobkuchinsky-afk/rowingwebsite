/* Animated single scull, seen from above. Ported from the design's Scull component.
 *
 *   new Scull(host, { mode: 'scroll' | 'time', dark, rate, strokePx, active })
 *
 * mode 'scroll' (default): one full stroke per `strokePx` scrolled; rowing backwards when scrolling up.
 * mode 'time': rows continuously at `rate` strokes per minute.
 * active: optional function — the boat only animates while it returns true.
 */
(function () {
  'use strict';

  const D = 0.36, R = Math.PI / 180, CATCH = 58 * R, FIN = -38 * R, PIN = 20, IN = 22, OUT = 50;
  const NAVY = 'oklch(0.32 0.15 264)', ROYAL = 'oklch(0.42 0.19 264)', RED = 'oklch(0.55 0.21 25)';
  const cl = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * cl(x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const f = (n) => Math.round(n * 100) / 100;

  // Drive ~1/3 of the cycle: legs, then back, then arms. Recovery ~2/3: hands away, body over, slow slide.
  function pose(u) {
    if (u < D) {
      const d = u / D;
      return { th: lerp(CATCH, FIN, ease(d)), seat: lerp(-8, 12, ease(d / 0.7)), lean: lerp(-5, 6, ease((d - 0.25) / 0.6)), wet: d > 0.03 && d < 0.97, w: 1.3 };
    }
    const r = (u - D) / (1 - D);
    const pr = r < 0.3 ? 0.45 * Math.sin((r / 0.3) * Math.PI / 2) : 0.45 + 0.55 * ease((r - 0.3) / 0.7);
    const feather = r < 0.08 ? r / 0.08 : r > 0.84 ? 1 - (r - 0.84) / 0.16 : 1;
    return { th: lerp(FIN, CATCH, pr), seat: lerp(12, -8, ease((r - 0.22) / 0.78)), lean: lerp(6, -5, ease(r / 0.32)), wet: false, w: lerp(1.3, 4.8, feather) };
  }
  const surge = (u) => -3 * Math.sin(2 * Math.PI * (u - 0.45));
  const tip = (th, s, len) => [Math.sin(th) * len, s * (PIN + Math.cos(th) * len)];

  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function set(node, attrs) { for (const k in attrs) node.setAttribute(k, attrs[k]); }

  class Scull {
    constructor(host, opts = {}) {
      this.opts = Object.assign({ mode: 'scroll', dark: false, rate: 22, strokePx: 260, active: null }, opts);
      this.u = 0.5; this.pool = [];
      this.build(host);
      this.render();
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.last = performance.now(); this.lastY = window.scrollY;
      const loop = (now) => { this.raf = requestAnimationFrame(loop); this.tick(now); };
      this.raf = requestAnimationFrame(loop);
    }

    build(host) {
      const dark = this.opts.dark;
      this.rippleColor = dark ? 'oklch(0.86 0.08 240)' : 'oklch(0.72 0.1 245)';
      const wash = dark ? 'oklch(0.94 0.035 240)' : '#fff';
      const svg = el('svg', { viewBox: '-250 -80 500 160', width: '100%', height: '100%', 'aria-hidden': 'true' });
      svg.style.cssText = 'display:block;overflow:visible;pointer-events:none';

      const rg = el('g', { fill: 'none', stroke: this.rippleColor, 'stroke-linecap': 'round' }, svg);
      this.ripples = Array.from({ length: 6 }, () => [
        el('ellipse', { 'stroke-width': 1.8, opacity: 0 }, rg),
        el('ellipse', { 'stroke-width': 1.4, opacity: 0 }, rg),
      ]);

      const g = this.body = el('g', {}, svg);
      this.wash = [0, 1].map(() => el('ellipse', { rx: 11, ry: 6, fill: wash }, g));
      this.shadow = [0, 1].map(() => el('ellipse', { rx: 7.5, fill: 'oklch(0.25 0.1 264)' }, g));
      el('path', { d: 'M100 0 C62 -4.8 -58 -5.4 -100 0 C-58 5.4 62 4.8 100 0Z', fill: '#fff', stroke: NAVY, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, g);
      el('path', { d: 'M34 0 L94 0 M-44 0 L-94 0', stroke: NAVY, 'stroke-width': 1, opacity: .45 }, g);
      el('rect', { x: -36, y: -3.6, width: 60, height: 7.2, rx: 3.6, fill: 'oklch(0.9 0.05 240)' }, g);
      el('line', { x1: -31, y1: -3.4, x2: -31, y2: 3.4, stroke: NAVY, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
      el('circle', { cx: 100, cy: 0, r: 2, fill: RED }, g);
      const rig = el('g', { fill: 'none', stroke: NAVY, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      el('path', { d: 'M-11 -3.6 Q-6 -20 0 -20 Q6 -20 11 -3.6' }, rig);
      el('path', { d: 'M-11 3.6 Q-6 20 0 20 Q6 20 11 3.6' }, rig);
      el('rect', { x: -2.2, y: -22.2, width: 4.4, height: 4.4, rx: 1, fill: NAVY }, g);
      el('rect', { x: -2.2, y: 17.8, width: 4.4, height: 4.4, rx: 1, fill: NAVY }, g);
      const legAttrs = { fill: 'none', stroke: ROYAL, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      this.legs = [0, 1].map(() => el('polyline', legAttrs, g));
      this.shafts = [0, 1].map(() => el('line', { stroke: NAVY, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g));
      this.blades = [0, 1].map(() => el('ellipse', { rx: 7.5, fill: RED, stroke: '#fff', 'stroke-width': .8 }, g));
      this.torso = el('ellipse', { cy: 0, rx: 3.8, ry: 7.2, fill: ROYAL, stroke: NAVY, 'stroke-width': 1 }, g);
      this.arms = [0, 1].map(() => el('line', { stroke: ROYAL, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g));
      this.hands = [0, 1].map(() => el('circle', { r: 1.6, fill: NAVY }, g));
      this.head = el('circle', { cy: 0, r: 4.2, fill: RED, stroke: NAVY, 'stroke-width': 1 }, g);

      host.appendChild(svg);
    }

    tick(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      const y = window.scrollY, dy = y - this.lastY; this.lastY = y;
      const { mode, rate, strokePx, active } = this.opts;
      if ((active && !active()) || document.hidden) return;
      const du = mode === 'time' ? dt / (60 / rate) : Math.sign(dy) * Math.min(0.05, Math.abs(dy) / strokePx);
      if (du === 0 && this.pool.length === 0) return;
      const prev = this.u, u = (((prev + du) % 1) + 1) % 1, sg = surge(u);
      this.u = u;
      const pool = this.pool.map((p) => ({ ...p, x: p.x - 170 * du, age: p.age + dt * (du < 0 ? 4 : 1) })).filter((p) => p.age < p.life);
      // Puddles: a big one where each blade leaves the water at the finish, a small splash at the catch.
      if (du > 0 && prev < D && u >= D) [-1, 1].forEach((s) => { const [x, y] = tip(FIN, s, OUT - 3); pool.push({ x: x + sg, y, age: 0, life: 3.8, big: true }); });
      if (du > 0 && u < prev - 0.5) [-1, 1].forEach((s) => { const [x, y] = tip(CATCH, s, OUT - 3); pool.push({ x: x + sg, y, age: 0, life: 1.1, big: false }); });
      this.pool = pool.slice(-6);
      this.render();
    }

    render() {
      const P = pose(this.u);
      set(this.body, { transform: `translate(${f(surge(this.u))} 0)` });
      [-1, 1].forEach((s, i) => {
        const th = P.th, [tx, ty] = tip(th, s, OUT - 10), [bx, by] = tip(th, s, OUT - 3);
        const deg = f(Math.atan2(s * Math.cos(th), Math.sin(th)) / R);
        const hx = f(-Math.sin(th) * IN), hy = f(s * (PIN - Math.cos(th) * IN));
        const bt = `translate(${f(bx)} ${f(by)}) rotate(${deg})`;
        set(this.wash[i], { transform: bt, opacity: P.wet ? 0.85 : 0 });
        set(this.shadow[i], { ry: f(P.w), transform: `translate(${f(bx + 2)} ${f(by + 3.5)}) rotate(${deg})`, opacity: P.wet ? 0 : 0.2 });
        set(this.shafts[i], { x1: hx, y1: hy, x2: f(tx), y2: f(ty) });
        set(this.blades[i], { ry: f(P.w), transform: bt, opacity: P.wet ? 0.5 : 1 });
        set(this.arms[i], { x1: f(P.seat + P.lean), y1: s * 6, x2: hx, y2: hy });
        set(this.hands[i], { cx: hx, cy: hy });
        const c = cl(1 - (P.seat + 8) / 20);
        set(this.legs[i], { points: `${f(P.seat + 1)},${f(s * 2.6)} ${f((P.seat - 30) / 2 + 2)},${f(s * (2.6 + 5 * c))} -30,${f(s * 2.8)}` });
      });
      set(this.torso, { cx: f(P.seat + P.lean) });
      set(this.head, { cx: f(P.seat + P.lean - 3.4) });
      this.ripples.forEach(([a, b], i) => {
        const p = this.pool[i];
        if (!p) { a.setAttribute('opacity', 0); b.setAttribute('opacity', 0); return; }
        const k = p.age / p.life, rx = p.big ? 5 + 12 * k : 3 + 6 * k, ry = p.big ? 3 + 8 * k : 2 + 4 * k;
        const o = f((1 - k) * (p.big ? 0.9 : 0.6));
        set(a, { cx: f(p.x), cy: f(p.y), rx: f(rx), ry: f(ry), opacity: o });
        set(b, { cx: f(p.x), cy: f(p.y), rx: f(rx * 0.55), ry: f(ry * 0.55), opacity: o });
      });
    }

    destroy() { cancelAnimationFrame(this.raf); }
  }

  window.Scull = Scull;
})();
