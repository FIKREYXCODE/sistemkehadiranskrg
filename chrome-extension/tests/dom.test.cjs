const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const extensionRoot = path.resolve(__dirname, "..");
const script = (name) => fs.readFileSync(path.join(extensionRoot, name), "utf8");

function buildDom(html) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.test/" });
  dom.window.HTMLElement.prototype.getBoundingClientRect = function rect() {
    return { width: 120, height: 32, top: 0, left: 0, right: 120, bottom: 32 };
  };
  dom.window.__listeners = [];
  dom.window.chrome = { runtime: { onMessage: { addListener(fn) { dom.window.__listeners.push(fn); } } } };
  return dom;
}

function send(dom, message) {
  return new Promise((resolve) => {
    const listener = dom.window.__listeners.at(-1);
    listener(message, {}, resolve);
  });
}

(async () => {
  const smartDom = buildDom(`<!doctype html><html><body>
    <input id="reportDate" value="2026-11-11">
    <select id="editorName"><option selected>MOHAMMAD FIKREY BIN ABDUL GAPAR</option></select>
    <table><tbody id="attendanceBody"><tr class="class-complete" data-class-id="tahun-6-jayyid">
      <td class="attendance-teacher">MOHAMMAD FIKREY BIN ABDUL GAPAR <em>✓ Selesai</em></td>
      <td class="attendance-class"><strong>6 Jayyid</strong></td>
      <td data-label="Daftar L">18</td><td data-label="Daftar P">17</td>
      <td data-label="Hadir L">18</td><td data-label="Hadir P">17</td>
      <td data-label="Tidak hadir L"><input value="0"></td>
      <td data-label="Tidak hadir P"><input value="0"></td>
      <td class="attendance-note"><input value="SH"></td>
    </tr></tbody></table>
  </body></html>`);
  smartDom.window.eval(script("content-smarttrack.js"));
  const extraction = await send(smartDom, { type: "HEM_EXTRACT_ATTENDANCE" });
  assert.equal(extraction.ok, true);
  assert.equal(extraction.records.length, 1);
  assert.equal(extraction.records[0].className, "6 Jayyid");
  assert.equal(extraction.records[0].teacherName, "MOHAMMAD FIKREY BIN ABDUL GAPAR");
  assert.equal(extraction.activeTeacherName, "MOHAMMAD FIKREY BIN ABDUL GAPAR");
  assert.equal(extraction.records[0].enrolTotal, 35);
  assert.equal(extraction.records[0].presentTotal, 35);
  assert.equal(extraction.records[0].absentTotal, 0);
  assert.equal(extraction.records[0].absentNames, "Semua murid hadir");
  assert.equal(extraction.records[0].complete, true);

  const idmeDom = buildDom(`<!doctype html><html><body>
    <form id="attendanceForm">
      <label>Tarikh Kehadiran <input id="attendanceDate" type="date"></label>
      <label>Kelas <select id="className"><option>6 Jayyid</option><option>6 Khoir</option></select></label>
      <label>Jumlah murid hadir <input id="presentTotal" type="number"></label>
      <label>Jumlah murid tidak hadir <input id="absentTotal" type="number"></label>
      <label>Senarai nama murid tidak hadir <textarea id="absentNames"></textarea></label>
      <label>Kata laluan <input id="password" type="password"></label>
      <button id="submit" type="submit">Hantar</button>
    </form>
  </body></html>`);
  idmeDom.window.__submitted = false;
  idmeDom.window.document.querySelector("#attendanceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    idmeDom.window.__submitted = true;
  });
  idmeDom.window.eval(script("matcher.js"));
  idmeDom.window.eval(script("content-idme.js"));
  const record = {
    date: "2026-11-11", className: "6 Jayyid", enrolTotal: 35,
    presentMale: 18, presentFemale: 17, presentTotal: 35,
    absentMale: 0, absentFemale: 0, absentTotal: 0,
    attendancePercent: "100.00", absentNames: "Semua murid hadir"
  };
  const fill = await send(idmeDom, { type: "HEM_IDME_FILL", record });
  assert.equal(fill.ok, true);
  assert.ok(fill.filled.includes("date"));
  assert.ok(fill.filled.includes("className"));
  assert.ok(fill.filled.includes("presentTotal"));
  assert.ok(fill.filled.includes("absentTotal"));
  assert.equal(idmeDom.window.document.querySelector("#attendanceDate").value, "2026-11-11");
  assert.equal(idmeDom.window.document.querySelector("#className").value, "6 Jayyid");
  assert.equal(idmeDom.window.document.querySelector("#presentTotal").value, "35");
  assert.equal(idmeDom.window.document.querySelector("#absentTotal").value, "0");
  assert.equal(idmeDom.window.document.querySelector("#password").value, "");
  assert.equal(idmeDom.window.__submitted, false);

  const moeisDom = buildDom(`<!doctype html><html><body>
    <span id="select2-txtNamakelas-container">TAHUN ENAM JAYYID</span>
    <input id="tkh_HH" value="11/11/2026">
    <table id="kehadiran"><tbody>
      <tr><td>1</td><td><input type="checkbox" id="case-hadir-1" checked></td><td>AIRIS NUR RAYSHA AMANDA BINTI RIDUAN</td></tr>
      <tr><td>2</td><td><input type="checkbox" id="case-hadir-2" checked></td><td>ARIZ FAIQH BIN MOHD ROZAIDY</td><td>
        <select class="category"><option value="">---SILA PILIH KATEGORI---</option><option value="health">MASALAH KESIHATAN</option><option value="family">MASALAH KELUARGA</option></select>
        <select class="reason"><option value="">---SILA PILIH SEBAB---</option><option value="fever">DEMAM</option><option value="family">URUSAN KELUARGA</option></select>
      </td></tr>
      <tr><td>3</td><td><input type="checkbox" id="case-hadir-3" checked></td><td>NUR ADILAH BINTI ABDUL MALIK</td><td>
        <select class="category"><option value="">---SILA PILIH KATEGORI---</option><option value="health">MASALAH KESIHATAN</option></select>
        <select class="reason"><option value="">---SILA PILIH SEBAB---</option><option value="fever">DEMAM</option></select>
      </td></tr>
    </tbody></table>
    <button id="kemaskiniKehadiran">Kemaskini</button>
  </body></html>`);
  moeisDom.window.__submitted = false;
  moeisDom.window.document.querySelector("#kemaskiniKehadiran").addEventListener("click", () => {
    moeisDom.window.__submitted = true;
  });
  moeisDom.window.eval(script("matcher.js"));
  moeisDom.window.eval(script("content-idme.js"));
  const moeisAnalysis = await send(moeisDom, { type: "HEM_IDME_ANALYZE" });
  assert.equal(moeisAnalysis.mode, "moeispel");
  assert.equal(moeisAnalysis.studentCount, 3);
  const moeisFill = await send(moeisDom, { type: "HEM_IDME_FILL", record: {
    date: "2026-11-11", className: "6 Jayyid", enrolTotal: 3,
    absentTotal: 1, absentNames: "Ariz Faiqh"
  } });
  assert.equal(moeisFill.ok, true);
  assert.equal(moeisFill.filled.length, 3);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-1").checked, true);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-2").checked, false);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-3").checked, true);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-2").closest("tr").querySelector(".category").value, "health");
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-2").closest("tr").querySelector(".reason").value, "fever");
  assert.equal(moeisDom.window.__submitted, false);

  const arizRow = moeisDom.window.document.querySelector("#case-hadir-2").closest("tr");
  arizRow.querySelector(".category").value = "family";
  arizRow.querySelector(".reason").value = "family";
  await send(moeisDom, { type: "HEM_IDME_FILL", record: {
    date: "2026-11-11", className: "6 Jayyid", enrolTotal: 3,
    absentTotal: 1, absentNames: "Ariz Faiqh"
  } });
  assert.equal(arizRow.querySelector(".category").value, "family");
  assert.equal(arizRow.querySelector(".reason").value, "family");

  const shortNameFill = await send(moeisDom, { type: "HEM_IDME_FILL", record: {
    date: "2026-11-11", className: "6 Jayyid", enrolTotal: 3,
    absentTotal: 1, absentNames: "N. Adilah"
  } });
  assert.equal(shortNameFill.ok, true);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-1").checked, true);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-2").checked, true);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-3").checked, false);
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-3").closest("tr").querySelector(".category").value, "health");
  assert.equal(moeisDom.window.document.querySelector("#case-hadir-3").closest("tr").querySelector(".reason").value, "fever");

  const conjunctionDom = buildDom(`<!doctype html><html><body>
    <span id="select2-txtNamakelas-container">TAHUN ENAM JAYYID</span>
    <input id="tkh_HH" value="11/11/2026">
    <table id="kehadiran"><tbody>
      <tr><td>1</td><td><input type="checkbox" id="case-hadir-11" checked></td><td>NUR ALYA BINTI AHMAD</td><td><select><option value="">---SILA PILIH KATEGORI---</option><option value="health">MASALAH KESIHATAN</option></select><select><option value="">---SILA PILIH SEBAB---</option><option value="fever">DEMAM</option></select></td></tr>
      <tr><td>2</td><td><input type="checkbox" id="case-hadir-12" checked></td><td>MUHAMMAD AFIF BIN ALI</td><td><select><option value="">---SILA PILIH KATEGORI---</option><option value="health">MASALAH KESIHATAN</option></select><select><option value="">---SILA PILIH SEBAB---</option><option value="fever">DEMAM</option></select></td></tr>
      <tr><td>3</td><td><input type="checkbox" id="case-hadir-13" checked></td><td>AMIR HAKIM BIN OSMAN</td><td><select><option value="">---SILA PILIH KATEGORI---</option><option value="health">MASALAH KESIHATAN</option></select><select><option value="">---SILA PILIH SEBAB---</option><option value="fever">DEMAM</option></select></td></tr>
    </tbody></table>
  </body></html>`);
  conjunctionDom.window.eval(script("matcher.js"));
  conjunctionDom.window.eval(script("content-idme.js"));
  const conjunctionFill = await send(conjunctionDom, { type: "HEM_IDME_FILL", record: {
    date: "2026-11-11", className: "6 Jayyid", enrolTotal: 3,
    absentTotal: 3, absentNames: "Alya dan Afif & Amir"
  } });
  assert.equal(conjunctionFill.ok, true);
  assert.equal(conjunctionDom.window.document.querySelector("#case-hadir-11").checked, false);
  assert.equal(conjunctionDom.window.document.querySelector("#case-hadir-12").checked, false);
  assert.equal(conjunctionDom.window.document.querySelector("#case-hadir-13").checked, false);
  assert.equal(conjunctionFill.defaultReasonApplied, 3);

  console.log("DOM bridge tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
