import { canvas, canvassDiv, width, height, thresholds } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import { changeValues } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
import { zoomToRect } from "../Tools/others.js";
import Rectangle from "../models/rectangle.js";
import Ellipse from "../models/ellipse.js";
import Polygon from "../models/polygon.js";
import Images from "../models/images.js";
import Guide from "../models/guide.js";

export function canvasSize() {
  objectProperties.scale = 1;
  objectProperties.panX = 0;
  objectProperties.panY = 0;
  requestDraw();
  const canvassRect = canvas.getBoundingClientRect();
  canvasProperties.measurement.width = Math.min(thresholds.maxCanvasSize(), canvasProperties.measurement.width);
  canvasProperties.measurement.height = Math.min(thresholds.maxCanvasSize(), canvasProperties.measurement.height);
  if (document.activeElement !== width) {
    width.value = changeValues(canvasProperties.measurement.width);
  }
  if (document.activeElement !== height) {
    height.value = changeValues(canvasProperties.measurement.height);
  }
  canvassDiv.style.width = canvasProperties.measurement.width + "px";
  canvassDiv.style.height = canvasProperties.measurement.height + "px";

  canvasProperties.scaleRatio = Math.max(
    canvasProperties.measurement.width / (canvassRect.width - 30),
    canvasProperties.measurement.height / (canvassRect.height - 30),
  );

  if (canvasProperties.scaleRatio > 1) {
    canvasProperties.newWidth = canvassRect.width * canvasProperties.scaleRatio;
    canvasProperties.newHeight = canvassRect.height * canvasProperties.scaleRatio;
    canvas.width = canvasProperties.newWidth;
    canvas.height = canvasProperties.newHeight;
  }
  requestAnimationFrame(() => {
    zoomToRect({
      x: (canvas.width - canvasProperties.measurement.width) / 2,
      y: (canvas.height - canvasProperties.measurement.height) / 2,
      width: canvasProperties.measurement.width,
      height: canvasProperties.measurement.height,
    });
    requestDraw();
  });
}

export function changeOrientation(value) {
  if (value === "potrait" && canvasProperties.measurement.width > canvasProperties.measurement.height) {
    [canvasProperties.measurement.width, canvasProperties.measurement.height] = [
      canvasProperties.measurement.height,
      canvasProperties.measurement.width,
    ];
  } else if (value === "landscape" && canvasProperties.measurement.height > canvasProperties.measurement.width) {
    [canvasProperties.measurement.width, canvasProperties.measurement.height] = [
      canvasProperties.measurement.height,
      canvasProperties.measurement.width,
    ];
  }
  canvasSize();
}


export function drawingObject(original = false) {
  const start = objectProperties.drawingCoordinate.start;
  if (objectProperties.drawingCoordinate.end.x - start.x < 1)
    objectProperties.drawingCoordinate.end.x = start.x + 1;
  if (objectProperties.drawingCoordinate.end.y - start.y < 1)
    objectProperties.drawingCoordinate.end.y = start.y + 1;
  const end = objectProperties.drawingCoordinate.end;
  switch (objectProperties.isDrawing) {
    case "rect":
      return new Rectangle(start.x, start.y, end.x - start.x, end.y - start.y);
    case "ellipse":
      return new Ellipse(
        start.x + (end.x - start.x) / 2,
        start.y + (end.y - start.y) / 2,
        (end.x - start.x) / 2,
        (end.y - start.y) / 2,
      );
    case "polygon":
      return new Polygon(
        start.x + (end.x - start.x) / 2,
        start.y + (end.y - start.y) / 2,
        (end.x - start.x) / 2,
        (end.y - start.y) / 2,
      );
    case "guide":
      return new Guide(
        "vertical",
        start.x)
    case "image":
      if (original) {
        return {
          newImage: new Images(
            start.x,
            start.y,
            objectProperties.drawingImage.image,
            end.x - start.x,
            objectProperties.drawingImage.aspectRatio,
            objectProperties.drawingImage.originalFile,
            objectProperties.drawingImage.fileName,
          ),
          actualFile: objectProperties.drawingImage.actualFile,
          imageId: objectProperties.drawingImage.imageId,
        };
      }
      return new Images(
        start.x,
        start.y,
        objectProperties.drawingImage.image,
        end.x - start.x,
        objectProperties.drawingImage.aspectRatio,
        null,
        objectProperties.drawingImage.fileName,
      );
  }
}

export function adapt(size) {
  // 1. Safeguard against division by zero if scale is uninitialized or hits 0
  const currentScale = objectProperties.scale || 1;
  
  // 2. Only apply the internal multiplier if canvasSize() actually enlarged the canvas
  const ratio = canvasProperties.scaleRatio > 1 ? canvasProperties.scaleRatio : 1;
  
  // 3. Return: (Visual Size / Zoom Level) * Internal-to-CSS Ratio
  return (size / currentScale) * ratio;
}

export function multipleSelectFunction() {
  objectProperties.multipleSelectCoor.start.x = Math.min(
    ...objectProperties.multipleSelectArr.map((obj) => obj.whereToSnap().pos.x),
  );
  objectProperties.multipleSelectCoor.start.y = Math.min(
    ...objectProperties.multipleSelectArr.map((obj) => obj.whereToSnap().pos.y),
  );
  objectProperties.multipleSelectCoor.end.x = Math.max(
    ...objectProperties.multipleSelectArr.map(
      (obj) => obj.whereToSnap().pos.x + obj.whereToSnap().pos.width,
    ),
  );
  objectProperties.multipleSelectCoor.end.y = Math.max(
    ...objectProperties.multipleSelectArr.map(
      (obj) => obj.whereToSnap().pos.y + obj.whereToSnap().pos.height,
    ),
  );
}