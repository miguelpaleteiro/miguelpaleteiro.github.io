/* Vida · núcleo: utilidades, almacén, navegación, hojas y gráficos.
   Todo cuelga de window.V. Cada sección (entreno, contenido, estudio, yo, hoy) añade
   sus vistas a V.views y sus manejadores a V.act (clics), V.form (envíos) y V.chg (cambios). */
'use strict';
const V = window.V = { views: {}, act: {}, form: {}, chg: {} };

/* ---------- Utilidades ---------- */
V.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
V.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
V.$ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');

V.DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
V.DIAS3 = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
V.MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
V.iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
V.date = s => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
V.today = () => V.iso(new Date());
V.add = (s, n) => { const d = V.date(s); d.setDate(d.getDate() + n); return V.iso(d); };
V.diff = (a, b) => Math.round((V.date(a) - V.date(b)) / 864e5);
V.dow = s => (V.date(s).getDay() + 6) % 7;            // 0 = lunes
V.monday = s => V.add(s, -V.dow(s));
V.isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
V.fdate = s => { if (!V.isDate(s)) return 'sin fecha'; const d = V.date(s); return V.DIAS3[V.dow(s)] + ' ' + d.getDate() + ' ' + V.MES[d.getMonth()]; };
V.rel = s => { const n = V.diff(s, V.today()); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : V.fdate(s); };
V.inWeek = (s, mon) => V.isDate(s) && s >= mon && s <= V.add(mon, 6);

/* Tiempo: "1:17:56", "34:00" o "45" (minutos) -> segundos */
V.sec = str => {
  str = String(str == null ? '' : str).trim().replace(',', '.');
  if (!str) return null;
  const p = str.split(':').map(Number);
  if (p.some(isNaN)) return null;
  return Math.round(p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60);
};
V.hms = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ':' + pad(m) + ':' + pad(s % 60) : m + ':' + pad(s % 60); };
V.pace = spk => { spk = Math.round(spk); return Math.floor(spk / 60) + ':' + pad(spk % 60); };
V.num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; };
V.n1 = n => (Math.round(n * 10) / 10).toLocaleString('es-ES');
V.hm = min => { min = Math.round(min); return min < 60 ? min + ' min' : Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + pad(min % 60) : ''); };
V.sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
V.avg = a => a.length ? V.sum(a, x => x) / a.length : null;

/* ---------- Almacén (solo en este dispositivo) ---------- */
V.KEY = 'vida.v1';
V.blank = () => ({
  v: 1,
  profile: { name: '' },
  running: { ref: null, goal: null, plan: null, manual: {}, rules: [] },
  sessions: [],                       // sesiones planificadas (carrera y fuerza)
  runs: [],                           // carreras registradas
  strength: { templates: [], logs: [] },
  races: [],                          // marcas
  pain: { on: true, label: 'Molestia' },
  content: { items: [], ideas: [] },
  study: { subjects: [], exams: [], topics: [], log: [], timer: null },
  habits: { list: [
    { id: 'h1', name: 'Dormir 7 h o más' },
    { id: 'h2', name: 'Moverme cada hora sentado' },
    { id: 'h3', name: 'Pantallas fuera antes de dormir' }
  ], log: {} },
  daily: {},                          // chequeo de mañana por fecha
  tasks: [],
  goals: [],
  reviews: [],
  settings: { theme: 'auto', lastExport: null, welcomed: false }
});
V.adopt = data => {
  const b = V.blank();
  if (!data || typeof data !== 'object') return b;
  Object.keys(b).forEach(k => {
    const d = data[k];
    if (d == null) return;
    b[k] = Array.isArray(b[k]) ? (Array.isArray(d) ? d : b[k])
      : typeof b[k] === 'object' ? Object.assign(b[k], typeof d === 'object' ? d : {}) : d;
  });
  b.v = 1;
  return b;
};
V.load = () => {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(V.KEY)); } catch (e) { raw = null; }
  V.S = V.adopt(raw);
};
V.save = () => {
  try { localStorage.setItem(V.KEY, JSON.stringify(V.S)); return true; }
  catch (e) { V.toast('No se ha podido guardar en este navegador'); return false; }
};
V.commit = msg => { V.save(); V.render(true); if (msg) V.toast(msg); };
V.find = (arr, id) => arr.find(x => x.id === id);
V.drop = (arr, id) => { const i = arr.findIndex(x => x.id === id); if (i >= 0) arr.splice(i, 1); };
V.hasData = () => { const S = V.S; return !!(S.runs.length || S.sessions.length || S.content.items.length || S.study.log.length || Object.keys(S.daily).length || S.tasks.length); };

