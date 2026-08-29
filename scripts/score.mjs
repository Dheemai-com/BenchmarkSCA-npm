import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const truthPath = value("--truth", "ground-truth.json");
const resultsPath = value("--results", "results/staging-latest.json");
const jsonPath = value("--out", "scorecard.json");
const markdownPath = value("--markdown", "scorecard.md");

const truth = JSON.parse(readFileSync(truthPath, "utf8"));
const results = JSON.parse(readFileSync(resultsPath, "utf8"));
const normalizeName = (name) => truth.ecosystem === "PyPI"
  ? name.toLowerCase().replaceAll("_", "-")
  : truth.ecosystem === "npm" ? name.toLowerCase() : name;
const key = (item) => `${normalizeName(item.name)}@${item.version}`;
const oracle = new Map(truth.packages.map((item) => [key(item), item]));
const detected = new Set(results.findings.map(key));
const scanned = new Set(results.scannedPackages.map(key));

const score = (cases, extraFalsePositives = 0) => {
  let tp = 0, fp = extraFalsePositives, fn = 0, tn = 0;
  for (const item of cases) {
    const hit = detected.has(key(item));
    if (item.expected === "finding") hit ? tp++ : fn++;
    else hit ? fp++ : tn++;
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);
  const accuracy = tp + fp + fn + tn === 0 ? 1 : (tp + tn) / (tp + fp + fn + tn);
  return { total: tp + fp + fn + tn, tp, fp, fn, tn, precision, recall, f1, accuracy };
};

const unexpectedFindings = [...detected].filter((item) => !oracle.has(item));
const unscannedOracle = [...oracle.keys()].filter((item) => !scanned.has(item));
const unlabeledScanned = [...scanned].filter((item) => !oracle.has(item));
const overall = score(truth.packages, unexpectedFindings.length);
const relations = Object.fromEntries(
  ["direct", "transitive"].map((relation) => [
    relation,
    score(truth.packages.filter((item) => item.relation === relation)),
  ]),
);
const coverage = oracle.size === 0 ? 1 : (oracle.size - unscannedOracle.length) / oracle.size;
const corpus = {
  packages: truth.packages.length,
  findings: truth.packages.filter((item) => item.expected === "finding").length,
  clean: truth.packages.filter((item) => item.expected === "clean").length,
  direct: truth.packages.filter((item) => item.relation === "direct").length,
  transitive: truth.packages.filter((item) => item.relation === "transitive").length,
};
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  benchmarkId: truth.benchmarkId,
  ecosystem: truth.ecosystem,
  oracleVerifiedAt: truth.verifiedAt,
  scan: results.scan,
  corpus,
  score: overall,
  byRelation: relations,
  coverage,
  unexpectedFindings,
  unscannedOracle,
  unlabeledScanned,
  minimums: truth.minimums,
};
const pct = (number) => `${(number * 100).toFixed(2)}%`;
const markdown = [
  `# ${truth.benchmarkId} scorecard`,
  "",
  `- Corpus: **${truth.packages.length}** fully labelled resolved packages`,
  `- Scan commit: \`${results.scan.commit}\``,
  `- Analyzer: \`${results.scan.analyzerVersion}\``,
  `- Precision: **${pct(overall.precision)}**`,
  `- Recall: **${pct(overall.recall)}**`,
  `- F1: **${pct(overall.f1)}**`,
  `- Accuracy: **${pct(overall.accuracy)}**`,
  `- Coverage: **${pct(coverage)}**`,
  "",
  "| TP | FP | FN | TN |",
  "|---:|---:|---:|---:|",
  `| ${overall.tp} | ${overall.fp} | ${overall.fn} | ${overall.tn} |`,
  "",
  "> Scores apply only to this version-pinned public corpus; they are not ecosystem-wide prevalence claims.",
  "",
].join("\n");

writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(markdownPath, markdown);
console.log(markdown);

const failures = [];
for (const metric of ["precision", "recall", "f1", "accuracy"]) {
  if (overall[metric] < truth.minimums[metric]) {
    failures.push(`${metric} ${pct(overall[metric])} < ${pct(truth.minimums[metric])}`);
  }
}
if (coverage < truth.minimums.coverage) failures.push(`coverage ${pct(coverage)} < ${pct(truth.minimums.coverage)}`);
for (const dimension of ["packages", "findings", "clean", "direct", "transitive"]) {
  if (corpus[dimension] < truth.minimums[dimension]) {
    failures.push(`corpus ${dimension} ${corpus[dimension]} < ${truth.minimums[dimension]}`);
  }
}
if (unexpectedFindings.length) failures.push(`unexpected findings: ${unexpectedFindings.join(", ")}`);
if (unlabeledScanned.length) failures.push(`unlabelled scanned packages: ${unlabeledScanned.join(", ")}`);
if (unscannedOracle.length) failures.push(`oracle packages not scanned: ${unscannedOracle.join(", ")}`);
if (failures.length) {
  console.error(`Benchmark gate failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
