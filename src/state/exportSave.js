import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import { pauseSaving, continueSaving } from "./save.js";
import LoaderManager from "../models/loader.js";
import requestDraw from "../utils/draw.js";

export async function saveAsPDF() {
  pauseSaving();
  const saveBtn = document.querySelector(".saveAsPdf");
  const originalTextBtn = saveBtn.textContent;
  saveBtn.textContent = "loading";

  try {
    const { jsPDF } = window.jspdf;
    const EXPORT_SCALE = canvasProperties.generateInfo.quality || 1;
    const cropX = (canvas.width - canvasProperties.measurement.width) / 2;
    const cropY = (canvas.height - canvasProperties.measurement.height) / 2;
    const cropW = canvasProperties.measurement.width;
    const cropH = canvasProperties.measurement.height;

    // Calculate iteration length
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

    const pdfWidth = cropW * EXPORT_SCALE;
    const pdfHeight = cropH * EXPORT_SCALE;

    const createPDF = () =>
      new jsPDF({
        orientation: pdfWidth > pdfHeight ? "l" : "p",
        unit: "px",
        format: [pdfWidth, pdfHeight],
      });

    let pdf = createPDF();
    let currentPageCount = 0;
    let pdfIndex = 1;
    const MAX_PAGES_PER_PDF = 50;
    const newName = canvasProperties.formerName.replace(/\.json$/i, "");

    const previouslySelectedObj = objectProperties.selectedObj;
    objectProperties.selectedObj = null;

    let lastYield = Date.now();

    for (let i = 0; i < iterationLength; i++) {
      // 1. Draw iterated content for step i
      await Promise.all([
        ...objectProperties.images.map((img) => img.drawIteratedImage(i)),
        ...objectProperties.textBoxes.map((tb) => tb.drawIteratedImage(i)),
      ]);

      // 2. Create offscreen canvas for the card
      const pc = document.createElement("canvas");
      pc.width = pdfWidth;
      pc.height = pdfHeight;
      const ptx = pc.getContext("2d");
      ptx.imageSmoothingEnabled = true;
      ptx.imageSmoothingQuality = "high";

      ptx.fillStyle = "#ffffff";
      ptx.fillRect(0, 0, pdfWidth, pdfHeight);

      ptx.save();
      ptx.scale(EXPORT_SCALE, EXPORT_SCALE);
      ptx.translate(-cropX, -cropY);
      objectProperties.objects.forEach((obj) => obj.addObject(ptx));
      ptx.restore();

      const imgData = pc.toDataURL("image/png");
      if (currentPageCount > 0) pdf.addPage();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      currentPageCount++;

      if (currentPageCount >= MAX_PAGES_PER_PDF || i === iterationLength - 1) {
        pdf.save(`${newName}-${pdfIndex}.pdf`);
        pdfIndex++;
        currentPageCount = 0;
        if (i !== iterationLength - 1) {
          pdf = createPDF();
        }
      }

      loader.incrementOriginalState();

      // Yield thread to keep UI alive and loader drawing
      const now = Date.now();
      if (now - lastYield >= 16) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        lastYield = Date.now();
      }
    }

    // Restore state
    objectProperties.images.forEach((img) => img.backToDefault());
    objectProperties.textBoxes.forEach((tb) => tb.backToDefault());
    objectProperties.selectedObj = previouslySelectedObj;
    requestDraw();

  } catch (error) {
    console.error("Failed to generate PDF:", error);
    alert("An error occurred while generating PDF. Please try again.");
  } finally {
    saveBtn.textContent = originalTextBtn;
    continueSaving();
  }
}

export async function saveAsImage() {
  pauseSaving();
  const saveBtn = document.querySelector(".saveAsImage");
  const originalTextBtn = saveBtn.textContent;
  saveBtn.textContent = "loading";

  try {
    const EXPORT_SCALE = canvasProperties.generateInfo.quality || 1;
    const cropX = (canvas.width - canvasProperties.measurement.width) / 2;
    const cropY = (canvas.height - canvasProperties.measurement.height) / 2;
    const cropW = canvasProperties.measurement.width;
    const cropH = canvasProperties.measurement.height;

    // Calculate iteration length
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

    const imgWidth = cropW * EXPORT_SCALE;
    const imgHeight = cropH * EXPORT_SCALE;
    const newName = canvasProperties.formerName.replace(/\.json$/i, "");

    const previouslySelectedObj = objectProperties.selectedObj;
    objectProperties.selectedObj = null;

    let lastYield = Date.now();

    for (let i = 0; i < iterationLength; i++) {
      // 1. Draw iterated content for step i
      await Promise.all([
        ...objectProperties.images.map((img) => img.drawIteratedImage(i)),
        ...objectProperties.textBoxes.map((tb) => tb.drawIteratedImage(i)),
      ]);

      // 2. Create offscreen canvas for the card
      const pc = document.createElement("canvas");
      pc.width = imgWidth;
      pc.height = imgHeight;
      const ptx = pc.getContext("2d");
      ptx.imageSmoothingEnabled = true;
      ptx.imageSmoothingQuality = "high";

      ptx.fillStyle = "#ffffff";
      ptx.fillRect(0, 0, imgWidth, imgHeight);

      ptx.save();
      ptx.scale(EXPORT_SCALE, EXPORT_SCALE);
      ptx.translate(-cropX, -cropY);
      objectProperties.objects.forEach((obj) => obj.addObject(ptx));
      ptx.restore();

      // Download the image
      const link = document.createElement("a");
      link.download = `${newName}-${i}.png`;
      link.href = pc.toDataURL("image/png");
      link.click();

      loader.incrementOriginalState();

      // Yield thread and add small timeout to avoid triggering browser download block
      await new Promise((resolve) => setTimeout(resolve, 100));
      lastYield = Date.now();
    }

    // Restore state
    objectProperties.images.forEach((img) => img.backToDefault());
    objectProperties.textBoxes.forEach((tb) => tb.backToDefault());
    objectProperties.selectedObj = previouslySelectedObj;
    requestDraw();

  } catch (error) {
    console.error("Failed to save as image:", error);
    alert("An error occurred while saving the images. Please try again.");
  } finally {
    saveBtn.textContent = originalTextBtn;
    continueSaving();
  }
}