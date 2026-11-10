/* Vida · Yo: chequeo diario y tendencias, hábitos, objetivos, revisión semanal y datos. */
'use strict';
(() => {
const esc = V.esc;
V.AREAS = ['Carrera', 'Fuerza', 'Contenido', 'Estudio', 'Vida'];

/* ---------- Chequeo y disposición ---------- */
const series = (k, days, end) => { const out = []; for (let i = days - 1; i >= 0; i--) { const d = V.S.daily[V.add(end || V.today(), -i)]; out.push(d && d[k] != null ? d[k] : null); } return out; };
const mean = a => V.avg(a.filter(x => x != null));
V.series = series;
/* Compara los últimos 3 días con las 3 semanas anteriores: cuenta la tendencia, no un día suelto. */
V.ready = () => {
  const t = V.today(), d = V.S.daily[t];
  if (!d) return null;
  const flags = [], now = k => mean(series(k, 3)), base = k => mean(series(k, 21, V.add(t, -3))), n = k => series(k, 21, V.add(t, -3)).filter(x => x != null).length;
  if (n('rhr') >= 5 && now('rhr') != null && now('rhr') - base('rhr') >= 4) flags.push('pulso en reposo ' + Math.round(now('rhr') - base('rhr')) + ' ppm por encima de tu media');
  if (n('hrv') >= 5 && now('hrv') != null && now('hrv') < base('hrv') * .88) flags.push('variabilidad por debajo de tu media');
  if (d.sleep != null && (d.sleep < 6 || (n('sleep') >= 5 && d.sleep < base('sleep') - 1.25))) flags.push('has dormido ' + V.n1(d.sleep) + ' h');
  if (d.energy != null && d.energy <= 2) flags.push('energía baja');
  const level = flags.length >= 2 ? 'bad' : flags.length === 1 ? 'warn' : 'ok';
  return { level, word: level === 'ok' ? 'Adelante' : level === 'warn' ? 'Con cabeza' : 'Baja una marcha', flags,
    text: level === 'ok' ? 'Nada fuera de tu tendencia. Haz lo previsto.' : level === 'warn' ? 'Una señal: ' + flags[0] + '. Haz lo previsto y escucha cómo respondes.' : 'Varias señales a la vez: ' + flags.join(', ') + '. Hoy cambia la calidad por rodaje fácil o descanso.' };
};
V.dailyForm = date => {
  date = V.isDate(date) ? date : V.today();
  const d = V.S.daily[date] || {};
  V.sheet('Chequeo · ' + V.rel(date), '<form data-form="daily">' + V.hid('date', date) +
    '<div class="grid2">' + V.f('Horas de sueño', 'sleep', d.sleep, { mode: 'decimal', ph: '7,5' }) + V.f('Pulso en reposo', 'rhr', d.rhr, { mode: 'numeric', ph: 'ppm al despertar' }) + '</div>' +
    '<div class="grid2">' + V.f('Variabilidad (VFC)', 'hrv', d.hrv, { mode: 'numeric', ph: 'ms, si la mides' }) + V.f('Peso', 'kg', d.kg, { mode: 'decimal', ph: 'kg, opcional' }) + '</div>' +
    V.scale('Energía (1 por los suelos · 5 a tope)', 'energy', d.energy, 5) + V.scale('Ánimo', 'mood', d.mood, 5) + V.ta('Nota del día', 'note', d.note, 2) + V.submit() + '</form>');
};
V.act.daily = d => V.dailyForm(d.date);
V.form.daily = d => {
  const g = k => d[k] == null || d[k] === '' ? null : Number(d[k]), o = { sleep: V.num(d.sleep), rhr: V.num(d.rhr), hrv: V.num(d.hrv), kg: V.num(d.kg), energy: g('energy'), mood: g('mood'), note: d.note.trim() };
  if (Object.keys(o).every(k => o[k] == null || o[k] === '')) delete V.S.daily[d.date]; else V.S.daily[d.date] = o;
  V.close(); V.commit('Chequeo guardado');
};

/* ---------- Hábitos ---------- */
V.habitOn = (id, date) => !!(V.S.habits.log[date] && V.S.habits.log[date][id]);
V.habitStreak = id => { let n = 0, d = V.today(); if (!V.habitOn(id, d)) d = V.add(d, -1); while (V.habitOn(id, d)) { n++; d = V.add(d, -1); } return n; };
V.act.habit = (d, el) => {
  const log = V.S.habits.log, day = d.date || V.today();
  log[day] = log[day] || {};
  if (el.checked) log[day][d.id] = 1; else delete log[day][d.id];
  V.commit();
};
V.habitRows = () => { const t = V.today(); return V.S.habits.list.map(h => '<li><input class="check" type="checkbox" id="hb-' + h.id + '" data-act="habit" data-id="' + h.id + '"' + (V.habitOn(h.id, t) ? ' checked' : '') + '><label class="grow t" for="hb-' + h.id + '">' + esc(h.name) + '</label>' + (V.habitStreak(h.id) > 1 ? '<span class="tag">' + V.habitStreak(h.id) + ' días</span>' : '') + '</li>').join(''); };

/* ---------- Resumen de semana ---------- */
V.weekSummary = mon => {
  const S = V.S, end = V.add(mon, 6), t = V.today(), w = V.weekLoad(mon), days = Math.max(1, Math.min(7, V.diff(t, mon) + 1));
  let hb = 0; for (let i = 0; i < days; i++) hb += S.habits.list.filter(h => V.habitOn(h.id, V.add(mon, i))).length;
  const sl = []; for (let i = 0; i < 7; i++) { const d = S.daily[V.add(mon, i)]; if (d && d.sleep != null) sl.push(d.sleep); }
  return { km: w.km, pkm: w.pkm, runs: w.n, fz: w.fz, pfz: w.pfz, pub: S.content.items.filter(i => i.status === 'publicado' && V.inWeek(i.date, mon)).length,
    study: V.studyMin(mon, end), sleep: V.avg(sl), habits: S.habits.list.length ? Math.round(hb / (S.habits.list.length * days) * 100) : null };
};
V.weekGrid = mon => {
  const s = V.weekSummary(mon), c = (v, l) => '<div class="stat"><b>' + v + '</b><span class="label">' + l + '</span></div>';
  return '<div class="grid3">' + c(V.n1(s.km) + (s.pkm ? '<span class="muted">/' + V.n1(s.pkm) + '</span>' : ''), 'km') + c(s.fz + (s.pfz ? '<span class="muted">/' + s.pfz + '</span>' : ''), 'fuerza') + c(s.pub, 'publicados') +
    c(V.hm(s.study), 'estudio') + c(s.sleep == null ? '–' : V.n1(s.sleep) + ' h', 'sueño medio') + c(s.habits == null ? '–' : s.habits + ' %', 'hábitos') + '</div>';
};

/* ---------- Vista ---------- */
V.views.yo = sub => {
  sub = sub || 'salud';
  const body = { salud: vHealth, habitos: vHabits, objetivos: vGoals, semana: vReview, datos: vData }[sub] || vHealth;
  return '<h1>' + (V.S.profile.name ? esc(V.S.profile.name) : 'Yo') + '</h1>' + V.subnav('yo', sub, [['salud', 'Salud'], ['habitos', 'Hábitos'], ['objetivos', 'Objetivos'], ['semana', 'Revisión'], ['datos', 'Datos']]) + body();
};

const vHealth = () => {
  const t = V.today(), d = V.S.daily[t], r = V.ready(), u = (k, f) => { const a = mean(series(k, 7)), b = mean(series(k, 28)); return '<span class="mono">' + (a == null ? '–' : f(a)) + ' <span class="muted">· 28 d: ' + (b == null ? '–' : f(b)) + '</span></span>'; };
  const trend = (title, k, f, note) => '<section class="card"><div class="head"><h2>' + title + '</h2>' + u(k, f) + '</div>' + V.spark(series(k, 28), { label: title + ' en 28 días', fmt: f }) + (note ? '<p class="small muted">' + note + '</p>' : '') + '</section>';
  const days = Object.keys(V.S.daily).sort().reverse().slice(0, 10);
  return '<section class="card frame"><div class="head"><h2>Chequeo de hoy</h2><button class="btn small ' + (d ? 'ghost' : 'solid') + '" type="button" data-act="daily">' + (d ? 'Editar' : 'Hacerlo') + '</button></div>' +
    (r ? '<div class="row wrap"><span class="stamp ' + (r.level === 'ok' ? 'ok' : r.level === 'warn' ? 'warn' : '') + '">' + r.word + '</span><p class="grow small">' + esc(r.text) + '</p></div>' : '<p class="small">Sueño, pulso al despertar y cómo te notas. Treinta segundos que deciden mejor que las ganas si hoy toca apretar.</p>') + '</section>' +
    trend('Sueño', 'sleep', v => V.n1(v) + ' h') + trend('Pulso en reposo', 'rhr', v => Math.round(v) + ' ppm', 'Lo útil es tu media y hacia dónde va, no un día suelto.') + trend('Variabilidad', 'hrv', v => Math.round(v) + ' ms') + trend('Peso', 'kg', v => V.n1(v) + ' kg') +
    '<section class="card"><h2>Últimos días</h2>' + (days.length ? '<ul class="list">' + days.map(k => { const x = V.S.daily[k]; return '<li><a class="grow tap" href="#" data-act="daily" data-date="' + k + '"><span class="t">' + V.fdate(k) + '</span><span class="small muted">' + [x.sleep != null ? V.n1(x.sleep) + ' h' : null, x.rhr != null ? x.rhr + ' ppm' : null, x.hrv != null ? 'VFC ' + x.hrv : null, x.energy != null ? 'energía ' + x.energy + '/5' : null, x.note || null].filter(Boolean).map(esc).join(' · ') + '</span></a></li>'; }).join('') + '</ul>' : '<p class="empty">Aún no hay chequeos.</p>') + '</section>' +
    '<p class="small muted">Los relojes dan estimaciones y cada persona tiene sus números. Esto orienta tu entrenamiento; no diagnostica nada.</p>';
};

const vHabits = () => {
  const t = V.today(), list = V.S.habits.list;
  return '<section class="card"><div class="head"><h2>Hoy</h2><button class="btn small ghost" type="button" data-act="habitsForm">Editar lista</button></div>' + (list.length ? '<ul class="list">' + V.habitRows() + '</ul>' : '<p class="empty">Añade dos o tres hábitos que de verdad muevan la aguja.</p>') + '</section>' +
    list.map(h => {
      let cells = '', n = 0;
      for (let i = 27; i >= 0; i--) { const d = V.add(t, -i), on = V.habitOn(h.id, d); if (on) n++; cells += '<span class="' + (on ? 'on' : '') + (i === 0 ? ' now' : '') + '" title="' + V.fdate(d) + '">' + V.date(d).getDate() + '</span>'; }
      return '<section class="card"><div class="head"><h3>' + esc(h.name) + '</h3><span class="mono">' + n + '/28</span></div><div class="week7" role="img" aria-label="' + esc(h.name) + ': ' + n + ' de los últimos 28 días">' + cells + '</div></section>';
    }).join('');
};
V.act.habitsForm = () => V.sheet('Mis hábitos', '<form data-form="habits">' + V.ta('Uno por línea', 'list', V.S.habits.list.map(h => h.name).join('\n'), 8) + '<p class="small muted">Si cambias el texto de uno, se cuenta como hábito nuevo.</p>' + V.submit() + '</form>');
V.form.habits = d => {
  const old = V.S.habits.list;
  V.S.habits.list = [...new Set(d.list.split('\n').map(x => x.trim()).filter(Boolean))].map(name => old.find(h => h.name === name) || { id: V.uid(), name });
  V.close(); V.commit('Hábitos guardados');
};

const vGoals = () => {
  const g = V.S.goals;
  return '<div class="actions"><button class="btn solid" type="button" data-act="goalForm">Nuevo objetivo</button></div>' +
    (g.length ? V.AREAS.filter(a => g.some(x => x.area === a)).map(a => '<section class="card"><h2>' + a + '</h2><ul class="list">' + g.filter(x => x.area === a).map(x =>
      '<li class="' + (x.done ? 'done' : '') + '"><input class="check" type="checkbox" data-act="goalToggle" data-id="' + x.id + '"' + (x.done ? ' checked' : '') + ' aria-label="Conseguido: ' + esc(x.text) + '">' +
      '<a class="grow tap" href="#" data-act="goalForm" data-id="' + x.id + '"><span class="t">' + esc(x.text) + '</span><span class="small muted">' + [x.note, x.due ? 'para el ' + V.fdate(x.due) : null].filter(Boolean).map(esc).join(' · ') + '</span></a></li>').join('') + '</ul></section>').join('')
      : '<section class="card quiet"><p>Pocos y concretos. Uno por área basta para saber hacia dónde tiras.</p></section>');
};
V.act.goalForm = d => {
  const x = (d.id && V.find(V.S.goals, d.id)) || {};
  V.sheet(x.id ? 'Editar objetivo' : 'Nuevo objetivo', '<form data-form="goal">' + V.hid('id', x.id) + V.f('Objetivo', 'text', x.text, { req: 1, ph: 'Media maratón en 1:40' }) +
    '<div class="grid2">' + V.sel('Área', 'area', V.AREAS.map(a => [a, a]), x.area || 'Vida') + V.f('Fecha límite', 'due', x.due, { type: 'date' }) + '</div>' + V.ta('Detalle', 'note', x.note, 2) + V.submit('Guardar', x.id ? 'goalDel' : null, x.id) + '</form>');
};
V.form.goal = d => {
  if (!d.text.trim()) return V.toast('Escribe el objetivo');
  const x = d.id ? V.find(V.S.goals, d.id) : { id: V.uid(), done: false };
  Object.assign(x, { text: d.text.trim(), area: d.area, due: V.isDate(d.due) ? d.due : null, note: d.note.trim() });
  if (!d.id) V.S.goals.push(x);
  V.close(); V.commit('Objetivo guardado');
};
V.act.goalDel = d => { V.drop(V.S.goals, d.id); V.close(); V.commit('Objetivo borrado'); };
V.act.goalToggle = (d, el) => { V.find(V.S.goals, d.id).done = el.checked; V.commit(el.checked ? 'Conseguido' : ''); };

const vReview = () => {
  const t = V.today(), cur = V.monday(t), mon = V.ui.rev === 'prev' ? V.add(cur, -7) : cur, r = V.find(V.S.reviews, mon) || {}, sem = V.semaforo(mon), hist = V.S.reviews.slice().sort((a, b) => a.id < b.id ? 1 : -1);
  return '<div class="chips" role="group" aria-label="Semana"><button class="chip" type="button" data-act="revWeek" data-w="cur" aria-pressed="' + (V.ui.rev !== 'prev') + '">Esta semana</button><button class="chip" type="button" data-act="revWeek" data-w="prev" aria-pressed="' + (V.ui.rev === 'prev') + '">La pasada</button></div>' +
    '<section class="card"><p class="label">' + V.fdate(mon) + ' – ' + V.fdate(V.add(mon, 6)) + '</p><h2>La semana en números</h2>' + V.weekGrid(mon) + '<p class="small"><b>Carga:</b> ' + esc(sem.text) + '</p></section>' +
    '<form class="card" data-form="review">' + V.hid('id', mon) + '<h2>Tres preguntas</h2>' + V.ta('¿Qué ha salido bien?', 'win', r.win, 2) + V.ta('¿Qué he aprendido o qué cambiaría?', 'lesson', r.lesson, 2) + V.ta('El foco de la semana que viene', 'focus', r.focus, 2) + V.submit('Guardar revisión') + '</form>' +
    (hist.length ? '<section class="card"><h2>Anteriores</h2><ul class="list">' + hist.slice(0, 12).map(x => '<li><span class="grow"><span class="t">Semana del ' + V.fdate(x.id) + '</span><span class="small muted pre">' + esc([x.win && 'Bien: ' + x.win, x.lesson && 'Aprendido: ' + x.lesson, x.focus && 'Foco: ' + x.focus].filter(Boolean).join('\n')) + '</span></span></li>').join('') + '</ul></section>' : '');
};
V.act.revWeek = d => { V.ui.rev = d.w; V.render(true); };
V.form.review = d => {
  let r = V.find(V.S.reviews, d.id);
  if (!r) { r = { id: d.id }; V.S.reviews.push(r); }
  Object.assign(r, { win: d.win.trim(), lesson: d.lesson.trim(), focus: d.focus.trim() });
  V.commit('Revisión guardada');
};
V.focusNow = () => { const r = V.find(V.S.reviews, V.add(V.monday(V.today()), -7)); return r && r.focus ? r.focus : null; };

/* ---------- Datos ---------- */
const vData = () => {
  const S = V.S, kb = Math.round(JSON.stringify(S).length / 1024);
  return '<form class="card" data-form="profile"><h2>Ajustes</h2><div class="grid2">' + V.f('Tu nombre', 'name', S.profile.name) + V.sel('Aspecto', 'theme', [['auto', 'Como el móvil'], ['light', 'Claro'], ['dark', 'Oscuro']], S.settings.theme) + '</div>' + V.submit() + '</form>' +
    '<section class="card"><h2>Copia de seguridad</h2><p class="small">Todo se guarda solo en este dispositivo (' + kb + ' KB). No hay cuenta ni servidor: si borras los datos del navegador o cambias de móvil, lo que no esté en una copia se pierde.</p>' +
    '<p class="small muted">' + (S.settings.lastExport ? 'Última copia: ' + V.rel(S.settings.lastExport) + '.' : 'Todavía no has hecho ninguna copia.') + '</p>' +
    '<div class="actions"><button class="btn solid" type="button" data-act="export">Descargar copia</button><button class="btn" type="button" data-act="importForm">Importar</button></div></section>' +
    '<section class="card"><h2>Garmin</h2><p class="small">Trae tus carreras desde Garmin Connect con el archivo CSV de actividades, o con el TCX o GPX de una actividad. No se duplican las que ya tengas.</p><div class="actions"><button class="btn" type="button" data-act="garmin">Importar de Garmin</button></div></section>' +
    '<section class="card"><h2>Llévala como una app</h2><p class="small">En el móvil, abre el menú del navegador y elige «Añadir a pantalla de inicio» o «Instalar». Funciona sin conexión.</p></section>' +
    '<section class="card alert"><h2 class="red">Borrar todo</h2><p class="small">Elimina todos los datos de esta app en este dispositivo. Haz antes una copia.</p><div class="actions"><button class="btn" type="button" data-act="wipe">Borrar mis datos</button></div></section>';
};
V.form.profile = d => { V.S.profile.name = d.name.trim(); V.S.settings.theme = d.theme; V.applyTheme(); V.commit('Ajustes guardados'); };
V.act.export = () => {
  V.S.settings.lastExport = V.today(); V.save();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(V.S, null, 1)], { type: 'application/json' }));
  a.download = 'vida-copia-' + V.today() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  V.render(true); V.toast('Copia descargada');
};
V.act.importForm = () => V.sheet('Importar datos', '<form data-form="import"><label class="f"><span>Archivo de copia (.json)</span><input type="file" id="import-file" accept=".json,application/json" data-chg="importFile"></label>' +
  V.ta('O pega aquí el contenido', 'json', '', 5) + V.sel('Qué hacer con lo que ya hay', 'mode', [['merge', 'Añadir a lo que ya tengo'], ['replace', 'Sustituirlo todo']], V.hasData() ? 'merge' : 'replace') + V.submit('Importar') + '</form>');
