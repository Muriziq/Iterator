import { canvas, width, height, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import { pauseSaving, continueSaving } from "./save.js";
import LoaderManager from "../models/loader.js";
import { 
  getExportTotalItems, 
  exportRequestRender, 
  exportRestoreView 
} from "../utils/generate.js";


function promptUserOptions(title, fields) {
  return new Promise((resolve) => {
    // Check if modal stylesheet is loaded
    if (!document.getElementById("modal-export-styles")) {
      const style = document.createElement("style");
      style.id = "modal-export-styles";
      style.textContent = `
        .export-modal-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center; justify-content: center;
          z-index: 99999;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .export-modal-card {
          background: #1e1e1e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2rem;
          border-radius: 1.25rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          width: 90%;
          max-width: 380px;
          color: #e4e4e4;
          box-sizing: border-box;
          transform: translateY(20px);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .export-modal-overlay.active {
          opacity: 1;
        }
        .export-modal-overlay.active .export-modal-card {
          transform: translateY(0);
        }
        .export-modal-field {
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .export-modal-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #a0aec0;
        }
        .export-modal-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid #3e3e3e;
          border-radius: 0.5rem;
          background: #2a2a2a;
          color: #ffffff;
          font-size: 0.95rem;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .export-modal-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .export-modal-buttons {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .export-modal-btn-cancel {
          flex: 1;
          background: #2c2c2c;
          color: #a0aec0;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .export-modal-btn-cancel:hover {
          background: #3a3a3a;
          color: #ffffff;
        }
        .export-modal-btn-submit {
          flex: 1;
          background: linear-gradient(90deg, #6366f1, #a855f7);
          color: #ffffff;
          border: none;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.2);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .export-modal-btn-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.3);
        }
        .export-modal-btn-submit:active {
          transform: translateY(0);
        }
      `;
      document.head.appendChild(style);
    }

    const overlay = document.createElement("div");
    overlay.className = "export-modal-overlay";

    const card = document.createElement("div");
    card.className = "export-modal-card";

    let fieldsHtml = fields
      .map((field) => {
        if (field.type === "select") {
          const options = field.options
            .map((opt) => `<option value="${opt.value}" ${opt.value === field.value ? "selected" : ""}>${opt.label}</option>`)
            .join("");
          return `
            <div class="export-modal-field">
              <label class="export-modal-label">${field.label}</label>
              <select name="${field.name}" class="export-modal-input">
                ${options}
              </select>
            </div>
          `;
        }
        return `
          <div class="export-modal-field">
            <label class="export-modal-label">${field.label}</label>
            <input type="${field.type}" name="${field.name}" class="export-modal-input" min="${field.min || ""}" max="${field.max || ""}" value="${field.value || ""}">
          </div>
        `;
      })
      .join("");

    card.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.25rem; font-weight: 700; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem;">${title}</h3>
      <form id="export-modal-form">
        ${fieldsHtml}
        <div class="export-modal-buttons">
          <button type="button" class="export-modal-btn-cancel">Cancel</button>
          <button type="submit" class="export-modal-btn-submit">Export</button>
        </div>
      </form>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
      overlay.classList.add("active");
    });

    const form = card.querySelector("#export-modal-form");
    const cancelBtn = card.querySelector(".export-modal-btn-cancel");

    const cleanup = () => {
      overlay.classList.remove("active");
      setTimeout(() => {
        overlay.remove();
      }, 250);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const values = {};
      fields.forEach((field) => {
        if (field.type === "number") {
          values[field.name] = Number(formData.get(field.name));
        } else {
          values[field.name] = formData.get(field.name);
        }
      });
      cleanup();
      resolve(values);
    };
  });
}

