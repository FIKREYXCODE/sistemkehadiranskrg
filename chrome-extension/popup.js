"use strict";

const SMARTTRACK_URL = "https://fikreyxcode.github.io/sistemkehadiranskrg/?v=177&fresh=1#e-jkm";
const IDME_URL = "https://idme.moe.gov.my/login";
const IDME_APP_PREFIX = "https://moeispel.moe.gov.my/";
const MAX_RECORD_AGE = 24 * 60 * 60 * 1000;

let activeTab;
let extractedRecords = [];
let savedRecord = null;

const $ = (selector) => document.querySelector(selector);
const normalizeName = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleUpperCase("ms");

function setState(message, kind = "") {
  const target = $("#pageState");
  target.textContent = message;
  target.className = `state ${kind}`.trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[char]));
}

function previewMarkup(record) {
  if (!record) return "<span>Belum ada data kelas diambil.</span>";
  return `<strong>${escapeHtml(record.className)} · ${escapeHtml(record.date)}</strong>
    <span>${escapeHtml(record.teacherName || "Guru kelas")}</span><br>
    <span>Hadir ${record.presentTotal}/${record.enrolTotal} · Tidak hadir ${record.absentTotal}</span>`;
}

async function sendMessage(message) {
  try {
    return await chrome.tabs.sendMessage(activeTab.id, message);
  } catch {
    throw new Error("Muat semula halaman ini, kemudian tekan ikon extension sekali lagi.");
  }
}

async function findTabByPrefix(prefix) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.find((tab) => String(tab.url || "").startsWith(prefix)) || null;
}

async function resolveContextTab() {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = String(current?.url || "");
  if (currentUrl.startsWith("https://fikreyxcode.github.io/sistemkehadiranskrg/") ||
      currentUrl.startsWith("https://idme.moe.gov.my/") ||
      currentUrl.startsWith(IDME_APP_PREFIX)) return current;

  return await findTabByPrefix("https://fikreyxcode.github.io/sistemkehadiranskrg/") ||
    await findTabByPrefix(IDME_APP_PREFIX) ||
    await findTabByPrefix("https://idme.moe.gov.my/") || current;
}

async function readSavedRecord() {
  const data = await chrome.storage.local.get(["attendanceRecord", "attendanceSavedAt"]);
  if (!data.attendanceRecord || !data.attendanceSavedAt || Date.now() - data.attendanceSavedAt > MAX_RECORD_AGE) {
    await chrome.storage.local.remove(["attendanceRecord", "attendanceSavedAt"]);
    return null;
  }
  return data.attendanceRecord;
}

async function saveRecord(record) {
  savedRecord = record;
  await chrome.storage.local.set({ attendanceRecord: record, attendanceSavedAt: Date.now() });
  $("#recordPreview").innerHTML = previewMarkup(record);
  $("#recordPreview").hidden = false;
  $("#classPickerWrap").hidden = true;
  $("#useSelectedClass").hidden = true;
  $("#openIdme").hidden = false;
  setState(`Data ${record.className} sudah sedia. Tekan \"Buka idMe\".`, "ok");
}

function chosenPickerRecord() {
  return extractedRecords.find((record) => record.classId === $("#classPicker").value) || null;
}

async function takeMyClass() {
  setState("Sedang mengambil data kelas cikgu…");
  const response = await sendMessage({ type: "HEM_EXTRACT_ATTENDANCE" });
  extractedRecords = (response?.records || []).filter((record) => record.complete);
  if (!extractedRecords.length) {
    setState("Belum ada kelas berstatus Selesai pada tarikh ini.", "error");
    return;
  }

  const activeName = normalizeName(response?.activeTeacherName);
  const teacherMatches = activeName
    ? extractedRecords.filter((record) => normalizeName(record.teacherName) === activeName)
    : [];

  if (teacherMatches.length === 1) {
    await saveRecord(teacherMatches[0]);
    return;
  }
  if (extractedRecords.length === 1) {
    await saveRecord(extractedRecords[0]);
    return;
  }

  const picker = $("#classPicker");
  picker.innerHTML = extractedRecords.map((record) => `<option value="${escapeHtml(record.classId)}">${escapeHtml(record.className)} — ${escapeHtml(record.teacherName)}</option>`).join("");
  $("#classPickerWrap").hidden = false;
  $("#useSelectedClass").hidden = false;
  setState("Pilih kelas cikgu daripada senarai ini.");
}

async function fillIdme() {
  if (!savedRecord) {
    setState("Ambil data kelas daripada SmartTrack dahulu.", "error");
    return;
  }
  setState("Sedang mengisi maklumat kehadiran…");
  const analysis = await sendMessage({ type: "HEM_IDME_ANALYZE" });
  const matchCount = Object.keys(analysis?.matches || {}).length;
  if (!matchCount && analysis?.mode !== "moeispel") {
    setState("Buka halaman kehadiran kelas dalam idMe dahulu, kemudian cuba lagi.", "error");
    return;
  }
  const response = await sendMessage({ type: "HEM_IDME_FILL", record: savedRecord });
  if (response?.error) {
    setState(response.error, "error");
    return;
  }
  const count = response?.filled?.length || 0;
  setState(count
    ? `${count} rekod murid sudah disediakan. Sebab lalai Masalah Kesihatan → Demam telah diisi bagi ruangan kosong; guru masih boleh mengubahnya.`
    : "Ruangan kehadiran tidak dapat dikenal pasti. Jangan hantar borang.", count ? "ok" : "error");
}

async function init() {
  activeTab = await resolveContextTab();
  savedRecord = await readSavedRecord();
  const url = activeTab?.url || "";
  const isSmarttrack = url.startsWith("https://fikreyxcode.github.io/sistemkehadiranskrg/");
  const isIdme = url.startsWith("https://idme.moe.gov.my/") || url.startsWith(IDME_APP_PREFIX);
  $("#smarttrackPanel").hidden = !isSmarttrack;
  $("#idmePanel").hidden = !isIdme;
  $("#otherPanel").hidden = isSmarttrack || isIdme;
  if (isSmarttrack) setState("Langkah 1: ambil data kelas cikgu.", "ok");
  else if (isIdme) setState(savedRecord ? "Langkah 2: buka kehadiran kelas, kemudian isi." : "Belum ada data. Mulakan di SmartTrack.", savedRecord ? "ok" : "error");
  else setState("Buka SmartTrack untuk bermula.");
  $("#savedPreview").innerHTML = previewMarkup(savedRecord);
  $("#fillIdme").disabled = !savedRecord;
}

$("#takeMyClass").addEventListener("click", () => takeMyClass().catch((error) => setState(error.message, "error")));
$("#useSelectedClass").addEventListener("click", () => {
  const record = chosenPickerRecord();
  if (record) saveRecord(record).catch((error) => setState(error.message, "error"));
});
$("#openIdme").addEventListener("click", () => chrome.tabs.create({ url: IDME_URL }));
$("#openSmarttrack").addEventListener("click", () => chrome.tabs.create({ url: SMARTTRACK_URL }));
$("#fillIdme").addEventListener("click", () => fillIdme().catch((error) => setState(error.message, "error")));
$("#clearRecord").addEventListener("click", async () => {
  await chrome.storage.local.remove(["attendanceRecord", "attendanceSavedAt"]);
  savedRecord = null;
  $("#savedPreview").innerHTML = previewMarkup(null);
  $("#fillIdme").disabled = true;
  setState("Data sementara sudah dikosongkan.", "ok");
});

init().catch((error) => setState(error.message, "error"));
