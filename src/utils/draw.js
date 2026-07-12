import { canvas, ctx, width, height } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import { adapt, drawingObject } from "../state/canvas.js";
import { saveState } from "../state/undo.js";
let needsDraw = false;

export default function requestDraw(save=true) {
  if (needsDraw) return;
  needsDraw = true;

  requestAnimationFrame(() => {
    needsDraw = false;
    draw();
    if(save)  saveState()
  
  });
}

function draw() {
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(objectProperties.scale, 0, 0, objectProperties.scale, objectProperties.panX, objectProperties.panY);

    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      (canvas.width - canvasProperties.measurement.width) / 2,
      (canvas.height - canvasProperties.measurement.height) / 2,
      canvasProperties.measurement.width,
      canvasProperties.measurement.height,
    );
    ctx.closePath();

    if (objectProperties.objects.length > 0) {
      objectProperties.objects.forEach((obj) => {
        obj.addObject();
      });
    }
    if (objectProperties.multipleSelect && objectProperties.multipleSelectArr.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = adapt(1);
      ctx.strokeStyle = "#0000ff";
      ctx.setLineDash([adapt(5), adapt(3)]);
      ctx.strokeRect(
        objectProperties.multipleSelectCoor.start.x,
        objectProperties.multipleSelectCoor.start.y,
        objectProperties.multipleSelectCoor.end.x - objectProperties.multipleSelectCoor.start.x,
        objectProperties.multipleSelectCoor.end.y - objectProperties.multipleSelectCoor.start.y,
      );
      ctx.restore();
    }
    if (objectProperties.drawingStart) {
      if (objectProperties.isDrawing === "zoom" || objectProperties.isDrawing === "objectProperties.multipleSelect") {
        const x = Math.min(objectProperties.drawingCoordinate.start.x, objectProperties.drawingCoordinate.end.x);
        const y = Math.min(objectProperties.drawingCoordinate.start.y, objectProperties.drawingCoordinate.end.y);
        const w = Math.abs(objectProperties.drawingCoordinate.end.x - objectProperties.drawingCoordinate.start.x);
        const h = Math.abs(objectProperties.drawingCoordinate.end.y - objectProperties.drawingCoordinate.start.y);

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.lineWidth = adapt(2);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      } else {
        drawingObject().addObject();
      }
    }
    if (objectProperties.previousClip !== null) {
      const clone = objectProperties.clippedObject.showClone();
      clone.colorFill = "none";
      clone.outline = true;
      clone.outlineThickness = adapt(3);
      clone.outlineColor = "#ff0000";
      clone.addObject();
    }
  } catch (err) {
    console.log(err);
  }
}