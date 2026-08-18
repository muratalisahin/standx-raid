from pathlib import Path
from PIL import Image

src = Path(
    r"C:\Users\Murat\.cursor\projects\c-Users-Murat-Desktop-standx-circuit\assets\c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_5d1e4a4d9f469dfe9e17ed9dbfc83e32_images_standximge-a3752ba7-7459-46ff-a006-000303c9393a.png"
)
im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()

def col_ink(x, y0, y1, thresh=240):
    n = 0
    for y in range(y0, y1, 2):
        r, g, b = px[x, y]
        if r < thresh or g < thresh or b < thresh:
            n += 1
    return n

def bands_x(y0, y1):
    out = []
    ink = False
    start = 0
    for x in range(w):
        has = col_ink(x, y0, y1) > 8
        if has and not ink:
            start = x
            ink = True
        elif not has and ink:
            out.append((start, x, x - start))
            ink = False
    if ink:
        out.append((start, w, w - start))
    return [b for b in out if b[2] > 20]

print("mid cols", bands_x(360, 582))
print("bot cols", bands_x(659, 893))
print("logo cols", bands_x(62, 250))
