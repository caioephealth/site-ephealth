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

  const rules = {
    nome: (v) => (v.trim().length >= 2 ? '' : 'Diga como podemos te chamar.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Confira o e-mail.'),
    telefone: (v) => (v.replace(/\D/g, '').length >= 10 ? '' : 'Informe o telefone com DDD.'),
    mensagem: (v) => (v.trim().length >= 10 ? '' : 'Conte em poucas palavras o que você precisa.'),
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
  form.elements.telefone.addEventListener('input', (e) => {
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
