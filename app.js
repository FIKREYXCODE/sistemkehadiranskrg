const API_URL = "https://portal-kelas-sekolah-biru.afiqzkablemo.chatgpt.site/api/school";
const $ = (selector) => document.querySelector(selector);
const state = {
  date: "", classes: [], staffAbsences: [], meta: {}, loading: false, saveTimer: null,
  savePromise: null, pendingAttendance: new Map(), staffDirty: false, metaDirty: false, audit: new Map(), adminPin: "",
};
const DRAFT_PREFIX = "skrg-pending-v1:";
const EDITOR_KEY = "skrg-editor-name-v1";

function draftKey(date = state.date) { return `${DRAFT_PREFIX}${date}`; }

function saveDraft() {
  try {
    const draft = {
      attendanceUpdates: Array.from(state.pendingAttendance.values()),
      staffAbsences: state.staffDirty ? state.staffAbsences : null,
      meta: state.metaDirty ? state.meta : null,
    };
    if (hasPendingChanges()) localStorage.setItem(draftKey(), JSON.stringify(draft));
    else localStorage.removeItem(draftKey());
  } catch { /* Pelayar mungkin menyekat storan draf; simpanan bersama masih diteruskan. */ }
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey()) || "null");
    if (!draft) return false;
    for (const patch of Array.isArray(draft.attendanceUpdates) ? draft.attendanceUpdates : []) {
      const item = state.classes.find((entry) => entry.id === patch.id);
      if (!item) continue;
      const pending = { id: patch.id };
      for (const field of ["absentMale", "absentFemale", "note"]) if (Object.prototype.hasOwnProperty.call(patch, field)) {
        item[field] = patch[field]; pending[field] = patch[field];
      }
      state.pendingAttendance.set(patch.id, pending);
    }
    if (Array.isArray(draft.staffAbsences)) { state.staffAbsences = draft.staffAbsences; state.staffDirty = true; }
    if (draft.meta && typeof draft.meta === "object") { state.meta = draft.meta; state.metaDirty = true; }
    return hasPendingChanges();
  } catch { return false; }
}

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function editorName() { return $("#editorName").value.trim(); }

function auditKey(section, recordId, fieldName) { return `${section}:${recordId}:${fieldName}`; }

function auditDetails(section, recordId, fieldName) {
  const item = state.audit.get(auditKey(section, recordId, fieldName));
  if (!item) return { className: "", title: "" };
  const time = new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(Number(item.updatedAt)));
  return { className: " has-audit", title: `Diisi oleh: ${item.updatedBy} • ${time}` };
}

function applyAttendanceAudit(updates, updatedBy, updatedAt) {
  for (const patch of updates) {
    for (const fieldName of ["absentMale", "absentFemale", "note"]) {
      if (!Object.prototype.hasOwnProperty.call(patch, fieldName)) continue;
      const key = auditKey("attendance", patch.id, fieldName);
      if (fieldName === "note" && !String(patch[fieldName] ?? "").trim()) state.audit.delete(key);
      else state.audit.set(key, { section: "attendance", recordId: patch.id, fieldName, updatedBy, updatedAt });
      const input = document.querySelector(`tr[data-class-id="${patch.id}"] input[data-field="${fieldName}"]`);
      if (!input) continue;
      const details = auditDetails("attendance", patch.id, fieldName);
      input.title = details.title;
      input.classList.toggle("has-audit", Boolean(details.title));
    }
  }
}

function updateEditingAccess() {
  const allowed = Boolean(editorName());
  document.querySelectorAll("#attendanceBody input,#staffBody input,#reportNote,#preparedBy,#approvedBy,#approvedTitle").forEach((element) => { element.readOnly = !allowed; });
  $("#editorName").classList.toggle("invalid", !allowed);
  if (!allowed && !state.loading) setStatus("Isi nama pengisi untuk mula");
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
      <td><input class="cell-input num-input${auditDetails("attendance", row.id, "absentMale").className}" type="number" inputmode="numeric" min="0" max="${f.enrolMale}" value="${f.absentMale}" data-field="absentMale" aria-label="Lelaki tidak hadir ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "absentMale").title)}"></td>
      <td><input class="cell-input num-input${auditDetails("attendance", row.id, "absentFemale").className}" type="number" inputmode="numeric" min="0" max="${f.enrolFemale}" value="${f.absentFemale}" data-field="absentFemale" aria-label="Perempuan tidak hadir ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "absentFemale").title)}"></td>
      <td><strong>${f.absentTotal}</strong></td><td>${percent(f.absentTotal, f.enrolTotal)}</td>
      <td><input class="cell-input note-input${auditDetails("attendance", row.id, "note").className}" type="text" value="${safe(row.note)}" data-field="note" aria-label="Catatan ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "note").title)}"></td>
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
  $("#staffBody").innerHTML = state.staffAbsences.map((row, index) => `<tr data-staff-index="${index}"><td>${index + 1}</td><td><input class="cell-input${auditDetails("staff", String(index + 1), "staffName").className}" data-field="staffName" value="${safe(row.staffName)}" aria-label="Nama guru atau AKP ${index + 1}" title="${safe(auditDetails("staff", String(index + 1), "staffName").title)}"></td><td><input class="cell-input${auditDetails("staff", String(index + 1), "subject").className}" data-field="subject" value="${safe(row.subject)}" aria-label="Subjek atau jawatan ${index + 1}" title="${safe(auditDetails("staff", String(index + 1), "subject").title)}"></td><td><input class="cell-input${auditDetails("staff", String(index + 1), "reason").className}" data-field="reason" value="${safe(row.reason)}" aria-label="Sebab ${index + 1}" title="${safe(auditDetails("staff", String(index + 1), "reason").title)}"></td></tr>`).join("");
  updateEditingAccess();
}

