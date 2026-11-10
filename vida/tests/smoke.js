/* Prueba de humo de Vida. Uso: node vida/tests/smoke.js  (necesita Playwright con Chromium).
   Sirve el repositorio en local, carga datos inventados y recorre todas las vistas y los flujos clave. */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..'), PORT = 8799, U = 'http://localhost:' + PORT + '/vida/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const SAMPLE = { v: 1, profile: { name: 'Prueba' }, pain: { on: true, label: 'Rodilla' },
  running: { ref: { km: 10, sec: 3000, date: '2026-01-04' }, goal: { name: 'Media de prueba', km: 21.0975, sec: 6600, date: null }, plan: null, manual: {}, rules: ['Una regla'] },
  strength: { templates: [{ id: 't1', name: 'Fuerza A', ex: [{ n: 'Sentadilla', sets: '3', reps: '8', rir: '2' }] }], logs: [] },
  content: { items: [{ id: 'c1', title: 'Vídeo de prueba', status: 'guion', date: '2026-01-13', hook: 'Gancho', checks: {} }], ideas: [{ id: 'i1', text: '¿Idea de prueba?', cat: 'Pruebas', used: false }] },
  study: { subjects: [{ id: 's1', name: 'Asignatura' }], exams: [{ id: 'e1', sid: 's1', name: 'Parcial', date: '2026-02-10' }], topics: [{ id: 'tp1', sid: 's1', n: 'Tema 1', r: 0, last: null }], log: [], timer: null },
  settings: { theme: 'auto', lastExport: null, welcomed: true } };
const CSV = 'Activity Type,Date,Title,Distance,Time,Avg HR,Avg Power\nRunning,2026-01-11 08:00:00,"Rodaje, suave",8.01,00:48:10,145,280\nCycling,2026-01-10 08:00:00,Bici,30,01:00:00,120,--\n';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
server.listen(PORT, async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.clock.install({ time: new Date('2026-01-13T10:00:00') });                      // martes
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
  const view = async () => (await p.locator('#view').innerText()).toLowerCase(), S = () => p.evaluate(() => V.S);
  const go = async r => { await p.goto(U + '#/' + r); await p.waitForTimeout(80); }, save = async () => { await p.click('#sheet button[type=submit]'); await p.waitForTimeout(80); };
  await p.goto(U); ok((await view()).includes('empieza aquí'), 'primer arranque');
  await p.click('text=Importar mis datos'); await p.fill('textarea[name=json]', JSON.stringify(SAMPLE)); await p.selectOption('select[name=mode]', 'replace'); await save();
  ok((await view()).includes('prueba'), 'importa una copia');
  await go('entreno/plan'); await p.click('text=Generar plan'); await p.fill('input[name=start]', '2026-01-12'); await p.selectOption('select[name=cal]', '1'); await save();
  let s = await S(); ok(s.sessions.length > 40 && s.running.plan.weeks === 12 && s.running.plan.labels.length === 12, 'genera un plan de 12 semanas');
  ok((await view()).includes('semana 1 de 12'), 'muestra la semana del plan');
  await go('hoy'); await p.click('.sess button[data-act=sessLog] >> nth=0');
  const title = await p.locator('#sheet-t').textContent();
  if (/carrera/i.test(title)) { await p.fill('#sheet input[name=time]', '40:00'); await p.check('#sheet input[name=pd][value="4"]', { force: true }); } else { await p.fill('#sheet input[name=e0_s0_reps]', '8'); }
  await save(); s = await S(); ok(s.runs.length + s.strength.logs.length === 1 && s.sessions.some(x => x.done), 'registra la sesión de hoy desde Hoy');
  await go('entreno/carrera'); await p.click('button[data-act=garmin]');
  await p.setInputFiles('#garmin-file', { name: 'Activities.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) }); await p.waitForTimeout(150); await p.click('#sheet button[data-act=garminDo]'); await p.waitForTimeout(80);
  s = await S(); const g = s.runs.find(r => r.date === '2026-01-11'); ok(g && g.km === 8.01 && g.sec === 2890 && g.hr === 145, 'importa el CSV de Garmin');
  await go('entreno/marcas'); await p.click('button[data-act=zonesForm]'); await p.fill('#sheet input[name=p_umbral]', '4:28-4:38'); await p.fill('#sheet input[name=w_umbral]', '370 W'); await save();
  ok((await view()).includes('4:28–4:38/km'), 'ritmos a mano');
  await go('contenido/ideas'); await p.click('button[data-act=ideaUse] >> nth=0'); await save(); s = await S(); ok(s.content.items.length === 2 && s.content.ideas[0].used, 'idea convertida en vídeo');
  await go('estudio/sesion'); await p.click('form[data-form=timer] button[type=submit]'); await p.clock.fastForward('30:00'); await p.click('button[data-act=timerStop]'); s = await S(); ok(s.study.log[0].min === 30, 'cronómetro de estudio');
  await go('estudio/temario'); await p.click('button[data-act=topicDone]'); s = await S(); ok(s.study.topics[0].r === 1, 'vuelta a un tema');
  await go('hoy'); await p.click('button[data-act=daily]'); await p.fill('#sheet input[name=sleep]', '7,5'); await save(); s = await S(); ok(s.daily['2026-01-13'].sleep === 7.5, 'chequeo diario');
  for (const r of ['hoy', 'entreno/plan', 'entreno/carrera', 'entreno/fuerza', 'entreno/zona', 'entreno/marcas', 'contenido/flujo', 'contenido/calendario', 'contenido/ideas', 'contenido/numeros', 'estudio/sesion', 'estudio/temario', 'estudio/examenes', 'yo/salud', 'yo/habitos', 'yo/objetivos', 'yo/semana', 'yo/datos']) {
    await go(r);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const bare = await p.evaluate(() => [...document.querySelectorAll('#view input:not([type=hidden]),#view select,#view textarea,#view button,#view a')].filter(e => /^(BUTTON|A)$/.test(e.tagName) ? !(e.innerText.trim() || e.getAttribute('aria-label')) : !(e.labels && e.labels.length) && !e.getAttribute('aria-label')).length);
    ok(wide <= 0 && bare === 0, r + ': sin desbordes y con todos los controles con nombre');
  }
  ok(!errs.length, 'sin errores de consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? fails + ' FALLOS' : 'TODO OK');
  await b.close(); server.close(); process.exit(fails ? 1 : 0);
});
