/* Vida · Entreno: plan, registro de carrera, fuerza, zona a vigilar y marcas. */
'use strict';
(() => {
const esc = V.esc;

/* ---------- Ritmos ---------- */
V.KINDS = {
  facil: { l: 'Rodaje fácil', i: 0 }, larga: { l: 'Tirada larga', i: 0 }, rectas: { l: 'Rodaje + rectas', i: .1 },
  fartlek: { l: 'Fartlek', i: .5 }, umbral: { l: 'Umbral', i: 1 }, series: { l: 'Series', i: 1 },
  especifico: { l: 'Ritmo objetivo', i: 1 }, test: { l: 'Test', i: 1 }, carrera: { l: 'Carrera', i: 1 }, montana: { l: 'Montaña', i: .5 }
};
V.DIST = [[5, '5 km'], [10, '10 km'], [15, '15 km'], [21.0975, 'Media'], [42.195, 'Maratón']];
V.riegel = (sec, k1, k2) => sec * Math.pow(k2 / k1, 1.06);
/* Zonas: se calculan desde la marca de referencia (p10 = ritmo equivalente de 10 km)
   y se pueden pisar a mano (running.manual) con los ritmos y potencias del plan del entrenador. */
V.ZONES = [['facil', 'Fácil', 'Rodajes. Conversación cómoda.'], ['larga', 'Tirada larga', 'Volumen sin prisa.'], ['umbral', 'Umbral', 'Exigente pero sostenible 20–30 min.'], ['diezk', 'Series', 'Repeticiones de 1 km o de 3 min.'], ['especifico', 'Ritmo objetivo', 'El ritmo de tu carrera.']];
V.zones = () => {
  const R = V.S.running, r = R.ref, g = R.goal, m = R.manual || {}, keys = Object.keys(m).filter(k => m[k] && m[k].lo);
  const obj = g && g.km && g.sec ? g.sec / g.km : null;
  let z = null;
  if (r && r.km && r.sec) {
    const p10 = V.riegel(r.sec, r.km, 10) / 10, act = g && g.km ? V.riegel(r.sec, r.km, g.km) / g.km : null;
    z = { p10, facil: [p10 + 60, p10 + 90], larga: [p10 + 50, p10 + 85], umbral: [p10 + 8, p10 + 20], diezk: [p10 - 3, p10 + 5], actual: act,
      especifico: obj ? (act && obj < act ? [obj, act] : [obj, obj]) : (act ? [act, act] : null) };
  }
  if (!z && !keys.length && !obj) return null;
  z = z || {};
  z.objetivo = obj ? [obj, obj] : null;
  if (!z.especifico) z.especifico = z.objetivo;
  z.notes = {}; z.manual = keys.length > 0;
  keys.forEach(k => { z[k] = [m[k].lo, m[k].hi || m[k].lo]; if (m[k].w) z.notes[k] = m[k].w; });
  return z;
};
V.zstr = z => (Math.round(z[0]) === Math.round(z[1]) ? V.pace(z[0]) : V.pace(z[0]) + '–' + V.pace(z[1])) + '/km';
const ZWORD = { facil: 'ritmo fácil', larga: 'ritmo de tirada larga', umbral: 'ritmo de umbral', diezk: 'ritmo de 10 km', especifico: 'ritmo objetivo', objetivo: 'ritmo objetivo' };
V.fill = text => { const z = V.zones(); return String(text || '').replace(/\{(\w+)\}/g, (m, k) => z && z[k] ? V.zstr(z[k]) + (z.notes[k] ? ' (' + z.notes[k] + ')' : '') : (ZWORD[k] || m)); };

/* ---------- Carga y zona a vigilar ---------- */
const ki = k => (V.KINDS[k] || V.KINDS.facil).i;
V.weekLoad = mon => {
  const S = V.S, end = V.add(mon, 6), runs = S.runs.filter(r => r.date >= mon && r.date <= end), ses = S.sessions.filter(s => s.date >= mon && s.date <= end);
  return {
    n: runs.length, km: V.sum(runs, r => r.km), int: V.sum(runs, r => r.km * ki(r.kind)), fz: S.strength.logs.filter(l => l.date >= mon && l.date <= end).length,
    pkm: V.sum(ses, s => s.type === 'run' ? s.km : 0), pint: V.sum(ses, s => s.type === 'run' ? (s.km || 0) * ki(s.kind) : 0), pfz: ses.filter(s => s.type === 'fuerza').length
  };
};
V.loadFor = mon => {
  const w = V.weekLoad(mon);
  return V.add(mon, 6) < V.today() ? { km: w.km, int: w.int, fz: w.fz } : { km: Math.max(w.km, w.pkm), int: Math.max(w.int, w.pint), fz: Math.max(w.fz, w.pfz) };
};
/* 0 sigue · 1 repite la semana · 2 para. Umbrales: 3 o más sobre 10 corriendo, molestia al día siguiente, o que dure 48 h. */
V.painLevel = r => {
  const p = r.pain || {}, v = k => p[k] == null ? 0 : p[k];
  if (v('h48') >= 1 || Math.max(v('d'), v('a'), v('h24')) >= 5) return 2;
  return Math.max(v('d'), v('a')) >= 3 || v('h24') >= 1 ? 1 : 0;
};
V.painBad = r => V.painLevel(r) > 0;
V.PAINMSG = ['', 'dio señal (3 o más sobre 10, o molestia al día siguiente): repite la semana y cambia la calidad por rodaje suave.', 'sigue molestando a las 48 h o dolió de verdad: para 2–3 días y vuelve a la semana anterior.'];
V.semaforo = mon => {
  const c = V.loadFor(mon), prev = [1, 2, 3].map(i => V.loadFor(V.add(mon, -7 * i))), p = { km: Math.max(...prev.map(x => x.km)), int: Math.max(...prev.map(x => x.int)), fz: Math.max(...prev.map(x => x.fz)) }, ups = [], zona = V.S.pain.label.toLowerCase();
  const pl = V.S.pain.on ? Math.max(0, ...V.S.runs.filter(r => r.date >= V.add(mon, -7) && r.date <= V.add(mon, 6)).map(V.painLevel)) : 0;
  const pmsg = pl ? ' La ' + zona + ' ' + V.PAINMSG[pl] : '';
  if (!(p.km || p.fz)) return { level: pl === 2 ? 'bad' : pl ? 'warn' : 'none', word: pl === 2 ? 'Para' : pl ? 'Ojo' : 'Sin referencia', ups, text: pl ? pmsg.trim() : 'Aún no hay semanas anteriores con las que comparar.' };
  if (c.km > p.km * 1.1 + 2) ups.push('volumen');
  if (c.int > p.int * 1.1 + 1) ups.push('intensidad');
  if (p.fz && c.fz > p.fz) ups.push('fuerza');
  const both = ups.includes('volumen') && ups.includes('intensidad');
  const level = pl === 2 || ups.length >= 3 ? 'bad' : both || ups.length === 2 || pl ? 'warn' : 'ok';
  const text = (ups.length === 0 ? 'No sube nada respecto a tus tres semanas anteriores.' : ups.length === 1 ? 'Solo sube ' + ups[0] + '. Una cosa cada vez.' : 'Suben a la vez ' + ups.join(', ').replace(/, ([^,]*)$/, ' y $1') + '. Deja una de ellas como estaba.') + pmsg;
  return { level, word: pl === 2 ? 'Para' : level === 'ok' ? 'En orden' : level === 'warn' ? 'Ojo' : 'Demasiado', ups, text };
};
V.painPending = () => {
  if (!V.S.pain.on) return [];
  const t = V.today(), out = [];
  V.S.runs.forEach(r => {
    const n = V.diff(t, r.date), p = r.pain || {};
    if (n < 1 || n > 5) return;
    if (p.h24 == null) out.push({ run: r, slot: 'h24' });
    else if (n >= 2 && p.h48 == null) out.push({ run: r, slot: 'h48' });
  });
  return out;
};

/* ---------- Generador de plan ---------- */
V.genPlan = o => {
  const S = V.S, g = S.running.goal, gk = g.km, z = V.zones(), p10 = z && z.p10 ? z.p10 : 330;
  const W = o.weeks, taper = W >= 10 ? 2 : 1, B = W - taper;
  const nBase = Math.max(2, Math.round(B * .3)), nSpec = Math.max(2, Math.round(B * .3)), nBuild = Math.max(1, B - nBase - nSpec);
  const peak = gk <= 10.5 ? 14 : gk <= 16 ? 18 : gk <= 22 ? 21 : 30;
  const d = o.days, out = [], tA = S.strength.templates[0], tB = S.strength.templates[1] || tA;
  const add = (w, day, s) => { if (day === '' || day == null) return; out.push(Object.assign({ id: V.uid(), date: V.add(o.start, w * 7 + Number(day)), type: 'run', gen: true, done: false }, s)); };
  const wk = (min, pace) => min * 60 / pace, cl = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));
  let long = o.long0, cat = 'base', hold = false, tested = false, iBase = 0, iBuild = 0, iSpec = 0;
  for (let w = 0; w < W; w++) {
    const race = w === W - 1, tap = w >= B, down = !tap && (w + 1) % 4 === 0;
    const c = w < nBase ? 'base' : w < nBase + nBuild ? 'build' : 'spec';
    if (c !== cat) { cat = c; hold = true; }                 // al cambiar de tipo de intensidad, el volumen no sube
    let L;
    if (race) L = 0;
    else if (tap) L = Math.round(long * .65);
    else if (down) L = Math.round(long * .75);
    else { if (w > 0 && !hold) long = Math.min(peak, long + 1.5); hold = false; L = Math.round(long); }

    let q;
    if (race) q = { kind: 'rectas', title: 'Activación', km: 5, detail: '4 km a {facil} y 4×1 min a {especifico} con 1 min suave. Piernas frescas.' };
    else if (tap) { const b = Math.max(2, Math.round(gk * .14)); q = { kind: 'especifico', title: '2×' + b + ' km a ritmo objetivo', km: Math.round(3.5 + 2 * b), detail: 'Calienta 2 km. 2×' + b + ' km a {especifico}, recuperando 3 min. Suelta 1,5 km.' }; }
    else if (down && !tested && w >= nBase - 1) { tested = true; q = { kind: 'test', title: 'Test de 5 km', km: 8, detail: 'Calienta 2 km y 3 rectas. 5 km fuertes y regulares. Suelta 1 km. Apunta la marca y úsala como referencia: los ritmos del plan se recalculan solos.' }; }
    else if (down) q = { kind: 'rectas', title: 'Rodaje + rectas', km: 6, detail: '6 km a {facil} y 4 rectas de 20 s alegres, sin esprintar.' };
    else if (c === 'base') {
      const k = cl(L * .5, 5, 8), i = iBase++;
      if (i < 2) { const n = i ? 6 : 4; q = { kind: 'rectas', title: 'Rodaje + ' + n + ' rectas', km: k, detail: k + ' km a {facil} y ' + n + ' rectas de 20 s alegres al final, recuperando andando. Primer contacto con la velocidad.' }; }
      else { const n = Math.min(10, 6 + 2 * (i - 2)); q = { kind: 'fartlek', title: 'Fartlek ' + n + '×1 min', km: Math.round(3.5 + n * 180 / (p10 + 40)), detail: 'Calienta 2 km. ' + n + '×1 min alegre (cerca de {diezk}) con 2 min suaves. Suelta 1,5 km.' }; }
    } else if (c === 'build') {
      q = [
        { kind: 'umbral', title: 'Umbral 3×8 min', km: Math.round(4 + wk(24, p10 + 14)), detail: 'Calienta 2 km. 3×8 min a {umbral}, recuperando 2 min al trote. Suelta 1,5 km. Exigente pero controlado.' },
        { kind: 'series', title: 'Series 5×3 min', km: Math.round(4.5 + wk(15, p10)), detail: 'Calienta 2 km y 3 rectas. 5×3 min a {diezk}, recuperando 2 min. Suelta 1,5 km.' },
        { kind: 'umbral', title: 'Umbral 2×15 min', km: Math.round(4 + wk(30, p10 + 14)), detail: 'Calienta 2 km. 2×15 min a {umbral}, recuperando 3 min. Suelta 1,5 km.' },
        { kind: 'series', title: 'Series 6×3 min', km: Math.round(4.5 + wk(18, p10)), detail: 'Calienta 2 km y 3 rectas. 6×3 min a {diezk}, recuperando 2 min. Suelta 1,5 km.' },
        { kind: 'umbral', title: 'Umbral 25 min seguidos', km: Math.round(3.5 + wk(25, p10 + 14)), detail: 'Calienta 2 km. 25 min seguidos a {umbral}. Suelta 1,5 km.' }
      ][iBuild++ % 5];
    } else {
      const i = Math.min(iSpec++, 2), tot = Math.round(gk * [.4, .47, .55][i]), b = Math.round(tot / (3 - i));
      q = { kind: 'especifico', km: Math.round(3.5 + tot), title: i === 2 ? tot + ' km a ritmo objetivo' : (3 - i) + '×' + b + ' km a ritmo objetivo',
        detail: 'Calienta 2 km. ' + (i === 2 ? tot + ' km seguidos a {especifico}' : (3 - i) + '×' + b + ' km a {especifico}, recuperando ' + (3 + i) + ' min') + '. Suelta 1,5 km.' };
    }
    const fz = tap ? 'Carga ligera, RIR 3. Nada que deje agujetas.' : down ? 'Semana de descarga: una serie menos por ejercicio.' : 'RIR 2–3, sin llegar al fallo.';
    add(w, d.fa, { type: 'fuerza', title: tA ? tA.name : 'Fuerza A', tid: tA ? tA.id : null, detail: fz });
    add(w, d.cal, q);
    add(w, d.fac, { kind: 'facil', title: 'Rodaje fácil', km: race ? 5 : cl(L * .5, 5, 10), detail: (race ? 5 : cl(L * .5, 5, 10)) + ' km a {facil}.' });
    if (!race) add(w, d.ext, { kind: 'facil', title: 'Rodaje corto', km: cl(L * .35, 4, 7), detail: cl(L * .35, 4, 7) + ' km a {facil}, muy suave.' });
    if (!race) add(w, d.fb, { type: 'fuerza', title: tB ? tB.name : 'Fuerza B', tid: tB ? tB.id : null, detail: fz });
    if (race) add(w, d.lar, { kind: 'carrera', title: g.name || 'Carrera objetivo', km: Math.round(gk * 10) / 10, detail: (g.sec ? 'Objetivo ' + V.hms(g.sec) + ', a {objetivo}. ' : '') + 'Sal con margen los primeros kilómetros.' });
    else add(w, d.lar, { kind: 'larga', title: 'Tirada larga', km: L, detail: tap ? L + ' km a {larga}, sin apretar.' : c === 'spec' && !down ? L + ' km a {larga}; los últimos ' + cl(L * .25, 2, 5) + ' km a {especifico} si todo va bien.' : L + ' km a {larga}. Cómodo, pudiendo hablar.' });
  }
  const labels = [];
  for (let w = 0; w < W; w++) labels.push((w === W - 1 ? 'Semana de carrera' : w >= B ? 'Afinado' : w < nBase ? 'Base' : w < nBase + nBuild ? 'Construcción' : 'Específico') + (w < B && (w + 1) % 4 === 0 ? ' · descarga' : ''));
  return { sessions: out.sort((a, b) => a.date < b.date ? -1 : 1), meta: { start: o.start, weeks: W, labels, days: d, long0: o.long0 } };
};
V.phase = mon => {
  const p = V.S.running.plan;
  if (!p) return null;
  const i = Math.round(V.diff(mon, p.start) / 7);
  return i < 0 || i >= p.weeks ? null : { i, n: p.weeks, name: (p.labels && p.labels[i]) || '' };
};

