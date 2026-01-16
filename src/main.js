// SPDX-License-Identifier: AGPL-3.0-or-later
// DotMatrix-FilePrinter - Main Entry Point

import "./styles/main.css";
import * as App from "./App.res.js";

// Input modes
const InputMode = {
  TEXT: "text",
  HEX: "hex",
  BYTES: "bytes",
};

// Placeholder texts for each mode
const PLACEHOLDERS = {
  [InputMode.TEXT]: 'Type text here (e.g., "Hello")',
  [InputMode.HEX]: "Enter hex pairs (e.g., 48 65 6c 6c 6f or 48656c6c6f)",
  [InputMode.BYTES]: "Enter comma-separated decimals (e.g., 72, 101, 108, 108, 111)",
};

// State
let state = {
  inputMode: InputMode.TEXT,
  input: "",
  bytes: [],
  targetPath: "dist/substrate.bin",
  gforthAvailable: null,
  previewResult: null,
  verifyResult: null,
  status: "idle",
  error: null,
  helpOpen: false,
};

// DOM elements
let inputEl, bytesPreviewEl, targetEl, statusEl, errorEl;
let previewPanel, verifyPanel, gforthStatusEl;
let parseBtn, previewBtn, strikeBtn, verifyBtn;
let modeTextBtn, modeHexBtn, modeBytesBtn;
let helpPanel, helpOverlay, helpBtn, helpCloseBtn;

// Initialize
async function init() {
  // Get DOM elements
  inputEl = document.getElementById("input");
  bytesPreviewEl = document.getElementById("bytes-preview");
  targetEl = document.getElementById("target-path");
  statusEl = document.getElementById("status");
  errorEl = document.getElementById("error");
  previewPanel = document.getElementById("preview-panel");
  verifyPanel = document.getElementById("verify-panel");
  gforthStatusEl = document.getElementById("gforth-status");

  parseBtn = document.getElementById("parse-btn");
  previewBtn = document.getElementById("preview-btn");
  strikeBtn = document.getElementById("strike-btn");
  verifyBtn = document.getElementById("verify-btn");

  modeTextBtn = document.getElementById("mode-text");
  modeHexBtn = document.getElementById("mode-hex");
  modeBytesBtn = document.getElementById("mode-bytes");

  helpPanel = document.getElementById("help-panel");
  helpOverlay = document.getElementById("help-overlay");
  helpBtn = document.getElementById("help-btn");
  helpCloseBtn = document.getElementById("help-close");

  // Set up event listeners
  inputEl?.addEventListener("input", onInputChange);
  inputEl?.addEventListener("keydown", onInputKeydown);
  targetEl?.addEventListener("input", onTargetChange);

  parseBtn?.addEventListener("click", onParse);
  previewBtn?.addEventListener("click", onPreview);
  strikeBtn?.addEventListener("click", onStrike);
  verifyBtn?.addEventListener("click", onVerify);

  // Mode selector
  modeTextBtn?.addEventListener("click", () => setInputMode(InputMode.TEXT));
  modeHexBtn?.addEventListener("click", () => setInputMode(InputMode.HEX));
  modeBytesBtn?.addEventListener("click", () => setInputMode(InputMode.BYTES));

  // Help panel
  helpBtn?.addEventListener("click", toggleHelp);
  helpCloseBtn?.addEventListener("click", () => setHelpOpen(false));
  helpOverlay?.addEventListener("click", () => setHelpOpen(false));

  // Global keyboard shortcuts
  document.addEventListener("keydown", onGlobalKeydown);

  // Check gforth
  updateStatus("Checking gforth...");
  try {
    state.gforthAvailable = await App.checkGforth();
    updateGforthStatus();
    updateStatus("Ready");
  } catch (err) {
    state.gforthAvailable = false;
    updateGforthStatus();
    showError("Gforth not available: " + err);
  }

  updateButtons();
}

// Input mode management
function setInputMode(mode) {
  state.inputMode = mode;
  state.bytes = [];
  clearError();
  updateBytesPreview();
  updateModeButtons();
  updatePlaceholder();
  updateButtons();
}

