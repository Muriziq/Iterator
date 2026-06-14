import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import requestDraw from "../utils/draw.js";
import LoaderManager from "../models/loader.js";
import { cancelGenerate } from "./uiHelpers.js";
import { pauseSaving, continueSaving } from "../state/save.js";

export default async function generateCard() {
  pauseSaving();

  // ---------------- Setup ----------------
  document.querySelector("footer").style.display = "block";
  cancelGenerate();

  await new Promise((resolve) => setTimeout(resolve, 50));

  objectProperties.scale = 1;
  objectProperties.panX = 0;
  objectProperties.panY = 0;

  requestDraw();

  // ---------------- Export Quality ----------------
  // Lower on phones to avoid crashes
  const EXPORT_SCALE = window.innerWidth < 600 ? 2 : 3;

  // ---------------- Destructure ----------------
  const {
    spacing,
    noPerRow,
    noPerColumn,
    renderWidth,
    renderHeight,
    renderPage,
  } = canvasProperties.generateInfo;

  generationArea.style.gap = spacing + "px";

  // Cache layout reads up front — avoids repeated reflow triggers
  const pageRect = generationArea.getBoundingClientRect();
  const paperRect = canvassDiv.getBoundingClientRect();

  const currentPageWidth = pageRect.width - spacing * 2;
  const currentPageHeight = (currentPageWidth * renderHeight) / renderWidth;

  let previouslySelectedObj = objectProperties.selectedObj;
  objectProperties.selectedObj = null;

  generationArea.replaceChildren();

  const fragment = document.createDocumentFragment();

  const boxesPerPage = noPerColumn * noPerRow;

  // ---------------- Cell Sizing ----------------
  const containerWidth = currentPageWidth - spacing;
  const containerHeight = currentPageHeight - spacing;

  const cellWidth = containerWidth / noPerRow;
  const cellHeight = containerHeight / noPerColumn;

  const localScale = Math.min(
    cellWidth / paperRect.width,
    cellHeight / paperRect.height
  );

  const ifNotAutoWidth = paperRect.width * localScale;
  const ifNotAutoHeight = paperRect.height * localScale;

  // ---------------- Iteration Length ----------------
  let iterationLength = 1;

  if (objectProperties.textBoxes.length > 0) {
    iterationLength = Math.max(
      iterationLength,
      ...objectProperties.textBoxes.map((tb) => tb.textArea.split("\n").length)
    );
  }

  const maxImageIterLength = Math.max(
    1,
    ...objectProperties.images.map((img) =>
      img.originalFiles.length ? img.originalFiles.length : 1
    )
  );

  iterationLength = Math.max(iterationLength, maxImageIterLength);

  const loader = new LoaderManager(iterationLength);
  loader.createLoader();

  // ---------------- Crop Setup ----------------
  const cropX = (canvas.width - canvasProperties.measurement.width) / 2;
  const cropY = (canvas.height - canvasProperties.measurement.height) / 2;
  const cropW = canvasProperties.measurement.width;
  const cropH = canvasProperties.measurement.height;

  // ---------------- High Resolution Crop Canvas ----------------
  // Use OffscreenCanvas when available — runs off the main thread,
  // avoids layout invalidation, and is faster for export-only work.
  const supportsOffscreen = typeof OffscreenCanvas !== "undefined";

  let croppedCanvas, cty;

  if (supportsOffscreen) {
    croppedCanvas = new OffscreenCanvas(cropW * EXPORT_SCALE, cropH * EXPORT_SCALE);
  } else {
    croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = cropW * EXPORT_SCALE;
    croppedCanvas.height = cropH * EXPORT_SCALE;
    croppedCanvas.style.width = cropW + "px";
    croppedCanvas.style.height = cropH + "px";
  }

  cty = croppedCanvas.getContext("2d");
  cty.imageSmoothingEnabled = true;
  cty.imageSmoothingQuality = "high";

  // Set scale once — all subsequent draw calls use these coords
  cty.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);

  // ---------------- Pre-allocate Page Canvases ----------------
  // Creating canvases mid-loop triggers GC pressure. We calculate
  // exactly how many pages we need and build them all up front.
  const totalPages =
    renderPage === "auto"
      ? iterationLength
      : Math.ceil(iterationLength / boxesPerPage);

  /**
   * Creates and configures a page canvas at full export resolution.
   */
  function createPageCanvas() {
    const pc = document.createElement("canvas");
    pc.width = currentPageWidth * EXPORT_SCALE;
    pc.height = currentPageHeight * EXPORT_SCALE;
    pc.style.width = currentPageWidth + "px";
    pc.style.height = currentPageHeight + "px";

    const ptx = pc.getContext("2d");
    ptx.imageSmoothingEnabled = true;
    ptx.imageSmoothingQuality = "high";
    // Scale once — draw calls use display coords throughout
    ptx.scale(EXPORT_SCALE, EXPORT_SCALE);

    return { pc, ptx };
  }

  const pageCanvases = Array.from({ length: totalPages }, () => {
    const { pc, ptx } = createPageCanvas();
    fragment.append(pc);
    return { pc, ptx };
  });

  let boxCountInPage = 0;
  let pageIndex = 0;
  let lastYield = Date.now();

  // ================= MAIN LOOP =================
  for (let i = 0; i < iterationLength; i++) {

    // Clear main canvas and crop target
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cty.clearRect(0, 0, cropW, cropH);

    // Draw iterated content (images + text boxes in parallel)
    await Promise.all([
      ...objectProperties.images.map((img) => img.drawIteratedImage(i)),
      ...objectProperties.textBoxes.map((tb) => tb.drawIteratedImage(i)),
    ]);

    // Draw static objects
    objectProperties.objects.forEach((obj) => obj.addObject());

    // Copy main canvas → high-res cropped canvas
    // Explicit source rect ensures we always sample at full internal resolution
    cty.drawImage(
      canvas,
      cropX, cropY, cropW, cropH,  // source: unscaled crop region
      0, 0, cropW, cropH           // dest: fill the cropped canvas (cty is pre-scaled)
    );

    // ===================================================
    // AUTO PAGE MODE — one canvas per iteration
    // ===================================================
    if (renderPage === "auto") {

      const { ptx } = pageCanvases[i];

      // Explicit source rect: sample the full internal resolution of croppedCanvas
      ptx.drawImage(
        croppedCanvas,
        0, 0, croppedCanvas.width, croppedCanvas.height,  // source: full px
        0, 0, currentPageWidth, currentPageHeight          // dest: display coords (ptx is pre-scaled)
      );

    } else {

      // ===================================================
      // MULTI CARD PAGE MODE — grid layout per page
      // ===================================================

      // Advance to next pre-allocated page when the current one is full
      if (i > 0 && boxCountInPage >= boxesPerPage) {
        boxCountInPage = 0;
        pageIndex++;
      }

      const { ptx } = pageCanvases[pageIndex];

      const col = boxCountInPage % noPerRow;
      const row = Math.floor(boxCountInPage / noPerRow);

      const x = col * ifNotAutoWidth;
      const y = row * ifNotAutoHeight;

      // Explicit source rect for sharpest possible downsampling
      ptx.drawImage(
        croppedCanvas,
        0, 0, croppedCanvas.width, croppedCanvas.height,  // source: full internal px
        x + spacing, y + spacing, ifNotAutoWidth, ifNotAutoHeight  // dest: display coords
      );

      boxCountInPage++;
    }

    loader.incrementOriginalState();

    // ---------------- Yield ----------------
    // Use setTimeout instead of requestAnimationFrame for export:
    // rAF waits for the next paint (up to 16ms delay); setTimeout(0)
    // yields the thread immediately without blocking the GPU pipeline.
    const now = Date.now();
    if (now - lastYield >= 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYield = Date.now();
    }
  }

  // ---------------- DOM Append ----------------
  generationArea.append(fragment);

  // ---------------- Reset ----------------
  objectProperties.images.forEach((img) => img.backToDefault());
  objectProperties.textBoxes.forEach((tb) => tb.backToDefault());

  window.scrollTo({
    top: generationArea.offsetTop,
    behavior: "smooth",
  });

  objectProperties.selectedObj = previouslySelectedObj;

  requestDraw();

  continueSaving();
}