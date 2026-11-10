/* Vida · Hoy: el día entero en una pantalla, tareas y apunte rápido. */
'use strict';
(() => {
const esc = V.esc;
const stamp = (r) => '<span class="stamp ' + (r.level === 'ok' ? 'ok' : r.level === 'warn' ? 'warn' : '') + '">' + r.word + '</span>';
const taskLi = k => '<li class="' + (k.done ? 'done' : '') + '"><input class="check" type="checkbox" id="tk-' + k.id + '" data-act="taskToggle" data-id="' + k.id + '"' + (k.done ? ' checked' : '') + '><label class="grow" for="tk-' + k.id + '"><span class="t">' + esc(k.text) + '</span>' +
  (k.date && k.date !== V.today() ? ' <span class="small ' + (k.date < V.today() && !k.done ? 'red' : 'muted') + '">' + V.rel(k.date) + '</span>' : '') + '</label><button class="btn small ghost" type="button" data-act="taskDel" data-id="' + k.id + '" aria-label="Borrar tarea: ' + esc(k.text) + '">×</button></li>';

V.views.hoy = () => {
  const S = V.S, t = V.today(), mon = V.monday(t), hour = new Date().getHours(), name = S.profile.name;
  const g = S.running.goal, ph = V.phase(mon), left = g && g.date ? V.diff(g.date, t) : null;
  let h = '<div class="stack"><p class="label">' + [ph ? 'Semana ' + (ph.i + 1) + ' de ' + ph.n + (ph.name ? ' · ' + esc(ph.name) : '') : null, left != null && left >= 0 ? (left === 0 ? 'hoy es el día' : 'faltan ' + left + ' días para ' + esc(g.name || 'la carrera')) : null].filter(Boolean).join(' · ') + '</p>' +
    '<h1>' + (hour < 6 ? 'A dormir' : hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches') + (name ? ', <em>' + esc(name) + '</em>' : '') + '</h1>' +
    (V.focusNow() ? '<p><span class="label">Foco de la semana</span><br>' + esc(V.focusNow()) + '</p>' : '') + '</div>';

  if (!S.settings.welcomed && !V.hasData()) h += '<section class="card frame"><h2>Empieza aquí</h2><p>Esta app junta tu entrenamiento, tu contenido, tu estudio y tus hábitos. Todo se guarda solo en este dispositivo.</p>' +
    '<div class="actions"><button class="btn solid" type="button" data-act="importForm">Importar mis datos</button><button class="btn" type="button" data-act="welcome">Empezar de cero</button></div></section>';

  /* Chequeo */
  const d = S.daily[t], r = V.ready();
  h += '<section class="card"><div class="head"><h2>Cómo estoy</h2><button class="btn small ' + (d ? 'ghost' : 'solid') + '" type="button" data-act="daily">' + (d ? 'Editar' : 'Chequeo de 30 s') + '</button></div>' +
    (r ? '<div class="row wrap">' + stamp(r) + '<p class="grow small">' + esc(r.text) + '</p></div><p class="small muted mono">' + [d.sleep != null ? V.n1(d.sleep) + ' h de sueño' : null, d.rhr != null ? d.rhr + ' ppm' : null, d.hrv != null ? 'VFC ' + d.hrv : null, d.energy != null ? 'energía ' + d.energy + '/5' : null].filter(Boolean).join(' · ') + '</p>'
      : '<p class="small muted">Sueño, pulso al despertar y energía. Con eso la app te dice si hoy toca lo previsto o bajar una marcha.</p>') + '</section>';

  /* Zona a vigilar */
  const pend = V.painPending();
  if (pend.length) h += '<section class="card alert"><h2 class="red">' + esc(S.pain.label) + '</h2><ul class="list">' + pend.map(x => '<li><span class="grow"><span class="t">¿Cómo está a las ' + (x.slot === 'h24' ? '24' : '48') + ' h?</span><span class="small muted">' + V.n1(x.run.km) + ' km del ' + V.fdate(x.run.date) + '</span></span><button class="btn small solid" type="button" data-act="painAsk" data-id="' + x.run.id + '" data-slot="' + x.slot + '">Responder</button></li>').join('') + '</ul></section>';

  /* Entreno */
  const ses = S.sessions.filter(s => s.date === t), late = S.sessions.filter(s => !s.done && s.date < t && s.date >= V.add(t, -2)), next = S.sessions.filter(s => s.date > t).sort((a, b) => a.date < b.date ? -1 : 1)[0], sem = V.semaforo(mon), w = V.weekLoad(mon);
  h += '<section class="card frame"><div class="head"><h2>Entreno</h2><a class="btn small ghost" href="#/entreno/plan">Semana</a></div>' +
    (ses.length ? ses.map(V.sessHtml).join('') : '<p>Hoy no hay sesión prevista. ' + (next ? 'Lo siguiente: <b>' + esc(next.title) + '</b>, ' + V.rel(next.date) + '.' : '') + '</p>') +
    (late.length ? '<p class="label">Sin hacer estos días</p>' + late.map(V.sessHtml).join('') : '') +
    (r && r.level === 'bad' && ses.some(s => s.type === 'run' && V.KINDS[s.kind] && V.KINDS[s.kind].i >= .5 && !s.done) ? '<p class="small red">El chequeo de hoy pide bajar una marcha: cambia la calidad por rodaje fácil o muévela.</p>' : '') +
    (w.pkm || w.km ? '<div class="row"><span class="grow">' + V.meter(w.km, w.pkm || w.km, true) + '</span><span class="mono small">' + V.n1(w.km) + (w.pkm ? '/' + V.n1(w.pkm) : '') + ' km</span></div>' : '') +
    (sem.level !== 'none' ? '<p class="small"><span class="tag ' + (sem.level === 'ok' ? 'ok' : sem.level === 'warn' ? 'warn' : 'bad') + '">Carga: ' + sem.word + '</span> ' + esc(sem.text) + '</p>' : '') +
    '<div class="actions"><button class="btn small" type="button" data-act="runNew">Registrar carrera</button>' + (ses.length ? '' : '<button class="btn small ghost" type="button" data-act="sessNew" data-date="' + t + '">Añadir sesión</button>') + '</div></section>';

  /* Contenido */
  const due = V.contentDue(), nx = V.contentNext(), live = S.content.items.filter(i => i.status !== 'publicado' && i.status !== 'idea').length;
  h += '<section class="card"><div class="head"><h2>Contenido</h2><a class="btn small ghost" href="#/contenido/calendario">Calendario</a></div>' +
    (due.length ? '<ul class="list">' + due.slice(0, 5).map(V.itemLi).join('') + '</ul>' : '<p class="small">' + (nx ? 'Nada para hoy. Lo siguiente: <b>' + esc(nx.title) + '</b>, ' + V.rel(nx.date) + '.' : live ? 'Tienes ' + live + (live === 1 ? ' vídeo en marcha' : ' vídeos en marcha') + ' sin fecha. Ponles día en el calendario.' : 'No hay nada en marcha. Saca una idea del banco.') + '</p>') +
    '<div class="actions"><button class="btn small" type="button" data-act="itemNew" data-date="' + t + '">Nuevo vídeo</button><a class="btn small ghost" href="#/contenido/ideas">Ideas</a></div></section>';

  /* Estudio */
  const rev = V.reviewsDue(), ex = V.nextExam(), tm = S.study.timer;
  h += (tm ? V.timerCard() : '') + '<section class="card"><div class="head"><h2>Estudio</h2><a class="btn small ghost" href="#/estudio">' + (tm ? 'Ver' : 'Empezar bloque') + '</a></div>' +
    '<div class="grid3"><div class="stat"><b>' + V.hm(V.studyMin(t, t)) + '</b><span class="label">hoy</span></div><div class="stat"><b>' + rev.length + '</b><span class="label">repasos</span></div><div class="stat"><b>' + (ex ? V.diff(ex.date, t) + ' d' : '–') + '</b><span class="label">' + (ex ? esc(ex.name || 'examen') : 'sin examen') + '</span></div></div>' +
    (rev.length ? '<ul class="list">' + rev.slice(0, 3).map(V.dueLi).join('') + '</ul>' : '') + '</section>';

  /* Hábitos */
  if (S.habits.list.length) h += '<section class="card"><div class="head"><h2>Hábitos</h2><a class="btn small ghost" href="#/yo/habitos">Ver</a></div><ul class="list">' + V.habitRows() + '</ul></section>';

  /* Tareas */
  const open = S.tasks.filter(k => !k.done && (!k.date || k.date <= t)).sort((a, b) => (a.date || t) < (b.date || t) ? -1 : 1), doneToday = S.tasks.filter(k => k.done && k.doneAt === t), later = S.tasks.filter(k => !k.done && k.date && k.date > t).sort((a, b) => a.date < b.date ? -1 : 1);
  h += '<section class="card"><h2>Tareas</h2>' + (open.length || doneToday.length ? '<ul class="list">' + open.concat(doneToday).map(taskLi).join('') + '</ul>' : '<p class="empty">Nada pendiente para hoy.</p>') +
    '<form data-form="task">' + V.f('Nueva tarea', 'text', '', { req: 1, ph: 'Entregar el PBL…' }) + '<div class="row" style="align-items:end"><label class="f grow"><span>Para</span><input type="date" name="date" value="' + t + '"></label><button class="btn" type="submit">Añadir</button></div></form>' +
    (later.length ? '<details><summary class="label" style="cursor:pointer;padding-block:8px">Más adelante · ' + later.length + '</summary><ul class="list">' + later.map(taskLi).join('') + '</ul></details>' : '') + '</section>';

  /* Semana y copia */
  h += '<section class="card"><div class="head"><h2>Mi semana</h2><a class="btn small ghost" href="#/yo/semana">Revisión</a></div>' + V.weekGrid(mon) + '</section>';
  const le = S.settings.lastExport;
  if (V.hasData() && (!le || V.diff(t, le) > 14)) h += '<section class="card quiet"><p class="small">' + (le ? 'Tu última copia es de hace ' + V.diff(t, le) + ' días.' : 'Aún no has hecho ninguna copia de seguridad.') + ' Los datos viven solo en este dispositivo.</p><div class="actions"><button class="btn small" type="button" data-act="export">Descargar copia</button></div></section>';
  return h;
};

V.act.welcome = () => { V.S.settings.welcomed = true; V.commit(); V.sheet('¿Cómo te llamas?', '<form data-form="hello">' + V.f('Tu nombre', 'name', '', { ph: 'Miguel' }) + V.submit('Entrar') + '</form>'); };
V.form.hello = d => { V.S.profile.name = d.name.trim(); V.close(); V.commit(); };

/* Tareas */
V.form.task = d => { if (!d.text.trim()) return; V.S.tasks.push({ id: V.uid(), text: d.text.trim(), date: V.isDate(d.date) ? d.date : null, done: false }); V.commit('Tarea añadida'); };
V.act.taskToggle = (d, el) => { const k = V.find(V.S.tasks, d.id); k.done = el.checked; k.doneAt = el.checked ? V.today() : null; V.commit(); };
V.act.taskDel = d => { V.drop(V.S.tasks, d.id); V.commit(); };

/* Apunte rápido */
V.act.quick = () => {
  const tpl = V.S.strength.templates;
  V.sheet('Apuntar', '<div class="stack">' +
    '<button class="btn full" type="button" data-act="runNew">Carrera</button>' +
    '<button class="btn full" type="button" data-act="garmin">Carreras desde Garmin</button>' +
    tpl.map(x => '<button class="btn full" type="button" data-act="fzNew" data-tid="' + x.id + '">Fuerza · ' + esc(x.name) + '</button>').join('') +
    '<button class="btn full" type="button" data-act="daily">Chequeo de hoy</button>' +
    '<button class="btn full" type="button" data-act="studyAdd">Minutos de estudio</button>' +
    '<button class="btn full" type="button" data-act="itemNew">Vídeo nuevo</button></div>' +
    '<form data-form="quickIdea"><div class="row" style="align-items:end"><div class="grow">' + V.f('Idea para el banco', 'text', '', { req: 1, ph: 'Una duda que te han preguntado' }) + '</div><button class="btn" type="submit">Guardar</button></div></form>' +
    '<form data-form="quickTask"><div class="row" style="align-items:end"><div class="grow">' + V.f('Tarea para hoy', 'text', '', { req: 1 }) + '</div><button class="btn" type="submit">Guardar</button></div></form>');
};
V.form.quickIdea = d => { if (!d.text.trim()) return; V.S.content.ideas.unshift({ id: V.uid(), text: d.text.trim(), cat: 'Bandeja de entrada', used: false }); V.close(); V.commit('Idea guardada en el banco'); };
V.form.quickTask = d => { if (!d.text.trim()) return; V.S.tasks.push({ id: V.uid(), text: d.text.trim(), date: V.today(), done: false }); V.close(); V.commit('Tarea añadida'); };
})();
