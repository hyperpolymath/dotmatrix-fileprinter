// SPDX-License-Identifier: AGPL-3.0-or-later
// DotMatrix-FilePrinter - Main Entry Point

import "./styles/main.css";
import * as App from "./App.res.js";

// State
let state = {
  input: "",
  bytes: [],
  targetPath: "dist/substrate.bin",
  gforthAvailable: null,
  previewResult: null,
  verifyResult: null,
  status: "idle",
  error: null,
};

// DOM elements
let inputEl, bytesPreviewEl, targetEl, statusEl, errorEl;
let previewPanel, verifyPanel, gforthStatusEl;
let parseBtn, previewBtn, strikeBtn, verifyBtn;

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

  // Set up event listeners
  inputEl?.addEventListener("input", onInputChange);
  targetEl?.addEventListener("input", onTargetChange);
  parseBtn?.addEventListener("click", onParse);
  previewBtn?.addEventListener("click", onPreview);
  strikeBtn?.addEventListener("click", onStrike);
  verifyBtn?.addEventListener("click", onVerify);

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

// Event handlers
function onInputChange(e) {
  state.input = e.target.value;
  state.error = null;
  clearError();
  updateButtons();
}

function onTargetChange(e) {
  state.targetPath = e.target.value;
  // Validate path using proven SafePath
  if (state.targetPath && !App.isValidPath(state.targetPath)) {
    showError("Invalid path: contains traversal sequences (.. or ~)");
  } else {
    clearError();
  }
  updateButtons();
}

function onParse() {
  clearError();
  const input = state.input.trim();

  if (!input) {
    showError("No input to parse");
    return;
  }

  // Try parsing as comma-separated bytes first
  if (input.includes(",")) {
    const result = App.parseByteString(input);
    if (result.TAG === "Ok") {
      state.bytes = result._0;
    } else {
      showError(result._0);
      return;
    }
  } else {
    // Parse as text
    state.bytes = App.stringToBytes(input);
  }

  // Validate bytes
  const invalid = state.bytes.findIndex((b) => !App.isValidByte(b));
  if (invalid >= 0) {
    showError(`Byte at position ${invalid} (${state.bytes[invalid]}) is invalid`);
    state.bytes = [];
    return;
  }

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
      bytesPreviewEl.innerHTML = `
        <strong>${state.bytes.length} bytes:</strong>
        <code>${state.bytes.join(", ")}</code>
        <br>
        <strong>Hex:</strong> <code>${hex}</code>
      `;
      bytesPreviewEl.style.display = "block";
    } else {
      bytesPreviewEl.style.display = "none";
    }
  }
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
                  `<li>Position ${c.position}: 0x${c.value.toString(16).toUpperCase()} - ${c.description}</li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    previewPanel.innerHTML = `
      <div class="panel__header">
        Preview <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <div class="panel__body">
        ${contaminantsHtml}
        <pre class="hex-viewer">${r.hex_preview}</pre>
        <p>${r.byte_count} bytes ready to strike</p>
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
                  `<li>Position ${c.position}: 0x${c.value.toString(16).toUpperCase()} - ${c.description}</li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    verifyPanel.innerHTML = `
      <div class="panel__header">
        Verification (${r.size} bytes) <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <div class="panel__body">
        ${contaminantsHtml}
        <pre class="hex-viewer">${r.hexdump}</pre>
      </div>
    `;
    verifyPanel.style.display = "block";
  }
}

function updateButtons() {
  const hasInput = state.input.trim().length > 0;
  const hasBytes = state.bytes.length > 0;
  const hasGforth = state.gforthAvailable === true;
  // Check path validity using proven SafePath
  const hasValidPath = state.targetPath && App.isValidPath(state.targetPath);

  if (parseBtn) parseBtn.disabled = !hasInput;
  if (previewBtn) previewBtn.disabled = !hasBytes || !hasGforth;
  // Strike requires valid path (no traversal attacks)
  if (strikeBtn) strikeBtn.disabled = !hasBytes || !hasGforth || !hasValidPath;
  // Verify requires valid path
  if (verifyBtn) verifyBtn.disabled = !hasGforth || !hasValidPath;
}

// Start the app
document.addEventListener("DOMContentLoaded", init);
