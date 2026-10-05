const API_URL = "https://portal-kelas-sekolah-biru.afiqzkablemo.chatgpt.site/api/school";
const SAFETY_API_URL = API_URL.replace(/\/school$/, "/safety");
const ORGANIZATION_API_URL = API_URL.replace(/\/school$/, "/organization");
const CONTENT_API_URL = API_URL.replace(/\/school$/, "/content");
const $ = (selector) => document.querySelector(selector);
const state = {
  date: "", classes: [], staffAbsences: { morning: [], afternoon: [] }, dutyTeachers: { morning: [], afternoon: [] }, meta: {}, loading: false, saveTimer: null,
  savePromise: null, pendingAttendance: new Map(), staffDirty: false, dutyDirtySessions: new Set(), pendingMeta: {}, audit: new Map(), adminPin: "", session: "all",
  staffDirectory: [], adminStaffDirectory: [], schoolStats: { teachers: 58, akp: 3 },
  analytics: { period: "week", date: "", loading: false, filtersReady: false, filterPromise: null, annualLoadingYear: "", annualCache: new Map() },
  monitoring: { reports: [], loading: false, previewUrls: [] },
  weeklyDuty: { loading: false }, completion: { loading: false }, calendar: { loading: false }, rmtPreviewUrls: [], rmtReports: [], rmtLoading: false,
  opr: { reports: [], loading: false, previewUrls: [] }, editingRecord: null,
  organization: { items: [], adminItems: [], deletedIds: [], loading: false },
  content: { announcements: [], adminAnnouncements: [], deletedAnnouncementIds: [], latestLetters: [], letters: [], loading: false },
};
const DRAFT_PREFIX = "skrg-pending-v1:";
const EDITOR_KEY = "skrg-editor-name-v1";
const DEFAULT_STAFF_NAMES = [
  "YUNUS BIN PATARAI", "RAHMATIAH BINTI MOHD JUDA", "KOMALA BINTI JOSEPH", "WARNAH BINTI SIRA", "EMRAN BIN HJ SELAMAT",
  "AG KU KEMAINDDRA BIN PG MOHD TAIB", "AHAD BIN JAAFAR", "AINATUN NADHIRAH BINTI DHARMAWI", "ANI BINTI PATOLA", "ASMADI BIN LAJJAKASI",
  "BAJAM BINTI LADUNG", "DARMAWATI BTE LOKKONG", "EVALORENNA BINTI LAMINSIN", "FARIDAH BINTI SUNU", "HALIM BIN BIDI",
  "HAMSIAH BINTI HAMID", "HASNAN BIN MAT ZIN", "JAIBY BIN JULIAN", "JAINAH BINTI SULAIMAN", "JUNAID BIN NURDIN",
  "MARIANA BINTI KASSIM", "MARINI BINTI LADI", "MASTURAH BINTI TUDA", "MOHAMMAD FIKREY BIN ABDUL GAPAR", "MOHAMMAD IKHWAN BIN ABDURAIS",
  "MOHD ALFAIZAL BIN DAUD", "MOHD MUEMIN BIN MOHD AMIN JAPAR", "MUHAMADIAN BIN SUAIBU", "NECHI BINTI SERUNAI", "NOOR SYAFIQAH NADHIRAH BINTI JAMALUDDIN",
  "NORIMAH BINTI JOYO REJO", "NORLINA BINTI BAGWAS", "NOZE BINTI TUKIJAN", "NUR FAEZAH BINTI BANTALANI", "NURUL ANISA BINTI SAPARUDIN",
  "RASMAWATI BINTI TAUSE", "RINI BINTI DAUD", "ROBIATUL AIDAWYAH", "RONI BIN BACHO", "ROSIDIAN BIN IDRIS",
  "ROSMINAH BINTI SAPAR", "RUHAYA BINTI AHMAD", "S.LILI BINTI LADI", "SABRIAH @ HABIBAH BINTI ABDUL SABAR", "SALSABILA BINTI SHAHRUDDIN",
  "SITI JAWARA BINTI LUKMAN", "SITI NAURIN FADZILAH BINTI JALAL", "SITI RABIA BIN IBRAHIM", "SUNARTI BINTI TAPPA", "TANJANG BIN TURE",
  "WAFA FARHANA BINTI ABD KADIR", "WAN MUHAMAD YUSUF BIN WAN ABDUL AZIZ", "YUSNI BINTI WAHJUDIN", "ZAMRIE BIN OMAR ALI", "HANISAH BINTI MANSOR",
  "NURAIDA BINTI KAIMUDIN", "MULYANTI BINTI MIKIL @ MOHAMED ISHAK", "RAPIDAH BINTI KARIM", "YENNY BINTI SANAUDI", "FARIDAH BINTI ACHO",
];
const MONITORING_CATEGORY_LABELS = { cleanliness: "Kebersihan", safety: "Keselamatan", both: "Kebersihan dan keselamatan" };
const MONITORING_STATUS_LABELS = { controlled: "Terkawal", attention: "Perlu perhatian", not_applicable: "Tidak berkaitan" };
const ADMIN_APPROVERS = {
  "YUNUS PATARAI": "Guru Besar",
  "PUAN HAJAH RAHMATIAH BINTI MOJUDA": "Penolong Kanan Pentadbiran",
  "PUAN KOMALA JOSEPH": "Penolong Kanan HEM",
  "PUAN WARNAH": "Penolong Kanan Kokurikulum",
  "TUAN HAJI EMRAN": "Penyelia Petang",
};
const ABSENCE_REASONS = ["Kursus / Bengkel", "Mesyuarat / Taklimat", "Urusan Rasmi", "Program / Aktiviti Rasmi", "Tugas Rasmi di Luar Sekolah", "Cuti Sakit / MC", "Cuti Rehat Khas / CRK", "Cuti Tanpa Rekod / CTR", "Cuti Bersalin", "Cuti Kuarantin", "Cuti / Kebenaran Khas", "Lain-lain"];
const KPI_TARGET = 96;
const MONITORING_LOCATIONS = ["Kawasan Perhimpunan", "Bilik Darjah", "Koridor", "Tangga", "Padang", "Dewan", "Tandas Murid Lelaki", "Tandas Murid Perempuan", "Tandas Guru", "Surau / Bilik Solat", "Kantin", "Kawasan RMT", "Penyediaan Makanan RMT", "Pengendalian Makanan RMT", "Pintu Pagar", "Laluan Keluar / Masuk", "Kawasan Letak Kenderaan", "Laluan Pejalan Kaki", "Kawasan Sekitar Sekolah", "Longkang & Saliran", "Tempat Pembuangan Sampah", "Landskap / Kawasan Hijau", "Bilik UBK", "Makmal Komputer", "Pusat Sumber", "Bilik Sains", "Bilik Muzik", "Stor", "Bilik khas lain", "Lain-lain"];

function draftKey(date = state.date) { return `${DRAFT_PREFIX}${date}`; }

function saveDraft() {
  try {
    const draft = {
      attendanceUpdates: Array.from(state.pendingAttendance.values()),
      staffAbsences: state.staffDirty ? state.staffAbsences : null,
      dutyTeacherUpdates: Array.from(state.dutyDirtySessions).map((session) => ({ session, teachers: state.dutyTeachers[session] })),
      metaUpdates: Object.keys(state.pendingMeta).length ? state.pendingMeta : null,
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
    if (draft.staffAbsences && typeof draft.staffAbsences === "object") {
      state.staffAbsences = Array.isArray(draft.staffAbsences)
        ? { morning: draft.staffAbsences, afternoon: [] }
        : { morning: Array.isArray(draft.staffAbsences.morning) ? draft.staffAbsences.morning : [], afternoon: Array.isArray(draft.staffAbsences.afternoon) ? draft.staffAbsences.afternoon : [] };
      state.staffDirty = true;
    }
    for (const update of Array.isArray(draft.dutyTeacherUpdates) ? draft.dutyTeacherUpdates : []) {
      if (!["morning", "afternoon"].includes(update.session) || !Array.isArray(update.teachers)) continue;
      state.dutyTeachers[update.session] = update.teachers.slice(0, 5);
      state.dutyDirtySessions.add(update.session);
    }
    if (draft.metaUpdates && typeof draft.metaUpdates === "object") {
      state.pendingMeta = { ...draft.metaUpdates };
      state.meta = { ...state.meta, ...draft.metaUpdates };
    }
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

function activeStaffNames() {
  const names = state.staffDirectory.filter((item) => item.active !== false).map((item) => String(item.name || "").trim()).filter(Boolean);
  return [...new Set(names.length ? names : DEFAULT_STAFF_NAMES)].sort((a, b) => a.localeCompare(b, "ms"));
}

function refreshStaffNameChoices() {
  const names = activeStaffNames();
  $("#staffNames").innerHTML = names.map((name) => `<option value="${safe(name)}"></option>`).join("");
  const fillSelect = (element, placeholder) => {
    if (!element) return;
    const current = element.value;
    const choices = current && !names.includes(current) ? [current, ...names] : names;
    element.innerHTML = `<option value="">${safe(placeholder)}</option>${choices.map((name) => `<option value="${safe(name)}"${name === current ? " selected" : ""}>${safe(name)}</option>`).join("")}`;
  };
  fillSelect($("#editorName"), "Pilih nama guru / AKP");
  for (const selector of ["#preparedByMorning", "#preparedByAfternoon", "#oprPreparedBy", "#letterUpdatedBy", "#editOprPreparedBy", "#editLetterUpdatedBy"]) fillSelect($(selector), "Pilih nama guru / AKP");
  for (const selector of ["#approvedByMorning", "#approvedByAfternoon"]) {
    const element = $(selector); if (!element) continue;
    const current = element.value;
    element.innerHTML = `<option value="">Pilih pentadbir sekolah</option>${Object.keys(ADMIN_APPROVERS).map((name) => `<option value="${safe(name)}"${name === current ? " selected" : ""}>${safe(name)}</option>`).join("")}`;
  }
}

function staffSelectOptions(selected = "", placeholder = "Pilih nama guru / AKP") {
  const names = activeStaffNames();
  const choices = selected && !names.includes(selected) ? [selected, ...names] : names;
  return `<option value="">${safe(placeholder)}</option>${choices.map((name) => `<option value="${safe(name)}"${name === selected ? " selected" : ""}>${safe(name)}</option>`).join("")}`;
}

function editorName() { return $("#editorName").value.trim(); }

function auditKey(section, recordId, fieldName) { return `${section}:${recordId}:${fieldName}`; }

function auditDetails(section, recordId, fieldName) {
  const item = state.audit.get(auditKey(section, recordId, fieldName));
  if (!item) return { className: "", title: "" };
  const time = new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(Number(item.updatedAt)));
  return { className: " has-audit", title: `Diisi oleh: ${item.updatedBy} • ${time}` };
}

function classIsCompleted(classId) {
  const pending = state.pendingAttendance.get(classId);
  if (pending && ["absentMale", "absentFemale", "note"].some((field) => Object.prototype.hasOwnProperty.call(pending, field))) return true;
  return ["absentMale", "absentFemale", "note"].some((field) => state.audit.has(auditKey("attendance", classId, field)));
}

function classStatusMarkup(classId) {
  const complete = classIsCompleted(classId);
  return `<span class="class-status ${complete ? "complete" : "incomplete"}" title="${complete ? "Pengisian kelas telah diterima" : "Kelas belum membuat pengisian"}">${complete ? "Selesai" : "Belum selesai"}</span>`;
}

function renderClassCompletionLists() {
  const target = $("#classCompletionLists");
  if (!target) return;
  const classes = visibleClasses();
  const renderList = (complete) => {
    const items = classes.filter((row) => classIsCompleted(row.id) === complete);
    const label = complete ? "Kelas selesai" : "Kelas belum selesai";
    const chips = items.length
      ? `<div class="class-chip-list">${items.map((row) => `<span class="class-chip">${safe(row.name)}</span>`).join("")}</div>`
      : `<p class="class-list-empty">Tiada kelas dalam kategori ini.</p>`;
    return `<section class="completion-list ${complete ? "complete" : "incomplete"}"><h4>${label}<strong>${items.length}</strong></h4>${chips}</section>`;
  };
  target.innerHTML = renderList(true) + renderList(false);
}

function updateClassCompletionStatus(classId) {
  const row = document.querySelector(`tr[data-class-id="${CSS.escape(String(classId))}"]`);
  if (!row) return;
  const complete = classIsCompleted(classId);
  row.classList.toggle("class-complete", complete);
  row.classList.toggle("class-incomplete", !complete);
  const cell = row.querySelector("[data-class-status]");
  if (cell) cell.innerHTML = classStatusMarkup(classId);
  renderClassCompletionLists();
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
    updateClassCompletionStatus(patch.id);
  }
}

function updateEditingAccess() {
  const allowed = Boolean(editorName());
  document.querySelectorAll("#attendanceBody input,#staffMorningBody input,#staffAfternoonBody input,.report-notes input:not([readonly]),.report-notes textarea").forEach((element) => { element.readOnly = false; });
  document.querySelectorAll("#dutyMorningBody select,#dutyAfternoonBody select,#staffMorningBody select,#staffAfternoonBody select,.report-notes select").forEach((element) => { element.disabled = false; });
  $("#editorName").classList.toggle("invalid", !allowed);
  $("#monitoringSave").disabled = !allowed;
  $("#rmtPhotoSave").disabled = !allowed;
  if (!allowed && !state.loading) setStatus("Isi nama pengisi untuk mula");
}

function count(value, maximum = 999) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, parsed)) : 0;
}