export async function saveAsPDF() {
  const options = await promptUserOptions("PDF Export Settings", [
    {
      name: "maxPages",
      label: "Max Pages per PDF File",
      type: "number",
      min: 1,
      max: 500,
      value: 50,
    },
  ]);

  if (!options) return; // User cancelled or clicked Cancel

  const totalItems = getExportTotalItems();
  if (totalItems === 0 || generationArea.children.length === 0) {
    alert("Please generate cards first using the 'Done' button.");
    return;
  }

  const MAX_PAGES_PER_PDF = options.maxPages;

  pauseSaving();
  const saveBtn = document.querySelector(".saveAsPdf");
  const originalTextBtn = saveBtn.textContent;
  saveBtn.textContent = "loading";

  try {
    const { jsPDF } = window.jspdf;

    // Get the display width and height of the first page to size the PDF pages
    const firstPageEl = generationArea.children[0];
    const pageRect = firstPageEl.getBoundingClientRect();
    const pdfWidth = parseFloat(firstPageEl.style.width) || pageRect.width;
    const pdfHeight = parseFloat(firstPageEl.style.height) || pageRect.height;

    const createPDF = () =>
      new jsPDF({
        orientation: pdfWidth > pdfHeight ? "l" : "p",
        unit: "px",
        format: [pdfWidth, pdfHeight],
      });

    let pdf = createPDF();
    let currentPageCount = 0;
    let pdfIndex = 1;
    const newName = canvasProperties.formerName.replace(/\.json$/i, "");

    // Count total page elements we will export across all batches to configure loader.
    let totalPagesToExport = 0;
    if (canvasProperties.generateInfo.renderPage === "auto") {
      totalPagesToExport = totalItems;
    } else {
      const { noPerRow, noPerColumn } = canvasProperties.generateInfo;
      const boxesPerPage = (noPerRow || 1) * (noPerColumn || 1);
      totalPagesToExport = Math.ceil(totalItems / boxesPerPage);
    }

    const loader = new LoaderManager(totalPagesToExport, "Exporting PDF...");
    loader.createLoader();

    let batchIndex = 0;
    let exportProgressIndex = 0;

    while (true) {
      const pages = await exportRequestRender(batchIndex);
      if (!pages) break; // Finished all batches

      for (let j = 0; j < pages.length; j++) {
        const element = pages[j];

        const imgData = element.toDataURL("image/jpeg", 0.85);
        if (currentPageCount > 0) pdf.addPage();

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
        currentPageCount++;

        if (currentPageCount >= MAX_PAGES_PER_PDF || exportProgressIndex === totalPagesToExport - 1) {
          pdf.save(`${newName}-${pdfIndex}.pdf`);
          pdfIndex++;
          currentPageCount = 0;
          if (exportProgressIndex !== totalPagesToExport - 1) {
            pdf = createPDF();
          }
        }

        exportProgressIndex++;
        loader.incrementOriginalState();

        // Yield thread
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      batchIndex++;
    }

    // Restore original batch view
    await exportRestoreView();

  } catch (error) {
    console.error("Failed to generate PDF:", error);
    alert("An error occurred while generating PDF. Please try again.");
  } finally {
    saveBtn.textContent = originalTextBtn;
    continueSaving();
  }
}

export async function saveAsImage() {
  const options = await promptUserOptions("Image Export Settings", [
    {
      name: "format",
      label: "File Format",
      type: "select",
      options: [
        { value: "png", label: "PNG (High Quality / Transparency)" },
        { value: "jpeg", label: "JPEG (Smaller File)" },
      ],
      value: "png",
    },
  ]);

  if (!options) return; // User cancelled or clicked Cancel

  const totalItems = getExportTotalItems();
  if (totalItems === 0 || generationArea.children.length === 0) {
    alert("Please generate cards first using the 'Done' button.");
    return;
  }

  const imgFormat = options.format === "jpeg" ? "image/jpeg" : "image/png";
  const fileExtension = options.format === "jpeg" ? "jpg" : "png";

  pauseSaving();
  const saveBtn = document.querySelector(".saveAsImage");
  const originalTextBtn = saveBtn.textContent;
  saveBtn.textContent = "loading";

  try {
    const newName = canvasProperties.formerName.replace(/\.json$/i, "");

    // Count total page elements we will export
    let totalPagesToExport = 0;
    if (canvasProperties.generateInfo.renderPage === "auto") {
      totalPagesToExport = totalItems;
    } else {
      const { noPerRow, noPerColumn } = canvasProperties.generateInfo;
      const boxesPerPage = (noPerRow || 1) * (noPerColumn || 1);
      totalPagesToExport = Math.ceil(totalItems / boxesPerPage);
    }

    const loader = new LoaderManager(totalPagesToExport, "Saving Images...");
    loader.createLoader();

    const zip = new JSZip();
    let batchIndex = 0;
    let exportProgressIndex = 0;

    while (true) {
      const pages = await exportRequestRender(batchIndex);
      if (!pages) break; // Finished all batches

      for (let j = 0; j < pages.length; j++) {
        const element = pages[j];

        // Convert canvas to blob asynchronously
        const blob = await new Promise((resolve) => {
          element.toBlob(resolve, imgFormat, imgFormat === "image/jpeg" ? 0.85 : undefined);
        });
        zip.file(`${newName}-${exportProgressIndex + 1}.${fileExtension}`, blob);

        exportProgressIndex++;
        loader.incrementOriginalState();

        // Yield thread
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      batchIndex++;
    }

    // Generate zip file and download
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.download = `${newName}-images.zip`;
    link.href = URL.createObjectURL(zipBlob);
    link.click();
    
    // Clean up URL object after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 10000);

    // Restore original batch view
    await exportRestoreView();

  } catch (error) {
    console.error("Failed to save as image:", error);
    alert("An error occurred while saving the images. Please try again.");
  } finally {
    saveBtn.textContent = originalTextBtn;
    continueSaving();
  }
}