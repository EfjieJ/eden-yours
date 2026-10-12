#!/usr/bin/env python3
"""Génère, par code (aucune image tierce), les 4 tableaux d'Éden du jeu « Construis ton Éden » : couches séparées (ciel, nuages, loin, milieu, être de lumière, avant-plan)
+ l'image à plat. Les couches sont ensuite animées par js/casse-tete-eden.js. Usage : python3 tools/gen-eden-scenes.py  (écrit dans assets/eden-puzzle/)."""
import math, random, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

W, H = 960, 720
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "eden-puzzle")
os.makedirs(OUT, exist_ok=True)

def lerp(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(len(a)))
def vgrad(w, h, stops):
    ys = np.linspace(0, 1, h)[:, None]; out = np.zeros((h, w, 3), np.float32)
    for k in range(len(stops) - 1):
        t0, c0 = stops[k]; t1, c1 = stops[k + 1]
        m = ((ys >= t0) & (ys <= t1)); t = np.clip((ys - t0) / max(1e-6, t1 - t0), 0, 1)
        for i in range(3): out[:, :, i] += (m * (c0[i] + (c1[i] - c0[i]) * t)).astype(np.float32)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
def glow(size, cx, cy, r, color, k=1.0, power=2.0):
    w, h = size; yy, xx = np.mgrid[0:h, 0:w]; d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    a = np.exp(-(d ** power)) * k * 255
    arr = np.zeros((h, w, 4), np.uint8); arr[:, :, 0] = color[0]; arr[:, :, 1] = color[1]; arr[:, :, 2] = color[2]; arr[:, :, 3] = np.clip(a, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")
def blank(w=W, h=H): return Image.new("RGBA", (w, h), (0, 0, 0, 0))
def blur(im, r):                                # flou « prémultiplié » : pas de liseré sombre sur les bords transparents
    a = np.asarray(im.convert("RGBA"), np.float32); al = a[:, :, 3:4] / 255.0; pm = a[:, :, :3] * al
    chans = [Image.fromarray(np.clip(pm[:, :, i], 0, 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(r)) for i in range(3)]
    A = im.convert("RGBA").split()[3].filter(ImageFilter.GaussianBlur(r)); aa = np.asarray(A, np.float32) / 255.0
    rgb = np.stack([np.asarray(c, np.float32) for c in chans], 2) / np.maximum(aa[:, :, None], 1e-3)
    out = np.dstack([np.clip(rgb, 0, 255), aa * 255]).astype(np.uint8); return Image.fromarray(out, "RGBA")
def over(base, top): return Image.alpha_composite(base, top)
def tint(im, color, amt):                      # voile atmosphérique : mélange vers `color` en gardant l'alpha
    a = im.split()[3]; solid = Image.new("RGBA", im.size, color + (255,)); mixed = Image.blend(im, solid, amt); mixed.putalpha(a); return mixed

def stars(im, n, region, rnd, big=0.08, ox=0, oy=0):
    d = ImageDraw.Draw(im, "RGBA"); x0, y0, x1, y1 = region
    for _ in range(n):
        x = rnd.uniform(x0, x1) + ox; y = rnd.uniform(y0, y1) + oy; r = rnd.choice([0.8, 1.0, 1.3, 1.8]) * (2.2 if rnd.random() < big else 1)
        a = rnd.randint(130, 255); d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 250, 235, a))
        if r > 2.5:
            d.line((x - r * 3, y, x + r * 3, y), fill=(255, 240, 220, 120), width=1); d.line((x, y - r * 3, x, y + r * 3), fill=(255, 240, 220, 120), width=1)
def rainbow(im, cx, cy, r0, bw, alpha=0.5, ox=0, oy=0):
    cols = [(255, 120, 150), (255, 170, 110), (255, 226, 130), (150, 230, 160), (120, 210, 240), (150, 150, 255), (205, 140, 245)]
    ring = blank(*im.size)
    d = ImageDraw.Draw(ring, "RGBA")
    for i, c in enumerate(cols):
        r = r0 + i * bw; d.ellipse((cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r), outline=c + (int(255 * alpha),), width=int(bw + 1))
    ring = blur(ring, 5); return over(im, ring)