/* ---------- Vista ---------- */
V.views.entreno = (sub, arg) => {
  sub = sub || 'plan';
  const tabs = [['plan', 'Plan'], ['carrera', 'Carrera'], ['fuerza', 'Fuerza'], ['marcas', 'Marcas y ritmos']];
  if (V.S.pain.on) tabs.splice(3, 0, ['zona', esc(V.S.pain.label)]);
  const body = { plan: vPlan, carrera: vRuns, fuerza: vStrength, zona: vZone, marcas: vMarks }[sub] || vPlan;
  return '<h1>Entreno</h1>' + V.subnav('entreno', sub, tabs) + body(arg);
};

const sessHtml = s => {
  const isRun = s.type === 'run';
  return '<div class="sess' + (s.done ? ' done' : '') + '">' +
    '<input class="check" type="checkbox" data-act="sessToggle" data-id="' + s.id + '"' + (s.done ? ' checked' : '') + ' aria-label="Hecha: ' + esc(s.title) + '">' +
    '<div class="grow"><span class="t">' + esc(s.title) + (isRun && s.km && !s.title.includes(V.n1(s.km) + ' km') ? ' <span class="mono muted">· ' + V.n1(s.km) + ' km</span>' : '') + '</span>' +
    (s.detail ? '<span class="small muted">' + esc(V.fill(s.detail)) + '</span>' : '') +
    '<div class="actions" style="margin-top:6px">' + (s.done && (s.runId || s.logId) ? '' : '<button class="btn small" type="button" data-act="sessLog" data-id="' + s.id + '">Registrar</button>') +
    '<button class="btn small ghost" type="button" data-act="sessEdit" data-id="' + s.id + '">Editar</button></div></div></div>';
};
V.sessHtml = sessHtml;

