import { canvas, ctx, canvassDiv, generationArea } from "../constants.js";
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
      ...objectProperties.textBoxes.map((tb) => tb.textArea.split("\n").length),
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
// makeGridDiv()
// Creates a div styled as a CSS grid with noPerRow columns and gap,
// sized to match the page dimensions. Each card canvas is appended
// into it — CSS handles all the layout, no manual x/y math needed.
// ===================================================================
function makeGridDiv() {
  const div = document.createElement("div");
  div.style.width = currentPageWidth + "px";
  div.style.height = currentPageHeight + "px";
  div.style.display = "grid";
  div.style.gridTemplateColumns = `repeat(${noPerRow}, 1fr)`;
  div.style.gridTemplateRows = `repeat(${noPerColumn}, 1fr)`;
  // div.style.gap = spacing + "px";
  div.style.padding = 0;
  div.style.placeItems = "center";
  div.style.boxSizing = "border-box";
  div.style.backgroundColor = "#ffffff";
  return div;
}
// ===================================================================
// renderBatch(startIndex)
// ===================================================================
async function renderBatch(startIndex) {
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

  const loader = new LoaderManager(itemsInBatch, "Generating Cards...");
  loader.createLoader();

  generationArea.querySelectorAll("canvas").forEach((canvas) => {
    canvas.width = 0;
    canvas.height = 0;
  });
  generationArea.replaceChildren();
  const fragment = document.createDocumentFragment();

  // In grid mode, track the current grid div being filled.
  // A new one is created every boxesPerPage cards.
  let currentGridDiv = null;
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
      // Start a new grid div every boxesPerPage cards
      if (localIndex === 0 || boxCountInPage >= boxesPerPage) {
        currentGridDiv = makeGridDiv();
        fragment.append(currentGridDiv);
        boxCountInPage = 0;
      }

      // Each card is its own canvas — CSS grid positions it automatically
      const { pc, ptx } = makeCardCanvas(cardWidth, cardHeight);
      ptx.fillStyle = "#ffffff";
      ptx.fillRect(cropX, cropY, cropW, cropH);
      objectProperties.objects.forEach((obj) => obj.addObject(ptx));
      currentGridDiv.append(pc);

      boxCountInPage++;
    }

    loader.incrementOriginalState();

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

  window.scrollTo({ top: generationArea.offsetTop, behavior: "smooth" });

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