def puffs(im, rnd, boxes, color=(255, 236, 246), alpha=190, blur_r=9, scale=1.0):
    layer = blank(*im.size); d = ImageDraw.Draw(layer, "RGBA")
    for (x, y, w, h) in boxes:
        for _ in range(int(7 * scale) + 3):
            px = x + rnd.uniform(-w / 2, w / 2); py = y + rnd.uniform(-h / 3, h / 3); rw = rnd.uniform(w * .15, w * .32); rh = rw * rnd.uniform(.45, .7)
            d.ellipse((px - rw, py - rh, px + rw, py + rh), fill=color + (alpha,))
    layer = blur(layer, blur_r); return over(im, layer)
def hex_(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def tree(layer, rnd, x, yb, h, pal, trunk=(92, 62, 78), blossom=None, shade=1.0):
    d = ImageDraw.Draw(layer, "RGBA"); tw = max(3, h * 0.07)
    d.polygon([(x - tw, yb), (x + tw, yb), (x + tw * 0.55, yb - h * .55), (x - tw * 0.55, yb - h * .55)], fill=trunk + (255,))
    cx, cy, R = x, yb - h * .68, h * .36
    for i in range(7):
        a = rnd.uniform(0, 6.28); rr = R * rnd.uniform(.5, .8); px = cx + math.cos(a) * R * .55; py = cy + math.sin(a) * R * .4
        d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=tuple(int(c * 0.78 * shade) for c in pal[0]) + (255,))
    for i in range(7):
        a = rnd.uniform(3.3, 6.0); rr = R * rnd.uniform(.3, .55); px = cx + math.cos(a) * R * .5 - R * .1; py = cy + math.sin(a) * R * .45
        d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=pal[1] + (255,))
    for i in range(5):
        a = rnd.uniform(3.6, 5.6); rr = R * rnd.uniform(.12, .24); px = cx + math.cos(a) * R * .5 - R * .15; py = cy + math.sin(a) * R * .42 - R * .1
        d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=pal[2] + (230,))
    if blossom:
        for i in range(int(h / 6)):
            a = rnd.uniform(0, 6.28); rr = rnd.uniform(0, R * .95); px = cx + math.cos(a) * rr; py = cy + math.sin(a) * rr * .8
            d.ellipse((px - 2, py - 2, px + 2, py + 2), fill=blossom + (240,))
def island(layer, rnd, cx, cy, w, h, pal, trees=4, rock=(98, 70, 112), vines=True):
    d = ImageDraw.Draw(layer, "RGBA")
    pts = [(cx - w / 2, cy)]
    n = 9
    for i in range(1, n):
        t = i / n; x = cx - w / 2 + w * t; depth = h * (1 - abs(2 * t - 1) ** 1.6) * rnd.uniform(.85, 1.05); pts.append((x, cy + depth))
    pts.append((cx + w / 2, cy)); d.polygon(pts, fill=rock + (255,))
    shade = blank(*layer.size); sd = ImageDraw.Draw(shade, "RGBA"); sd.polygon([(cx + w * .05, cy)] + [p for p in pts if p[0] > cx + w * .05] , fill=(40, 20, 60, 90)); layer.alpha_composite(blur(shade, 6))
    d.ellipse((cx - w / 2, cy - h * .16, cx + w / 2, cy + h * .16), fill=tuple(int(c * .8) for c in pal[0]) + (255,))
    d.ellipse((cx - w / 2 + 4, cy - h * .2, cx + w / 2 - 4, cy + h * .1), fill=pal[0] + (255,))
    d.ellipse((cx - w * .38, cy - h * .17, cx + w * .15, cy + h * .02), fill=pal[1] + (160,))
    for i in range(trees):
        tx = cx + rnd.uniform(-w * .38, w * .38); tree(layer, rnd, tx, cy + rnd.uniform(-h * .06, h * .04), rnd.uniform(h * .9, h * 1.5), pal, blossom=(255, 190, 215))
    if vines:
        for i in range(6):
            vx = cx + rnd.uniform(-w * .42, w * .42); vl = rnd.uniform(h * .3, h * .7); d.line([(vx, cy + h * .05), (vx + rnd.uniform(-5, 5), cy + vl)], fill=(90, 190, 140, 230), width=2)
            for k in range(int(vl / 12)):
                yy = cy + h * .08 + k * 12; d.ellipse((vx - 3 + (k % 2) * 4, yy - 2, vx + 3 + (k % 2) * 4, yy + 3), fill=(140, 230, 160, 240))
