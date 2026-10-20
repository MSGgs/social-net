#!/usr/bin/env python3
"""
Генерирует демо-медиа для автономной сборки (npm run build:demo):
плоские иллюстрации вместо фото и зацикленные анимированные ролики вместо видео.
Нужны Pillow, numpy и ffmpeg с libx264. Результат — public/media/*.jpg|*.mp4.

    python3 scripts/gen-demo-media.py
"""
import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'media')
FPS = 24
SECONDS = 6
VW, VH = 360, 640
TAU = 2 * math.pi
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


# ---------- примитивы ----------

def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def gradient(w, h, stops):
    """Вертикальный градиент: stops = [(0..1, '#rrggbb'), ...]"""
    y = np.linspace(0, 1, h)
    pos = [p for p, _ in stops]
    cols = [hexrgb(c) for _, c in stops]
    arr = np.zeros((h, w, 3), dtype=np.float32)
    for ch in range(3):
        arr[..., ch] = np.interp(y, pos, [c[ch] for c in cols])[:, None]
    return Image.fromarray(arr.astype(np.uint8), 'RGB')


def overlay(img, draw_fn):
    """Рисование с прозрачностью поверх картинки"""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    base = img.convert('RGBA')
    base.alpha_composite(layer)
    return base.convert('RGB')


def glow(img, xy, r, color, strength=120):
    def fn(d):
        for i in range(10, 0, -1):
            rr = r * (1 + i * 0.35)
            d.ellipse([xy[0] - rr, xy[1] - rr, xy[0] + rr, xy[1] + rr], fill=(*hexrgb(color), int(strength / (i * 1.6))))
    return overlay(img, fn)


def mountains(d, w, base, peaks, color, snow=None):
    """peaks: [(x, высота, полуширина)]"""
    for x, hgt, hw in peaks:
        top = base - hgt
        d.polygon([(x - hw, base), (x, top), (x + hw, base)], fill=color)
        if snow:
            k = 0.28
            d.polygon(
                [(x - hw * k, top + hgt * k), (x, top), (x + hw * k, top + hgt * k),
                 (x + hw * k * 0.4, top + hgt * k * 0.8), (x, top + hgt * k * 1.05), (x - hw * k * 0.5, top + hgt * k * 0.8)],
                fill=snow,
            )
    d.rectangle([0, base, w, base + 4], fill=color)


def pine(d, x, y, s, color):
    for i in range(3):
        top = y - s * (1.0 - i * 0.28)
        hw = s * (0.22 + i * 0.07)
        d.polygon([(x, top), (x - hw, top + s * 0.45), (x + hw, top + s * 0.45)], fill=color)
    d.rectangle([x - s * 0.03, y - s * 0.12, x + s * 0.03, y + s * 0.02], fill='#3b2a1e')


def water(img, top, stops, lines_color, phase=0.0, rng=None):
    w, h = img.size
    sea = gradient(w, h - top, stops)
    img.paste(sea, (0, top))
    rng = rng or random.Random(1)
    rows = [(rng.random(), rng.random(), rng.uniform(0.2, 0.6)) for _ in range(40)]

    def fn(d):
        for ry, rx, ln in rows:
            y = top + 4 + ry * (h - top - 8)
            depth = (y - top) / (h - top)
            x = ((rx + phase * (0.3 + depth)) % 1.2 - 0.1) * w
            L = w * ln * (0.2 + depth * 0.5)
            d.line([x, y, x + L, y], fill=(*hexrgb(lines_color), int(60 + 80 * depth)), width=max(1, int(1 + depth * 3)))
    return overlay(img, fn)


def grain(img, amount=6, seed=0):
    arr = np.asarray(img).astype(np.int16)
    noise = np.random.default_rng(seed).integers(-amount, amount + 1, arr.shape[:2])[..., None]
    return Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8))


# ---------- сцены: функции (w, h, t, rng) -> Image ----------

