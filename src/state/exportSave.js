import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import { pauseSaving, continueSaving } from "./save.js";

export async function saveAsPDF() {
  pauseSaving();
  document.querySelector(".saveAsPdf").textContent = "loading";
  const container = document.getElementById("generationArea");
  const { jsPDF } = window.jspdf;

  const MAX_PAGES_PER_PDF = 50;

  const sections = container.querySelectorAll("canvas")

  if (sections.length === 0) {
    console.warn("No sections found.");
    return;
  }

  let pdfWidth, pdfHeight, createPDF;
    const rect = sections[0].getBoundingClientRect();
    pdfWidth = rect.width; // px → pt ✅
    pdfHeight = rect.height;
    createPDF = () =>
      new jsPDF({
        orientation: pdfWidth > pdfHeight ? "l" : "p",
        unit: "px",
        format: [pdfWidth, pdfHeight],
      });

  let pdf = createPDF();
  let currentPageCount = 0;
  let pdfIndex = 1;
const newName = canvasProperties.formerName.replace(/\.json$/i, "")
  for (let i = 0; i < sections.length; i++) {
    try {
      const imgData = sections[i].toDataURL("image/png");
      if (currentPageCount > 0) pdf.addPage(); // ✅ fixed blank page bug

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      currentPageCount++;

      if (currentPageCount >= MAX_PAGES_PER_PDF || i === sections.length - 1) {
        pdf.save(`${newName}-${pdfIndex}.pdf`);
        pdfIndex++;
        currentPageCount = 0;
        if (i !== sections.length - 1) {
          pdf = createPDF();
        }
      }
    } catch (error) {
      console.error(`Failed to render section ${i + 1}`, error);
    }
  }
  document.querySelector(".saveAsPdf").textContent = "save As Pdf";
continueSaving()
}
export async function saveAsImage() {
  pauseSaving();
  document.querySelector(".saveAsImage").textContent = "loading";
  const element = document.getElementById("generationArea");
  let images = element.querySelectorAll("canvas");
  const newName = canvasProperties.formerName.replace(/\.json$/i, "")
  for (let i = 0; i < images.length; i++) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const link = document.createElement("a");
      link.download = `${newName}${i}.png`;
      link.href = images[i].toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to save as image:", error);
    }
  }
  document.querySelector(".saveAsImage").textContent = "save As Image";
continueSaving()
}