const vPlan = arg => {
  const S = V.S, t = V.today();
  let mon = V.isDate(arg) ? V.monday(arg) : V.monday(t);
  if (!V.isDate(arg) && S.running.plan && t < S.running.plan.start) mon = S.running.plan.start;
  if (!S.sessions.length && !S.running.plan) return '<section class="card frame"><h2>Aún no hay plan</h2><p>Genera un bloque hacia tu carrera objetivo a partir de tu última marca. Lo puedes editar sesión a sesión, o cargar a mano lo que te mande tu entrenador.</p>' +
    '<div class="actions"><button class="btn solid" type="button" data-act="planForm">Generar plan</button><button class="btn" type="button" data-act="sessNew" data-date="' + t + '">Añadir sesión suelta</button></div></section>' + rules();
  const ph = V.phase(mon), w = V.weekLoad(mon), sem = V.semaforo(mon);
  let h = '<section class="card"><div class="head"><div><p class="label">' + (ph ? 'Semana ' + (ph.i + 1) + ' de ' + ph.n + (ph.name ? ' · ' + esc(ph.name) : '') : 'Fuera del bloque') + '</p><h2>' + V.fdate(mon) + ' – ' + V.fdate(V.add(mon, 6)) + '</h2></div></div>' +
    '<div class="actions"><a class="btn small ghost" href="#/entreno/plan/' + V.add(mon, -7) + '">← Anterior</a>' + (mon !== V.monday(t) ? '<a class="btn small ghost" href="#/entreno/plan/' + V.monday(t) + '">Esta semana</a>' : '') + '<a class="btn small ghost" href="#/entreno/plan/' + V.add(mon, 7) + '">Siguiente →</a></div>' +
    '<div class="grid3"><div class="stat"><b>' + V.n1(w.pkm) + '</b><span class="label">km previstos</span></div><div class="stat"><b>' + V.n1(w.km) + '</b><span class="label">km hechos</span></div><div class="stat"><b>' + w.fz + '/' + w.pfz + '</b><span class="label">fuerza</span></div></div>' +
    V.meter(w.km, w.pkm || w.km || 1, true) +
    '<div class="row wrap"><span class="stamp ' + (sem.level === 'bad' ? '' : sem.level) + '">' + sem.word + '</span><p class="grow small">' + esc(sem.text) + '</p></div></section>';
  h += '<section class="card">';
  for (let i = 0; i < 7; i++) {
    const day = V.add(mon, i), ses = S.sessions.filter(s => s.date === day), extra = S.runs.filter(r => r.date === day && !ses.some(s => s.runId === r.id));
    h += '<div class="day' + (day === t ? ' today' : '') + '"><div class="head"><p class="label">' + V.fdate(day) + (day === t ? ' · hoy' : '') + '</p><button class="btn small ghost" type="button" data-act="sessNew" data-date="' + day + '" aria-label="Añadir sesión el ' + V.fdate(day) + '">+</button></div>' +
      (ses.length || extra.length ? '' : '<p class="small muted">Descanso</p>') + ses.map(sessHtml).join('') +
      extra.map(r => '<div class="sess done"><div class="grow"><span class="t">' + esc((V.KINDS[r.kind] || V.KINDS.facil).l) + ' <span class="mono muted">· ' + V.n1(r.km) + ' km</span></span><span class="small muted">Registrada fuera del plan</span></div></div>').join('') + '</div>';
  }
  h += '</section>' + rules() + '<section class="card quiet"><p class="small">El plan es una propuesta de partida. Tu entrenador y cómo respondas mandan: edita, mueve o borra lo que haga falta.</p>' +
    '<div class="actions"><button class="btn small" type="button" data-act="planForm">Generar o rehacer plan</button><button class="btn small ghost" type="button" data-act="report">Informe para mi entrenador</button></div></section>';
  return h;
};
const rules = () => {
  const r = V.S.running.rules || [];
  return '<section class="card"><div class="head"><h2>Mis reglas</h2><button class="btn small ghost" type="button" data-act="rulesForm">Editar</button></div>' +
    (r.length ? '<ol class="list">' + r.map((x, i) => '<li><span class="mono red">' + (i + 1) + '</span><span class="grow">' + esc(x) + '</span></li>').join('') + '</ol>' : '<p class="empty">Escribe aquí las normas que no te quieres saltar.</p>') + '</section>';
};

const painCells = r => {
  const p = r.pain || {}, c = (l, v) => '<div><span class="label">' + l + '</span><b>' + (v == null ? '–' : v) + '</b></div>';
  return '<div class="painrow">' + c('Durante', p.d) + c('Al acabar', p.a) + c('24 h', p.h24) + c('48 h', p.h48) + '</div>';
};
const runLi = r => '<li><a class="grow tap" href="#" data-act="runEdit" data-id="' + r.id + '"><span class="t">' + V.n1(r.km) + ' km' + (r.sec ? ' en ' + V.hms(r.sec) + ' <span class="mono muted">· ' + V.pace(r.sec / r.km) + '/km</span>' : '') + '</span>' +
  '<span class="small muted">' + V.fdate(r.date) + ' · ' + esc((V.KINDS[r.kind] || V.KINDS.facil).l) + (r.surface ? ' · ' + esc(r.surface) : '') + (r.note ? ' · ' + esc(r.note) : '') + '</span></a>' +
  (V.S.pain.on && V.painBad(r) ? '<span class="tag bad">' + esc(V.S.pain.label) + '</span>' : '') + '</li>';

