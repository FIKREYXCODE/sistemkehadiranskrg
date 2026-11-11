"use strict";

const SMARTTRACK_URL = "https://fikreyxcode.github.io/sistemkehadiranskrg/?v=177&fresh=1#e-jkm";
const IDME_URL = "https://idme.moe.gov.my/login";
const MAX_RECORD_AGE = 24 * 60 * 60 * 1000;
const FIELD_LABELS = {
  date: "Tarikh", className: "Kelas", enrolTotal: "Dalam daftar", presentMale: "Hadir lelaki",
  presentFemale: "Hadir perempuan", presentTotal: "Jumlah hadir", absentMale: "Tidak hadir lelaki",
  absentFemale: "Tidak hadir perempuan", absentTotal: "Jumlah tidak hadir", attendancePercent: "Peratus hadir",
  absentNames: "Senarai tidak hadir"
};

let activeTab;
let extractedRecords = [];
let selectedRecord = null;
let savedRecord = null;

const $ = (selector) => document.querySelector(selector);

function setState(message, kind = "") {
  const target = $("#pageState");
  target.textContent = message;
  target.className = `state ${kind}`.trim();
}

function previewMarkup(record) {
  if (!record) return "<span>Belum ada rekod disimpan.</span>";
  return `<strong>${escapeHtml(record.className)} · ${escapeHtml(record.date)}</strong>
    <span>${escapeHtml(record.teacherName || "Guru kelas")}</span><br>
    <span>Hadir ${record.presentTotal}/${record.enrolTotal} (${record.attendancePercent}%) · Tidak hadir ${record.absentTotal}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[char]));
}

async function sendMessage(message) {
  try {
    return await chrome.tabs.sendMessage(activeTab.id, message);
  } catch (error) {
    throw new Error("Extension belum dapat membaca halaman ini. Muat semula halaman dan cuba lagi.");
  }
}

async function readSavedRecord() {
  const data = await chrome.storage.local.get(["attendanceRecord", "attendanceSavedAt"]);
  if (!data.attendanceRecord || !data.attendanceSavedAt || Date.now() - data.attendanceSavedAt > MAX_RECORD_AGE) {
    await chrome.storage.local.remove(["attendanceRecord", "attendanceSavedAt"]);
    return null;
  }
  return data.attendanceRecord;
}

function chooseRecord() {
  selectedRecord = extractedRecords.find((record) => record.classId === $("#classPicker").value) || null;
  $("#recordPreview").innerHTML = previewMarkup(selectedRecord);
  $("#recordPreview").hidden = !selectedRecord;
  $("#saveRecord").hidden = !selectedRecord;
}

async function scanSmarttrack() {
  setState("Membaca rekod E-JKM…");
  const response = await sendMessage({ type: "HEM_EXTRACT_ATTENDANCE" });
  extractedRecords = (response?.records || []).filter((record) => record.complete);
  if (!extractedRecords.length) {
    setState("Tiada kelas hijau yang disahkan pelayan pada paparan ini.", "error");
    return;
  }
  const picker = $("#classPicker");
  picker.innerHTML = extractedRecords.map((record) => `<option value="${escapeHtml(record.classId)}">${escapeHtml(record.className)} — ${escapeHtml(record.teacherName)}</option>`).join("");
  $("#classPickerWrap").hidden = false;
  setState(`${extractedRecords.length} kelas disahkan ditemui.`, "ok");
  chooseRecord();
}

async function saveSelectedRecord() {
  if (!selectedRecord?.complete) return;
  await chrome.storage.local.set({ attendanceRecord: selectedRecord, attendanceSavedAt: Date.now() });
  savedRecord = selectedRecord;
  setState(`${selectedRecord.className} disimpan sementara untuk idMe.`, "ok");
}

async function analyzeIdme() {
  if (!savedRecord) {
    setState("Ambil dan simpan rekod E-JKM dahulu.", "error");
    return;
  }
  setState("Mencari medan kehadiran pada halaman idMe…");
  const response = await sendMessage({ type: "HEM_IDME_ANALYZE" });
  const entries = Object.entries(response?.matches || {});
  const target = $("#matchResult");
  target.innerHTML = entries.length
    ? entries.map(([key, match]) => `<span><b>${escapeHtml(FIELD_LABELS[key] || key)}</b><em>${escapeHtml(match.descriptor)}</em></span>`).join("")
    : "Tiada medan kehadiran yang dapat dikenal pasti pada halaman ini.";
  target.hidden = false;
  $("#fillIdme").disabled = entries.length === 0;
  setState(entries.length ? `${entries.length} medan dijumpai. Semak senarai sebelum mengisi.` : "Buka borang kehadiran dalam idMe dahulu.", entries.length ? "ok" : "error");
}

async function fillIdme() {
  if (!savedRecord) return;
  const response = await sendMessage({ type: "HEM_IDME_FILL", record: savedRecord });
  const count = response?.filled?.length || 0;
  setState(count ? `${count} medan diisi dan ditandakan hijau. Sila semak sebelum hantar.` : "Tiada medan dapat diisi. Jangan hantar borang.", count ? "ok" : "error");
}

async function init() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  savedRecord = await readSavedRecord();
  const url = activeTab?.url || "";
  const isSmarttrack = url.startsWith("https://fikreyxcode.github.io/sistemkehadiranskrg/");
  const isIdme = url.startsWith("https://idme.moe.gov.my/");
  $("#smarttrackPanel").hidden = !isSmarttrack;
  $("#idmePanel").hidden = !isIdme;
  $("#otherPanel").hidden = isSmarttrack || isIdme;
  if (isSmarttrack) setState("Halaman E-JKM dikesan.", "ok");
  else if (isIdme) setState("Halaman idMe dikesan.", "ok");
  else setState("Buka E-JKM atau idMe untuk menggunakan extension.");
  $("#savedPreview").innerHTML = previewMarkup(savedRecord);
}

$("#scanSmarttrack").addEventListener("click", () => scanSmarttrack().catch((error) => setState(error.message, "error")));
$("#classPicker").addEventListener("change", chooseRecord);
$("#saveRecord").addEventListener("click", () => saveSelectedRecord().catch((error) => setState(error.message, "error")));
$("#openIdme").addEventListener("click", () => chrome.tabs.create({ url: IDME_URL }));
$("#openSmarttrack").addEventListener("click", () => chrome.tabs.create({ url: SMARTTRACK_URL }));
$("#analyzeIdme").addEventListener("click", () => analyzeIdme().catch((error) => setState(error.message, "error")));
$("#fillIdme").addEventListener("click", () => fillIdme().catch((error) => setState(error.message, "error")));
$("#clearRecord").addEventListener("click", async () => {
  await chrome.storage.local.remove(["attendanceRecord", "attendanceSavedAt"]);
  savedRecord = null;
  selectedRecord = null;
  $("#savedPreview").innerHTML = previewMarkup(null);
  setState("Rekod sementara dipadam.", "ok");
});

init().catch((error) => setState(error.message, "error"));