function percent(part, whole) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(2)}%` : "0.00%";
}

function organizationInitials(name) {
  const ignored = new Set(["BIN", "BINTI", "BT", "BTE", "PG", "MOHD", "MUHAMMAD", "@"]);
  const parts = String(name || "").split(/\s+/).filter((part) => part && !ignored.has(part.toUpperCase()));
  return (parts.slice(0, 2).map((part) => part[0]).join("") || "HEM").toUpperCase();
}

function organizationPortrait(item, admin = false) {
  const src = item._previewUrl || item.photoUrl;
  return src
    ? `<img src="${safe(src)}" alt="Gambar ${safe(item.staffName || "pegawai HEM")}" loading="lazy">`
    : `<span class="hem-avatar-placeholder" aria-label="Gambar belum dimuat naik">${safe(organizationInitials(item.staffName))}</span>`;
}

function organizationPersonCard(item, className = "") {
  return `<article class="hem-person-card ${className}">
    <div class="hem-person-photo">${organizationPortrait(item)}</div>
    <div class="hem-person-copy"><small>${safe(item.positionTitle)}</small><strong>${safe(item.staffName)}</strong><span>${safe(item.fieldName)}</span><em>${safe(item.roleLabel)}</em></div>
  </article>`;
}

function renderOrganization() {
  const items = state.organization.items.filter((item) => item.active !== false).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
  const leadership = items.filter((item) => Number(item.hierarchyLevel) <= 3);
  const unitPeople = items.filter((item) => Number(item.hierarchyLevel) >= 4);
  const levels = [...new Set(leadership.map((item) => Number(item.hierarchyLevel)))].sort((a, b) => a - b);
  $("#hemLeadershipChart").innerHTML = levels.map((level, index) => {
    const cards = leadership.filter((item) => Number(item.hierarchyLevel) === level).map((item) => organizationPersonCard(item, level === 2 ? "primary" : "")).join("");
    return `<div class="hem-hierarchy-level">${cards}</div>${index < levels.length - 1 ? '<div class="hem-hierarchy-arrow" aria-hidden="true">↓</div>' : ""}`;
  }).join("");
  $("#hemUnitChart").innerHTML = unitPeople.length
    ? `<div class="hem-unit-heading"><span>UNIT DAN BIDANG HEM</span><small>${unitPeople.length} pegawai aktif</small></div><div class="hem-unit-grid">${unitPeople.map((item) => organizationPersonCard(item, "unit")).join("")}</div>`
    : "";
  $("#hemOrganizationStatus").textContent = items.length ? "Carta ini dikemas kini melalui Tetapan Sistem." : "Belum ada organisasi HEM aktif untuk dipaparkan.";
}

async function loadOrganization(silent = false) {
  if (state.organization.loading) return;
  state.organization.loading = true;
  if (!silent) $("#hemOrganizationStatus").textContent = "Memuatkan carta organisasi HEM…";
  try {
    const response = await fetch(ORGANIZATION_API_URL, { cache: "no-store" });
    const data = await responseJson(response, "Carta organisasi HEM tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Carta organisasi HEM tidak dapat dibuka.");
    state.organization.items = Array.isArray(data.organization) ? data.organization : [];
    renderOrganization();
  } catch (error) {
    if (!silent) $("#hemOrganizationStatus").textContent = error.message || "Carta organisasi HEM tidak dapat dibuka.";
  } finally { state.organization.loading = false; }
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

const SESSION_LABELS = {
  all: "KESELURUHAN SEKOLAH",
  morning: "SIDANG PAGI",
  afternoon: "SIDANG PETANG",
};

function classSession(row) {
  if (/^tahun-[456]-/.test(row.id)) return "morning";
  if (/^tahun-[123]-/.test(row.id)) return "afternoon";
  return "all";
}

function dateObject(value) { return new Date(`${value}T00:00:00Z`); }
function dateValue(date) { return date.toISOString().slice(0, 10); }
function addDays(date, days) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; }

function analyticsRange(period, anchorValue) {
  const anchor = dateObject(anchorValue);
  if (period === "month") {
    const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    return { from: dateValue(from), to: dateValue(to) };
  }
  const mondayOffset = (anchor.getUTCDay() + 6) % 7;
  const from = addDays(anchor, -mondayOffset);
  return { from: dateValue(from), to: dateValue(addDays(from, 6)) };
}

function datesInRange(from, to) {
  const values = [];
  for (let cursor = dateObject(from); cursor <= dateObject(to); cursor = addDays(cursor, 1)) values.push(dateValue(cursor));
  return values;
}

function analyticsRecordSession(row) {
  if (/^tahun-[456]-/.test(row.id)) return "morning";
  if (/^tahun-[123]-/.test(row.id)) return "afternoon";
  return "all";
}

function aggregateAnalytics(records, from, to) {
  const days = datesInRange(from, to).map((date) => ({ date, all: null, morning: null, afternoon: null, recordCount: 0 }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  const totals = Object.fromEntries(["all", "morning", "afternoon"].map((session) => [session, { enrol: 0, present: 0, days: new Set(), records: 0 }]));
  const dailyTotals = new Map();
  for (const row of records) {
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    const absent = Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    const session = analyticsRecordSession(row);
    const sessions = session === "all" ? ["all"] : ["all", session];
    const day = byDate.get(row.date);
    if (!day || enrol <= 0) continue;
    day.recordCount += 1;
    for (const key of sessions) {
      const dailyKey = `${row.date}:${key}`;
      const daily = dailyTotals.get(dailyKey) || { enrol: 0, present: 0 };
      daily.enrol += enrol; daily.present += enrol - absent; dailyTotals.set(dailyKey, daily);
      totals[key].enrol += enrol; totals[key].present += enrol - absent; totals[key].records += 1; totals[key].days.add(row.date);
    }
  }
  for (const day of days) for (const session of ["all", "morning", "afternoon"]) {
    const value = dailyTotals.get(`${day.date}:${session}`);
    if (value?.enrol) day[session] = (value.present / value.enrol) * 100;
  }
  return { days, totals };
}

function analysisPercent(value) { return Number.isFinite(value) ? `${value.toFixed(2)}%` : "—"; }

function renderAnalytics(records, range) {
  const { days, totals } = aggregateAnalytics(records, range.from, range.to);
  const labels = { all: "Keseluruhan", morning: "Sidang pagi", afternoon: "Sidang petang" };
  const periodLabel = $("#analysisPeriod").value === "month" ? "Purata bulanan" : "Purata mingguan";
  $("#analysisSummary").innerHTML = ["all", "morning", "afternoon"].map((session) => {
    const item = totals[session];
    const average = item.enrol ? (item.present / item.enrol) * 100 : NaN;
    return `<article class="${session}"><span>${periodLabel} — ${labels[session]}</span><strong>${analysisPercent(average)}</strong><small>${item.days.size} hari • ${item.records} rekod kelas</small></article>`;
  }).join("");
  const ranking = new Map();
  for (const row of records) {
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    if (!enrol) continue;
    const absent = Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    const key = String(row.id || row.classId || row.name || row.className || "");
    if (!key) continue;
    const className = row.name || row.className || key;
    const rosterClass = state.classes.find((item) => String(item.id) === key || String(item.name) === String(className));
    const current = ranking.get(key) || { name: className, teacher: row.teacherName || row.teacher || rosterClass?.teacherName || "Nama guru belum tersedia", enrol: 0, present: 0, records: 0 };
    current.enrol += enrol; current.present += enrol - absent; current.records += 1;
    if (row.teacherName || row.teacher) current.teacher = row.teacherName || row.teacher;
    ranking.set(key, current);
  }
  const winners = [...ranking.values()].map((item) => ({ ...item, value: item.enrol ? (item.present / item.enrol) * 100 : 0 })).sort((a, b) => b.value - a.value || b.records - a.records || a.name.localeCompare(b.name, "ms")).slice(0, 3);
  const medals = [{ icon: "🥇", label: "Emas", className: "gold" }, { icon: "🥈", label: "Perak", className: "silver" }, { icon: "🥉", label: "Gangsa", className: "bronze" }];
  $("#attendancePodium").innerHTML = winners.length ? winners.map((item, index) => `<article class="podium-card ${medals[index].className}"><div class="podium-medal" aria-hidden="true">${medals[index].icon}</div><strong>${safe(item.name)}</strong><span>${item.value.toFixed(2)}%</span><small>${safe(item.teacher)}</small><small>${item.records} rekod • ${medals[index].label}</small></article>`).join("") : '<p class="monitoring-empty">Belum ada data kelas yang mencukupi untuk kedudukan emas, perak dan gangsa.</p>';
  const rangeFormatter = new Intl.DateTimeFormat("ms-MY", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  $("#analysisRangeLabel").textContent = `${rangeFormatter.format(dateObject(range.from))} – ${rangeFormatter.format(dateObject(range.to))}`;
  const width = 1000, height = 350, left = 58, right = 24, top = 24, bottom = 52;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const groupWidth = plotWidth / Math.max(days.length, 1);
  const x = (index) => left + (index + 0.5) * groupWidth;
  const y = (value) => top + ((100 - Math.max(0, Math.min(100, value))) / 100) * plotHeight;
  const colors = { all: "#0755b5", morning: "#08a06c", afternoon: "#f28b23" };
  const grids = [0, 25, 50, 75, 100].map((value) => `<line class="chart-grid" x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}"/><text class="chart-axis-text" x="${left-10}" y="${y(value)+4}" text-anchor="end">${value}%</text>`).join("");
  const labelEvery = days.length > 10 ? 5 : 1;
  const xLabels = days.map((day, index) => (index % labelEvery === 0 || index === days.length - 1) ? `<text class="chart-axis-text" x="${x(index)}" y="${height-20}" text-anchor="middle">${new Intl.DateTimeFormat("ms-MY", { day: "2-digit", month: "short", timeZone: "UTC" }).format(dateObject(day.date))}</text>` : "").join("");
  const sessions = ["all", "morning", "afternoon"];
  const barWidth = Math.max(3, Math.min(20, groupWidth * 0.24));
  const bars = days.map((day, index) => sessions.map((session, sessionIndex) => {
    const value = day[session];
    if (!Number.isFinite(value)) return "";
    const barX = x(index) + (sessionIndex - 1) * (barWidth + 2) - barWidth / 2;
    const barY = y(value);
    const barHeight = top + plotHeight - barY;
    const barCenter = barX + barWidth / 2;
    const valueText = `${value.toFixed(1)}%`;
    const valueLabel = barHeight >= 42
      ? `<text class="chart-bar-value" x="${barCenter}" y="${barY + barHeight / 2}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${barCenter} ${barY + barHeight / 2})">${valueText}</text>`
      : `<text class="chart-bar-value outside" x="${barCenter}" y="${Math.max(top + 10, barY - 5)}" text-anchor="middle">${valueText}</text>`;
    return `<rect class="chart-bar" fill="${colors[session]}" x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="3"><title>${labels[session]} • ${day.date}: ${value.toFixed(2)}%</title></rect>${valueLabel}`;
  }).join("")).join("");
  $("#attendanceChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Graf bar peratus kehadiran ${safe($("#analysisRangeLabel").textContent)}">${grids}${xLabels}${bars}</svg>`;
  $("#analysisTableBody").innerHTML = days.map((day) => `<tr><td>${rangeFormatter.format(dateObject(day.date))}</td><td>${analysisPercent(day.all)}</td><td>${analysisPercent(day.morning)}</td><td>${analysisPercent(day.afternoon)}</td><td>${day.recordCount}</td></tr>`).join("");
  const totalRecords = records.length;
  $("#analysisStatus").className = "analysis-status";
  $("#analysisStatus").textContent = totalRecords ? `${totalRecords} rekod kelas ditemui. Analisis ini tidak mengubah data asal.` : "Belum ada rekod kehadiran tersimpan dalam tempoh ini.";
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat("ms-MY", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month, 1))));

async function setupKpiFilters() {
  if (state.analytics.filtersReady) return;
  if (state.analytics.filterPromise) return state.analytics.filterPromise;
  state.analytics.filterPromise = (async () => {
    const currentYear = Number((state.date || localDateValue()).slice(0, 4));
    const currentMonth = (state.date || localDateValue()).slice(5, 7);
    $("#kpiMonth").innerHTML = MONTH_NAMES.map((label, month) => {
      const value = String(month + 1).padStart(2, "0");
      return `<option value="${value}"${value === currentMonth ? " selected" : ""}>${safe(label)}</option>`;
    }).join("");
    let years = [];
    try {
      const response = await fetch(`${API_URL}?mode=analytics-years`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Senarai tahun tidak dapat dibuka.");
      years = (Array.isArray(data.years) ? data.years : []).map(Number).filter((year) => year >= 2000 && year <= 2100);
    } catch (error) { console.error(error); }
    if (!years.length) years = [currentYear];
    const selectedYear = years.includes(currentYear) ? currentYear : years[0];
    $("#kpiYear").innerHTML = years.map((year) => `<option value="${year}"${year === selectedYear ? " selected" : ""}>${year}</option>`).join("");
    state.analytics.filtersReady = true;
  })();
  try { await state.analytics.filterPromise; }
  finally { state.analytics.filterPromise = null; }
}

function monthlyClassRanking(records) {
  const totals = new Map();
  for (const row of records) {
    const key = String(row.id || row.classId || "");
    if (!/^tahun-[1-6]-/.test(key)) continue;
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    if (!enrol) continue;
    const absent = Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    const rosterClass = state.classes.find((item) => String(item.id) === key);
    const item = totals.get(key) || { id: key, name: row.name || row.className || rosterClass?.name || key, enrol: 0, present: 0, year: Number(key.match(/^tahun-(\d)/)?.[1] || 0) };
    item.enrol += enrol; item.present += enrol - absent; totals.set(key, item);
  }
  return [...totals.values()].map((item) => ({ ...item, value: item.enrol ? item.present / item.enrol * 100 : null }));
}

function renderMonthlyKpi(records, monthValue) {
  const classes = state.classes.filter((item) => /^tahun-[1-6]-/.test(String(item.id)));
  const totals = new Map(); let schoolEnrol = 0; let schoolPresent = 0;
  for (const row of records) {
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    if (!enrol) continue;
    const present = enrol - Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    schoolEnrol += enrol; schoolPresent += present;
    if (!/^tahun-[1-6]-/.test(String(row.id))) continue;
    const item = totals.get(String(row.id)) || { enrol: 0, present: 0 };
    item.enrol += enrol; item.present += present; totals.set(String(row.id), item);
  }
  const results = classes.map((item) => { const total = totals.get(String(item.id)); return { ...item, value: total?.enrol ? total.present / total.enrol * 100 : null, year: Number(String(item.id).match(/^tahun-(\d)/)?.[1] || 0) }; });
  const achieved = results.filter((item) => item.value !== null && item.value >= KPI_TARGET).sort((a, b) => b.value - a.value);
  const below = results.filter((item) => item.value !== null && item.value < KPI_TARGET).sort((a, b) => a.value - b.value);
  const noData = results.filter((item) => item.value === null);
  const label = new Intl.DateTimeFormat("ms-MY", { month: "long", year: "numeric" }).format(new Date(`${monthValue}-01T00:00:00Z`)).toUpperCase();
  const schoolValue = schoolEnrol ? schoolPresent / schoolEnrol * 100 : null;
  $("#kpiSummary").innerHTML = `<h4>${safe(label)}</h4><div><span>Purata Kehadiran Sekolah<strong>${schoolValue === null ? "Tiada Data" : `${schoolValue.toFixed(2)}%`}</strong></span><span>KPI Sekolah<strong>${KPI_TARGET}%</strong></span><span>Kelas Mencapai KPI<strong>${achieved.length} / ${results.length}</strong></span><span>Kelas Belum Mencapai KPI<strong>${below.length} / ${results.length}</strong></span></div><p class="${schoolValue !== null && schoolValue >= KPI_TARGET ? "kpi-pass" : "kpi-alert"}">${schoolValue === null ? "Tiada data kehadiran bagi bulan ini" : schoolValue >= KPI_TARGET ? "✅ KPI Kehadiran Sekolah Tercapai" : "⚠️ KPI Kehadiran Sekolah Belum Tercapai"}</p>`;
  const rows = (items) => items.length ? items.map((item) => `<div><strong>${safe(item.name)}</strong><span>Tahun ${item.year}</span><b>${item.value.toFixed(2)}%</b></div>`).join("") : '<p class="monitoring-empty">Tiada kelas dalam kategori ini.</p>';
  $("#kpiAchieved").innerHTML = rows(achieved); $("#kpiBelow").innerHTML = rows(below);
  $("#kpiClusters").innerHTML = Array.from({ length: 6 }, (_, index) => { const year = index + 1; const items = results.filter((item) => item.year === year); return `<section><h4>Tahun ${year}</h4>${items.map((item) => `<div><span>${safe(item.name)}</span><strong>${item.value === null ? "Tiada Data" : `${item.value.toFixed(2)}% ${item.value >= KPI_TARGET ? "✅" : "⚠️"}`}</strong></div>`).join("")}</section>`; }).join("") + (noData.length ? `<p class="analysis-note">${noData.length} kelas belum mempunyai data bagi bulan ini dan tidak dikategorikan.</p>` : "");
}

async function loadKpiAnalytics() {
  await setupKpiFilters();
  const year = $("#kpiYear").value || state.date.slice(0, 4);
  const monthNumber = $("#kpiMonth").value || state.date.slice(5, 7);
  const month = `${year}-${monthNumber}`;
  const from = `${month}-01`; const anchor = dateObject(from); const to = dateValue(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)));
  try {
    const response = await fetch(`${API_URL}?mode=analytics&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "KPI tidak dapat dibuka.");
    renderMonthlyKpi(Array.isArray(data.records) ? data.records : [], month);
  } catch (error) { $("#kpiSummary").innerHTML = `<p class="analysis-status error">${safe(error.message || "KPI tidak dapat dibuka.")}</p>`; }
}

function annualMonthWinner(records) {
  const ranked = monthlyClassRanking(records).filter((item) => item.value !== null);
  if (!ranked.length) return [];
  const highest = Math.max(...ranked.map((item) => Number(item.value.toFixed(2))));
  return ranked.filter((item) => Number(item.value.toFixed(2)) === highest).sort((a, b) => a.name.localeCompare(b.name, "ms"));
}

function renderAnnualWinners(year, months) {
  $("#annualWinnersYear").textContent = String(year);
  const monthsWithData = months.filter((item) => item.winners.length).length;
  $("#annualWinnersStatus").className = "analysis-status";
  $("#annualWinnersStatus").textContent = monthsWithData ? `${monthsWithData} daripada 12 bulan mempunyai data kehadiran bagi ${year}.` : `Belum ada data kehadiran kelas bagi ${year}.`;
  $("#annualWinnersGrid").innerHTML = months.map((item) => {
    const winners = item.winners.length ? item.winners.map((winner) => `<div class="annual-winner"><strong>🥇 ${safe(winner.name)}</strong><span>Tahun ${winner.year}</span><b>Purata Kehadiran: ${winner.value.toFixed(2)}%</b></div>`).join("") : '<p class="annual-no-data">Belum Ada Data</p>';
    const shared = item.winners.length > 1 ? '<span class="annual-shared-badge">Emas Bersama</span>' : "";
    return `<button class="annual-month-card${item.winners.length ? " has-data" : ""}" type="button" data-annual-month="${item.month}" aria-label="Buka analisis ${safe(item.label)} ${year}"><span class="annual-month-name">${safe(item.label)}</span>${shared}${winners}<small>Klik untuk lihat analisis bulanan</small></button>`;
  }).join("");
}

async function loadAnnualWinners(force = false) {
  await setupKpiFilters();
  const year = $("#kpiYear").value || state.date.slice(0, 4);
  if (!force && state.analytics.annualCache.has(year)) { renderAnnualWinners(year, state.analytics.annualCache.get(year)); return; }
  if (state.analytics.annualLoadingYear === year) return;
  state.analytics.annualLoadingYear = year;
  $("#annualWinnersYear").textContent = year;
  $("#annualWinnersStatus").className = "analysis-status";
  $("#annualWinnersStatus").textContent = `Mengira pemenang Januari hingga Disember ${year}…`;
  try {
    const responses = await Promise.all(Array.from({ length: 12 }, async (_, monthIndex) => {
      const month = String(monthIndex + 1).padStart(2, "0");
      const from = `${year}-${month}-01`;
      const to = dateValue(new Date(Date.UTC(Number(year), monthIndex + 1, 0)));
      const response = await fetch(`${API_URL}?mode=analytics&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `${MONTH_NAMES[monthIndex]} tidak dapat dianalisis.`);
      return { month, label: MONTH_NAMES[monthIndex], winners: annualMonthWinner(Array.isArray(data.records) ? data.records : []) };
    }));
    state.analytics.annualCache.set(year, responses);
    renderAnnualWinners(year, responses);
  } catch (error) {
    console.error(error);
    $("#annualWinnersStatus").className = "analysis-status error";
    $("#annualWinnersStatus").textContent = error.message || "Pencapaian tahunan tidak dapat dibuka.";
  } finally { if (state.analytics.annualLoadingYear === year) state.analytics.annualLoadingYear = ""; }
}