def flowers(layer, rnd, region, n, cols):
    d = ImageDraw.Draw(layer, "RGBA"); x0, y0, x1, y1 = region
    for _ in range(n):
        x = rnd.uniform(x0, x1); y = rnd.uniform(y0, y1); r = rnd.uniform(2.2, 5.5); c = rnd.choice(cols)
        for k in range(5):
            a = k * 1.2566; d.ellipse((x + math.cos(a) * r - r * .7, y + math.sin(a) * r - r * .7, x + math.cos(a) * r + r * .7, y + math.sin(a) * r + r * .7), fill=c + (240,))
        d.ellipse((x - r * .5, y - r * .5, x + r * .5, y + r * .5), fill=(255, 226, 130, 255))
def being(layer, cx, cy, s, pose="open", halo=True):
    S = layer.size; g = blank(*S)
    if halo: g = over(g, glow(S, cx, cy, s * .85, (255, 236, 200), .55, 1.6))
    bub = blank(*S); d = ImageDraw.Draw(bub, "RGBA"); r = s / 2
    for i in range(14):
        t = i / 13; rr = r * (1 - t * .0); a = int(10 + 70 * t ** 2.2); d.ellipse((cx - rr + t * 0, cy - rr, cx + rr, cy + rr), outline=(255, 245, 250, a), width=max(1, int(r * .028)))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 240, 250, 38), outline=(255, 250, 255, 190), width=3)
    d.arc((cx - r * .86, cy - r * .86, cx + r * .86, cy + r * .86), 200, 262, fill=(255, 255, 255, 230), width=4)
    d.ellipse((cx - r * .6, cy - r * .78, cx - r * .38, cy - r * .64), fill=(255, 255, 255, 150))
    fig = blank(*S); fd = ImageDraw.Draw(fig, "RGBA"); lw = max(3, int(s * .06))
    def limb(p, q): fd.line([p, q], fill=(255, 252, 244, 255), width=lw); fd.ellipse((q[0] - lw / 2, q[1] - lw / 2, q[0] + lw / 2, q[1] + lw / 2), fill=(255, 252, 244, 255))
    head = (cx, cy - s * .2); hr = s * .075
    fd.ellipse((head[0] - hr, head[1] - hr, head[0] + hr, head[1] + hr), fill=(255, 252, 244, 255))
    sh = cy - s * .1; hip = cy + s * .08
    fd.polygon([(cx - s * .055, sh), (cx + s * .055, sh), (cx + s * .04, hip), (cx - s * .04, hip)], fill=(255, 252, 244, 255))
    if pose == "up": limb((cx - s * .05, sh), (cx - s * .2, cy - s * .3)); limb((cx + s * .05, sh), (cx + s * .2, cy - s * .3)); limb((cx - s * .03, hip), (cx - s * .06, cy + s * .26)); limb((cx + s * .03, hip), (cx + s * .06, cy + s * .26))
    elif pose == "dance": limb((cx - s * .05, sh), (cx - s * .22, cy - s * .27)); limb((cx + s * .05, sh), (cx + s * .21, cy - s * .02)); limb((cx - s * .03, hip), (cx - s * .12, cy + s * .25)); limb((cx + s * .03, hip), (cx + s * .1, cy + s * .22))
    else: limb((cx - s * .05, sh), (cx - s * .22, cy - s * .01)); limb((cx + s * .05, sh), (cx + s * .22, cy - s * .01)); limb((cx - s * .03, hip), (cx - s * .06, cy + s * .26)); limb((cx + s * .03, hip), (cx + s * .06, cy + s * .26))
    fglow = blur(fig, s * .05); fglow = ImageChops.multiply(fglow, Image.new("RGBA", S, (255, 236, 190, 255)))
    out = over(g, bub); out = over(out, fglow); out = over(out, fig); return over(layer, out)
def mountains(layer, rnd, y0, amp, color, n=9, ox=0):
    d = ImageDraw.Draw(layer, "RGBA"); pts = [(0, H)]; x = -20
    while x < W + 60:
        pts.append((x, y0 - rnd.uniform(.3, 1) * amp)); x += rnd.uniform(60, 130); pts.append((x - 20, y0 - rnd.uniform(0, .35) * amp)); x += 10
    pts.append((W, H)); d.polygon(pts, fill=color + (255,))
