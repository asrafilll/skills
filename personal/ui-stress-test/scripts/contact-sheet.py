#!/usr/bin/env python3
"""Tile full-page screenshots (one width per folder) into contact sheets, so every page gets looked at.

Usage: python3 contact-sheet.py <screenshot-dir> [--per-sheet 6] [--height 1100] [--col 390]

Reads every .png in <screenshot-dir> (sorted by name; name files <role>_<route>.png),
scales each to --col px wide (390 by default; use 560 or more for tablet and desktop
screenshots so text stays legible), keeps the top <height> px (the first screen or so, where
layout problems show first), and writes <screenshot-dir>/sheets/sheet-NN.png with the
file name above each column. Prints the sheet paths. Needs Pillow (pip install pillow);
without it, exits 2 and you look at the screenshots one by one instead.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is not installed (pip install pillow); look at the screenshots one by one instead.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--per-sheet", type=int, default=6)
    ap.add_argument("--height", type=int, default=1100)
    ap.add_argument("--col", type=int, default=390)
    a = ap.parse_args()
    src = Path(a.dir)
    files = sorted(p for p in src.glob("*.png"))
    if not files:
        print(f"no .png files in {src}", file=sys.stderr)
        return 1
    out = src / "sheets"
    out.mkdir(exist_ok=True)
    w, gap, label = a.col, 10, 24
    for i in range(0, len(files), a.per_sheet):
        group = files[i : i + a.per_sheet]
        sheet = Image.new("RGB", (len(group) * (w + gap), a.height + label), "white")
        draw = ImageDraw.Draw(sheet)
        for j, f in enumerate(group):
            im = Image.open(f).convert("RGB")
            im = im.resize((w, max(1, round(im.height * w / im.width))))
            sheet.paste(im.crop((0, 0, w, min(im.height, a.height))), (j * (w + gap), label))
            draw.text((j * (w + gap) + 4, 6), f.stem[:60], fill="black")
        path = out / f"sheet-{i // a.per_sheet:02d}.png"
        sheet.save(path)
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