async function loadKpiDashboard() {
  if (!state.classes.length) return;
  await setupKpiFilters();
  await Promise.all([loadKpiAnalytics(), loadAnnualWinners()]);
}

async function fetchSchoolDate(date) {
  const response = await fetch(`${API_URL}?date=${encodeURIComponent(date)}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Rekod tidak dapat dibuka.");
  return data;
}

function reportAuditMap(data) {
  return new Map((Array.isArray(data.audit) ? data.audit : []).map((item) => [auditKey(item.section, item.recordId, item.fieldName), item]));
}

function reportClassCompleted(data, classId) {
  const audits = reportAuditMap(data);
  return ["absentMale", "absentFemale", "note"].some((field) => audits.has(auditKey("attendance", classId, field)));
}

function filterReportClasses(data, session) {
  const classes = Array.isArray(data.classes) ? data.classes : [];
  return session === "all" ? classes : classes.filter((row) => classSession(row) === session);
}

function schoolWeekDates(anchorValue) {
  const anchor = dateObject(anchorValue);
  const monday = addDays(anchor, -((anchor.getUTCDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, index) => dateValue(addDays(monday, index)));
}

async function loadWeeklyDuty() {
  if (state.weeklyDuty.loading) return;
  state.weeklyDuty.loading = true;
  $("#weeklyDutyRefresh").disabled = true;
  $("#weeklyDutyStatus").textContent = "Memuatkan senarai guru bertugas minggu ini…";
  try {
    const dates = schoolWeekDates($("#weeklyDutyDate").value || state.date);
    const reports = await Promise.all(dates.map(fetchSchoolDate));
    const formatter = new Intl.DateTimeFormat("ms-MY", { weekday: "long", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    const getNames = (data, session) => (Array.isArray(data.dutyTeachers) ? data.dutyTeachers : []).filter((item) => item.session === session).sort((a, b) => Number(a.rowOrder) - Number(b.rowOrder)).map((item) => String(item.teacherName || "").trim()).filter(Boolean);
    $("#weeklyDutyGrid").innerHTML = reports.map((data, index) => {
      const morning = getNames(data, "morning"), afternoon = getNames(data, "afternoon");
      const list = (names) => names.length ? `<ol>${names.map((name) => `<li>${safe(name)}</li>`).join("")}</ol>` : "<p>Belum diisi.</p>";
      return `<article class="weekly-duty-day"><div class="weekly-duty-date"><strong>${safe(formatter.format(dateObject(dates[index])))}</strong><small>${dates[index]}</small></div><div class="weekly-duty-session"><h4>Sidang Pagi</h4>${list(morning)}</div><div class="weekly-duty-session afternoon"><h4>Sidang Petang</h4>${list(afternoon)}</div></article>`;
    }).join("");
    $("#weeklyDutyStatus").textContent = `Senarai ${dates[0]} hingga ${dates[4]} berjaya dimuatkan.`;
  } catch (error) {
    $("#weeklyDutyStatus").textContent = error.message || "Senarai mingguan tidak dapat dibuka.";
    $("#weeklyDutyGrid").innerHTML = "";
  } finally { state.weeklyDuty.loading = false; $("#weeklyDutyRefresh").disabled = false; }
}

async function loadCompletionView() {
  if (state.completion.loading) return;
  state.completion.loading = true; $("#completionRefresh").disabled = true; $("#completionStatus").textContent = "Menyemak status kelas…";
  try {
    const date = $("#completionDate").value || state.date;
    const data = await fetchSchoolDate(date);
    const classes = filterReportClasses(data, $("#completionSession").value);
    const renderList = (complete) => {
      const items = classes.filter((row) => reportClassCompleted(data, row.id) === complete);
      return `<section class="completion-list ${complete ? "complete" : "incomplete"}"><h4>${complete ? "Kelas selesai" : "Kelas belum selesai"}<strong>${items.length}</strong></h4>${items.length ? `<div class="class-chip-list">${items.map((row) => `<span class="class-chip">${safe(row.name)}</span>`).join("")}</div>` : '<p class="class-list-empty">Tiada kelas dalam kategori ini.</p>'}</section>`;
    };
    $("#completionListsView").innerHTML = renderList(true) + renderList(false);
    $("#completionStatus").textContent = `${classes.length} kelas disemak bagi ${date}.`;
  } catch (error) { $("#completionStatus").textContent = error.message || "Status kelas tidak dapat dibuka."; $("#completionListsView").innerHTML = ""; }
  finally { state.completion.loading = false; $("#completionRefresh").disabled = false; }
}

async function loadCalendarRecord() {
  if (state.calendar.loading) return;
  state.calendar.loading = true; $("#calendarRefresh").disabled = true; $("#calendarStatus").textContent = "Membuka rekod tarikh pilihan…";
  try {
    const date = $("#calendarDate").value || state.date;
    const data = await fetchSchoolDate(date), audits = Array.isArray(data.audit) ? data.audit : [];
    const classes = Array.isArray(data.classes) ? data.classes : [];
    $("#calendarTableBody").innerHTML = classes.map((row) => {
      const classAudits = audits.filter((item) => item.section === "attendance" && String(item.recordId) === String(row.id)).sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
      const latest = classAudits[0], completed = classAudits.length > 0, figures = classFigures(row);
      const time = latest ? new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(Number(latest.updatedAt))) : "—";
      return `<tr><td><strong>${safe(row.name)}</strong></td><td>${safe(row.teacherName || "—")}</td><td>${percent(figures.presentTotal, figures.enrolTotal)}</td><td>${completed ? '<span class="class-status complete">Selesai</span>' : '<span class="class-status incomplete">Belum selesai</span>'}</td><td>${safe(latest?.updatedBy || "—")}</td><td>${safe(time)}</td></tr>`;
    }).join("");
    $("#calendarStatus").textContent = `${classes.length} kelas dipaparkan bagi ${date}. Halakan tetikus pada data kehadiran harian untuk butiran pengisi setiap medan.`;
  } catch (error) { $("#calendarStatus").textContent = error.message || "Rekod kalendar tidak dapat dibuka."; $("#calendarTableBody").innerHTML = ""; }
  finally { state.calendar.loading = false; $("#calendarRefresh").disabled = false; }
}

function isoWeekNumber(value) {
  const date = dateObject(value); const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function setupRmtTemplate() {
  const inputs = (target, count) => { $(target).innerHTML = Array.from({ length: count }, (_, index) => `<label><span>${index + 1}.</span><input class="rmt-name-input" type="text" list="staffNames" placeholder="Pilih nama guru"></label>`).join(""); };
  inputs("#rmtMorningNames", 4); inputs("#rmtAfternoonNames", 4);
  const today = dateObject(state.date), day = today.getUTCDay();
  const rmtAnchor = day === 0 ? dateValue(addDays(today, 1)) : day === 6 ? dateValue(addDays(today, 2)) : state.date;
  const dates = schoolWeekDates(rmtAnchor);
  $("#rmtWeek").value = isoWeekNumber(rmtAnchor); $("#rmtFrom").value = dates[0]; $("#rmtTo").value = dates[4];
  updateRmtTotal();
}

function updateRmtTotal() {
  $("#rmtComputedTotal").textContent = count($("#rmtMorningCount").value) + count($("#rmtAfternoonCount").value);
}

function renderRmtImagePreview(files) {
  for (const url of state.rmtPreviewUrls) URL.revokeObjectURL(url);
  state.rmtPreviewUrls = [];
  const selected = Array.from(files || []);
  const status = $("#rmtPhotoStatus");
  const preview = $("#rmtImagePreview");
  if (selected.length > 4) {
    $("#rmtPhotos").value = "";
    preview.innerHTML = "";
    status.textContent = "Maksimum 4 gambar sahaja.";
    return;
  }
  if (!selected.length) {
    preview.innerHTML = "";
    status.textContent = "";
    return;
  }
  const invalid = selected.some((file) => !(file.type || "").startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));
  if (invalid) {
    $("#rmtPhotos").value = "";
    preview.innerHTML = "";
    status.textContent = "Sila pilih fail gambar sahaja.";
    return;
  }
  state.rmtPreviewUrls = selected.map((file) => URL.createObjectURL(file));
  preview.innerHTML = state.rmtPreviewUrls.map((url, index) => `<figure><img src="${safe(url)}" alt="Gambar laporan RMT ${index + 1}"><figcaption>Gambar RMT ${index + 1}</figcaption></figure>`).join("");
  status.textContent = `${selected.length} gambar dipilih dan sedia untuk semakan.`;
}

function clearRmtPreview() {
  for (const url of state.rmtPreviewUrls) URL.revokeObjectURL(url);
  state.rmtPreviewUrls = [];
  $("#rmtPhotos").value = "";
  $("#rmtImagePreview").innerHTML = "";
}

function isRmtReport(report) {
  return String(report?.location || "").startsWith("RMT •");
}

function renderRmtReports() {
  const sessionLabel = (value) => value === "afternoon" ? "Sidang Petang" : "Sidang Pagi";
  $("#rmtSharedGallery").innerHTML = state.rmtReports.map((report) => {
    const created = new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(Number(report.createdAt)));
    const photos = (Array.isArray(report.photos) ? report.photos : []).map((photo, index) => `<a href="${safe(photo.url)}" target="_blank" rel="noopener"><img src="${safe(photo.url)}" loading="lazy" alt="Gambar RMT ${safe(report.location)} ${index + 1}"></a>`).join("");
    let details = null;
    try { details = String(report.issue || "").startsWith("[rmt-v2]") ? JSON.parse(String(report.issue).slice(8)) : null; } catch { details = null; }
    const content = details ? `<dl class="rmt-report-details"><div><dt>Penerima</dt><dd>${safe(details.recipients)} orang</dd></div><div><dt>Dibekalkan</dt><dd>${safe(details.supplied)} hidangan</dd></div><div><dt>Menu</dt><dd>${safe(details.menu)}</dd></div><div><dt>Penilaian</dt><dd>${safe(details.rating)}</dd></div>${details.notes ? `<div><dt>Catatan</dt><dd>${safe(details.notes)}</dd></div>` : ""}</dl>` : `<p>${safe(report.action || "")}</p>`;
    return `<article class="rmt-shared-report"><div class="monitoring-photo-grid">${photos}</div><div><span class="category-badge">${sessionLabel(report.session)}</span><h4>${safe(report.location)}</h4><p>Diisi oleh <strong>${safe(report.updatedBy || "—")}</strong></p><small>${safe(created)}</small>${content}</div></article>`;
  }).join("");
  $("#rmtSharedStatus").textContent = state.rmtReports.length ? `${state.rmtReports.length} laporan gambar RMT ditemui.` : "Belum ada gambar RMT tersimpan bagi minggu ini.";
}

async function loadRmtReports() {
  if (state.rmtLoading) return;
  state.rmtLoading = true;
  $("#rmtSharedStatus").textContent = "Memuatkan gambar RMT…";
  try {
    const date = state.date;
    const response = await fetch(`${SAFETY_API_URL}?date=${encodeURIComponent(date)}`, { cache: "no-store" });
    const data = await responseJson(response, "Gambar RMT tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Gambar RMT tidak dapat dibuka.");
    state.rmtReports = (Array.isArray(data.reports) ? data.reports : []).filter(isRmtReport);
    renderRmtReports();
  } catch (error) {
    console.error(error);
    state.rmtReports = [];
    $("#rmtSharedGallery").innerHTML = "";
    $("#rmtSharedStatus").textContent = error.message || "Gambar RMT tidak dapat dibuka.";
  } finally { state.rmtLoading = false; }
}

async function saveRmtPhotos() {
  if (!editorName()) {
    $("#rmtPhotoStatus").textContent = "Pilih nama pengisi di bahagian atas dahulu.";
    $("#editorName").focus();
    return;
  }
  let files;
  try { files = validateMonitoringFiles($("#rmtPhotos").files); }
  catch (error) { $("#rmtPhotoStatus").textContent = error.message; return; }
  $("#rmtPhotoSave").disabled = true;
  $("#rmtPhotoStatus").textContent = "Mengecilkan dan memuat naik gambar RMT…";
  try {
    const photos = await Promise.all(files.map(prepareMonitoringPhoto));
    const week = count($("#rmtWeek").value, 53);
    const morning = count($("#rmtMorningCount").value), afternoon = count($("#rmtAfternoonCount").value);
    const payload = {
      date: $("#rmtFrom").value || state.date,
      updatedBy: editorName(),
      category: "both",
      session: $("#rmtPhotoSession").value,
      location: `RMT • Minggu ${week}`,
      routeStatus: "not_applicable",
      parkingStatus: "not_applicable",
      issue: `Bukti laporan Guru Bertugas RMT ${$("#rmtPhotoSession").value === "afternoon" ? "Sidang Petang" : "Sidang Pagi"}`,
      action: `Jumlah murid RMT — Pagi: ${morning} • Petang: ${afternoon} • Tempoh: ${$("#rmtFrom").value} hingga ${$("#rmtTo").value}`,
      photos,
    };
    const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await responseJson(response, "Gambar RMT gagal disimpan.");
    if (!response.ok) throw new Error(result.error || "Gambar RMT gagal disimpan.");
    clearRmtPreview();
    $("#rmtPhotoStatus").textContent = "Gambar RMT berjaya disimpan dan boleh dilihat oleh guru lain.";
    await loadRmtReports();
  } catch (error) {
    console.error(error);
    $("#rmtPhotoStatus").textContent = error.message || "Gambar RMT gagal disimpan.";
  } finally { updateEditingAccess(); }
}

async function saveRmtReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector("[data-rmt-status]");
  if (!editorName()) { status.textContent = "Pilih nama pengisi di bahagian atas dahulu."; $("#editorName").focus(); return; }
  const session = form.dataset.rmtSession;
  const value = (field) => form.querySelector(`[data-rmt-field="${field}"]`).value.trim();
  let files;
  try { files = validateMonitoringFiles(form.querySelector('[data-rmt-field="photos"]').files); }
  catch (error) { status.textContent = error.message; return; }
  const button = form.querySelector('button[type="submit"]'); button.disabled = true; status.textContent = "Memproses dan menyimpan laporan RMT…";
  try {
    const details = { recipients: count(value("recipients")), supplied: count(value("supplied")), menu: value("menu"), rating: value("rating"), notes: value("notes") };
    const photos = await Promise.all(files.map(prepareMonitoringPhoto));
    const payload = { date: state.date, updatedBy: editorName(), category: "both", session, location: `RMT • ${session === "morning" ? "Sidang Pagi" : "Sidang Petang"} • ${state.date}`, routeStatus: "not_applicable", parkingStatus: "not_applicable", issue: `[rmt-v2]${JSON.stringify(details)}`, action: details.notes || "Laporan RMT lengkap", photos };
    const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await responseJson(response, "Laporan RMT gagal disimpan.");
    if (!response.ok) throw new Error(result.error || "Laporan RMT gagal disimpan.");
    form.reset(); form.querySelector("[data-rmt-preview]").innerHTML = ""; status.textContent = "Laporan RMT berjaya disimpan dan tersedia pada semua peranti."; await loadRmtReports();
  } catch (error) { status.textContent = error.message || "Laporan RMT gagal disimpan."; }
  finally { button.disabled = false; }
}

function setSidebar(open) {
  document.body.classList.toggle("sidebar-open", open);
  $("#mainSidebar").setAttribute("aria-hidden", String(!open));
  $("#menuToggle").setAttribute("aria-expanded", String(open));
  $("#menuToggle").textContent = open ? "✕ Tutup" : "☰ Menu";
}

async function loadAnalytics() {
  if (state.analytics.loading) return;
  state.analytics.loading = true;
  const range = analyticsRange($("#analysisPeriod").value, $("#analysisDate").value || state.date);
  $("#analysisStatus").className = "analysis-status";
  $("#analysisStatus").textContent = "Memuatkan analisis…";
  $("#analysisRefresh").disabled = true;
  try {
    const response = await fetch(`${API_URL}?mode=analytics&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analisis tidak dapat dibuka.");
    renderAnalytics(Array.isArray(data.records) ? data.records : [], range);
  } catch (error) {
    console.error(error);
    $("#analysisStatus").className = "analysis-status error";
    $("#analysisStatus").textContent = error.message || "Analisis tidak dapat dibuka. Cuba lagi.";
  } finally { state.analytics.loading = false; $("#analysisRefresh").disabled = false; }
}

