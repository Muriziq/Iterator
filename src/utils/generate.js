import { canvas, canvassDiv, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import requestDraw from "../utils/draw.js";
import LoaderManager from "../models/loader.js";
import { cancelGenerate } from "./uiHelpers.js";
import { pauseSaving, continueSaving } from "../state/save.js";

// ---------------- Pagination DOM refs ----------------
const prevBatchBtn = document.querySelector(".prevBatch");
const nextBatchBtn = document.querySelector(".nextBatch");
const batchInput = document.querySelector(".batchInput");
const batchProgressEl = document.querySelector(".batchProgress");

const DEBOUNCE_MS = 400;

// ===================================================================
// Module-level state — set once per generateCard() call.
// ===================================================================
let iterationLength = 0;
let itemsPerBatch = 1;
let pagesPerBatchTarget = 1;
let totalBatches = 1;
let currentBatchStart = 0;
let pendingBatchStart = 0;

let isRenderingBatch = false;
let debounceTimer = null;

let EXPORT_SCALE;
let spacing, noPerRow, noPerColumn, renderPage;
let currentPageWidth, currentPageHeight;
let boxesPerPage;
let cardWidth, cardHeight; // per-card canvas size in grid mode
let cropX, cropY, cropW, cropH;
let scaleX, scaleY;
let previouslySelectedObj;
let cellW, cellH, cardWidthPx, cardHeightPx, dx, dy, sx, sy;

export default async function generateCard() {
  // ---------------- Setup ----------------
  document.querySelector("footer").style.display = "block";
  cancelGenerate();

  // ---------------- Export Quality ----------------
  EXPORT_SCALE = canvasProperties.generateInfo.quality;

  // ---------------- Destructure ----------------
  const { renderWidth, renderHeight } = canvasProperties.generateInfo;
  ({ spacing, noPerRow, noPerColumn, renderPage } =
    canvasProperties.generateInfo);

  generationArea.style.gap = spacing + "px";

  const pageRect = generationArea.getBoundingClientRect();
  const paperRect = canvassDiv.getBoundingClientRect();

  currentPageWidth = pageRect.width - spacing * 2;
  currentPageHeight = (currentPageWidth * renderHeight) / renderWidth;

  boxesPerPage = noPerColumn * noPerRow;

  // ---------------- Cell Sizing ----------------
  const localScale = Math.min(
    (currentPageWidth - spacing) / noPerRow / paperRect.width,
    (currentPageHeight - spacing) / noPerColumn / paperRect.height,
  );

  // Individual card canvas size in grid mode (CSS px)
  cardWidth = paperRect.width * localScale;
  cardHeight = paperRect.height * localScale;

  // ---------------- Iteration Length ----------------
  iterationLength = 1;

  if (objectProperties.textBoxes.length > 0) {
    iterationLength = Math.max(
      iterationLength,
      ...objectProperties.textBoxes.map((tb) => tb.getIterationLength()),
    );
  }

  const maxImageIterLength = Math.max(
    1,
    ...objectProperties.images.map((img) =>
      img.originalFiles.length ? img.originalFiles.length : 1,
    ),
  );

  iterationLength = Math.max(iterationLength, maxImageIterLength);

  // ---------------- Batch sizing ----------------
  const requestedBatchSize = Math.min(
    canvasProperties.generateInfo.batchSize || 20,
    iterationLength,
  );

  if (renderPage === "auto") {
    itemsPerBatch = requestedBatchSize;
    totalBatches = Math.ceil(iterationLength / itemsPerBatch);
  } else {
    // In grid mode, batch = N full grid divs worth of cards.
    // totalBatches counts grid divs (pages), not individual cards.
    pagesPerBatchTarget = Math.max(
      1,
      Math.round(requestedBatchSize / boxesPerPage),
    );
    itemsPerBatch = pagesPerBatchTarget * boxesPerPage;
    const totalPages = Math.ceil(iterationLength / boxesPerPage);
    totalBatches = Math.ceil(totalPages / pagesPerBatchTarget);
  }

  currentBatchStart = 0;
  pendingBatchStart = 0;

  // ---------------- Crop Setup ----------------
  cropX = (canvas.width - canvasProperties.measurement.width) / 2;
  cropY = (canvas.height - canvasProperties.measurement.height) / 2;
  cropW = canvasProperties.measurement.width;
  cropH = canvasProperties.measurement.height;

  // Scale factors: crop region → auto-mode page canvas
  scaleX = (currentPageWidth * EXPORT_SCALE) / cropW;
  scaleY = (currentPageHeight * EXPORT_SCALE) / cropH;

  // Pre-calculate grid dimensions once if in grid mode
  if (renderPage !== "auto") {
    const pageW = currentPageWidth * EXPORT_SCALE;
    const pageH = currentPageHeight * EXPORT_SCALE;
    cellW = pageW / noPerRow;
    cellH = pageH / noPerColumn;
    cardWidthPx = cardWidth * EXPORT_SCALE;
    cardHeightPx = cardHeight * EXPORT_SCALE;
    dx = (cellW - cardWidthPx) / 2;
    dy = (cellH - cardHeightPx) / 2;
    sx = cardWidthPx / cropW;
    sy = cardHeightPx / cropH;
  }

  // ---------------- Pagination control wiring ----------------
  batchInput.min = 1;
  batchInput.max = totalBatches;
  batchInput.value = 1;

  batchInput.oninput = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      let n = parseInt(batchInput.value, 10);
      if (Number.isNaN(n)) return;
      n = Math.max(1, Math.min(n, totalBatches));
      batchInput.value = n;
      pendingBatchStart = (n - 1) * itemsPerBatch;
      requestBatch(pendingBatchStart);
    }, DEBOUNCE_MS);
  };

  nextBatchBtn.onclick = () => {
    clearTimeout(debounceTimer);
    pendingBatchStart = Math.min(
      (totalBatches - 1) * itemsPerBatch,
      pendingBatchStart + itemsPerBatch,
    );
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      requestBatch(pendingBatchStart);
    }, DEBOUNCE_MS);
  };

  prevBatchBtn.onclick = () => {
    clearTimeout(debounceTimer);
    pendingBatchStart = Math.max(0, pendingBatchStart - itemsPerBatch);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      requestBatch(pendingBatchStart);
    }, DEBOUNCE_MS);
  };

  await renderBatch(0);
}

