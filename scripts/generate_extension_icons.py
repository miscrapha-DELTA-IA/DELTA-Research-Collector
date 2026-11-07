#!/usr/bin/env python3
"""Create extension toolbar PNG icons from the approved DELTA Research Collector logo.

This is a design-asset conversion only; it changes no collector behavior.
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "branding" / "delta-logo.webp"
ICONS = ROOT / "icons"

def main() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"Missing approved logo: {SOURCE}")
    im = Image.open(SOURCE).convert("RGB")
    width, height = im.size
    # Use the emblem only: a toolbar icon has no space for the wordmark.
    crop = (round(width * .11), round(height * .048),
            round(width * .89), round(height * .69))
    emblem = im.crop(crop)
    base = Image.new("RGB", (1024, 1024), "#ffffff")
    graphic = ImageOps.contain(emblem, (952, 952), Image.Resampling.LANCZOS)
    base.paste(graphic, ((1024 - graphic.width) // 2, (1024 - graphic.height) // 2))
    ICONS.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        path = ICONS / f"{size}.png"
        base.resize((size, size), Image.Resampling.LANCZOS).save(path, "PNG", optimize=True)
        with Image.open(path) as verify:
            assert verify.size == (size, size)
        print(f"Generated {path.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
