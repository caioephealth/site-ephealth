// epHealth — interações do site
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Menu do celular
(() => {
  const btn = document.querySelector('.menu-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.mobile-nav a').forEach((a) => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
  }));
})();

// Revelar ao rolar
(() => {
  const els = document.querySelectorAll('.rv');
  if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
})();

// Frentes: a lista troca a imagem e o texto do centro
(() => {
  const tabs = document.querySelectorAll('.front-tabs button');
  if (!tabs.length) return;
  const imgs = document.querySelectorAll('.front-img img');
  const cap = document.querySelector('.front-img .cap');
  const desc = document.querySelector('.front-img .desc');
  let current = 0;
  let timer;
  const show = (i) => {
    current = i;
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
    cap.textContent = tabs[i].dataset.cap;
    desc.textContent = tabs[i].dataset.desc;
  };
  const auto = () => {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => show((current + 1) % tabs.length), 5200);
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => { show(i); auto(); }));
  show(0);
  auto();
})();

// Publicações: filtro por tema
(() => {
  const chips = document.querySelectorAll('[data-filter]');
  if (!chips.length) return;
  const cards = document.querySelectorAll('[data-tags]');
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
    const f = c.dataset.filter;
    cards.forEach((card) => { card.hidden = f !== 'todas' && !card.dataset.tags.split(' ').includes(f); });
  }));
})();

// Fale conosco — validação + envio para o Wix Forms
(() => {
  const form = document.getElementById('form-contato');
  if (!form) return;
  const ok = document.getElementById('form-ok');
  const errBox = document.getElementById('form-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  const EN = document.documentElement.lang.startsWith('en');
  const T = EN
    ? { nome: 'Please tell us your name.', email: 'Please check your email address.', telefone: 'Please enter your phone number with area code.', mensagem: 'Tell us briefly what you need.' }
    : { nome: 'Diga como podemos te chamar.', email: 'Confira o e-mail.', telefone: 'Informe o telefone com DDD.', mensagem: 'Conte em poucas palavras o que você precisa.' };
  const rules = {
    nome: (v) => (v.trim().length >= 2 ? '' : T.nome),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : T.email),
    telefone: (v) => (v.replace(/\D/g, '').length >= 8 ? '' : T.telefone),
    mensagem: (v) => (v.trim().length >= 10 ? '' : T.mensagem),
  };
  const check = (n) => {
    const el = form.elements[n];
    const msg = rules[n](el.value);
    const field = el.closest('.field');
    field.classList.toggle('invalid', !!msg);
    field.querySelector('.err').textContent = msg;
    el.setAttribute('aria-invalid', String(!!msg));
    return !msg;
  };
  Object.keys(rules).forEach((n) => form.elements[n].addEventListener('blur', () => check(n)));

  // Máscara simples de telefone brasileiro
  if (!EN) form.elements.telefone.addEventListener('input', (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    e.target.value = out;
  });

  // Assunto vindo de um link (ex.: ?assunto=report#contato)
  const assunto = new URLSearchParams(location.search).get('assunto');
  if (assunto && form.elements.interesse) {
    const opt = [...form.elements.interesse.options].find((o) => o.value === assunto);
    if (opt) form.elements.interesse.value = assunto;
  }

  // Sem client ID e form ID do Wix, fica em modo prévia: valida, mas não envia nada.
  const clientId = form.dataset.wixClientId;
  const formId = form.dataset.wixFormId;
  const live = !!(clientId && formId);
  const pilot = document.getElementById('form-pilot');
  if (live && pilot) pilot.hidden = true;

  async function visitorToken() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('wixVisitor') || 'null');
      if (saved && saved.exp > Date.now() + 60000) return saved.token;
    } catch (_) { /* sem storage */ }
    const r = await fetch('https://www.wixapis.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, grantType: 'anonymous' }),
    });
    if (!r.ok) throw new Error('token ' + r.status);
    const data = await r.json();
    try {
      sessionStorage.setItem('wixVisitor', JSON.stringify({ token: data.access_token, exp: Date.now() + data.expires_in * 1000 }));
    } catch (_) { /* ok */ }
    return data.access_token;
  }

  const phoneE164 = (v) => { let d = v.replace(/\D/g, ''); if (!d.startsWith('55')) d = '55' + d; return '+' + d; };

  async function sendToWix() {
    const el = form.elements;
    const token = await visitorToken();
    const r = await fetch('https://www.wixapis.com/form-submission-service/v4/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        submission: {
          formId,
          submissions: {
            nome: el.nome.value.trim(),
            empresa: el.empresa.value.trim(),
            email: el.email.value.trim(),
            telefone: phoneE164(el.telefone.value),
            interesse: el.interesse.value,
            mensagem: el.mensagem.value.trim(),
            consentimento_lgpd: el.lgpd.checked,
          },
        },
      }),
    });
    if (!r.ok) throw new Error('submission ' + r.status);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements.site && form.elements.site.value) return; // robô
    const results = Object.keys(rules).map(check);
    const consent = form.querySelector('.consent');
    consent.classList.toggle('invalid', !form.elements.lgpd.checked);
    if (results.includes(false) || !form.elements.lgpd.checked) {
      const first = form.querySelector('[aria-invalid="true"]') || form.elements.lgpd;
      first.focus();
      return;
    }
    errBox.hidden = true;
    if (live) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      try { await sendToWix(); } catch (err) { errBox.hidden = false; return; } finally {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
    form.querySelectorAll('.field, .consent, .form-foot').forEach((x) => { x.hidden = true; x.style.display = 'none'; });
    ok.classList.add('show');
    ok.focus();
  });
  document.getElementById('form-again').addEventListener('click', () => {
    form.reset();
    ok.classList.remove('show');
    form.querySelectorAll('.field, .consent, .form-foot').forEach((x) => { x.hidden = false; x.style.display = ''; });
    form.elements.nome.focus();
  });
})();

