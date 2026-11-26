const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '#';
const PLATFORMS = {
  android: {label:'Google Play', svg:'<path d="M4 3l10 9-10 9z"/><path d="M14 12l3-3 4 2.3c.9.5.9 1.9 0 2.4L17 15z" opacity=".75"/>'},
  ios: {label:'App Store', svg:'<path d="M16 12.4c0-2 1.6-2.900 1.700-3-1-1.400-2.400-1.600-2.900-1.600-1.200-.1-2.400.7-3 .7s-1.600-.7-2.600-.7C7.800 7.900 6 9.400 6 12.200c0 2.800 2 6.200 3.700 6.200.8 0 1.300-.5 2.300-.5s1.400.5 2.300.5c1.600 0 3-2.900 3.300-3.800-.1 0-1.600-.6-1.600-2.200zM14 6.400c.6-.7 1-1.700.9-2.600-.9 0-1.900.6-2.500 1.300-.5.600-1 1.600-.9 2.500 1 .1 1.900-.5 2.500-1.200z"/>'},
  windows: {label:'Windows', svg:'<path d="M3 5l8-1v7H3zM12 3.900L21 2.500V11h-9zM3 12h8v7l-8-1zM12 12h9v8.500L12 19z"/>'}
};

/* ---------------- Language (en · ku = Kurdish Sorani · ar) ---------------- */
const LANGS = {en:{dir:'ltr', html:'en'}, ku:{dir:'rtl', html:'ckb'}, ar:{dir:'rtl', html:'ar'}};
let lang = LANGS[window.OV_LANG] ? window.OV_LANG : 'en';
// t('English text') -> text in the current language (falls back to English)
const t = s => (window.I18N && I18N[s] && I18N[s][lang]) || s;
// tf(row,'name') -> row.name (English) or row.name_ku / row.name_ar, falling back to English
const tf = (r, f) => lang === 'en' ? r[f] : (r[f + '_' + lang] || r[f]);

