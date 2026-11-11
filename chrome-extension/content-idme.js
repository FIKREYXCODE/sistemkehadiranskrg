(function idMeBridge() {
  "use strict";

  const DATA_KEYS = ["date", "className", "enrolTotal", "presentMale", "presentFemale", "presentTotal", "absentMale", "absentFemale", "absentTotal", "attendancePercent", "absentNames"];

  function isVisible(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function labelText(element) {
    const direct = element.labels ? [...element.labels].map((label) => label.textContent).join(" ") : "";
    const ariaLabelledBy = String(element.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent || "")
      .join(" ");
    const nearby = element.closest("label,.form-group,.field,.input-group,.mb-3,.row")?.textContent || "";
    return [direct, ariaLabelledBy, element.getAttribute("aria-label"), element.placeholder, element.name, element.id, nearby]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
  }

  function collectFields() {
    return [...document.querySelectorAll("input:not([type=hidden]),select,textarea")].map((element, index) => ({
      index,
      element,
      descriptor: labelText(element),
      tag: element.tagName.toLowerCase(),
      type: String(element.type || "text").toLowerCase(),
      visible: isVisible(element),
      disabled: Boolean(element.disabled),
      readOnly: Boolean(element.readOnly)
    })).filter((field) => field.visible && !field.disabled && !field.readOnly);
  }

  function publicMatches(matches) {
    return Object.fromEntries(Object.entries(matches).map(([key, match]) => [key, {
      key,
      descriptor: match.field.descriptor.slice(0, 140),
      tag: match.field.tag,
      type: match.field.type
    }]));
  }

  function setNativeValue(element, value) {
    if (element.tagName === "SELECT") {
      const normalized = HEMMatcher.normalize(value).toLowerCase();
      const option = [...element.options].find((item) => {
        const optionText = HEMMatcher.normalize(`${item.value} ${item.textContent}`).toLowerCase();
        return optionText === normalized || optionText.includes(normalized) || normalized.includes(optionText);
      });
      if (!option) return false;
      element.value = option.value;
    } else {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(element, value);
      else element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.classList.add("hem-idme-filled");
    return true;
  }

  function analyze() {
    const fields = collectFields();
    const matches = HEMMatcher.matchFields(fields);
    return { fields, matches };
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9@]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function normalizeClassName(value) {
    const numberWords = { SATU: "1", DUA: "2", TIGA: "3", EMPAT: "4", LIMA: "5", ENAM: "6" };
    return normalizeText(value)
      .replace(/\bTAHUN\b/g, "")
      .replace(/\b(SATU|DUA|TIGA|EMPAT|LIMA|ENAM)\b/g, (word) => numberWords[word])
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeDate(value) {
    const text = String(value || "").trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const local = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (local) return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
    return text;
  }

  function collectMoeisStudents() {
    return [...document.querySelectorAll("#kehadiran tr")].map((row) => {
      const checkbox = row.querySelector('input[type="checkbox"][id^="case-hadir-"]');
      if (!checkbox) return null;
      const cells = row.querySelectorAll("td");
      const name = String(cells[2]?.textContent || "").trim();
      return { row, checkbox, name, normalizedName: normalizeText(name) };
    }).filter(Boolean);
  }

  function analyzeMoeis() {
    const students = collectMoeisStudents();
    if (!students.length) return null;
    return {
      mode: "moeispel",
      studentCount: students.length,
      className: String(document.querySelector("#select2-txtNamakelas-container")?.textContent || "").trim(),
      date: String(document.querySelector("#tkh_HH")?.value || "").trim()
    };
  }

  function absentAliases(record) {
    if (Number(record.absentTotal || 0) === 0) return [];
    return String(record.absentNames || "")
      .split(/[,;\n]+/)
      .map(normalizeText)
      .filter((name) => name && name !== "SEMUA MURID HADIR");
  }

  function fillMoeis(record) {
    const analysis = analyzeMoeis();
    if (!analysis) return { ok: false, error: "Buka senarai Kehadiran Harian kelas dahulu." };

    const recordDate = normalizeDate(record.date);
    const pageDate = normalizeDate(analysis.date);
    if (recordDate && pageDate && recordDate !== pageDate) {
      return { ok: false, error: `Tarikh tidak sama: SmartTrack ${recordDate}, idMe ${pageDate}.` };
    }

    const recordClass = normalizeClassName(record.className);
    const pageClass = normalizeClassName(analysis.className);
    if (recordClass && pageClass && recordClass !== pageClass) {
      return { ok: false, error: `Kelas tidak sama: SmartTrack ${record.className}, idMe ${analysis.className}.` };
    }

    const students = collectMoeisStudents();
    if (Number(record.enrolTotal || 0) && students.length !== Number(record.enrolTotal)) {
      return { ok: false, error: `Bilangan murid tidak sama: SmartTrack ${record.enrolTotal}, idMe ${students.length}.` };
    }

    const aliases = absentAliases(record);
    const absentStudents = new Set();
    const unresolved = [];
    for (const alias of aliases) {
      const candidates = students.filter((student) => student.normalizedName.includes(alias));
      if (candidates.length === 1) absentStudents.add(candidates[0]);
      else unresolved.push(alias);
    }

    const expectedAbsent = Number(record.absentTotal || 0);
    if (unresolved.length || absentStudents.size !== expectedAbsent) {
      return {
        ok: false,
        error: `Nama murid tidak hadir belum dapat dipadankan sepenuhnya (${absentStudents.size}/${expectedAbsent}). Semak ejaan nama dalam E-JKM.`
      };
    }

    for (const student of students) {
      const shouldBePresent = !absentStudents.has(student);
      if (student.checkbox.checked !== shouldBePresent) student.checkbox.click();
      student.checkbox.classList.add("hem-idme-filled");
    }

    return {
      ok: true,
      mode: "moeispel",
      filled: students.map(() => "student"),
      matchedAbsent: [...absentStudents].map((student) => student.name),
      submitted: false
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "HEM_IDME_ANALYZE") {
      const moeis = analyzeMoeis();
      if (moeis) {
        sendResponse({ ok: true, page: location.href, matches: {}, ...moeis });
        return false;
      }
      const { fields, matches } = analyze();
      sendResponse({ ok: true, page: location.href, fieldCount: fields.length, matches: publicMatches(matches) });
      return false;
    }
    if (message?.type === "HEM_IDME_FILL") {
      const record = message.record || {};
      if (analyzeMoeis()) {
        sendResponse(fillMoeis(record));
        return false;
      }
      const { matches } = analyze();
      const filled = [];
      const skipped = [];
      for (const key of DATA_KEYS) {
        const match = matches[key];
        const value = HEMMatcher.valueFor(record, key);
        if (!match || value === "") {
          skipped.push(key);
          continue;
        }
        if (setNativeValue(match.field.element, value)) filled.push(key);
        else skipped.push(key);
      }
      sendResponse({ ok: true, filled, skipped, matches: publicMatches(matches) });
      return false;
    }
    return false;
  });
}());