const vRuns = () => {
  const S = V.S, t = V.today(), mon = V.monday(t), items = [];
  for (let i = 7; i >= 0; i--) { const m = V.add(mon, -7 * i), w = V.weekLoad(m), d = V.date(m); items.push({ l: d.getDate() + '/' + (d.getMonth() + 1), v: Math.round(w.km * 10) / 10, plan: w.pkm, hi: i === 0, tip: 'Semana del ' + V.fdate(m) + ': ' + V.n1(w.km) + ' km hechos' + (w.pkm ? ', ' + V.n1(w.pkm) + ' previstos' : '') }); }
  const runs = S.runs.slice().sort((a, b) => a.date < b.date ? 1 : -1), m4 = S.runs.filter(r => r.date > V.add(t, -28));
  return '<section class="card"><div class="head"><h2>Kilómetros por semana</h2><button class="btn small solid" type="button" data-act="runNew">Registrar</button></div>' +
    V.bars(items, { label: 'Kilómetros por semana, últimas 8', unit: 'km', hint: 'Barra: km hechos. Raya: km previstos. Toca para ver el dato.' }) +
    '<div class="grid3"><div class="stat"><b>' + V.n1(V.sum(m4, r => r.km)) + '</b><span class="label">km en 28 días</span></div><div class="stat"><b>' + m4.length + '</b><span class="label">salidas</span></div><div class="stat"><b>' + (m4.length ? V.n1(Math.max(...m4.map(r => r.km))) : '–') + '</b><span class="label">más larga</span></div></div></section>' +
    '<div class="actions"><button class="btn" type="button" data-act="garmin">Importar de Garmin</button></div><section class="card"><h2>Registro</h2>' + (runs.length ? '<ul class="list">' + runs.slice(0, 40).map(runLi).join('') + '</ul>' : '<p class="empty">Todavía no has registrado ninguna carrera.</p>') + '</section>';
};

const exLine = e => esc(e.n) + ' <span class="mono muted">' + esc(e.sets || '') + '×' + esc(e.reps || '') + (e.rir ? ' · RIR ' + esc(e.rir) : '') + '</span>';
const lastEx = name => {
  const logs = V.S.strength.logs.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  for (const l of logs) { const e = (l.ex || []).find(x => x.n === name); if (e && e.sets && e.sets.length) return { date: l.date, sets: e.sets }; }
  return null;
};
const setsTxt = sets => sets.map(s => (s.kg != null ? V.n1(s.kg) + ' kg×' : '') + (s.reps == null ? '?' : s.reps)).join(', ');
const vStrength = () => {
  const S = V.S, logs = S.strength.logs.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  return (S.strength.templates.length ? S.strength.templates.map(t => '<section class="card"><div class="head"><h2>' + esc(t.name) + '</h2><button class="btn small ghost" type="button" data-act="tplForm" data-id="' + t.id + '">Editar</button></div>' +
    '<ul class="list">' + t.ex.map(e => { const l = lastEx(e.n); return '<li><span class="grow"><span>' + exLine(e) + '</span>' + (l ? '<span class="small muted">Última (' + V.fdate(l.date) + '): ' + esc(setsTxt(l.sets)) + '</span>' : '') + '</span></li>'; }).join('') + '</ul>' +
    '<div class="actions"><button class="btn solid" type="button" data-act="fzNew" data-tid="' + t.id + '">Registrar sesión</button></div></section>').join('')
    : '<section class="card frame"><h2>Sin rutinas</h2><p>Crea tu primera rutina de fuerza: una línea por ejercicio.</p></section>') +
    '<div class="actions"><button class="btn" type="button" data-act="tplForm">Nueva rutina</button></div>' +
    '<section class="card"><h2>Sesiones hechas</h2>' + (logs.length ? '<ul class="list">' + logs.slice(0, 30).map(l => '<li><a class="grow tap" href="#" data-act="fzEdit" data-id="' + l.id + '"><span class="t">' + esc(l.name) + '</span><span class="small muted">' + V.fdate(l.date) + ' · ' + V.sum(l.ex || [], e => (e.sets || []).length) + ' series' + (l.note ? ' · ' + esc(l.note) : '') + '</span></a></li>').join('') + '</ul>' : '<p class="empty">Nada registrado todavía.</p>') + '</section>';
};

const vZone = () => {
  const S = V.S, runs = S.runs.slice().sort((a, b) => a.date < b.date ? 1 : -1), pend = V.painPending();
  const last = runs.slice(0, 12).reverse().map(r => { const p = r.pain || {}, v = Math.max(p.d || 0, p.a || 0, p.h24 || 0, p.h48 || 0), d = V.date(r.date); return { l: d.getDate() + '/' + (d.getMonth() + 1), v, hi: V.painBad(r), tip: V.fdate(r.date) + ', ' + V.n1(r.km) + ' km: máximo ' + v + ' de 10' }; });
  return '<section class="card"><div class="head"><h2>' + esc(S.pain.label) + '</h2><button class="btn small ghost" type="button" data-act="painForm">Ajustar</button></div>' +
    '<p class="small">Cada salida se valora cuatro veces: durante, al acabar, a las 24 h y a las 48 h. Lo que decide si subes carga es cómo responde después, no solo cómo va corriendo.</p>' +
    (pend.length ? '<ul class="list">' + pend.map(x => '<li><span class="grow"><span class="t">¿Cómo está a las ' + (x.slot === 'h24' ? '24' : '48') + ' h?</span><span class="small muted">' + V.n1(x.run.km) + ' km del ' + V.fdate(x.run.date) + '</span></span><button class="btn small solid" type="button" data-act="painAsk" data-id="' + x.run.id + '" data-slot="' + x.slot + '">Responder</button></li>').join('') + '</ul>' : '') + '</section>' +
    (last.length ? '<section class="card"><h2>Respuesta por salida</h2>' + V.bars(last, { label: 'Máximo de molestia por salida, de 0 a 10', h: 110, fmt: v => String(v), hint: 'Máximo de las cuatro valoraciones (0–10). En rojo, las que empeoraron después.' }) + '</section>' : '') +
    '<section class="card"><h2>Historial</h2>' + (runs.length ? '<ul class="list">' + runs.slice(0, 30).map(r => '<li><a class="grow tap" href="#" data-act="runEdit" data-id="' + r.id + '"><span class="t">' + V.fdate(r.date) + ' · ' + V.n1(r.km) + ' km</span>' + painCells(r) + '</a></li>').join('') + '</ul>' : '<p class="empty">Registra una carrera para empezar el seguimiento.</p>') + '</section>' +
    '<p class="small muted">Esto es un cuaderno de seguimiento, no un diagnóstico. Dolor que va a más, que te despierta o con pérdida de fuerza se consulta.</p>';
};