def fg_blades(layer, rnd, cols, n=70, side=None):
    d = ImageDraw.Draw(layer, "RGBA")
    for _ in range(n):
        x = rnd.uniform(-20, W + 20) if side is None else (rnd.uniform(-20, 170) if rnd.random() < .5 else rnd.uniform(W - 170, W + 20))
        h = rnd.uniform(40, 150); sw = rnd.uniform(-20, 20); c = rnd.choice(cols)
        d.polygon([(x - 4, H + 5), (x + 4, H + 5), (x + sw, H - h)], fill=c + (255,))
def big_flowers(layer, rnd, spots, cols):
    d = ImageDraw.Draw(layer, "RGBA")
    for (x, y, r) in spots:
        d.line([(x, H + 10), (x + rnd.uniform(-12, 12), y)], fill=(70, 160, 120, 255), width=int(r * .12) + 2)
        c = rnd.choice(cols)
        for k in range(8):
            a = k * .785; d.ellipse((x + math.cos(a) * r * .8 - r * .55, y + math.sin(a) * r * .8 - r * .55, x + math.cos(a) * r * .8 + r * .55, y + math.sin(a) * r * .8 + r * .55), fill=tuple(min(255, int(v * (.85 + .15 * (k % 2)))) for v in c) + (245,))
        d.ellipse((x - r * .42, y - r * .42, x + r * .42, y + r * .42), fill=(255, 224, 120, 255))
def sparkle_dust(layer, rnd, n, region, color=(255, 236, 170)):
    d = ImageDraw.Draw(layer, "RGBA"); x0, y0, x1, y1 = region
    for _ in range(n):
        x = rnd.uniform(x0, x1); y = rnd.uniform(y0, y1); r = rnd.uniform(1, 2.6); d.ellipse((x - r, y - r, x + r, y + r), fill=color + (rnd.randint(140, 240),))

SKYW, SKYH, OX, OY = 1000, 750, 20, 15
def new_sky(stops): return vgrad(SKYW, SKYH, stops)

def scene_jardin():
    rnd = random.Random(11); sky = new_sky([(0, (78, 52, 138)), (.36, (186, 108, 192)), (.66, (255, 158, 190)), (1, (255, 214, 176))])
    sky = over(sky, glow((SKYW, SKYH), 480 + OX, 400 + OY, 330, (255, 214, 130), .75, 1.6))
    sky = rainbow(sky, 480, 640, 330, 15, .5, OX, OY); stars(sky, 130, (0, 0, W, 330), rnd, ox=OX, oy=OY)
    sky = puffs(sky, rnd, [(150, 640, 380, 120), (480, 670, 420, 130), (800, 640, 360, 120)], (255, 222, 236), 210, 11, 1.4)
    clouds = blank(1250, H); clouds = puffs(clouds, rnd, [(160, 130, 230, 60), (520, 220, 280, 70), (860, 110, 240, 60), (1130, 250, 220, 55), (350, 330, 200, 50)], (255, 240, 250), 175, 9, 1.0)
    far = blank(); pal = [(110, 190, 150), (150, 225, 170), (255, 224, 140)]
    for (x, y, w, h) in [(130, 250, 130, 34), (790, 210, 150, 38), (270, 400, 100, 26), (860, 400, 110, 30)]:
        isl = blank(); island(isl, rnd, x, y, w, h, pal, trees=3, vines=False); far = over(far, tint(isl, (255, 186, 214), .42))
    mid = blank(); island(mid, rnd, 480, 470, 560, 200, [(98, 200, 150), (150, 232, 170), (255, 226, 140)], trees=6)
    d = ImageDraw.Draw(mid, "RGBA"); d.polygon([(692, 478), (704, 478), (702, 640), (694, 640)], fill=(210, 236, 255, 190))
    mid = over(mid, blur(mid.copy().crop((0, 0, 1, 1)).resize(mid.size), 0)); flowers(mid, rnd, (260, 452, 700, 482), 70, [(255, 150, 200), (255, 226, 140), (255, 255, 255), (190, 160, 255)])
    bl = blank(); bl = being(bl, 520, 345, 130, "up")
    fg = blank(); fg_blades(fg, rnd, [(60, 150, 110), (88, 184, 130), (120, 214, 150)], 60, side=True); big_flowers(fg, rnd, [(70, 560, 40), (160, 620, 30), (900, 570, 42), (820, 630, 28)], [(255, 150, 200), (255, 190, 120), (200, 160, 255)])
    sparkle_dust(fg, rnd, 40, (0, 300, W, H))
    return dict(sky=sky, clouds=clouds, far=far, mid=mid, being=bl, fg=fg), dict(water=None, halo=[[520 / W, 345 / H, 120 / W]], sun=[480 / W, 400 / H])