// ===================================================================
// requestBatch(startIndex)
// ===================================================================
function requestBatch(startIndex) {
  const maxStart = (totalBatches - 1) * itemsPerBatch;
  const clamped = Math.max(0, Math.min(startIndex, maxStart));
  if (isRenderingBatch) return;
  renderBatch(clamped);
}

// ===================================================================
// makeCardCanvas(w, h)
// Creates a single card-sized canvas with scale+translate pre-applied
// so addObject(ptx) draws directly at export resolution into the crop
// region. Used by both auto mode (full page size) and grid mode (slot size).
// ===================================================================
function makeCardCanvas(w, h) {
  const pc = document.createElement("canvas");
  pc.width = w * EXPORT_SCALE;
  pc.height = h * EXPORT_SCALE;
  pc.style.width = w + "px";
  pc.style.height = h + "px";

  const ptx = pc.getContext("2d");
  ptx.imageSmoothingEnabled = true;
  ptx.imageSmoothingQuality = "high";

  // Scale crop region to fill this canvas, then translate so cropX/cropY
  // maps to (0,0) — same pattern as the canvas2 example.
  const sx = (w * EXPORT_SCALE) / cropW;
  const sy = (h * EXPORT_SCALE) / cropH;
  ptx.scale(sx, sy);
  ptx.translate(-cropX, -cropY);

  return { pc, ptx };
}


