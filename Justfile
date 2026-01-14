# SPDX-License-Identifier: AGPL-3.0-or-later
# RSR Standard Justfile for DotMatrix-FilePrinter
# ═══════════════════════════════════════════════════════════════════════════════

set shell := ["bash", "-uc"]
set dotenv-load := true
set positional-arguments := true

# Project metadata
project := "dotmatrix-fileprinter"
version := "1.0.0"
tier := "infrastructure" 

# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT & HELP
# ═══════════════════════════════════════════════════════════════════════════════

# Show all available recipes
default:
    @just --list --unsorted

# Show project info and current STATE.scm phase
info:
    @echo "Project: {{project}}"
    @echo "RSR Tier: {{tier}}"
    @echo "Phase: $(just state-phase)"

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD & STRIKE (Project Specific)
# ═══════════════════════════════════════════════════════════════════════════════

# Build the Neuro-Symbolic pipeline (ReScript + Tauri/Rust)
build:
    @echo "Compiling Neural Layer (ReScript)..."
    @rescript build
    @echo "Compiling Physical Host (Tauri)..."
    @cargo tauri build

# Execute a Deterministic Byte-Strike using the Golden Prompt
# Usage: just strike "104,101,108,108,111"
strike bytes: build
    @echo "Initiating Forth Strike Sequence..."
    @./src-tauri/target/release/{{project}} --strike "{{bytes}}"

# Verify the Physical Truth of the substrate (ASCII-clean, no 0xA0)
verify target="dist/substrate.bin":
    @echo "Verifying Physical Byte Truth for {{target}}..."
    @hexdump -C {{target}}
    @if grep -obUP "\xa0" {{target}}; then \
        echo "FAIL: NBSP (0xA0) CONTAMINATION DETECTED"; \
        exit 1; \
    else \
        echo "PASS: Substrate is ASCII-pure."; \
    fi

# ═══════════════════════════════════════════════════════════════════════════════
# RSR COMPLIANCE & STATE
# ═══════════════════════════════════════════════════════════════════════════════

# Generate the RSR Cookbook documentation
cookbook:
    @just --list --unsorted > docs/just-cookbook.adoc
    @echo "Generated: docs/just-cookbook.adoc"

# Validate RSR structure (Files & .well-known)
validate-rsr:
    #!/usr/bin/env bash
    echo "=== RSR Compliance Check ==="
    MISSING=""
    for f in .editorconfig .gitignore Justfile RSR_COMPLIANCE.adoc README.adoc; do
        [ -f "$f" ] || MISSING="$MISSING $f"
    done
    if [ -n "$MISSING" ]; then echo "MISSING:$MISSING"; exit 1; fi
    echo "RSR compliance: PASS"

# Show current phase from STATE.scm
state-phase:
    @grep -oP '\(phase\s+\.\s+\K[^)]+' STATE.scm 2>/dev/null | head -1 || echo "unknown"

# ═══════════════════════════════════════════════════════════════════════════════
# CONTAINERS & DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════════

# Build container (nerdctl > podman > docker)
container-build:
    #!/usr/bin/env bash
    CTR=$(command -v nerdctl || command -v podman || command -v docker)
    $CTR build -t {{project}}:latest .

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

# Count lines of deterministic code
loc:
    @find . \( -name "*.res" -o -name "*.fth" -o -name "*.rs" -o -name "*.ncl" \) | xargs wc -l | tail -1

# Show TODOs in the substrate
todos:
    @grep -rn "TODO\|FIXME" .
