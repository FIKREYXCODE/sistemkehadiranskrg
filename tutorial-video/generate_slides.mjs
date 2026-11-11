import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(import.meta.dirname, "slides-svg");
fs.mkdirSync(out, { recursive: true });

const icon = fs.readFileSync(path.join(root, "chrome-extension/icons/icon-128.png")).toString("base64");
const iconUrl = `data:image/png;base64,${icon}`;

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function textLines(lines, x, y, { size = 38, color = "#14213d", weight = 600, gap = 1.3, anchor = "start" } = {}) {
  return lines.map((line, i) => `<text x="${x}" y="${y + i * size * gap}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(line)}</text>`).join("\n");
}

function button(x, y, w, h, label, color = "#0b63ce") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${color}" filter="url(#shadow)"/>
  <text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="800" fill="#fff">${esc(label)}</text>`;
}

function arrow(x1, y1, x2, y2, label = "TEKAN DI SINI") {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#ff3b30" stroke-width="14" fill="none" marker-end="url(#arrow)"/>
  <rect x="${midX - 130}" y="${midY - 58}" width="260" height="62" rx="20" fill="#ff3b30"/>
  <text x="${midX}" y="${midY - 17}" text-anchor="middle" font-family="Arial" font-size="25" font-weight="900" fill="#fff">${esc(label)}</text>`;
}

function browserFrame(content, title = "Google Chrome") {
  return `<rect x="120" y="185" width="1680" height="760" rx="28" fill="#fff" stroke="#bdd7f2" stroke-width="5" filter="url(#shadow)"/>
  <rect x="120" y="185" width="1680" height="82" rx="28" fill="#eaf3fb"/>
  <circle cx="170" cy="226" r="13" fill="#ff5f57"/><circle cx="210" cy="226" r="13" fill="#febc2e"/><circle cx="250" cy="226" r="13" fill="#28c840"/>
  <rect x="335" y="204" width="1050" height="44" rx="20" fill="#fff"/>
  <text x="860" y="235" text-anchor="middle" font-family="Arial" font-size="24" fill="#5a6b82">${esc(title)}</text>
  ${content}`;
}