// ===================================================================
// renderBatch(startIndex)
// ===================================================================
export async function renderBatch(startIndex, isExport = false) {
  isRenderingBatch = true;
  pauseSaving();
  previouslySelectedObj = objectProperties.selectedObj;
  objectProperties.selectedObj = null;
  requestDraw();

  prevBatchBtn.disabled = true;
  nextBatchBtn.disabled = true;
  batchInput.disabled = true;

  const endIndex = Math.min(startIndex + itemsPerBatch, iterationLength);
  const itemsInBatch = endIndex - startIndex;

  let loader = null;
  if (!isExport) {
    loader = new LoaderManager(itemsInBatch, "Generating Cards...");
    loader.createLoader();
  }



  generationArea.querySelectorAll("canvas").forEach((canvas) => {
    canvas.width = 0;
    canvas.height = 0;
  });
  generationArea.replaceChildren();
  const fragment = document.createDocumentFragment();

  // In grid mode, track the current page canvas and its 2D context.
  // A new one is created every boxesPerPage cards.
  let currentPageCanvas = null;
  let currentPageCtx = null;
  let boxCountInPage = 0;

  let lastYield = Date.now();

  // ================= BATCH LOOP =================
  for (let i = startIndex; i < endIndex; i++) {
    const localIndex = i - startIndex;

    await Promise.all([
      ...objectProperties.images.map((img) => img.drawIteratedImage(i)),
      ...objectProperties.textBoxes.map((tb) => tb.drawIteratedImage(i)),
    ]);

    if (renderPage === "auto") {
      // One full-page canvas per card — scale+translate pre-applied
      const { pc, ptx } = makeCardCanvas(currentPageWidth, currentPageHeight);
      ptx.fillStyle = "#ffffff";
      ptx.fillRect(cropX, cropY, cropW, cropH);
      objectProperties.objects.forEach((obj) => obj.addObject(ptx));
      fragment.append(pc);
    } else {
      // Start a new grid page canvas every boxesPerPage cards
      if (localIndex === 0 || boxCountInPage >= boxesPerPage) {
        currentPageCanvas = document.createElement("canvas");
        currentPageCanvas.width = currentPageWidth * EXPORT_SCALE;
        currentPageCanvas.height = currentPageHeight * EXPORT_SCALE;
        currentPageCanvas.style.width = currentPageWidth + "px";
        currentPageCanvas.style.height = currentPageHeight + "px";
        currentPageCanvas.style.backgroundColor = "#ffffff";
        currentPageCanvas.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        
        currentPageCtx = currentPageCanvas.getContext("2d");
        currentPageCtx.imageSmoothingEnabled = true;
        currentPageCtx.imageSmoothingQuality = "high";
        currentPageCtx.fillStyle = "#ffffff";
        currentPageCtx.fillRect(0, 0, currentPageCanvas.width, currentPageCanvas.height);
        
        fragment.append(currentPageCanvas);
        boxCountInPage = 0;
      }

      // Calculate grid placement coordinates
      const col = boxCountInPage % noPerRow;
      const row = Math.floor(boxCountInPage / noPerRow);
      
      const cellX = col * cellW;
      const cellY = row * cellH;

      // Draw the card directly onto the page canvas
      currentPageCtx.save();
      currentPageCtx.translate(cellX + dx, cellY + dy);
      currentPageCtx.scale(sx, sy);
      currentPageCtx.translate(-cropX, -cropY);

      // Draw card background
      currentPageCtx.fillStyle = "#ffffff";
      currentPageCtx.fillRect(cropX, cropY, cropW, cropH);
      
      // Draw card contents
      objectProperties.objects.forEach((obj) => obj.addObject(currentPageCtx));
      
      currentPageCtx.restore();

      boxCountInPage++;
    }

    if (loader) {
      loader.incrementOriginalState();
    }

    const now = Date.now();
    if (now - lastYield >= 16) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      lastYield = Date.now();
    }
  }

  // ---------------- DOM Append ----------------
  generationArea.append(fragment);

  // ---------------- Reset ----------------
  await Promise.all([
    ...objectProperties.images.map((img) => img.backToDefault()),
    ...objectProperties.textBoxes.map((tb) => tb.backToDefault()),
  ]);

  if (!isExport) {
    window.scrollTo({ top: generationArea.offsetTop, behavior: "smooth" });
  }

  objectProperties.selectedObj = previouslySelectedObj;
  requestDraw();

  // ---------------- Update pagination UI ----------------
  currentBatchStart = startIndex;
  pendingBatchStart = startIndex;

  const currentBatchNumber =
    renderPage === "auto"
      ? Math.floor(startIndex / itemsPerBatch) + 1
      : Math.floor(startIndex / boxesPerPage / pagesPerBatchTarget) + 1;

  batchProgressEl.textContent = `${currentBatchNumber} / ${totalBatches}`;
  batchInput.value = currentBatchNumber;

  prevBatchBtn.disabled = startIndex === 0;
  nextBatchBtn.disabled = endIndex >= iterationLength;
  batchInput.disabled = false;

  isRenderingBatch = false;
  continueSaving();
}

// ===================================================================
// Export Helpers for exportSave.js
// ===================================================================
export function getExportTotalItems() {
  return iterationLength;
}

export async function exportRequestRender(batchIndex) {
  const startIndex = batchIndex * itemsPerBatch;
  if (startIndex >= iterationLength) {
    return null;
  }
  pendingBatchStart = startIndex;
  await renderBatch(startIndex, true);
  return Array.from(generationArea.children);
}

export async function exportRestoreView() {
  await renderBatch(currentBatchStart, true);
}
