(function smartTrackBridge() {
  "use strict";

  function numberFromCell(row, label) {
    const cell = row.querySelector(`[data-label="${label}"]`);
    if (!cell) return 0;
    const input = cell.querySelector("input");
    const value = input ? input.value : cell.textContent;
    const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function textFromCell(row, selector) {
    const cell = row.querySelector(selector);
    if (!cell) return "";
    const input = cell.querySelector("input,textarea,select");
    return String(input ? input.value : cell.textContent || "").trim();
  }

  function extractRows() {
    const reportDate = document.querySelector("#reportDate")?.value || "";
    const rows = [...document.querySelectorAll("#attendanceBody tr[data-class-id]")];
    return rows.map((row) => {
      const enrolMale = numberFromCell(row, "Daftar L");
      const enrolFemale = numberFromCell(row, "Daftar P");
      const presentMale = numberFromCell(row, "Hadir L");
      const presentFemale = numberFromCell(row, "Hadir P");
      const absentMale = numberFromCell(row, "Tidak hadir L");
      const absentFemale = numberFromCell(row, "Tidak hadir P");
      const className = textFromCell(row, ".attendance-class");
      const teacherName = textFromCell(row, ".attendance-teacher")
        .replace(/\s*[✓✔☑✅]?\s*(Selesai|Belum selesai|Sedang disimpan).*$/i, "")
        .trim();
      const absentNames = textFromCell(row, ".attendance-note");
      const complete = row.classList.contains("class-complete") && !row.classList.contains("class-error");
      return {
        source: "HEM SmartTrack E-JKM",
        sourceUrl: location.href,
        classId: row.dataset.classId || "",
        date: reportDate,
        className,
        teacherName,
        enrolMale,
        enrolFemale,
        enrolTotal: enrolMale + enrolFemale,
        presentMale,
        presentFemale,
        presentTotal: presentMale + presentFemale,
        absentMale,
        absentFemale,
        absentTotal: absentMale + absentFemale,
        attendancePercent: enrolMale + enrolFemale ? (((presentMale + presentFemale) / (enrolMale + enrolFemale)) * 100).toFixed(2) : "0.00",
        absentNames: absentMale + absentFemale === 0 ? "Semua murid hadir" : absentNames,
        complete
      };
    }).filter((row) => row.className);
  }

  function activeTeacherName() {
    return String(document.querySelector("#editorName")?.value || "").trim();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "HEM_EXTRACT_ATTENDANCE") return false;
    const records = extractRows();
    sendResponse({ ok: true, records, date: document.querySelector("#reportDate")?.value || "", activeTeacherName: activeTeacherName() });
    return false;
  });
}());
