#!/usr/bin/env python3
"""Cotizaciones de mercado desde Yahoo Finance (sin clave, solo biblioteca estándar).

Uso:
    python3 mercados.py                 # panel por defecto (índices, divisa, oro, cripto)
    python3 mercados.py AAPL MSFT SAN.MC BTC-USD
    python3 mercados.py --json AAPL

Los símbolos son los de Yahoo Finance: acciones de EE. UU. tal cual (AAPL), bolsa
española con .MC (SAN.MC), índices con ^ (^GSPC), divisas con =X (EURUSD=X),
cripto con -USD o -EUR (BTC-EUR), ETF europeos con su sufijo de mercado (VWCE.DE).
"""
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

PANEL = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "Nasdaq"),
    ("^IBEX", "IBEX 35"),
    ("^STOXX50E", "Euro Stoxx 50"),
    ("URTH", "MSCI World (ETF)"),
    ("EURUSD=X", "EUR/USD"),
    ("GC=F", "Oro"),
    ("BTC-EUR", "Bitcoin (EUR)"),
    ("ETH-EUR", "Ethereum (EUR)"),
]


def cotizacion(simbolo):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(simbolo) + "?range=1mo&interval=1d")
    peticion = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(peticion, timeout=20) as respuesta:
        datos = json.load(respuesta)
    resultado = datos["chart"]["result"][0]
    meta = resultado["meta"]
    cierres = [c for c in resultado["indicators"]["quote"][0]["close"] if c is not None]
    precio = meta["regularMarketPrice"]
    # El último cierre de la serie es la sesión en curso (o la última); el anterior
    # es la referencia para la variación diaria.
    anterior = cierres[-2] if len(cierres) >= 2 else meta.get("chartPreviousClose")
    hace_un_mes = cierres[0] if cierres else None

    def variacion(base):
        return None if not base else (precio - base) / base * 100

    return {
        "simbolo": simbolo,
        "nombre": meta.get("shortName") or meta.get("longName") or simbolo,
        "precio": precio,
        "divisa": meta.get("currency"),
        "var_dia_pct": variacion(anterior),
        "var_mes_pct": variacion(hace_un_mes),
        "hora_dato_utc": datetime.fromtimestamp(
            meta["regularMarketTime"], timezone.utc).strftime("%Y-%m-%d %H:%M"),
    }


def formato(valor, decimales=2, signo=False):
    if valor is None:
        return "s/d"
    texto = f"{valor:+,.{decimales}f}" if signo else f"{valor:,.{decimales}f}"
    return texto.replace(",", " ").replace(".", ",")  # 1 234,56


def main():
    argumentos = sys.argv[1:]
    en_json = "--json" in argumentos
    simbolos = [a for a in argumentos if not a.startswith("--")]
    lista = [(s, None) for s in simbolos] or PANEL
    filas, fallos = [], []
    for simbolo, etiqueta in lista:
        try:
            fila = cotizacion(simbolo)
            if etiqueta:
                fila["nombre"] = etiqueta
            filas.append(fila)
        except Exception as error:  # símbolo inexistente, sin red, etc.
            fallos.append(f"{simbolo}: {error}")
    if en_json:
        print(json.dumps({"cotizaciones": filas, "fallos": fallos}, ensure_ascii=False, indent=1))
    else:
        for f in filas:
            decimales = 4 if abs(f["precio"]) < 10 else 2
            print(f"{f['nombre'][:24]:<24} {formato(f['precio'], decimales):>12} {f['divisa'] or '':<4}"
                  f" día {formato(f['var_dia_pct'], 2, True):>7} %"
                  f"  mes {formato(f['var_mes_pct'], 2, True):>7} %"
                  f"  ({f['hora_dato_utc']} UTC)")
        for fallo in fallos:
            print("SIN DATO  " + fallo)
    return 1 if fallos and not filas else 0


if __name__ == "__main__":
    sys.exit(main())