// epScience: botões da galeria de telas
(() => {
  const track = document.querySelector('.screens');
  if (!track) return;
  document.querySelectorAll('.nav-btn').forEach((b) => b.addEventListener('click', () => {
    const step = track.querySelector('.screen').getBoundingClientRect().width + 24;
    track.scrollBy({ left: Number(b.dataset.dir) * step * 2, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));
})();

// Seletor de idioma
(() => {
  const box = document.querySelector('.lang');
  if (!box) return;
  const btn = box.querySelector('.lang-btn');
  const set = (o) => { box.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(!box.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  // leva junto a âncora da seção atual ao trocar de idioma
  document.querySelectorAll('a[data-lang]').forEach((a) => a.addEventListener('click', () => {
    try { localStorage.setItem('ephealth-lang', a.dataset.lang); } catch (_) { /* ok */ }
  }));
})();

// Soluções: sub-abas (Todas as frentes / epScience)
(() => {
  const bar = document.querySelector('.subtabs');
  if (!bar) return;
  const tabs = [...bar.querySelectorAll('[role=tab]')];
  const ink = bar.querySelector('.subtabs-ink');
  const place = (t) => { ink.style.width = `${t.offsetWidth}px`; ink.style.transform = `translateX(${t.offsetLeft}px)`; };
  const select = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      const p = document.getElementById(x.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on && !reduceMotion) { p.classList.remove('anim'); void p.offsetWidth; p.classList.add('anim'); }
    });
    place(t);
    if (focus) t.focus();
    document.dispatchEvent(new CustomEvent('soltab', { detail: t.getAttribute('aria-controls') }));
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
    });
  });
  place(tabs[0]);
  window.addEventListener('resize', () => place(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));
  // links que apontam para uma aba (ex.: a linha EDC · epScience)
  const open = (id) => {
    const t = tabs.find((x) => x.getAttribute('aria-controls') === id);
    if (!t) return false;
    select(t);
    setTimeout(() => document.getElementById('solucoes').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 60);
    return true;
  };
  document.querySelectorAll('a[href="#sol-epscience"]').forEach((a) => a.addEventListener('click', (e) => { if (open('sol-epscience')) e.preventDefault(); }));
  if (location.hash === '#sol-epscience' || location.hash === '#epscience-home') open('sol-epscience');
})();