function clearMonitoringPreview() {
  for (const url of state.monitoring.previewUrls) URL.revokeObjectURL(url);
  state.monitoring.previewUrls = [];
  $("#monitoringPreview").innerHTML = "";
}

function validateMonitoringFiles(files) {
  const selected = Array.from(files || []);
  if (!selected.length) throw new Error("Pilih sekurang-kurangnya satu gambar.");
  if (selected.length > 4) throw new Error("Maksimum 4 gambar bagi setiap laporan.");
  if (selected.some((file) => !(file.type || "").startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))) {
    throw new Error("Fail yang dipilih mestilah gambar.");
  }
  if (selected.some((file) => file.size > 25 * 1024 * 1024)) throw new Error("Setiap gambar asal mestilah tidak melebihi 25 MB.");
  return selected;
}

function readBlobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] || "");
    reader.onerror = () => reject(new Error("Gambar yang telah diproses tidak dapat dibaca."));
    reader.readAsDataURL(blob);
  });
}

function loadMonitoringImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Gambar ${file.name} tidak dapat dibuka. Jika gambar HEIC gagal, pilih versi JPG.`));
    };
    image.src = url;
  });
}

async function prepareMonitoringPhoto(file, index) {
  const image = await loadMonitoringImage(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(`Gambar ${file.name} tidak dapat diproses.`);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error(`Gambar ${file.name} tidak dapat dikecilkan.`)),
    "image/jpeg",
    0.82,
  ));
  return {
    name: `gambar-${index + 1}.jpg`,
    type: "image/jpeg",
    size: blob.size,
    data: await readBlobAsBase64(blob),
  };
}

async function responseJson(response, fallbackMessage) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error(response.ok ? fallbackMessage : `${fallbackMessage} Pelayan memberi respons yang tidak lengkap.`); }
}

function renderMonitoringPreview(files) {
  clearMonitoringPreview();
  try {
    const selected = validateMonitoringFiles(files);
    state.monitoring.previewUrls = selected.map((file) => URL.createObjectURL(file));
    $("#monitoringPreview").innerHTML = state.monitoring.previewUrls.map((url, index) =>
      `<figure><img src="${safe(url)}" alt="Pratonton gambar ${index + 1}"><figcaption>Gambar ${index + 1}</figcaption></figure>`
    ).join("");
    $("#monitoringFormStatus").textContent = `${selected.length} gambar dipilih.`;
  } catch (error) {
    $("#monitoringPhotos").value = "";
    $("#monitoringFormStatus").textContent = error.message;
  }
}

function monitoringStatusClass(value) {
  return value === "controlled" ? "controlled" : value === "attention" ? "attention" : "neutral";
}

function monitoringLocationOptions(selected = "") {
  return `<option value="">Pilih kawasan / kategori</option>${MONITORING_LOCATIONS.map((location) => `<option value="${safe(location)}"${location === selected ? " selected" : ""}>${safe(location)}</option>`).join("")}`;
}

function addMonitoringItem() {
  const container = $("#monitoringItems");
  container.querySelector(".monitoring-empty")?.remove();
  const index = container.querySelectorAll(".monitoring-item-card").length + 1;
  const card = document.createElement("article");
  card.className = "monitoring-item-card";
  card.innerHTML = `<div class="monitoring-item-heading"><h4>Pemantauan ${index}</h4><button class="monitoring-remove" type="button" aria-label="Buang pemantauan ${index}">Buang</button></div><div class="monitoring-item-grid"><label>Kategori / lokasi<select data-monitoring-field="location" required>${monitoringLocationOptions()}</select></label><label class="other-location" hidden>Nama lokasi lain<input data-monitoring-field="otherLocation" maxlength="180"></label><label>Status<select data-monitoring-field="status" required><option value="controlled">Baik</option><option value="not_applicable">Memuaskan</option><option value="attention">Perlu Tindakan</option></select></label></div><label>Gambar<input data-monitoring-field="photos" type="file" accept="image/*,.heic,.heif" multiple required></label><label>Laporan ringkas / catatan — Pilihan<textarea data-monitoring-field="note" rows="3" maxlength="1500"></textarea></label><label class="follow-up" hidden>Tindakan susulan / cadangan tindakan<textarea data-monitoring-field="action" rows="3" maxlength="1500"></textarea></label><div class="monitoring-preview" data-monitoring-preview></div>`;
  container.appendChild(card);
}

function renderMonitoringReports() {
  const reports = state.monitoring.reports.filter((report) => !isRmtReport(report) && report.category !== "opr");
  const renderReport = (report) => {
    const created = new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(Number(report.createdAt)));
    const photos = (Array.isArray(report.photos) ? report.photos : []).map((photo, index) =>
      `<a href="${safe(photo.url)}" target="_blank" rel="noopener"><img src="${safe(photo.url)}" loading="lazy" alt="${safe(MONITORING_CATEGORY_LABELS[report.category] || "Pemantauan")} di ${safe(report.location)}, gambar ${index + 1}"></a>`
    ).join("");
    return `<article class="monitoring-report">
      <div class="monitoring-photo-grid">${photos}</div>
      <div class="monitoring-report-body">
        <div class="monitoring-report-top"><span class="category-badge">${safe(MONITORING_CATEGORY_LABELS[report.category] || report.category)}</span><time>${safe(created)}</time></div>
        <h3>${safe(report.location)}</h3>
        <p class="monitoring-by">Diisi oleh <strong>${safe(report.updatedBy)}</strong></p>
        <div class="monitoring-statuses"><span class="${monitoringStatusClass(report.routeStatus)}">Status: <strong>${report.routeStatus === "controlled" ? "Baik" : report.routeStatus === "attention" ? "Perlu Tindakan" : "Memuaskan"}</strong></span></div>
        <dl><div><dt>Laporan ringkas / catatan</dt><dd>${safe(report.issue || "Tiada catatan tambahan")}</dd></div>${report.routeStatus === "attention" ? `<div><dt>Tindakan susulan</dt><dd>${safe(report.action)}</dd></div>` : ""}</dl>
      </div>
    </article>`;
  };
  $("#monitoringGallery").innerHTML = [
    ["morning", "Sidang Pagi"], ["afternoon", "Sidang Petang"], ["legacy", "Laporan lama — sidang belum ditetapkan"],
  ].map(([session, label]) => {
    const grouped = reports.filter((report) => (report.session || "legacy") === session);
    if (session === "legacy" && !grouped.length) return "";
    return `<section class="monitoring-session-group"><h4>${label} <span>${grouped.length} laporan</span></h4>${grouped.length ? grouped.map(renderReport).join("") : '<p class="monitoring-empty">Belum ada laporan untuk sidang ini.</p>'}</section>`;
  }).join("");
  $("#monitoringListStatus").textContent = reports.length ? `${reports.length} laporan bergambar ditemui.` : "Belum ada laporan bergambar pada tarikh ini.";
}

async function loadMonitoringReports() {
  if (state.monitoring.loading) return;
  state.monitoring.loading = true;
  $("#monitoringListStatus").className = "monitoring-list-status";
  $("#monitoringListStatus").textContent = "Memuatkan laporan…";
  try {
    const response = await fetch(`${SAFETY_API_URL}?date=${encodeURIComponent(state.date)}`, { cache: "no-store" });
    const data = await responseJson(response, "Laporan bergambar tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Laporan bergambar tidak dapat dibuka.");
    state.monitoring.reports = Array.isArray(data.reports) ? data.reports : [];
    renderMonitoringReports();
  } catch (error) {
    console.error(error);
    state.monitoring.reports = [];
    $("#monitoringGallery").innerHTML = "";
    $("#monitoringListStatus").className = "monitoring-list-status error";
    $("#monitoringListStatus").textContent = error.message || "Laporan bergambar tidak dapat dibuka. Cuba lagi.";
  } finally { state.monitoring.loading = false; }
}

async function saveMonitoringReport(event) {
  event.preventDefault();
  if (!editorName()) {
    $("#monitoringFormStatus").textContent = "Pilih nama pengisi di bahagian atas dahulu.";
    $("#editorName").focus();
    return;
  }
  const session = $("#monitoringSession").value;
  const cards = Array.from(document.querySelectorAll("#monitoringItems .monitoring-item-card"));
  if (!session) { $("#monitoringFormStatus").textContent = "Sila pilih sidang laporan."; return; }
  if (!cards.length) { $("#monitoringFormStatus").textContent = "Tambah sekurang-kurangnya satu pemantauan."; return; }
  $("#monitoringSave").disabled = true;
  $("#monitoringFormStatus").textContent = `Menyimpan ${cards.length} pemantauan…`;
  try {
    for (const card of cards) {
      const field = (name) => card.querySelector(`[data-monitoring-field="${name}"]`);
      const locationChoice = field("location").value;
      const location = locationChoice === "Lain-lain" ? field("otherLocation").value.trim() : locationChoice;
      const status = field("status").value;
      const action = field("action").value.trim();
      if (!location) throw new Error("Sila pilih atau nyatakan lokasi pemantauan.");
      if (status === "attention" && !action) throw new Error("Sila nyatakan tindakan susulan bagi status Perlu Tindakan.");
      const files = validateMonitoringFiles(field("photos").files);
      const photos = await Promise.all(files.map(prepareMonitoringPhoto));
      const payload = { date: state.date, updatedBy: editorName(), category: "both", session, location, routeStatus: status, parkingStatus: "not_applicable", issue: field("note").value.trim() || (status === "controlled" ? "Kawasan dalam keadaan baik." : status === "not_applicable" ? "Kawasan dalam keadaan memuaskan." : "Pemantauan memerlukan tindakan."), action: action || "Tiada tindakan susulan diperlukan.", photos };
      const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await responseJson(response, "Laporan gagal disimpan.");
      if (!response.ok) throw new Error(result.error || "Laporan gagal disimpan.");
    }
    $("#monitoringItems").innerHTML = '<p class="monitoring-empty">Tekan “+ Tambah Kategori Pemantauan” dan pilih kawasan yang dipantau.</p>';
    $("#monitoringFormStatus").textContent = `${cards.length} pemantauan berjaya disimpan dan boleh dilihat oleh semua guru.`;
    await loadMonitoringReports();
  } catch (error) {
    console.error(error);
    $("#monitoringFormStatus").textContent = error.message || "Laporan gagal disimpan. Cuba lagi.";
  } finally { updateEditingAccess(); }
}

function clearOprPreview() {
  for (const url of state.opr.previewUrls) URL.revokeObjectURL(url);
  state.opr.previewUrls = [];
  $("#oprPreview").innerHTML = "";
}

function renderOprPreview(files) {
  clearOprPreview();
  try {
    const selected = validateMonitoringFiles(files);
    state.opr.previewUrls = selected.map((file) => URL.createObjectURL(file));
    $("#oprPreview").innerHTML = state.opr.previewUrls.map((url, index) => `<figure><img src="${safe(url)}" alt="Pratonton gambar OPR ${index + 1}"><figcaption>Gambar program ${index + 1}</figcaption></figure>`).join("");
    $("#oprFormStatus").textContent = `${selected.length} gambar dipilih.`;
  } catch (error) {
    $("#oprPhotos").value = "";
    $("#oprFormStatus").textContent = error.message;
  }
}

function renderOprReports() {
  $("#oprGallery").innerHTML = state.opr.reports.map((report) => {
    const created = new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(Number(report.createdAt)));
    const photos = (Array.isArray(report.photos) ? report.photos : []).map((photo, index) => `<a href="${safe(photo.url)}" target="_blank" rel="noopener"><img src="${safe(photo.url)}" loading="lazy" alt="${safe(report.location)} gambar ${index + 1}"></a>`).join("");
    const audit = report.lastEditedAt ? `<p class="record-audit">Dikemas kini oleh <strong>${safe(report.lastEditedBy || "—")}</strong> • ${safe(formatAuditTime(report.lastEditedAt))}</p>` : `<p class="record-audit">Rekod asal • ${safe(created)}</p>`;
    return `<article class="monitoring-report"><div class="monitoring-photo-grid">${photos}</div><div class="monitoring-report-body"><div class="monitoring-report-top"><span class="category-badge">OPR HEM</span><time>${safe(created)}</time></div><h3>${safe(report.location)}</h3><p class="monitoring-by">Disediakan oleh <strong>${safe(report.updatedBy || "—")}</strong></p><dl><div><dt>Tarikh program</dt><dd>${safe(report.reportDate || "—")}</dd></div></dl>${audit}<button class="record-edit-button" type="button" data-edit-opr="${safe(report.id)}">✎ Edit OPR</button></div></article>`;
  }).join("");
  $("#oprListStatus").textContent = state.opr.reports.length ? `${state.opr.reports.length} OPR HEM ditemui pada tarikh ini.` : "Belum ada OPR HEM pada tarikh dipilih.";
}

async function loadOprReports() {
  if (state.opr.loading) return;
  state.opr.loading = true;
  $("#oprListStatus").textContent = "Memuatkan OPR HEM…";
  try {
    const response = await fetch(`${SAFETY_API_URL}?category=opr&limit=4`, { cache: "no-store" });
    const data = await responseJson(response, "OPR HEM tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "OPR HEM tidak dapat dibuka.");
    state.opr.reports = (Array.isArray(data.reports) ? data.reports : []).filter((report) => report.category === "opr").slice(0, 4);
    renderOprReports();
  } catch (error) {
    state.opr.reports = [];
    $("#oprGallery").innerHTML = "";
    $("#oprListStatus").textContent = error.message || "OPR HEM tidak dapat dibuka.";
  } finally { state.opr.loading = false; }
}

async function saveOprReport(event) {
  event.preventDefault();
  const preparedBy = $("#oprPreparedBy").value.trim();
  if (!preparedBy) { $("#oprFormStatus").textContent = "Sila pilih nama guru pada ruangan Disediakan oleh."; return; }
  let files;
  try { files = validateMonitoringFiles($("#oprPhotos").files); }
  catch (error) { $("#oprFormStatus").textContent = error.message; return; }
  $("#oprSave").disabled = true;
  $("#oprFormStatus").textContent = "Mengecilkan dan memuat naik gambar OPR HEM…";
  try {
    const photos = await Promise.all(files.map(prepareMonitoringPhoto));
    const program = $("#oprProgram").value.trim();
    const date = $("#oprDate").value || state.date;
    const payload = { date, updatedBy: preparedBy, category: "opr", session: "morning", location: program, routeStatus: "not_applicable", parkingStatus: "not_applicable", issue: `One Page Report HEM: ${program}`, action: `Disediakan oleh ${preparedBy}`, photos };
    const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await responseJson(response, "OPR HEM gagal disimpan.");
    if (!response.ok) throw new Error(result.error || "OPR HEM gagal disimpan.");
    $("#oprProgram").value = "";
    $("#oprPhotos").value = "";
    clearOprPreview();
    $("#oprFormStatus").textContent = result.archive?.ok === false
      ? `OPR HEM selamat dalam sistem. ${result.archive.warning || "Salinan Google Drive belum berjaya."}`
      : "OPR HEM berjaya disimpan dalam sistem dan dua simpanan Google Drive.";
    await loadOprReports();
  } catch (error) {
    $("#oprFormStatus").textContent = error.message || "OPR HEM gagal disimpan.";
  } finally { $("#oprSave").disabled = false; }
}

const TICKER_SPEED_PX_PER_SECOND = 85;

function tickerText(messages) {
  return messages.map((item) => String(item.message || "").trim()).filter(Boolean).join(" • ");
}

function tickerUnit(text) {
  return `<span class="ticker-sequence">${safe(text)}<span class="ticker-divider" aria-hidden="true">•</span></span>`;
}

function renderSeamlessTicker(track, messages, speed = TICKER_SPEED_PX_PER_SECOND) {
  const text = tickerText(messages);
  if (!text) {
    track.innerHTML = "";
    track.classList.remove("is-running");
    track.style.removeProperty("--ticker-duration");
    return false;
  }

  const unit = tickerUnit(text);
  track.classList.remove("is-running");
  track.innerHTML = `<span class="ticker-group">${unit}</span><span class="ticker-group" aria-hidden="true">${unit}</span>`;

  requestAnimationFrame(() => {
    const groups = track.querySelectorAll(".ticker-group");
    if (groups.length !== 2) return;
    const viewportWidth = track.parentElement?.clientWidth || window.innerWidth;
    const unitWidth = Math.max(1, groups[0].scrollWidth);
    const repeats = Math.max(1, Math.ceil((viewportWidth + unitWidth) / unitWidth));
    const continuousContent = unit.repeat(repeats);
    groups[0].innerHTML = continuousContent;
    groups[1].innerHTML = continuousContent;
    const distance = Math.max(1, groups[0].scrollWidth);
    track.style.setProperty("--ticker-duration", `${Math.max(6, distance / speed).toFixed(2)}s`);
    void track.offsetWidth;
    track.classList.add("is-running");
  });
  return true;
}

function renderTicker() {
  const ticker = $("#globalNewsTicker"), track = $("#newsTickerTrack");
  const hasMessages = renderSeamlessTicker(track, state.content.announcements);
  ticker.hidden = !hasMessages;
  document.body.classList.toggle("ticker-visible", hasMessages);
}

function formatLetterDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value || "—") : new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatAuditTime(value) {
  const time = Number(value);
  if (!time) return "—";
  return new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(time));
}

function letterCard(letter, admin = false) {
  const fileLabel = letter.fileName || (letter.driveUrl ? "Buka di Google Drive" : "Buka surat");
  const audit = letter.lastEditedAt ? `Dikemas kini oleh <strong>${safe(letter.lastEditedBy || "—")}</strong> • ${safe(formatAuditTime(letter.lastEditedAt))}` : `Rekod asal • ${safe(formatAuditTime(letter.uploadedAt))}`;
  return `<article class="hem-letter-card"><div class="letter-card-top"><span class="category-badge">${safe(letter.category || "Surat HEM")}</span><time>${safe(formatLetterDate(letter.letterDate))}</time></div><h4>${safe(letter.title)}</h4><dl><div><dt>No. rujukan</dt><dd>${safe(letter.referenceNo || "—")}</dd></div><div><dt>Dimuat naik oleh</dt><dd>${safe(letter.updatedBy || "—")}</dd></div>${letter.note ? `<div><dt>Catatan</dt><dd>${safe(letter.note)}</dd></div>` : ""}</dl><div class="letter-card-actions"><a class="letter-open-button" href="${safe(letter.fileUrl || letter.driveUrl || "#")}" target="_blank" rel="noopener">📄 ${safe(fileLabel)} ↗</a>${admin ? "" : `<button class="record-edit-button" type="button" data-edit-letter="${safe(letter.id)}">✎ Edit surat</button>`}</div><p class="record-audit">${audit}</p>${admin ? `<small>Dimuat naik ${safe(formatAuditTime(letter.uploadedAt))}</small>` : ""}</article>`;
}