function applyLang() {
  const root = document.documentElement;
  root.lang = LANGS[lang].html; root.dir = LANGS[lang].dir;
  document.querySelectorAll('[data-i]').forEach(el => { if (!el.dataset.en) el.dataset.en = el.textContent.trim(); el.textContent = t(el.dataset.en); });
  document.querySelectorAll('[data-ih]').forEach(el => { el.innerHTML = t(el.dataset.ih); });
  document.querySelectorAll('[data-ip]').forEach(el => { el.placeholder = t(el.dataset.ip); });
  document.querySelectorAll('[data-ia]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.ia)); });
  document.querySelectorAll('[data-ial]').forEach(el => { el.alt = t(el.dataset.ial); });
  document.querySelectorAll('[data-it]').forEach(el => { el.title = t(el.dataset.it); });
  document.title = t('One Vision — Software built for real work');
  const md = document.querySelector('meta[name="description"]'); if (md) md.content = t('One Vision builds thoughtful software products and business systems.');
  document.querySelectorAll('#langSwitch button').forEach(b => { const on = b.dataset.lang === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  if (lastCount <= 0) $('#chatBody').innerHTML = chatEmpty();
  drawApps(); drawChips(); drawProjects();
}
function setLang(l) {
  if (!LANGS[l] || l === lang) return;
  lang = l; try { localStorage.setItem('ov_lang', l); } catch (e) {}
  applyLang();
}
document.querySelectorAll('#langSwitch button').forEach(b => b.onclick = () => setLang(b.dataset.lang));

const ctaCard = (title, text, n) => `<article class="card cta-card" style="--span:${n % 3 === 0 ? 3 : 3 - (n % 3)}"><h3>${esc(t(title))}</h3><p>${esc(t(text))}</p><a class="btn" href="#contact">${esc(t('Talk to us'))}</a></article>`;
function toast(m){const x=$('#toast');x.textContent=m;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3000)}

$('#menuBtn').onclick = () => $('#navLinks').classList.toggle('open');
document.querySelectorAll('#navLinks a').forEach(a => a.onclick = () => $('#navLinks').classList.remove('open'));
$('#year').textContent = new Date().getFullYear();

/* ---------------- Applications ---------------- */
let apps = null, appsErr = false;
async function loadApps() {
  const {data, error} = await sb.from('apps').select('*, app_links(*)').eq('published', true).order('sort_order').order('created_at', {ascending:false});
  if (error) appsErr = true; else apps = data;
  drawApps();
}
function drawApps() {
  const g = $('#appsGrid');
  if (appsErr) { g.innerHTML = `<div class="empty">${esc(t('Could not load applications. Please try again later.'))}</div>`; return; }
  if (!apps) return;
  if (!apps.length) { g.innerHTML = `<div class="empty">${esc(t('New applications are coming soon.'))}</div>`; return; }
  g.innerHTML = apps.map(a => {
    const name = tf(a, 'name'), cat = tf(a, 'category');
    const links = (a.app_links || []).filter(l => PLATFORMS[l.platform]).map(l =>
      `<a class="store" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24">${PLATFORMS[l.platform].svg}</svg>${PLATFORMS[l.platform].label}</a>`).join('');
    const logo = a.logo_url ? `<img src="${esc(safeUrl(a.logo_url))}" alt="${esc(name)}" loading="lazy">` : esc((name || a.name).charAt(0));
    return `<article class="card"><div class="app-top"><div class="app-logo">${logo}</div><div><h3>${esc(name)}</h3>${cat ? `<span class="tag">${esc(cat)}</span>` : ''}</div></div>
      <p class="desc">${esc(tf(a, 'description'))}</p>${links ? `<div class="stores">${links}</div>` : ''}</article>`;
  }).join('') + ctaCard('Need your own app?', 'Tell us what you have in mind and we will help you shape and build it.', apps.length);
  initClamp(g);
}

/* ---------------- Solutions ---------------- */
let projects = null, projectsErr = false, cat = 'All';
const ro = new ResizeObserver(es => es.forEach(e => { const f = e.target.querySelector('iframe'); if (f) f.style.transform = `scale(${e.contentRect.width / 1280})`; }));
async function loadProjects() {
  const {data, error} = await sb.from('projects').select('*').eq('published', true).order('sort_order').order('created_at', {ascending:false});
  if (error) projectsErr = true; else projects = data;
  drawChips(); drawProjects();
}
function drawChips() {
  if (!projects) return;
  const cats = ['All', ...new Set(projects.map(p => p.category).filter(Boolean))];
  if (!cats.includes(cat)) cat = 'All';
  const label = c => c === 'All' ? t('All') : tf(projects.find(p => p.category === c), 'category');
  $('#chips').innerHTML = cats.length > 2 ? cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-c="${esc(c)}">${esc(label(c))}</button>`).join('') : '';
  document.querySelectorAll('.chip').forEach(b => b.onclick = () => { cat = b.dataset.c; drawChips(); drawProjects(); });
}
function drawProjects() {
  const g = $('#projectsGrid');
  ro.disconnect();
  if (projectsErr) { g.innerHTML = `<div class="empty">${esc(t('Could not load solutions. Please try again later.'))}</div>`; return; }
  if (!projects) return;
  const list = projects.filter(p => cat === 'All' || p.category === cat);
  if (!list.length) { g.innerHTML = `<div class="empty">${esc(t('Solutions will appear here soon.'))}</div>`; return; }
  g.innerHTML = list.map((p, i) => { const title = tf(p, 'title'), pc = tf(p, 'category'); return `<article class="card sol"><button class="demo-art" data-idx="${i}" aria-label="${esc(title)}"><iframe sandbox="allow-scripts" loading="lazy" tabindex="-1" aria-hidden="true" title="" srcdoc="${esc(p.html_code)}"></iframe></button>
    <div class="sol-body">${pc ? `<span class="tag">${esc(pc)}</span>` : ''}<h3>${esc(title)}</h3><p class="desc">${esc(tf(p, 'description'))}</p><button class="btn btn-primary sol-open" data-idx="${i}">${esc(t('Open live system ↗'))}</button></div></article>`; }).join('')
    + ctaCard('Need a custom system?', 'We can adapt any of these to your business, or build something new.', list.length);
  g.querySelectorAll('[data-idx]').forEach(b => b.onclick = () => openProject(list[b.dataset.idx]));
  g.querySelectorAll('.demo-art').forEach(a => { ro.observe(a); const f = a.querySelector('iframe'); f.style.transform = `scale(${(a.clientWidth || 360) / 1280})`; });
  initClamp(g);
}
function initClamp(root) {
  root.querySelectorAll('.desc').forEach(p => {
    if (p.nextElementSibling && p.nextElementSibling.classList.contains('more')) return;
    if (p.scrollHeight <= p.clientHeight + 1) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'more'; b.textContent = t('Read more');
    b.onclick = () => { const o = p.classList.toggle('open'); b.textContent = t(o ? 'Show less' : 'Read more'); };
    p.after(b);
  });
}
function openProject(p) {
  $('#modalTitle').textContent = tf(p, 'title');
  $('#modalFrame').srcdoc = p.html_code || `<p style="font-family:sans-serif;padding:20px">${esc(t('No preview available.'))}</p>`;
  $('#modal').classList.add('open');
}
function closeModal(){ $('#modal').classList.remove('open'); $('#modalFrame').srcdoc = ''; }
$('#modalClose').onclick = closeModal;
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------------- Contact form ---------------- */
$('#contactForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.currentTarget, btn = f.querySelector('button'); btn.disabled = true;
  const {error} = await sb.from('inquiries').insert({
    name: $('#name').value.trim(), email: $('#email').value.trim(), interest: $('#interest').value,
    company: $('#company').value.trim() || null, message: $('#message').value.trim()
  });
  btn.disabled = false;
  if (error) return toast(t('Could not send. Please try again.'));
  f.reset(); toast(t('Thanks! We will get back to you soon.'));
};

/* ---------------- Support chat (RPC based; the session id acts as the visitor's private key) ---------------- */
let sid = null; try { sid = localStorage.getItem('ov_chat_sid'); } catch (e) {}
let timer, lastCount = -1;
const chatEmpty = () => `<div class="msg system">${esc(t("Send us a message and we'll get back to you."))}</div>`;
async function pullChat() {
  if (!sid) return;
  const {data, error} = await sb.rpc('get_chat_messages', {p_session: sid});
  if (error || !data || data.length === lastCount) return;
  lastCount = data.length;
  const body = $('#chatBody');
  body.innerHTML = data.map(m => `<div class="msg ${esc(m.sender)}" dir="auto">${esc(m.body)}</div>`).join('') || chatEmpty();
  body.scrollTop = body.scrollHeight;
}
$('#chatFab').onclick = () => {
  const c = $('#chat'); c.classList.toggle('open');
  clearInterval(timer);
  if (c.classList.contains('open')) { pullChat(); timer = setInterval(pullChat, 3000); }
};
$('#chatForm').onsubmit = async e => {
  e.preventDefault();
  const input = $('#chatInput'), text = input.value.trim(); if (!text) return;
  input.value = '';
  if (!sid) {
    const {data, error} = await sb.rpc('start_chat', {p_name: null});
    if (error) return toast(t('Chat is unavailable right now.'));
    sid = data; try { localStorage.setItem('ov_chat_sid', sid); } catch (e) {}
  }
  const {error} = await sb.rpc('send_chat_message', {p_session: sid, p_body: text});
  if (error) { input.value = text; return toast(t('Message not sent. Try again.')); }
  lastCount = -1; pullChat();
};

/* ---------------- Scroll reveal + "Chat with us" buttons ---------------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold:.12}) : null;
function observeReveal(){ document.querySelectorAll('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in')); }
observeReveal();
document.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => { if (!$('#chat').classList.contains('open')) $('#chatFab').click(); });

applyLang();
loadApps(); loadProjects();

/* ---------------- Visitor log (IP is captured server-side) ---------------- */
(function () {
  try {
    let v = localStorage.getItem('ov_vid');
    if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); localStorage.setItem('ov_vid', v); }
    sb.rpc('log_visit', { p_visitor: v, p_path: location.pathname, p_referrer: document.referrer || null, p_lang: lang });
  } catch (e) {}
})();
