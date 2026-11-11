const assert = require("node:assert/strict");
require("../matcher.js");
const matcher = globalThis.HEMMatcher;

const fields = [
  { descriptor: "Tarikh Kehadiran", tag: "input", type: "date", visible: true },
  { descriptor: "Pilih Kelas", tag: "select", type: "select-one", visible: true },
  { descriptor: "Bilangan murid hadir lelaki", tag: "input", type: "number", visible: true },
  { descriptor: "Bilangan murid hadir perempuan", tag: "input", type: "number", visible: true },
  { descriptor: "Jumlah murid tidak hadir", tag: "input", type: "number", visible: true },
  { descriptor: "Senarai nama murid tidak hadir", tag: "textarea", type: "textarea", visible: true },
  { descriptor: "Kata laluan", tag: "input", type: "password", visible: true }
];

const matches = matcher.matchFields(fields);
assert.equal(matches.date.index, 0);
assert.equal(matches.className.index, 1);
assert.equal(matches.presentMale.index, 2);
assert.equal(matches.presentFemale.index, 3);
assert.equal(matches.absentTotal.index, 4);
assert.equal(matches.absentNames.index, 5);
assert.equal(Object.values(matches).some((item) => item.index === 6), false);
assert.equal(matcher.valueFor({ absentTotal: 0 }, "absentTotal"), "0");

console.log("matcher tests passed");