function updateModeButtons() {
  const buttons = {
    [InputMode.TEXT]: modeTextBtn,
    [InputMode.HEX]: modeHexBtn,
    [InputMode.BYTES]: modeBytesBtn,
  };

  Object.entries(buttons).forEach(([mode, btn]) => {
    if (btn) {
      btn.classList.toggle("mode-selector__btn--active", mode === state.inputMode);
      btn.setAttribute("aria-selected", mode === state.inputMode);
    }
  });
}

function updatePlaceholder() {
  if (inputEl) {
    inputEl.placeholder = PLACEHOLDERS[state.inputMode];
  }
}

// Help panel
function toggleHelp() {
  setHelpOpen(!state.helpOpen);
}

function setHelpOpen(open) {
  state.helpOpen = open;
  if (helpPanel) {
    helpPanel.classList.toggle("help-panel--open", open);
  }
  if (helpOverlay) {
    helpOverlay.classList.toggle("help-overlay--visible", open);
  }
}

// Keyboard shortcuts
function onGlobalKeydown(e) {
  // ? - Toggle help
  if (e.key === "?" && !e.ctrlKey && !e.metaKey && e.target === document.body) {
    e.preventDefault();
    toggleHelp();
    return;
  }

  // Escape - Close help
  if (e.key === "Escape") {
    if (state.helpOpen) {
      e.preventDefault();
      setHelpOpen(false);
      return;
    }
  }

  // Ctrl+P - Preview
  if ((e.ctrlKey || e.metaKey) && e.key === "p") {
    e.preventDefault();
    if (!previewBtn?.disabled) {
      onPreview();
    }
    return;
  }

  // Ctrl+Enter - Strike
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (!strikeBtn?.disabled) {
      onStrike();
    }
    return;
  }

  // Ctrl+Shift+V - Verify
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V") {
    e.preventDefault();
    if (!verifyBtn?.disabled) {
      onVerify();
    }
    return;
  }
}

function onInputKeydown(e) {
  // Enter (without Ctrl) - Parse
  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    if (!parseBtn?.disabled) {
      onParse();
    }
  }
}

// Event handlers
function onInputChange(e) {
  state.input = e.target.value;
  state.error = null;
  clearError();
  updateButtons();
}

function onTargetChange(e) {
  state.targetPath = e.target.value;
  if (state.targetPath && !App.isValidPath(state.targetPath)) {
    showError("Invalid path: contains traversal sequences (.. or ~)");
  } else {
    clearError();
  }
  updateButtons();
}

// Parse hex string to bytes
function parseHexInput(input) {
  // Remove spaces and normalize
  const normalized = input.replace(/\s+/g, "").toLowerCase();

  if (normalized.length === 0) {
    return { ok: true, bytes: [] };
  }

  if (normalized.length % 2 !== 0) {
    return { ok: false, error: "Hex string must have even length" };
  }

  // Use proven library to decode
  const result = App.hexToBytes(normalized);
  if (result.TAG === "Ok") {
    return { ok: true, bytes: result._0 };
  } else {
    return { ok: false, error: "Invalid hex characters" };
  }
}

function onParse() {
  clearError();
  const input = state.input.trim();

  if (!input) {
    showError("No input to parse");
    return;
  }

  let bytes = [];

  switch (state.inputMode) {
    case InputMode.TEXT:
      bytes = App.stringToBytes(input);
      break;

    case InputMode.HEX: {
      const result = parseHexInput(input);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      bytes = result.bytes;
      break;
    }

    case InputMode.BYTES: {
      const result = App.parseByteString(input);
      if (result.TAG === "Ok") {
        bytes = result._0;
      } else {
        showError(result._0);
        return;
      }
      break;
    }
  }

  // Validate bytes
  const invalid = bytes.findIndex((b) => !App.isValidByte(b));
  if (invalid >= 0) {
    showError(`Byte at position ${invalid} (${bytes[invalid]}) is invalid (must be 0-127, not 160 or 194)`);
    state.bytes = [];
    return;
  }

  state.bytes = bytes;
  updateBytesPreview();
  updateButtons();
}

