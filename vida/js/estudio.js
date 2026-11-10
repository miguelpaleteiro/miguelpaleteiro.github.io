/* Vida · Estudio: cronómetro, temario con repasos espaciados y exámenes. */
'use strict';
(() => {
const esc = V.esc;
const GAP = [1, 7, 21, 45];                 // días hasta el siguiente repaso tras cada vuelta
const st = () => V.S.study;
const subj = id => V.find(st().subjects, id);
const sname = id => (subj(id) || { name: 'Sin asignatura' }).name;

V.topicDue = t => t.r >= 1 && t.last ? V.add(t.last, GAP[Math.min(t.r, GAP.length) - 1]) : null;
V.reviewsDue = () => { const t = V.today(); return st().topics.filter(x => { const d = V.topicDue(x); return d && d <= t; }).sort((a, b) => V.topicDue(a) < V.topicDue(b) ? -1 : 1); };
V.studyMin = (from, to, sid) => V.sum(st().log.filter(l => l.date >= from && l.date <= to && (!sid || l.sid === sid)), l => l.min);
V.nextExam = () => { const t = V.today(); return st().exams.filter(e => e.date >= t).sort((a, b) => a.date < b.date ? -1 : 1)[0]; };
V.timerSec = () => { const t = st().timer; return t ? t.acc + (t.t0 ? (Date.now() - t.t0) / 1000 : 0) : 0; };

V.timerCard = () => {
  const t = st().timer, subs = st().subjects;
  if (t) return '<section class="card frame"><p class="label">' + esc(sname(t.sid)) + (t.goal ? ' · bloque de ' + t.goal + ' min' : ' · sin límite') + '</p>' +
    '<p class="big" id="timer-clock" aria-live="off">' + V.hms(V.timerSec()) + '</p>' + (t.goal ? '<div id="timer-meter">' + V.meter(V.timerSec() / 60, t.goal, true) + '</div>' : '') +
    '<div class="actions"><button class="btn" type="button" data-act="' + (t.t0 ? 'timerPause">Pausar' : 'timerResume">Seguir') + '</button><button class="btn solid" type="button" data-act="timerStop">Terminar y apuntar</button></div></section>';
  return '<form class="card" data-form="timer"><h2>Bloque de estudio</h2><div class="grid2">' + V.sel('Asignatura', 'sid', [['', 'Sin asignatura']].concat(subs.map(s => [s.id, s.name])), V.ui.lastSid) +
    V.sel('Duración', 'goal', [[25, '25 min'], [50, '50 min'], [90, '90 min'], [0, 'Sin límite']], V.ui.lastGoal == null ? 50 : V.ui.lastGoal) + '</div>' +
    '<div class="actions"><button class="btn solid" type="submit">Empezar</button><button class="btn ghost" type="button" data-act="studyAdd">Apuntar minutos a mano</button></div></form>';
};

V.views.estudio = sub => {
  sub = sub || 'sesion';
  const body = { sesion: vSession, temario: vTopics, examenes: vExams }[sub] || vSession;
  return '<h1>Estudio</h1>' + V.subnav('estudio', sub, [['sesion', 'Sesión'], ['temario', 'Temario'], ['examenes', 'Exámenes']]) + body();
};

const dueLi = x => '<li><span class="grow"><span class="t">' + esc(x.n) + '</span><span class="small muted">' + esc(sname(x.sid)) + ' · vuelta ' + x.r + ' · tocaba ' + V.rel(V.topicDue(x)) + '</span></span><button class="btn small solid" type="button" data-act="topicDone" data-id="' + x.id + '">Repasado</button></li>';
V.dueLi = dueLi;
const vSession = () => {
  const t = V.today(), mon = V.monday(t), days = [], due = V.reviewsDue(), ex = V.nextExam();
  for (let i = 6; i >= 0; i--) { const d = V.add(t, -i); days.push({ l: V.DIAS3[V.dow(d)], v: V.studyMin(d, d), hi: i === 0, tip: V.fdate(d) + ': ' + V.hm(V.studyMin(d, d)) }); }
  const wk = V.studyMin(mon, V.add(mon, 6)), per = st().subjects.map(s => [s.name, V.studyMin(mon, V.add(mon, 6), s.id)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  return V.timerCard() +
    '<section class="card"><div class="head"><h2>Repasos de hoy</h2><span class="tag' + (due.length ? ' bad' : ' ok') + '">' + due.length + '</span></div>' + (due.length ? '<ul class="list">' + due.slice(0, 12).map(dueLi).join('') + '</ul>' : '<p class="empty">Nada pendiente. Los temas vuelven solos al día, a la semana, a las tres semanas y al mes y medio.</p>') + '</section>' +
    '<section class="card"><h2>Últimos 7 días</h2>' + V.bars(days, { label: 'Minutos de estudio por día', h: 100, fmt: v => String(Math.round(v)), unit: 'min' }) +
    '<div class="grid3"><div class="stat"><b>' + V.hm(V.studyMin(t, t)) + '</b><span class="label">hoy</span></div><div class="stat"><b>' + V.hm(wk) + '</b><span class="label">esta semana</span></div><div class="stat"><b>' + (ex ? V.diff(ex.date, t) + ' d' : '–') + '</b><span class="label">' + (ex ? esc(ex.name || sname(ex.sid)) : 'sin examen') + '</span></div></div>' +
    (per.length ? '<ul class="list">' + per.map(x => '<li><span class="grow"><span class="t">' + esc(x[0]) + '</span>' + V.meter(x[1], per[0][1]) + '</span><span class="mono">' + V.hm(x[1]) + '</span></li>').join('') + '</ul>' : '') + '</section>';
};

const dots = r => '<span class="mono" aria-label="' + r + ' de 4 vueltas">' + '●'.repeat(Math.min(r, 4)) + '○'.repeat(4 - Math.min(r, 4)) + '</span>';
const vTopics = () => {
  const s = st(), t = V.today();
  return (s.subjects.length ? s.subjects.map(su => {
    const tp = s.topics.filter(x => x.sid === su.id), seen = tp.filter(x => x.r >= 1).length, ex = s.exams.filter(e => e.sid === su.id && e.date >= t).sort((a, b) => a.date < b.date ? -1 : 1)[0];
    return '<section class="card"><div class="head"><h2>' + esc(su.name) + '</h2><button class="btn small ghost" type="button" data-act="subjForm" data-id="' + su.id + '">Editar</button></div>' +
      '<p class="small muted">' + seen + ' de ' + tp.length + ' temas con primera vuelta' + (ex ? ' · examen en ' + V.diff(ex.date, t) + ' días' : '') + '</p>' + (tp.length ? V.meter(seen, tp.length, true) : '') +
      (tp.length ? '<ul class="list">' + tp.map(x => { const d = V.topicDue(x); return '<li><a class="grow tap" href="#" data-act="topicForm" data-id="' + x.id + '"><span class="t">' + esc(x.n) + '</span><span class="small muted">' + dots(x.r) + (d ? ' · repaso ' + V.rel(d) : ' · sin empezar') + '</span></a><button class="btn small" type="button" data-act="topicDone" data-id="' + x.id + '" aria-label="Vuelta hecha: ' + esc(x.n) + '">+1</button></li>'; }).join('') + '</ul>' : '<p class="empty">Añade los temas con Editar: uno por línea.</p>') + '</section>';
  }).join('') : '<section class="card frame"><h2>Sin asignaturas</h2><p>Crea tus asignaturas y pega el temario. Cada tema que marques volverá a aparecer cuando toque repasarlo.</p></section>') +
    '<div class="actions"><button class="btn" type="button" data-act="subjForm">Nueva asignatura</button></div>';
};

const vExams = () => {
  const t = V.today(), ex = st().exams.slice().sort((a, b) => a.date < b.date ? -1 : 1), next = ex.filter(e => e.date >= t), past = ex.filter(e => e.date < t).reverse();
  const li = e => '<li><a class="grow tap" href="#" data-act="examForm" data-id="' + e.id + '"><span class="t">' + esc(e.name || sname(e.sid)) + '</span><span class="small muted">' + esc(sname(e.sid)) + ' · ' + V.fdate(e.date) + '</span></a>' + (e.date >= t ? '<span class="stat"><b>' + V.diff(e.date, t) + '</b><span class="label">días</span></span>' : '') + '</li>';
  return '<section class="card"><div class="head"><h2>Próximos</h2><button class="btn small solid" type="button" data-act="examForm">Añadir</button></div>' + (next.length ? '<ul class="list">' + next.map(li).join('') + '</ul>' : '<p class="empty">No hay exámenes apuntados.</p>') + '</section>' +
    (past.length ? '<section class="card"><h2>Pasados</h2><ul class="list">' + past.slice(0, 10).map(li).join('') + '</ul></section>' : '');
};

/* ---------- Cronómetro ---------- */
V.form.timer = d => { V.ui.lastSid = d.sid; V.ui.lastGoal = Number(d.goal); st().timer = { sid: d.sid || null, t0: Date.now(), acc: 0, goal: Number(d.goal) || 0, rang: false }; V.commit('Empieza el bloque'); };
V.act.timerPause = () => { const t = st().timer; t.acc = V.timerSec(); t.t0 = null; V.commit(); };
V.act.timerResume = () => { st().timer.t0 = Date.now(); V.commit(); };
V.act.timerStop = () => {
  const t = st().timer, min = Math.round(V.timerSec() / 60);
  if (min >= 1) st().log.push({ id: V.uid(), date: V.today(), sid: t.sid, min });
  st().timer = null;
  V.commit(min >= 1 ? V.hm(min) + ' apuntados' : 'Menos de un minuto: no se apunta');
};
V.tick = () => {
  const t = st().timer;
  if (!t || !t.t0) return;
  const el = V.$('#timer-clock'), sec = V.timerSec();
  if (el) el.textContent = V.hms(sec);
  const m = V.$('#timer-meter'); if (m && t.goal) m.innerHTML = V.meter(sec / 60, t.goal, true);
  if (t.goal && !t.rang && sec >= t.goal * 60) { t.rang = true; V.save(); V.toast('Bloque de ' + t.goal + ' min completado. Levántate y muévete un poco.'); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
};
setInterval(() => V.S && V.tick(), 1000);

V.act.studyAdd = () => V.sheet('Apuntar estudio', '<form data-form="studyAdd"><div class="grid3">' + V.sel('Asignatura', 'sid', [['', 'Sin asignatura']].concat(st().subjects.map(s => [s.id, s.name]))) + V.f('Minutos', 'min', '', { mode: 'numeric', req: 1 }) + V.f('Fecha', 'date', V.today(), { type: 'date', req: 1 }) + '</div>' + V.submit('Apuntar') + '</form>');
V.form.studyAdd = d => { const min = V.num(d.min); if (!min || min <= 0 || !V.isDate(d.date)) return V.toast('Pon los minutos'); st().log.push({ id: V.uid(), date: d.date, sid: d.sid || null, min: Math.round(min) }); V.close(); V.commit(V.hm(min) + ' apuntados'); };

/* ---------- Asignaturas, temas y exámenes ---------- */
V.act.subjForm = d => {
  const s = (d.id && subj(d.id)) || {};
  V.sheet(s.id ? 'Editar asignatura' : 'Nueva asignatura', '<form data-form="subj">' + V.hid('id', s.id) + V.f('Nombre', 'name', s.name, { req: 1 }) +
    V.ta('Añadir temas, uno por línea', 'topics', '', 6, 'Tema 1 · …') + V.submit('Guardar', s.id ? 'subjDel' : null, s.id) + '</form>');
};
V.form.subj = d => {
  if (!d.name.trim()) return V.toast('Ponle un nombre');
  const s = d.id ? subj(d.id) : { id: V.uid() };
  s.name = d.name.trim();
  if (!d.id) st().subjects.push(s);
  d.topics.split('\n').map(x => x.trim()).filter(Boolean).forEach(n => st().topics.push({ id: V.uid(), sid: s.id, n, r: 0, last: null }));
  V.close(); V.commit('Asignatura guardada');
};
V.act.subjDel = d => {
  if (!confirm('¿Borrar la asignatura con sus temas y exámenes? El tiempo estudiado se conserva.')) return;
  const s = st(); V.drop(s.subjects, d.id); s.topics = s.topics.filter(x => x.sid !== d.id); s.exams = s.exams.filter(x => x.sid !== d.id);
  V.close(); V.commit('Asignatura borrada');
};
V.act.topicDone = d => { const x = V.find(st().topics, d.id); x.r = Math.min(4, (x.r || 0) + 1); x.last = V.today(); V.commit('Vuelta ' + x.r + '. Próximo repaso: ' + V.rel(V.topicDue(x))); };
V.act.topicForm = d => { const x = V.find(st().topics, d.id); V.sheet('Tema', '<form data-form="topic">' + V.hid('id', x.id) + V.f('Nombre', 'n', x.n, { req: 1 }) + '<div class="grid2">' + V.sel('Vueltas hechas', 'r', [0, 1, 2, 3, 4].map(n => [n, String(n)]), x.r) + V.f('Última vez', 'last', x.last, { type: 'date' }) + '</div>' + V.submit('Guardar', 'topicDel', x.id) + '</form>'); };
V.form.topic = d => { const x = V.find(st().topics, d.id); Object.assign(x, { n: d.n.trim() || x.n, r: Number(d.r), last: V.isDate(d.last) ? d.last : Number(d.r) ? x.last || V.today() : null }); V.close(); V.commit('Tema guardado'); };
V.act.topicDel = d => { V.drop(st().topics, d.id); V.close(); V.commit('Tema borrado'); };
V.act.examForm = d => {
  const e = (d.id && V.find(st().exams, d.id)) || {};
  V.sheet(e.id ? 'Editar examen' : 'Nuevo examen', '<form data-form="exam">' + V.hid('id', e.id) + V.f('Nombre', 'name', e.name, { ph: 'Parcial, final, ECOE…' }) +
    '<div class="grid2">' + V.sel('Asignatura', 'sid', [['', 'Sin asignatura']].concat(st().subjects.map(s => [s.id, s.name])), e.sid) + V.f('Fecha', 'date', e.date, { type: 'date', req: 1 }) + '</div>' + V.submit('Guardar', e.id ? 'examDel' : null, e.id) + '</form>');
};
V.form.exam = d => {
  if (!V.isDate(d.date)) return V.toast('Pon la fecha');
  const e = d.id ? V.find(st().exams, d.id) : { id: V.uid() };
  Object.assign(e, { name: d.name.trim(), sid: d.sid || null, date: d.date });
  if (!d.id) st().exams.push(e);
  V.close(); V.commit('Examen guardado');
};
V.act.examDel = d => { V.drop(st().exams, d.id); V.close(); V.commit('Examen borrado'); };
})();
