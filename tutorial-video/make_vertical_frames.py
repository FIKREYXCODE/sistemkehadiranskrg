from pathlib import Path
from PIL import Image, ImageEnhance
import shutil, sys

base = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True)
slides = [Image.open(base / "vertical-png" / f"vertical{i:02d}.png").convert("RGB") for i in range(1, 10)]

frames = []
fps = 4
hold = 16
transition = 4
for i, slide in enumerate(slides):
    for f in range(hold):
        scale = 1.0 + 0.012 * (f / max(1, hold - 1))
        w, h = int(1080 * scale), int(1920 * scale)
        zoomed = slide.resize((w, h), Image.Resampling.LANCZOS)
        frame = zoomed.crop(((w - 1080)//2, (h - 1920)//2, (w + 1080)//2, (h + 1920)//2))
        frames.append(frame)
    if i < len(slides) - 1:
        for f in range(1, transition + 1):
            frames.append(Image.blend(slide, slides[i + 1], f / (transition + 1)))

for i, frame in enumerate(frames, 1):
    frame.save(out / f"frame{i:04d}.jpg", quality=90, optimize=True)
print(f"Created {len(frames)} frames at {fps} fps")