async function onPreview() {
  if (state.bytes.length === 0) {
    showError("No bytes to preview");
    return;
  }

  updateStatus("Previewing...");
  try {
    state.previewResult = await App.previewStrike(state.bytes);
    updatePreviewPanel();
    updateStatus("Preview complete");
  } catch (err) {
    showError("Preview failed: " + err);
    updateStatus("Ready");
  }
}

async function onStrike() {
  if (state.bytes.length === 0) {
    showError("No bytes to strike");
    return;
  }

  updateStatus("Striking...");
  try {
    await App.executeStrike(state.bytes, state.targetPath);
    updateStatus("Strike complete, verifying...");

    // Auto-verify after strike
    state.verifyResult = await App.verifySubstrate(state.targetPath);
    updateVerifyPanel();
    updateStatus("Complete");
  } catch (err) {
    showError("Strike failed: " + err);
    updateStatus("Failed");
  }
}

async function onVerify() {
  if (!state.targetPath) {
    showError("No target path specified");
    return;
  }

  updateStatus("Verifying...");
  try {
    state.verifyResult = await App.verifySubstrate(state.targetPath);
    updateVerifyPanel();
    updateStatus("Verification complete");
  } catch (err) {
    showError("Verify failed: " + err);
    updateStatus("Ready");
  }
}

// UI update functions
function updateStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function showError(msg) {
  state.error = msg;
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
  }
}

function clearError() {
  state.error = null;
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
}

function updateGforthStatus() {
  if (gforthStatusEl) {
    if (state.gforthAvailable === null) {
      gforthStatusEl.className = "status status--warning";
      gforthStatusEl.innerHTML =
        '<span class="status__dot"></span>Gforth: Checking...';
    } else if (state.gforthAvailable) {
      gforthStatusEl.className = "status status--ok";
      gforthStatusEl.innerHTML =
        '<span class="status__dot"></span>Gforth: Ready';
    } else {
      gforthStatusEl.className = "status status--error";
      gforthStatusEl.innerHTML =
        '<span class="status__dot"></span>Gforth: Not Found';
    }
  }
}

function updateBytesPreview() {
  if (bytesPreviewEl) {
    if (state.bytes.length > 0) {
      const hex = App.bytesToHex(state.bytes);
      const compactHex = App.bytesToHexCompact(state.bytes);
      bytesPreviewEl.innerHTML = `
        <div class="bytes-preview__count">${state.bytes.length} bytes parsed</div>
        <strong>Decimal:</strong> <code>${state.bytes.join(", ")}</code>
        <br>
        <strong>Hex:</strong> <code>${hex}</code>
        <br>
        <strong>Compact:</strong> <code>${compactHex}</code>
      `;
      bytesPreviewEl.style.display = "block";
    } else {
      bytesPreviewEl.style.display = "none";
    }
  }
}

// Build hex editor HTML for a byte array
function buildHexEditor(bytes, contaminants = []) {
  const BYTES_PER_ROW = 16;
  const contaminantPositions = new Set(contaminants.map((c) => c.position));

  let rows = "";
  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_ROW) {
    const rowBytes = bytes.slice(offset, offset + BYTES_PER_ROW);
    const address = offset.toString(16).padStart(8, "0").toUpperCase();

    // Build hex cells
    let hexCells = "";
    for (let i = 0; i < BYTES_PER_ROW; i++) {
      const byteIndex = offset + i;
      if (i < rowBytes.length) {
        const byte = rowBytes[i];
        const hex = byte.toString(16).padStart(2, "0").toUpperCase();
        const isContaminated = contaminantPositions.has(byteIndex);
        const gapClass = i === 7 ? " hex-editor__byte--gap" : "";
        const contamClass = isContaminated ? " hex-editor__byte--contaminated" : "";
        hexCells += `<span class="hex-editor__byte${gapClass}${contamClass}" title="Position ${byteIndex}: ${byte}">${hex}</span>`;
      } else {
        hexCells += `<span class="hex-editor__byte">  </span>`;
      }
    }

    // Build ASCII representation
    let asciiChars = "";
    for (let i = 0; i < rowBytes.length; i++) {
      const byte = rowBytes[i];
      let char;
      if (byte >= 32 && byte <= 126) {
        char = String.fromCharCode(byte);
        // Escape HTML special chars
        if (char === "<") char = "&lt;";
        else if (char === ">") char = "&gt;";
        else if (char === "&") char = "&amp;";
        else if (char === '"') char = "&quot;";
        asciiChars += `<span>${char}</span>`;
      } else {
        asciiChars += `<span class="non-printable">.</span>`;
      }
    }

    rows += `
      <div class="hex-editor__row">
        <div class="hex-editor__address">${address}</div>
        <div class="hex-editor__bytes">${hexCells}</div>
        <div class="hex-editor__ascii">${asciiChars}</div>
      </div>
    `;
  }

  return `
    <div class="hex-editor">
      <div class="hex-editor__header">
        <span>Offset</span>
        <span>00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
        <span>ASCII</span>
      </div>
      <div class="hex-editor__body">
        ${rows}
      </div>
    </div>
  `;
}

