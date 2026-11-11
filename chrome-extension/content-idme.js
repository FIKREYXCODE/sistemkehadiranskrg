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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "HEM_IDME_ANALYZE") {
      const { fields, matches } = analyze();
      sendResponse({ ok: true, page: location.href, fieldCount: fields.length, matches: publicMatches(matches) });
      return false;
    }
    if (message?.type === "HEM_IDME_FILL") {
      const record = message.record || {};
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
