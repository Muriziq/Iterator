import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "./src/constants.js";
import { objectProperties, canvasProperties, defaultFonts, newFonts, loadNewFonts } from "./src/variable.js";
import requestDraw from "./src/utils/draw.js";
import { canvasSize, changeOrientation } from "./src/state/canvas.js";
import { importLoaded, saveToFile, pauseSaving, continueSaving } from "./src/state/save.js";
import { saveAsPDF, saveAsImage } from "./src/state/exportSave.js";
import { undo, redo } from "./src/state/undo.js";
import Tools, { addImage } from "./src/Tools/tools.js";
import { align, group, zoomToRect } from "./src/Tools/others.js";
import { backValues, changeValues } from "./src/utils/convert.js";
import { bringToFront, sendToBack, pageUp, pageDown } from "./src/Tools/pageTo.js";
import { cMousedown, cDoubleClick, cMouseUp, cMouseLeave, cMouseMove, wMouseUp, keyDown } from "./src/utils/mouseEvents.js";
import generateCard from "./src/utils/generate.js";
import { cancelGenerate, flip, notify, debounce } from "./src/utils/uiHelpers.js";

canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;
let ifAutoSave = false;


projectName.addEventListener("change", async (e) => {
  pauseSaving()
  const newName = e.target.value.trim().toLowerCase();
  if (!newName) {
    e.target.value = canvasProperties.formerName.replace(/\.json$/i, "");
    return;
  }
  const dbName = `${newName}.json`;
  if (dbName === canvasProperties.formerName) return;

  const projectDocs = await db.collection("projects").get();
  const names = (projectDocs || []).map((p) => p.name);

  if (names.includes(dbName)) {
    alert(`A project named "${newName}" already exists. Reverting.`);
    e.target.value = canvasProperties.formerName.replace(/\.json$/i, "");
    return;
  }

  if (names.includes(canvasProperties.formerName)) {
    await db.collection("projects").doc({ name: canvasProperties.formerName }).update({
      name: dbName,
      entryDate: new Date().getTime(),
    });
    const imageDatas = await db.collection(`img${canvasProperties.formerName}`).get();
    if (imageDatas && Array.isArray(imageDatas)) {
      for (const imageFiles of imageDatas) {
        await db.collection(`img${dbName}`).add(imageFiles);
      }
    }
    await db.collection(`img${canvasProperties.formerName}`).delete();
  }
  canvasProperties.formerName = dbName;
  notify("changed");
  continueSaving()
});
window.addEventListener("resize", () => {
  canvasSize();
});
window.addEventListener("load", async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (data) {
      const decoded = decodeURIComponent(data);

      const objectsData = await db
        .collection("projects")
        .doc({ name: data })
        .get();
      if (!objectsData || !objectsData.name) {
        alert("The requested project could not be found.");
        window.location.href = "index.html";
        return;
      }
      projectName.value = objectsData.name.replace(/\.json$/i, "");
      canvasProperties.formerName = objectsData.name;
      await loadNewFonts(db);
      await importLoaded(objectsData.object || [], true, true);
    } else {
      await loadNewFonts(db);
      const projectDocs = await db.collection("projects").get();
      const names = (projectDocs || []).map((p) => p.name);
      const newProjectCount = names.filter((project) =>
        /^new project(\s+\d+)?$/i.test(project),
      ).length;
      projectName.value = `new project ${newProjectCount === 0 ? "" : newProjectCount}`;
      canvasProperties.formerName = `${projectName.value.trim().toLowerCase()}.json`;
    }
    width.value = canvasProperties.measurement.width;
    height.value = canvasProperties.measurement.height;
    canvasSize();
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    // if (mediaQuery.matches) {
    //   thresholds.pointHold = () => adapt(15);
    //   thresholds.normalMode = () => adapt(25);
    // } else {
    //   thresholds.pointHold = () => adapt(7.5);
    //   thresholds.normalMode = () => adapt(15);
    // }
  } catch (error) {
    console.error("Error loading project:", error);
    alert("Failed to load the project. Please check your data and try again.");
  }
});


