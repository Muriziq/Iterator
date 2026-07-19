import { canvas, editclip, width, height, db, thresholds } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import { getMousePos } from "./mousePos.js";
import TextBox from "../models/text.js";
import Tools from "../Tools/tools.js";
import requestDraw from "../utils/draw.js";
import { undo, redo, saveState, rebuildSubArrays } from "../state/undo.js";
import { multipleSelectFunction, drawingObject } from "../state/canvas.js";
import { align, group, zoomToRect } from "../Tools/others.js";
import { bringToFront, sendToBack, pageUp, pageDown } from "../Tools/pageTo.js";
import { saveToFile } from "../state/save.js";
import { flip, notify } from "../utils/uiHelpers.js";
import { copyToClipboard, cutToClipboard, pasteFromClipboard } from "./clipboard.js";

export function cMousedown(event) {
  for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
    objectProperties.objects[i].isDoubleClicked = false;
  }
  if (objectProperties.startPanning) {
    objectProperties.isPanning = true;
    objectProperties.startX = event.clientX;
    objectProperties.startY = event.clientY;
    return;
  }
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });
  objectProperties.isDraggingObject = false;

  if (objectProperties.isDrawing !== null) {
    if (objectProperties.isDrawing === "text") {
      const text = new TextBox(pos.x, pos.y);
      objectProperties.objects.push(text);
      objectProperties.textBoxes.push(text);
      text.doubleClicked(pos);
      objectProperties.isDrawing = null;
      objectProperties.selectedObj = text;
      objectProperties.selectedObj.formatProperties();
      Tools("moveTool");
    } else {
      objectProperties.drawingStart = true;
      objectProperties.drawingCoordinate.start = { x: pos.x, y: pos.y };
      objectProperties.drawingCoordinate.end = { x: pos.x, y: pos.y };
    }
  } else if (objectProperties.pen !== null) {
    objectProperties.pen.drawPen(pos);
    objectProperties.selectedObj = objectProperties.pen;
    objectProperties.selectedObj.formatProperties();
  } else if (objectProperties.clipped !== null) {
    for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
      if (
        objectProperties.objects[i].whatSelected(pos) &&
        objectProperties.objects[i] !== objectProperties.clipped &&
        objectProperties.objects[i].clips !== null
      ) {
        objectProperties.clipped.clipped = "objectProperties.clipped";

        const objectsCoordinate = objectProperties.objects[i].whereToSnap().pos;
        const clippedCoordinate = objectProperties.clipped.whereToSnap().pos;

        if (
          clippedCoordinate.x >
          objectsCoordinate.x + objectsCoordinate.width
        ) {
          objectProperties.clipped.changeLocation(
            objectsCoordinate.x +
              (objectsCoordinate.width - clippedCoordinate.width) / 2,
            "x",
          );
          objectProperties.clipped.changeLocation(
            objectsCoordinate.y +
              (objectsCoordinate.height - clippedCoordinate.height) / 2,
            "y",
          );
        }
        objectProperties.clipped.clipper = objectProperties.objects[i].id;
        objectProperties.objects[i].clips.push(objectProperties.clipped);

        const index = objectProperties.objects.indexOf(
          objectProperties.clipped,
        );
        objectProperties.selectedObj = objectProperties.objects[i];
        objectProperties.objects.splice(index, 1);
        objectProperties.clipped = null;
        break;
      }
    }

    if (objectProperties.clipped === null) {
      notify("Clipped");
      Tools("moveTool");
      return;
    } else {
      notify("Select An Object");
    }
  } else if (
    objectProperties.clippedObject !== null &&
    objectProperties.previousClip !== null
  ) {
    editclip.style.display = "block";

    for (let i = objectProperties.clippedObject.clips.length - 1; i >= 0; i--) {
      if (objectProperties.clippedObject.clips[i].whatSelected(pos)) {
        objectProperties.selectedObj = objectProperties.clippedObject.clips[i];
        objectProperties.isDraggingObject = true;
        objectProperties.isRotatingObject = false;
        objectProperties.selectedObj.isDoubleClicked = false;
        objectProperties.selectedObj.formatProperties();
        break;
        return;
      }
    }
  } else if (objectProperties.multipleSelect) {
    for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
      if (objectProperties.objects[i].whatSelected(pos)) {
        if (
          !objectProperties.multipleSelectArr.includes(
            objectProperties.objects[i],
          )
        ) {
          objectProperties.multipleSelectArr.push(objectProperties.objects[i]);
          break;
        }
      }
    }
    if (objectProperties.multipleSelectArr.length === 0) {
      objectProperties.isDrawing = "objectProperties.multipleSelect";
      objectProperties.drawingStart = true;
      objectProperties.drawingCoordinate.start = { x: pos.x, y: pos.y };
      objectProperties.drawingCoordinate.end = { x: pos.x, y: pos.y };
    }

    if (objectProperties.multipleSelectArr.length > 0) {
      multipleSelectFunction();
      if (
        pos.x >= objectProperties.multipleSelectCoor.start.x &&
        pos.x <= objectProperties.multipleSelectCoor.end.x &&
        pos.y >= objectProperties.multipleSelectCoor.start.y &&
        pos.y <= objectProperties.multipleSelectCoor.end.y
      ) {
        objectProperties.isDraggingObject = true;
        objectProperties.multipleSelectArr.forEach(
          (obj) => (obj.isDoubleClicked = false),
        );
        objectProperties.selectedObj = null;
      }
    }
  } else {
    let hitObject = null;

    for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
      if (objectProperties.objects[i].whatSelected(pos)) {
        hitObject = objectProperties.objects[i];
        break;
      }
    }

    if (hitObject !== null) {
      objectProperties.selectedObj = hitObject;

      if (
        objectProperties.selectedObj.clips &&
        objectProperties.selectedObj.clips.length > 0
      ) {
        editclip.style.display = "block";
        objectProperties.clippedObject = objectProperties.selectedObj;
      } else {
        editclip.style.display = "none";
      }
      objectProperties.isRotatingObject = false;
      objectProperties.selectedObj.isDoubleClicked = false;
      objectProperties.selectedObj.formatProperties();
      objectProperties.isDraggingObject = true;
    } else {
      objectProperties.selectedObj = null;
      editclip.style.display = "none";
      objectProperties.startX = event.clientX;
      objectProperties.startY = event.clientY;
    }
  }

  objectProperties.lastMouseX = pos.x;
  objectProperties.lastMouseY = pos.y;
  requestDraw(false);
}
export function cDoubleClick(event) {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });

  for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
    if (objectProperties.objects[i].whatSelected(pos)) {
      objectProperties.selectedObj = objectProperties.objects[i];

      objectProperties.selectedObj.doubleClicked(pos);

      requestDraw(false);
      break;
    }
  }
}
export async function wMouseUp() {
  if (objectProperties.drawingStart) {
    objectProperties.drawingStart = false;

    if (objectProperties.isDrawing === "zoom") {
      const x = Math.min(
        objectProperties.drawingCoordinate.start.x,
        objectProperties.drawingCoordinate.end.x,
      );
      const y = Math.min(
        objectProperties.drawingCoordinate.start.y,
        objectProperties.drawingCoordinate.end.y,
      );
      const w = Math.abs(
        objectProperties.drawingCoordinate.end.x -
          objectProperties.drawingCoordinate.start.x,
      );
      const h = Math.abs(
        objectProperties.drawingCoordinate.end.y -
          objectProperties.drawingCoordinate.start.y,
      );

      zoomToRect({ x: x, y: y, width: w, height: h });
    } else if (
      objectProperties.isDrawing === "objectProperties.multipleSelect"
    ) {
      const x = Math.min(
        objectProperties.drawingCoordinate.start.x,
        objectProperties.drawingCoordinate.end.x,
      );
      const y = Math.min(
        objectProperties.drawingCoordinate.start.y,
        objectProperties.drawingCoordinate.end.y,
      );
      const w = Math.abs(
        objectProperties.drawingCoordinate.end.x -
          objectProperties.drawingCoordinate.start.x,
      );
      const h = Math.abs(
        objectProperties.drawingCoordinate.end.y -
          objectProperties.drawingCoordinate.start.y,
      );

      objectProperties.objects.forEach((obj) => {
        const coor = obj.whereToSnap().pos;
        if (
          coor.x >= x &&
          coor.x + coor.width <= x + w &&
          coor.y >= y &&
          coor.y + coor.height <= y + h
        ) {
          objectProperties.multipleSelectArr.push(obj);
        }
      });
      objectProperties.isDrawing = null;
      objectProperties.multipleSelect = true;
      if (objectProperties.multipleSelectArr.length > 0) {
        multipleSelectFunction();
      }
      requestDraw(false);
    } else {
      const drawedObject = drawingObject(true);
      if (objectProperties.isDrawing === "image") {
        objectProperties.objects.push(drawedObject.newImage);
        objectProperties.images.push(drawedObject.newImage);
        objectProperties.drawingImage = null;
        await db.collection(`img${canvasProperties.formerName}`).add({
          id: drawedObject.imageId,
          image: drawedObject.actualFile,
          entryDate: new Date().getTime(),
        });
        objectProperties.selectedObj = drawedObject.newImage;
      } else {
        objectProperties.objects.push(drawedObject);
        objectProperties.selectedObj = drawedObject;
      }

      Tools("moveTool");
      objectProperties.selectedObj.formatProperties();
      saveState();
    }
  }

  if (
    objectProperties.isDraggingObject ||
    objectProperties.isRotatingObject ||
    objectProperties.multipleSelect
  ) {
    saveState();
  }

  objectProperties.isDraggingObject = false;
  objectProperties.isRotatingObject = false;
  objectProperties.isPanning = false;

  requestDraw(false);
}
export function cMouseUp() {
  if (objectProperties.selectedObj && !objectProperties.pen) {
    objectProperties.selectedObj.formatProperties();
  }
  requestDraw(false);
}
export function cMouseLeave() {
  if (!objectProperties.isDraggingObject && !objectProperties.drawingStart) {
    objectProperties.isPanning = false;
  }
}
export function cMouseMove(event) {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });
  let changed = false;

  if (objectProperties.isPanning) {
    objectProperties.panX += event.clientX - objectProperties.startX;
    objectProperties.panY += event.clientY - objectProperties.startY;

    objectProperties.startX = event.clientX;
    objectProperties.startY = event.clientY;
    changed = true;
  }

  if (objectProperties.drawingStart) {
    objectProperties.drawingCoordinate.end = { x: pos.x, y: pos.y };
    changed = true;
  } else if (
    objectProperties.isDraggingObject &&
    objectProperties.multipleSelect &&
    objectProperties.multipleSelectArr.length > 0
  ) {
    const deltaX = pos.x - objectProperties.lastMouseX;
    const deltaY = pos.y - objectProperties.lastMouseY;

    objectProperties.multipleSelectArr.forEach((obj) => {
      obj.moveClip(deltaX, deltaY);
    });
    multipleSelectFunction();

    changed = true;
  } else if (
    (objectProperties.isDraggingObject || objectProperties.isRotatingObject) &&
    objectProperties.selectedObj
  ) {
    objectProperties.selectedObj.formatSelected(pos);
    changed = true;
  }

  objectProperties.lastMouseX = pos.x;
  objectProperties.lastMouseY = pos.y;

  if (changed) {
    requestDraw(false);
  }
}