// Infraestrutura crítica: mapa de pontos, torres da ponte e troca dos pilares
(function(){
  var NS='http://www.w3.org/2000/svg';
  var svg=document.getElementById('ic-svg');
  if(!svg)return;

  /* Contorno simplificado do Brasil (lon, lat) -> nuvem de pontos */
  var br=[[-60.5,5.2],[-51.5,4.2],[-50,0],[-44,-2.5],[-38,-3.5],[-35.2,-5.5],[-34.8,-8],[-38.5,-13],[-39,-17.5],[-40.3,-20.3],[-43,-23],[-46.5,-24],[-48.5,-26],[-48.6,-28.5],[-50.5,-30.5],[-53.4,-33.7],[-57.6,-30.2],[-55,-27],[-54.6,-25.5],[-58,-22],[-57.8,-19.5],[-60,-16],[-65,-11],[-70,-11],[-73.5,-7.5],[-73,-4.5],[-69.5,-1],[-70,1.5],[-66.8,1.2],[-64,4]];
  var k=3.7, ox=18, oy=172;
  var poly=br.map(function(p){return [ox+(p[0]+74)*k, oy+(5.5-p[1])*k];});
  function inside(x,y){var c=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var a=poly[i],b=poly[j];if(((a[1]>y)!=(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
  var g=document.getElementById('ic-br');
  var outline=document.createElementNS(NS,'polygon');
  outline.setAttribute('points',poly.map(function(p){return p.join(',')}).join(' '));
  outline.setAttribute('fill','rgba(185,184,238,.04)');
  outline.setAttribute('stroke','rgba(185,184,238,.22)');
  g.appendChild(outline);
  var seed=7;function rnd(){seed=(seed*9301+49297)%233280;return seed/233280;}
  for(var y=oy;y<oy+175;y+=9){for(var x=ox;x<ox+180;x+=9){
    var px=x+(rnd()-.5)*4, py=y+(rnd()-.5)*4;
    if(!inside(px,py))continue;
    var c=document.createElementNS(NS,'circle');
    var on=rnd()<.09;
    c.setAttribute('cx',px.toFixed(1));c.setAttribute('cy',py.toFixed(1));
    c.setAttribute('r',on?2.4:1.5);
    c.setAttribute('class',on?'ic-dot on':'ic-dot');
    if(on)c.style.animationDelay=(rnd()*3).toFixed(2)+'s';
    g.appendChild(c);
  }}

  /* Torres da ponte (4 pilares) */
  var pg=document.getElementById('ic-pylons');
  var xs=[195,265,335,405], top=168, deck=240;
  xs.forEach(function(x,i){
    var grp=document.createElementNS(NS,'g'), cables='';
    [-30,-20,-10,10,20,30].forEach(function(d){
      cables+='<line class="cable" x1="'+x+'" y1="'+(top+8)+'" x2="'+(x+d)+'" y2="'+deck+'" stroke-width="1"/>';
    });
    grp.setAttribute('class','ic-pylon'+(i===0?' is-active':''));
    grp.innerHTML=cables+
      '<rect class="tower" x="'+(x-2.5)+'" y="'+top+'" width="5" height="'+(296-top)+'" rx="2"/>'+
      '<circle class="halo" cx="'+x+'" cy="'+top+'" r="11" fill="none" stroke="rgba(255,255,255,.14)"/>'+
      '<circle class="core" cx="'+x+'" cy="'+top+'" r="4.5" fill="rgba(185,184,238,.7)"/>'+
      '<text x="'+x+'" y="'+(top-20)+'" text-anchor="middle">0'+(i+1)+'</text>';
    pg.appendChild(grp);
  });

  /* Interação */
  var chips=[].map.call(document.querySelectorAll('.ic-item'),function(el){return [el.dataset.t,el.dataset.s];});
  var items=[].slice.call(document.querySelectorAll('.ic-item'));
  var pylons=[].slice.call(pg.children);
  var chip=document.getElementById('ic-chip'), ct=document.getElementById('ic-chip-t'), cs=document.getElementById('ic-chip-s');
  var cur=0, timer=null;
  function set(i){
    if(i===cur)return; cur=i;
    items.forEach(function(el,j){el.classList.toggle('is-active',j===i);el.setAttribute('aria-selected',j===i);});
    pylons.forEach(function(el,j){el.classList.toggle('is-active',j===i);});
    chip.classList.add('swap');
    setTimeout(function(){ct.textContent=chips[i][0];cs.textContent=chips[i][1];chip.classList.remove('swap');},220);
  }
  function auto(){clearInterval(timer);timer=setInterval(function(){set((cur+1)%4)},4200);}
  items.forEach(function(el,i){
    el.addEventListener('mouseenter',function(){set(i);clearInterval(timer);});
    el.addEventListener('mouseleave',auto);
    el.addEventListener('click',function(){set(i);auto();});
    el.addEventListener('focus',function(){set(i);clearInterval(timer);});
  });
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)auto();
})();
