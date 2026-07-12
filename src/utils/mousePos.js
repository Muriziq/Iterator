import { canvas, width, height } from "../constants.js";
import { objectProperties } from "../variable.js";

export function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();

  // Mouse position inside the canvas element
  const screenX = evt.x - rect.left;
  const screenY = evt.y - rect.top;

  // Convert CSS pixels to actual canvas pixels
  const canvasX = screenX * (canvas.width / rect.width);
  const canvasY = screenY * (canvas.height / rect.height);

  // Undo pan + zoom to get world coordinates
  return {
    x: (canvasX - objectProperties.panX) / objectProperties.scale,
    y: (canvasY - objectProperties.panY) / objectProperties.scale,
  };
}
export function reverseMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const screenX = evt.x * objectProperties.scale + objectProperties.panX;
  const screenY = evt.y * objectProperties.scale + objectProperties.panY;
  const canvasX = screenX / (canvas.width / rect.width);
  const canvasY = screenY / (canvas.height / rect.height);
  return {
    x: canvasX,
    y: canvasY,
  };
}
