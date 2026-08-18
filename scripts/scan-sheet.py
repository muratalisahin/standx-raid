from pathlib import Path
from PIL import Image

src = Path(
    r"C:\Users\Murat\.cursor\projects\c-Users-Murat-Desktop-standx-circuit\assets\c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_5d1e4a4d9f469dfe9e17ed9dbfc83e32_images_standximge-a3752ba7-7459-46ff-a006-000303c9393a.png"
)
im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()

def row_ink(y, thresh=240):
    n = 0
    for x in range(0, w, 2):
        r, g, b = px[x, y]
        if r < thresh or g < thresh or b < thresh:
            n += 1
    return n

bands = []
ink = False
start = 0
for y in range(h):
    has = row_ink(y) > 20
    if has and not ink:
        start = y
        ink = True
    elif not has and ink:
        bands.append((start, y, y - start))
        ink = False
if ink:
    bands.append((start, h, h - start))

print("w,h", w, h)
print("horizontal ink bands (y0,y1,h):")
for b in bands:
    if b[2] > 8:
        print(b)
