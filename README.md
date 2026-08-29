# BenchmarkSCA-npm

> **Warning:** this repository intentionally pins vulnerable and malicious package examples for
> scanner evaluation. Do not install or execute its dependencies.

An npm SCA accuracy corpus for Vybscan. `ground-truth.json` is the independent oracle: `cve`,
`malware`, and `typosquat` entries must be reported; `clean` entries must not be reported.

This is a public starter corpus. `loadyaml@1.0.0` has been withdrawn from the npm registry, so a
canonical package lock can no longer be regenerated safely; this case deliberately verifies
lockless resolution instead. Expected transitive findings are recorded in `ground-truth.json`. A
benchmark result must record this commit, the OSV verification date, the scanner digest, and
TP/FP/FN/TN plus precision, recall, and F1.
