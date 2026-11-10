# miguelpaleteiro.github.io

Web pública de @miguelpaleteiro (GitHub Pages, rama `main`, sin compilación) y, en `/vida/`, su app personal.
Todo es HTML, CSS y JavaScript a mano: no hay dependencias, ni empaquetador, ni servidor.

## Reglas que no se rompen

- **Ningún dato personal en el repositorio.** El repo es público. Entrenos, lesión, plan, guiones, ideas, asignaturas
  o métricas viven solo en el `localStorage` del dispositivo y en la copia `.json` que exporta la app. El código solo
  lleva valores genéricos. Si hace falta precargar datos, se genera un `.json` aparte y se importa desde la app.
- **Sin terceros.** Nada de analítica, fuentes remotas, CDN ni peticiones a otros dominios. Las tipografías son locales (`/fonts`).
- **Tono.** Español de España, frases llanas, sin humo. Divulgación, nunca diagnóstico: la app orienta el entrenamiento
  y remite al profesional cuando toca. Si cambia qué se guarda o cómo, se actualiza `legal.html`.
- **Mismo lenguaje visual** que la web: pared `--wall`, láminas `--plate`, tinta `--ink`, rojo de sello `--red`, roble `--oak`;
  titulares en Anton en mayúsculas, etiquetas en IBM Plex Mono, texto en Instrument Sans. Claro y oscuro.

## La web (`index.html`, `legal.html`)

Página única con el juego de mito o verdad, la guía de analíticas y el podio de Reels. Las animaciones ligadas al scroll
solo existen con la clase `.motion` (se omiten con `prefers-reduced-motion`). El podio se edita entre los comentarios
`top:guardados` y `top:compartidos`; los mismos datos se ven en la app en Contenido → Números.

## La app Vida (`/vida/`)

PWA instalable y sin conexión. No está enlazada desde la web y lleva `noindex`. Rutas por hash: `#/seccion/apartado/argumento`.

| Archivo | Qué hace |
|---|---|
| `index.html` | Marco: barra, pestañas, `<main id="view">`, hoja `<dialog id="sheet">`, aviso `#toast`. Carga los scripts en orden. |
| `app.css` | Todos los estilos. Tokens en `:root`, modo oscuro por `prefers-color-scheme` y por `data-theme`. |
| `js/core.js` | `window.V`: utilidades de fecha y tiempo, almacén, navegación, hoja, piezas de formulario y gráficos. |
| `js/entreno.js` | Plan, carga semanal, zona a vigilar, registro de carrera, fuerza, marcas y ritmos, informe para el entrenador. |
| `js/contenido.js` | Flujo de vídeos por estado, calendario, banco de ideas, números. |
| `js/estudio.js` | Cronómetro, temario con repasos espaciados, exámenes. |
| `js/yo.js` | Chequeo diario y disposición, hábitos, objetivos, revisión semanal, copia, importación y fusión. |
| `js/garmin.js` | Importa carreras desde el CSV de actividades de Garmin Connect o un TCX/GPX. |
| `js/hoy.js` | La pantalla de inicio, que compone todo lo anterior, tareas y apunte rápido. |
| `sw.js` | Caché para uso sin conexión (primero red, si falla caché). |
| `tests/smoke.js` | Prueba de humo con Playwright y datos inventados. |

### Cómo está hecha

- **Estado:** un único objeto `V.S`, guardado en `localStorage['vida.v1']`. Su forma está en `V.blank()` (core.js);
  `V.adopt()` rellena lo que falte al cargar o importar. Tras cambiar algo: `V.commit('mensaje opcional')`, que guarda y repinta.
- **Vistas:** funciones que devuelven HTML como texto, en `V.views.<seccion>(apartado, argumento)`. **Todo texto del
  usuario pasa por `V.esc()`.**
- **Eventos:** delegados en `document`. `data-act="x"` llama a `V.act.x(dataset, elemento)`; `<form data-form="x">` llama a
  `V.form.x(campos)`; `data-chg="x"` llama a `V.chg.x`. Las casillas usan `data-act` (el clic no se cancela en `<input>`).
- **Formularios:** en la hoja, con `V.sheet(titulo, html)` y las piezas `V.f`, `V.ta`, `V.sel`, `V.scale`, `V.hid`, `V.submit`.
- **Fechas:** siempre texto `AAAA-MM-DD` en hora local (`V.today()`, `V.add()`, `V.monday()`). Tiempos en segundos (`V.sec`, `V.hms`, `V.pace`).
- **Gráficos:** `V.bars()` y `V.spark()`, SVG de una sola serie con etiqueta accesible; al tocar una barra se lee el dato.

### Lógica que conviene conocer

- **Ritmos (`V.zones`)**: se calculan con Riegel desde la marca de referencia y se pisan con `running.manual` (ritmo y nota
  de potencia por zona). En el detalle de una sesión, `{facil}`, `{larga}`, `{umbral}`, `{diezk}`, `{especifico}` y
  `{objetivo}` se sustituyen al pintar (`V.fill`), así que cambiar los ritmos actualiza todo el plan.
- **Plan**: `sessions[]` con `type` (`run`, `fuerza`, `otro`) y `kind` (`V.KINDS`, con su peso de intensidad).
  `running.plan = { start, weeks, labels[] }` da el nombre de cada semana. `V.genPlan()` propone un bloque; las sesiones
  generadas llevan `gen: true` y se sustituyen al rehacerlo, las hechas o añadidas a mano se quedan.
- **Carga (`V.semaforo`)**: compara la semana con lo más alto de las tres anteriores en volumen, intensidad y fuerza.
  Avisa si suben volumen e intensidad a la vez.
- **Zona a vigilar (`V.painLevel`)**: cada carrera se valora durante, al acabar, a las 24 h y a las 48 h. 0 sigue, 1 repite
  la semana, 2 para. `V.painPending()` genera las preguntas que salen en Hoy.
- **Disposición (`V.ready`)**: compara los 3 últimos días con las 3 semanas anteriores (pulso, variabilidad, sueño, energía).
- **Repasos**: `V.topicDue()` con intervalos de 1, 7, 21 y 45 días según la vuelta.

### Probar y publicar

- `node vida/tests/smoke.js` debe acabar en `TODO OK`. Añade un caso por cada función nueva.
- Al tocar cualquier archivo de la app, sube `VERSION` en `vida/sw.js` y añade los archivos nuevos a `SHELL`,
  o los móviles con la app instalada seguirán con la versión vieja sin conexión.
- Comprueba a 390 px de ancho, en claro y en oscuro, que no hay scroll horizontal y que los botones miden 44 px o más.
- La app se publica al fusionar en `main`: queda en `https://miguelpaleteiro.github.io/vida/`.

### Ideas pendientes

- Sincronización real con Garmin o Strava: exige un servidor propio con OAuth; desde una web estática no se puede.
  Mientras tanto, importación por archivo. Falta leer archivos FIT y los datos diarios de sueño y pulso.
- Recordatorios con notificaciones, y copia automática a un archivo elegido por el usuario.
- Plantillas de vídeo por serie y exportar el calendario de contenido.
- Notas por asignatura y simulacros de examen en Estudio.
