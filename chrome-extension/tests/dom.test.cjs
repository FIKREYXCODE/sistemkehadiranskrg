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

  console.log("DOM bridge tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
