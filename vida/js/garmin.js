/* Vida · Importar de Garmin Connect (u otro reloj): CSV de la lista de actividades, o TCX/GPX de una actividad.
   No hay conexión directa: Garmin no ofrece API a webs sin servidor. Todo se lee en el navegador, sin subir nada. */
'use strict';
(() => {
const esc = V.esc;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/* CSV con comillas; separador coma o punto y coma */
V.csv = text => {
  text = String(text).replace(/^﻿/, '');
  const first = text.split('\n')[0], sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
};
const COLS = {
  type: [/^activity type$/, /^tipo de actividad$/, /^type$/, /^tipo$/], date: [/^date$/, /^fecha$/, /^start time$/, /^hora de inicio$/],
  title: [/^title$/, /^titulo$/, /^name$/, /^nombre$/], km: [/^distance$/, /^distancia$/], time: [/^time$/, /^tiempo$/, /^moving time$/, /^tiempo en movimiento$/, /^elapsed time$/, /^tiempo transcurrido$/],
  hr: [/^avg hr$/, /^fc media$/, /^frecuencia cardiaca media$/, /^average heart rate$/], w: [/^avg power$/, /^potencia media$/], up: [/^total ascent$/, /^ascenso total$/]
};
const isRun = t => /run|carrera|correr|trail|cinta|treadmill|pista/.test(norm(t));
const toDate = v => {
  v = String(v || '').trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return null;
};
const toSec = v => V.sec(String(v || '').trim().replace(/[.,]\d+$/, ''));
const toNum = v => { v = String(v || '').trim(); if (/^\d{1,3}(\.\d{3})+,\d+$/.test(v)) v = v.replace(/\./g, ''); else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v)) v = v.replace(/,/g, ''); return V.num(v); };
const surf = t => { t = norm(t); return /cinta|treadmill|indoor/.test(t) ? 'Cinta' : /trail|montana/.test(t) ? 'Montaña' : ''; };

V.parseCsvRuns = text => {
  const rows = V.csv(text);
  if (rows.length < 2) return { error: 'El archivo está vacío.' };
  const head = rows[0].map(norm), ix = {};
  Object.keys(COLS).forEach(k => { for (const re of COLS[k]) { const i = head.findIndex(h => re.test(h)); if (i >= 0) { ix[k] = i; break; } } });
  if (ix.date == null || ix.km == null) return { error: 'No encuentro las columnas de fecha y distancia. ¿Es el CSV de actividades de Garmin Connect?' };
  const out = []; let skipped = 0;
  rows.slice(1).forEach(r => {
    const type = ix.type == null ? 'run' : r[ix.type], date = toDate(r[ix.date]), km = toNum(r[ix.km]);
    if (!isRun(type) || !date || !km || km <= 0) { skipped++; return; }
    const w = ix.w == null ? null : toNum(r[ix.w]), up = ix.up == null ? null : toNum(r[ix.up]), hr = ix.hr == null ? null : toNum(r[ix.hr]);
    out.push({ date, km: Math.round(km * 100) / 100, sec: ix.time == null ? null : toSec(r[ix.time]), hr: hr ? Math.round(hr) : null, surface: surf(type),
      title: ix.title == null ? '' : String(r[ix.title]).trim(), extra: [w ? Math.round(w) + ' W' : null, up ? '+' + Math.round(up) + ' m' : null].filter(Boolean).join(' · ') });
  });
  return { runs: out, skipped };
};

const tags = (doc, name) => [...doc.getElementsByTagName('*')].filter(e => e.localName === name);
const hav = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]), h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
V.parseXmlRun = text => {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return { error: 'No se puede leer el archivo.' };
  const laps = tags(doc, 'Lap');
  if (laps.length) {                                             // TCX
    const one = (e, n) => { const x = [...e.children].find(c => c.localName === n); return x ? x.textContent : null; };
    let m = 0, s = 0, hs = 0, ht = 0;
    laps.forEach(l => { const t = Number(one(l, 'TotalTimeSeconds')) || 0, a = [...l.children].find(c => c.localName === 'AverageHeartRateBpm'); m += Number(one(l, 'DistanceMeters')) || 0; s += t; if (a) { hs += Number(a.textContent.trim()) * t; ht += t; } });
    const id = tags(doc, 'Id')[0], when = id ? new Date(id.textContent.trim()) : null, act = tags(doc, 'Activity')[0];
    if (!m || !when || isNaN(when)) return { error: 'El archivo no trae distancia o fecha.' };
    return { runs: [{ date: V.iso(when), km: Math.round(m / 10) / 100, sec: Math.round(s), hr: ht ? Math.round(hs / ht) : null, surface: '', title: act && act.getAttribute('Sport') || '', extra: '' }], skipped: 0 };
  }
  const pts = tags(doc, 'trkpt');
  if (pts.length > 1) {                                          // GPX
    let km = 0; const times = [], hrs = tags(doc, 'hr').map(e => Number(e.textContent)).filter(Boolean);
    pts.forEach((p, i) => { if (i) km += hav([+pts[i - 1].getAttribute('lat'), +pts[i - 1].getAttribute('lon')], [+p.getAttribute('lat'), +p.getAttribute('lon')]); const t = [...p.children].find(c => c.localName === 'time'); if (t) times.push(new Date(t.textContent.trim())); });
    if (!times.length || isNaN(times[0])) return { error: 'El archivo no trae horas.' };
    const name = tags(doc, 'name')[0];
    return { runs: [{ date: V.iso(times[0]), km: Math.round(km * 100) / 100, sec: Math.round((times[times.length - 1] - times[0]) / 1000), hr: hrs.length ? Math.round(V.avg(hrs)) : null, surface: '', title: name ? name.textContent.trim() : '', extra: '' }], skipped: 0 };
  }
  return { error: 'No reconozco el formato. Vale el CSV de actividades, o un TCX o GPX de una actividad.' };
};
V.parseRunsFile = text => /^\s*</.test(text) ? V.parseXmlRun(text) : V.parseCsvRuns(text);

