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
    if(    objectProperties.multipleSelect && objectProperties.multipleSelectArr.length > 0){
      multipleSelectFunction();
    }
    rebuildSubArrays();
    requestDraw(false);
  }
}

export function redo() {
  if (redoObject.length > 0) {
    const redoState = redoObject.pop();
    undoObject.push(redoState);
    objectProperties.objects = cloneObject(redoState);
    if (objectProperties.pen !== null && objectProperties.objects[objectProperties.objects.length - 1].type === "line") {
      objectProperties.pen = objectProperties.objects[objectProperties.objects.length - 1];
    } else objectProperties.selectedObj = objectProperties.objects[objectProperties.objects.length - 1];
  if(objectProperties.multipleSelect && objectProperties.multipleSelectArr.length > 0){
      multipleSelectFunction();
    }
    rebuildSubArrays();
    requestDraw(false);
  }
}
function cloneObject(object) {
  return object.map((obj) => obj.showClone(true));
}
export function saveState() {
  undoObject.push(cloneObject(objectProperties.objects));
  redoObject = [];
}

function getAllObjects(list) {
  const result = [];
  if (!list) return result;
  list.forEach((obj) => {
    result.push(obj);
    if (obj.list) {
      result.push(...getAllObjects(obj.list));
    }
    if (obj.clips) {
      result.push(...getAllObjects(obj.clips));
    }
  });
  return result;
}

export function rebuildSubArrays() {
  const allObjs = getAllObjects(objectProperties.objects);
  objectProperties.images = allObjs.filter(obj => obj.type === "image");
  objectProperties.textBoxes = allObjs.filter(obj => obj.type === "text");
}
