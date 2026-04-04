# SPDX-License-Identifier: PMPL-1.0-or-later
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
    @deno run -A npm:rescript build
    @cd src-tauri && cargo check
    @echo "Type check complete"

# Run panic-attacker pre-commit scan
assail:
    @command -v panic-attack >/dev/null 2>&1 && panic-attack assail . || echo "panic-attack not found — install from https://github.com/hyperpolymath/panic-attacker"

# ═══════════════════════════════════════════════════════════════════════════════
# ONBOARDING & DIAGNOSTICS
# ═══════════════════════════════════════════════════════════════════════════════

# Check all required toolchain dependencies and report health
doctor:
    #!/usr/bin/env bash
    echo "═══════════════════════════════════════════════════"
    echo "  Dotmatrix Fileprinter Doctor — Toolchain Health Check"
    echo "═══════════════════════════════════════════════════"
    echo ""
    PASS=0; FAIL=0; WARN=0
    check() {
        local name="$1" cmd="$2" min="$3"
        if command -v "$cmd" >/dev/null 2>&1; then
            VER=$("$cmd" --version 2>&1 | head -1)
            echo "  [OK]   $name — $VER"
            PASS=$((PASS + 1))
        else
            echo "  [FAIL] $name — not found (need $min+)"
            FAIL=$((FAIL + 1))
        fi
    }
    check "just"              just      "1.25" 
    check "git"               git       "2.40" 
    check "Rust (cargo)"      cargo     "1.80" 
    check "Deno"              deno      "2.0" 
    check "ReScript (resc)"   rescript  "12.0" 
    check "Zig"               zig       "0.13" 
# Optional tools
if command -v panic-attack >/dev/null 2>&1; then
    echo "  [OK]   panic-attack — available"
    PASS=$((PASS + 1))
else
    echo "  [WARN] panic-attack — not found (pre-commit scanner)"
    WARN=$((WARN + 1))
fi
    echo ""
    echo "  Result: $PASS passed, $FAIL failed, $WARN warnings"
    if [ "$FAIL" -gt 0 ]; then
        echo "  Run 'just heal' to attempt automatic repair."
        exit 1
    fi
    echo "  All required tools present."

# Attempt to automatically install missing tools
heal:
    #!/usr/bin/env bash
    echo "═══════════════════════════════════════════════════"
    echo "  Dotmatrix Fileprinter Heal — Automatic Tool Installation"
    echo "═══════════════════════════════════════════════════"
    echo ""
if ! command -v deno >/dev/null 2>&1; then
    echo "Installing Deno..."
    curl -fsSL https://deno.land/install.sh | sh
fi
# Install Deno dependencies
echo "Installing Deno dependencies..."
deno install 2>/dev/null || true
if ! command -v cargo >/dev/null 2>&1; then
    echo "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi
if ! command -v just >/dev/null 2>&1; then
    echo "Installing just..."
    cargo install just 2>/dev/null || echo "Install just from https://just.systems"
fi
    echo ""
    echo "Heal complete. Run 'just doctor' to verify."

# Guided tour of the project structure and key concepts
tour:
    #!/usr/bin/env bash
    echo "═══════════════════════════════════════════════════"
    echo "  Dotmatrix Fileprinter — Guided Tour"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo 'A Neurosymbolic approach to filesystem manipulation. This tool treats the filesystem as a 24-pin dot-matrix substrate for deterministic, byte-level injection, eliminating encoding drift and NBSP contamination.'
    echo ""
    echo "Key directories:"
    echo "  src/                      Source code" 
    echo "  lib/                      Library modules" 
    echo "  ffi/                      Foreign function interface (Zig)" 
    echo "  src/abi/                  Idris2 ABI definitions" 
    echo "  docs/                     Documentation" 
    echo "  tests/                    Test suite" 
    echo "  .github/workflows/        CI/CD workflows" 
    echo "  contractiles/             Must/Trust/Dust contracts" 
    echo "  .machine_readable/        Machine-readable metadata" 
    echo "  examples/                 Usage examples" 
    echo ""
    echo "Quick commands:"
    echo "  just doctor    Check toolchain health"
    echo "  just heal      Fix missing tools"
    echo "  just help-me   Common workflows"
    echo "  just default   List all recipes"
    echo ""
    echo "Read more: README.adoc, EXPLAINME.adoc"

# Show help for common workflows
help-me:
    #!/usr/bin/env bash
    echo "═══════════════════════════════════════════════════"
    echo "  Dotmatrix Fileprinter — Common Workflows"
    echo "═══════════════════════════════════════════════════"
    echo ""
echo "FIRST TIME SETUP:"
echo "  just doctor           Check toolchain"
echo "  just heal             Fix missing tools"
echo "" 
    echo "DEVELOPMENT:" 
    echo "  cargo build           Build the project" 
    echo "  cargo test            Run tests" 
    echo "  deno task dev         Development server" 
    echo "  deno test             Run tests" 
    echo "" 
echo "PRE-COMMIT:"
echo "  just assail           Run panic-attacker scan"
echo ""
echo "LEARN:"
echo "  just tour             Guided project tour"
echo "  just default          List all recipes" 


# Print the current CRG grade (reads from READINESS.md '**Current Grade:** X' line)
crg-grade:
    @grade=$$(grep -oP '(?<=\*\*Current Grade:\*\* )[A-FX]' READINESS.md 2>/dev/null | head -1); \
    [ -z "$$grade" ] && grade="X"; \
    echo "$$grade"

# Generate a shields.io badge markdown for the current CRG grade
# Looks for '**Current Grade:** X' in READINESS.md; falls back to X
crg-badge:
    @grade=$$(grep -oP '(?<=\*\*Current Grade:\*\* )[A-FX]' READINESS.md 2>/dev/null | head -1); \
    [ -z "$$grade" ] && grade="X"; \
    case "$$grade" in \
      A) color="brightgreen" ;; B) color="green" ;; C) color="yellow" ;; \
      D) color="orange" ;; E) color="red" ;; F) color="critical" ;; \
      *) color="lightgrey" ;; esac; \
    echo "[![CRG $$grade](https://img.shields.io/badge/CRG-$$grade-$$color?style=flat-square)](https://github.com/hyperpolymath/standards/tree/main/component-readiness-grades)"
