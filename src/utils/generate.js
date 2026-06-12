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
  // ---------------- Loader ----------------



  await new Promise((resolve) => setTimeout(resolve, 50));

  objectProperties.scale = 1;
  objectProperties.panX = 0;
  objectProperties.panY = 0;

  requestDraw();

  // ---------------- Export Quality ----------------
  // Lower on phones to avoid crashes
  const EXPORT_SCALE =
    window.innerWidth < 600 ? 2 : 3;
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

  const pageRect = generationArea.getBoundingClientRect();

  const currentPageWidth =
    pageRect.width - spacing * 2;

  const currentPageHeight =
    (currentPageWidth * renderHeight) / renderWidth;

  let previouslySelectedObj = objectProperties.selectedObj;

  objectProperties.selectedObj = null;

  generationArea.replaceChildren();

  const fragment = document.createDocumentFragment();

  const boxesPerPage =
    noPerColumn * noPerRow;

  // ---------------- Cell Sizing ----------------
  const containerWidth =
    currentPageWidth - spacing;

  const containerHeight =
    currentPageHeight - spacing;

  const cellWidth =
    containerWidth / noPerRow;

  const cellHeight =
    containerHeight / noPerColumn;

  const paperRect =
    canvassDiv.getBoundingClientRect();

  const localScale = Math.min(
    cellWidth / paperRect.width,
    cellHeight / paperRect.height
  );

  const ifNotAutoWidth =
    paperRect.width * localScale;

  const ifNotAutoHeight =
    paperRect.height * localScale;

  // ---------------- Iteration Length ----------------
  let iterationLength = 1;

  if (objectProperties.textBoxes.length > 0) {
    iterationLength = Math.max(
      iterationLength,
      ...textBoxes.map(
        (tb) => tb.textArea.split("\n").length
      )
    );
  }

  const maxImageIterLength = Math.max(
    1,
    ...images.map((img) =>
      img.originalFiles.length
        ? img.originalFiles.length
        : 1
    )
  );

  iterationLength = Math.max(
    iterationLength,
    maxImageIterLength
  );
  const loader =
    new LoaderManager(iterationLength);

  loader.createLoader();
  // ---------------- Crop Setup ----------------
  const cropX =
    (canvas.width - canvasProperties.measurement.width) / 2;

  const cropY =
    (canvas.height - canvasProperties.measurement.height) / 2;

  const cropW = canvasProperties.measurement.width;
  const cropH = canvasProperties.measurement.height;

  // ---------------- High Resolution Crop Canvas ----------------
  const croppedCanvas =
    document.createElement("canvas");

  const cty =
    croppedCanvas.getContext("2d");

  // INTERNAL RESOLUTION
  croppedCanvas.width =
    cropW * EXPORT_SCALE;

  croppedCanvas.height =
    cropH * EXPORT_SCALE;

  // DISPLAY SIZE
  croppedCanvas.style.width =
    cropW + "px";

  croppedCanvas.style.height =
    cropH + "px";

  // QUALITY
  cty.imageSmoothingEnabled = true;
  cty.imageSmoothingQuality = "high";

  // Scale future drawing operations
  cty.setTransform(
    EXPORT_SCALE,
    0,
    0,
    EXPORT_SCALE,
    0,
    0
  );


  let boxCountInPage = 0;

  let lastYield = Date.now();

  // ================= MAIN LOOP =================
  for (let i = 0; i < iterationLength; i++) {

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    cty.clearRect(
      0,
      0,
      cropW,
      cropH
    );

    // Draw iterated content
    await Promise.all([
      ...images.map((img) =>
        img.drawIteratedImage(i)
      ),

      ...textBoxes.map((tb) =>
        tb.drawIteratedImage(i)
      ),
    ]);

    // Draw objectProperties.objects
    objectProperties.objects.forEach((obj) =>
      obj.addObject()
    );

    // Copy main canvas into high-res cropped canvas
    cty.drawImage(
      canvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    let previewCanvas;
    let ptx;

    // ===================================================
    // AUTO PAGE MODE
    // ===================================================
    if (renderPage === "auto") {

      previewCanvas =
        document.createElement("canvas");

      ptx =
        previewCanvas.getContext("2d");

      // HIGH RES INTERNAL SIZE
      previewCanvas.width =
        currentPageWidth * EXPORT_SCALE;

      previewCanvas.height =
        currentPageHeight * EXPORT_SCALE;

      // NORMAL DISPLAY SIZE
      previewCanvas.style.width =
        currentPageWidth + "px";

      previewCanvas.style.height =
        currentPageHeight + "px";

      ptx.imageSmoothingEnabled = true;
      ptx.imageSmoothingQuality = "high";

      // Scale drawing
      ptx.scale(
        EXPORT_SCALE,
        EXPORT_SCALE
      );

      // Draw
      ptx.drawImage(
        croppedCanvas,
        0,
        0,
        currentPageWidth,
        currentPageHeight
      );

      fragment.append(previewCanvas);

    } else {

      // ===================================================
      // MULTI CARD PAGE MODE
      // ===================================================
      if (
        boxCountInPage >= boxesPerPage ||
        i === 0
      ) {

        boxCountInPage = 0;

        previewCanvas =
          document.createElement("canvas");

        ptx =
          previewCanvas.getContext("2d");

        // HIGH RES INTERNAL SIZE
        previewCanvas.width =
          currentPageWidth * EXPORT_SCALE;

        previewCanvas.height =
          currentPageHeight * EXPORT_SCALE;

        // NORMAL DISPLAY SIZE
        previewCanvas.style.width =
          currentPageWidth + "px";

        previewCanvas.style.height =
          currentPageHeight + "px";

        ptx.imageSmoothingEnabled = true;
        ptx.imageSmoothingQuality = "high";

        // Scale drawing operations
        ptx.scale(
          EXPORT_SCALE,
          EXPORT_SCALE
        );

        fragment.append(previewCanvas);

      } else {

        // Get latest canvas in fragment
        previewCanvas =
          fragment.lastChild;

        ptx =
          previewCanvas.getContext("2d");
      }

      const col =
        boxCountInPage % noPerRow;

      const row =
        Math.floor(
          boxCountInPage / noPerRow
        );

      const x =
        col * ifNotAutoWidth;

      const y =
        row * ifNotAutoHeight;

      ptx.drawImage(
        croppedCanvas,
        x + spacing,
        y + spacing,
        ifNotAutoWidth,
        ifNotAutoHeight
      );

      boxCountInPage++;
    }

    loader.incrementOriginalState();

    // ---------------- Yield ----------------
    const now = Date.now();

    if (now - lastYield >= 16) {

      await new Promise((resolve) =>
        requestAnimationFrame(resolve)
      );

      lastYield = Date.now();
    }
  }

  // ---------------- DOM Append ----------------
  generationArea.append(fragment);

  // ---------------- Reset ----------------
  objectProperties.images.forEach((img) =>
    img.backToDefault()
  );

  objectProperties.textBoxes.forEach((tb) =>
    tb.backToDefault()
  );

  window.scrollTo({
    top: generationArea.offsetTop,
    behavior: "smooth",
  });

  objectProperties.selectedObj =
    previouslySelectedObj;

  requestDraw();

  continueSaving();
}