function requireRecordEditor() {
  const name = editorName();
  if (name) return name;
  setStatus("Pilih Nama pengisi dahulu sebelum mengedit rekod.", "error");
  $("#identityBar").hidden = false;
  $("#identityBar").scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => $("#editorName").focus(), 350);
  return "";
}

function openRecordEditor(type, id) {
  const editor = requireRecordEditor();
  if (!editor) return;
  const record = type === "opr"
    ? state.opr.reports.find((item) => String(item.id) === String(id))
    : [...state.content.latestLetters, ...state.content.letters].find((item) => String(item.id) === String(id));
  if (!record) return;
  state.editingRecord = record;
  $("#recordEditType").value = type; $("#recordEditId").value = id;
  $("#oprEditFields").hidden = type !== "opr"; $("#letterEditFields").hidden = type !== "letter";
  $("#oprEditFields").querySelectorAll("input,select,textarea").forEach((field) => { field.disabled = type !== "opr"; });
  $("#letterEditFields").querySelectorAll("input,select,textarea").forEach((field) => { field.disabled = type !== "letter"; });
  $("#recordEditTitle").textContent = type === "opr" ? "Edit OPR HEM" : "Edit Surat Menyurat HEM";
  $("#recordEditorName").textContent = editor; $("#recordEditStatus").textContent = "";
  if (type === "opr") {
    $("#editOprProgram").value = record.location || ""; $("#editOprDate").value = record.reportDate || state.date;
    $("#editOprPreparedBy").value = record.updatedBy || "";
  } else {
    $("#editLetterName").value = record.title || ""; $("#editLetterDate").value = record.letterDate || state.date;
    $("#editLetterCategory").value = record.category || "Surat Masuk"; $("#editLetterReference").value = record.referenceNo || "";
    $("#editLetterUpdatedBy").value = record.updatedBy || ""; $("#editLetterDriveUrl").value = record.driveUrl || "";
    $("#editLetterNote").value = record.note || "";
  }
  $("#recordEditModal").hidden = false; document.body.classList.add("modal-open");
}

function closeRecordEditor() {
  state.editingRecord = null; $("#recordEditModal").hidden = true; document.body.classList.remove("modal-open");
}

async function saveRecordEdit(event) {
  event.preventDefault();
  const type = $("#recordEditType").value, id = $("#recordEditId").value, editor = requireRecordEditor();
  if (!editor) return;
  $("#recordEditSave").disabled = true; $("#recordEditStatus").textContent = "Menyimpan perubahan…";
  try {
    let response;
    if (type === "opr") {
      response = await fetch(SAFETY_API_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, program: $("#editOprProgram").value.trim(), date: $("#editOprDate").value, preparedBy: $("#editOprPreparedBy").value, editorName: editor }) });
    } else {
      response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateLetter", id, title: $("#editLetterName").value.trim(), letterDate: $("#editLetterDate").value, category: $("#editLetterCategory").value, referenceNo: $("#editLetterReference").value.trim(), note: $("#editLetterNote").value.trim(), updatedBy: $("#editLetterUpdatedBy").value, driveUrl: $("#editLetterDriveUrl").value.trim(), editorName: editor }) });
    }
    const data = await responseJson(response, "Rekod gagal dikemas kini.");
    if (!response.ok) throw new Error(data.error || "Rekod gagal dikemas kini.");
    if (type === "opr") await loadOprReports();
    else {
      await loadPublicContent();
      if (!$("#letterArchive").hidden) { $("#letterArchive").hidden = true; await toggleLetterArchive(); }
    }
    closeRecordEditor(); setStatus(`Rekod berjaya dikemas kini oleh ${editor}.`, "saved");
  } catch (error) { $("#recordEditStatus").textContent = error.message || "Rekod gagal dikemas kini."; }
  finally { $("#recordEditSave").disabled = false; }
}

function renderPublicLetters() {
  $("#latestLetterGrid").innerHTML = state.content.latestLetters.map((item) => letterCard(item)).join("");
  $("#letterListStatus").textContent = state.content.latestLetters.length ? `${state.content.latestLetters.length} surat HEM terbaharu.` : "Belum ada surat HEM dimuat naik.";
}

async function loadPublicContent(quiet = false) {
  if (state.content.loading) return;
  state.content.loading = true;
  try {
    const [announcementResponse, letterResponse] = await Promise.all([
      fetch(`${CONTENT_API_URL}?mode=announcements`, { cache: "no-store" }),
      fetch(`${CONTENT_API_URL}?mode=letters`, { cache: "no-store" }),
    ]);
    const [announcementData, letterData] = await Promise.all([
      responseJson(announcementResponse, "Makluman tidak dapat dibuka."),
      responseJson(letterResponse, "Surat HEM tidak dapat dibuka."),
    ]);
    if (!announcementResponse.ok) throw new Error(announcementData.error || "Makluman tidak dapat dibuka.");
    if (!letterResponse.ok) throw new Error(letterData.error || "Surat HEM tidak dapat dibuka.");
    state.content.announcements = Array.isArray(announcementData.announcements) ? announcementData.announcements : [];
    state.content.latestLetters = Array.isArray(letterData.letters) ? letterData.letters.slice(0, 2) : [];
    renderTicker(); renderPublicLetters();
  } catch (error) {
    if (!quiet) $("#letterListStatus").textContent = error.message || "Kandungan HEM tidak dapat dibuka.";
  } finally { state.content.loading = false; }
}

async function toggleLetterArchive() {
  const archive = $("#letterArchive"), opening = archive.hidden;
  archive.hidden = !opening;
  $("#letterArchiveToggle").setAttribute("aria-expanded", String(opening));
  $("#letterArchiveToggle").textContent = opening ? "Tutup Arkib Surat" : "Lihat Semua Surat HEM";
  if (!opening) return;
  $("#letterArchiveStatus").textContent = "Memuatkan arkib surat…";
  try {
    const response = await fetch(`${CONTENT_API_URL}?mode=letters&all=1`, { cache: "no-store" });
    const data = await responseJson(response, "Arkib surat tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Arkib surat tidak dapat dibuka.");
    state.content.letters = Array.isArray(data.letters) ? data.letters : [];
    $("#letterArchiveGrid").innerHTML = state.content.letters.map((item) => letterCard(item)).join("");
    $("#letterArchiveStatus").textContent = state.content.letters.length ? `${state.content.letters.length} surat tersimpan dalam arkib.` : "Arkib surat masih kosong.";
  } catch (error) { $("#letterArchiveStatus").textContent = error.message || "Arkib surat tidak dapat dibuka."; }
}

function renderAdminAnnouncements() {
  $("#adminAnnouncementList").innerHTML = state.content.adminAnnouncements.map((item, index) => `<article class="admin-announcement-row" data-announcement-index="${index}"><span class="announcement-order">${index + 1}</span><textarea data-announcement-message maxlength="500" rows="2" aria-label="Teks makluman ${index + 1}">${safe(item.message || "")}</textarea><div class="announcement-actions"><button type="button" data-announcement-move="up" aria-label="Naikkan makluman" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-announcement-move="down" aria-label="Turunkan makluman" ${index === state.content.adminAnnouncements.length - 1 ? "disabled" : ""}>↓</button><button class="${item.active === false ? "inactive" : "active"}" type="button" data-announcement-toggle>${item.active === false ? "Tidak aktif" : "Aktif"}</button><button class="danger" type="button" data-announcement-delete>Padam</button></div></article>`).join("") || '<p class="monitoring-empty">Belum ada makluman. Tekan “+ Tambah makluman”.</p>';
  renderAdminTickerPreview();
}

function syncAdminAnnouncements() {
  document.querySelectorAll("[data-announcement-index]").forEach((row) => {
    const index = Number(row.dataset.announcementIndex);
    if (state.content.adminAnnouncements[index]) state.content.adminAnnouncements[index].message = row.querySelector("[data-announcement-message]").value;
  });
}

function renderAdminTickerPreview() {
  const active = state.content.adminAnnouncements.filter((item) => item.active !== false && String(item.message || "").trim());
  const track = $("#adminTickerPreviewTrack");
  if (!renderSeamlessTicker(track, active, 78)) track.innerHTML = '<span class="ticker-empty">Pratonton makluman akan muncul di sini.</span>';
}

function renderAdminLetters() {
  $("#adminLetterList").innerHTML = state.content.letters.length ? `<h3>Arkib semasa (${state.content.letters.length})</h3><div class="hem-letter-grid">${state.content.letters.map((item) => letterCard(item, true)).join("")}</div>` : '<p class="monitoring-empty">Belum ada surat HEM disimpan.</p>';
}

async function loadAdminContent() {
  const response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "readAdmin", adminPin: state.adminPin }) });
  const data = await responseJson(response, "Kandungan pentadbir tidak dapat dibuka.");
  if (!response.ok) throw new Error(data.error || "Kandungan pentadbir tidak dapat dibuka.");
  state.content.adminAnnouncements = (Array.isArray(data.announcements) ? data.announcements : []).map((item) => ({ ...item, active: Boolean(item.active) }));
  state.content.deletedAnnouncementIds = [];
  state.content.letters = Array.isArray(data.letters) ? data.letters : [];
  renderAdminAnnouncements(); renderAdminLetters(); refreshStaffNameChoices();
}

async function saveAdminAnnouncements() {
  syncAdminAnnouncements();
  if (state.content.adminAnnouncements.some((item) => !String(item.message || "").trim())) { $("#adminAnnouncementStatus").textContent = "Isi teks semua makluman atau padam baris kosong."; return; }
  $("#adminAnnouncementSave").disabled = true; $("#adminAnnouncementStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveAnnouncements", adminPin: state.adminPin, entries: state.content.adminAnnouncements, deletedIds: state.content.deletedAnnouncementIds }) });
    const data = await responseJson(response, "Makluman gagal disimpan.");
    if (!response.ok) throw new Error(data.error || "Makluman gagal disimpan.");
    state.content.adminAnnouncements = (data.announcements || []).map((item) => ({ ...item, active: Boolean(item.active) }));
    state.content.deletedAnnouncementIds = [];
    renderAdminAnnouncements(); await loadPublicContent();
    $("#adminAnnouncementStatus").textContent = "Makluman berjaya dikemas kini untuk semua peranti.";
  } catch (error) { $("#adminAnnouncementStatus").textContent = error.message || "Makluman gagal disimpan."; }
  finally { $("#adminAnnouncementSave").disabled = false; }
}