def scene_piter(w, h, t, rng, variant=0):
    skies = [
        [(0, '#f7c6d9'), (0.45, '#f4d9c6'), (0.55, '#fbe9d0')],
        [(0, '#5b6fb5'), (0.45, '#b49ad1'), (0.55, '#f3c4c4')],
        [(0, '#f6b26b'), (0.45, '#fbd6a1'), (0.55, '#fff0d6')],
    ]
    img = gradient(w, h, skies[variant % 3])
    hor = int(h * 0.56)
    img = glow(img, (w * 0.75, hor - h * 0.06), w * 0.06, '#fff4e0', 140)
    d = ImageDraw.Draw(img)
    # набережная
    x = 0
    while x < w:
        bw = rng.randint(w // 10, w // 5)
        bh = rng.randint(h // 25, h // 12)
        d.rectangle([x, hor - bh, x + bw, hor], fill='#5a4d63')
        for wx in range(x + 6, x + bw - 6, 12):
            d.rectangle([wx, hor - bh + 8, wx + 5, hor - bh + 16], fill='#f5d58c')
        x += bw
    # Петропавловский шпиль
    sx = w * 0.18
    d.rectangle([sx - 8, hor - h * 0.14, sx + 8, hor], fill='#4a3f55')
    d.polygon([(sx - 5, hor - h * 0.14), (sx, hor - h * 0.3), (sx + 5, hor - h * 0.14)], fill='#d8b25a')
    img = water(img, hor, [(0, '#9a8fb8'), (1, '#3e3a63')], '#ffe6d6', t, rng)
    d = ImageDraw.Draw(img)
    # разведённый мост
    cx, by = w * 0.5, hor + h * 0.02
    d.rectangle([cx - w * 0.36, by - 30, cx - w * 0.3, by + 30], fill='#2b2638')
    d.rectangle([cx + w * 0.3, by - 30, cx + w * 0.36, by + 30], fill='#2b2638')
    d.polygon([(cx - w * 0.3, by), (cx - w * 0.06, by - h * 0.17), (cx - w * 0.04, by - h * 0.15), (cx - w * 0.3, by + 12)], fill='#2b2638')
    d.polygon([(cx + w * 0.3, by), (cx + w * 0.06, by - h * 0.17), (cx + w * 0.04, by - h * 0.15), (cx + w * 0.3, by + 12)], fill='#2b2638')
    for side in (-1, 1):
        for i in range(6):
            px = cx + side * (w * 0.3 - i * w * 0.045)
            py = by - i * h * 0.03
            d.ellipse([px - 3, py - 3, px + 3, py + 3], fill='#ffd36b')
    return img


def scene_sochi(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#3aa0e8'), (0.5, '#a6dcf5'), (0.58, '#d9f2fb')])
    img = glow(img, (w * (0.3 + variant * 0.35), h * 0.2), w * 0.09, '#fff8d0', 180)
    d = ImageDraw.Draw(img)
    r = w * 0.09
    sx, sy = w * (0.3 + variant * 0.35), h * 0.2
    d.ellipse([sx - r, sy - r, sx + r, sy + r], fill='#fff6c9')
    mountains(d, w, int(h * 0.58), [(w * 0.1, h * 0.08, w * 0.35), (w * 0.5, h * 0.05, w * 0.4)], '#7fb3a8')
    img = water(img, int(h * 0.58), [(0, '#1f8fc9'), (1, '#0b5e8f')], '#e8fbff', t, rng)
    d = ImageDraw.Draw(img)
    beach = int(h * 0.82)
    d.polygon([(0, beach), (w, beach - h * 0.05), (w, h), (0, h)], fill='#f1d29b')
    d.polygon([(0, beach), (w, beach - h * 0.05), (w, beach - h * 0.035), (0, beach + 8)], fill='#ffffff')
    # пальма
    px, py = w * (0.8 - variant * 0.55), h * 0.95
    pts = [(px + math.sin(i / 10) * w * 0.06, py - i * h * 0.012) for i in range(40)]
    d.line(pts, fill='#6b4a2b', width=int(w * 0.03))
    tx, ty = pts[-1]
    sway = math.sin(t * TAU) * 0.08
    for a in range(0, 360, 45):
        ang = math.radians(a) + sway
        ex, ey = tx + math.cos(ang) * w * 0.2, ty + math.sin(ang) * h * 0.06 + h * 0.03
        mx, my = (tx + ex) / 2, (ty + ey) / 2 - h * 0.03
        d.polygon([(tx, ty), (mx, my - 8), (ex, ey), (mx, my + 8)], fill='#2f8f4e')
    return img


def scene_snow_mountains(w, h, t, rng, variant=0, falling=True):
    img = gradient(w, h, [(0, '#8fc2ef'), (0.6, '#e2f1fb')])
    d = ImageDraw.Draw(img)
    base = int(h * 0.62)
    peaks = [(w * rng.uniform(0, 1), h * rng.uniform(0.22, 0.4), w * rng.uniform(0.25, 0.4)) for _ in range(4)]
    mountains(d, w, base, peaks, '#6f8fb0', '#ffffff')
    mountains(d, w, int(h * 0.7), [(w * rng.uniform(0, 1), h * 0.15, w * 0.45) for _ in range(3)], '#9fb7cc', '#ffffff')
    d.rectangle([0, int(h * 0.7), w, h], fill='#f4f8fc')
    for _ in range(14 + variant * 3):
        pine(d, rng.uniform(0, w), rng.uniform(h * 0.74, h * 0.98), rng.uniform(h * 0.07, h * 0.16), '#1f4d3a')
    if falling:
        flakes = [(rng.random(), rng.random(), rng.uniform(1, 3)) for _ in range(140)]

        def fn(dd):
            for fx, fy, fs in flakes:
                y = ((fy + t * (0.5 + fs / 4)) % 1) * h
                x = (fx * w + math.sin((t + fy) * TAU) * 10) % w
                dd.ellipse([x - fs, y - fs, x + fs, y + fs], fill=(255, 255, 255, 210))
        img = overlay(img, fn)
    return img


def scene_kazan(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#2a2457'), (0.45, '#8f4f8a'), (0.62, '#f2a477')])
    base = int(h * 0.68)
    d = ImageDraw.Draw(img)
    # стены и башни кремля
    d.rectangle([0, base - h * 0.06, w, base], fill='#e9e1d2')
    for x in range(0, w, 14):
        d.rectangle([x, base - h * 0.06 - 8, x + 7, base - h * 0.06], fill='#e9e1d2')
    for tx in (w * 0.08, w * 0.92):
        d.rectangle([tx - 16, base - h * 0.13, tx + 16, base], fill='#efe7d8')
        d.polygon([(tx - 20, base - h * 0.13), (tx, base - h * 0.22), (tx + 20, base - h * 0.13)], fill='#2f7f6f')
    # Кул-Шариф: купол и минареты
    cx = w * 0.5
    d.rectangle([cx - w * 0.16, base - h * 0.14, cx + w * 0.16, base - h * 0.06], fill='#f3efe6')
    d.ellipse([cx - w * 0.11, base - h * 0.24, cx + w * 0.11, base - h * 0.1], fill='#2aa7c9')
    d.line([cx, base - h * 0.24, cx, base - h * 0.28], fill='#f6d26b', width=3)
    for mx in (cx - w * 0.22, cx - w * 0.12, cx + w * 0.12, cx + w * 0.22):
        top = base - h * (0.36 if abs(mx - cx) > w * 0.15 else 0.32)
        d.rectangle([mx - 6, top, mx + 6, base - h * 0.06], fill='#f3efe6')
        d.polygon([(mx - 8, top), (mx, top - h * 0.06), (mx + 8, top)], fill='#2aa7c9')
    # Сююмбике
    sx = w * 0.82
    for i, ww in enumerate((26, 20, 15, 11)):
        y0 = base - h * 0.06 - (i + 1) * h * 0.045
        d.rectangle([sx - ww, y0, sx + ww, y0 + h * 0.045], fill='#c9533f')
    d.polygon([(sx - 9, base - h * 0.24), (sx, base - h * 0.34), (sx + 9, base - h * 0.24)], fill='#2f7f6f')
    img = water(img, base, [(0, '#4d3b6e'), (1, '#1b1733')], '#ffcf9a', t, rng)

    def lights(dd):
        for i in range(30):
            x = (i + 0.5) * w / 30
            a = int(150 + 100 * math.sin((t * 2 + i / 7) * TAU))
            dd.ellipse([x - 3, base - 6, x + 3, base], fill=(255, 220, 140, max(0, min(255, a))))
    return overlay(img, lights)


def scene_coffee(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#8a5a3b'), (1, '#5e3b25')])
    d = ImageDraw.Draw(img)
    for y in range(0, h, 38):
        d.line([0, y + rng.randint(-4, 4), w, y + rng.randint(-4, 4)], fill='#6b4429', width=2)
    cx, cy = w * (0.5 if variant == 0 else 0.42), h * 0.48
    R = w * 0.36
    d.ellipse([cx - R + 10, cy - R + 18, cx + R + 10, cy + R + 18], fill='#3d2717')
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill='#f4f1ec')
    r = R * 0.68
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#ffffff')
    d.rounded_rectangle([cx + r * 0.9, cy - r * 0.18, cx + r * 1.5, cy + r * 0.18], radius=12, fill='#ffffff')
    c = r * 0.82
    d.ellipse([cx - c, cy - c, cx + c, cy + c], fill='#7a4a26')
    hr = c * 0.32
    d.ellipse([cx - hr * 1.6, cy - hr * 1.2, cx - hr * 0.1 + 6, cy + hr * 0.3], fill='#f1dcc0')
    d.ellipse([cx - 6 + hr * 0.1, cy - hr * 1.2, cx + hr * 1.6, cy + hr * 0.3], fill='#f1dcc0')
    d.polygon([(cx - hr * 1.5, cy - hr * 0.2), (cx, cy + hr * 1.5), (cx + hr * 1.5, cy - hr * 0.2)], fill='#f1dcc0')
    if variant:
        d.ellipse([w * 0.74, h * 0.74, w * 0.98, h * 0.98], fill='#d99b4a')
        d.ellipse([w * 0.78, h * 0.78, w * 0.94, h * 0.94], fill='#e8b46a')
    return img


def scene_elbrus(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#1d4f91'), (0.5, '#7fb2e5'), (0.62, '#f6e2c4')])
    d = ImageDraw.Draw(img)
    base = int(h * 0.7)
    mountains(d, w, base, [(w * 0.32, h * 0.42, w * 0.42), (w * 0.7, h * 0.38, w * 0.38)], '#58708f', '#ffffff')
    mountains(d, w, int(h * 0.8), [(w * 0.1, h * 0.18, w * 0.4), (w * 0.9, h * 0.2, w * 0.45)], '#3c5068', '#e9f0f7')
    d.rectangle([0, int(h * 0.8), w, h], fill='#e9eef4')
    # флаг на вершине
    fx, fy = w * 0.32, base - h * 0.42
    d.line([fx, fy, fx, fy - 40], fill='#333333', width=3)
    d.rectangle([fx, fy - 40, fx + 30, fy - 30], fill='#ffffff')
    d.rectangle([fx, fy - 30, fx + 30, fy - 20], fill='#2a5ad1')
    d.rectangle([fx, fy - 20, fx + 30, fy - 10], fill='#d6303a')
    return img


def scene_sunrise(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#ffb38a'), (0.5, '#ffd9a8'), (0.62, '#fff1d6')])
    img = glow(img, (w * 0.5, h * 0.55), w * 0.14, '#fff2c2', 200)
    d = ImageDraw.Draw(img)
    r = w * 0.14
    d.ellipse([w * 0.5 - r, h * 0.55 - r, w * 0.5 + r, h * 0.55 + r], fill='#fff4d1')
    for i, col in enumerate(('#e79a7b', '#c9767a', '#93587a')):
        base = h * (0.6 + i * 0.12)
        pts = [(x, base - math.sin(x / w * math.pi * (1.5 + i) + i + variant) * h * 0.05) for x in range(0, w + 10, 10)]
        d.polygon(pts + [(w, h), (0, h)], fill=col)
    # силуэт в позе «дерева»
    px, py = w * 0.5, h * 0.86
    d.ellipse([px - 12, py - 150, px + 12, py - 126], fill='#3a2340')
    d.line([px, py - 126, px, py - 60], fill='#3a2340', width=14)
    d.line([px, py - 60, px, py], fill='#3a2340', width=10)
    d.line([px, py - 60, px + 30, py - 40, px + 2, py - 30], fill='#3a2340', width=9)
    d.line([px - 2, py - 118, px - 20, py - 160, px, py - 190], fill='#3a2340', width=8)
    d.line([px + 2, py - 118, px + 20, py - 160, px, py - 190], fill='#3a2340', width=8)
    return img


def scene_forest_lake(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#bfe3d8'), (0.5, '#e8f4ea')])
    d = ImageDraw.Draw(img)
    base = int(h * 0.55)
    for i in range(40):
        pine(d, rng.uniform(0, w), base + rng.uniform(-10, 6), rng.uniform(h * 0.08, h * 0.2), ('#2d6a4f', '#40916c', '#1b4332')[i % 3])
    img = water(img, base, [(0, '#5aa59a'), (1, '#1f5e57')], '#e9fff6', t, rng)
    d = ImageDraw.Draw(img)
    # лодка
    bx, by = w * 0.6, h * 0.72
    d.polygon([(bx - 50, by), (bx + 50, by), (bx + 35, by + 16), (bx - 35, by + 16)], fill='#a0522d')
    return img


def scene_city_night(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#060b25'), (0.55, '#1b2a6b'), (0.75, '#3b2a6b')])
    stars = [(rng.random() * w, rng.random() * h * 0.5, rng.random()) for _ in range(90)]

    def sky(dd):
        for x, y, ph in stars:
            a = int(120 + 120 * math.sin((t * 2 + ph) * TAU))
            dd.ellipse([x - 1.2, y - 1.2, x + 1.2, y + 1.2], fill=(255, 255, 255, max(0, min(255, a))))
    img = overlay(img, sky)
    d = ImageDraw.Draw(img)
    base = int(h * 0.78)
    # Останкинская башня
    ox = w * 0.12
    d.polygon([(ox - 14, base), (ox - 3, base - h * 0.5), (ox + 3, base - h * 0.5), (ox + 14, base)], fill='#1d1f3a')
    d.ellipse([ox - 12, base - h * 0.36, ox + 12, base - h * 0.33], fill='#ff4d6d')
    # Москва-Сити
    towers = [(0.55, 0.42, 34), (0.65, 0.5, 30), (0.74, 0.46, 36), (0.84, 0.38, 30), (0.46, 0.32, 28)]
    windows = []
    for fx, fh, tw in towers:
        x = w * fx
        top = base - h * fh
        d.polygon([(x - tw / 2, base), (x - tw / 2, top + 10), (x, top), (x + tw / 2, top + 14), (x + tw / 2, base)], fill='#22305e')
        for wy in range(int(top) + 18, base - 6, 9):
            for wx in range(int(x - tw / 2) + 4, int(x + tw / 2) - 4, 7):
                if rng.random() < 0.55:
                    windows.append((wx, wy, rng.random()))
    # высотка со шпилем
    sx = w * 0.3
    for i, (ww, hh) in enumerate(((60, 0.12), (40, 0.1), (24, 0.08))):
        y0 = base - h * (0.12 + 0.1 * i)
        d.rectangle([sx - ww / 2, y0, sx + ww / 2, base], fill='#1a2147')
    d.polygon([(sx - 4, base - h * 0.34), (sx, base - h * 0.44), (sx + 4, base - h * 0.34)], fill='#e9c46a')
    d.ellipse([sx - 5, base - h * 0.46, sx + 5, base - h * 0.44], fill='#ff3b3b')

    def lights(dd):
        for wx, wy, ph in windows:
            on = math.sin((t * 3 + ph) * TAU) > -0.6
            dd.rectangle([wx, wy, wx + 3, wy + 4], fill=(255, 214, 120, 220 if on else 40))
    img = overlay(img, lights)
    d = ImageDraw.Draw(img)
    d.rectangle([0, base, w, h], fill='#0d1022')
    cars = [(rng.random(), rng.choice([1, -1]), rng.uniform(0.8, 1.6)) for _ in range(18)]

    def road(dd):
        for ph, direction, sp in cars:
            x = ((ph + direction * t * sp) % 1.2 - 0.1) * w
            y = base + (h * 0.05 if direction > 0 else h * 0.1)
            col = (255, 80, 80) if direction > 0 else (255, 250, 220)
            dd.rounded_rectangle([x, y, x + 26, y + 3], radius=2, fill=(*col, 220))
    return overlay(img, road)


def scene_altai(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#58a7e0'), (0.55, '#cfeaf7')])
    layers = [('#8aa9c7', 0.5, 0.3, 1), ('#6c8f7a', 0.6, 0.22, 2), ('#3f6b4f', 0.7, 0.16, 3)]
    for color, base_f, hgt, speed in layers:
        lr = random.Random(int(base_f * 100))
        peaks = [(lr.uniform(0, w), h * hgt * lr.uniform(0.6, 1.0), w * lr.uniform(0.2, 0.35)) for _ in range(5)]
        off = (t * speed * w) % w
        d = ImageDraw.Draw(img)
        shifted = []
        for x, hh, hw in peaks:
            for k in (-1, 0, 1):
                shifted.append((x - off + k * w, hh, hw))
        mountains(d, w, int(h * base_f), shifted, color, '#ffffff' if speed == 1 else None)
        d.rectangle([0, int(h * base_f), w, h], fill=color)
    img = water(img, int(h * 0.78), [(0, '#4fd1c5'), (1, '#1f8a8a')], '#e6fffb', t * 2, rng)
    return img


def scene_baikal(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#bcd9f2'), (0.42, '#eaf4fb')])
    d = ImageDraw.Draw(img)
    hor = int(h * 0.42)
    mountains(d, w, hor, [(w * 0.2, h * 0.08, w * 0.3), (w * 0.6, h * 0.11, w * 0.35), (w * 0.95, h * 0.07, w * 0.25)], '#7d97b5', '#ffffff')
    ice = gradient(w, h - hor, [(0, '#8fd3e8'), (0.5, '#3aa6c9'), (1, '#0f5f86')])
    img.paste(ice, (0, hor))
    cracks = []
    for _ in range(26):
        x, y = rng.uniform(0, w), rng.uniform(hor + 10, h)
        pts = [(x, y)]
        for _ in range(rng.randint(3, 7)):
            depth = (y - hor) / (h - hor)
            x += rng.uniform(-40, 40) * (0.3 + depth)
            y += rng.uniform(-14, 14) * (0.3 + depth)
            pts.append((x, y))
        cracks.append((pts, rng.random()))

    def fn(dd):
        for pts, ph in cracks:
            a = int(110 + 110 * math.sin((t + ph) * TAU))
            dd.line(pts, fill=(255, 255, 255, max(30, a)), width=2)
        # пузырьки метана во льду
        for i in range(30):
            br = random.Random(i)
            x, y = br.uniform(0, w), br.uniform(hor + 40, h)
            r = br.uniform(3, 9)
            dd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], outline=(255, 255, 255, 170), width=2)
    img = overlay(img, fn)
    flakes = [(rng.random(), rng.random(), rng.uniform(1, 2.5)) for _ in range(90)]

    def snow(dd):
        for fx, fy, fs in flakes:
            y = ((fy + t) % 1) * h
            x = (fx * w + math.sin((t * 2 + fy) * TAU) * 8) % w
            dd.ellipse([x - fs, y - fs, x + fs, y + fs], fill=(255, 255, 255, 220))
    return overlay(img, snow)


def scene_syrniki(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#f3e3cf'), (1, '#d9bfa0')])
    d = ImageDraw.Draw(img)
    cx, cy, R = w * 0.5, h * 0.48, w * 0.42
    d.rounded_rectangle([cx + R * 0.85, cy - 14, w + 40, cy + 14], radius=10, fill='#2b2b2b')
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill='#2b2b2b')
    d.ellipse([cx - R * 0.9, cy - R * 0.9, cx + R * 0.9, cy + R * 0.9], fill='#3d3d3d')
    pr = R * 0.24
    spots = [(-0.42, -0.35), (0.38, -0.38), (-0.45, 0.32), (0.4, 0.34), (0, 0)]
    for i, (dx, dy) in enumerate(spots):
        x, y = cx + dx * R, cy + dy * R
        bob = math.sin((t * 2 + i / 5) * TAU) * 1.5
        d.ellipse([x - pr, y - pr + bob, x + pr, y + pr + bob], fill='#c9752e')
        d.ellipse([x - pr * 0.82, y - pr * 0.82 + bob, x + pr * 0.82, y + pr * 0.82 + bob], fill='#e7a24f')
        d.ellipse([x - pr * 0.4, y - pr * 0.5 + bob, x + pr * 0.1, y - pr * 0.1 + bob], fill='#f3c27a')
    puffs = [(rng.random(), rng.uniform(-0.6, 0.6), rng.uniform(18, 34)) for _ in range(14)]

    def steam(dd):
        for ph, dx, r in puffs:
            p = (ph + t) % 1
            x = cx + dx * R + math.sin((p * 2 + ph) * TAU) * 14
            y = cy - p * h * 0.45
            a = int(110 * math.sin(p * math.pi))
            rr = r * (0.6 + p)
            dd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(255, 255, 255, a))
    img = overlay(img, steam)
    return img.filter(ImageFilter.SMOOTH)


def scene_cat(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#ffd6a5'), (1, '#ffb4a2')])
    d = ImageDraw.Draw(img)
    d.rectangle([0, h * 0.78, w, h], fill='#e5989b')
    # миска
    d.chord([w * 0.62, h * 0.74, w * 0.92, h * 0.86], 180, 360, fill='#6d6875')
    d.rectangle([w * 0.62, h * 0.79, w * 0.92, h * 0.8], fill='#6d6875')
    cx, cy = w * 0.38, h * 0.62
    body = '#f28c28'
    # хвост
    sw = math.sin(t * 2 * TAU) * 0.7
    tail = []
    for i in range(20):
        k = i / 19
        ang = -0.3 - k * (1.8 + sw)
        tail.append((cx + w * 0.16 + math.cos(ang) * w * 0.18 * k * 1.2, cy + h * 0.13 + math.sin(ang) * h * 0.12 * k * 1.2))
    d.line(tail, fill=body, width=int(w * 0.05), joint='curve')
    d.ellipse([cx - w * 0.2, cy - h * 0.08, cx + w * 0.2, cy + h * 0.16], fill=body)
    hx, hy, hr = cx, cy - h * 0.13, w * 0.14
    d.polygon([(hx - hr, hy - hr * 0.2), (hx - hr * 0.85, hy - hr * 1.35), (hx - hr * 0.2, hy - hr * 0.8)], fill=body)
    d.polygon([(hx + hr, hy - hr * 0.2), (hx + hr * 0.85, hy - hr * 1.35), (hx + hr * 0.2, hy - hr * 0.8)], fill=body)
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=body)
    for side in (-1, 1):
        d.line([hx + side * hr * 0.5, hy + hr * 0.35, hx + side * hr * 1.5, hy + hr * 0.25], fill='#5a3a1a', width=2)
        d.line([hx + side * hr * 0.5, hy + hr * 0.45, hx + side * hr * 1.5, hy + hr * 0.55], fill='#5a3a1a', width=2)
    blink = (t * 3) % 1 > 0.92
    for side in (-1, 1):
        ex, ey = hx + side * hr * 0.42, hy - hr * 0.05
        if blink:
            d.line([ex - 10, ey, ex + 10, ey], fill='#3a2a1a', width=4)
        else:
            d.ellipse([ex - 11, ey - 14, ex + 11, ey + 14], fill='#d4f06b')
            d.ellipse([ex - 4, ey - 11, ex + 4, ey + 11], fill='#1b1b1b')
    d.polygon([(hx - 7, hy + hr * 0.25), (hx + 7, hy + hr * 0.25), (hx, hy + hr * 0.38)], fill='#e56b6f')
    for i in range(3):
        d.arc([cx - w * 0.12 + i * 18, cy - h * 0.02, cx - w * 0.04 + i * 18, cy + h * 0.06], 200, 340, fill='#c96a12', width=4)
    return img


def scene_road(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#3b1f5e'), (0.3, '#c2477a'), (0.48, '#ff9e5e')])
    img = glow(img, (w * 0.5, h * 0.48), w * 0.12, '#ffd38a', 200)
    d = ImageDraw.Draw(img)
    hor = int(h * 0.48)
    r = w * 0.12
    d.chord([w * 0.5 - r, hor - r, w * 0.5 + r, hor + r], 180, 360, fill='#ffe2a8')
    mountains(d, w, hor, [(w * 0.1, h * 0.06, w * 0.3), (w * 0.85, h * 0.08, w * 0.3)], '#5b2a5e')
    d.rectangle([0, hor, w, h], fill='#3a2a3a')
    vx = w * 0.5
    d.polygon([(vx - 6, hor), (vx + 6, hor), (w * 1.1, h), (-w * 0.1, h)], fill='#2a2a33')
    for i in range(10):
        p = ((i / 10) + t * 2) % 1
        z0, z1 = p ** 2.2, min(1, (p + 0.04) ** 2.2)
        y0, y1 = hor + (h - hor) * z0, hor + (h - hor) * z1
        d.polygon([(vx - 1 - 5 * z0, y0), (vx + 1 + 5 * z0, y0), (vx + 1 + 5 * z1, y1), (vx - 1 - 5 * z1, y1)], fill='#f5d76e')
        for side in (-1, 1):
            px = vx + side * (10 + w * 0.75 * z0)
            d.line([px, y0, px, y0 - 6 - 70 * z0], fill='#1d1d26', width=max(1, int(1 + 5 * z0)))
    # машина
    cw, ch = w * 0.5, h * 0.12
    cx, cy = w * 0.5, h * 0.8 + math.sin(t * 6 * TAU) * 1.5
    d.rounded_rectangle([cx - cw * 0.36, cy - ch * 1.05, cx + cw * 0.36, cy - ch * 0.45], radius=18, fill='#1f2230')
    d.rounded_rectangle([cx - cw * 0.3, cy - ch * 0.98, cx + cw * 0.3, cy - ch * 0.55], radius=12, fill='#6b7aa1')
    d.rounded_rectangle([cx - cw / 2, cy - ch * 0.55, cx + cw / 2, cy + ch * 0.1], radius=14, fill='#262a3a')
    d.rectangle([cx - cw * 0.17, cy - ch * 0.3, cx + cw * 0.17, cy - ch * 0.08], fill='#e9e9e9')
    for side in (-1, 1):
        d.rectangle([cx + side * cw * 0.45 - 10, cy + ch * 0.05, cx + side * cw * 0.45 + 10, cy + ch * 0.32], fill='#111111')
    img = glow(img, (cx - cw * 0.38, cy - ch * 0.35), 10, '#ff2d2d', 220)
    img = glow(img, (cx + cw * 0.38, cy - ch * 0.35), 10, '#ff2d2d', 220)
    d = ImageDraw.Draw(img)
    for side in (-1, 1):
        x = cx + side * cw * 0.38
        d.rounded_rectangle([x - 18, cy - ch * 0.42, x + 18, cy - ch * 0.28], radius=4, fill='#ff4040')
    return img


def scene_fitness(w, h, t, rng, variant=0):
    img = gradient(w, h, [(0, '#7b2ff7'), (0.6, '#f107a3'), (1, '#ff8a00')])
    beat = (math.sin(t * 4 * TAU) + 1) / 2
    cx, cy = w * 0.5, h * 0.4

    def rings(dd):
        for i in range(5):
            r = w * (0.12 + i * 0.08) * (1 + beat * 0.06 * (5 - i))
            dd.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 140 - i * 25), width=4)
        for i in range(14):
            bh = h * 0.04 + h * 0.12 * abs(math.sin((t * 2 + i / 6) * TAU))
            x = w * 0.08 + i * w * 0.062
            dd.rounded_rectangle([x, h * 0.92 - bh, x + w * 0.04, h * 0.92], radius=6, fill=(255, 255, 255, 170))
    img = overlay(img, rings)
    d = ImageDraw.Draw(img)
    secs = 15 - int(t * 15)
    font = ImageFont.truetype(FONT, int(w * 0.2))
    label = f'0:{secs:02d}'
    tw = d.textlength(label, font=font)
    d.text((cx - tw / 2, cy - w * 0.12), label, font=font, fill='#ffffff')
    small = ImageFont.truetype(FONT, int(w * 0.06))
    for i, line in enumerate(('ПРИСЕДАНИЯ', 'раунд 2 из 5')):
        tw = d.textlength(line, font=small)
        d.text((cx - tw / 2, h * 0.58 + i * w * 0.09), line, font=small, fill='#ffffff')
    return img


def scene_phone(w, h, t, rng, variant=0):
    hue = (math.sin(t * TAU) + 1) / 2
    a = '#%02x%02x%02x' % (int(20 + 40 * hue), int(30 + 20 * hue), int(80 + 60 * (1 - hue)))
    img = gradient(w, h, [(0, a), (1, '#05060f')])
    cx, cy = w * 0.5, h * 0.48 + math.sin(t * TAU) * 10
    pw, ph = w * 0.46, h * 0.5
    img = glow(img, (cx, cy), pw * 0.45, '#5b7cff', 160)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2], radius=34, fill='#111318')
    screen = gradient(int(pw - 16), int(ph - 16), [(0, '#5b7cff'), (0.5, '#b46bff'), (1, '#ff6b9a')])
    mask = Image.new('L', screen.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, screen.size[0] - 1, screen.size[1] - 1], radius=28, fill=255)
    img.paste(screen, (int(cx - pw / 2 + 8), int(cy - ph / 2 + 8)), mask)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([cx - 30, cy - ph / 2 + 16, cx + 30, cy - ph / 2 + 32], radius=8, fill='#05060a')
    for i in range(3):
        for j in range(4):
            x = cx - pw / 2 + 26 + i * (pw - 52) / 2.6
            y = cy - ph / 2 + 60 + j * 52
            d.rounded_rectangle([x, y, x + 36, y + 36], radius=10, fill=(255, 255, 255))
    sweep = ((t * 1.5) % 1.5 - 0.25) * w

    def shine(dd):
        dd.polygon([(sweep - 40, 0), (sweep, 0), (sweep - 160, h), (sweep - 200, h)], fill=(255, 255, 255, 38))
    return overlay(img, shine)


# ---------- что генерировать ----------

PHOTOS = {
    # публикации (3:4)
    'alina1': (scene_piter, 0), 'alina2': (scene_piter, 1), 'alina3': (scene_piter, 2),
    'masha1': (scene_sochi, 0), 'masha2': (scene_sochi, 1),
    'artem1': (scene_snow_mountains, 0), 'artem2': (scene_snow_mountains, 1),
    'artem3': (scene_snow_mountains, 2), 'artem4': (scene_snow_mountains, 3),
    'sonya1': (scene_kazan, 0), 'me1': (scene_elbrus, 0), 'me2': (scene_coffee, 0), 'me3': (scene_coffee, 1),
}
STORIES = {
    'st1': (scene_piter, 1), 'st2': (scene_piter, 0), 'st3': (scene_sochi, 1), 'st4': (scene_city_night, 0),
    'st6': (scene_forest_lake, 0), 'st7': (scene_kazan, 0), 'st8': (scene_sunrise, 0), 'st9': (scene_sunrise, 1),
    'st10': (scene_snow_mountains, 2),
}
AVATARS = {
    'trv-av': (scene_altai, 0), 'msk-av': (scene_city_night, 0), 'cat-av': (scene_cat, 0),
    'tech-av': (scene_phone, 0), 'grp1': (scene_sochi, 1), 'grp2': (scene_forest_lake, 0),
}
# имя файла видео → (сцена, постер)
VIDEOS = {
    'ForBiggerEscapes': (scene_baikal, 'p1'),
    'ForBiggerJoyrides': (scene_syrniki, 'p3'),
    'ForBiggerFun': (scene_cat, 'p4'),
    'ForBiggerMeltdowns': (scene_road, 'p6'),
    'ForBiggerBlazes': (scene_fitness, 'p8'),
    'WeAreGoingOnBullrun': (scene_city_night, 'p10'),
    'SubaruOutbackOnStreetAndDirt': (scene_altai, 'p11'),
    'VolkswagenGTIReview': (scene_phone, 'p12'),
}


def render(fn, w, h, t, seed, variant):
    return fn(w, h, t, random.Random(seed), variant)


def save_jpg(img, name, seed):
    grain(img, 5, seed).save(os.path.join(OUT, f'{name}.jpg'), quality=80, optimize=True, progressive=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    for i, (name, (fn, v)) in enumerate(PHOTOS.items()):
        save_jpg(render(fn, 540, 720, 0.15 * v, i + 7, v), name, i)
    for i, (name, (fn, v)) in enumerate(STORIES.items()):
        save_jpg(render(fn, 540, 960, 0.2, i + 31, v), name, i)
    for i, (name, (fn, v)) in enumerate(AVATARS.items()):
        img = render(fn, 360, 640, 0.1, i + 50, v)
        side = 360
        img = img.crop((0, (640 - side) // 2, side, (640 + side) // 2)).resize((200, 200), Image.LANCZOS)
        save_jpg(img, name, i)
    for name, (fn, poster) in VIDEOS.items():
        seed = sum(map(ord, name))
        save_jpg(render(fn, 540, 960, 0, seed, 0), poster, seed)
        out = os.path.join(OUT, f'{name}.mp4')
        proc = subprocess.Popen(
            ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{VW}x{VH}', '-r', str(FPS), '-i', '-',
             '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out],
            stdin=subprocess.PIPE,
        )
        frames = FPS * SECONDS
        for f in range(frames):
            proc.stdin.write(render(fn, VW, VH, f / frames, seed, 0).tobytes())
        proc.stdin.close()
        if proc.wait() != 0:
            sys.exit(f'ffmpeg не смог закодировать {name}')
        print(f'{name}.mp4 — {os.path.getsize(out) // 1024} КБ')


if __name__ == '__main__':
    main()