function layout({ step, title, subtitle, body, footer = "HEM SmartTrack • SK Ranggu" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#052a67"/><stop offset="0.55" stop-color="#0878d7"/><stop offset="1" stop-color="#19c3e8"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#001b44" flood-opacity="0.22"/></filter>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#ff3b30"/></marker>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <circle cx="1760" cy="-20" r="360" fill="#fff" opacity="0.08"/><circle cx="90" cy="1040" r="320" fill="#fff" opacity="0.06"/>
  <image href="${iconUrl}" x="72" y="48" width="106" height="106"/>
  <text x="205" y="92" font-family="Arial" font-size="28" font-weight="700" fill="#9eeaff" letter-spacing="4">PANDUAN GURU KELAS</text>
  <text x="205" y="140" font-family="Arial" font-size="44" font-weight="900" fill="#fff">${esc(title)}</text>
  ${step ? `<rect x="1610" y="66" width="230" height="70" rx="35" fill="#fff" opacity="0.95"/><text x="1725" y="113" text-anchor="middle" font-family="Arial" font-size="31" font-weight="900" fill="#0757ae">LANGKAH ${step}</text>` : ""}
  ${subtitle ? `<text x="960" y="1015" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#fff">${esc(subtitle)}</text>` : ""}
  ${body}
  <text x="1810" y="1040" text-anchor="end" font-family="Arial" font-size="20" font-weight="700" fill="#d7f5ff">${esc(footer)}</text>
  </svg>`;
}

const slides = [
  {
    title: "HEM SMARTTRACK → idMe",
    subtitle: "Mudah, selamat dan masih di bawah semakan guru",
    body: `<rect x="240" y="260" width="1440" height="610" rx="48" fill="#fff" opacity="0.96" filter="url(#shadow)"/>
      <image href="${iconUrl}" x="360" y="360" width="320" height="320"/>
      ${textLines(["Panduan memindahkan", "kehadiran kelas", "ke portal idMe"], 790, 410, {size:64, color:"#ffffff", weight:900, gap:1.15})}
      ${textLines(["Setiap guru menggunakan akaun idMe sendiri.", "Extension tidak menyimpan kata laluan."], 790, 665, {size:31, color:"#d9f5ff", weight:700, gap:1.45})}`
  },
  {
    step: "1",
    title: "Pasang extension — sekali sahaja",
    subtitle: "Langkah ini dibuat sekali pada komputer Google Chrome guru",
    body: browserFrame(`${textLines(["1. Muat turun fail ZIP extension", "2. Klik dua kali untuk buka ZIP", "3. Simpan folder chrome-extension"], 210, 355, {size:43, weight:800, gap:1.65})}
      <rect x="1010" y="345" width="600" height="330" rx="32" fill="#eef7ff" stroke="#83bdf5" stroke-width="4"/>
      <image href="${iconUrl}" x="1080" y="410" width="190" height="190"/>
      ${textLines(["HEM SmartTrack", "→ idMe", "Versi 1.3.0"], 1320, 440, {size:38, weight:900, gap:1.4})}
      ${button(1115, 720, 430, 90, "Fail sudah dibuka", "#18a957")}`, "Fail pemasangan extension")
  },
  {
    step: "2",
    title: "Aktifkan extension dalam Chrome",
    subtitle: "Jika tidak pasti, minta bantuan penyelaras ICT untuk pemasangan pertama",
    body: browserFrame(`<text x="280" y="338" font-family="Arial" font-size="42" font-weight="900" fill="#14213d">chrome://extensions</text>
      <rect x="220" y="390" width="1480" height="120" rx="24" fill="#f5f8fc"/>
      <text x="270" y="465" font-family="Arial" font-size="39" font-weight="800" fill="#14213d">Mod pembangun / Developer mode</text>
      <rect x="1460" y="420" width="145" height="58" rx="29" fill="#1689e8"/><circle cx="1570" cy="449" r="23" fill="#fff"/>
      ${button(240, 565, 420, 94, "Muatkan tanpa dibungkus")}
      ${textLines(["Pilih folder:", "chrome-extension"], 755, 595, {size:43, weight:800, gap:1.5})}
      <rect x="240" y="740" width="1320" height="115" rx="28" fill="#eafaf0" stroke="#46be76" stroke-width="4"/>
      <image href="${iconUrl}" x="275" y="755" width="85" height="85"/>
      <text x="395" y="810" font-family="Arial" font-size="36" font-weight="900" fill="#14713a">HEM SmartTrack → idMe sudah aktif</text>
      ${arrow(1460, 570, 650, 612, "KLIK BUTANG INI")}`, "Extensions")
  },
  {
    step: "3",
    title: "Pilih nama sendiri dalam SmartTrack",
    subtitle: "Pastikan tarikh, kelas dan bilangan murid sudah betul",
    body: browserFrame(`<rect x="190" y="315" width="1540" height="132" rx="30" fill="#edf7ff" stroke="#84bdf2" stroke-width="4"/>
      <text x="235" y="365" font-family="Arial" font-size="27" font-weight="700" fill="#0b63ce">NAMA PENGISI</text>
      <rect x="235" y="382" width="1450" height="76" rx="18" fill="#fff" stroke="#5ca7ed" stroke-width="3"/>
      <text x="275" y="432" font-family="Arial" font-size="33" font-weight="900" fill="#14213d">MOHAMMAD FIKREY BIN ABDUL GAPAR</text>
      <rect x="190" y="500" width="1540" height="330" rx="32" fill="#fff" stroke="#b9d8f4" stroke-width="4"/>
      ${textLines(["e-JKM — Rekod Kehadiran Murid", "Tarikh: 11 November 2026", "Kelas: 6 Jayyid", "Hadir: 35/35   •   Tidak hadir: 0"], 250, 565, {size:39, weight:800, gap:1.55})}
      ${arrow(1510, 325, 1260, 405, "PILIH NAMA SENDIRI")}`, "HEM SmartTrack")
  },
  {
    step: "4",
    title: "Ambil data kelas dari SmartTrack",
    subtitle: "Klik ikon extension berbentuk logo HEM SmartTrack",
    body: browserFrame(`<rect x="1450" y="205" width="65" height="44" rx="10" fill="#d9e8f5"/><image href="${iconUrl}" x="1455" y="209" width="36" height="36"/>
      <rect x="1120" y="300" width="570" height="500" rx="30" fill="#fff" stroke="#7fb5ea" stroke-width="4" filter="url(#shadow)"/>
      <text x="1170" y="360" font-family="Arial" font-size="24" font-weight="800" fill="#28a7dc" letter-spacing="3">PEMBANTU KEHADIRAN</text>
      <text x="1170" y="415" font-family="Arial" font-size="39" font-weight="900" fill="#14213d">SmartTrack → idMe</text>
      <text x="1170" y="500" font-family="Arial" font-size="29" font-weight="800" fill="#14213d">Langkah 1: ambil data kelas cikgu</text>
      ${button(1170, 555, 470, 95, "Ambil data kelas saya")}
      <text x="1170" y="705" font-family="Arial" font-size="25" fill="#5c6c82">Pastikan nama cikgu sudah dipilih.</text>
      ${textLines(["Klik ikon extension", "di bahagian atas Chrome"], 250, 425, {size:52, weight:900, gap:1.35})}
      ${arrow(800, 480, 1465, 235, "1. KLIK IKON")}
      ${arrow(1100, 700, 1370, 610, "2. AMBIL DATA")}`, "HEM SmartTrack")
  },
  {
    step: "5",
    title: "Masuk idMe menggunakan akaun sendiri",
    subtitle: "Jangan berkongsi kata laluan atau menggunakan akaun guru lain",
    body: browserFrame(`<rect x="360" y="330" width="1200" height="470" rx="38" fill="#17202a"/>
      <text x="960" y="425" text-anchor="middle" font-family="Arial" font-size="30" font-weight="800" fill="#fff">KEMENTERIAN PENDIDIKAN</text>
      <text x="960" y="485" text-anchor="middle" font-family="Arial" font-size="48" font-weight="900" fill="#fff">Sistem Pengurusan Identiti (idMe)</text>
      <rect x="555" y="540" width="810" height="74" rx="12" fill="#fff" opacity="0.12" stroke="#93a4b4" stroke-width="2"/>
      <text x="595" y="589" font-family="Arial" font-size="28" fill="#dbe5ed">Nombor Kad Pengenalan / Pasport</text>
      ${button(555, 650, 810, 80, "Daftar Masuk", "#21a9c3")}
      <circle cx="430" cy="410" r="70" fill="#fff" opacity="0.12"/><text x="430" y="430" text-anchor="middle" font-family="Arial" font-size="58">🔐</text>`, "https://idme.moe.gov.my")
  },
  {
    step: "6",
    title: "Buka halaman kehadiran murid",
    subtitle: "Pilih kelas dan tarikh yang sama seperti dalam SmartTrack",
    body: browserFrame(`${textLines(["Pengurusan Murid", "↓", "Pengurusan Sahsiah", "↓", "Pengurusan Kehadiran", "↓", "Kehadiran Harian"], 430, 335, {size:45, weight:900, gap:1.3, anchor:"middle"})}
      <rect x="900" y="335" width="720" height="420" rx="34" fill="#f2f8ff" stroke="#75afe8" stroke-width="4"/>
      ${textLines(["KELAS", "TAHUN ENAM JAYYID", "", "TARIKH", "11/11/2026"], 980, 415, {size:39, weight:900, gap:1.35})}
      <rect x="950" y="525" width="610" height="4" fill="#75afe8"/>
      <rect x="950" y="720" width="610" height="70" rx="20" fill="#fff3cd"/><text x="1255" y="765" text-anchor="middle" font-family="Arial" font-size="27" font-weight="800" fill="#7a5610">Semak kelas dan tarikh dahulu</text>`, "MOEIS — Pengurusan Kehadiran")
  },
  {
    step: "7",
    title: "Isi kehadiran secara automatik",
    subtitle: "Extension hanya menyediakan tanda kehadiran — belum menghantar",
    body: browserFrame(`<rect x="1040" y="300" width="650" height="540" rx="30" fill="#fff" stroke="#7fb5ea" stroke-width="4" filter="url(#shadow)"/>
      <text x="1100" y="360" font-family="Arial" font-size="24" font-weight="800" fill="#28a7dc" letter-spacing="3">PEMBANTU KEHADIRAN</text>
      <text x="1100" y="415" font-family="Arial" font-size="39" font-weight="900" fill="#14213d">SmartTrack → idMe</text>
      <rect x="1100" y="470" width="530" height="135" rx="24" fill="#eff7ff"/>
      ${textLines(["6 Jayyid · 11 November 2026", "Hadir 35/35 · Tidak hadir 0"], 1130, 520, {size:29, weight:800, gap:1.45})}
      ${button(1100, 650, 530, 94, "Isi kehadiran sekarang")}
      <text x="1100" y="795" font-family="Arial" font-size="22" font-weight="700" fill="#66758b">Guru tetap perlu menyemak sebelum hantar.</text>
      ${textLines(["Klik ikon extension sekali lagi.", "Pastikan ringkasan kelas betul."], 230, 430, {size:48, weight:900, gap:1.45})}
      ${arrow(820, 620, 1100, 695, "KLIK UNTUK SEDIAKAN")}`, "MOEIS — Kehadiran Harian")
  },
  {
    step: "8",
    title: "Semak dan tekan Kemaskini sendiri",
    subtitle: "Penghantaran akhir sentiasa di bawah kawalan guru kelas",
    body: browserFrame(`<rect x="200" y="320" width="1080" height="470" rx="28" fill="#fff" stroke="#bed7ef" stroke-width="4"/>
      <text x="250" y="382" font-family="Arial" font-size="37" font-weight="900" fill="#14213d">TAHUN ENAM JAYYID · 11/11/2026</text>
      <rect x="250" y="425" width="460" height="105" rx="22" fill="#eafaf0"/><text x="480" y="492" text-anchor="middle" font-family="Arial" font-size="38" font-weight="900" fill="#14713a">HADIR 35</text>
      <rect x="740" y="425" width="460" height="105" rx="22" fill="#fff0f0"/><text x="970" y="492" text-anchor="middle" font-family="Arial" font-size="38" font-weight="900" fill="#b92828">TIDAK HADIR 0</text>
      ${textLines(["☑ Semak nama murid", "☑ Semak sebab tidak hadir", "☑ Pastikan bilangan betul"], 270, 600, {size:34, weight:800, gap:1.5})}
      ${button(1390, 630, 310, 100, "Kemaskini", "#16a05d")}
      ${arrow(1250, 520, 1490, 645, "AKHIR SEKALI")}
      <rect x="1330" y="340" width="420" height="180" rx="28" fill="#fff4d8" stroke="#efb83c" stroke-width="4"/>
      ${textLines(["Jangan terus tekan!", "Semak dahulu, kemudian", "guru sendiri menghantar."], 1540, 390, {size:27, color:"#76510a", weight:900, gap:1.35, anchor:"middle"})}`, "MOEIS — Kehadiran Harian")
  },
  {
    title: "Ringkasnya: hanya 4 tindakan harian",
    subtitle: "Sekiranya data tidak sepadan, extension akan berhenti untuk mengelakkan kesilapan",
    body: `<rect x="170" y="240" width="1580" height="650" rx="48" fill="#fff" opacity="0.97" filter="url(#shadow)"/>
      ${textLines(["1", "2", "3", "4"], 300, 365, {size:54, color:"#0b63ce", weight:900, gap:2.2, anchor:"middle"})}
      ${textLines(["Pilih nama dan semak data dalam SmartTrack", "Klik “Ambil data kelas saya”", "Buka kehadiran idMe dan klik “Isi kehadiran sekarang”", "Semak semua murid, kemudian tekan “Kemaskini”"], 390, 355, {size:39, weight:850, gap:3.05})}
      <rect x="330" y="790" width="1260" height="70" rx="28" fill="#e9f8ef"/>
      <text x="960" y="837" text-anchor="middle" font-family="Arial" font-size="30" font-weight="900" fill="#13713b">Kata laluan tidak dibaca atau disimpan oleh extension.</text>`
  }
];

slides.forEach((slide, index) => {
  const number = String(index + 1).padStart(2, "0");
  fs.writeFileSync(path.join(out, `slide${number}.svg`), layout(slide));
});

console.log(`Generated ${slides.length} slides.`);