/* ---------- Navegación ---------- */
V.route = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
V.TITLES = { hoy: 'Hoy', entreno: 'Entreno', contenido: 'Contenido', estudio: 'Estudio', yo: 'Yo' };
V.render = keep => {
  const r = V.route(), sec = V.views[r[0]] ? r[0] : 'hoy', view = V.$('#view');
  const a = document.activeElement, key = keep && a && a !== document.body && view.contains(a)
    ? (a.id ? '#' + CSS.escape(a.id) : a.dataset.act ? '[data-act="' + a.dataset.act + '"]' + (a.dataset.id ? '[data-id="' + a.dataset.id + '"]' : '') : null) : null;
  view.innerHTML = V.views[sec](r[1], r[2]);
  document.querySelectorAll('.tabs a').forEach(t => {
    if (t.dataset.tab === sec) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  document.title = V.TITLES[sec] + ' · Vida';
  const d = new Date();
  V.$('#bar-date').textContent = V.DIAS[V.dow(V.today())] + ' ' + d.getDate() + ' ' + V.MES[d.getMonth()];
  if (key) { const el = view.querySelector(key); if (el) el.focus({ preventScroll: true }); }
  if (!keep) { scrollTo(0, 0); }
  if (V.afterRender) V.afterRender(sec);
};
V.subnav = (sec, cur, items) => '<nav class="sub" aria-label="Apartados">' + items.map(i =>
  '<a href="#/' + sec + '/' + i[0] + '"' + (i[0] === cur ? ' aria-current="page"' : '') + '>' + i[1] + '</a>').join('') + '</nav>';

/* ---------- Hoja, aviso y portapapeles ---------- */
V.sheet = (title, html) => {
  const d = V.$('#sheet');
  V.$('#sheet-t').textContent = title;
  V.$('#sheet-b').innerHTML = html;
  if (!d.open) d.showModal();
  d.scrollTop = 0;
};
V.close = () => { const d = V.$('#sheet'); if (d.open) d.close(); };
V.act.close = V.close;
let toastT;
V.toast = msg => { const t = V.$('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); };
V.copy = (text, ok) => {
  const done = () => V.toast(ok || 'Copiado');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => V.sheet('Copia este texto', '<textarea rows="14" readonly>' + V.esc(text) + '</textarea>'));
  else V.sheet('Copia este texto', '<textarea rows="14" readonly>' + V.esc(text) + '</textarea>');
};

/* ---------- Piezas de formulario ---------- */
V.f = (label, name, value, o) => {
  o = o || {};
  return '<label class="f"><span>' + label + '</span><input name="' + name + '" type="' + (o.type || 'text') + '" value="' + V.esc(value == null ? '' : value) + '"' +
    (o.ph ? ' placeholder="' + V.esc(o.ph) + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.req ? ' required' : '') + ' autocomplete="off"></label>';
};
V.ta = (label, name, value, rows, ph) => '<label class="f"><span>' + label + '</span><textarea name="' + name + '" rows="' + (rows || 3) + '"' + (ph ? ' placeholder="' + V.esc(ph) + '"' : '') + '>' + V.esc(value == null ? '' : value) + '</textarea></label>';
V.sel = (label, name, opts, value) => '<label class="f"><span>' + label + '</span><select name="' + name + '">' + opts.map(o =>
  '<option value="' + V.esc(o[0]) + '"' + (String(o[0]) === String(value == null ? '' : value) ? ' selected' : '') + '>' + V.esc(o[1]) + '</option>').join('') + '</select></label>';
V.scale = (label, name, value, max) => {
  let s = '<fieldset><legend>' + label + '</legend><div class="scale' + (max === 5 ? ' five' : '') + '">';
  for (let i = max === 5 ? 1 : 0; i <= (max || 10); i++) s += '<label><input type="radio" name="' + name + '" value="' + i + '"' + (value != null && Number(value) === i ? ' checked' : '') + '><span>' + i + '</span></label>';
  return s + '</div></fieldset>';
};
V.hid = (name, value) => '<input type="hidden" name="' + name + '" value="' + V.esc(value == null ? '' : value) + '">';
V.submit = (text, delAct, id) => '<div class="actions"><button class="btn solid" type="submit">' + (text || 'Guardar') + '</button>' +
  (delAct ? '<button class="btn ghost" type="button" data-act="' + delAct + '" data-id="' + V.esc(id) + '">Borrar</button>' : '') + '</div>';

/* ---------- Gráficos (una serie, marcas finas, valor al tocar) ---------- */
V.bars = (items, o) => {
  o = o || {};
  const W = 320, H = o.h || 120, pt = 16, pb = 18, n = items.length || 1, slot = W / n, bw = Math.min(24, slot * .6), base = H - pb;
  const max = Math.max(1, ...items.map(i => Math.max(i.v || 0, i.plan || 0)));
  const y = v => pt + (base - pt) * (1 - v / max);
  const fmt = o.fmt || V.n1;
  const peak = Math.max(...items.map(i => i.v || 0));
  let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + V.esc((o.label || 'Gráfico') + ': ' + items.map(i => i.l + ' ' + fmt(i.v || 0)).join(', ')) + '">';
  s += '<line class="axis" x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '"/>';
  items.forEach((it, i) => {
    const x = i * slot + (slot - bw) / 2, top = y(it.v || 0), h = base - top, r = Math.min(4, h);
    const tip = it.tip || (it.l + ': ' + fmt(it.v || 0) + (o.unit ? ' ' + o.unit : ''));
    if (h > .5) s += '<path class="col' + (it.hi ? ' hi' : '') + '" d="M' + x + ',' + base + 'V' + (top + r) + 'Q' + x + ',' + top + ' ' + (x + r) + ',' + top + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + r) + 'V' + base + 'Z"/>';
    if (it.plan) s += '<line class="plan" x1="' + (x - 3) + '" x2="' + (x + bw + 3) + '" y1="' + y(it.plan) + '" y2="' + y(it.plan) + '"/>';
    if (it.v && (it.hi || it.v === peak)) s += '<text class="val" x="' + (x + bw / 2) + '" y="' + (top - 4) + '" text-anchor="middle">' + fmt(it.v) + '</text>';
    s += '<text x="' + (x + bw / 2) + '" y="' + (H - 5) + '" text-anchor="middle">' + V.esc(it.l) + '</text>';
    s += '<rect class="hit" x="' + (i * slot) + '" y="0" width="' + slot + '" height="' + H + '" data-act="tip" data-tip="' + V.esc(tip) + '"><title>' + V.esc(tip) + '</title></rect>';
  });
  return s + '</svg><p class="chart-tip small muted" aria-live="polite">' + V.esc(o.hint || 'Toca una barra para ver el dato.') + '</p>';
};
V.spark = (vals, o) => {
  o = o || {};
  const pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
  if (pts.length < 2) return '<p class="small muted">Faltan datos para ver la tendencia.</p>';
  const W = 320, H = o.h || 56, p = 8, lo = Math.min(...pts.map(q => q[1])), hi = Math.max(...pts.map(q => q[1])), span = hi - lo || 1, n = vals.length - 1 || 1;
  const xy = q => [p + (W - 2 * p - 34) * q[0] / n, p + (H - 2 * p) * (1 - (q[1] - lo) / span)];
  const fmt = o.fmt || V.n1, last = pts[pts.length - 1], e = xy(last);
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + V.esc((o.label || 'Tendencia') + ': de ' + fmt(pts[0][1]) + ' a ' + fmt(last[1]) + ', mínimo ' + fmt(lo) + ', máximo ' + fmt(hi)) + '">' +
    '<polyline class="ln" points="' + pts.map(q => xy(q).map(c => Math.round(c * 10) / 10).join(',')).join(' ') + '"/>' +
    '<circle class="dot" cx="' + e[0] + '" cy="' + e[1] + '" r="4.5"/>' +
    '<text class="val" x="' + (e[0] + 9) + '" y="' + (e[1] + 3) + '">' + fmt(last[1]) + '</text></svg>';
};
V.act.tip = (d, el) => { const box = el.closest('svg').nextElementSibling; if (box) box.textContent = d.tip; };
V.meter = (v, max, red) => '<div class="meter' + (red ? ' red' : '') + '" role="img" aria-label="' + Math.round(v) + ' de ' + Math.round(max) + '"><i style="width:' + Math.max(0, Math.min(100, max ? v / max * 100 : 0)) + '%"></i></div>';

/* ---------- Arranque y eventos ---------- */
V.applyTheme = () => {
  const t = V.S.settings.theme, r = document.documentElement;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
};
V.start = () => {
  V.load();
  V.applyTheme();
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = V.act[el.dataset.act];
    if (!fn) return;
    if (el.tagName !== 'INPUT') e.preventDefault();
    fn(el.dataset, el, e);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = V.form[f.dataset.form];
    if (fn) fn(Object.fromEntries(new FormData(f)), f);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-chg]');
    if (el && V.chg[el.dataset.chg]) V.chg[el.dataset.chg](el.dataset, el);
  });
  V.$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') V.close(); });
  addEventListener('hashchange', () => { V.close(); V.render(false); });
  addEventListener('storage', e => { if (e.key === V.KEY) { V.load(); V.render(true); } });
  V.render(false);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
};
