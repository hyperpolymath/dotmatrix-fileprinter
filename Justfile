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

# Gforth is in toolbox
gforth := "toolbox run gforth"

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
    @echo "Version: {{version}}"
    @echo "Phase: $(just state-phase)"
    @echo ""
    @echo "Stack:"
    @echo "  Neural:   ReScript + TEA"
    @echo "  Symbolic: Nickel"
    @echo "  Physical: Forth (Gforth)"
    @echo "  Bridge:   Tauri 2.0 (Rust)"

# ═══════════════════════════════════════════════════════════════════════════════
# DEVELOPMENT
# ═══════════════════════════════════════════════════════════════════════════════

# Install dependencies (run once)
setup:
    @echo "Checking dependencies..."
    @command -v deno >/dev/null || (echo "ERROR: Deno not found. Install from https://deno.land" && exit 1)
    @toolbox run command -v gforth >/dev/null || (echo "WARNING: Gforth not found in toolbox. Install with: toolbox run sudo dnf install gforth" && exit 0)
    @command -v cargo >/dev/null || (echo "ERROR: Rust/Cargo not found. Install from https://rustup.rs" && exit 1)
    @echo "Installing npm packages via Deno..."
    @deno install
    @echo "Setup complete!"

# Start development server (hot-reload)
dev:
    @echo "Starting development server..."
    @deno task dev

# Build ReScript only
build-res:
    @echo "Compiling Neural Layer (ReScript)..."
    @deno run -A npm:rescript build

# Build frontend (ReScript + Vite)
build-frontend:
    @echo "Building frontend..."
    @deno task build

# Build Tauri app (full release)
build: build-frontend
    @echo "Building Tauri application..."
    @cd src-tauri && cargo build --release
    @echo "Build complete: src-tauri/target/release/{{project}}"

# Run Tauri in development mode
tauri-dev: build-res
    @echo "Starting Tauri development mode..."
    @cargo tauri dev

# ═══════════════════════════════════════════════════════════════════════════════
# FORTH KERNEL
# ═══════════════════════════════════════════════════════════════════════════════

# Test the Forth kernel directly
test-forth:
    @echo "Testing Forth kernel..."
    @cd {{justfile_directory()}} && {{gforth}} kernel/striker.fth -e 'test-strike bye'
    @echo ""
    @echo "Verifying output..."
    @hexdump -C test.bin
    @rm -f test.bin

# Interactive Forth session
forth-repl:
    @echo "Starting Forth REPL (type 'bye' to exit)..."
    @cd {{justfile_directory()}} && {{gforth}} kernel/striker.fth

# Execute a Deterministic Byte-Strike via Forth directly
# Usage: just strike-direct "72,101,108,108,111" output.bin
strike-direct bytes output="dist/substrate.bin":
    @echo "Preparing strike data..."
    @mkdir -p $(dirname {{output}})
    @echo "CREATE STRIKE-DATA {{bytes}} ," > kernel/data.fth
    @echo "Executing Forth strike..."
    @cd {{justfile_directory()}} && {{gforth}} kernel/striker.fth kernel/data.fth -e 's" {{output}}" strike-init STRIKE-DATA $(echo "{{bytes}}" | tr "," "\n" | wc -l) strike-sequence strike-close bye'
    @echo "Strike complete. Verifying..."
    @hexdump -C {{output}}

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

# Verify the Physical Truth of the substrate (ASCII-clean, no 0xA0)
verify target="dist/substrate.bin":
    @echo "Verifying Physical Byte Truth for {{target}}..."
    @hexdump -C {{target}}
    @echo ""
    @if grep -obUaP '\xa0' {{target}} 2>/dev/null; then \
        echo "FAIL: NBSP (0xA0) CONTAMINATION DETECTED"; \
        exit 1; \
    elif grep -obUaP '\xc2' {{target}} 2>/dev/null; then \
        echo "WARN: UTF-8 marker (0xC2) detected"; \
    else \
        echo "PASS: Substrate is ASCII-pure."; \
    fi

# Check for any non-ASCII bytes
verify-strict target="dist/substrate.bin":
    @echo "Strict ASCII verification for {{target}}..."
    @if LC_ALL=C grep -P '[^\x00-\x7F]' {{target}} 2>/dev/null; then \
        echo "FAIL: Non-ASCII bytes detected"; \
        exit 1; \
    else \
        echo "PASS: File is strictly ASCII (0x00-0x7F)"; \
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
    @echo "Lines of code by language:"
    @echo "  ReScript: $(find . -name '*.res' -not -path './node_modules/*' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
    @echo "  Forth:    $(find . -name '*.fth' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
    @echo "  Rust:     $(find . -name '*.rs' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
    @echo "  Nickel:   $(find . -name '*.ncl' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"

# Show TODOs in the substrate
todos:
    @grep -rn "TODO\|FIXME" --include="*.res" --include="*.rs" --include="*.fth" --include="*.ncl" . 2>/dev/null || echo "No TODOs found"

# Clean build artifacts
clean:
    @echo "Cleaning build artifacts..."
    @rm -rf dist/ node_modules/ .rescript/
    @rm -rf src-tauri/target/
    @rm -f kernel/data.fth test.bin
    @echo "Clean complete"

# Format all code
fmt:
    @echo "Formatting code..."
    @deno run -A npm:rescript format src/*.res
    @cd src-tauri && cargo fmt
    @echo "Format complete"

# Check types without building
check:
    @echo "Type checking..."
    @deno run -A npm:rescript build -- -warn-error +a
    @cd src-tauri && cargo check
    @echo "Type check complete"
