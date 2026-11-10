---
name: briefing
description: Prepara el resumen diario de Miguel. Úsala cuando pida su briefing, su resumen de la mañana o «qué hay hoy», y en la tarea programada de cada mañana.
---

# Briefing de la mañana

Un mensaje que se lee en el móvil en un minuto: menos de 250 palabras, sin
introducción ni despedida. Cuatro bloques, en este orden:

**1. Mercados.** Ejecuta `python3 .claude/skills/finanzas/mercados.py` y cuenta
en dos o tres líneas lo que se ha movido de verdad (S&P 500, Nasdaq, IBEX 35,
EUR/USD, oro, bitcoin), con el porcentaje del día. Si hay una causa clara y
comprobada, dila en una frase; si no, no la inventes.

**2. Inteligencia artificial.** Las dos o tres noticias de las últimas 24–48
horas que merecen su tiempo, cada una en una línea con su fuente. Busca en la
web; no tires de memoria.

**3. Estudio.** Un repaso para hoy: un tema concreto de sus asignaturas de 4.º
de Medicina con tres preguntas rápidas de autoevaluación (las respuestas, al
final del mensaje). Si en su Drive hay un plan de repaso o fechas de examen,
sigue ese plan.

**4. Contenido.** Una idea de publicación para @miguelpaleteiro con el gancho
ya escrito y la fuente en la que se apoya. Que no repita la del día anterior.

Si un bloque falla (sin red, sin datos), dilo en una línea y entrega el resto.
Los lunes, añade al final una línea con lo que conviene preparar esa semana.
