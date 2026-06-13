import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import requestDraw from "../utils/draw.js";

let undoObject = [];
let redoObject = [];
export function undo() {
  if (undoObject.length > 1) {
    redoObject.push(undoObject.pop());
    objectProperties.objects = cloneObject(undoObject[undoObject.length - 1]);
    if (objectProperties.pen !== null && objectProperties.objects[objectProperties.objects.length - 1].type === "line") {
      objectProperties.pen = objectProperties.objects[objectProperties.objects.length - 1];
    } else objectProperties.selectedObj = objectProperties.objects[objectProperties.objects.length - 1];
    requestDraw();
  }
  console.log(undoObject)
}

export function redo() {
  if (redoObject.length > 0) {
    const redoState = redoObject.pop();
    undoObject.push(redoState);
    objectProperties.objects = cloneObject(redoState);
    if (objectProperties.pen !== null && objectProperties.objects[objectProperties.objects.length - 1].type === "line") {
      objectProperties.pen = objectProperties.objects[objectProperties.objects.length - 1];
    } else objectProperties.selectedObj = objectProperties.objects[objectProperties.objects.length - 1];
    requestDraw();
  }
}
function cloneObject(object) {
  return object.map((obj) => obj.showClone(true));
}
export function saveState() {
  undoObject.push(cloneObject(objectProperties.objects));
  redoObject = [];
}