const vMarks = () => {
  const S = V.S, r = S.running.ref, g = S.running.goal, z = V.zones();
  let h = '<section class="card frame"><div class="head"><h2>Referencia y objetivo</h2><button class="btn small ghost" type="button" data-act="refForm">Editar</button></div>';
  if (r && r.km && r.sec) {
    h += '<div class="grid2"><div class="stat"><span class="label">Marca de referencia</span><b>' + V.hms(r.sec) + '</b><span class="small muted">' + V.n1(r.km) + ' km · ' + V.pace(r.sec / r.km) + '/km' + (r.date ? ' · ' + V.fdate(r.date) : '') + '</span></div>';
    if (g && g.km && g.sec) {
      const eq = V.riegel(r.sec, r.km, g.km), gap = eq - g.sec;
      h += '<div class="stat"><span class="label">Objetivo' + (g.name ? ' · ' + esc(g.name) : '') + '</span><b>' + V.hms(g.sec) + '</b><span class="small muted">' + V.pace(g.sec / g.km) + '/km' + (g.date ? ' · ' + V.fdate(g.date) + ' (' + (V.diff(g.date, V.today()) >= 0 ? 'faltan ' + V.diff(g.date, V.today()) + ' días' : 'pasada') + ')' : '') + '</span></div></div>' +
        '<p class="small">Tu referencia equivale hoy a <b class="mono">' + V.hms(eq) + '</b> en esa distancia. ' + (gap > 30 ? 'Faltan <b class="mono">' + V.hms(gap) + '</b> para el objetivo' + (z && z.manual ? ', pero es una cuenta orientativa: si esa carrera no fue a tope, se queda corta.' : ': los ritmos de trabajo salen de tu estado actual, no del objetivo.') : 'El objetivo ya está al alcance de tu marca de referencia.') + '</p>';
    } else h += '</div><p class="small muted">Añade una carrera objetivo para ver cuánto te falta.</p>';
  } else h += '<p>Pon una marca reciente (distancia y tiempo) y la app calcula tus ritmos de entrenamiento.</p>';
  h += '</section>';
  if (z) h += '<section class="card"><div class="head"><h2>Mis ritmos</h2><button class="btn small ghost" type="button" data-act="zonesForm">' + (z.manual ? 'Editar' : 'Poner a mano') + '</button></div><ul class="list">' +
    V.ZONES.filter(x => z[x[0]]).map(x => '<li><span class="grow"><span class="t">' + x[1] + '</span><span class="small muted">' + esc(z.notes[x[0]] || x[2]) + '</span></span><span class="mono">' + V.zstr(z[x[0]]) + '</span></li>').join('') + '</ul>' +
    '<p class="small muted">' + (z.manual ? 'Ritmos puestos a mano, los de tu plan. Los que dejes vacíos se calculan desde tu marca de referencia.' : 'Estimación con la fórmula de Riegel a partir de tu marca de referencia. Ajusta por sensaciones y actualiza la referencia cuando hagas un test.') + '</p></section>';
  if (r && r.km && r.sec) h += '<section class="card"><h2>Equivalencias</h2><ul class="list">' + V.DIST.map(d => { const x = V.riegel(r.sec, r.km, d[0]); return '<li><span class="grow t">' + d[1] + '</span><span class="mono">' + V.hms(x) + ' <span class="muted">· ' + V.pace(x / d[0]) + '/km</span></span></li>'; }).join('') + '</ul><p class="small muted">Sale de una sola carrera con la fórmula de Riegel. Si no la corriste a tope, se queda corta.</p></section>';
  const races = S.races.slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1), best = {};
  V.DIST.forEach(d => { const c = S.races.filter(x => x.sec && Math.abs(x.km - d[0]) / d[0] < .03).sort((a, b) => a.sec / a.km - b.sec / b.km)[0]; if (c) best[c.id] = d[1]; });
  h += '<section class="card"><div class="head"><h2>Marcas</h2><button class="btn small solid" type="button" data-act="raceForm">Añadir</button></div>' +
    (races.length ? '<ul class="list">' + races.map(x => '<li><a class="grow tap" href="#" data-act="raceForm" data-id="' + x.id + '"><span class="t">' + esc(x.name || V.n1(x.km) + ' km') + ' · ' + V.hms(x.sec) + '</span><span class="small muted">' + V.n1(x.km) + ' km · ' + V.pace(x.sec / x.km) + '/km · ' + V.fdate(x.date) + (x.note ? ' · ' + esc(x.note) : '') + '</span></a>' + (best[x.id] ? '<span class="tag on">Mejor ' + best[x.id] + '</span>' : '') + '</li>').join('') + '</ul>' : '<p class="empty">Apunta tus carreras para ver tus mejores marcas.</p>') + '</section>';
  const goals = S.goals.filter(x => x.area === 'Carrera');
  if (goals.length) h += '<section class="card"><h2>Escalera de objetivos</h2><ul class="list">' + goals.map(x => '<li class="' + (x.done ? 'done' : '') + '"><span class="grow"><span class="t">' + esc(x.text) + '</span>' + (x.note ? '<span class="small muted">' + esc(x.note) + '</span>' : '') + '</span>' + (x.done ? '<span class="tag ok">Hecho</span>' : '') + '</li>').join('') + '</ul><p class="small muted">Se editan en Yo → Objetivos.</p></section>';
  return h;
};

/* ---------- Formularios ---------- */
const kindOpts = Object.keys(V.KINDS).map(k => [k, V.KINDS[k].l]);
const SURF = [['', 'Sin indicar'], ['Cinta', 'Cinta'], ['Exterior llano', 'Exterior llano'], ['Exterior con cuestas', 'Exterior con cuestas'], ['Montaña', 'Montaña']];
V.runForm = (r, pre) => {
  r = r || {}; pre = pre || {};
  const p = r.pain || {}, on = V.S.pain.on, lab = esc(V.S.pain.label);
  V.sheet(r.id ? 'Editar carrera' : 'Registrar carrera', '<form data-form="run">' + V.hid('id', r.id) + V.hid('sid', pre.sid) +
    '<div class="grid2">' + V.f('Fecha', 'date', r.date || pre.date || V.today(), { type: 'date', req: 1 }) + V.sel('Tipo', 'kind', kindOpts, r.kind || pre.kind || 'facil') + '</div>' +
    '<div class="grid2">' + V.f('Kilómetros', 'km', r.km != null ? r.km : pre.km, { mode: 'decimal', req: 1, ph: '6,5' }) + V.f('Tiempo', 'time', r.sec ? V.hms(r.sec) : '', { ph: '42:10 o 1:25:30' }) + '</div>' +
    '<div class="grid3">' + V.sel('Superficie', 'surface', SURF, r.surface) + V.f('Pulso medio', 'hr', r.hr, { mode: 'numeric' }) + V.f('Esfuerzo 1–10', 'rpe', r.rpe, { mode: 'numeric' }) + '</div>' +
    (on ? V.scale(lab + ' durante (0 nada · 10 máximo)', 'pd', p.d) + V.scale(lab + ' al acabar', 'pa', p.a) + (r.id ? V.scale(lab + ' a las 24 h', 'p24', p.h24) + V.scale(lab + ' a las 48 h', 'p48', p.h48) : '<p class="small muted">Mañana y pasado la app te preguntará cómo sigue.</p>') : '') +
    V.ta('Notas', 'note', r.note, 2, 'Sensaciones, parciales, geles…') + V.submit('Guardar', r.id ? 'runDel' : null, r.id) + '</form>');
};
V.act.runNew = () => V.runForm();
V.act.runEdit = d => V.runForm(V.find(V.S.runs, d.id));
V.act.runDel = d => { if (!confirm('¿Borrar esta carrera?')) return; V.drop(V.S.runs, d.id); V.S.sessions.forEach(s => { if (s.runId === d.id) { s.runId = null; s.done = false; } }); V.close(); V.commit('Carrera borrada'); };
V.form.run = d => {
  const S = V.S, km = V.num(d.km);
  if (!km || km <= 0 || !V.isDate(d.date)) return V.toast('Pon la fecha y los kilómetros');
  const r = d.id ? V.find(S.runs, d.id) : { id: V.uid(), pain: {} }, g = k => d[k] == null || d[k] === '' ? null : Number(d[k]);
  Object.assign(r, { date: d.date, km, sec: V.sec(d.time), kind: d.kind, surface: d.surface, hr: V.num(d.hr), rpe: V.num(d.rpe), note: d.note.trim() });
  r.pain = Object.assign(r.pain || {}, { d: g('pd'), a: g('pa') });
  if (d.id) { if (d.p24 != null) r.pain.h24 = g('p24'); if (d.p48 != null) r.pain.h48 = g('p48'); }
  else S.runs.push(r);
  const s = d.sid && V.find(S.sessions, d.sid);
  if (s) { s.done = true; s.runId = r.id; }
  V.close();
  V.commit(r.sec ? 'Guardado: ' + V.pace(r.sec / r.km) + '/km' : 'Carrera guardada');
  if (!d.id && (r.kind === 'test' || r.kind === 'carrera') && r.sec) setTimeout(() => {
    if (confirm('¿Usar esta marca (' + V.n1(r.km) + ' km en ' + V.hms(r.sec) + ') como referencia para recalcular tus ritmos?')) { S.running.ref = { km: r.km, sec: r.sec, date: r.date }; V.commit('Ritmos recalculados'); }
  }, 50);
};