function renderMeta() {
  $("#reportNote").value = state.meta.note || "";
  $("#preparedBy").value = state.meta.preparedBy || "";
  $("#approvedBy").value = state.meta.approvedBy || "";
  $("#approvedTitle").value = state.meta.approvedTitle || "";
  for (const [selector, field] of [["#reportNote", "note"], ["#preparedBy", "preparedBy"], ["#approvedBy", "approvedBy"], ["#approvedTitle", "approvedTitle"]]) {
    const element = $(selector);
    const details = auditDetails("meta", "report", field);
    element.title = details.title;
    element.classList.toggle("has-audit", Boolean(details.title));
  }
  updateEditingAccess();
}

function renderAdminClasses() {
  $("#adminClassBody").innerHTML = state.classes.map((row) => `<tr data-admin-class-id="${safe(row.id)}">
    <td><strong>${safe(row.name)}</strong></td>
    <td><input data-admin-field="teacherName" type="text" maxlength="140" value="${safe(row.teacherName)}" aria-label="Nama guru kelas ${safe(row.name)}"></td>
    <td><input data-admin-field="enrolMale" type="number" min="0" max="300" inputmode="numeric" value="${count(row.enrolMale)}" aria-label="Bilangan murid lelaki ${safe(row.name)}"></td>
    <td><input data-admin-field="enrolFemale" type="number" min="0" max="300" inputmode="numeric" value="${count(row.enrolFemale)}" aria-label="Bilangan murid perempuan ${safe(row.name)}"></td>
  </tr>`).join("");
}

function showAdminLogin(message = "") {
  state.adminPin = "";
  $("#adminSettingsView").hidden = true;
  $("#adminLoginView").hidden = false;
  $("#adminPin").value = "";
  $("#adminError").textContent = message;
  setTimeout(() => $("#adminPin").focus(), 0);
}

function closeAdminModal() {
  state.adminPin = "";
  $("#adminPin").value = "";
  $("#adminModal").hidden = true;
  document.body.classList.remove("modal-open");
}

async function verifyAdmin(event) {
  event.preventDefault();
  const pin = $("#adminPin").value;
  $("#adminError").textContent = "Mengesahkan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verifyAdmin", adminPin: pin }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Kod admin tidak sah.");
    state.adminPin = pin;
    $("#adminPin").value = "";
    $("#adminLoginView").hidden = true;
    $("#adminSettingsView").hidden = false;
    $("#profileEffectiveDate").value = state.date || localDateValue();
    $("#adminSaveStatus").textContent = "";
    renderAdminClasses();
  } catch (error) {
    state.adminPin = "";
    $("#adminError").textContent = error.message || "Kod admin tidak sah.";
  }
}