def scene_riviere():
    rnd = random.Random(23); sky = new_sky([(0, (104, 88, 196)), (.38, (232, 148, 204)), (.6, (255, 204, 192)), (1, (255, 232, 196))])
    sky = over(sky, glow((SKYW, SKYH), 480 + OX, 420 + OY, 320, (255, 226, 160), .7, 1.5)); sky = rainbow(sky, 480, 500, 280, 17, .55, OX, OY); stars(sky, 70, (0, 0, W, 240), rnd, ox=OX, oy=OY)
    clouds = blank(1250, H); clouds = puffs(clouds, rnd, [(200, 120, 260, 60), (640, 190, 300, 70), (1050, 120, 260, 60), (430, 300, 200, 50)], (255, 242, 250), 170, 9)
    far = blank(); mountains(far, rnd, 430, 120, (176, 150, 214)); far = tint(far, (255, 196, 220), .25)
    f2 = blank(); mountains(f2, rnd, 440, 70, (150, 140, 200)); far = over(far, tint(f2, (255, 190, 215), .12))
    for x in range(60, 900, 38):
        tree(far, rnd, x + rnd.uniform(-8, 8), 442, rnd.uniform(24, 36), [(120, 190, 160), (150, 215, 175), (255, 220, 150)], shade=.95)
    far = tint(far, (255, 200, 220), .18)
    mid = blank(); d = ImageDraw.Draw(mid, "RGBA")
    ground = vgrad(W, H, [(.58, (120, 205, 160)), (.75, (80, 175, 140)), (1, (50, 140, 120))]); gm = Image.new("L", (W, H), 0); ImageDraw.Draw(gm).rectangle((0, 440, W, H), fill=255); ground.putalpha(gm); mid = over(mid, ground)
    riv = [(470, 440), (492, 440), (560, 520), (640, 600), (760, 720), (180, 720), (330, 600), (430, 520)]
    rm = Image.new("L", (W, H), 0); ImageDraw.Draw(rm).polygon(riv, fill=255)
    water = vgrad(W, H, [(.6, (255, 214, 200)), (.8, (190, 200, 240)), (1, (130, 190, 230))]); water.putalpha(rm); mid = over(mid, water)
    rd = ImageDraw.Draw(mid, "RGBA"); rd.line([(470, 440), (430, 520), (330, 600), (180, 720)], fill=(255, 250, 235, 180), width=3); rd.line([(492, 440), (560, 520), (640, 600), (760, 720)], fill=(255, 250, 235, 180), width=3)
    for (x, yb, h) in [(140, 560, 150), (270, 500, 100), (60, 640, 190), (340, 468, 64), (800, 580, 170), (680, 500, 100), (900, 650, 200), (590, 470, 62), (390, 450, 40), (560, 452, 40)]:
        tree(mid, rnd, x, yb, h, [(88, 176, 136), (130, 210, 160), (255, 216, 140)], blossom=(255, 180, 210))
    flowers(mid, rnd, (0, 470, W, 700), 90, [(255, 150, 200), (255, 226, 140), (255, 255, 255), (190, 160, 255)])
    bl = blank(); bl = being(bl, 245, 520, 118, "open"); bl = being(bl, 735, 520, 104, "up")
    fg = blank(); fg_blades(fg, rnd, [(50, 140, 110), (80, 176, 130), (110, 205, 150)], 60, side=True); big_flowers(fg, rnd, [(70, 600, 38), (870, 610, 40), (150, 660, 28)], [(255, 150, 200), (255, 190, 120), (200, 160, 255)]); sparkle_dust(fg, rnd, 40, (0, 300, W, H))
    return dict(sky=sky, clouds=clouds, far=far, mid=mid, being=bl, fg=fg), dict(water=[[470 / W, 440 / H], [492 / W, 440 / H], [560 / W, 520 / H], [640 / W, 600 / H], [760 / W, 1], [180 / W, 1], [330 / W, 600 / H], [430 / W, 520 / H]], halo=[[245 / W, 520 / H, 110 / W], [735 / W, 520 / H, 100 / W]], sun=[.5, .58])