V.act.painAsk = d => {
  const r = V.find(V.S.runs, d.id);
  V.sheet(V.S.pain.label + ' a las ' + (d.slot === 'h24' ? '24' : '48') + ' h', '<p>' + V.n1(r.km) + ' km del ' + V.fdate(r.date) + '.</p><form data-form="pain">' + V.hid('id', r.id) + V.hid('slot', d.slot) + V.scale('0 nada · 10 máximo', 'v', null) + V.submit('Guardar') + '</form>');
};
V.form.pain = d => {
  if (d.v == null) return V.toast('Elige un número');
  const r = V.find(V.S.runs, d.id); r.pain = r.pain || {}; r.pain[d.slot] = Number(d.v);
  V.close(); V.commit(['Apuntado. Todo en orden', 'Apuntado. Toca repetir la semana', 'Apuntado. Toca parar 2–3 días'][V.painLevel(r)]);
};
V.act.painForm = () => V.sheet('Zona a vigilar', '<form data-form="painCfg">' + V.f('Nombre de la zona', 'label', V.S.pain.label, { req: 1, ph: 'Rodilla' }) +
  V.sel('Seguimiento', 'on', [['1', 'Activado'], ['0', 'Desactivado']], V.S.pain.on ? '1' : '0') + V.submit() + '</form>');
V.form.painCfg = d => { V.S.pain = { on: d.on === '1', label: d.label.trim() || 'Molestia' }; V.close(); V.commit('Guardado'); if (!V.S.pain.on) location.hash = '#/entreno/plan'; };

/* Sesiones del plan */
V.sessForm = (s, date) => {
  s = s || { type: 'run', kind: 'facil', date: date || V.today() };
  const tpl = [['', 'Sin rutina']].concat(V.S.strength.templates.map(t => [t.id, t.name]));
  V.sheet(s.id ? 'Editar sesión' : 'Nueva sesión', '<form data-form="sess">' + V.hid('id', s.id) +
    '<div class="grid2">' + V.f('Fecha', 'date', s.date, { type: 'date', req: 1 }) + V.sel('Qué es', 'type', [['run', 'Carrera'], ['fuerza', 'Fuerza'], ['otro', 'Otra cosa']], s.type) + '</div>' +
    V.f('Título', 'title', s.title, { req: 1, ph: 'Rodaje fácil' }) +
    '<div class="grid3">' + V.sel('Tipo de carrera', 'kind', kindOpts, s.kind || 'facil') + V.f('Km', 'km', s.km, { mode: 'decimal' }) + V.sel('Rutina de fuerza', 'tid', tpl, s.tid) + '</div>' +
    V.ta('Detalle', 'detail', s.detail, 3) + '<p class="small muted">Los ritmos se escriben solos si pones {facil}, {larga}, {umbral}, {diezk}, {especifico} u {objetivo}.</p>' +
    V.submit('Guardar', s.id ? 'sessDel' : null, s.id) + '</form>');
};
V.act.sessNew = d => V.sessForm(null, d.date);
V.act.sessEdit = d => V.sessForm(V.find(V.S.sessions, d.id));
V.act.sessDel = d => { V.drop(V.S.sessions, d.id); V.close(); V.commit('Sesión borrada'); };
V.act.sessToggle = (d, el) => { const s = V.find(V.S.sessions, d.id); s.done = el.checked; V.commit(); };
V.act.sessLog = d => {
  const s = V.find(V.S.sessions, d.id);
  if (s.type === 'run') V.runForm(null, { sid: s.id, date: s.date <= V.today() ? s.date : V.today(), km: s.km, kind: s.kind });
  else if (s.type === 'fuerza' && V.find(V.S.strength.templates, s.tid)) V.fzForm(null, s.tid, s);
  else { s.done = true; V.commit('Hecha'); }
};
V.form.sess = d => {
  if (!V.isDate(d.date) || !d.title.trim()) return V.toast('Pon fecha y título');
  const S = V.S, s = d.id ? V.find(S.sessions, d.id) : { id: V.uid(), done: false };
  Object.assign(s, { date: d.date, type: d.type, title: d.title.trim(), kind: d.type === 'run' ? d.kind : null, km: d.type === 'run' ? V.num(d.km) : null, tid: d.type === 'fuerza' ? d.tid || null : null, detail: d.detail.trim() });
  if (!d.id) S.sessions.push(s);
  V.close(); V.commit('Sesión guardada');
};

/* Plan */
const dayOpts = none => (none ? [['', 'Ninguno']] : []).concat(V.DIAS.map((x, i) => [i, x[0].toUpperCase() + x.slice(1)]));
V.act.planForm = () => {
  const S = V.S, g = S.running.goal || {}, r = S.running.ref || {}, p = S.running.plan || {}, d = p.days || { fa: 0, cal: 1, fac: 3, fb: 4, ext: '', lar: 6 };
  const start = p.start && p.start >= V.monday(V.today()) ? p.start : V.add(V.monday(V.today()), 7);
  V.sheet('Generar plan', '<form data-form="plan"><p class="small">Bloque progresivo: base con rectas, construcción con umbral y series, fase específica a ritmo objetivo y afinado. Cada cuatro semanas, descarga. Cuando entra un tipo nuevo de intensidad, el volumen no sube.</p>' +
    V.f('Carrera objetivo', 'gname', g.name, { ph: 'Media maratón' }) +
    '<div class="grid2">' + V.sel('Distancia', 'gkm', V.DIST.map(x => [x[0], x[1]]), g.km || 21.0975) + V.f('Tiempo objetivo', 'gtime', g.sec ? V.hms(g.sec) : '', { ph: '1:40:00' }) + '</div>' +
    '<div class="grid2">' + V.f('Marca reciente: km', 'rkm', r.km, { mode: 'decimal', ph: '10' }) + V.f('Marca reciente: tiempo', 'rtime', r.sec ? V.hms(r.sec) : '', { ph: '52:30' }) + '</div>' +
    '<div class="grid3">' + V.f('Empieza el lunes', 'start', start, { type: 'date', req: 1 }) + V.sel('Semanas', 'weeks', [8, 9, 10, 11, 12, 13, 14, 15, 16].map(n => [n, n + ' semanas']), p.weeks || 12) + V.f('Tirada larga actual (km)', 'long0', p.long0 || 10, { mode: 'decimal', req: 1 }) + '</div>' +
    '<div class="grid3">' + V.sel('Calidad', 'cal', dayOpts(), d.cal) + V.sel('Rodaje fácil', 'fac', dayOpts(), d.fac) + V.sel('Tirada larga', 'lar', dayOpts(), d.lar) + '</div>' +
    '<div class="grid3">' + V.sel('Rodaje extra', 'ext', dayOpts(1), d.ext) + V.sel('Fuerza A', 'fa', dayOpts(1), d.fa) + V.sel('Fuerza B', 'fb', dayOpts(1), d.fb) + '</div>' +
    '<p class="small muted">Rehacer el plan sustituye las sesiones generadas que aún no has hecho. Las que añadiste a mano y las ya hechas se quedan.</p>' + V.submit('Generar plan') + '</form>');
};
V.form.plan = d => {
  const S = V.S, gsec = V.sec(d.gtime), rkm = V.num(d.rkm), rsec = V.sec(d.rtime), long0 = V.num(d.long0);
  if (!V.isDate(d.start) || !long0) return V.toast('Revisa la fecha de inicio y la tirada larga');
  S.running.goal = Object.assign(S.running.goal || {}, { name: d.gname.trim() || 'Carrera objetivo', km: Number(d.gkm), sec: gsec });
  if (rkm && rsec) S.running.ref = Object.assign(S.running.ref || {}, { km: rkm, sec: rsec });
  const days = { cal: d.cal, fac: d.fac, lar: d.lar, ext: d.ext, fa: d.fa, fb: d.fb };
  const out = V.genPlan({ start: V.monday(d.start), weeks: Number(d.weeks), long0, days });
  S.sessions = S.sessions.filter(s => !s.gen || s.done).concat(out.sessions);
  S.running.plan = out.meta;
  S.running.goal.date = V.add(out.meta.start, (out.meta.weeks - 1) * 7 + Number(days.lar));
  V.close(); V.save(); location.hash = '#/entreno/plan/' + out.meta.start; V.render(false);
  V.toast('Plan de ' + out.meta.weeks + ' semanas generado');
};
V.act.rulesForm = () => V.sheet('Mis reglas', '<form data-form="rules">' + V.ta('Una regla por línea', 'rules', (V.S.running.rules || []).join('\n'), 8) + V.submit() + '</form>');
V.form.rules = d => { V.S.running.rules = d.rules.split('\n').map(x => x.trim()).filter(Boolean); V.close(); V.commit('Reglas guardadas'); };

