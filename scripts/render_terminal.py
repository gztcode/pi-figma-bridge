#!/usr/bin/env python3
"""
render_terminal.py — 把一段终端输出渲染成 PNG，给 README 当 hero 截图。

依赖：Pillow（标准库之外的唯一依赖）。
字体：macOS 优先 Menlo / SF Mono，回退到 Pillow 自带 DejaVu Sans Mono。
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import cast

from PIL import Image, ImageDraw, ImageFont

# ----- macOS fonts -----
FONT_CANDIDATES = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/SFNSMono.ttf",
    "/Library/Fonts/Menlo.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
]


def load_font(size: int) -> ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            try:
                return cast(ImageFont.ImageFont, ImageFont.truetype(path, size))
            except OSError:
                continue
    return cast(ImageFont.ImageFont, ImageFont.load_default())


# ----- ANSI → tokens -----
ANSI_COLORS: dict[str, tuple[int, int, int]] = {
    "30": (76, 79, 105),    # black (dim)
    "31": (243, 139, 168),  # red
    "32": (166, 227, 161),  # green
    "33": (250, 179, 135),  # yellow
    "34": (137, 180, 250),  # blue
    "35": (203, 166, 247),  # magenta
    "36": (148, 226, 213),  # cyan
    "37": (205, 214, 244),  # white-ish
    "90": (108, 112, 134),  # bright black (dim gray)
    "91": (243, 139, 168),
    "92": (166, 227, 161),
    "93": (250, 179, 135),
    "94": (137, 180, 250),
    "95": (203, 166, 247),
    "96": (148, 226, 213),
    "97": (255, 255, 255),
}

# Catppuccin Mocha-ish palette to match a real terminal
BG = (30, 30, 46)              # base
BG_CHROME = (49, 50, 68)      # mantle-ish for title bar
FG_DEFAULT = (205, 214, 244)   # text
FG_DIM = (108, 112, 134)       # subtle gray
ACCENT = (137, 180, 250)      # blue accent for selection / heading


def parse_line(line: str) -> list[tuple[str, tuple[int, int, int], bool]]:
    """把一行字符串切成 (text, color, bold) 段。粗体简单实现：bold=True 时用更亮颜色。"""
    segments: list[tuple[str, tuple[int, int, int], bool]] = []
    i = 0
    color = FG_DEFAULT
    bold = False
    while i < len(line):
        if line[i] == "\x1b" and i + 1 < len(line) and line[i + 1] == "[":
            j = line.find("m", i + 2)
            if j == -1:
                i += 1
                continue
            seq = line[i + 2 : j]
            i = j + 1
            if seq == "0" or seq == "":
                color, bold = FG_DEFAULT, False
            elif seq == "1":
                bold = True
            elif seq == "22":
                bold = False
            elif seq in ("39",):
                color = FG_DEFAULT
            elif seq in ANSI_COLORS:
                color = ANSI_COLORS[seq]
                if bold:
                    color = cast(tuple[int, int, int], tuple(min(255, c + 30) for c in color))
        else:
            j = line.find("\x1b", i)
            if j == -1:
                j = len(line)
            segments.append((line[i:j], color, bold))
            i = j
    return segments


def render(lines: list[str], title: str, out_path: Path) -> None:
    font = load_font(22)
    line_h = 32
    pad_x = 28
    pad_y_top = 70  # title bar
    pad_y_bot = 28

    # figure widths
    tmp_img = Image.new("RGB", (1, 1))
    tmp_draw = ImageDraw.Draw(tmp_img)
    max_w = 0
    for line in lines:
        w = tmp_draw.textlength(line, font=font)
        max_w = max(max_w, int(w))
    width = max_w + pad_x * 2
    height = len(lines) * line_h + pad_y_top + pad_y_bot

    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img)

    # title bar
    draw.rectangle([(0, 0), (width, pad_y_top - 8)], fill=BG_CHROME)
    # 3 macOS dots
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        cx = 24 + i * 24
        draw.ellipse([(cx - 6, 28), (cx + 6, 40)], fill=c)
    # title
    title_font = load_font(16)
    tw = draw.textlength(title, font=title_font)
    draw.text(((width - tw) / 2, 30), title, fill=FG_DIM, font=title_font)
    # hairline
    draw.line([(0, pad_y_top - 8), (width, pad_y_top - 8)], fill=(69, 71, 90))

    # body
    y = pad_y_top
    for line in lines:
        x = pad_x
        for text, color, _bold in parse_line(line):
            draw.text((x, y), text, fill=color, font=font)
            x += draw.textlength(text, font=font)
        y += line_h

    img.save(out_path)
    print(f"wrote {out_path}  ({width}x{height})")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="包含终端输出的文本文件 (UTF-8)")
    p.add_argument("--title", required=True, help="窗口标题栏文字")
    p.add_argument("--out", required=True, help="输出 PNG 路径")
    p.add_argument("--strip", action="store_true", help="去掉 ANSI 转义后渲染")
    args = p.parse_args()

    raw = Path(args.input).read_text(encoding="utf-8")
    if args.strip:
        import re
        raw = re.sub(r"\x1b\[[0-9;]*m", "", raw)
    lines = raw.rstrip("\n").split("\n")
    render(lines, args.title, Path(args.out))


if __name__ == "__main__":
    main()
