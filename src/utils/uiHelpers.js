import { objectProperties } from "../variable.js";
import { notification } from "../constants.js";
import requestDraw from "./draw.js";
export function flip(value) {
  if (objectProperties.selectedObj) {
    if (value === "x") {
      objectProperties.selectedObj.scaleX *= -1;
    } else {
      objectProperties.selectedObj.scaleY *= -1;
    }
    requestDraw();
  }

  if (objectProperties.multipleSelect && objectProperties.multipleSelectArr.length > 0) {
    if (value === "x") {
      objectProperties.multipleSelectArr.forEach((obj) => (obj.scaleX *= -1));
    } else {
      objectProperties.multipleSelectArr.forEach((obj) => (obj.scaleY *= -1));
    }
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

export  function debounce(func, wait) {
  let timeout; // This holds the ID of the current timer
  
  return function(...args) {
    // 1. Clear the existing timer if the user typed again
    clearTimeout(timeout);
    
    // 2. Start a brand new timer
    timeout = setTimeout(() => {
      func.apply(this, args); // Run the actual function after the wait
    }, wait);
  };
}