def scene_nuit():
    rnd = random.Random(37); sky = new_sky([(0, (22, 12, 60)), (.5, (88, 46, 134)), (.78, (212, 106, 170)), (1, (255, 176, 160))])
    sky = over(sky, glow((SKYW, SKYH), 700 + OX, 200 + OY, 260, (255, 214, 150), .6, 1.4)); stars(sky, 300, (0, 0, W, 470), rnd, big=.12, ox=OX, oy=OY)
    rib = blank(SKYW, SKYH); d = ImageDraw.Draw(rib, "RGBA")
    for k, c in enumerate([(255, 130, 190), (255, 210, 130), (130, 235, 190), (130, 190, 255), (190, 150, 255)]):
        pts = [(x, 110 + k * 22 + 55 * math.sin(x / 150 + k * .8)) for x in range(-20, SKYW + 20, 12)]
        d.line(pts, fill=c + (110,), width=26 - k * 2)
    sky = over(sky, blur(rib, 14)); md = ImageDraw.Draw(sky, "RGBA"); md.ellipse((700 + OX - 52, 200 + OY - 52, 700 + OX + 52, 200 + OY + 52), fill=(255, 242, 214, 255)); md.ellipse((700 + OX - 30, 200 + OY - 22, 700 + OX - 10, 200 + OY - 6), fill=(255, 224, 180, 120))
    clouds = blank(1250, H); clouds = puffs(clouds, rnd, [(250, 140, 300, 50), (800, 290, 320, 50), (1100, 180, 260, 45)], (230, 190, 240), 110, 10)
    far = blank(); mountains(far, rnd, 470, 140, (62, 38, 104)); far = tint(far, (180, 100, 160), .14)
    mid = blank(); lake = vgrad(W, H, [(.64, (235, 140, 175)), (.8, (150, 90, 170)), (1, (60, 36, 110))]); lm = Image.new("L", (W, H), 0); ImageDraw.Draw(lm).rectangle((0, 470, W, H), fill=255); lake.putalpha(lm); mid = over(mid, lake)
    ref = blank(); ImageDraw.Draw(ref, "RGBA").polygon([(670, 470), (730, 470), (770, H), (630, H)], fill=(255, 226, 170, 95)); mid = over(mid, blur(ref, 10))
    md2 = ImageDraw.Draw(mid, "RGBA"); md2.polygon([(0, 470), (0, 580), (70, 560), (160, 520), (240, 478)], fill=(46, 28, 84, 255)); md2.polygon([(W, 470), (W, 600), (900, 570), (800, 520), (730, 478)], fill=(46, 28, 84, 255))
    for (x, yb, h) in [(60, 560, 150), (160, 520, 100), (900, 580, 160), (810, 530, 110)]:
        tree(mid, rnd, x, yb, h, [(52, 40, 104), (82, 62, 134), (255, 200, 130)], trunk=(40, 24, 70), blossom=(255, 210, 150), shade=.9)
    rock = blank(); rd = ImageDraw.Draw(rock, "RGBA"); rd.ellipse((330, 500, 500, 560), fill=(60, 40, 100, 255)); rd.ellipse((345, 494, 485, 530), fill=(96, 70, 140, 255)); mid = over(mid, rock)
    bl = blank(); bl = being(bl, 415, 430, 140, "dance")
    fg = blank(); d = ImageDraw.Draw(fg, "RGBA")
    for _ in range(70):
        x = rnd.choice([rnd.uniform(-10, 190), rnd.uniform(W - 190, W + 10)]); h = rnd.uniform(70, 190); sw = rnd.uniform(-14, 14)
        d.line([(x, H + 5), (x + sw, H - h)], fill=(40, 26, 76, 255), width=3); d.ellipse((x + sw - 3, H - h - 9, x + sw + 3, H - h + 3), fill=(255, 210, 150, 255))
    sparkle_dust(fg, rnd, 60, (0, 300, W, H))
    return dict(sky=sky, clouds=clouds, far=far, mid=mid, being=bl, fg=fg), dict(water=[[0, 470 / H], [1, 470 / H], [1, 1], [0, 1]], halo=[[415 / W, 430 / H, 120 / W]], sun=[700 / W, 200 / H])
