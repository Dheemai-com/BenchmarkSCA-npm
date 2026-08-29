import { readFileSync } from "node:fs";

const truth = JSON.parse(readFileSync(process.argv[2] || "ground-truth.json", "utf8"));
const ecosystem = truth.ecosystem;
const queries = truth.packages.map((item) => ({
  package: { name: item.name, ecosystem },
  version: item.version,
}));
const response = await fetch("https://api.osv.dev/v1/querybatch", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ queries }),
});
if (!response.ok) throw new Error(`OSV querybatch returned ${response.status}`);
const body = await response.json();
const failures = [];
truth.packages.forEach((item, index) => {
  const active = (body.results?.[index]?.vulns || []).filter((entry) => !entry.withdrawn);
  if (item.expected === "finding" && active.length === 0) {
    failures.push(`${item.name}@${item.version}: expected finding but OSV returned none`);
  }
  if (item.expected === "clean" && active.length > 0) {
    failures.push(`${item.name}@${item.version}: expected clean but OSV returned ${active.map((entry) => entry.id).join(", ")}`);
  }
  if (item.expected === "finding" && item.references?.length) {
    const ids = new Set(active.flatMap((entry) => [entry.id, ...(entry.aliases || [])]));
    if (!item.references.some((reference) => ids.has(reference))) {
      failures.push(`${item.name}@${item.version}: none of the pinned references remain active`);
    }
  }
});
if (failures.length) {
  console.error(`Oracle verification failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`OSV independently confirmed ${truth.packages.length}/${truth.packages.length} exact labels for ${truth.benchmarkId}.`);

