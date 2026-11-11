from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "downloads"
W, H = 1080, 1920

NAVY = "#062f68"
BLUE = "#0876d1"
CYAN = "#10bce9"
INK = "#10233f"
MUTED = "#586b85"
PALE = "#eef8ff"
GREEN = "#0b9f61"
GREEN_PALE = "#e9f9f1"
AMBER = "#f3a712"
AMBER_PALE = "#fff5d9"
WHITE = "#ffffff"
LINE = "#c9def0"

REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REG, size)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text_block(draw, xy, text, fnt, fill, max_width, spacing=8):
    x, y = xy
    lines = wrap(draw, text, fnt, max_width)
    ascent = fnt.getbbox("Ag")[3] - fnt.getbbox("Ag")[1]
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += ascent + spacing
    return y


def step(draw, y, number, title, detail, color=BLUE):
    rounded(draw, (58, y, 1022, y + 150), 26, WHITE, LINE, 2)
    rounded(draw, (82, y + 35, 154, y + 107), 22, color)
    nfont = font(34, True)
    nb = draw.textbbox((0, 0), str(number), font=nfont)
    draw.text((118 - (nb[2] - nb[0]) / 2, y + 48), str(number), font=nfont, fill=WHITE)
    draw.text((182, y + 29), title, font=font(29, True), fill=INK)
    text_block(draw, (182, y + 70), detail, font(22), MUTED, 800, 5)
    return y + 166


img = Image.new("RGB", (W, H), PALE)
draw = ImageDraw.Draw(img)

# Header
draw.rectangle((0, 0, W, 300), fill=NAVY)
draw.polygon([(0, 250), (W, 160), (W, 300), (0, 300)], fill=BLUE)
draw.ellipse((760, -170, 1160, 230), fill="#0c4c92")
draw.ellipse((875, -85, 1135, 175), fill=CYAN)

icon = Image.open(ROOT / "hem-smarttrack-logo-cutout.png").convert("RGBA").resize((142, 142))
img.paste(icon, (60, 55), icon)
draw.text((225, 61), "PANDUAN GURU KELAS", font=font(26, True), fill="#83dcff")
draw.text((225, 99), "SmartTrack → idMe", font=font(54, True), fill=WHITE)
draw.text((225, 165), "Isi kehadiran dengan lebih cepat dan tersusun", font=font(25), fill=WHITE)
rounded(draw, (60, 230, 570, 280), 18, "#053b7a")
draw.text((82, 241), "KHAS UNTUK CHROME DI LAPTOP / KOMPUTER", font=font(19, True), fill=WHITE)

# Setup strip
draw.text((58, 332), "A. PEMASANGAN SEKALI SAHAJA", font=font(29, True), fill=NAVY)
setup = [
    ("1", "Muat turun dan ekstrak fail extension"),
    ("2", "Buka chrome://extensions"),
    ("3", "Aktifkan Developer mode"),
    ("4", "Tekan Load unpacked, pilih folder chrome-extension"),
    ("5", "Pin ikon HEM SmartTrack pada bar Chrome"),
]
y = 386
for num, label in setup:
    rounded(draw, (58, y, 1022, y + 62), 16, WHITE, LINE, 2)
    rounded(draw, (73, y + 10, 115, y + 52), 13, NAVY)
    draw.text((87, y + 15), num, font=font(22, True), fill=WHITE)
    draw.text((132, y + 17), label, font=font(21, True if num in {"2", "4"} else False), fill=INK)
    y += 72

# Daily workflow
draw.text((58, 761), "B. CARA GUNA SETIAP HARI", font=font(29, True), fill=NAVY)
y = 812
y = step(draw, y, 1, "Selesaikan kehadiran dalam E-JKM", "Buka HEM SmartTrack → E-JKM. Pilih nama guru dan pastikan kelas berstatus Selesai.")
y = step(draw, y, 2, "Ambil data kelas", "Tekan ikon extension HEM, kemudian pilih “Ambil data kelas saya”. Semak kelas, tarikh dan jumlah hadir.", GREEN)
y = step(draw, y, 3, "Buka kehadiran dalam idMe / MOEIS", "Log masuk akaun guru sendiri. Buka Pengurusan Sahsiah → Pengurusan Kehadiran dan pilih kelas serta tarikh yang betul.")
y = step(draw, y, 4, "Isi secara automatik", "Tekan ikon extension sekali lagi, kemudian tekan “Isi kehadiran sekarang”.", GREEN)
y = step(draw, y, 5, "Semak sebelum hantar", "Pastikan nama murid, bilangan hadir dan sebab tidak hadir betul. Guru sendiri menekan Kemaskini.", AMBER)

# Default note and safety
rounded(draw, (58, 1644, 1022, 1762), 24, GREEN_PALE, "#9dd9bc", 2)
draw.text((82, 1666), "TETAPAN LALAI SEBAB TIDAK HADIR", font=font(21, True), fill=GREEN)
draw.text((82, 1701), "Masalah Kesihatan → Demam", font=font(31, True), fill=INK)
draw.text((600, 1705), "Boleh diubah oleh guru", font=font(20, True), fill=GREEN)

rounded(draw, (58, 1780, 1022, 1862), 22, AMBER_PALE, "#f0cf77", 2)
draw.text((82, 1795), "PENTING", font=font(21, True), fill="#8a5a00")
draw.text((187, 1795), "Extension tidak menyimpan kata laluan dan tidak menghantar rekod.", font=font(20, True), fill=INK)
draw.text((187, 1826), "Semakan akhir dan butang Kemaskini kekal di bawah tanggungjawab guru.", font=font(18), fill=MUTED)

draw.text((58, 1882), "HEM SMARTTRACK • SK RANGGU", font=font(17, True), fill=NAVY)
footer = "Versi 1.4.0 • 11 November 2026"
fb = draw.textbbox((0, 0), footer, font=font(17))
draw.text((1022 - (fb[2] - fb[0]), 1882), footer, font=font(17), fill=MUTED)

OUT.mkdir(exist_ok=True)
png_path = OUT / "Infografik-Panduan-SmartTrack-idMe-v1.4.0.png"
pdf_path = OUT / "Infografik-Panduan-SmartTrack-idMe-v1.4.0.pdf"
img.save(png_path, quality=95)
img.save(pdf_path, "PDF", resolution=150.0)
print(png_path)
print(pdf_path)
