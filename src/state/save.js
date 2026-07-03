import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties, canvasProperties, defaultFonts, newFonts } from "../variable.js";
import { canvasSize } from "./canvas.js";
import requestDraw from "../utils/draw.js";
import { enableWakeLock, disableWakeLock } from "../utils/screenWake.js";
import Rectangle from "../models/rectangle.js";
import Ellipse from "../models/ellipse.js";
import Polygon from "../models/polygon.js";
import Line from "../models/line.js";
import TextBox from "../models/text.js";
import Images from "../models/images.js";
import Group from "../models/group.js";
import Guide from "../models/guide.js";

let ifAutoSave = false;

export async function importLoaded(jsonData, shouldCanvas = true, saving = false) {
  const { canvasItems, revivableItems } = jsonData.reduce(
    (acc, data) => {
      if (data.type === "canvas") {
        acc.canvasItems.push(data);
      } else {
        acc.revivableItems.push(data);
      }
      return acc;
    },
    { canvasItems: [], revivableItems: [] },
  );

  if (canvasItems.length > 0 && shouldCanvas) {
    canvasProperties.measurement = canvasItems[0].measurement;
    canvasProperties.whatsMeasured = canvasItems[0].whatsMeasured;
    canvasSize();
  }

  const revived = await Promise.all(
    revivableItems.map((item) => reviveObjects(item)),
  );
  objectProperties.objects.push(...revived);
  requestDraw();
  if (saving) {
    ifAutoSave = true;
    document.getElementById("auto-save").checked = true;
    saveWorker.postMessage({ stopSaving: false,deleteData:true,images:JSON.stringify(objectProperties.images)});
    saveToFile(true, true);
  }
}


export async function saveToFile(autosave = false, deleteData = false) {
  const projectDocs = await db.collection("projects").orderBy("entryDate", "desc").get();
  const projectNames = (projectDocs || []).map((p) => p.name);
  let allData = [
    {
      type: "canvas",
      measurement: canvasProperties.measurement,
      whatsMeasured: canvasProperties.whatsMeasured,
      backgroundImage: canvas.toDataURL(),
    },
    ...objectProperties.objects,
  ];
  allData = JSON.stringify(allData);
  let dImage = null;
  if (objectProperties.drawingImage !== null) dImage = { ...objectProperties.drawingImage, image: null };
  if (autosave) {
    saveWorker.postMessage({
      formerName: canvasProperties.formerName,
      names: projectNames,
      allData: allData,
      autoSave: true,
      drawingImage: dImage,
    });
  } else {
    saveWorker.postMessage({
      formerName: canvasProperties.formerName,
      names: projectNames,
      allData: allData,
      justSave: true,
      drawingImage: dImage,
    });
  }
}


export function pauseSaving(){
  saveWorker.postMessage({ stopSaving: true });
  enableWakeLock();
}

export function continueSaving(){
  disableWakeLock();
  if (ifAutoSave) {
    saveWorker.postMessage({ stopSaving: false });
    saveToFile(true);
  }
}

export async function reviveObjects(objData) {
  let instance;

  switch (objData.type) {
    case "rectangle":
      instance = new Rectangle();
      break;
    case "ellipse":
      instance = new Ellipse();
      break;
    case "polygon":
      instance = new Polygon();
      break;
    case "line":
      instance = new Line();
      break;
    case "text":
      instance = new TextBox();
      break;
    case "image":
      instance = new Images();
      break;
    case "group":
      instance = new Group();
      break;
    case "guide":
      instance = new Guide();
      break;
    default:
      console.warn(`Unknown type: ${objData.type}`);
      return null;
  }

  // ✅ Handle group children
  if (objData.type === "group" && objData.list) {
    objData.list = await Promise.all(
      objData.list.map((item) => reviveObjects(item)),
    );
  }
  if (objData.type === "image") {
    if (objData.isConverted) {
      for (let i = 0; i < objData.originalFiles.length; i++) {
        const imageID = crypto.randomUUID();
        await db.collection(`img${canvasProperties.formerName}`).add({
          id: imageID,
          image: objData.originalFiles[i],
          entryDate: new Date().getTime(),
        });
        objData.originalFiles[i] = imageID;
      }
      objData.isConverted = false;
    }
    const revivedImageFile = await db
      .collection(`img${canvasProperties.formerName}`)
      .doc({ id: objData.originalFiles[0] })
      .get();
    const revivedImage = (revivedImageFile && revivedImageFile.image) ? revivedImageFile.image : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const img = new Image();
    img.src = revivedImage;
    await new Promise((resolve) => {
      img.onload = () => {
        objData.image = img;
        objData.selectedFile = objData.originalFiles[0];
        resolve(true);
      };
      img.onerror = () => {
        console.warn("Failed to load image, using fallback");
        const fallbackImg = new Image();
        fallbackImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        fallbackImg.onload = () => {
          objData.image = fallbackImg;
          objData.selectedFile = objData.originalFiles[0];
          resolve(true);
        };
      };
    });
  }
  if (objData.type === "text") {
    objData.textPlace = document.createElement("textarea");
    objData.measurer = false;
      if (newFonts.includes(objData.fontFamily)) {
        const result = await db
          .collection("fonts")
          .doc({ id: objData.fontFamily })
          .get();
        if (result && result.fontData) {
          // Create dynamic @font-face rule
          const style = document.createElement("style");
          const fontCSS = `
        @font-face {
          font-family: '${result.fontFamily}';
          src: url('${result.fontData}') format('${result.fontFormat}');
          font-display: swap;
        }
      `;
          style.textContent = fontCSS;
          document.head.appendChild(style);
        }
      } else if(!defaultFonts.includes(objData.fontFamily) && !newFonts.includes(objData.fontFamily)) {
        objData.fontFamily = "sans-serif";
      }
  }

  // ✅ Handle clips
  if (objData.clips && objData.clips.length > 0) {
    objData.clips = await Promise.all(
      objData.clips.map(async (clip) => {
        // ← Add async
        const reviveClip = await reviveObjects(clip); // ← Add await
        reviveClip.clipper = objData.id;
        return reviveClip;
      }),
    );
  }

  Object.assign(instance, objData);
  if (objData.type === "text") objectProperties.textBoxes.push(instance);
  if (objData.type === "image") objectProperties.images.push(instance);
  return instance;
}