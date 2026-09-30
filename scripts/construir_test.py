"""Construye la copia de PRUEBA de Group Memory en la carpeta de mods del juego.

El repo (esta carpeta) no vive en mods\\: ahi puede estar instalada la version publicada de
Community Mods y dos mods con el mismo identifier chocan. La copia de prueba lleva:
  - identifier  com.pa.pabloandclaude.groupmemorytest
  - display_name "Group Memory (TEST)"
  - carpeta propia ui/mods/<id test>/
Activar solo UNA de las dos a la vez: comparten localStorage y ambas envuelven api.select.

Uso: python scripts/construir_test.py   (despues: reiniciar el juego, o F5 si solo cambio JS).
"""
import json
import os
import shutil

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODS = os.path.join(os.environ["LOCALAPPDATA"], "Uber Entertainment", "Planetary Annihilation", "mods")

ID = "com.pa.pabloandclaude.groupmemory"
ID_TEST = ID + "test"
DESTINO = os.path.join(MODS, ID_TEST)
TEXTO = (".js", ".json", ".html", ".css")


def cambiar(texto):
    return texto.replace(ID, ID_TEST)


def main():
    if os.path.exists(DESTINO):
        shutil.rmtree(DESTINO)
    for raiz, _, archivos in os.walk(os.path.join(REPO, "ui")):
        rel = os.path.relpath(raiz, REPO).replace("\\", "/") + "/"
        rel_test = cambiar(rel)
        os.makedirs(os.path.join(DESTINO, rel_test), exist_ok=True)
        for a in archivos:
            src = os.path.join(raiz, a)
            dst = os.path.join(DESTINO, rel_test, a)
            if a.endswith(TEXTO):
                with open(src, encoding="utf-8") as f:
                    t = f.read()
                with open(dst, "w", encoding="utf-8", newline="") as f:
                    f.write(cambiar(t))
            else:
                shutil.copy2(src, dst)
    with open(os.path.join(REPO, "modinfo.json"), encoding="utf-8") as f:
        info = json.loads(cambiar(f.read()))
    info["display_name"] += " (TEST)"
    info["description"] = "TEST BUILD - do not publish. " + info["description"]
    with open(os.path.join(DESTINO, "modinfo.json"), "w", encoding="utf-8") as f:
        json.dump(info, f, indent=2, ensure_ascii=False)
    # Ninguna referencia a la version publicada debe quedar en la copia.
    restos = []
    for raiz, _, archivos in os.walk(DESTINO):
        for a in archivos:
            if a.endswith(TEXTO):
                with open(os.path.join(raiz, a), encoding="utf-8") as f:
                    for n, linea in enumerate(f, 1):
                        if ID in linea.replace(ID_TEST, ""):
                            restos.append("%s:%d" % (os.path.join(raiz, a), n))
    if restos:
        raise SystemExit("Quedan referencias al identifier publicado: " + ", ".join(restos))
    print("Copia TEST lista en", DESTINO)


if __name__ == "__main__":
    main()
