"""Generate placeholder PNG screenshots for the README.

Run with: `uv run --with pillow python docs/screenshots/make-placeholders.py`

Replace each output with a real screenshot before publishing.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent

SHOTS = [
    ("01-hero.png", 1280, 720, "Landing — hero, chat box, three example prompts"),
    ("02-chat.png", 1280, 720, "Chat — streamed answer + tool pills + chart"),
    ("03-chart-mobile.png", 390, 844, "Chat on mobile — chart renders responsively"),
    ("04-sources.png", 1280, 720, "Sources panel — EMBER + EU ETS pills"),
]


def make(path: Path, w: int, h: int, label: str) -> None:
    img = Image.new("RGB", (w, h), color="#06080d")
    draw = ImageDraw.Draw(img)
    # Subtle grid
    for x in range(0, w, 80):
        draw.line([(x, 0), (x, h)], fill="#11182a", width=1)
    for y in range(0, h, 80):
        draw.line([(0, y), (w, y)], fill="#11182a", width=1)
    # Brand mark
    try:
        font_brand = ImageFont.truetype("Helvetica.ttc", size=24)
        font_label = ImageFont.truetype("Helvetica.ttc", size=18)
    except (OSError, IOError):
        font_brand = ImageFont.load_default()
        font_label = ImageFont.load_default()
    draw.text((40, 32), "FLUX", fill="#5eead4", font=font_brand)
    draw.text((40, h // 2 - 12), label, fill="#e8ecf3", font=font_label)
    draw.text((40, h // 2 + 16), "(placeholder — replace with real screenshot)", fill="#5b6473", font=font_label)
    img.save(path, optimize=True)
    print(f"wrote {path} ({w}x{h})")


def main() -> None:
    for name, w, h, label in SHOTS:
        make(HERE / name, w, h, label)


if __name__ == "__main__":
    main()
