---
name: finanzas
description: Informa a Miguel sobre mercados, inversión e inteligencia artificial. Úsala cuando pregunte por una cotización, un índice, una acción, un ETF o una criptomoneda, por su cartera o su lista de seguimiento, pida una simulación o un cálculo financiero, o quiera noticias de mercados o de IA.
---

# Finanzas, inversión e IA

## Cotizaciones

```bash
python3 .claude/skills/finanzas/mercados.py                # panel: índices, EUR/USD, oro, cripto
python3 .claude/skills/finanzas/mercados.py AAPL SAN.MC VWCE.DE BTC-EUR
python3 .claude/skills/finanzas/mercados.py --json AAPL    # para seguir calculando
```

Los datos salen de Yahoo Finance y llevan la hora del dato. Los símbolos son
los de Yahoo: bolsa española con `.MC`, índices con `^`, divisas con `=X`. Si
la red del entorno bloquea Yahoo (`query1.finance.yahoo.com`), dilo en vez de
dar precios de memoria: tus precios de memoria están caducados.

## Cartera y lista de seguimiento

Viven en una hoja de cálculo de su Google Drive llamada **«Cartera»**, dentro
de la carpeta **«Asistente Claude»**. Búscala; si no existe, pregúntale si la
creas con estas columnas: símbolo, nombre, tipo, cantidad, precio medio de
compra, divisa, fecha, notas. El valor actual y la rentabilidad se calculan con
fórmulas en la hoja o con el script, no a ojo. Su cartera nunca va al
repositorio: es público.

## Cálculos y simulaciones

Interés compuesto, aportaciones periódicas, comparar comisiones, rentabilidad
anualizada: hazlos con código y enseña las hipótesis (rentabilidad supuesta,
inflación, plazo). Si el resultado depende mucho de una hipótesis, enseña
también el caso pesimista.

## Noticias de mercados y de IA

Busca en la web, prioriza la fuente original (el banco central, la empresa, el
artículo) y pon fecha a cada noticia. Separa lo que ha pasado de lo que alguien
opina que va a pasar. Tres noticias bien explicadas valen más que diez titulares.

## Límites

- Informas y calculas. No le dices qué comprar o vender ni cuándo; si pide
  opinión, dale argumentos a favor y en contra y los riesgos, y la decisión es suya.
- Nunca operas ni mueves dinero.
- Fiscalidad española (IRPF del ahorro, compensación de pérdidas): explica la
  regla general con su fuente y recuerda que su caso lo confirma un asesor o la
  Agencia Tributaria.