async function encodeLetterFile(file) {
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error("Fail surat mestilah tidak melebihi 8 MB.");
  const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Gunakan fail PDF, DOC, DOCX, JPG, PNG atau WebP sahaja.");
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("Fail tidak dapat dibaca.")); reader.readAsDataURL(file); });
  return { name: file.name, type: file.type, data };
}

async function saveLetter(event) {
  event.preventDefault();
  const fileInput = $("#letterFile"), driveUrl = $("#letterDriveUrl").value.trim();
  if (!fileInput.files?.[0] && !driveUrl) { $("#letterStatus").textContent = "Pilih fail surat atau masukkan pautan Google Drive."; return; }
  $("#letterSave").disabled = true; $("#letterStatus").textContent = "Memuat naik dan menyimpan surat…";
  try {
    const file = await encodeLetterFile(fileInput.files?.[0]);
    const payload = { action: "createLetter", title: $("#letterName").value.trim(), letterDate: $("#letterDate").value, category: $("#letterCategory").value, referenceNo: $("#letterReference").value.trim(), note: $("#letterNote").value.trim(), updatedBy: $("#letterUpdatedBy").value, driveUrl, file };
    const response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await responseJson(response, "Surat gagal disimpan.");
    if (!response.ok) throw new Error(data.error || "Surat gagal disimpan.");
    $("#letterForm").reset(); $("#letterDate").value = state.date; refreshStaffNameChoices();
    await loadPublicContent();
    if (!$("#letterArchive").hidden) { $("#letterArchive").hidden = true; await toggleLetterArchive(); }
    $("#letterStatus").textContent = data.archive?.ok === false
      ? `Surat selamat dalam sistem. ${data.archive.warning || "Salinan Google Drive belum berjaya."}`
      : file
        ? "Surat berjaya disimpan dalam sistem dan dua simpanan Google Drive."
        : "Surat berjaya disimpan melalui pautan Google Drive yang diberikan.";
  } catch (error) { $("#letterStatus").textContent = error.message || "Surat gagal disimpan."; }
  finally { $("#letterSave").disabled = false; }
}

function visibleClasses() {
  return state.session === "all" ? state.classes : state.classes.filter((row) => classSession(row) === state.session);
}

function updateSessionVisibility() {
  document.querySelectorAll("[data-report-session]").forEach((element) => {
    element.classList.toggle("session-hidden", state.session !== "all" && element.dataset.reportSession !== state.session);
  });
}

function setStatus(message, type = "") {
  const element = $("#saveStatus");
  element.textContent = message;
  element.className = `save-status ${type}`.trim();
}

function updateDateHeading() {
  const date = new Date(`${state.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return;
  const longDate = new Intl.DateTimeFormat("ms-MY", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("ms-MY", { weekday: "long" }).format(date);
  $("#dateLong").textContent = longDate;
  $("#dayLong").textContent = weekday;
  $("#homeSummaryDate").textContent = `${longDate} • ${weekday}`;
  $("#monitoringDateLabel").textContent = longDate;
}

function renderAttendance() {
  const rows = visibleClasses();
  $("#sessionReportLabel").textContent = SESSION_LABELS[state.session] || SESSION_LABELS.all;
  $("#attendanceBody").innerHTML = rows.map((row, index) => {
    const f = classFigures(row);
    const complete = classIsCompleted(row.id);
    return `<tr class="${complete ? "class-complete" : "class-incomplete"}" data-class-id="${safe(row.id)}">
      <td>${index + 1}</td><td>${safe(row.teacherName || "—")}</td><td><strong>${safe(row.name)}</strong></td><td data-class-status>${classStatusMarkup(row.id)}</td>
      <td>${f.enrolMale}</td><td>${f.enrolFemale}</td><td><strong>${f.enrolTotal}</strong></td>
      <td>${f.presentMale}</td><td>${f.presentFemale}</td><td><strong>${f.presentTotal}</strong></td><td><strong>${percent(f.presentTotal, f.enrolTotal)}</strong></td>
      <td><input class="cell-input num-input${auditDetails("attendance", row.id, "absentMale").className}" type="number" inputmode="numeric" min="0" max="${f.enrolMale}" value="${f.absentMale}" data-field="absentMale" aria-label="Lelaki tidak hadir ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "absentMale").title)}"></td>
      <td><input class="cell-input num-input${auditDetails("attendance", row.id, "absentFemale").className}" type="number" inputmode="numeric" min="0" max="${f.enrolFemale}" value="${f.absentFemale}" data-field="absentFemale" aria-label="Perempuan tidak hadir ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "absentFemale").title)}"></td>
      <td><strong>${f.absentTotal}</strong></td><td>${percent(f.absentTotal, f.enrolTotal)}</td>
      <td><input class="cell-input note-input${auditDetails("attendance", row.id, "note").className}" type="text" value="${safe(row.note)}" data-field="note" aria-label="Catatan ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "note").title)}"></td>
    </tr>`;
  }).join("");
  renderClassCompletionLists();
  renderTotals();
}

function renderHomeClassTotals() {
  const groups = [
    { selector: "#homeAfternoonClasses", years: [1, 2, 3] },
    { selector: "#homeMorningClasses", years: [4, 5, 6] },
  ];
  for (const group of groups) {
    const target = $(group.selector);
    if (!target) continue;
    const rows = state.classes.filter((row) => {
      const match = String(row.id || "").match(/^tahun-([1-6])-/);
      return match && group.years.includes(Number(match[1]));
    });
    target.innerHTML = rows.length
      ? rows.map((row) => {
        const total = classFigures(row).enrolTotal;
        return `<div class="home-class-total" title="${safe(row.name)}: ${total} murid"><span>${safe(row.name)}</span><b aria-label="${total} murid">${total}</b></div>`;
      }).join("")
      : "<p>Tiada maklumat kelas.</p>";
  }
}

function renderEnrolmentOverview() {
  const levelTotals = new Map([["Prasekolah", { male: 0, female: 0, total: 0 }]]);
  for (let year = 1; year <= 6; year += 1) levelTotals.set(`Tahun ${year}`, { male: 0, female: 0, total: 0 });
  for (const row of state.classes) {
    const figures = classFigures(row);
    const yearMatch = String(row.id || "").match(/^tahun-([1-6])-/);
    const key = String(row.id || "").startsWith("pra-") ? "Prasekolah" : yearMatch ? `Tahun ${yearMatch[1]}` : "";
    if (!key || !levelTotals.has(key)) continue;
    const item = levelTotals.get(key);
    item.male += figures.enrolMale;
    item.female += figures.enrolFemale;
    item.total += figures.enrolTotal;
  }
  const preschool = levelTotals.get("Prasekolah");
  const primary = [...levelTotals.entries()].filter(([key]) => key.startsWith("Tahun ")).reduce((sum, [, item]) => ({
    male: sum.male + item.male, female: sum.female + item.female, total: sum.total + item.total,
  }), { male: 0, female: 0, total: 0 });
  $("#primaryEnrolTotal").textContent = primary.total;
  $("#preschoolEnrolTotal").textContent = preschool.total;
  $("#schoolEnrolTotal").textContent = primary.total + preschool.total;
  $("#primaryMaleTotal").textContent = primary.male;
  $("#primaryFemaleTotal").textContent = primary.female;
  $("#yearEnrolTotals").innerHTML = [...levelTotals.entries()].map(([label, item]) => `<span><b>${safe(label)}</b><strong>${item.total}</strong></span>`).join("");
}

function renderTotals() {
  const totals = visibleClasses().reduce((sum, row) => {
    const f = classFigures(row);
    Object.keys(f).forEach((key) => { sum[key] = (sum[key] || 0) + f[key]; });
    return sum;
  }, {});
  const totalLabel = state.session === "all" ? "JUMLAH KESELURUHAN" : `JUMLAH ${SESSION_LABELS[state.session]}`;
  const completedCount = visibleClasses().filter((row) => classIsCompleted(row.id)).length;
  $("#attendanceTotals").innerHTML = `<tr><td colspan="3">${totalLabel}</td><td><strong>${completedCount}/${visibleClasses().length}</strong></td><td>${totals.enrolMale || 0}</td><td>${totals.enrolFemale || 0}</td><td>${totals.enrolTotal || 0}</td><td>${totals.presentMale || 0}</td><td>${totals.presentFemale || 0}</td><td>${totals.presentTotal || 0}</td><td>${percent(totals.presentTotal || 0, totals.enrolTotal || 0)}</td><td>${totals.absentMale || 0}</td><td>${totals.absentFemale || 0}</td><td>${totals.absentTotal || 0}</td><td>${percent(totals.absentTotal || 0, totals.enrolTotal || 0)}</td><td></td></tr>`;
  $("#summaryEnrol").textContent = totals.enrolTotal || 0;
  $("#summaryPresent").textContent = totals.presentTotal || 0;
  $("#summaryAbsent").textContent = totals.absentTotal || 0;
  $("#summaryPercent").textContent = percent(totals.presentTotal || 0, totals.enrolTotal || 0);
  renderEnrolmentOverview();
  renderHomeClassTotals();
}

function renderDutyTeachers() {
  for (const session of ["morning", "afternoon"]) {
    while (state.dutyTeachers[session].length < 5) state.dutyTeachers[session].push("");
    state.dutyTeachers[session] = state.dutyTeachers[session].slice(0, 5);
    const target = session === "morning" ? $("#dutyMorningBody") : $("#dutyAfternoonBody");
    target.innerHTML = state.dutyTeachers[session].map((teacherName, index) => {
      const recordId = `${session}:${index + 1}`;
      const details = auditDetails("duty", recordId, "teacherName");
      return `<tr data-duty-session="${session}" data-duty-index="${index}"><td>${index + 1}</td><td><select class="cell-input staff-name-select${details.className}" data-field="teacherName" aria-label="Guru bertugas ${SESSION_LABELS[session]} ${index + 1}" title="${safe(details.title)}">${staffSelectOptions(teacherName, "Pilih nama guru")}</select></td></tr>`;
    }).join("");
  }
  updateEditingAccess();
}

function decodeAbsenceReason(value) {
  const text = String(value || "");
  if (text.startsWith("[v2]")) {
    const [reason = "", ...noteParts] = text.slice(4).split("|||");
    return { reasonCategory: reason, reasonNote: noteParts.join("|||") };
  }
  const known = ABSENCE_REASONS.find((item) => text === item || text.startsWith(`${item} — `));
  return known ? { reasonCategory: known, reasonNote: text.slice(known.length).replace(/^\s*—\s*/, "") } : { reasonCategory: text ? "Lain-lain" : "", reasonNote: text };
}

function encodeAbsenceReason(row) {
  const reason = String(row.reasonCategory || "").trim();
  const note = String(row.reasonNote || "").trim();
  return reason || note ? `[v2]${reason}|||${note}` : "";
}

function renderStaff() {
  for (const session of ["morning", "afternoon"]) {
    const rows = Array.isArray(state.staffAbsences[session]) ? state.staffAbsences[session] : [];
    while (rows.length < 8) rows.push({ staffName: "", reason: "", reasonCategory: "", reasonNote: "" });
    state.staffAbsences[session] = rows.slice(0, 8);
    const target = session === "morning" ? $("#staffMorningBody") : $("#staffAfternoonBody");
    target.innerHTML = state.staffAbsences[session].map((row, index) => {
      const recordId = `${session}:${index + 1}`;
      const staffAudit = auditDetails("staff", recordId, "staffName");
      const savedName = String(row.staffName || "");
      const decoded = row.reasonCategory !== undefined ? row : decodeAbsenceReason(row.reason);
      row.reasonCategory = decoded.reasonCategory || ""; row.reasonNote = decoded.reasonNote || "";
      const required = row.reasonCategory === "Lain-lain" ? " required" : "";
      return `<tr data-staff-session="${session}" data-staff-index="${index}"><td>${index + 1}</td><td><select class="cell-input staff-name-select${staffAudit.className}" data-field="staffName" aria-label="Nama guru atau AKP ${SESSION_LABELS[session]} ${index + 1}" title="${safe(staffAudit.title)}">${staffSelectOptions(savedName)}</select></td><td><input class="cell-input absence-reason" data-field="reasonCategory" list="absenceReasons" value="${safe(row.reasonCategory)}" placeholder="Pilih atau taip sebab" aria-label="Sebab ${SESSION_LABELS[session]} ${index + 1}"></td><td><input class="cell-input" data-field="reasonNote" value="${safe(row.reasonNote || "")}" placeholder="${row.reasonCategory === "Lain-lain" ? "Nyatakan sebab (wajib)" : "Pilihan"}"${required}></td></tr>`;
    }).join("");
  }
  updateEditingAccess();
}

function renderMeta() {
  $("#reportNoteMorning").value = state.meta.noteMorning || "";
  $("#preparedByMorning").value = state.meta.preparedByMorning || "";
  $("#reportNoteAfternoon").value = state.meta.noteAfternoon || "";
  $("#preparedByAfternoon").value = state.meta.preparedByAfternoon || "";
  for (const field of ["approvedByMorning", "approvedTitleMorning", "approvedByAfternoon", "approvedTitleAfternoon"]) $("#" + field).value = state.meta[field] || "";
  const legacyApproval = [state.meta.approvedBy, state.meta.approvedTitle].filter(Boolean).join(" · ");
  $("#legacyApprovalNote").hidden = !legacyApproval;
  $("#legacyApprovalValue").textContent = legacyApproval;
  for (const [selector, field] of [["#reportNoteMorning", "noteMorning"], ["#preparedByMorning", "preparedByMorning"], ["#reportNoteAfternoon", "noteAfternoon"], ["#preparedByAfternoon", "preparedByAfternoon"], ["#approvedByMorning", "approvedByMorning"], ["#approvedTitleMorning", "approvedTitleMorning"], ["#approvedByAfternoon", "approvedByAfternoon"], ["#approvedTitleAfternoon", "approvedTitleAfternoon"]]) {
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

function renderAdminStaffDirectory() {
  $("#adminStaffBody").innerHTML = state.adminStaffDirectory.map((item, index) => {
    const active = item.active !== false;
    return `<tr data-admin-staff-id="${item.id || ""}" data-admin-staff-active="${active}">
      <td>${index + 1}</td>
      <td><input data-admin-staff-name type="text" maxlength="140" value="${safe(item.name)}" aria-label="Nama guru atau AKP ${index + 1}"></td>
      <td><span class="staff-status ${active ? "active" : "inactive"}">${active ? "Aktif" : "Tidak aktif"}</span></td>
      <td><button class="staff-toggle-button ${active ? "deactivate" : "activate"}" type="button" data-admin-staff-toggle>${active ? "Nyahaktif" : "Aktifkan"}</button></td>
    </tr>`;
  }).join("");
}

function renderSchoolStats() {
  $("#teacherStat").textContent = count(state.schoolStats.teachers, 500);
  $("#akpStat").textContent = count(state.schoolStats.akp, 100);
  if ($("#adminTeacherCount")) $("#adminTeacherCount").value = count(state.schoolStats.teachers, 500);
  if ($("#adminAkpCount")) $("#adminAkpCount").value = count(state.schoolStats.akp, 100);
}

function addAdminStaffRow() {
  syncAdminStaffDirectoryFromRows();
  state.adminStaffDirectory.push({ id: null, name: "", active: true });
  renderAdminStaffDirectory();
  $("#adminStaffBody tr:last-child input")?.focus();
}

function syncAdminStaffDirectoryFromRows() {
  state.adminStaffDirectory = Array.from(document.querySelectorAll("#adminStaffBody tr")).map((row) => ({
    id: row.dataset.adminStaffId ? Number(row.dataset.adminStaffId) : null,
    name: row.querySelector("[data-admin-staff-name]").value.trim(),
    active: row.dataset.adminStaffActive === "true",
  }));
}

function organizationStaffOptions(selectedId) {
  return `<option value="">Pilih guru / pegawai</option>${state.adminStaffDirectory.map((item) => `<option value="${Number(item.id) || ""}"${Number(item.id) === Number(selectedId) ? " selected" : ""}>${safe(item.name)}${item.active === false ? " (tidak aktif)" : ""}</option>`).join("")}`;
}

function renderAdminOrganization() {
  const target = $("#adminOrganizationList");
  if (!state.organization.adminItems.length) {
    target.innerHTML = '<p class="organization-admin-empty">Belum ada rekod. Tekan “+ Tambah pegawai / bidang”.</p>';
    return;
  }
  target.innerHTML = state.organization.adminItems.map((item, index) => `<article class="organization-admin-card" data-organization-index="${index}" data-organization-id="${safe(item.id || "")}">
    <div class="organization-photo-editor">
      <div class="organization-photo-preview">${organizationPortrait(item, true)}</div>
      <label class="secondary-button organization-photo-button">Upload / Tukar gambar<input data-organization-photo type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden></label>
      <button class="organization-remove-photo" data-organization-remove-photo type="button"${item.photoUrl || item._previewUrl ? "" : " disabled"}>Padam gambar</button>
    </div>
    <div class="organization-admin-fields">
      <label>Nama pegawai<select data-organization-field="staffId" required>${organizationStaffOptions(item.staffId)}</select></label>
      <label>Jawatan<input data-organization-field="positionTitle" type="text" maxlength="100" value="${safe(item.positionTitle || "")}" placeholder="Contoh: Penyelaras"></label>
      <label>Bidang HEM<input data-organization-field="fieldName" type="text" maxlength="140" value="${safe(item.fieldName || "")}" placeholder="Contoh: Disiplin &amp; Sahsiah Murid"></label>
      <label>Peranan<input data-organization-field="roleLabel" type="text" maxlength="100" value="${safe(item.roleLabel || "")}" placeholder="Contoh: Penyelaras / AJK"></label>
      <label>Tahap hierarki<select data-organization-field="hierarchyLevel">${[[1,"1 - Guru Besar"],[2,"2 - Penolong Kanan HEM"],[3,"3 - Setiausaha HEM"],[4,"4 - Penyelaras Unit"],[5,"5 - AJK / Pegawai"]].map(([value,label]) => `<option value="${value}"${Number(item.hierarchyLevel) === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Susunan<input data-organization-field="sortOrder" type="number" min="1" max="999" value="${count(item.sortOrder || index + 1, 999)}"></label>
    </div>
    <div class="organization-admin-actions">
      <span class="staff-status ${item.active === false ? "inactive" : "active"}">${item.active === false ? "Tidak aktif" : "Aktif"}</span>
      <button class="staff-toggle-button ${item.active === false ? "activate" : "deactivate"}" data-organization-toggle type="button">${item.active === false ? "Aktifkan" : "Nyahaktif"}</button>
      <button class="organization-delete-button" data-organization-delete type="button">Padam rekod</button>
    </div>
  </article>`).join("");
}

function syncAdminOrganizationFromRows() {
  document.querySelectorAll("#adminOrganizationList [data-organization-index]").forEach((row) => {
    const index = Number(row.dataset.organizationIndex), item = state.organization.adminItems[index];
    if (!item) return;
    for (const field of ["staffId", "positionTitle", "fieldName", "roleLabel", "hierarchyLevel", "sortOrder"]) {
      const input = row.querySelector(`[data-organization-field="${field}"]`);
      if (!input) continue;
      item[field] = ["staffId", "hierarchyLevel", "sortOrder"].includes(field) ? Number(input.value) : input.value.trim();
    }
  });
}

function addOrganizationRow() {
  syncAdminOrganizationFromRows();
  state.organization.adminItems.push({ id: "", staffId: "", staffName: "", fieldName: "", positionTitle: "Penyelaras", roleLabel: "Penyelaras", hierarchyLevel: 4, sortOrder: state.organization.adminItems.length + 1, active: true, photoUrl: "", removePhoto: false });
  renderAdminOrganization();
  $("#adminOrganizationList [data-organization-index]:last-child select")?.focus();
}

async function loadAdminOrganization() {
  $("#adminOrganizationStatus").textContent = "Memuatkan organisasi HEM…";
  try {
    const response = await fetch(ORGANIZATION_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "readAdmin", adminPin: state.adminPin }) });
    const data = await responseJson(response, "Organisasi HEM tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Organisasi HEM tidak dapat dibuka.");
    state.organization.adminItems = (Array.isArray(data.organization) ? data.organization : []).map((item) => ({ ...item, _file: null, _previewUrl: "", removePhoto: false }));
    state.organization.deletedIds = [];
    renderAdminOrganization();
    $("#adminOrganizationStatus").textContent = "Organisasi HEM sedia untuk dikemas kini.";
  } catch (error) { $("#adminOrganizationStatus").textContent = error.message || "Organisasi HEM tidak dapat dibuka."; }
}

