const API_URL = "https://portal-kelas-sekolah-biru.afiqzkablemo.chatgpt.site/api/school";
const $ = (selector) => document.querySelector(selector);
const state = {
  date: "", classes: [], staffAbsences: [], meta: {}, loading: false, saveTimer: null,
  savePromise: null, pendingAttendance: new Map(), staffDirty: false, metaDirty: false,
};

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function count(value, maximum = 999) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, parsed)) : 0;
}

function percent(part, whole) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(2)}%` : "0.00%";
}

function classFigures(row) {
  const enrolMale = count(row.enrolMale);
  const enrolFemale = count(row.enrolFemale);
  const absentMale = Math.min(count(row.absentMale), enrolMale);
  const absentFemale = Math.min(count(row.absentFemale), enrolFemale);
  const enrolTotal = enrolMale + enrolFemale;
  const absentTotal = absentMale + absentFemale;
  return { enrolMale, enrolFemale, absentMale, absentFemale, enrolTotal, absentTotal, presentMale: enrolMale - absentMale, presentFemale: enrolFemale - absentFemale, presentTotal: enrolTotal - absentTotal };
}

function setStatus(message, type = "") {
  const element = $("#saveStatus");
  element.textContent = message;
  element.className = `save-status ${type}`.trim();
}

function updateDateHeading() {
  const date = new Date(`${state.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return;
  $("#dateLong").textContent = new Intl.DateTimeFormat("ms-MY", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  $("#dayLong").textContent = new Intl.DateTimeFormat("ms-MY", { weekday: "long" }).format(date);
}

function renderAttendance() {
  $("#attendanceBody").innerHTML = state.classes.map((row, index) => {
    const f = classFigures(row);
    return `<tr data-class-id="${safe(row.id)}">
      <td>${index + 1}</td><td>${safe(row.teacherName || "—")}</td><td><strong>${safe(row.name)}</strong></td>
      <td>${f.enrolMale}</td><td>${f.enrolFemale}</td><td><strong>${f.enrolTotal}</strong></td>
      <td>${f.presentMale}</td><td>${f.presentFemale}</td><td><strong>${f.presentTotal}</strong></td><td><strong>${percent(f.presentTotal, f.enrolTotal)}</strong></td>
      <td><input class="cell-input num-input" type="number" inputmode="numeric" min="0" max="${f.enrolMale}" value="${f.absentMale}" data-field="absentMale" aria-label="Lelaki tidak hadir ${safe(row.name)}"></td>
      <td><input class="cell-input num-input" type="number" inputmode="numeric" min="0" max="${f.enrolFemale}" value="${f.absentFemale}" data-field="absentFemale" aria-label="Perempuan tidak hadir ${safe(row.name)}"></td>
      <td><strong>${f.absentTotal}</strong></td><td>${percent(f.absentTotal, f.enrolTotal)}</td>
      <td><input class="cell-input note-input" type="text" value="${safe(row.note)}" data-field="note" aria-label="Catatan ${safe(row.name)}"></td>
    </tr>`;
  }).join("");
  renderTotals();
}

function renderTotals() {
  const totals = state.classes.reduce((sum, row) => {
    const f = classFigures(row);
    Object.keys(f).forEach((key) => { sum[key] = (sum[key] || 0) + f[key]; });
    return sum;
  }, {});
  $("#attendanceTotals").innerHTML = `<tr><td colspan="3">JUMLAH KESELURUHAN</td><td>${totals.enrolMale || 0}</td><td>${totals.enrolFemale || 0}</td><td>${totals.enrolTotal || 0}</td><td>${totals.presentMale || 0}</td><td>${totals.presentFemale || 0}</td><td>${totals.presentTotal || 0}</td><td>${percent(totals.presentTotal || 0, totals.enrolTotal || 0)}</td><td>${totals.absentMale || 0}</td><td>${totals.absentFemale || 0}</td><td>${totals.absentTotal || 0}</td><td>${percent(totals.absentTotal || 0, totals.enrolTotal || 0)}</td><td></td></tr>`;
  $("#summaryEnrol").textContent = totals.enrolTotal || 0;
  $("#summaryPresent").textContent = totals.presentTotal || 0;
  $("#summaryAbsent").textContent = totals.absentTotal || 0;
  $("#summaryPercent").textContent = percent(totals.presentTotal || 0, totals.enrolTotal || 0);
}

function renderStaff() {
  while (state.staffAbsences.length < 11) state.staffAbsences.push({ staffName: "", subject: "", reason: "" });
  state.staffAbsences = state.staffAbsences.slice(0, 11);
  $("#staffBody").innerHTML = state.staffAbsences.map((row, index) => `<tr data-staff-index="${index}"><td>${index + 1}</td><td><input class="cell-input" data-field="staffName" value="${safe(row.staffName)}" aria-label="Nama guru atau AKP ${index + 1}"></td><td><input class="cell-input" data-field="subject" value="${safe(row.subject)}" aria-label="Subjek atau jawatan ${index + 1}"></td><td><input class="cell-input" data-field="reason" value="${safe(row.reason)}" aria-label="Sebab ${index + 1}"></td></tr>`).join("");
}

function renderMeta() {
  $("#reportNote").value = state.meta.note || "";
  $("#preparedBy").value = state.meta.preparedBy || "";
  $("#approvedBy").value = state.meta.approvedBy || "";
  $("#approvedTitle").value = state.meta.approvedTitle || "";
}

function hasPendingChanges() {
  return state.pendingAttendance.size > 0 || state.staffDirty || state.metaDirty;
}

async function loadReport(silent = false) {
  state.loading = true;
  if (!silent) setStatus("Memuatkan data…");
  updateDateHeading();
  try {
    const response = await fetch(`${API_URL}?date=${encodeURIComponent(state.date)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Data tidak dapat dibuka");
    state.classes = Array.isArray(data.classes) ? data.classes : [];
    state.staffAbsences = Array.isArray(data.staffAbsences) ? data.staffAbsences : [];
    state.meta = data.meta || {};
    renderAttendance(); renderStaff(); renderMeta();
    if (!silent) setStatus("Data bersama sedia", "saved");
  } catch (error) {
    console.error(error);
    if (!silent) {
      setStatus("Sambungan data terganggu", "error");
      alert("Data kehadiran belum dapat dibuka. Sila semak internet dan muat semula halaman.");
    }
  } finally { state.loading = false; }
}

function scheduleSave() {
  if (state.loading) return;
  clearTimeout(state.saveTimer);
  setStatus("Menyimpan perubahan…");
  state.saveTimer = setTimeout(() => flushSave(), 650);
}

async function flushSave() {
  clearTimeout(state.saveTimer);
  if (state.savePromise) {
    await state.savePromise;
    if (hasPendingChanges()) return flushSave();
    return;
  }
  if (!hasPendingChanges()) return;
  const snapshot = {
    date: state.date,
    attendanceUpdates: Array.from(state.pendingAttendance.values()).map((item) => ({ ...item })),
    staffAbsences: state.staffDirty ? state.staffAbsences.map((item) => ({ ...item })) : null,
    meta: state.metaDirty ? { ...state.meta } : null,
  };
  state.pendingAttendance.clear(); state.staffDirty = false; state.metaDirty = false;
  const payload = { date: snapshot.date, attendanceUpdates: snapshot.attendanceUpdates };
  if (snapshot.staffAbsences) payload.staffAbsences = snapshot.staffAbsences;
  if (snapshot.meta) payload.meta = snapshot.meta;
  state.savePromise = (async () => {
    try {
      const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Simpanan gagal");
      const time = new Date(data.savedAt || Date.now()).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
      if (!hasPendingChanges()) setStatus(`Tersimpan ${time}`, "saved");
    } catch (error) {
      console.error(error);
      for (const oldPatch of snapshot.attendanceUpdates) {
        const newerPatch = state.pendingAttendance.get(oldPatch.id) || { id: oldPatch.id };
        state.pendingAttendance.set(oldPatch.id, { ...oldPatch, ...newerPatch });
      }
      if (snapshot.staffAbsences && !state.staffDirty) state.staffDirty = true;
      if (snapshot.meta && !state.metaDirty) state.metaDirty = true;
      setStatus("Belum tersimpan — cuba lagi", "error");
    }
  })();
  await state.savePromise;
  state.savePromise = null;
  if (hasPendingChanges()) scheduleSave();
}

$("#attendanceBody").addEventListener("input", (event) => {
  const input = event.target.closest("input[data-field]");
  if (!input) return;
  const row = input.closest("tr[data-class-id]");
  const item = state.classes.find((entry) => entry.id === row.dataset.classId);
  if (!item) return;
  const field = input.dataset.field;
  if (field === "note") item[field] = input.value;
  else {
    const maximum = field === "absentMale" ? count(item.enrolMale) : count(item.enrolFemale);
    item[field] = Math.min(count(input.value), maximum);
    input.value = item[field];
  }
  const pending = state.pendingAttendance.get(item.id) || { id: item.id };
  pending[field] = item[field];
  state.pendingAttendance.set(item.id, pending);
  renderTotals(); scheduleSave();
});

$("#staffBody").addEventListener("input", (event) => {
  const input = event.target.closest("input[data-field]");
  if (!input) return;
  const index = Number(input.closest("tr").dataset.staffIndex);
  state.staffAbsences[index][input.dataset.field] = input.value;
  state.staffDirty = true;
  scheduleSave();
});

[["#reportNote", "note"], ["#preparedBy", "preparedBy"], ["#approvedBy", "approvedBy"], ["#approvedTitle", "approvedTitle"]].forEach(([selector, field]) => {
  $(selector).addEventListener("input", (event) => { state.meta[field] = event.target.value; state.metaDirty = true; scheduleSave(); });
});

$("#reportDate").addEventListener("change", async (event) => {
  if (!event.target.value) return;
  await flushSave();
  state.date = event.target.value;
  state.pendingAttendance.clear(); state.staffDirty = false; state.metaDirty = false;
  loadReport();
});
$("#printButton").addEventListener("click", () => window.print());

state.date = localDateValue();
$("#reportDate").value = state.date;
loadReport();

setInterval(() => {
  const editing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");
  if (document.visibilityState === "visible" && !editing && !state.loading && !state.savePromise && !hasPendingChanges()) loadReport(true);
}, 15000);