async function saveClassProfiles() {
  const effectiveDate = $("#profileEffectiveDate").value;
  if (!effectiveDate) { $("#adminSaveStatus").textContent = "Pilih tarikh berkuat kuasa."; return; }
  const profiles = Array.from(document.querySelectorAll("#adminClassBody tr")).map((row) => ({
    id: row.dataset.adminClassId,
    teacherName: row.querySelector('[data-admin-field="teacherName"]').value.trim(),
    enrolMale: count(row.querySelector('[data-admin-field="enrolMale"]').value, 300),
    enrolFemale: count(row.querySelector('[data-admin-field="enrolFemale"]').value, 300),
  }));
  $("#adminSave").disabled = true;
  $("#adminSaveStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateClassProfiles", adminPin: state.adminPin, effectiveDate, profiles }) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) { showAdminLogin("Sesi admin tamat. Masukkan kod semula."); return; }
      throw new Error(data.error || "Tetapan gagal disimpan.");
    }
    $("#adminSaveStatus").textContent = "Tetapan berjaya disimpan.";
    if (effectiveDate <= state.date) await loadReport(true);
  } catch (error) {
    $("#adminSaveStatus").textContent = error.message || "Tetapan gagal disimpan.";
  } finally { $("#adminSave").disabled = false; }
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
    state.audit = new Map((Array.isArray(data.audit) ? data.audit : []).map((item) => [auditKey(item.section, item.recordId, item.fieldName), item]));
    const restoredDraft = !silent && restoreDraft();
    renderAttendance(); renderStaff(); renderMeta();
    if (!silent) {
      setStatus(restoredDraft ? "Menyambung simpanan tertangguh…" : "Data bersama sedia", restoredDraft ? "" : "saved");
      if (restoredDraft) scheduleSave();
    }
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
  if (!editorName()) { updateEditingAccess(); return; }
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
    updatedBy: editorName(),
  };
  state.pendingAttendance.clear(); state.staffDirty = false; state.metaDirty = false;
  const payload = { date: snapshot.date, attendanceUpdates: snapshot.attendanceUpdates, updatedBy: snapshot.updatedBy };
  if (snapshot.staffAbsences) payload.staffAbsences = snapshot.staffAbsences;
  if (snapshot.meta) payload.meta = snapshot.meta;
  state.savePromise = (async () => {
    try {
      const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Simpanan gagal");
      const time = new Date(data.savedAt || Date.now()).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
      applyAttendanceAudit(snapshot.attendanceUpdates, snapshot.updatedBy, data.savedAt || Date.now());
      if (!hasPendingChanges()) setStatus(`Tersimpan ${time}`, "saved");
      saveDraft();
      if (!hasPendingChanges() && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) loadReport(true);
    } catch (error) {
      console.error(error);
      for (const oldPatch of snapshot.attendanceUpdates) {
        const newerPatch = state.pendingAttendance.get(oldPatch.id) || { id: oldPatch.id };
        state.pendingAttendance.set(oldPatch.id, { ...oldPatch, ...newerPatch });
      }
      if (snapshot.staffAbsences && !state.staffDirty) state.staffDirty = true;
      if (snapshot.meta && !state.metaDirty) state.metaDirty = true;
      saveDraft();
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
  saveDraft();
  renderTotals(); scheduleSave();
});

$("#staffBody").addEventListener("input", (event) => {
  const input = event.target.closest("input[data-field]");
  if (!input) return;
  const index = Number(input.closest("tr").dataset.staffIndex);
  state.staffAbsences[index][input.dataset.field] = input.value;
  state.staffDirty = true;
  saveDraft();
  scheduleSave();
});

[["#reportNote", "note"], ["#preparedBy", "preparedBy"], ["#approvedBy", "approvedBy"], ["#approvedTitle", "approvedTitle"]].forEach(([selector, field]) => {
  $(selector).addEventListener("input", (event) => { state.meta[field] = event.target.value; state.metaDirty = true; saveDraft(); scheduleSave(); });
});

$("#reportDate").addEventListener("change", async (event) => {
  if (!event.target.value) return;
  await flushSave();
  state.date = event.target.value;
  state.pendingAttendance.clear(); state.staffDirty = false; state.metaDirty = false;
  loadReport();
});
$("#printButton").addEventListener("click", () => window.print());
$("#adminButton").addEventListener("click", async () => {
  await flushSave();
  $("#adminModal").hidden = false;
  document.body.classList.add("modal-open");
  showAdminLogin();
});
$("#adminClose").addEventListener("click", closeAdminModal);
$("#adminLoginForm").addEventListener("submit", verifyAdmin);
$("#adminSave").addEventListener("click", saveClassProfiles);
$("#adminModal").addEventListener("click", (event) => { if (event.target === $("#adminModal")) closeAdminModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#adminModal").hidden) closeAdminModal(); });

$("#editorName").addEventListener("input", (event) => {
  const name = event.target.value.trim();
  try {
    if (name) localStorage.setItem(EDITOR_KEY, name);
    else localStorage.removeItem(EDITOR_KEY);
  } catch { /* Nama masih boleh digunakan untuk sesi semasa. */ }
  updateEditingAccess();
  if (name) {
    if (hasPendingChanges()) scheduleSave();
    else setStatus("Nama pengisi sedia", "saved");
  }
});

state.date = localDateValue();
$("#reportDate").value = state.date;
try { $("#editorName").value = localStorage.getItem(EDITOR_KEY) || ""; } catch { /* abaikan */ }
loadReport();

setInterval(() => {
  const editing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");
  if (document.visibilityState === "visible" && !editing && !state.loading && !state.savePromise && !hasPendingChanges()) loadReport(true);
}, 15000);

window.addEventListener("online", () => { if (hasPendingChanges()) scheduleSave(); });
window.addEventListener("beforeunload", (event) => {
  if (!hasPendingChanges() && !state.savePromise) return;
  event.preventDefault(); event.returnValue = "";
});
