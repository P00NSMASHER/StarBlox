import { readFile, writeFile } from "node:fs/promises";

const [inputPath = "pipsquest/question-source.json", outputPath = "pipsquest/src/shared/QuestionBank.lua"] = process.argv.slice(2);

const source = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(source.questions) || source.questions.length === 0) {
  throw new Error("certified question source is empty");
}

function luaString(value) {
  return '"' + String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t") + '"';
}

function toLua(value, indent = 0) {
  const pad = "  ".repeat(indent);
  const next = "  ".repeat(indent + 1);
  if (value === null || value === undefined) return "nil";
  if (typeof value === "string") return luaString(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "{}";
    return "{\n" + value.map(v => next + toLua(v, indent + 1) + ",").join("\n") + "\n" + pad + "}";
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([,v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    return "{\n" + entries.map(([k,v]) => next + "[" + luaString(k) + "] = " + toLua(v, indent + 1) + ",").join("\n") + "\n" + pad + "}";
  }
  throw new Error("unsupported value type: " + typeof value);
}

const questions = source.questions.map((q, index) => {
  if (!Array.isArray(q.choices) || q.choices.length !== 3) {
    throw new Error("question " + (q.id || index) + " must have exactly 3 choices");
  }
  const correctIndex = q.choices.indexOf(q.answer) + 1;
  if (correctIndex < 1) {
    throw new Error("question " + (q.id || index) + " answer is not present in choices");
  }
  return {
    ...q,
    options: q.choices,
    correctIndex,
    choices: undefined,
    answer: undefined,
  };
});

const material = questions.filter(q => q.tier === "material").length;
const fallback = questions.filter(q => q.tier === "star-fallback").length;
if (questions.length !== 156 || material !== 36 || fallback !== 120) {
  throw new Error(`unexpected certified bank shape: total=${questions.length} material=${material} fallback=${fallback}`);
}

const header = [
  "-- AUTO-GENERATED from the certified StarBlox Grade 2 source.",
  "-- Snapshot: " + String(source.generatedFrom?.bankSnapshotId || "unknown"),
  "-- Do not hand-edit individual questions.",
  "",
  "return "
].join("\n");

await writeFile(outputPath, header + toLua(questions) + "\n", "utf8");
console.log(`PIPS_QUESTION_BANK_GENERATED total=${questions.length} material=${material} fallback=${fallback}`);
