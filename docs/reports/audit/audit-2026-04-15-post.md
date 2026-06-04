<!--
SPDX-License-Identifier: MPL-2.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Post-audit Status Report: dotmatrix-fileprinter
- **Date:** 2026-04-15
- **Status:** Complete (M5 Sweep)
- **Repo:** /var/mnt/eclipse/repos/dotmatrix-fileprinter

## Actions Taken
1. Standard CI/Workflow Sweep: Added blocker workflows (`ts-blocker.yml`, `npm-bun-blocker.yml`) and updated `Justfile`.
2. SCM-to-A2ML Migration: Staged and committed deletions of legacy `.scm` files.
3. Lockfile Sweep: Generated and tracked missing lockfiles where manifests were present.
4. Static Analysis: Verified with `panic-attack assail`.

## Findings Summary
- 3 unsafe get calls in src/proven/Proven_SafeHex.res
- 1 unsafe get calls in src/proven/Proven_SafeString.res
- DOM manipulation (innerHTML/document.write) in src/main.js
- 1 unsafe get calls in lib/ocaml/Proven_SafeString.res
- 3 unsafe get calls in lib/ocaml/Proven_SafeHex.res
- 14 TODO/FIXME/HACK markers in contractiles/self-validating/template-hunt.k9.ncl
- flake.nix declares inputs without narHash, rev pinning, or sibling flake.lock — dependency revision is unpinned in flake.nix
- 1 import map entry/ies in deno.json without a version pin — specifiers are not reproducibly resolved
- Rust project has test infrastructure but no mutation-test configuration (cargo-mutants/.cargo-mutants.toml) — add `cargo mutants` to verify test suite kills mutations

## Final Grade
- **CRG Grade:** D (Promoted from E/X) - CI and lockfiles are in place.
