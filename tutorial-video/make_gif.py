from pathlib import Path
from PIL import Image
import sys

base = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
frames = []
for index in range(1, 11):
    image = Image.open(base / "slides-png" / f"slide{index:02d}.png").convert("RGB")
    image.thumbnail((1280, 720), Image.Resampling.LANCZOS)
    frames.append(image.convert("P", palette=Image.Palette.ADAPTIVE, colors=128))

frames[0].save(
    output,
    save_all=True,
    append_images=frames[1:],
    duration=[7500] * len(frames),
    loop=0,
    optimize=True,
    disposal=2,
)
print(f"Created {output}")