async function prepareOrganizationPhoto(file) {
  if (!file || !(file.type || "").startsWith("image/") || file.size > 25 * 1024 * 1024) throw new Error("Pilih gambar JPG, PNG atau WebP yang tidak melebihi 25 MB.");
  const image = await loadMonitoringImage(file), size = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, Math.round((image.naturalWidth - size) / 2)), sourceY = Math.max(0, Math.round((image.naturalHeight - size) / 2));
  const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 640;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Gambar profil tidak dapat diproses.");
  context.fillStyle = "#ffffff"; context.fillRect(0, 0, 640, 640); context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 640, 640);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Gambar profil tidak dapat dikecilkan.")), "image/jpeg", 0.86));
  return { name: "profil-hem.jpg", type: "image/jpeg", data: await readBlobAsBase64(blob) };
}

async function saveOrganization() {
  syncAdminOrganizationFromRows();
  const items = state.organization.adminItems;
  if (!items.length || items.some((item) => !Number(item.staffId) || !item.fieldName || !item.positionTitle || !item.roleLabel)) {
    $("#adminOrganizationStatus").textContent = "Lengkapkan nama, bidang, jawatan dan peranan bagi setiap rekod."; return;
  }
  $("#adminOrganizationSave").disabled = true; $("#adminOrganizationStatus").textContent = "Memproses gambar dan menyimpan…";
  try {
    const entries = [];
    for (const item of items) entries.push({
      id: item.id || "", staffId: Number(item.staffId), fieldName: item.fieldName, positionTitle: item.positionTitle, roleLabel: item.roleLabel,
      hierarchyLevel: Number(item.hierarchyLevel), sortOrder: Number(item.sortOrder), active: item.active !== false, removePhoto: item.removePhoto === true,
      photo: item._file ? await prepareOrganizationPhoto(item._file) : null,
    });
    const response = await fetch(ORGANIZATION_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveOrganization", adminPin: state.adminPin, entries, deletedIds: state.organization.deletedIds }) });
    const data = await responseJson(response, "Organisasi HEM gagal disimpan.");
    if (!response.ok) throw new Error(data.error || "Organisasi HEM gagal disimpan.");
    for (const item of state.organization.adminItems) if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    state.organization.adminItems = (Array.isArray(data.organization) ? data.organization : []).map((item) => ({ ...item, _file: null, _previewUrl: "", removePhoto: false }));
    state.organization.deletedIds = [];
    state.organization.items = state.organization.adminItems.filter((item) => item.active !== false);
    renderAdminOrganization(); renderOrganization();
    $("#adminOrganizationStatus").textContent = "Organisasi HEM berjaya disimpan dan dikemas kini pada semua peranti.";
  } catch (error) { $("#adminOrganizationStatus").textContent = error.message || "Organisasi HEM gagal disimpan."; }
  finally { $("#adminOrganizationSave").disabled = false; }
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
    state.adminStaffDirectory = Array.isArray(data.staffDirectory) ? data.staffDirectory.map((item) => ({ ...item, active: Boolean(item.active) })) : [];
    if (data.settings) state.schoolStats = { teachers: count(data.settings.teachers, 500), akp: count(data.settings.akp, 100) };
    $("#adminPin").value = "";
    $("#adminLoginView").hidden = true;
    $("#adminSettingsView").hidden = false;
    $("#profileEffectiveDate").value = state.date || localDateValue();
    $("#adminSaveStatus").textContent = "";
    renderAdminClasses(); renderSchoolStats();
    renderAdminStaffDirectory();
    await Promise.all([loadAdminOrganization(), loadAdminContent()]);
  } catch (error) {
    state.adminPin = "";
    $("#adminError").textContent = error.message || "Kod admin tidak sah.";
  }
}

async function saveSchoolStats() {
  const teachers = count($("#adminTeacherCount").value, 500), akp = count($("#adminAkpCount").value, 100);
  $("#adminStatsSave").disabled = true; $("#adminStatsStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateSchoolStats", adminPin: state.adminPin, teachers, akp }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Statistik gagal disimpan.");
    state.schoolStats = { teachers, akp }; renderSchoolStats(); $("#adminStatsStatus").textContent = "Statistik warga berjaya dikemas kini.";
  } catch (error) { $("#adminStatsStatus").textContent = error.message || "Statistik gagal disimpan."; }
  finally { $("#adminStatsSave").disabled = false; }
}

