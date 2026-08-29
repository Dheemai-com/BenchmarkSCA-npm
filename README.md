# BenchmarkSCA-npm

> **Warning:** this repository intentionally pins vulnerable and malicious packages for scanner
> evaluation. Do not install or execute its dependencies.

A public, reproducible npm SCA accuracy corpus. Every package resolved by the manifests and
lockfile is labelled in `ground-truth.json`; there are no unlabelled packages hidden from the
precision or recall denominators.

## Current scorecard

| Packages | Expected findings | Expected clean | Precision | Recall | F1 | Coverage |
|---:|---:|---:|---:|---:|---:|---:|
| 7 | 5 | 2 | 100.00% | 100.00% | 100.00% | 100.00% |

The score is pinned to staging scan commit `fe1a505` and analyzer `3db6559658cd`.

## Coverage and reproducibility

- Direct vulnerable, malicious, and clean precision-control packages.
- A canonical `package-lock.json` transitive case.
- A withdrawn malware package that is deliberately tested from the root manifest without
  fabricating a registry lock entry.
- Every exact label is rechecked against OSV in CI.
- CI fails on a false positive, false negative, unscanned oracle case, unlabelled scanned package,
  stale advisory, or score below 100%.

Run locally:

```bash
node scripts/verify-oracle.mjs
node scripts/score.mjs
```

The score applies to this version-pinned corpus; it is not an ecosystem-wide prevalence claim.
