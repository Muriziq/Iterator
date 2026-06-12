import { objectProperties } from "../variable.js";
import { notification } from "../constants.js";
import requestDraw from "./draw.js";
import { cloneObject, undoObject, redoObject } from "../state/undo.js";

export function flip(value) {
  if (objectProperties.selectedObj) {
    if (value === "x") {
      objectProperties.selectedObj.scaleX *= -1;
    } else {
      objectProperties.selectedObj.scaleY *= -1;
    }
    undoObject.push(cloneObject(objectProperties.objects));
    redoObject.length = 0;
    requestDraw();
  }

  if (objectProperties.multipleSelect && objectProperties.multipleSelectArr.length > 0) {
    if (value === "x") {
      objectProperties.multipleSelectArr.forEach((obj) => (obj.scaleX *= -1));
    } else {
      objectProperties.multipleSelectArr.forEach((obj) => (obj.scaleY *= -1));
    }
    undoObject.push(cloneObject(objectProperties.objects));
    redoObject.length = 0;
    requestDraw();
  }
}

export function notify(name) {
  notification.textContent = name;
  notification.style.display = "block";
  setTimeout(() => (notification.style.display = "none"), 1500);
}

export function cancelGenerate() {
  document.querySelector(".generate").style.display = "none";
}
