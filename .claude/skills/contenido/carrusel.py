#!/usr/bin/env python3
"""Genera carruseles de Instagram con la marca de @miguelpaleteiro.

Uso:
    python3 carrusel.py guion.json carpeta_de_salida

Necesita Pillow (pip install pillow). Escribe diapositiva-01.png, -02.png, ...

El guion es un JSON como este (todos los campos de texto son opcionales salvo
los que definen cada tipo):

{
  "serie": "¿Mito o verdad?",        // rótulo pequeño de arriba
  "tema": "claro",                    // "claro" u "oscuro"
  "formato": "4:5",                   // "4:5" (1080x1350), "3:4", "1:1" o "9:16"
  "diapositivas": [
    {"tipo": "portada",   "titulo": "...", "subtitulo": "..."},
    {"tipo": "texto",     "titulo": "...", "texto": "...", "fuente": "Autor, año, revista"},
    {"tipo": "dato",      "dato": "7 días", "texto": "...", "fuente": "..."},
    {"tipo": "lista",     "titulo": "...", "puntos": ["...", "..."], "fuente": "..."},
    {"tipo": "veredicto", "veredicto": "MITO", "titulo": "la frase", "texto": "...", "fuente": "..."},
    {"tipo": "cierre",    "titulo": "...", "texto": "..."}
  ]
}

En "texto", una línea en blanco separa párrafos. Las tipografías solo cubren el
alfabeto latino: sin emojis ni flechas. Si un carácter no existe, el programa
se detiene y dice cuál es en lugar de pintar un recuadro vacío.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
FUENTES = AQUI / "fuentes"
USUARIO = "@miguelpaleteiro"

# Colores de miguelpaleteiro.github.io (variables CSS de la web).
TEMAS = {
    "claro": {"fondo": "#F8F7F2", "tinta": "#1D212B", "tenue": "#565E6E",
              "linea": "#C3C8D2", "rojo": "#CF2E1C", "sobre_rojo": "#FFFFFF"},
    "oscuro": {"fondo": "#252933", "tinta": "#F0F1F4", "tenue": "#AEB4C2",
               "linea": "#474D5B", "rojo": "#F2553F", "sobre_rojo": "#1D212B"},
}
FORMATOS = {"4:5": (1080, 1350), "3:4": (1080, 1440), "1:1": (1080, 1080), "9:16": (1080, 1920)}
MARGEN = 84


def fuente(nombre, cuerpo):
    return ImageFont.truetype(str(FUENTES / nombre), cuerpo)


def titular(cuerpo):
    return fuente("Anton-Regular.ttf", cuerpo)


def cuerpo_texto(cuerpo, negrita=False):
    return fuente("InstrumentSans-SemiBold.ttf" if negrita else "InstrumentSans-Regular.ttf", cuerpo)


def mono(cuerpo):
    return fuente("IBMPlexMono-Medium.ttf", cuerpo)


def caracteres_sin_glifo(tipografia, texto):
    """Caracteres de `texto` que la tipografía pintaría como recuadro vacío."""
    vacio = bytes(tipografia.getmask("￿"))
    return sorted({c for c in texto
                   if not c.isspace() and bytes(tipografia.getmask(c)) == vacio})


def partir(dibujo, texto, tipografia, ancho):
    """Divide `texto` en líneas que caben en `ancho` píxeles."""
    lineas = []
    for parrafo in texto.split("\n"):
        actual = ""
        for palabra in parrafo.split():
            prueba = f"{actual} {palabra}".strip()
            if not actual or dibujo.textlength(prueba, font=tipografia) <= ancho:
                actual = prueba
            else:
                lineas.append(actual)
                actual = palabra
        lineas.append(actual)
    return lineas


class Lienzo:
    def __init__(self, tamano, tema, serie, numero, total):
        self.ancho, self.alto = tamano
        self.c = TEMAS[tema]
        self.imagen = Image.new("RGB", tamano, self.c["fondo"])
        self.d = ImageDraw.Draw(self.imagen)
        self.util = self.ancho - 2 * MARGEN
        self.avisos = []
        self._cabecera(serie)
        self._pie(numero, total)
        self.techo = MARGEN + 90          # donde empieza el contenido
        self.suelo = self.alto - MARGEN - 80  # donde termina

    # -- piezas fijas -------------------------------------------------------
    def _cabecera(self, serie):
        self.d.rectangle([MARGEN, MARGEN, MARGEN + 22, MARGEN + 22], fill=self.c["rojo"])
        if serie:
            self.escribir(serie.upper(), mono(28), self.c["tenue"], MARGEN + 40, MARGEN - 6)

    def _pie(self, numero, total):
        y = self.alto - MARGEN - 46
        self.d.line([MARGEN, y, self.ancho - MARGEN, y], fill=self.c["linea"], width=2)
        self.escribir(USUARIO, mono(28), self.c["tinta"], MARGEN, y + 18)
        cuenta = f"{numero}/{total}"
        tipografia = mono(28)
        x = self.ancho - MARGEN - self.d.textlength(cuenta, font=tipografia)
        self.escribir(cuenta, tipografia, self.c["tenue"], x, y + 18)

    # -- texto --------------------------------------------------------------
    def escribir(self, texto, tipografia, color, x, y):
        faltan = caracteres_sin_glifo(tipografia, texto)
        if faltan:
            raise SystemExit(
                "La tipografía no tiene estos caracteres: " + " ".join(faltan)
                + f"\nEstán en el texto: {texto!r}\nCámbialos por texto normal (sin emojis ni símbolos).")
        self.d.text((x, y), texto, font=tipografia, fill=color)

    def bloque(self, texto, hacer_fuente, cuerpo, color, y, interlinea=1.3,
               max_lineas=None, minimo=None, ancho=None, x=MARGEN, mayusculas=False,
               pintar=True):
        """Escribe un bloque con salto de línea; encoge el cuerpo si no cabe en
        `max_lineas`. Devuelve la coordenada y donde termina. Con pintar=False
        solo mide."""
        if not texto:
            return y
        if mayusculas:
            texto = texto.upper()
        ancho = ancho or self.util
        minimo = minimo or cuerpo
        while True:
            tipografia = hacer_fuente(cuerpo)
            lineas = partir(self.d, texto, tipografia, ancho)
            desborda = max(self.d.textlength(l, font=tipografia) for l in lineas) > ancho
            if (max_lineas is None or len(lineas) <= max_lineas) and not desborda:
                break
            if cuerpo <= minimo:
                if pintar:
                    self.avisos.append(f"texto demasiado largo, acórtalo: {texto[:60]!r}")
                break
            cuerpo -= 4
        salto = int(cuerpo * interlinea)
        for linea in lineas:
            if linea:
                if pintar:
                    self.escribir(linea, tipografia, color, x, y)
                y += salto
            else:
                y += salto // 2  # línea en blanco = separación de párrafo
        if hacer_fuente is titular:
            y += int(cuerpo * 0.2)  # Anton baja mucho: aire antes de lo siguiente
        return y

    def referencia(self, texto):
        """Fuente del dato, pegada al pie. Devuelve el nuevo suelo del contenido."""
        if not texto:
            return self.suelo
        tipografia = mono(24)
        lineas = partir(self.d, "FUENTE · " + texto, tipografia, self.util)
        y = self.suelo - len(lineas) * 34
        inicio = y
        for linea in lineas:
            self.escribir(linea, tipografia, self.c["tenue"], MARGEN, y)
            y += 34
        return inicio - 30

    def comprobar(self, y, suelo):
        if y > suelo:
            self.avisos.append(f"el contenido se sale por abajo ({y - suelo} px): quita texto")

    def flecha(self, x, y, largo=90):
        c = self.c["rojo"]
        self.d.line([x, y, x + largo, y], fill=c, width=8)
        self.d.polygon([(x + largo + 22, y), (x + largo - 6, y - 20), (x + largo - 6, y + 20)], fill=c)


# -- tipos de diapositiva ----------------------------------------------------
def portada(l, s):
    y = l.techo + 60
    l.d.rectangle([MARGEN, y, MARGEN + 160, y + 14], fill=l.c["rojo"])
    inicio, limite = y + 60, l.suelo - 80

    def componer(cuerpo, pintar):
        fin = l.bloque(s.get("titulo", ""), titular, cuerpo, l.c["tinta"], inicio, interlinea=1.12,
                       max_lineas=6, minimo=min(cuerpo, 84), mayusculas=True, pintar=pintar)
        return l.bloque(s.get("subtitulo", ""), cuerpo_texto, 46, l.c["tenue"], fin + 10,
                        max_lineas=4, minimo=38, pintar=pintar)

    cuerpo = 156  # el titular más grande con el que título y subtítulo caben
    while cuerpo > 84 and componer(cuerpo, pintar=False) > limite:
        cuerpo -= 6
    l.comprobar(componer(cuerpo, pintar=True), limite)
    l.escribir("DESLIZA", mono(28), l.c["rojo"], MARGEN, l.suelo - 40)
    l.flecha(MARGEN + 150, l.suelo - 20)


def texto(l, s):
    suelo = l.referencia(s.get("fuente"))
    y = l.bloque(s.get("titulo", ""), titular, 88, l.c["tinta"], l.techo + 30, interlinea=1.14,
                 max_lineas=3, minimo=60, mayusculas=True)
    y = l.bloque(s.get("texto", ""), cuerpo_texto, 46, l.c["tinta"], y + 20, interlinea=1.38,
                 max_lineas=13, minimo=36)
    l.comprobar(y, suelo)


def dato(l, s):
    suelo = l.referencia(s.get("fuente"))
    y = l.bloque(s.get("dato", ""), titular, 300, l.c["rojo"], l.techo + 40, interlinea=1.1,
                 max_lineas=1, minimo=120, mayusculas=True)
    y = l.bloque(s.get("texto", ""), cuerpo_texto, 50, l.c["tinta"], y + 10, interlinea=1.38,
                 max_lineas=9, minimo=38)
    l.comprobar(y, suelo)


def lista(l, s):
    suelo = l.referencia(s.get("fuente"))
    y = l.bloque(s.get("titulo", ""), titular, 84, l.c["tinta"], l.techo + 30, interlinea=1.14,
                 max_lineas=3, minimo=60, mayusculas=True)
    y += 30
    puntos = s.get("puntos", [])
    cuerpo = 44 if len(puntos) <= 4 else 38
    for numero, punto in enumerate(puntos, 1):
        l.escribir(str(numero), titular(64), l.c["rojo"], MARGEN, y - 12)
        fin = l.bloque(punto, cuerpo_texto, cuerpo, l.c["tinta"], y, interlinea=1.32,
                       ancho=l.util - 90, x=MARGEN + 90)
        y = max(fin, y + 70) + 26
    l.comprobar(y - 26, suelo)


def veredicto(l, s):
    suelo = l.referencia(s.get("fuente"))
    y = l.bloque("«" + s.get("titulo", "") + "»", cuerpo_texto, 50, l.c["tenue"], l.techo + 30,
                 interlinea=1.3, max_lineas=4, minimo=38)
    # Sello girado con el veredicto.
    palabra = s.get("veredicto", "MITO").upper()
    tipografia = titular(150)
    ancho_palabra = int(l.d.textlength(palabra, font=tipografia))
    sello = Image.new("RGBA", (ancho_palabra + 110, 250), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sello)
    ds.rounded_rectangle([6, 6, sello.width - 6, sello.height - 6], radius=24,
                         outline=l.c["rojo"], width=12)
    faltan = caracteres_sin_glifo(tipografia, palabra)
    if faltan:
        raise SystemExit("La tipografía no tiene estos caracteres: " + " ".join(faltan))
    ds.text((sello.width // 2, sello.height // 2 - 6), palabra, font=tipografia,
            fill=l.c["rojo"], anchor="mm")
    sello = sello.rotate(-5, expand=True, resample=Image.BICUBIC)
    l.imagen.paste(sello, (MARGEN - 6, y + 10), sello)
    y += sello.height + 40
    y = l.bloque(s.get("texto", ""), cuerpo_texto, 46, l.c["tinta"], y, interlinea=1.38,
                 max_lineas=10, minimo=36)
    l.comprobar(y, suelo)


def cierre(l, s):
    y = l.bloque(s.get("titulo", ""), titular, 120, l.c["tinta"], l.techo + 60, interlinea=1.12,
                 max_lineas=4, minimo=72, mayusculas=True)
    y = l.bloque(s.get("texto", ""), cuerpo_texto, 46, l.c["tenue"], y + 10, interlinea=1.38,
                 max_lineas=6, minimo=38)
    tipografia = titular(72)
    ancho_boton = int(l.d.textlength(USUARIO.upper(), font=tipografia)) + 80
    alto_boton = 130
    y_boton = max(y + 50, l.suelo - alto_boton - 20)
    l.comprobar(y + 50, l.suelo - alto_boton - 20)
    l.d.rounded_rectangle([MARGEN, y_boton, MARGEN + ancho_boton, y_boton + alto_boton],
                          radius=18, fill=l.c["rojo"])
    l.d.text((MARGEN + ancho_boton // 2, y_boton + alto_boton // 2 - 4), USUARIO.upper(),
             font=tipografia, fill=l.c["sobre_rojo"], anchor="mm")


TIPOS = {"portada": portada, "texto": texto, "dato": dato, "lista": lista,
         "veredicto": veredicto, "cierre": cierre}


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    guion = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    salida = Path(sys.argv[2])
    salida.mkdir(parents=True, exist_ok=True)
    tema = guion.get("tema", "claro")
    formato = guion.get("formato", "4:5")
    if tema not in TEMAS:
        raise SystemExit(f"tema desconocido: {tema!r} (usa claro u oscuro)")
    if formato not in FORMATOS:
        raise SystemExit(f"formato desconocido: {formato!r} (usa {', '.join(FORMATOS)})")
    diapositivas = guion.get("diapositivas", [])
    if not diapositivas:
        raise SystemExit("el guion no tiene diapositivas")
    hay_avisos = False
    for numero, s in enumerate(diapositivas, 1):
        tipo = s.get("tipo", "texto")
        if tipo not in TIPOS:
            raise SystemExit(f"diapositiva {numero}: tipo desconocido {tipo!r} (usa {', '.join(TIPOS)})")
        lienzo = Lienzo(FORMATOS[formato], tema, guion.get("serie", ""), numero, len(diapositivas))
        TIPOS[tipo](lienzo, s)
        archivo = salida / f"diapositiva-{numero:02d}.png"
        lienzo.imagen.save(archivo)
        print(archivo)
        for aviso in lienzo.avisos:
            hay_avisos = True
            print(f"  AVISO diapositiva {numero}: {aviso}")
    return 2 if hay_avisos else 0


if __name__ == "__main__":
    sys.exit(main())
