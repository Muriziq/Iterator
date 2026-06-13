import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import Tools from "../Tools/tools.js";
import Group from "../models/group.js";
import requestDraw from "../utils/draw.js";
import { multipleSelectFunction } from "../state/canvas.js";

export function align(arg) {
  let last;
  let other;
  let value;
  let valid = false;
  if (objectProperties.multipleSelectArr.length > 1) {
    last = objectProperties.multipleSelectArr[objectProperties.multipleSelectArr.length - 1].whereToSnap();
    other = objectProperties.multipleSelectArr.slice(0, -1);
    valid = true;
  } else if (objectProperties.selectedObj) {
    const offsetX = (canvas.width - canvasProperties.measurement.width) / 2;
    const offsetY = (canvas.height - canvasProperties.measurement.height) / 2;

    last = {
      x: [
        offsetX,
        offsetX + canvasProperties.measurement.width / 2,
        offsetX + canvasProperties.measurement.width,
      ],
      y: [
        offsetY,
        offsetY + canvasProperties.measurement.height / 2,
        offsetY + canvasProperties.measurement.height,
      ],
    };
    other = [objectProperties.selectedObj];
    valid = true;
  }
  if (!valid) return;

  switch (arg) {
    case "left":
      value = last.x[0];
      break;
    case "centerX":
      value = last.x[1];
      break;
    case "right":
      value = last.x[2];
      break;
    case "top":
      value = last.y[0];
      break;
    case "centerY":
      value = last.y[1];
      break;
    case "bottom":
      value = last.y[2];
      break;
  }
  for (let oth = 0; oth < other.length; oth++) {
    const otherSnap = other[oth].whereToSnap().pos;
    switch (arg) {
      case "left":
        other[oth].changeLocation(value, "x");
        break;
      case "centerX":
        other[oth].changeLocation(value - otherSnap.width / 2, "x");
        break;
      case "right":
        other[oth].changeLocation(value - otherSnap.width, "x");
        break;
      case "top":
        other[oth].changeLocation(value, "y");
        break;
      case "centerY":
        other[oth].changeLocation(value - otherSnap.height / 2, "y");
        break;
      case "bottom":
        other[oth].changeLocation(value - otherSnap.height, "y");
    }
  }
  if (objectProperties.multipleSelectArr.length > 1) multipleSelectFunction();
  requestDraw();
}
export function group() {
  if (objectProperties.multipleSelectArr.length > 1) {
    const newGroup = new Group(objectProperties.multipleSelectArr);
    objectProperties.multipleSelectArr.forEach((arr) => {
      const index = objectProperties.objects.indexOf(arr);
      objectProperties.objects.splice(index, 1);
    });
    objectProperties.multipleSelectArr = [];
    objectProperties.multipleSelect = false;
    objectProperties.objects.push(newGroup);
    objectProperties.selectedObj = newGroup;
    requestDraw();
    Tools("moveTool");
    newGroup.formatProperties();
  }
}

export function zoomToRect(rect) {
  if (rect.width <= 0 || rect.height <= 0) return;

  const padding = 20; // optional space around the rect

  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;

  const scaleX = availableWidth / rect.width;
  const scaleY = availableHeight / rect.height;

  objectProperties.scale = Math.min(scaleX, scaleY);

  const rectCenterX = rect.x + rect.width / 2;
  const rectCenterY = rect.y + rect.height / 2;

  objectProperties.panX = canvas.width / 2 - rectCenterX * objectProperties.scale;
  objectProperties.panY = canvas.height / 2 - rectCenterY * objectProperties.scale;

  requestDraw();
}