/* Marcas */
V.act.refForm = () => {
  const r = V.S.running.ref || {}, g = V.S.running.goal || {};
  V.sheet('Referencia y objetivo', '<form data-form="ref"><h3>Marca de referencia</h3><div class="grid3">' + V.f('Km', 'rkm', r.km, { mode: 'decimal', ph: '10' }) + V.f('Tiempo', 'rtime', r.sec ? V.hms(r.sec) : '', { ph: '52:30' }) + V.f('Fecha', 'rdate', r.date, { type: 'date' }) + '</div>' +
    '<h3>Carrera objetivo</h3>' + V.f('Nombre', 'gname', g.name) + '<div class="grid3">' + V.sel('Distancia', 'gkm', V.DIST.map(x => [x[0], x[1]]), g.km || 21.0975) + V.f('Tiempo', 'gtime', g.sec ? V.hms(g.sec) : '', { ph: '1:40:00' }) + V.f('Fecha', 'gdate', g.date, { type: 'date' }) + '</div>' + V.submit() + '</form>');
};
V.form.ref = d => {
  const S = V.S, rkm = V.num(d.rkm), rsec = V.sec(d.rtime), gsec = V.sec(d.gtime);
  S.running.ref = rkm && rsec ? { km: rkm, sec: rsec, date: V.isDate(d.rdate) ? d.rdate : null } : null;
  S.running.goal = gsec || d.gname.trim() ? { name: d.gname.trim(), km: Number(d.gkm), sec: gsec, date: V.isDate(d.gdate) ? d.gdate : null } : null;
  V.close(); V.commit('Guardado');
};
const pz = t => { const q = String(t || '').split(/\s*[-–—]\s*/).map(x => V.sec(x)).filter(Boolean); return q.length ? { lo: Math.min(...q), hi: Math.max(...q) } : null; };
V.act.zonesForm = () => {
  const m = V.S.running.manual || {};
  V.sheet('Mis ritmos a mano', '<form data-form="zones"><p class="small">Escribe el ritmo o el rango por kilómetro (4:36 o 4:28-4:38) y, si quieres, una nota con la potencia o el pulso. Lo que dejes vacío se calcula solo.</p>' +
    V.ZONES.map(x => { const v = m[x[0]]; return '<div class="grid2">' + V.f(x[1], 'p_' + x[0], v ? (v.lo === v.hi ? V.pace(v.lo) : V.pace(v.lo) + '-' + V.pace(v.hi)) : '', { ph: 'min:s por km' }) + V.f('Nota', 'w_' + x[0], v && v.w, { ph: '< 300 W' }) + '</div>'; }).join('') + V.submit() + '</form>');
};
V.form.zones = d => {
  const m = {};
  V.ZONES.forEach(x => { const q = pz(d['p_' + x[0]]); if (q) m[x[0]] = Object.assign(q, { w: d['w_' + x[0]].trim() }); });
  V.S.running.manual = m; V.close(); V.commit('Ritmos guardados');
};
V.act.raceForm = d => {
  const x = (d.id && V.find(V.S.races, d.id)) || {};
  V.sheet(x.id ? 'Editar marca' : 'Nueva marca', '<form data-form="race">' + V.hid('id', x.id) + V.f('Carrera', 'name', x.name, { ph: 'Media Maratón de…' }) +
    '<div class="grid3">' + V.f('Km', 'km', x.km, { mode: 'decimal', req: 1 }) + V.f('Tiempo', 'time', x.sec ? V.hms(x.sec) : '', { req: 1, ph: '1:25:30' }) + V.f('Fecha', 'date', x.date, { type: 'date' }) + '</div>' +
    V.ta('Notas', 'note', x.note, 2) + '<div class="actions"><button class="btn solid" type="submit">Guardar</button>' + (x.id ? '<button class="btn" type="button" data-act="raceRef" data-id="' + x.id + '">Usar como referencia</button><button class="btn ghost" type="button" data-act="raceDel" data-id="' + x.id + '">Borrar</button>' : '') + '</div></form>');
};
V.form.race = d => {
  const km = V.num(d.km), sec = V.sec(d.time);
  if (!km || !sec) return V.toast('Pon kilómetros y tiempo');
  const x = d.id ? V.find(V.S.races, d.id) : { id: V.uid() };
  Object.assign(x, { name: d.name.trim(), km, sec, date: V.isDate(d.date) ? d.date : null, note: d.note.trim() });
  if (!d.id) V.S.races.push(x);
  V.close(); V.commit('Marca guardada');
};
V.act.raceDel = d => { V.drop(V.S.races, d.id); V.close(); V.commit('Marca borrada'); };
V.act.raceRef = d => { const x = V.find(V.S.races, d.id); V.S.running.ref = { km: x.km, sec: x.sec, date: x.date }; V.close(); V.commit('Ritmos recalculados con esta marca'); };