function updatePreviewPanel() {
  if (previewPanel && state.previewResult) {
    const r = state.previewResult;
    const statusClass = r.would_contaminate ? "badge--danger" : "badge--success";
    const statusText = r.would_contaminate ? "CONTAMINATED" : "CLEAN";

    let contaminantsHtml = "";
    if (r.contaminants && r.contaminants.length > 0) {
      contaminantsHtml = `
        <div class="alert alert--danger">
          <strong>Contamination detected:</strong>
          <ul>
            ${r.contaminants
              .map(
                (c) =>
                  `<li>Position ${c.position}: 0x${c.value.toString(16).toUpperCase()} (${c.value}) - ${c.description}</li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    const hexEditor = buildHexEditor(state.bytes, r.contaminants || []);

    previewPanel.innerHTML = `
      <div class="panel__header">
        Preview <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <div class="panel__body">
        ${contaminantsHtml}
        ${hexEditor}
        <p style="margin-top: 1rem; color: var(--fg-muted);">${r.byte_count} bytes ready to strike</p>
      </div>
    `;
    previewPanel.style.display = "block";
  }
}

function updateVerifyPanel() {
  if (verifyPanel && state.verifyResult) {
    const r = state.verifyResult;
    const statusClass = r.clean ? "badge--success" : "badge--danger";
    const statusText = r.clean ? "CLEAN" : "CONTAMINATED";

    let contaminantsHtml = "";
    if (r.contaminants && r.contaminants.length > 0) {
      contaminantsHtml = `
        <div class="alert alert--danger">
          <strong>Contamination found:</strong>
          <ul>
            ${r.contaminants
              .map(
                (c) =>
                  `<li>Position ${c.position}: 0x${c.value.toString(16).toUpperCase()} (${c.value}) - ${c.description}</li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    // Parse the hexdump to extract bytes for the hex editor
    // The hexdump format is: "XX XX XX ..."
    let fileBytes = [];
    if (r.hexdump) {
      const hexMatch = r.hexdump.match(/[0-9a-fA-F]{2}/g);
      if (hexMatch) {
        fileBytes = hexMatch.map((h) => parseInt(h, 16));
      }
    }

    const hexEditor = fileBytes.length > 0
      ? buildHexEditor(fileBytes, r.contaminants || [])
      : `<pre class="hex-viewer">${r.hexdump}</pre>`;

    verifyPanel.innerHTML = `
      <div class="panel__header">
        Verification (${r.size} bytes) <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <div class="panel__body">
        ${contaminantsHtml}
        ${hexEditor}
      </div>
    `;
    verifyPanel.style.display = "block";
  }
}

function updateButtons() {
  const hasInput = state.input.trim().length > 0;
  const hasBytes = state.bytes.length > 0;
  const hasGforth = state.gforthAvailable === true;
  const hasValidPath = state.targetPath && App.isValidPath(state.targetPath);

  if (parseBtn) parseBtn.disabled = !hasInput;
  if (previewBtn) previewBtn.disabled = !hasBytes || !hasGforth;
  if (strikeBtn) strikeBtn.disabled = !hasBytes || !hasGforth || !hasValidPath;
  if (verifyBtn) verifyBtn.disabled = !hasGforth || !hasValidPath;
}

// Start the app
document.addEventListener("DOMContentLoaded", init);