def scene_foret():
    rnd = random.Random(53); sky = new_sky([(0, (255, 228, 172)), (.4, (255, 190, 152)), (1, (255, 148, 172))])
    sky = over(sky, glow((SKYW, SKYH), 480 + OX, 150 + OY, 360, (255, 244, 200), .95, 1.4)); stars(sky, 40, (0, 0, W, 160), rnd, ox=OX, oy=OY)
    clouds = blank(1250, H); mist = puffs(clouds, rnd, [(300, 380, 520, 70), (900, 420, 560, 80), (620, 330, 460, 60)], (255, 236, 220), 110, 14, 1.4); clouds = mist
    far = blank(); rays = blank(); rd = ImageDraw.Draw(rays, "RGBA")
    for k in range(15):
        a = -0.8 + k * 0.115 + rnd.uniform(-.02, .02); wd = rnd.uniform(.012, .03); rd.polygon([(480, 20), (480 + math.tan(a - wd) * 760, 760), (480 + math.tan(a + wd) * 760, 760)], fill=(255, 240, 190, rnd.randint(38, 80)))
    far = over(far, blur(rays, 4))
    back = blank()
    for x in range(-10, W + 40, 52): tree(back, rnd, x + rnd.uniform(-10, 10), 470, rnd.uniform(120, 190), [(150, 190, 120), (190, 220, 140), (255, 226, 150)], trunk=(150, 120, 110), shade=1.0)
    far = over(far, tint(back, (255, 214, 190), .38))
    mid = blank(); ground = vgrad(W, H, [(.6, (160, 214, 140)), (.8, (110, 180, 120)), (1, (80, 150, 110))]); gm = Image.new("L", (W, H), 0); ImageDraw.Draw(gm).rectangle((0, 470, W, H), fill=255); ground.putalpha(gm); mid = over(mid, ground)
    path = blank(); pd = ImageDraw.Draw(path, "RGBA"); pd.polygon([(450, 470), (510, 470), (700, H), (260, H)], fill=(255, 232, 160, 215)); mid = over(mid, blur(path, 5))
    for (x, yb, h) in [(80, 640, 470), (230, 560, 360), (880, 650, 480), (740, 570, 360), (360, 500, 190), (620, 495, 170)]:
        tree(mid, rnd, x, yb, h, [(104, 170, 104), (150, 206, 120), (255, 222, 140)], trunk=(110, 82, 90), blossom=(255, 214, 140))
    flowers(mid, rnd, (0, 500, W, 700), 80, [(255, 190, 120), (255, 226, 140), (255, 255, 255), (255, 160, 190)])
    bl = blank(); bl = being(bl, 480, 405, 132, "open")
    fg = blank(); fg_blades(fg, rnd, [(70, 150, 100), (100, 186, 120), (136, 214, 140)], 70, side=True); big_flowers(fg, rnd, [(60, 610, 38), (890, 610, 40), (160, 670, 26)], [(255, 190, 120), (255, 160, 190), (255, 226, 140)]); sparkle_dust(fg, rnd, 50, (0, 200, W, H))
    return dict(sky=sky, clouds=clouds, far=far, mid=mid, being=bl, fg=fg), dict(water=None, halo=[[480 / W, 405 / H, 125 / W]], sun=[.5, .2])

SCENES = [("jardin", scene_jardin), ("riviere", scene_riviere), ("nuit", scene_nuit), ("foret", scene_foret)]
meta = {}
for sid, fn in SCENES:
    layers, m = fn(); flat = layers["sky"].crop((OX, OY, OX + W, OY + H))
    for k in ["clouds", "far", "mid", "being", "fg"]:
        flat = over(flat, layers[k].crop((0, 0, W, H)))
    flat.convert("RGB").save(os.path.join(OUT, f"{sid}.webp"), quality=84, method=6)
    flat.convert("RGB").resize((480, 360), Image.LANCZOS).save(os.path.join(OUT, f"{sid}-sm.webp"), quality=80)
    layers["sky"].convert("RGB").save(os.path.join(OUT, f"{sid}-sky.webp"), quality=82, method=6)
    for k in ["clouds", "far", "mid", "being", "fg"]:
        layers[k].save(os.path.join(OUT, f"{sid}-{k}.webp"), quality=80, alpha_quality=85, method=6)
    meta[sid] = m; print(sid, "ok")
json.dump(meta, open(os.path.join(OUT, "scenes-meta.json"), "w"))
