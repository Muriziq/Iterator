import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties } from "../variable.js";
import Line from "../models/line.js";
import requestDraw from "../utils/draw.js";
import { bringToFront, sendToBack, pageUp, pageDown } from "../Tools/pageTo.js";
import { zoomToRect } from "../Tools/others.js";
import { notify } from "../utils/uiHelpers.js";
import LoaderManager from "../models/loader.js";
import { canvasSize, adapt } from "../state/canvas.js";
import { rebuildSubArrays } from "../state/undo.js";
export default async function Tools(tool) {
  document.querySelectorAll(".leftSidebar button").forEach((button) => {
    if (objectProperties.pen !== null && objectProperties.pen.points.length > 0) {
      if (button.id !== "addLine") button.classList.remove("active");
      else {
        button.classList.add("active");
      }
    } else {
      if (button.id === tool) {
        button.classList.add("active");
      } else button.classList.remove("active");
    }
  });
  if (objectProperties.pen !== null && objectProperties.pen.points.length > 0) return;
  objectProperties.isDrawing = null;
  objectProperties.multipleSelect = false;
  objectProperties.multipleSelectArr = [];
  objectProperties.startPanning = false;
  objectProperties.pen = null;
  propertiesBar.innerHTML = "";
  switch (tool) {
    case "moveTool":
      canvas.style.cursor = "default";
      break;

    case "multipleSelection":
      objectProperties.selectedObj = null;
      canvas.style.cursor = "default";
      objectProperties.multipleSelect = true;
      break;
    case "panTool":
      canvas.style.cursor = "grab";
      objectProperties.selectedObj = null;
      objectProperties.startPanning = !objectProperties.startPanning;

      break;
    case "addRectangle":
      canvas.style.cursor = "crosshair";
      objectProperties.selectedObj = null;
      objectProperties.isDrawing = "rect";
      break;

    case "addEllipse":
      canvas.style.cursor = "crosshair";
      objectProperties.selectedObj = null;
      objectProperties.isDrawing = "ellipse";
      break;
    case "addGuide":
      objectProperties.selectedObj = null;
      canvas.style.cursor = "crosshair";
      objectProperties.isDrawing = "guide";
    case "addLine":
      objectProperties.selectedObj = null;
      canvas.style.cursor = "crosshair";
      const line = new Line();
      objectProperties.pen = line;
      objectProperties.objects.push(line);
      requestDraw();
      break;

    case "addPolygon":
      objectProperties.selectedObj = null;
      canvas.style.cursor = "crosshair";
      objectProperties.selectedObj = null;
      objectProperties.isDrawing = "polygon";
      break;

    case "addTextbox":
      objectProperties.selectedObj = null;
      canvas.style.cursor = "inherit";
      objectProperties.isDrawing = "text";
      break;

    case "zoom":
      objectProperties.selectedObj = null;
      propertiesBar.innerHTML = `
      <div>
     <div style="display:flex;flex-direction:row;align-items:center; justify-content:center; gap:1rem;border:none">
    <button class="zoomin"><img src="imagess/zoom-in.svg"></button>
    <button class="zoomout"><img src="imagess/zoom-out.svg"></button>
  </div>  
        <button class="fitToPage imageb">Fit To Page</button>
    <button class="fitToContent imageb">Fit To Content</button> 
      </div>


  `;

      objectProperties.isDrawing = "zoom";
      canvas.style.cursor = "zoom-in";

      const zoomInBtn = propertiesBar.querySelector(".zoomin");
      const zoomOutBtn = propertiesBar.querySelector(".zoomout");
      const fitBtn = propertiesBar.querySelector(".fitToPage");
      const fitContentBtn = propertiesBar.querySelector(".fitToContent");

      let zoomInterval;

      const ZOOM_FACTOR = 1.05;
      const MIN_SCALE = 0.05;
      const MAX_SCALE = 20.0;

      function zoomIn() {
        objectProperties.scale = Math.min(objectProperties.scale * ZOOM_FACTOR, MAX_SCALE);
        requestDraw();
      }

      function zoomOut() {
        objectProperties.scale = Math.max(objectProperties.scale / ZOOM_FACTOR, MIN_SCALE);
        requestDraw();
      }

      /* HOLD TO ZOOM IN */
      zoomInBtn.addEventListener("mousedown", () => {
        zoomIn();
        zoomInterval = setInterval(zoomIn, 30);
      });

      /* HOLD TO ZOOM OUT */
      zoomOutBtn.addEventListener("mousedown", () => {
        zoomOut();
        zoomInterval = setInterval(zoomOut, 30);
      });

      /* STOP WHEN RELEASED */
      window.addEventListener("mouseup", () => {
        clearInterval(zoomInterval);
      });

      /* FIT TO PAGE */
      fitBtn.addEventListener("click", () => {
        // objectProperties.scale = 1;
        // objectProperties.panX = 0;
        // objectProperties.panY = 0;
        // zoomToRect({
        //   x: (canvas.width - canvasProperties.measurement.width) / 2,
        //   y: (canvas.height - canvasProperties.measurement.height) / 2,
        //   width: canvasProperties.measurement.width,
        //   height: canvasProperties.measurement.height,
        // });
        canvasSize()
        requestDraw();
        Tools("zoom");
      });

      /* FIT TO CONTENT */
      fitContentBtn.addEventListener("click", () => {
        const elements = objectProperties.objects.filter(obj => obj.type !== "guide");
        if (elements.length === 0) {
          canvasSize();
          requestDraw();
          return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        elements.forEach((obj) => {
          const snap = obj.whereToSnap();
          if (snap && snap.pos) {
            const { x, y, width, height } = snap.pos;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x + width > maxX) maxX = x + width;
            if (y + height > maxY) maxY = y + height;
          }
        });

        if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
          canvasSize();
          requestDraw();
          return;
        }

        zoomToRect({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });
        requestDraw();
        Tools("zoom");
      });

      requestDraw();
      break;

    case "duplicate":
        if (objectProperties.selectedObj) {
          const cloneObj = objectProperties.selectedObj.showClone();
          const offset = adapt(5);
          cloneObj.moveClip(offset, -offset);
          objectProperties.objects.push(cloneObj);
          objectProperties.selectedObj = cloneObj;
          rebuildSubArrays();
        } else {
          notify("Please Select An Object");
          Tools("moveTool");
        }
      break;

    case "delete":
      if (objectProperties.selectedObj) {
        let index = objectProperties.objects.indexOf(objectProperties.selectedObj);
        objectProperties.objects.splice(index, 1);
        rebuildSubArrays();

        if (objectProperties.selectedObj.clipped === "objectProperties.clipped") {
          const clipIndex = objectProperties.objects.find(
            (obj) => obj.id === objectProperties.selectedObj.clipper,
          );
          if (clipIndex) {
            const selectedIndex = clipIndex.clips.indexOf(objectProperties.selectedObj);
            clipIndex.clips.splice(selectedIndex, 1);
          }
        }
        objectProperties.selectedObj = null;
        propertiesBar.innerHTML = "";
        requestDraw();
      }
      break;
    case "add-image":
      return;

    case "pageTo":
      propertiesBar.innerHTML = `
  <section>
    <button class="bringFront imageb">Bring To Front</button>
    <button class="sendBack imageb">Send To Back</button>
    <button class="pageUp imageb">Page Up</button>
    <button class="pageDown imageb">Page Down</button>
  </section>
  `;
      document.querySelector(".bringFront").addEventListener("click", () => {
        if (objectProperties.selectedObj) bringToFront(objectProperties.selectedObj);
      });
      document.querySelector(".sendBack").addEventListener("click", () => {
        if (objectProperties.selectedObj) sendToBack(objectProperties.selectedObj);
      });
      document.querySelector(".pageUp").addEventListener("click", () => {
        if (objectProperties.selectedObj) pageUp(objectProperties.selectedObj);
      });
      document.querySelector(".pageDown").addEventListener("click", () => {
        if (objectProperties.selectedObj) pageDown(objectProperties.selectedObj);
      });

      break;

    default:
      console.log("Unknown tool:", tool);
      break;
  }
  requestDraw();
}

export async function addImage(e) {
  canvas.style.cursor = "wait";
  const file = e.target.files[0];
  if (!file) return;
  const loader = new LoaderManager(1, "Loading Image..."); // Set max items to the number of selected files
  loader.createLoader();
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await new Promise((resolve) => {
    img.onload = () => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.addEventListener("load", async () => {
        try {
          const imageID = crypto.randomUUID();
          objectProperties.drawingImage = {
            image: img,
            originalFile: imageID,
            aspectRatio: img.height / img.width,
            fileName: file.name,
            actualFile: reader.result,
            imageId: imageID,
          };
          loader.incrementOriginalState();
          canvas.style.cursor = "crosshair";
          objectProperties.isDrawing = "image";
          resolve(true);
        } catch (err) {
          console.error("DB INSERT ERROR:", err);
        }
      });
    };
  });
}