async function saveStaffDirectory() {
  const entries = Array.from(document.querySelectorAll("#adminStaffBody tr")).map((row) => ({
    id: row.dataset.adminStaffId ? Number(row.dataset.adminStaffId) : null,
    name: row.querySelector("[data-admin-staff-name]").value.trim(),
    active: row.dataset.adminStaffActive === "true",
  }));
  if (entries.some((item) => !item.name)) { $("#adminStaffSaveStatus").textContent = "Sila isi semua nama dahulu."; return; }
  $("#adminStaffSave").disabled = true;
  $("#adminStaffSaveStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateStaffDirectory", adminPin: state.adminPin, entries }) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) { showAdminLogin("Sesi admin tamat. Masukkan kod semula."); return; }
      throw new Error(data.error || "Senarai nama gagal disimpan.");
    }
    state.adminStaffDirectory = Array.isArray(data.staffDirectory) ? data.staffDirectory.map((item) => ({ ...item, active: Boolean(item.active) })) : entries;
    state.staffDirectory = state.adminStaffDirectory.filter((item) => item.active);
    refreshStaffNameChoices(); renderStaff(); renderAdminStaffDirectory(); updateEditingAccess();
    if (state.organization.adminItems.length) renderAdminOrganization();
    $("#adminStaffSaveStatus").textContent = "Senarai nama berjaya dikemas kini untuk semua guru.";
  } catch (error) {
    $("#adminStaffSaveStatus").textContent = error.message || "Senarai nama gagal disimpan.";
  } finally { $("#adminStaffSave").disabled = false; }
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
  return state.pendingAttendance.size > 0 || state.staffDirty || state.dutyDirtySessions.size > 0 || Object.keys(state.pendingMeta).length > 0;
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
    state.staffAbsences = { morning: [], afternoon: [] };
    for (const item of Array.isArray(data.staffAbsences) ? data.staffAbsences : []) {
      const session = item.session === "afternoon" ? "afternoon" : "morning";
      state.staffAbsences[session].push({ staffName: item.staffName || "", reason: item.reason || "", ...decodeAbsenceReason(item.reason) });
    }
    state.dutyTeachers = { morning: [], afternoon: [] };
    for (const item of Array.isArray(data.dutyTeachers) ? data.dutyTeachers : []) {
      if (!["morning", "afternoon"].includes(item.session)) continue;
      state.dutyTeachers[item.session][Number(item.rowOrder) - 1] = item.teacherName || "";
    }
    state.meta = data.meta || {};
    if (Array.isArray(data.staffDirectory)) state.staffDirectory = data.staffDirectory.map((item) => ({ ...item, active: Boolean(item.active) }));
    if (data.settings) { state.schoolStats = { teachers: count(data.settings.teachers, 500), akp: count(data.settings.akp, 100) }; renderSchoolStats(); }
    refreshStaffNameChoices();
    state.audit = new Map((Array.isArray(data.audit) ? data.audit : []).map((item) => [auditKey(item.section, item.recordId, item.fieldName), item]));
    const restoredDraft = !silent && restoreDraft();
    renderAttendance(); renderDutyTeachers(); renderStaff(); renderMeta(); updateSessionVisibility();
    if (HASH_VIEWS[window.location.hash.replace(/^#/, "")] === "analysis") await loadKpiDashboard();
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
  const incompleteOther = ["morning", "afternoon"].flatMap((session) => state.staffAbsences[session] || []).some((item) => item.reasonCategory === "Lain-lain" && !String(item.reasonNote || "").trim());
  if (incompleteOther) { setStatus("Sila nyatakan sebab ketiadaan.", "error"); return; }
  if (state.savePromise) {
    await state.savePromise;
    if (hasPendingChanges()) return flushSave();
    return;
  }
  if (!hasPendingChanges()) return;
  const snapshot = {
    date: state.date,
    attendanceUpdates: Array.from(state.pendingAttendance.values()).map((item) => ({ ...item })),
    staffAbsences: state.staffDirty ? ["morning", "afternoon"].flatMap((session) => state.staffAbsences[session].map((item) => ({ ...item, session }))) : null,
    dutyTeacherUpdates: Array.from(state.dutyDirtySessions).map((session) => ({ session, teachers: [...state.dutyTeachers[session]] })),
    metaUpdates: { ...state.pendingMeta },
    updatedBy: editorName(),
  };
  state.pendingAttendance.clear(); state.staffDirty = false; state.dutyDirtySessions.clear(); state.pendingMeta = {};
  const payload = { date: snapshot.date, attendanceUpdates: snapshot.attendanceUpdates, updatedBy: snapshot.updatedBy };
  if (snapshot.staffAbsences) payload.staffAbsences = snapshot.staffAbsences;
  if (snapshot.dutyTeacherUpdates.length) payload.dutyTeacherUpdates = snapshot.dutyTeacherUpdates;
  if (Object.keys(snapshot.metaUpdates).length) payload.metaUpdates = snapshot.metaUpdates;
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
      for (const update of snapshot.dutyTeacherUpdates) state.dutyDirtySessions.add(update.session);
      state.pendingMeta = { ...snapshot.metaUpdates, ...state.pendingMeta };
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
  updateClassCompletionStatus(item.id);
  saveDraft();
  renderTotals(); scheduleSave();
});

function updateStaffRow(event) {
  const input = event.target.closest("input[data-field],select[data-field]");
  if (!input) return;
  const row = input.closest("tr");
  const index = Number(row.dataset.staffIndex);
  const session = row.dataset.staffSession;
  state.staffAbsences[session][index][input.dataset.field] = input.value;
  const item = state.staffAbsences[session][index];
  if (input.dataset.field === "reasonCategory" && item.reasonCategory && !ABSENCE_REASONS.includes(item.reasonCategory)) {
    item.reasonNote = item.reasonCategory;
    item.reasonCategory = "Lain-lain";
  }
  item.reason = encodeAbsenceReason(item);
  state.staffDirty = true;
  saveDraft();
  if (item.reasonCategory === "Lain-lain" && !String(item.reasonNote || "").trim()) {
    setStatus("Sila nyatakan sebab ketiadaan.", "error");
    if (input.dataset.field === "reasonCategory") renderStaff();
    return;
  }
  if (input.dataset.field === "reasonCategory") renderStaff();
  scheduleSave();
}
for (const selector of ["#staffMorningBody", "#staffAfternoonBody"]) {
  $(selector).addEventListener("input", (event) => { if (event.target.matches('input[data-field="reasonNote"]')) updateStaffRow(event); });
  $(selector).addEventListener("change", (event) => { if (event.target.matches("select[data-field],input[data-field]")) updateStaffRow(event); });
}

for (const selector of ["#dutyMorningBody", "#dutyAfternoonBody"]) {
  const updateDutyTeacher = (event) => {
    const input = event.target.closest("select[data-field]");
    if (!input) return;
    const row = input.closest("tr[data-duty-session]");
    const session = row.dataset.dutySession;
    state.dutyTeachers[session][Number(row.dataset.dutyIndex)] = input.value;
    state.dutyDirtySessions.add(session);
    saveDraft(); scheduleSave();
  };
  $(selector).addEventListener("change", updateDutyTeacher);
}

[["#reportNoteMorning", "noteMorning"], ["#preparedByMorning", "preparedByMorning"], ["#reportNoteAfternoon", "noteAfternoon"], ["#preparedByAfternoon", "preparedByAfternoon"], ["#approvedByMorning", "approvedByMorning"], ["#approvedTitleMorning", "approvedTitleMorning"], ["#approvedByAfternoon", "approvedByAfternoon"], ["#approvedTitleAfternoon", "approvedTitleAfternoon"]].forEach(([selector, field]) => {
  const updateMeta = (event) => {
    state.meta[field] = event.target.value;
    state.pendingMeta[field] = event.target.value;
    saveDraft(); scheduleSave();
  };
  $(selector).addEventListener($(selector).tagName === "SELECT" ? "change" : "input", updateMeta);
});

function syncReportDateInputs() {
  ["#reportDate", "#staffPageDate", "#dailyDutyDate", "#monitoringDate", "#oprDate"].forEach((selector) => { $(selector).value = state.date; });
}

async function changeReportDate(event) {
  if (!event.target.value || event.target.value === state.date) return;
  await flushSave();
  state.date = event.target.value;
  syncReportDateInputs();
  state.pendingAttendance.clear(); state.staffDirty = false; state.dutyDirtySessions.clear(); state.pendingMeta = {};
  loadReport();
  loadMonitoringReports();
}

["#reportDate", "#staffPageDate", "#dailyDutyDate", "#monitoringDate"].forEach((selector) => $(selector).addEventListener("change", changeReportDate));
$("#sessionFilter").addEventListener("change", (event) => {
  state.session = event.target.value;
  renderAttendance();
  updateSessionVisibility();
  updateEditingAccess();
});
const VIEW_HASHES = { home: "utama", attendance: "e-jkm", staff: "keberadaan-guru-akp", dailyDuty: "guru-bertugas-harian", duty: "guru-bertugas", calendar: "rekod-kalendar", monitoring: "laporan-pemantauan", analysis: "analisis", rmt: "guru-rmt", opr: "template-opr-hem" };
const HASH_VIEWS = Object.fromEntries(Object.entries(VIEW_HASHES).map(([view, hash]) => [hash, view]));
HASH_VIEWS["laporan-bergambar"] = "monitoring";
HASH_VIEWS.kehadiran = "attendance";
HASH_VIEWS["rekod-pengisian-kelas"] = "attendance";
HASH_VIEWS["status-kelas"] = "attendance";

function activateViewFromHash() {
  const requested = HASH_VIEWS[window.location.hash.replace(/^#/, "")] || "home";
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== requested;
  });
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    if (link.dataset.viewLink === requested) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#top").hidden = false;
  $("#identityBar").hidden = !["attendance", "staff", "dailyDuty", "rmt", "monitoring"].includes(requested);
  $("#printButton").hidden = requested !== "attendance";
  if (requested === "analysis") { loadAnalytics(); if (state.classes.length) loadKpiDashboard(); }
  if (requested === "monitoring") loadMonitoringReports();
  if (requested === "duty") loadWeeklyDuty();
  if (requested === "completion") loadCompletionView();
  if (requested === "calendar") loadCalendarRecord();
  if (requested === "rmt") loadRmtReports();
  if (requested === "opr") loadOprReports();
  setSidebar(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("hashchange", activateViewFromHash);
$("#printButton").addEventListener("click", () => window.print());
$("#analysisRefresh").addEventListener("click", loadAnalytics);
$("#analysisPeriod").addEventListener("change", loadAnalytics);
$("#kpiMonth").addEventListener("change", loadKpiAnalytics);
$("#kpiYear").addEventListener("change", () => {
  loadKpiAnalytics();
  loadAnnualWinners();
});
$("#annualWinnersGrid").addEventListener("click", (event) => {
  const card = event.target.closest("[data-annual-month]");
  if (!card) return;
  $("#kpiMonth").value = card.dataset.annualMonth;
  loadKpiAnalytics();
  document.querySelector(".kpi-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#weeklyDutyRefresh").addEventListener("click", loadWeeklyDuty);
$("#completionRefresh").addEventListener("click", loadCompletionView);
$("#completionSession").addEventListener("change", loadCompletionView);
$("#calendarRefresh").addEventListener("click", loadCalendarRecord);
$("#rmtPhotos").addEventListener("change", (event) => renderRmtImagePreview(event.target.files));
$("#rmtMorningCount").addEventListener("input", updateRmtTotal);
$("#rmtAfternoonCount").addEventListener("input", updateRmtTotal);
$("#rmtPhotoSave").addEventListener("click", saveRmtPhotos);
$("#rmtPhotoRefresh").addEventListener("click", loadRmtReports);
$("#rmtFrom").addEventListener("change", loadRmtReports);
$("#menuToggle").addEventListener("click", () => setSidebar(!document.body.classList.contains("sidebar-open")));
$("#sidebarBackdrop").addEventListener("click", () => setSidebar(false));
document.querySelectorAll("[data-view-link]").forEach((link) => link.addEventListener("click", () => setSidebar(false)));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { setSidebar(false); if (!$("#recordEditModal").hidden) closeRecordEditor(); } });
$("#monitoringRefresh").addEventListener("click", loadMonitoringReports);
$("#monitoringPhotos").addEventListener("change", (event) => renderMonitoringPreview(event.target.files));
$("#monitoringForm").addEventListener("submit", saveMonitoringReport);
$("#addMonitoringItem").addEventListener("click", addMonitoringItem);
$("#monitoringItems").addEventListener("click", (event) => { const button = event.target.closest(".monitoring-remove"); if (!button) return; button.closest(".monitoring-item-card").remove(); if (!$("#monitoringItems").children.length) $("#monitoringItems").innerHTML = '<p class="monitoring-empty">Tekan “+ Tambah Kategori Pemantauan” dan pilih kawasan yang dipantau.</p>'; });
$("#monitoringItems").addEventListener("change", (event) => {
  const card = event.target.closest(".monitoring-item-card"); if (!card) return;
  if (event.target.matches('[data-monitoring-field="location"]')) card.querySelector(".other-location").hidden = event.target.value !== "Lain-lain";
  if (event.target.matches('[data-monitoring-field="status"]')) { const follow = card.querySelector(".follow-up"); follow.hidden = event.target.value !== "attention"; follow.querySelector("textarea").required = event.target.value === "attention"; }
  if (event.target.matches('[data-monitoring-field="photos"]')) { const preview = card.querySelector("[data-monitoring-preview]"); try { const files = validateMonitoringFiles(event.target.files); preview.innerHTML = files.map((file, index) => `<figure><img src="${URL.createObjectURL(file)}" alt="Pratonton ${index + 1}"><figcaption>Gambar ${index + 1}</figcaption></figure>`).join(""); } catch (error) { event.target.value = ""; preview.textContent = error.message; } }
});
$("#oprPhotos").addEventListener("change", (event) => renderOprPreview(event.target.files));
$("#oprForm").addEventListener("submit", saveOprReport);
$("#oprRefresh").addEventListener("click", loadOprReports);
$("#oprDate").addEventListener("change", loadOprReports);
$("#oprGallery").addEventListener("click", (event) => { const button = event.target.closest("[data-edit-opr]"); if (button) openRecordEditor("opr", button.dataset.editOpr); });
$("#letterArchiveToggle").addEventListener("click", toggleLetterArchive);
$("#latestLetterGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-edit-letter]"); if (button) openRecordEditor("letter", button.dataset.editLetter); });
$("#letterArchiveGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-edit-letter]"); if (button) openRecordEditor("letter", button.dataset.editLetter); });
$("#recordEditForm").addEventListener("submit", saveRecordEdit);
$("#recordEditClose").addEventListener("click", closeRecordEditor);
$("#recordEditModal").addEventListener("click", (event) => { if (event.target === $("#recordEditModal")) closeRecordEditor(); });
$("#adminButton").addEventListener("click", async () => {
  await flushSave();
  $("#adminModal").hidden = false;
  document.body.classList.add("modal-open");
  showAdminLogin();
});
$("#adminClose").addEventListener("click", closeAdminModal);
$("#adminLoginForm").addEventListener("submit", verifyAdmin);
$("#adminSave").addEventListener("click", saveClassProfiles);
$("#adminStaffAdd").addEventListener("click", addAdminStaffRow);
$("#adminStaffSave").addEventListener("click", saveStaffDirectory);
$("#adminStatsSave").addEventListener("click", saveSchoolStats);
$("#adminOrganizationAdd").addEventListener("click", addOrganizationRow);
$("#adminOrganizationSave").addEventListener("click", saveOrganization);
$("#adminAnnouncementAdd").addEventListener("click", () => { syncAdminAnnouncements(); state.content.adminAnnouncements.push({ id: "", message: "", active: true }); renderAdminAnnouncements(); });
$("#adminAnnouncementSave").addEventListener("click", saveAdminAnnouncements);
$("#adminAnnouncementList").addEventListener("input", () => { syncAdminAnnouncements(); renderAdminTickerPreview(); });
$("#adminAnnouncementList").addEventListener("click", (event) => {
  const row = event.target.closest("[data-announcement-index]"); if (!row) return;
  syncAdminAnnouncements();
  const index = Number(row.dataset.announcementIndex), item = state.content.adminAnnouncements[index];
  const direction = event.target.closest("[data-announcement-move]")?.dataset.announcementMove;
  if (direction === "up" && index > 0) [state.content.adminAnnouncements[index - 1], state.content.adminAnnouncements[index]] = [item, state.content.adminAnnouncements[index - 1]];
  else if (direction === "down" && index < state.content.adminAnnouncements.length - 1) [state.content.adminAnnouncements[index + 1], state.content.adminAnnouncements[index]] = [item, state.content.adminAnnouncements[index + 1]];
  else if (event.target.closest("[data-announcement-toggle]")) item.active = item.active === false;
  else if (event.target.closest("[data-announcement-delete]")) { if (item.id) state.content.deletedAnnouncementIds.push(item.id); state.content.adminAnnouncements.splice(index, 1); }
  else return;
  renderAdminAnnouncements();
});
$("#letterForm").addEventListener("submit", saveLetter);
$("#adminOrganizationList").addEventListener("input", syncAdminOrganizationFromRows);
$("#adminOrganizationList").addEventListener("change", (event) => {
  const row = event.target.closest("[data-organization-index]"); if (!row) return;
  syncAdminOrganizationFromRows();
  const index = Number(row.dataset.organizationIndex), item = state.organization.adminItems[index];
  if (event.target.matches('[data-organization-field="staffId"]')) {
    item.staffName = state.adminStaffDirectory.find((staff) => Number(staff.id) === Number(item.staffId))?.name || "";
  }
  if (event.target.matches("[data-organization-photo]")) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!(file.type || "").startsWith("image/") || file.size > 25 * 1024 * 1024) { event.target.value = ""; $("#adminOrganizationStatus").textContent = "Pilih gambar yang sah dan tidak melebihi 25 MB."; return; }
    if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    item._file = file; item._previewUrl = URL.createObjectURL(file); item.removePhoto = false;
  }
  renderAdminOrganization();
});
$("#adminOrganizationList").addEventListener("click", (event) => {
  const row = event.target.closest("[data-organization-index]"); if (!row) return;
  syncAdminOrganizationFromRows();
  const index = Number(row.dataset.organizationIndex), item = state.organization.adminItems[index];
  if (event.target.closest("[data-organization-toggle]")) item.active = item.active === false;
  else if (event.target.closest("[data-organization-remove-photo]")) {
    if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    item._file = null; item._previewUrl = ""; item.photoUrl = ""; item.removePhoto = true;
  } else if (event.target.closest("[data-organization-delete]")) {
    if (item.id) state.organization.deletedIds.push(item.id);
    if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    state.organization.adminItems.splice(index, 1);
  } else return;
  renderAdminOrganization();
});
$("#adminStaffBody").addEventListener("input", (event) => {
  const input = event.target.closest("[data-admin-staff-name]");
  if (!input) return;
  input.value = input.value.toUpperCase();
  const row = input.closest("tr");
  const index = Array.from(row.parentElement.children).indexOf(row);
  state.adminStaffDirectory[index] = { ...state.adminStaffDirectory[index], name: input.value };
});
$("#adminStaffBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-staff-toggle]");
  if (!button) return;
  const row = button.closest("tr");
  row.dataset.adminStaffActive = String(row.dataset.adminStaffActive !== "true");
  const index = Array.from(row.parentElement.children).indexOf(row);
  state.adminStaffDirectory[index] = { ...state.adminStaffDirectory[index], name: row.querySelector("[data-admin-staff-name]").value, active: row.dataset.adminStaffActive === "true" };
  renderAdminStaffDirectory();
});
$("#adminModal").addEventListener("click", (event) => { if (event.target === $("#adminModal")) closeAdminModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#adminModal").hidden) closeAdminModal(); });

for (const session of ["Morning", "Afternoon"]) {
  $("#approvedBy" + session).addEventListener("change", (event) => {
    const title = ADMIN_APPROVERS[event.target.value] || "";
    const titleField = "approvedTitle" + session;
    $("#" + titleField).value = title; state.meta[titleField] = title; state.pendingMeta[titleField] = title; saveDraft(); scheduleSave();
  });
}

document.querySelectorAll("[data-rmt-session]").forEach((form) => {
  form.addEventListener("submit", saveRmtReport);
  form.querySelector('[data-rmt-field="photos"]').addEventListener("change", (event) => {
    const preview = form.querySelector("[data-rmt-preview]");
    try { const files = validateMonitoringFiles(event.target.files); preview.innerHTML = files.map((file, index) => `<figure><img src="${URL.createObjectURL(file)}" alt="Pratonton RMT ${index + 1}"><figcaption>Gambar ${index + 1}</figcaption></figure>`).join(""); }
    catch (error) { event.target.value = ""; preview.textContent = error.message; }
  });
});

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
$("#editorName").addEventListener("change", (event) => {
  const match = activeStaffNames().find((name) => name.toLocaleLowerCase("ms") === event.target.value.trim().toLocaleLowerCase("ms"));
  if (match && event.target.value !== match) {
    event.target.value = match;
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

state.date = localDateValue();
syncReportDateInputs();
state.analytics.date = state.date;
$("#analysisDate").value = state.date;
$("#weeklyDutyDate").value = state.date;
$("#completionDate").value = state.date;
$("#calendarDate").value = state.date;
$("#letterDate").value = state.date;
setupRmtTemplate();
setupKpiFilters();
refreshStaffNameChoices();
try { $("#editorName").value = localStorage.getItem(EDITOR_KEY) || ""; } catch { /* abaikan */ }
activateViewFromHash();
loadReport();
loadAnalytics();
loadMonitoringReports();
loadOrganization();
loadPublicContent();

setInterval(() => {
  const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "");
  if (document.visibilityState === "visible" && !editing && !state.loading && !state.savePromise && !hasPendingChanges()) loadReport(true);
}, 15000);

setInterval(() => {
  const monitoringEditing = $("#monitoringReports").contains(document.activeElement);
  if (document.visibilityState === "visible" && !monitoringEditing && !state.monitoring.loading) loadMonitoringReports();
}, 30000);

setInterval(() => {
  if (document.visibilityState === "visible" && $("#adminModal").hidden) loadOrganization(true);
}, 60000);

setInterval(() => {
  if (document.visibilityState === "visible" && $("#adminModal").hidden) loadPublicContent(true);
}, 60000);

window.addEventListener("online", () => { if (hasPendingChanges()) scheduleSave(); });
let tickerResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(tickerResizeTimer);
  tickerResizeTimer = setTimeout(() => {
    renderTicker();
    if (!$("#adminModal").hidden) renderAdminTickerPreview();
  }, 180);
});
window.addEventListener("beforeunload", (event) => {
  if (!hasPendingChanges() && !state.savePromise) return;
  event.preventDefault(); event.returnValue = "";
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js?v=69", { scope: "./", updateViaCache: "none" })
      .catch((error) => console.warn("PWA tidak dapat diaktifkan:", error));
  });
}
