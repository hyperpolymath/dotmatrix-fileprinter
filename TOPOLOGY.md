<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- TOPOLOGY.md — Project architecture map and completion dashboard -->
<!-- Last updated: 2026-02-19 -->

# DotMatrix-FilePrinter — Project Topology

## System Architecture

```
                        ┌─────────────────────────────────────────┐
                        │              USER / CLIENT              │
                        │        (AffineScript TEA UI / CLI)          │
                        └───────────────────┬─────────────────────┘
                                            │
                                            ▼
                        ┌─────────────────────────────────────────┐
                        │           NEURAL LAYER (AFFINESCRIPT)       │
                        │    (TEA Architecture, Intent Routing)   │
                        └──────────┬───────────────────┬──────────┘
                                   │                   │
                                   ▼                   ▼
                        ┌───────────────────────┐  ┌────────────────────────────────┐
                        │ SYMBOLIC LAYER (NCL)  │  │ BRIDGE LAYER (FFI)             │
                        │ - Nickel Contracts    │  │ - Tauri (Rust)                 │
                        │ - Metadata Policy     │  │ - OS-level Integration         │
                        └──────────┬────────────┘  └──────────┬─────────────────────┘
                                   │                          │
                                   └────────────┬─────────────┘
                                                ▼
                        ┌─────────────────────────────────────────┐
                        │           PHYSICAL LAYER (FORTH)        │
                        │    (24-pin Print Head, Gforth Kernel)   │
                        └───────────────────┬─────────────────────┘
                                            │
                                            ▼
                        ┌─────────────────────────────────────────┐
                        │          FILESYSTEM SUBSTRATE           │
                        │      (Byte-level Injection, No Drift)   │
                        └─────────────────────────────────────────┘

                        ┌─────────────────────────────────────────┐
                        │          REPO INFRASTRUCTURE            │
                        │  Justfile (No Make) .machine_readable/  │
                        │  Multi-Shell Shims  Podman Containers   │
                        └─────────────────────────────────────────┘
```

## Completion Dashboard

```
COMPONENT                          STATUS              NOTES
─────────────────────────────────  ──────────────────  ─────────────────────────────────
CORE LAYERS
  Forth Kernel (Physical)           ██████████ 100%    Byte-level striker stable
  AffineScript TEA UI (Neural)          ████████░░  80%    Real-time stack monitor active
  Nickel Contracts (Symbolic)       ██████████ 100%    Constraint validation verified
  Tauri Bridge (FFI)                ██████████ 100%    Type-safe OS integration stable

INTERFACES & VERIFICATION
  CLI Interface (just strike)       ██████████ 100%    Standard strike patterns active
  Verification (hexdump proof)      ██████████ 100%    ASCII-clean validation verified
  Multi-Shell Shims                 ████████░░  80%    18+ shell shims expanding

REPO INFRASTRUCTURE
  Justfile Automation               ██████████ 100%    Must-Just-Nickel workflow
  .machine_readable/                ██████████ 100%    STATE.adoc tracking
  Podman / nerdctl build            ██████████ 100%    Deterministic containers

─────────────────────────────────────────────────────────────────────────────
OVERALL:                            █████████░  ~90%   Neurosymbolic Suite functional
```

## Key Dependencies

```
TEA UI ────────► Nickel Contract ──────► Forth Kernel ──────► Byte Strike
                    │                      │                    │
                    ▼                      ▼                    ▼
              Input Validation        Stack Ops           FS Substrate
```

## Update Protocol

This file is maintained by both humans and AI agents. When updating:

1. **After completing a component**: Change its bar and percentage
2. **After adding a component**: Add a new row in the appropriate section
3. **After architectural changes**: Update the ASCII diagram
4. **Date**: Update the `Last updated` comment at the top of this file

Progress bars use: `█` (filled) and `░` (empty), 10 characters wide.
Percentages: 0%, 10%, 20%, ... 100% (in 10% increments).
