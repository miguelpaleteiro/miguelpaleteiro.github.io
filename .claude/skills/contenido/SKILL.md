---
name: contenido
description: Crea contenido para la cuenta de Instagram @miguelpaleteiro. Úsala cuando Miguel pida ideas de publicaciones, un guion de reel, un caption, un carrusel o imágenes con su marca, un calendario de contenido, o quiera revisar métricas o programar publicaciones.
---

# Contenido para @miguelpaleteiro

## Su voz

- Entrenador y estudiante de Medicina que explica **por qué** pasan las cosas
  en el cuerpo. «Sin humo y con los datos en la mano.»
- Frases cortas, de tú, palabras de gimnasio y de calle; el término médico
  entra una vez y explicado.
- Nada de promesas, miedo ni «el secreto que nadie te cuenta».
- Cada afirmación lleva su fuente (autor, año, revista) y se dice cuánta
  evidencia hay: un estudio pequeño no es «la ciencia dice».
- Series que ya tiene: «¿Mito o verdad?», «¿Es bueno… si entrenas?» y «Tu
  analítica si entrenas». En su Drive hay un documento con guiones de reels:
  léelo para coger el tono antes de escribir.

Antes de dar por buena una pieza, comprueba cada dato en su fuente original. Si
no puedes comprobarlo, márcalo como pendiente; no lo dejes pasar como cierto.

## Formatos

**Idea.** Título, por qué interesa a quien entrena y la fuente en la que se apoya.

**Guion de reel (30–45 s).** Gancho de menos de 3 segundos, explicación en tres
o cuatro frases que se puedan decir de un tirón, y cierre con una acción
(guardar, comentar, seguir). Añade el texto en pantalla y el caption.

**Caption.** Primera línea que funcione sola, desarrollo breve, fuente, y entre
tres y cinco hashtags concretos.

**Carrusel.** Entre 5 y 8 diapositivas: portada, desarrollo y cierre. Se genera
con el programa de esta carpeta, que aplica sus colores y tipografías:

```bash
pip install pillow   # solo si falta
python3 .claude/skills/contenido/carrusel.py guion.json carpeta_de_salida
```

El formato del guion está al principio de `carrusel.py`. Tipos de diapositiva:
`portada`, `texto`, `dato` (una cifra gigante), `lista`, `veredicto` (sello de
MITO o VERDAD) y `cierre`. Temas `claro` y `oscuro`; formatos `4:5`, `3:4`,
`1:1` y `9:16`. Las tipografías no tienen emojis ni flechas, y el programa se
para si encuentra uno. Si avisa de que un texto no cabe, acorta el texto. Mira
las imágenes antes de enviárselas y mándaselas como archivos.

**Vídeo.** Puedes montar con ffmpeg: unir clips, recortar a vertical, añadir
subtítulos o convertir un carrusel en vídeo. No puedes generar vídeo ni fotos
realistas con IA; si lo pide, díselo.

## Métricas y programación (Metricool)

- Miguel tiene Metricool conectado, pero a 10 de noviembre de 2026 su marca no
  tenía ninguna red social enlazada. Si las herramientas de Metricool
  devuelven ese aviso, dile que conecte Instagram desde Metricool y sigue sin
  métricas.
- Con Instagram enlazado: mira qué publicaciones funcionaron y a qué horas
  antes de proponer el calendario.
- Programar: deja siempre la publicación **pendiente de su revisión**. No
  publiques ni programes en firme sin que él apruebe esa pieza concreta.
