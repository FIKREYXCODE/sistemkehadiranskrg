(function matcherModule(root, factory) {
  const api = factory();
  root.HEMMatcher = api;
  if (typeof module === "object" && module.exports) module.exports = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildMatcher() {
  "use strict";

  const FIELD_RULES = [
    { key: "date", patterns: [/\btarikh\b/i, /\bdate\b/i], types: ["date", "text"] },
    { key: "className", patterns: [/\bkelas\b/i, /\bclass\b/i], tags: ["select", "input"] },
    { key: "enrolTotal", patterns: [/dalam\s*daftar/i, /jumlah\s*(murid|enrol)/i, /enrol/i], types: ["number", "text"], reject: [/\bhadir\b|absen/i] },
    { key: "presentMale", patterns: [/hadir.*(lelaki|\bl\b)/i, /(lelaki|\bl\b).*hadir/i], reject: [/tidak|absen/i] },
    { key: "presentFemale", patterns: [/hadir.*(perempuan|\bp\b)/i, /(perempuan|\bp\b).*hadir/i], reject: [/tidak|absen/i] },
    { key: "presentTotal", patterns: [/jumlah.*hadir/i, /hadir.*jumlah/i, /bilangan.*hadir/i], reject: [/tidak|absen|lelaki|perempuan/i] },
    { key: "absentMale", patterns: [/(tidak\s*hadir|absen).*lelaki/i, /lelaki.*(tidak\s*hadir|absen)/i] },
    { key: "absentFemale", patterns: [/(tidak\s*hadir|absen).*perempuan/i, /perempuan.*(tidak\s*hadir|absen)/i] },
    { key: "absentTotal", patterns: [/jumlah.*(tidak\s*hadir|absen)/i, /(tidak\s*hadir|absen).*jumlah/i, /bilangan.*(tidak\s*hadir|absen)/i], reject: [/lelaki|perempuan/i] },
    { key: "attendancePercent", patterns: [/peratus.*hadir/i, /%\s*hadir/i, /attendance.*percent/i], reject: [/tidak/i] },
    { key: "absentNames", patterns: [/senarai.*(tidak\s*hadir|absen)/i, /nama.*(tidak\s*hadir|absen)/i, /murid.*(tidak\s*hadir|absen)/i, /catatan.*kehadiran/i] }
  ];

  function normalize(value) {
    return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function scoreRule(field, rule) {
    const descriptor = normalize(field.descriptor);
    if (!descriptor) return 0;
    if (rule.tags && !rule.tags.includes(field.tag)) return 0;
    if (rule.types && !rule.types.includes(field.type || "text")) return 0;
    if (rule.reject && rule.reject.some((pattern) => pattern.test(descriptor))) return 0;
    let score = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(descriptor)) score += 10;
    }
    if (field.visible === false || field.disabled || field.readOnly) score -= 20;
    return Math.max(0, score);
  }

  function matchFields(fields) {
    const used = new Set();
    const matches = {};
    for (const rule of FIELD_RULES) {
      const ranked = fields
        .map((field, index) => ({ field, index, score: scoreRule(field, rule) }))
        .filter((item) => item.score > 0 && !used.has(item.index))
        .sort((a, b) => b.score - a.score || a.index - b.index);
      if (!ranked.length) continue;
      matches[rule.key] = ranked[0];
      used.add(ranked[0].index);
    }
    return matches;
  }

  function valueFor(record, key) {
    if (!record) return "";
    const value = record[key];
    return value === 0 ? "0" : String(value ?? "");
  }

  function normalizePersonName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9@]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function compactPersonName(value) {
    return normalizePersonName(value).replace(/\s+/g, "");
  }

  function editDistance(left, right) {
    const a = String(left || "");
    const b = String(right || "");
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let diagonal = previous[0];
      previous[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const above = previous[j];
        previous[j] = Math.min(
          previous[j] + 1,
          previous[j - 1] + 1,
          diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        diagonal = above;
      }
    }
    return previous[b.length];
  }

  function tokenMatches(aliasToken, candidateToken) {
    if (aliasToken === candidateToken) return true;
    if (aliasToken.length >= 4 && (candidateToken.startsWith(aliasToken) || aliasToken.startsWith(candidateToken))) return true;
    const tolerance = aliasToken.length >= 9 ? 2 : aliasToken.length >= 5 ? 1 : 0;
    return tolerance > 0 && editDistance(aliasToken, candidateToken) <= tolerance;
  }

  function personNameMatches(alias, fullName) {
    const normalizedAlias = normalizePersonName(alias);
    const normalizedFullName = normalizePersonName(fullName);
    if (!normalizedAlias || !normalizedFullName) return false;

    const compactAlias = compactPersonName(normalizedAlias);
    const compactFullName = compactPersonName(normalizedFullName);
    if (compactAlias.length >= 4 && compactFullName.includes(compactAlias)) return true;

    const aliasTokens = normalizedAlias.split(" ").filter((token) => token.length >= 3);
    const fullNameTokens = normalizedFullName.split(" ").filter((token) => token.length >= 2);
    if (!aliasTokens.length) return false;
    return aliasTokens.every((aliasToken) => fullNameTokens.some((candidateToken) => tokenMatches(aliasToken, candidateToken)));
  }

  function findUniquePerson(candidates, alias, nameKey = "name") {
    const matches = candidates.filter((candidate) => personNameMatches(alias, candidate?.[nameKey]));
    return { match: matches.length === 1 ? matches[0] : null, count: matches.length };
  }

  return {
    FIELD_RULES,
    normalize,
    scoreRule,
    matchFields,
    valueFor,
    normalizePersonName,
    compactPersonName,
    editDistance,
    personNameMatches,
    findUniquePerson
  };
}));