document.querySelector(".saveAsPdf").addEventListener("click", saveAsPDF);


document.getElementById("measurement").addEventListener("change", (e) => {
  canvasProperties.whatsMeasured = e.target.value;
  width.value = changeValues(canvassDiv.getBoundingClientRect().width);
  height.value = changeValues(canvassDiv.getBoundingClientRect().height);
  requestDraw();
  if (objectProperties.selectedObj) objectProperties.selectedObj.formatProperties();
});
document.getElementById("paperSize").addEventListener("change", (e) => {
  const value = e.target.value;
  if (value === "a1") {
    canvasProperties.measurement = measurementArr[0];
  } else if (value === "a2") {
    canvasProperties.measurement = measurementArr[1];
  } else if (value === "a3") {
    canvasProperties.measurement = measurementArr[2];
  } else if (value === "a4") {
    canvasProperties.measurement = measurementArr[3];
  } else if (value === "a5") {
    canvasProperties.measurement = measurementArr[4];
  } else if (value === "a6") {
    canvasProperties.measurement = measurementArr[5];
  } else if (value === "business-card") {
    canvasProperties.measurement = measurementArr[6];
  } else if (value === "letter") {
    canvasProperties.measurement = measurementArr[7];
  }
  canvasSize();
});

width.addEventListener("input", (e) => {
  const widthValue = backValues(e.target.value);
  const heightValue = backValues(height.value);
  canvasProperties.measurement = { width: widthValue, height: heightValue };
  canvasSize();
});
height.addEventListener("input", (e) => {
  const widthValue = backValues(width.value);
  const heightValue = backValues(e.target.value);
  canvasProperties.measurement = { width: widthValue, height: heightValue };
  canvasSize();
});
document.getElementById("renderPage").addEventListener("change", (e) => {
  canvasProperties.generateInfo.renderPage = e.target.value;
  let renderPageSize
  switch (canvasProperties.generateInfo.renderPage) {
    case "a0":
      renderPageSize = measurementArr[9];
      break;
    case "a1":
      renderPageSize = measurementArr[0];
      break;
    case "a2":
      renderPageSize = measurementArr[1];
      break;
    case "a3":
      renderPageSize = measurementArr[2];
      break;
    case "a4":
      renderPageSize = measurementArr[3];
      break;
    case "a5":
      renderPageSize = measurementArr[4];
      break;
    case "legal":
      renderPageSize = measurementArr[10];
      break;
    case "auto":
      renderPageSize = { ...canvasProperties.measurement };
      break;
    case "letter":
      renderPageSize = measurementArr[7];
      break;
    case "custom":
      {
        const rwEl = document.getElementById("renderWidth");
        const rhEl = document.getElementById("renderHeight");
        renderPageSize = {
          width: Number(rwEl.value) || canvasProperties.generateInfo.renderWidth,
          height: Number(rhEl.value) || canvasProperties.generateInfo.renderHeight,
        };
        canvasProperties.generateInfo.renderPage = "custom";
      }
      break;
  }
  const rows = document.getElementById("noPerRow");
  const columns = document.getElementById("noPerColumn");
  const height = document.getElementById("renderHeight");
  const width = document.getElementById("renderWidth");
  width.value = renderPageSize.width;
  height.value = renderPageSize.height;
  canvasProperties.generateInfo.renderWidth = renderPageSize.width;
  canvasProperties.generateInfo.renderHeight = renderPageSize.height;
  if (canvasProperties.generateInfo.renderPage === "auto") {
    rows.value = 1;
    columns.value = 1;
    rows.readOnly = true;
    columns.readOnly = true;
  } else {
    rows.readOnly = false;
    columns.readOnly = false;
  }
  if (canvasProperties.generateInfo.renderPage === "custom") {
    height.readOnly = false;
    width.readOnly = false;
  } else {
    height.readOnly = true;
    width.readOnly = true;
  }
});

// For Saving and Retrieving

