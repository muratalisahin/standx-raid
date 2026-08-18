from pathlib import Path
from shutil import copy2
from PIL import Image

src = Path(
    r"C:\Users\Murat\.cursor\projects\c-Users-Murat-Desktop-standx-circuit\assets\c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_5d1e4a4d9f469dfe9e17ed9dbfc83e32_images_standximge-6ef7b65b-7848-4819-80e1-696468c82106.png"
)
root = Path(__file__).resolve().parents[1]
out = root / "public" / "images"
out.mkdir(parents=True, exist_ok=True)
copy2(src, root / "scripts" / "stander-sheet.png")
im = Image.open(src).convert("RGBA")


def knock_white(tile, thresh=242):
    px = tile.load()
    tw, th = tile.size
    for y in range(th):
        for x in range(tw):
            r, g, b, a = px[x, y]
            if r >= thresh and g >= thresh and b >= thresh:
                px[x, y] = (255, 255, 255, 0)
    return tile


def tight(tile, pad=10):
    bbox = tile.getbbox()
    if not bbox:
        return tile
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(tile.size[0], r + pad)
    b = min(tile.size[1], b + pad)
    return tile.crop((l, t, r, b))


def save(name, box, pad=10):
    tile = tight(knock_white(im.crop(box)), pad=pad)
    tile.save(out / f"{name}.png")
    print(name, tile.size)


# Logo: black square + white delta, plus wordmark under it
save("standx-mark", (73, 62, 232, 210), pad=4)
save("standx-wordmark", (73, 62, 232, 320), pad=4)

mark = Image.open(out / "standx-mark.png")
# Favicon / header badge: keep the official black tile readable on dark UI
badge = Image.new("RGBA", (mark.size[0] + 24, mark.size[1] + 24), (255, 255, 255, 255))
badge.paste(mark, (12, 12), mark)
badge.save(out / "standx-logo.png")
print("standx-logo", badge.size)

# Turnaround
save("stander-34", (50, 350, 230, 590))
save("stander-front", (300, 350, 480, 590))
save("stander-side", (548, 350, 722, 590))
save("stander-back", (792, 350, 978, 590))

# States
save("stander-focus", (40, 645, 260, 905))
save("stander-think", (300, 645, 530, 905))
save("stander-formal", (548, 645, 780, 905))
save("stander-cozy", (800, 645, 990, 905))

front = Image.open(out / "stander-front.png")
front.save(out / "stander.png")
print("stander", front.size)
