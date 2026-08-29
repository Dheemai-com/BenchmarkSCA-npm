# BenchmarkSCA-npm

> **Warning:** this repository intentionally pins vulnerable and malicious package examples for
> scanner evaluation. Do not install or execute its dependencies.

An npm SCA accuracy corpus for Vybscan. `ground-truth.json` is the independent oracle: `cve`,
`malware`, and `typosquat` entries must be reported; `clean` entries must not be reported.

This repository remains internal until every label has been reverified and a lockfile-based
transitive corpus is added. A benchmark result must record this commit, the OSV verification date,
the scanner digest, and TP/FP/FN/TN plus precision, recall, and F1.