V.chg.importFile = (d, el) => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { el.form.elements.json.value = r.result; V.toast('Archivo cargado. Pulsa Importar'); }; r.readAsText(f); };
const addNew = (a, b) => { (b || []).forEach(x => { if (x && x.id && !a.some(y => y.id === x.id)) a.push(x); }); };
V.merge = (a, b) => {
  ['sessions', 'runs', 'races', 'tasks', 'goals', 'reviews'].forEach(k => addNew(a[k], b[k]));
  addNew(a.strength.templates, b.strength.templates); addNew(a.strength.logs, b.strength.logs);
  addNew(a.content.items, b.content.items); addNew(a.content.ideas, b.content.ideas);
  ['subjects', 'exams', 'topics', 'log'].forEach(k => addNew(a.study[k], b.study[k]));
  (b.habits.list || []).forEach(h => { if (!a.habits.list.some(x => x.id === h.id || x.name === h.name)) a.habits.list.push(h); });
  Object.keys(b.daily).forEach(k => { if (!a.daily[k]) a.daily[k] = b.daily[k]; });
  Object.keys(b.habits.log || {}).forEach(k => { a.habits.log[k] = Object.assign({}, b.habits.log[k], a.habits.log[k]); });
  ['ref', 'goal', 'plan'].forEach(k => { if (!a.running[k]) a.running[k] = b.running[k]; });
  if (!(a.running.rules || []).length) a.running.rules = b.running.rules || [];
  if (!Object.keys(a.running.manual || {}).length) a.running.manual = b.running.manual || {};
  if (!a.profile.name) a.profile.name = b.profile.name;
  if (a.pain.label === 'Molestia' && b.pain) a.pain = b.pain;
};
V.importData = (text, mode) => {
  let data;
  try { data = JSON.parse(text); } catch (e) { return V.toast('Ese archivo no es una copia válida'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || !(data.v || data.runs || data.content)) return V.toast('Ese archivo no es una copia de Vida');
  const inc = V.adopt(data);
  if (mode === 'replace') { if (V.hasData() && !confirm('Se sustituirán todos los datos actuales. ¿Seguir?')) return; V.S = inc; }
  else V.merge(V.S, inc);
  V.S.settings.welcomed = true;
  V.applyTheme(); V.close(); V.save(); location.hash = '#/hoy'; V.render(false); V.toast('Datos importados');
};
V.form.import = d => { if (!d.json.trim()) return V.toast('Elige un archivo o pega su contenido'); V.importData(d.json, d.mode); };
V.act.wipe = () => { if (!confirm('¿Borrar todos los datos de Vida en este dispositivo?') || !confirm('No se puede deshacer. ¿Seguro?')) return; localStorage.removeItem(V.KEY); V.load(); V.applyTheme(); location.hash = '#/hoy'; V.render(false); V.toast('Datos borrados'); };
})();
