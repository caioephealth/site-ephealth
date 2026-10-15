// epHealth — animações (GSAP + ScrollTrigger) e interações das seções ricas
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cabeçalho: fica sólido ao rolar quando o topo é escuro
  const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Vídeo do topo: não toca se a pessoa pediu menos movimento
  const vid = document.querySelector('.vhero-bg[autoplay]');
  if (vid && reduce) { vid.removeAttribute('autoplay'); vid.pause(); }

  // Soluções: painéis que se expandem
  const panels = document.querySelectorAll('.xp');
  const open = (p) => panels.forEach((x) => { x.classList.toggle('on', x === p); x.setAttribute('aria-expanded', String(x === p)); });
  panels.forEach((p) => {
    p.addEventListener('mouseenter', () => open(p));
    p.addEventListener('focus', () => open(p));
    p.addEventListener('click', () => open(p));
  });

  // Abas Paciente / Pesquisador / Coordenação
  const tabs = document.querySelectorAll('.tabs2 [role=tab]');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      const panel = document.getElementById(x.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) { panel.classList.remove('anim'); void panel.offsetWidth; panel.classList.add('anim'); }
    });
  }));

  // Números: formata no padrão brasileiro
  const fmt = (el, v) => {
    const dec = Number(el.dataset.dec || 0);
    const n = v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${el.dataset.pre || ''}${n}${el.dataset.suf || ''}`;
  };

  if (typeof gsap === 'undefined' || reduce) {
    document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = fmt(el, Number(el.dataset.count)); });
    document.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w; });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Topo: título sobe linha por linha
  const title = document.querySelectorAll('.vhero-title .line > span');
  if (title.length) {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.vhero .kicker', { y: 16, autoAlpha: 0, duration: .8 })
      .from(title, { yPercent: 110, duration: 1.1, stagger: .12 }, '-=.5')
      .from('.vhero-lead, .vhero .btns', { y: 18, autoAlpha: 0, duration: .9, stagger: .1 }, '-=.7')
      .from('.vstat', { y: 20, autoAlpha: 0, duration: .8, stagger: .08 }, '-=.6')
      .from('.vhero .media-r', { y: 40, autoAlpha: 0, duration: 1.2 }, '-=1');
    // vídeo afasta devagar ao rolar
    gsap.to('.vhero-bg', { scale: 1.16, yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.vhero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // Contadores
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = fmt(el, 0);
    gsap.to(obj, {
      v: end, duration: 2.2, ease: 'power2.out',
      onUpdate: () => { el.textContent = fmt(el, obj.v); },
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });

  // Barras que enchem
  document.querySelectorAll('[data-w]').forEach((el) => {
    gsap.fromTo(el, { width: 0 }, { width: el.dataset.w, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  // Cards entram em sequência
  ScrollTrigger.batch('.b-card, .phone, .svc-row, .mosaic figure, .study, .item', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.fromTo(els, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'power3.out', stagger: .08, overwrite: true }),
  });

  // Parallax suave
  document.querySelectorAll('[data-speed]').forEach((el) => {
    const d = Number(el.dataset.speed) * 40;
    gsap.fromTo(el, { y: d }, { y: -d, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // História do território: fixa a seção e troca as fotos conforme a rolagem
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const story = document.querySelector('.story-in');
    if (!story) return;
    const imgs = story.querySelectorAll('.story-media img');
    const steps = story.querySelectorAll('.story-steps li');
    const bars = story.querySelectorAll('.prog b');
    const cap = story.querySelector('.story-media .cap span');
    const n = imgs.length;
    const set = (i) => {
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      if (cap) cap.textContent = steps[i].dataset.cap;
    };
    set(0);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: story, start: 'top top', end: `+=${n * 70}%`, pin: true, scrub: .6,
        onUpdate: (self) => set(Math.min(n - 1, Math.floor(self.progress * n * 0.999))),
      },
    });
    for (let i = 0; i < n; i++) {
      tl.to(bars[i], { scaleX: 1, duration: 1, ease: 'none' }, i);
      if (i > 0) tl.to(imgs[i], { autoAlpha: 1, scale: 1, duration: .35, ease: 'power2.out' }, i);
    }
    return () => steps.forEach((s) => s.classList.add('on'));
  });

  // epScience: o celular troca de tela conforme a rolagem
  mm.add('(min-width: 1001px)', () => {
    const stage = document.querySelector('.sci3-stage');
    if (!stage) return;
    const steps = stage.querySelectorAll('.sci3-steps li');
    const scrs = stage.querySelectorAll('.scr img');
    const groups = stage.querySelectorAll('.fc-group');
    const n = steps.length;
    let cur = -1;
    const set = (i) => {
      if (i === cur) return; cur = i;
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      scrs.forEach((s, k) => s.classList.toggle('on', k === i));
      groups.forEach((s, k) => s.classList.toggle('on', k === i));
    };
    set(0);
    ScrollTrigger.create({
      trigger: stage, start: 'top top', end: `+=${n * 60}%`, pin: true,
      onUpdate: (self) => set(Math.min(n - 1, Math.floor(self.progress * n * 0.999))),
    });
    gsap.from('.phone3', { y: 80, rotate: -4, autoAlpha: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: stage, start: 'top 75%', once: true } });
  });

  // Soluções: imagem que acompanha o mouse
  const fl = document.querySelector('.svc-float');
  if (fl && window.matchMedia('(hover: hover) and (min-width: 901px)').matches) {
    const img = fl.querySelector('img');
    gsap.set(fl, { xPercent: -50, yPercent: -50, scale: .6 });
    const mx = gsap.quickTo(fl, 'x', { duration: .5, ease: 'power3' });
    const my = gsap.quickTo(fl, 'y', { duration: .5, ease: 'power3' });
    document.querySelectorAll('.svc-row').forEach((row) => {
      row.addEventListener('mouseenter', () => { img.src = row.dataset.img; gsap.to(fl, { autoAlpha: 1, scale: 1, rotate: -4, duration: .45, ease: 'power3.out' }); });
      row.addEventListener('mouseleave', () => gsap.to(fl, { autoAlpha: 0, scale: .6, rotate: 0, duration: .35, ease: 'power2.in' }));
      row.addEventListener('mousemove', (e) => { mx(e.clientX + 170); my(e.clientY); });
    });
  }

  // Recalcula depois que as imagens carregam
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
