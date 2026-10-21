// epHealth — página Equipe: carrossel em arco (o do centro maior, os das laterais menores e girados)
document.addEventListener('DOMContentLoaded', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.querySelector('[data-model]');
  if (!root) return;
  const track = root.querySelector('.tm-track');
  const cards = [...track.children];
  const n = cards.length;
  const now = document.querySelector('.tm-now');
  const prev = document.querySelector('.tm-prev');
  const next = document.querySelector('.tm-next');
  const wrap = (v, m) => ((v % m) + m) % m;
  const show = (i) => {
    if (!now) return;
    const c = cards[wrap(i, n)].querySelector('.tm-cap');
    const b = now.querySelector('b'); const s = now.querySelector('span');
    if (b.textContent === c.querySelector('b').textContent && s.textContent === c.querySelector('span').textContent) return;
    now.classList.remove('in'); void now.offsetWidth;
    b.textContent = c.querySelector('b').textContent;
    s.textContent = c.querySelector('span').textContent;
    now.classList.add('in');
  };
  // troca automática que pausa quando a pessoa interage
  const autoplay = (step, ms) => {
    if (reduce) return { stop() {}, play() {} };
    let t = null, held = false;
    const play = () => { clearInterval(t); if (!held) t = setInterval(step, ms); };
    const stop = () => clearInterval(t);
    const area = root.closest('section');
    area.addEventListener('pointerenter', () => { held = true; stop(); });
    area.addEventListener('pointerleave', () => { held = false; play(); });
    root.addEventListener('focusin', () => { held = true; stop(); });
    root.addEventListener('focusout', () => { held = false; play(); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
    play();
    return { stop, play };
  };

  // ---------------------------------------------------------------- 1 · arco
  if (root.dataset.model === 'arc') {
    let pos = 0, target = 0, sp = 240, drag = null;
    const measure = () => { sp = cards[0].offsetWidth * (window.innerWidth < 760 ? 0.66 : 0.86); };
    const paint = () => {
      cards.forEach((c, i) => {
        let d = wrap(i - pos + n / 2, n) - n / 2;
        const a = Math.min(Math.abs(d), 4.2);
        const x = d * sp * (1 - a * 0.05);
        const sc = 1 - Math.min(a, 4) * 0.12;
        const ry = Math.max(-40, Math.min(40, d * 11));
        c.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px) translateZ(${(-a * a * 26 - a * 60).toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        c.style.zIndex = String(100 - Math.round(a * 10));
        c.style.opacity = a > 3.6 ? String(Math.max(0, 1 - (a - 3.6) * 1.6)) : '1';
        c.style.filter = `saturate(${(1 - Math.min(a, 3) * 0.22).toFixed(2)}) brightness(${(1 - Math.min(a, 3) * 0.07).toFixed(2)})`;
        c.classList.toggle('is-center', a < 0.5);
      });
    };
    const loop = () => {
      if (!drag) pos += (target - pos) * (reduce ? 1 : 0.1);
      if (Math.abs(target - pos) < 0.0005) pos = target;
      paint();
      requestAnimationFrame(loop);
    };
    const go = (t) => { target = t; show(Math.round(t)); };
    const ap = autoplay(() => go(target + 1), 3600);
    prev.addEventListener('click', () => go(Math.round(target) - 1));
    next.addEventListener('click', () => go(Math.round(target) + 1));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.round(target) + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.round(target) - 1); }
    });
    root.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, p: pos, moved: false, t: performance.now(), lx: e.clientX, v: 0 };
      root.setPointerCapture(e.pointerId); ap.stop();
    });
    root.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      const t = performance.now();
      drag.v = (e.clientX - drag.lx) / Math.max(1, t - drag.t); drag.t = t; drag.lx = e.clientX;
      pos = drag.p - dx / sp; target = pos;
    });
    const end = (e) => {
      if (!drag) return;
      const d0 = drag; drag = null;
      if (!d0.moved) {
        // toque num cartão: leva ele para o centro
        const c = e.target.closest('.tm-card');
        if (c) { const i = Number(c.dataset.i); go(Math.round(pos) + (wrap(i - Math.round(pos) + n / 2, n) - n / 2)); }
        else go(Math.round(pos));
      } else go(Math.round(pos - d0.v * 6));
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    measure(); window.addEventListener('resize', measure);
    show(0); paint(); requestAnimationFrame(loop);
    if (window.gsap && !reduce) gsap.from(cards, { y: 80, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: { each: .05, from: 'center' } });
  }
});