document.getElementById("auto-save").addEventListener("change", (e) => {
  ifAutoSave = e.target.checked;
  if (ifAutoSave) {
    saveWorker.postMessage({ stopSaving: false });
    saveToFile(true);
  } else {
    saveWorker.postMessage({ stopSaving: true });
  }
});
document.querySelector(".save").addEventListener("click", async () => {
  saveWorker.postMessage({ stopSaving: false });
  saveToFile();
});
saveWorker.onmessage = (message) => {
  const messageData = message.data;
  if ("notify" in messageData) {
    notify(messageData.notify);
  }
  if ("newStorage" in messageData) {
    // No longer caching in localStorage — Localbase is the source of truth
  }
  if ("autoSave" in messageData && messageData.autoSave) {
    saveToFile(true);
  }
};


document
  .getElementById("retrieve-file")
  .addEventListener("change", (e) => retrieveFile(e));
async function retrieveFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = async () => {
    const jsonData = JSON.parse(reader.result);
    importLoaded(jsonData, false);
  };
}


document.querySelector(".generateButton").addEventListener("click", () => {
  document.querySelector(".generate").style.display = "flex";
  
  if (canvasProperties.generateInfo.renderPage === "auto") {
    const canvasDiv = canvassDiv.getBoundingClientRect();
    canvasProperties.generateInfo.renderWidth = canvasDiv.width;
    canvasProperties.generateInfo.renderHeight = canvasDiv.height;
  }
  
  document.getElementById("renderWidth").value = changeValues(
    canvasProperties.generateInfo.renderWidth,
  );
  document.getElementById("renderHeight").value = changeValues(
    canvasProperties.generateInfo.renderHeight,
  );
  document.getElementById("renderPage").value = canvasProperties.generateInfo.renderPage;
  document.getElementById("noPerRow").value = canvasProperties.generateInfo.noPerRow;
  document.getElementById("noPerColumn").value = canvasProperties.generateInfo.noPerColumn;
  document.getElementById("quality").value = canvasProperties.generateInfo.quality;
  document.getElementById("spacing").value = changeValues(canvasProperties.generateInfo.spacing);
  document.getElementById("batchSize").value = canvasProperties.generateInfo.batchSize;
  
  const toggleReadOnly = (isAuto) => {
    document.getElementById("noPerRow").readOnly = isAuto;
    document.getElementById("noPerColumn").readOnly = isAuto;
    document.getElementById("renderWidth").readOnly = isAuto;
    document.getElementById("renderHeight").readOnly = isAuto;
  };
  
  toggleReadOnly(canvasProperties.generateInfo.renderPage === "auto");
  
  const handleUpdate = (e) => {
    const id = e.target.id;
    if (id === "renderPage") {
      const val = e.target.value;
      canvasProperties.generateInfo.renderPage = val;
      const isAuto = val === "auto";
      toggleReadOnly(isAuto);
      if (isAuto) {
        const canvasDiv = canvassDiv.getBoundingClientRect();
        canvasProperties.generateInfo.renderWidth = canvasDiv.width;
        canvasProperties.generateInfo.renderHeight = canvasDiv.height;
        document.getElementById("renderWidth").value = changeValues(canvasDiv.width);
        document.getElementById("renderHeight").value = changeValues(canvasDiv.height);
        document.getElementById("noPerRow").value = 1;
        document.getElementById("noPerColumn").value = 1;
        canvasProperties.generateInfo.noPerRow = 1;
        canvasProperties.generateInfo.noPerColumn = 1;
      }
    } else if (
      id === "noPerRow" ||
      id === "noPerColumn" ||
      id === "quality" ||
      id === "batchSize"
    ) {
      canvasProperties.generateInfo[id] = Number(e.target.value) || 1;
    } else if (id === "renderWidth" || id === "renderHeight" || id === "spacing") {
      canvasProperties.generateInfo[id] = backValues(Number(e.target.value) || 0);
    }
  };

  document.querySelectorAll(".generate input, .generate select").forEach((el) => {
    el.removeEventListener("input", el._genListener);
    el.removeEventListener("change", el._genListener);
    el._genListener = handleUpdate;
    el.addEventListener("input", handleUpdate);
    el.addEventListener("change", handleUpdate);
  });
});