/* Fuerza */
V.act.tplForm = d => {
  const t = (d.id && V.find(V.S.strength.templates, d.id)) || { ex: [] };
  V.sheet(t.id ? 'Editar rutina' : 'Nueva rutina', '<form data-form="tpl">' + V.hid('id', t.id) + V.f('Nombre', 'name', t.name, { req: 1, ph: 'Fuerza A' }) +
    V.ta('Ejercicios, uno por línea: nombre | series | repeticiones | RIR', 'ex', t.ex.map(e => [e.n, e.sets, e.reps, e.rir].join(' | ')).join('\n'), 9, 'Hip thrust | 3 | 8-10 | 2-3') + V.submit('Guardar', t.id ? 'tplDel' : null, t.id) + '</form>');
};
V.form.tpl = d => {
  const ex = d.ex.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0]).map(p => ({ n: p[0], sets: p[1] || '3', reps: p[2] || '10', rir: p[3] || '' }));
  if (!d.name.trim() || !ex.length) return V.toast('Pon un nombre y al menos un ejercicio');
  const t = d.id ? V.find(V.S.strength.templates, d.id) : { id: V.uid() };
  Object.assign(t, { name: d.name.trim(), ex });
  if (!d.id) V.S.strength.templates.push(t);
  V.close(); V.commit('Rutina guardada');
};
V.act.tplDel = d => { if (!confirm('¿Borrar esta rutina? Las sesiones ya hechas se quedan.')) return; V.drop(V.S.strength.templates, d.id); V.close(); V.commit('Rutina borrada'); };
V.fzForm = (log, tid, sess) => {
  const t = log ? { name: log.name, ex: log.ex.map(e => ({ n: e.n, sets: e.sets.length })) } : V.find(V.S.strength.templates, tid);
  let h = '<form data-form="fz">' + V.hid('id', log && log.id) + V.hid('tid', tid) + V.hid('sid', sess && sess.id) + V.hid('name', t.name) +
    V.f('Fecha', 'date', log ? log.date : sess && sess.date <= V.today() ? sess.date : V.today(), { type: 'date', req: 1 });
  t.ex.forEach((e, i) => {
    const last = log ? null : lastEx(e.n), cur = log ? log.ex[i].sets : last ? last.sets : [], n = Math.max(1, Math.min(8, parseInt(e.sets, 10) || 3));
    h += '<fieldset><legend>' + esc(e.n) + (log ? '' : ' · ' + esc(e.sets + '×' + e.reps) + (e.rir ? ' · RIR ' + esc(e.rir) : '')) + '</legend>' + V.hid('e' + i + '_n', e.n) +
      (last ? '<p class="small muted">Última (' + V.fdate(last.date) + '): ' + esc(setsTxt(last.sets)) + '</p>' : '') +
      '<div class="sets"><span></span><span class="label">kg</span><span class="label">reps</span><span class="label">RIR</span>';
    for (let j = 0; j < n; j++) {
      const c = cur[j] || cur[cur.length - 1] || {}, a = (k, v, l) => '<input name="e' + i + '_s' + j + '_' + k + '" type="text" inputmode="decimal" value="' + esc(v == null ? '' : v) + '" aria-label="' + esc(e.n) + ', serie ' + (j + 1) + ', ' + l + '">';
      h += '<span class="mono muted">' + (j + 1) + '</span>' + a('kg', c.kg, 'kilos') + a('reps', log ? c.reps : '', 'repeticiones') + a('rir', log ? c.rir : '', 'RIR');
    }
    h += '</div></fieldset>';
  });
  V.sheet(log ? 'Editar sesión de fuerza' : t.name, h + V.ta('Notas', 'note', log && log.note, 2, 'Agujetas, sensaciones…') + V.submit('Guardar sesión', log ? 'fzDel' : null, log && log.id) + '</form>');
};
V.act.fzNew = d => V.fzForm(null, d.tid);
V.act.fzEdit = d => V.fzForm(V.find(V.S.strength.logs, d.id));
V.act.fzDel = d => { V.drop(V.S.strength.logs, d.id); V.S.sessions.forEach(s => { if (s.logId === d.id) { s.logId = null; s.done = false; } }); V.close(); V.commit('Sesión borrada'); };
V.form.fz = d => {
  if (!V.isDate(d.date)) return V.toast('Pon la fecha');
  const ex = [];
  for (let i = 0; d['e' + i + '_n'] != null; i++) {
    const sets = [];
    for (let j = 0; d['e' + i + '_s' + j + '_kg'] != null; j++) {
      const kg = V.num(d['e' + i + '_s' + j + '_kg']), reps = V.num(d['e' + i + '_s' + j + '_reps']), rir = V.num(d['e' + i + '_s' + j + '_rir']);
      if (reps != null || (kg != null && d.id)) sets.push({ kg, reps, rir });
    }
    if (sets.length) ex.push({ n: d['e' + i + '_n'], sets });
  }
  if (!ex.length) return V.toast('Apunta al menos las repeticiones de una serie');
  const S = V.S, l = d.id ? V.find(S.strength.logs, d.id) : { id: V.uid() };
  Object.assign(l, { date: d.date, tid: d.tid || l.tid || null, name: d.name, ex, note: d.note.trim() });
  if (!d.id) S.strength.logs.push(l);
  const s = d.sid && V.find(S.sessions, d.sid);
  if (s) { s.done = true; s.logId = l.id; }
  V.close(); V.commit('Fuerza guardada');
};

/* Informe para el entrenador */
V.report = () => {
  const S = V.S, t = V.today(), mon = V.monday(t), L = [], r = S.running.ref, g = S.running.goal;
  L.push('INFORME DE ENTRENAMIENTO · ' + V.fdate(t));
  if (r) L.push('Referencia: ' + V.n1(r.km) + ' km en ' + V.hms(r.sec) + ' (' + V.pace(r.sec / r.km) + '/km)');
  if (g && g.sec) L.push('Objetivo: ' + (g.name || '') + ' ' + V.hms(g.sec) + ' (' + V.pace(g.sec / g.km) + '/km)' + (g.date ? ', ' + V.fdate(g.date) : ''));
  for (let i = 3; i >= 0; i--) {
    const m = V.add(mon, -7 * i), w = V.weekLoad(m), end = V.add(m, 6);
    L.push('', 'Semana del ' + V.fdate(m) + ': ' + V.n1(w.km) + ' km en ' + w.n + ' salidas, ' + w.fz + ' de fuerza');
    S.runs.filter(x => x.date >= m && x.date <= end).sort((a, b) => a.date < b.date ? -1 : 1).forEach(x => {
      const p = x.pain || {}, q = v => v == null ? '–' : v;
      L.push('  ' + V.fdate(x.date) + ' · ' + (V.KINDS[x.kind] || V.KINDS.facil).l + ' · ' + V.n1(x.km) + ' km' + (x.sec ? ' en ' + V.hms(x.sec) + ' (' + V.pace(x.sec / x.km) + '/km)' : '') + (x.hr ? ' · ' + x.hr + ' ppm' : '') + (x.rpe ? ' · RPE ' + x.rpe : '') +
        (S.pain.on ? ' · ' + S.pain.label + ' durante/acabar/24h/48h: ' + [p.d, p.a, p.h24, p.h48].map(q).join('/') : '') + (x.note ? ' · ' + x.note : ''));
    });
    S.strength.logs.filter(x => x.date >= m && x.date <= end).forEach(x => L.push('  ' + V.fdate(x.date) + ' · ' + x.name + ': ' + x.ex.map(e => e.n + ' ' + setsTxt(e.sets)).join('; ') + (x.note ? ' · ' + x.note : '')));
  }
  const d7 = Object.keys(S.daily).filter(k => k > V.add(t, -14)).map(k => S.daily[k]), sl = V.avg(d7.map(x => x.sleep).filter(x => x != null)), hr = V.avg(d7.map(x => x.rhr).filter(x => x != null));
  if (sl != null || hr != null) L.push('', 'Últimos 14 días: ' + (sl != null ? 'sueño medio ' + V.n1(sl) + ' h' : '') + (sl != null && hr != null ? ', ' : '') + (hr != null ? 'pulso en reposo medio ' + Math.round(hr) + ' ppm' : ''));
  return L.join('\n');
};
V.act.report = () => V.sheet('Informe para mi entrenador', '<p class="small">Últimas cuatro semanas, listo para pegar en un mensaje.</p><textarea rows="16" readonly id="report-t">' + esc(V.report()) + '</textarea><div class="actions"><button class="btn solid" type="button" data-act="reportCopy">Copiar</button></div>');
V.act.reportCopy = () => V.copy(V.report(), 'Informe copiado');
})();
