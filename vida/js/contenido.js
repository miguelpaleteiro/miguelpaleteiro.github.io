/* Vida · Contenido: flujo de vídeos, calendario, banco de ideas y números. */
'use strict';
(() => {
const esc = V.esc;
V.ui = V.ui || {};
V.ST = [['idea', 'Idea'], ['guion', 'Guion'], ['grabado', 'Grabado'], ['editado', 'Editado'], ['programado', 'Programado'], ['publicado', 'Publicado']];
const stName = s => (V.ST.find(x => x[0] === s) || V.ST[0])[1];
const CHECKS = [['c1', 'El gancho rompe una creencia en 3 segundos'], ['c2', 'Explica por qué pasa, no solo qué hacer'], ['c3', 'Lleva una analogía o imagen mental'], ['c4', 'Rol claro: divulgo, no diagnostico'], ['c5', 'Fuente comprobada'], ['c6', 'Acaba con pregunta o enlace al siguiente']];
const PARTS = [['hook', 'Gancho · 0–3 s'], ['short', 'Respuesta corta · 3–12 s'], ['body', 'Explicación con analogía · 12–35 s'], ['apply', 'Aplicación práctica · 35–45 s'], ['close', 'Frase final · 45–50 s']];
const items = () => V.S.content.items;
const byDate = (a, b) => (a.date || '9') < (b.date || '9') ? -1 : (a.date || '9') > (b.date || '9') ? 1 : 0;

V.contentDue = () => { const t = V.today(); return items().filter(i => i.status !== 'publicado' && i.date && i.date <= t).sort(byDate); };
V.contentNext = () => { const t = V.today(); return items().filter(i => i.status !== 'publicado' && i.date && i.date > t).sort(byDate)[0]; };
V.itemLi = i => '<li><a class="grow tap" href="#" data-act="itemEdit" data-id="' + i.id + '"><span class="t">' + esc(i.title) + '</span><span class="small muted">' + (i.date ? V.rel(i.date) : 'sin fecha') + (i.pillar ? ' · ' + esc(i.pillar) : '') + '</span></a>' +
  '<span class="tag' + (i.status === 'publicado' ? ' ok' : i.date && i.date < V.today() ? ' bad' : '') + '">' + stName(i.status) + '</span>' +
  (i.status !== 'publicado' ? '<button class="btn small" type="button" data-act="itemNext" data-id="' + i.id + '" aria-label="Pasar ' + esc(i.title) + ' al siguiente estado">→</button>' : '') + '</li>';

V.views.contenido = sub => {
  sub = sub || 'flujo';
  const body = { flujo: vFlow, calendario: vCal, ideas: vIdeas, numeros: vNums }[sub] || vFlow;
  return '<h1>Contenido</h1>' + V.subnav('contenido', sub, [['flujo', 'Flujo'], ['calendario', 'Calendario'], ['ideas', 'Ideas'], ['numeros', 'Números']]) + body();
};

const vFlow = () => {
  const f = V.ui.cst || 'activos', all = items(), count = s => all.filter(i => i.status === s).length;
  const list = all.filter(i => f === 'activos' ? i.status !== 'publicado' : i.status === f).sort((a, b) => f === 'publicado' ? ((a.date || '') < (b.date || '') ? 1 : -1) : byDate(a, b));
  return '<div class="actions"><button class="btn solid" type="button" data-act="itemNew">Nuevo vídeo</button><a class="btn" href="#/contenido/ideas">Sacar una idea</a></div>' +
    '<div class="chips" role="group" aria-label="Filtrar por estado"><button class="chip" type="button" data-act="cFilter" data-st="activos" aria-pressed="' + (f === 'activos') + '">En marcha ' + all.filter(i => i.status !== 'publicado').length + '</button>' +
    V.ST.map(s => '<button class="chip" type="button" data-act="cFilter" data-st="' + s[0] + '" aria-pressed="' + (f === s[0]) + '">' + s[1] + ' ' + count(s[0]) + '</button>').join('') + '</div>' +
    '<section class="card">' + (list.length ? '<ul class="list">' + list.map(V.itemLi).join('') + '</ul>' : '<p class="empty">No hay vídeos en este estado.</p>') + '</section>' +
    '<section class="card quiet"><p class="label">Estructura de cada vídeo</p><p class="small">' + PARTS.map(p => p[1]).join(' → ') + '.</p></section>';
};

const vCal = () => {
  const t = V.today(), mon = V.monday(t), all = items();
  let h = '';
  for (let w = 0; w < 3; w++) {
    const m = V.add(mon, w * 7), n = all.filter(i => V.inWeek(i.date, m)).length;
    h += '<section class="card"><div class="head"><h2>' + (w === 0 ? 'Esta semana' : w === 1 ? 'La que viene' : 'En dos semanas') + '</h2><span class="tag">' + n + (n === 1 ? ' vídeo' : ' vídeos') + '</span></div>';
    for (let d = 0; d < 7; d++) {
      const day = V.add(m, d), its = all.filter(i => i.date === day);
      if (day < t && !its.length) continue;
      h += '<div class="day' + (day === t ? ' today' : '') + '"><div class="head"><p class="label">' + V.fdate(day) + (day === t ? ' · hoy' : '') + '</p><button class="btn small ghost" type="button" data-act="itemNew" data-date="' + day + '" aria-label="Añadir vídeo el ' + V.fdate(day) + '">+</button></div>' +
        (its.length ? '<ul class="list">' + its.map(V.itemLi).join('') + '</ul>' : '<p class="small muted">Libre</p>') + '</div>';
    }
    h += '</section>';
  }
  const loose = all.filter(i => !i.date && i.status !== 'publicado' && i.status !== 'idea');
  if (loose.length) h += '<section class="card"><h2>Listos pero sin fecha</h2><ul class="list">' + loose.map(V.itemLi).join('') + '</ul></section>';
  return h;
};

const vIdeas = () => {
  const ideas = V.S.content.ideas, cats = [...new Set(ideas.map(i => i.cat || 'Sin categoría'))], cur = V.ui.icat && cats.includes(V.ui.icat) ? V.ui.icat : cats[0];
  const pick = V.ui.pick && V.find(ideas, V.ui.pick), free = ideas.filter(i => !i.used).length;
  let h = '<section class="card frame"><p class="label">Banco de dolores · ' + free + ' sin usar de ' + ideas.length + '</p>' +
    (pick ? '<h2>' + esc(pick.text) + '</h2><p class="small muted">' + esc(pick.cat || '') + '</p>' : '<h2>¿De qué hablo hoy?</h2><p class="small">Cada vídeo nace de una duda real: por qué pasa, qué ocurre dentro del cuerpo y qué hago con ello.</p>') +
    '<div class="actions"><button class="btn solid" type="button" data-act="ideaRandom"' + (free ? '' : ' disabled') + '>' + (pick ? 'Otra' : 'Dame una idea') + '</button>' + (pick ? '<button class="btn" type="button" data-act="ideaUse" data-id="' + pick.id + '">Convertir en vídeo</button>' : '') + '</div></section>' +
    '<form class="card" data-form="idea"><div class="grid2">' + V.f('Nueva idea o duda', 'text', '', { req: 1, ph: '¿Por qué…?' }) + V.f('Categoría', 'cat', cur && cur !== 'Sin categoría' ? cur : '', { ph: 'Recuperación' }) + '</div><div class="actions"><button class="btn" type="submit">Añadir al banco</button></div></form>';
  if (!ideas.length) return h + '<p class="empty">El banco está vacío. Apunta aquí cada duda que te llegue por comentarios.</p>';
  h += '<div class="chips" role="group" aria-label="Categorías">' + cats.map(c => '<button class="chip" type="button" data-act="ideaCat" data-cat="' + esc(c) + '" aria-pressed="' + (c === cur) + '">' + esc(c) + ' ' + ideas.filter(i => (i.cat || 'Sin categoría') === c && !i.used).length + '</button>').join('') + '</div>' +
    '<section class="card"><ul class="list">' + ideas.filter(i => (i.cat || 'Sin categoría') === cur).map(i => '<li class="' + (i.used ? 'done' : '') + '"><span class="grow t">' + esc(i.text) + '</span>' +
      (i.used ? '<span class="tag">Usada</span>' : '<button class="btn small" type="button" data-act="ideaUse" data-id="' + i.id + '">Usar</button>') +
      '<button class="btn small ghost" type="button" data-act="ideaDel" data-id="' + i.id + '" aria-label="Borrar idea: ' + esc(i.text) + '">×</button></li>').join('') + '</ul></section>';
  return h;
};

const vNums = () => {
  const pub = items().filter(i => i.status === 'publicado'), t = V.today(), mon = V.monday(t), wk = [];
  for (let i = 7; i >= 0; i--) { const m = V.add(mon, -7 * i), d = V.date(m); wk.push({ l: d.getDate() + '/' + (d.getMonth() + 1), v: pub.filter(x => V.inWeek(x.date, m)).length, hi: i === 0 }); }
  const top = k => pub.filter(i => i[k] != null).sort((a, b) => b[k] - a[k]).slice(0, 3);
  const podium = (title, k) => { const l = top(k); return '<div class="stack"><p class="label">' + title + '</p>' + (l.length ? '<ol class="list">' + l.map((i, n) => '<li><span class="mono red">' + (n + 1) + '.º</span><a class="grow tap" href="#" data-act="itemEdit" data-id="' + i.id + '"><span class="t">' + esc(i.title) + '</span></a><span class="mono">' + i[k].toLocaleString('es-ES') + '</span></li>').join('') + '</ol>' : '<p class="small muted">Apunta el dato en cada vídeo publicado.</p>') + '</div>'; };
  const pil = {}; pub.forEach(i => { if (i.pillar && i.saves != null) (pil[i.pillar] = pil[i.pillar] || []).push(i.saves); });
  const pl = Object.keys(pil).filter(k => pil[k].length >= 2).map(k => [k, V.avg(pil[k])]).sort((a, b) => b[1] - a[1]);
  return '<section class="card"><h2>Ritmo de publicación</h2>' + V.bars(wk, { label: 'Vídeos publicados por semana, últimas 8', h: 100, fmt: v => String(v), unit: 'publicados' }) +
    '<div class="grid3"><div class="stat"><b>' + pub.length + '</b><span class="label">publicados</span></div><div class="stat"><b>' + wk[7].v + '</b><span class="label">esta semana</span></div><div class="stat"><b>' + V.n1(V.sum(wk.slice(4), x => x.v) / 4) + '</b><span class="label">media 4 semanas</span></div></div></section>' +
    '<section class="card"><h2>Lo que más ha servido</h2><div class="grid2 fold">' + podium('Más guardados', 'saves') + podium('Más compartidos', 'shares') + '</div><p class="small muted">Es el mismo podio que enseña tu web en «Lo que más os ha servido».</p></section>' +
    (pl.length ? '<section class="card"><h2>Guardados medios por tema</h2><ul class="list">' + pl.map(x => '<li><span class="grow"><span class="t">' + esc(x[0]) + '</span>' + V.meter(x[1], pl[0][1]) + '</span><span class="mono">' + Math.round(x[1]).toLocaleString('es-ES') + '</span></li>').join('') + '</ul></section>' : '') +
    '<section class="card"><h2>Publicados</h2>' + (pub.length ? '<ul class="list">' + pub.slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1).map(i => '<li><a class="grow tap" href="#" data-act="itemEdit" data-id="' + i.id + '"><span class="t">' + esc(i.title) + '</span><span class="small muted">' + (i.date ? V.fdate(i.date) : 'sin fecha') + (i.saves != null ? ' · ' + i.saves + ' guardados' : '') + (i.shares != null ? ' · ' + i.shares + ' compartidos' : '') + (i.reach != null ? ' · ' + i.reach + ' de alcance' : '') + '</span></a>' + (i.link ? '<a class="btn small ghost" href="' + esc(i.link) + '" target="_blank" rel="noopener">Ver</a>' : '') + '</li>').join('') + '</ul>' : '<p class="empty">Cuando marques un vídeo como publicado aparecerá aquí.</p>') + '</section>';
};

/* ---------- Acciones ---------- */
V.act.cFilter = d => { V.ui.cst = d.st; V.render(true); };
V.act.ideaCat = d => { V.ui.icat = d.cat; V.render(true); };
V.act.ideaRandom = () => { const free = V.S.content.ideas.filter(i => !i.used && i.id !== V.ui.pick); if (!free.length) return; V.ui.pick = free[Math.floor(Math.random() * free.length)].id; V.render(true); };
V.form.idea = d => { if (!d.text.trim()) return; V.S.content.ideas.unshift({ id: V.uid(), text: d.text.trim(), cat: d.cat.trim(), used: false }); if (d.cat.trim()) V.ui.icat = d.cat.trim(); V.commit('Idea guardada'); };
V.act.ideaDel = d => { V.drop(V.S.content.ideas, d.id); V.commit(); };
V.act.ideaUse = d => {
  const i = V.find(V.S.content.ideas, d.id); i.used = true; V.ui.pick = null;
  const it = { id: V.uid(), title: i.text, pillar: i.cat || '', status: 'idea', date: null, checks: {} };
  items().push(it); V.commit(); V.itemForm(it);
};
V.act.itemNew = d => V.itemForm({ status: 'idea', date: d && d.date || null, checks: {} });
V.act.itemEdit = d => V.itemForm(V.find(items(), d.id));
V.act.itemNext = d => {
  const i = V.find(items(), d.id), n = V.ST.findIndex(s => s[0] === i.status);
  i.status = V.ST[Math.min(n + 1, V.ST.length - 1)][0];
  if (i.status === 'publicado' && !i.date) i.date = V.today();
  V.commit(i.title + ': ' + stName(i.status).toLowerCase());
};
V.act.itemDel = d => { if (!confirm('¿Borrar este vídeo?')) return; V.drop(items(), d.id); V.close(); V.commit('Vídeo borrado'); };

V.itemForm = i => {
  const pillars = [...new Set(items().map(x => x.pillar).concat(V.S.content.ideas.map(x => x.cat)).filter(Boolean))], ck = i.checks || {};
  V.sheet(i.id ? 'Vídeo' : 'Nuevo vídeo', '<form data-form="item">' + V.hid('id', i.id) + V.f('Título o duda que resuelve', 'title', i.title, { req: 1, ph: '¿Por qué…?' }) +
    '<div class="grid3">' + V.sel('Estado', 'status', V.ST, i.status) + V.f('Fecha', 'date', i.date, { type: 'date' }) +
    '<label class="f"><span>Tema</span><input name="pillar" type="text" list="pillars" value="' + esc(i.pillar || '') + '" autocomplete="off"><datalist id="pillars">' + pillars.map(p => '<option value="' + esc(p) + '">').join('') + '</datalist></label></div>' +
    PARTS.map(p => V.ta(p[1], p[0], i[p[0]], p[0] === 'body' ? 5 : 2)).join('') +
    V.ta('Lazo abierto hacia el siguiente vídeo', 'loop', i.loop, 2) + V.ta('Texto de la publicación (con pregunta)', 'caption', i.caption, 2) + V.f('Fuente', 'src', i.src, { ph: 'Autor, año, revista' }) +
    '<fieldset><legend>Antes de grabar</legend>' + CHECKS.map(c => '<label class="row"><input class="check" type="checkbox" name="ck_' + c[0] + '"' + (ck[c[0]] ? ' checked' : '') + '><span class="grow">' + c[1] + '</span></label>').join('') + '</fieldset>' +
    V.f('Enlace al Reel', 'link', i.link, { type: 'url', ph: 'https://www.instagram.com/reel/…' }) +
    '<div class="grid3">' + V.f('Guardados', 'saves', i.saves, { mode: 'numeric' }) + V.f('Compartidos', 'shares', i.shares, { mode: 'numeric' }) + V.f('Alcance', 'reach', i.reach, { mode: 'numeric' }) + '</div>' +
    V.ta('Notas de producción', 'note', i.note, 2) +
    '<div class="actions"><button class="btn solid" type="submit">Guardar</button>' + (i.id ? '<button class="btn" type="button" data-act="tele" data-id="' + i.id + '">Modo grabación</button><button class="btn" type="button" data-act="capCopy" data-id="' + i.id + '">Copiar texto</button><button class="btn ghost" type="button" data-act="itemDel" data-id="' + i.id + '">Borrar</button>' : '') + '</div></form>');
};
V.form.item = d => {
  if (!d.title.trim()) return V.toast('Ponle un título');
  const i = d.id ? V.find(items(), d.id) : { id: V.uid() }, n = k => { const v = V.num(d[k]); return v == null ? null : Math.round(v); };
  Object.assign(i, { title: d.title.trim(), status: d.status, date: V.isDate(d.date) ? d.date : null, pillar: d.pillar.trim(), loop: d.loop.trim(), caption: d.caption.trim(), src: d.src.trim(), link: /^https?:\/\//.test(d.link.trim()) ? d.link.trim() : '', saves: n('saves'), shares: n('shares'), reach: n('reach'), note: d.note.trim(), checks: {} });
  PARTS.forEach(p => { i[p[0]] = d[p[0]].trim(); });
  CHECKS.forEach(c => { if (d['ck_' + c[0]]) i.checks[c[0]] = true; });
  if (i.status === 'publicado' && !i.date) i.date = V.today();
  if (!d.id) items().push(i);
  V.close(); V.commit('Vídeo guardado');
};
V.act.tele = d => {
  const i = V.find(items(), d.id), parts = PARTS.filter(p => i[p[0]]);
  V.sheet(i.title, '<div class="tele">' + (parts.length ? parts.map(p => '<div><p class="label">' + p[1] + '</p><p class="pre">' + esc(i[p[0]]) + '</p></div>').join('') : '<p>Este vídeo aún no tiene guion escrito.</p>') +
    (i.loop ? '<div><p class="label">Lazo</p><p class="pre">' + esc(i.loop) + '</p></div>' : '') + '</div><p class="small muted">Texto fijo en pantalla: «Contenido educativo, no sustituye a tu médico o fisio».</p><div class="actions"><button class="btn" type="button" data-act="itemEdit" data-id="' + i.id + '">Volver al vídeo</button></div>');
};
V.act.capCopy = d => { const i = V.find(items(), d.id); V.copy(i.caption || i.title, 'Texto copiado'); };
})();