document.querySelector(".saveAsImage").addEventListener("click", saveAsImage);
document.querySelector(".saveAsImage").addEventListener("click", saveAsImage);







editclip.addEventListener("click", () => {
  if (objectProperties.clippedObject === null) return;
  if (objectProperties.clippedObject.clipped !== "editclip") {
    objectProperties.clippedObject = objectProperties.clippedObject;
    objectProperties.previousClip = objectProperties.clippedObject.clipped;
    objectProperties.clippedObject.clipped = "editclip";
    objectProperties.clippedObject.clips.forEach((clip) => objectProperties.objects.push(clip));
    editclip.textContent = "Done";
    if (objectProperties.clippedObject.opacity > 80) {
      objectProperties.previousOpacity = objectProperties.clippedObject.opacity;
      objectProperties.clippedObject.opacity = 80;
    }
  } else {
    objectProperties.clippedObject.clipped = objectProperties.previousClip;
    objectProperties.clippedObject.opacity = objectProperties.previousOpacity;
    objectProperties.clippedObject.clips.forEach((clip) => {
      let index = objectProperties.objects.indexOf(clip);
      objectProperties.objects.splice(index, 1);
    });
    editclip.textContent = "Edit Clip";
    objectProperties.selectedObj = objectProperties.clippedObject;
    objectProperties.clippedObject = null;
    objectProperties.previousClip = null;
  }
});
let toggleHome = "flex";

document.getElementById("home-button").addEventListener("click", () => {
  document.getElementById("home-menu").style.display = toggleHome;
  toggleHome = toggleHome === "flex" ? "none" : "flex";
});


document.querySelector(".snip").addEventListener("click", () => {
  if (objectProperties.clipped === null) {
    if (objectProperties.selectedObj && objectProperties.selectedObj.clipped === "none") {
      objectProperties.clipped = objectProperties.selectedObj;
      canvas.style.cursor = "pointer";
    }
  } else {
    objectProperties.clipped = null;
    canvas.style.cursor = "default";
  }
});
document
  .querySelector(".add-image input")
  .addEventListener("change", (e) => addImage(e));


const debouncedChangeProperties = debounce((e) => {
  if (objectProperties.selectedObj && typeof objectProperties.selectedObj.changeProperties === "function") {
    objectProperties.selectedObj.changeProperties(e);
  }
}, 500);

['input', 'change'].forEach(eventType => {
  propertiesBar.addEventListener(eventType, (e) => {
    
    // Check if the target is one of our inputs
    if (e.target.matches("input[type='text'], input[type='number'], input[type='color'], textarea")) {
       debouncedChangeProperties(e);
    }
  });
});

document.addEventListener("keydown", async (e) => {
 keyDown(e)
});

canvas.addEventListener("mousedown", (event) => {
  cMousedown(event);
});

canvas.addEventListener("dblclick", (event) => {
  cDoubleClick(event);
});

window.addEventListener("mouseup", wMouseUp);
canvas.addEventListener("mouseup", cMouseUp);
canvas.addEventListener("mouseleave", cMouseLeave);

canvas.addEventListener("mousemove", (event) => {
  cMouseMove(event);
});
let lastTouch = 0;
canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    const currentTime = new Date().getTime();
    const touchLength = currentTime - lastTouch;

    if (touchLength < 300 && touchLength > 0) {
      cDoubleClick(event.touches[0]);
    } else {
      cMousedown(event.touches[0]);
    }

    lastTouch = currentTime;
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    cMouseMove(event.touches[0]);
  },
  { passive: false },
);
canvas.addEventListener("touchend", () => {
  cMouseUp();
  cMouseLeave();
});
window.addEventListener("touchend", wMouseUp);



window.Tools = Tools;
window.addImage = addImage;
window.align = align;
window.group = group;
window.changeOrientation = changeOrientation;
window.undo = undo;
window.redo = redo;
window.flip = flip;
window.cancelGenerate = cancelGenerate;
window.generateCard = generateCard;
window.saveToFile = saveToFile;
window.saveAsPDF = saveAsPDF;
window.saveAsImage = saveAsImage;
window.importLoaded = importLoaded;
window.notify = notify;

requestDraw();