export async function keyDown(e) {
  const tag = e.target.tagName;
  const isTyping =
    tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
  // console.log(e.key)
  if (isTyping) return;
  if ((e.ctrlKey && e.key === "-") || (e.ctrlKey && e.key === "=")) return;
  e.preventDefault();

  if (e.code === "ArrowUp") {
    if (objectProperties.selectedObj !== null)
      objectProperties.selectedObj.moveClip(0, -thresholds.arrowKeys());
    else if (
      objectProperties.multipleSelect &&
      objectProperties.multipleSelectArr.length > 0
    ) {
      objectProperties.multipleSelectArr.forEach((obj) =>
        obj.moveClip(0, -thresholds.arrowKeys()),
      );
      multipleSelectFunction();
    } else {
      objectProperties.panY += -thresholds.arrowKeys();
    }
  } else if (e.code === "ArrowDown") {
    if (objectProperties.selectedObj !== null)
      objectProperties.selectedObj.moveClip(0, thresholds.arrowKeys());
    else if (
      objectProperties.multipleSelect &&
      objectProperties.multipleSelectArr.length > 0
    ) {
      objectProperties.multipleSelectArr.forEach((obj) =>
        obj.moveClip(0, thresholds.arrowKeys()),
      );
      multipleSelectFunction();
    } else objectProperties.panY += thresholds.arrowKeys();
  } else if (e.code === "ArrowLeft") {
    if (objectProperties.selectedObj !== null)
      objectProperties.selectedObj.moveClip(-thresholds.arrowKeys(), 0);
    else if (
      objectProperties.multipleSelect &&
      objectProperties.multipleSelectArr.length > 0
    ) {
      objectProperties.multipleSelectArr.forEach((obj) =>
        obj.moveClip(-thresholds.arrowKeys(), 0),
      );
      multipleSelectFunction();
    } else objectProperties.panX += -thresholds.arrowKeys();
  } else if (e.code === "ArrowRight") {
    if (objectProperties.selectedObj !== null)
      objectProperties.selectedObj.moveClip(thresholds.arrowKeys(), 0);
    else if (
      objectProperties.multipleSelect &&
      objectProperties.multipleSelectArr.length > 0
    ) {
      objectProperties.multipleSelectArr.forEach((obj) =>
        obj.moveClip(thresholds.arrowKeys(), 0),
      );
      multipleSelectFunction();
    } else objectProperties.panX += thresholds.arrowKeys();
  } else if (
    e.ctrlKey &&
    e.key.toLowerCase() === "d" &&
    objectProperties.selectedObj !== null
  ) {
    Tools("duplicate");
  } else if (
    e.shiftKey &&
    e.key.toLowerCase() === "@" &&
    objectProperties.selectedObj !== null
  ) {
    zoomToRect(objectProperties.selectedObj.whereToSnap().pos);
  } else if (e.ctrlKey && e.key.toLowerCase() === "a") {
    Tools("multipleSelection");
    objectProperties.multipleSelectArr = [...objectProperties.objects];
    multipleSelectFunction();
  } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
    copyToClipboard();
  } else if (e.ctrlKey && e.key.toLowerCase() === "x") {
    cutToClipboard();
  } else if (e.ctrlKey && e.key.toLowerCase() === "v") {
    pasteFromClipboard();
  } else if (
    e.ctrlKey &&
    e.key.toLowerCase() === "g" &&
    objectProperties.multipleSelectArr.length > 1
  ) {
    group();
  } else if (e.ctrlKey && e.key.toLowerCase() === "s") {
    saveToFile();
  } else if (
    e.ctrlKey &&
    e.key.toLowerCase() === "u" &&
    objectProperties.selectedObj !== null &&
    objectProperties.selectedObj.type === "group"
  ) {
    objectProperties.selectedObj.list.forEach((l) =>
      objectProperties.objects.push(l),
    );
    const index = objectProperties.objects.indexOf(
      objectProperties.selectedObj,
    );
    objectProperties.objects.splice(index, 1);
    rebuildSubArrays();
    objectProperties.selectedObj = null;
    Tools("moveTool");
  } else if (
    e.key.toLowerCase() === "delete" &&
    objectProperties.selectedObj !== null
  ) {
    Tools("delete");
  } else if (e.key.toLowerCase() === "pageup") {
    if (objectProperties.selectedObj !== null)
      pageUp(objectProperties.selectedObj);
  } else if (e.key.toLowerCase() === "pagedown") {
    if (objectProperties.selectedObj !== null)
      pageDown(objectProperties.selectedObj);
  } else if (e.key.toLowerCase() === "home") {
    if (objectProperties.selectedObj)
      bringToFront(objectProperties.selectedObj);
  } else if (e.key.toLowerCase() === "end") {
    if (objectProperties.selectedObj) sendToBack(objectProperties.selectedObj);
  } else if (e.key.toLowerCase() === "l") align("left");
  else if (e.key.toLowerCase() === "c") align("centerX");
  else if (e.key.toLowerCase() === "r") align("right");
  else if (e.key.toLowerCase() === "t") align("top");
  else if (e.key.toLowerCase() === "e") align("centerY");
  else if (e.key.toLowerCase() === "b") align("bottom");
  else if (e.key.toLowerCase() === "q") flip("x");
  else if (e.key.toLowerCase() === "w") flip("y");
  else if (e.key.toLowerCase() === "m") {
    Tools("moveTool");
  } else if (e.key.toLowerCase() === "s") {
    Tools("multipleSelection");
  } else if (e.key.toLowerCase() === "h") {
    Tools("panTool");
  } else if (e.ctrlKey && e.key.toLowerCase() === "z") {
    undo();
    return;
  } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
    redo();
    return;
  } else if (e.key.toLowerCase() === "z") {
    Tools("zoom");
  } else if (e.key.toLowerCase() === "p") {
    Tools("addLine");
  }

  requestDraw(false);
}