/* Cruza con lo que ya hay: misma fecha y distancia parecida = la misma carrera. */
const twin = x => V.S.runs.find(r => r.date === x.date && Math.abs(r.km - x.km) <= Math.max(.3, x.km * .03));
const guess = x => {
  const t = norm(x.title), s = V.S.sessions.find(q => q.date === x.date && q.type === 'run' && !q.runId);
  const kind = /serie|interval/.test(t) ? 'series' : /umbral|tempo|threshold/.test(t) ? 'umbral' : /fartlek/.test(t) ? 'fartlek' : /carrera popular|race|maraton|10k|15k/.test(t) ? 'carrera' : s ? s.kind : x.surface === 'Montaña' ? 'montana' : x.km >= 14 ? 'larga' : 'facil';
  return { kind, sess: s };
};
V.act.garmin = () => V.sheet('Importar de Garmin', '<p class="small">Garmin no deja conectarse directamente a una web como esta, así que el puente es un archivo. Se lee aquí mismo, sin subir nada a ningún sitio.</p>' +
  '<ol class="list"><li><span class="mono red">1</span><span class="grow">En Garmin Connect en el ordenador: <b>Actividades → Todas las actividades → Exportar CSV</b>. Trae las actividades que estén cargadas en la lista.</span></li>' +
  '<li><span class="mono red">2</span><span class="grow">O abre una actividad y, en la rueda de ajustes, <b>Exportar a TCX</b> o <b>a GPX</b>.</span></li>' +
  '<li><span class="mono red">3</span><span class="grow">Elige aquí el archivo. Las carreras que ya tengas apuntadas no se duplican: se completan.</span></li></ol>' +
  '<label class="f"><span>Archivo CSV, TCX o GPX</span><input type="file" id="garmin-file" accept=".csv,.tcx,.gpx,text/csv,application/xml,text/xml" data-chg="garminFile"></label>');
V.chg.garminFile = (d, el) => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => V.garminPreview(String(r.result)); r.readAsText(f); };
V.garminPreview = text => {
  const res = V.parseRunsFile(text);
  if (res.error) return V.toast(res.error);
  const fresh = res.runs.filter(x => !twin(x)), old = res.runs.length - fresh.length;
  V.ui.garmin = res.runs;
  V.sheet('Importar de Garmin', '<div class="grid3"><div class="stat"><b>' + fresh.length + '</b><span class="label">nuevas</span></div><div class="stat"><b>' + old + '</b><span class="label">ya apuntadas</span></div><div class="stat"><b>' + res.skipped + '</b><span class="label">no son carrera</span></div></div>' +
    (res.runs.length ? '<ul class="list">' + res.runs.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 40).map(x => '<li><span class="grow"><span class="t">' + V.n1(x.km) + ' km' + (x.sec ? ' en ' + V.hms(x.sec) + ' <span class="mono muted">· ' + V.pace(x.sec / x.km) + '/km</span>' : '') + '</span><span class="small muted">' + V.fdate(x.date) + (x.title ? ' · ' + esc(x.title) : '') + (x.hr ? ' · ' + x.hr + ' ppm' : '') + (x.extra ? ' · ' + esc(x.extra) : '') + '</span></span><span class="tag' + (twin(x) ? '' : ' ok') + '">' + (twin(x) ? 'Ya está' : 'Nueva') + '</span></li>').join('') + '</ul>' : '<p class="empty">No hay carreras en el archivo.</p>') +
    '<div class="actions"><button class="btn solid" type="button" data-act="garminDo"' + (res.runs.length ? '' : ' disabled') + '>Importar</button><button class="btn ghost" type="button" data-act="close">Cancelar</button></div>');
};
V.act.garminDo = () => {
  let add = 0, upd = 0;
  (V.ui.garmin || []).forEach(x => {
    const old = twin(x);
    if (old) { let ch = false; ['sec', 'hr', 'surface'].forEach(k => { if (!old[k] && x[k]) { old[k] = x[k]; ch = true; } }); if (ch) upd++; return; }
    const g = guess(x), r = { id: V.uid(), date: x.date, km: x.km, sec: x.sec, kind: g.kind, surface: x.surface, hr: x.hr, rpe: null, note: [x.title, x.extra].filter(Boolean).join(' · '), pain: {}, src: 'garmin' };
    V.S.runs.push(r); add++;
    if (g.sess) { g.sess.done = true; g.sess.runId = r.id; }
  });
  V.ui.garmin = null; V.close(); V.commit(add + (add === 1 ? ' carrera importada' : ' carreras importadas') + (upd ? ', ' + upd + ' completadas' : ''));
};
})();
