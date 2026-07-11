import Formats from "./formats.js";
import LineUtils from "./lineUtils.js";
import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties } from "../variable.js";
import { applyOpacityToHex, backValues, changeValues, radToDeg } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
import { initPickrs, destroyPickrs } from "../utils/colorPicker.js";

export default class Polygon extends Formats {
  constructor(x, y, radiusX, radiusY) {
    super();
    this.sides = 6;
    this.x = x;
    this.type = "polygon";
    this.y = y;
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.points = [];
    this.mode = "normal";
    this.cornerRadius = 0;
    this.selectedLineIndex = null;
    this.clipped = "none";
    this.clips = [];
  }

  addObject(targetCtx = ctx) {
    if (this.points.length === 0) {
      if (this.sides < 3) return;
      const angleStep = (2 * Math.PI) / this.sides;
      for (let i = 0; i < this.sides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = this.radiusX * Math.cos(angle);
        const y = this.radiusY * Math.sin(angle);
        this.points.push({
          points: { x, y },
          edgeModes: null,
          controls: [
            { x: x - 20, y: y },
            { x: x + 20, y: y },
          ],
          cornerRadius: 0,
        });
      }
    }

    const xs = this.points.map((p) => p.points.x);
    const ys = this.points.map((p) => p.points.y);
    this.minX = Math.min(...xs);
    this.minY = Math.min(...ys);
    this.maxX = Math.max(...xs);
    this.maxY = Math.max(...ys);
    this.radiusX = (this.maxX - this.minX) / 2;
    this.radiusY = (this.maxY - this.minY) / 2;
    targetCtx.save();
    if (this.blurEnabled && this.blur > 0) {
      targetCtx.filter = `blur(${this.blur}px)`;
    }
    if (this.shadow) {
      targetCtx.shadowColor = this.shadowColor;
      targetCtx.shadowBlur = this.shadowBlur;
      targetCtx.shadowOffsetX = this.shadowOffsetX;
      targetCtx.shadowOffsetY = this.shadowOffsetY;
    }
    targetCtx.translate(this.x, this.y);
    targetCtx.rotate(this.angle);
    targetCtx.scale(this.scaleX, this.scaleY);
    targetCtx.beginPath();
    let edgeCurve = false;
    this.points.forEach((p) => {
      if (p.edgeModes !== null) edgeCurve = true;
    });
    if (edgeCurve) LineUtils.drawSmartShape(this.points,true,targetCtx);
    else {
      LineUtils.drawRoundedShape(this.points, this.cornerRadius,targetCtx);
      this.points.forEach((p) => {
        p.cornerRadius = this.cornerRadius;
      });
    }
    if (this.colorFill !== "none") {
      targetCtx.fillStyle = this.colorType();
      targetCtx.fill();
    }

    if (this.outline) {
      targetCtx.save();
      targetCtx.shadowColor = "transparent";
      targetCtx.shadowBlur = 0;
      targetCtx.shadowOffsetX = 0;
      targetCtx.shadowOffsetY = 0;
      targetCtx.lineWidth = this.outlineThickness;
      targetCtx.setLineDash(this.outlineType);
      targetCtx.strokeStyle = this.outlineColor;
      targetCtx.lineJoin = "round";
      targetCtx.stroke();
      targetCtx.restore();
    }
    if (this.blur > 0 || this.shadow) {
      targetCtx.filter = "none";
      targetCtx.shadowColor = "transparent";
      targetCtx.shadowBlur = 0;
      targetCtx.shadowOffsetX = 0;
      targetCtx.shadowOffsetY = 0;
    }
    if (this.mode === "edit" && objectProperties.selectedObj === this)
      LineUtils.drawEditArcs(
        this.points,
        this.selectedArea,
        this.selectedLineIndex,
      );

    if (objectProperties.selectedObj === this ) {
      targetCtx.beginPath();
      targetCtx.lineWidth = thresholds.slineWidth();
      targetCtx.strokeStyle = thresholds.sColor;
      targetCtx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);
      targetCtx.strokeRect(
        this.minX,
        this.minY,
        this.maxX - this.minX,
        this.maxY - this.minY,
      );
      if (this.mode === "normal") {
        targetCtx.beginPath();
        targetCtx.fillStyle = thresholds.normalModeColor;
        targetCtx.fillRect(
          this.maxX - thresholds.normalMode() / 2,
          this.maxY - thresholds.normalMode() / 2,
          thresholds.normalMode(),
          thresholds.normalMode(),
        );
      }
    }

    targetCtx.closePath();
    targetCtx.restore();
    targetCtx.save();
    targetCtx.translate(this.x, this.y);
    targetCtx.rotate(this.angle);
    targetCtx.beginPath();
    if (edgeCurve) LineUtils.drawSmartShape(this.points,true,targetCtx);
    else {
      LineUtils.drawRoundedShape(this.points, this.cornerRadius,targetCtx);
      this.points.forEach((p) => {
        p.cornerRadius = this.cornerRadius;
      });
    }
    targetCtx.clip();
    targetCtx.translate(-this.x, -this.y);
    this.clips.forEach((clip) => {
      clip.addObject(targetCtx);
    });
    targetCtx.restore();
  }
  colorType() {
    const colors = this.color.map((color) =>
      applyOpacityToHex(color, this.opacity),
    );
    this.color = colors;
    if (this.colorFill === "uniform") {
      return this.color[0];
    } else if (this.colorFill === "linear") {
      let length = Math.sqrt(
        (this.maxX - this.minX) ** 2 + (this.maxY - this.minY) ** 2,
      );

      const endX = this.minX + length * Math.cos(this.colorDeg);
      const endY = this.minY + length * Math.sin(this.colorDeg);
      const grad = ctx.createLinearGradient(this.minX, this.minY, endX, endY);
      if (this.colorStop.length === 0) {
        this.color.forEach((c, i) => {
          let equation = i / (this.color.length - 1);
          this.colorStop.push(equation);
        });
      }
      this.colorStop.forEach((stop, i) =>
        grad.addColorStop(stop, this.color[i]),
      );

      return grad;
    } else if (this.colorFill === "radial") {
      const centerX = (this.minX + this.maxX) / 2;
      const centerY = (this.minY + this.maxY) / 2;

      const radius = Math.max(this.maxX - this.minX, this.maxY - this.minY) / 2;
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius,
      );
      if (this.colorStop.length === 0) {
        this.color.forEach((c, i) => {
          let equation = i / (this.color.length - 1);
          this.colorStop.push(equation);
        });
      }
      this.colorStop.forEach((stop, i) =>
        grad.addColorStop(stop, this.color[i]),
      );

      return grad;
    }
  }
  whatSelected(mouse) {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    if (
      this.mode === "edit" &&
      (LineUtils.getPointPositon(localX, localY, this.points) ||
        LineUtils.getEdgeAtPosition(localX, localY, this.points))
    ) {
      const answer =
        LineUtils.getPointPositon(localX, localY, this.points) === false
          ? LineUtils.getEdgeAtPosition(localX, localY, this.points)
          : LineUtils.getPointPositon(localX, localY, this.points);
      this.selectedArea = answer.type;
      this.selectedLineIndex = answer.value;
      return true;
    } else if (this.mode === "normal") {
      if (
        Math.abs(localX - this.maxX) < thresholds.normalMode() / 2 &&
        Math.abs(localY - this.maxY) < thresholds.normalMode() / 2
      ) {
        this.selectedArea = "objectProperties.scale";
        return true;
      }
      if (Math.abs(localX - this.maxX) < thresholds.threshold()) {
        this.selectedArea = "scaleR";
        return true;
      }
      if (Math.abs(localY - this.maxY) < thresholds.threshold()) {
        this.selectedArea = "scaleB";
        return true;
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.scale(this.scaleX, this.scaleY);

      ctx.beginPath();

      let edgeCurve = false;

      this.points.forEach((p) => {
        if (p.edgeModes !== null) edgeCurve = true;
      });

      if (edgeCurve) {
        LineUtils.drawSmartShape(this.points);
      } else {
        LineUtils.drawRoundedShape(this.points, this.cornerRadius);

        this.points.forEach((p) => {
          p.cornerRadius = this.cornerRadius;
        });
      }

      const isInside = ctx.isPointInPath(mouse.x, mouse.y);

      ctx.restore();

      if (isInside) {
        this.selectedArea = "Selected";
      }
      return isInside;
    }
    return false;
  }
  moveClip(x, y) {
    this.x += x;
    this.y += y;
    if (this.clips.length > 0)
      this.clips.forEach((clip) => clip.moveClip(x, y));
  }

  formatSelected(mouse) {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    if (this.mode === "edit") {
      const deltaX = mouse.x - objectProperties.lastMouseX;
      const deltaY = mouse.y - objectProperties.lastMouseY;
      const localDeltaX = deltaX * cos - deltaY * sin;
      const localDeltaY = deltaX * sin + deltaY * cos;
      super.lineFormat(localX, localY, localDeltaX, localDeltaY);
    } else {
      if (this.isDoubleClicked) {
        this.angle =
          Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2;
      } else if (this.selectedArea === "Selected") {
        this.x += mouse.x - objectProperties.lastMouseX;
        this.y += mouse.y - objectProperties.lastMouseY;
        if (this.clips.length > 0) {
          this.clips.forEach((clip) =>
            clip.moveClip(mouse.x - objectProperties.lastMouseX, mouse.y - objectProperties.lastMouseY),
          );
        }
      }
    }
    if (this.selectedArea === "objectProperties.scale") {
      const lastWidth = objectProperties.lastMouseX - this.x;
      const lastHeight = objectProperties.lastMouseY - this.y;
      const currentWidth = mouse.x - this.x;
      const currentHeight = mouse.y - this.y;
      const scaleX = currentWidth / lastWidth;
      const scaleY = currentHeight / lastHeight;
      this.points.forEach((p) => {
        p.points.x = p.points.x * scaleX;
        p.points.y = p.points.y * scaleY;
        p.controls[0].x = p.controls[0].x * scaleX;
        p.controls[0].y = p.controls[0].y * scaleY;
        p.controls[1].x = p.controls[1].x * scaleX;
        p.controls[1].y = p.controls[1].y * scaleY;
      });
    } else if (this.selectedArea === "scaleR") {
      const lastWidth = objectProperties.lastMouseX - this.x;
      const currentWidth = mouse.x - this.x;
      const scaleX = currentWidth / lastWidth;
      this.points.forEach((p) => {
        p.points.x = p.points.x * scaleX;
        p.controls[0].x = p.controls[0].x * scaleX;
        p.controls[1].x = p.controls[1].x * scaleX;
      });
    } else if (this.selectedArea === "scaleB") {
      const lastHeight = objectProperties.lastMouseY - this.y;
      const currentHeight = mouse.y - this.y;
      const scaleY = currentHeight / lastHeight;
      this.points.forEach((p) => {
        p.points.y = p.points.y * scaleY;
      });
    }
  }
  formatProperties() {
    destroyPickrs();
    propertiesBar.innerHTML = `
<section class="coord-section">
  <h3>Coordinate</h3>

  <div class="two-grid coord-grid">
    <label class="field">
      <span class="field-label">X</span>
      <input type="number" name="x" value="${changeValues(this.x + this.minX)}">
    </label>

    <label class="field">
      <span class="field-label">Y</span>
      <input type="number" name="y" value="${changeValues(this.y + this.minY)}">
    </label>

    <label class="field">
      <span class="field-label">W</span>
      <input type="number" name="width" value="${changeValues(this.maxX - this.minX)}">
    </label>

    <label class="field">
      <span class="field-label">H</span>
      <input type="number" name="height" value="${changeValues(this.maxY - this.minY)}">
    </label>

    <label class="field">
      <span class="field-label">Rotation</span>
      <input type="number" name="angle" value="${radToDeg(this.angle, "deg")}">
    </label>

    <label class="field">
      <span class="field-label">Opacity</span>
      <input type="number" name="opacity" min="0" max="100" value="100">
    </label>

    <label class="field">
      <span class="field-label">Sides</span>
      <input type="number" name="sides" value="${this.sides}">
    </label>
  </div>
</section>

${super.similarProptiesOutput()}

<section class="shape">

  <div class="shape-row" style="display: ${this.mode === "edit" && this.selectedArea === "pointIndex" ? "flex" : "none"}">
      ${super.shapeProperties()}
  </div>

  <label
    class="thick"
    style="display:${
      this.selectedArea === "pointIndex" &&
      this.points[this.selectedLineIndex].edgeModes === "shaped"
        ? "none"
        : "flex"
    }"
  >
    <span class="field-label">Corner Radius</span>
    <input type="number" name="cornerRadius" value="${
      this.selectedArea === "pointIndex"
        ? changeValues(this.points[this.selectedLineIndex].cornerRadius)
        : changeValues(this.cornerRadius)
    }">
  </label>

  <div class="shape-row shape-actions" style="justify-content:end;align-items:end">
    <button class="normal">
      ${this.mode === "edit" ? "Done" : "Edit"}
    </button>
  </div>

</section>
`;
    super.similarPropties();
   document.querySelector(".rounded-edge").addEventListener("click", () => {
      if (this.selectedArea === "pointIndex") {
        this.points[this.selectedLineIndex].edgeModes =
          this.points[this.selectedLineIndex].edgeModes === "rounded"
            ? null
            : "rounded";
        this.formatProperties();
            requestDraw();
      }
    });
    document.querySelector(".convert").addEventListener("click", () => {
      if (this.selectedArea === "pointIndex") {
        this.points[this.selectedLineIndex].edgeModes =
          this.points[this.selectedLineIndex].edgeModes === "shaped"
            ? null
            : "shaped";
        this.formatProperties();
            requestDraw();
      }
    });
    document.querySelector(".normal").addEventListener("click", () => {
      this.mode = this.mode === "normal" ? "edit" : "normal";
      this.formatProperties();
       requestDraw();
    });
    initPickrs(propertiesBar);
  }
  changeProperties(e) {
    const name = e.target.name;

    if (name === "angle") {
      this.angle = radToDeg(Number(e.target.value) || 0, "rad");
    }

    if (name === "bgColor") {
      this.color[0] = e.target.value;
    }

    if (name === "colorDeg") {
      this.colorDeg = radToDeg(Number(e.target.value) || 0, "rad");
    }

    if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    }

    if (e.target.type === "number") {
      let value = backValues(Number(e.target.value) || 0);
      value = value <= 0 ? 0 : value;
      if (name === "x") {
        this.x = value - this.minX;
      }

      if (name === "y") {
        this.y = value - this.minY;
      }

      if (name === "opacity") {
        this.opacity = Number(e.target.value) || 0;
      }

      if (name === "width") {
        const scaleX = value / (this.maxX - this.minX || 1);

        this.points.forEach((p) => {
          p.points.x *= scaleX <= 0 ? 0.01 : scaleX;
          p.controls[0].x *= scaleX <= 0 ? 0.01 : scaleX;
          p.controls[1].x *= scaleX <= 0 ? 0.01 : scaleX;
        });
      }

      if (name === "height") {
        const scaleY = value / (this.maxY - this.minY || 1);

        this.points.forEach((p) => {
          p.points.y *= scaleY <= 0 ? 0.01 : scaleY;
          p.controls[0].y *= scaleY <= 0 ? 0.01 : scaleY;
          p.controls[1].y *= scaleY <= 0 ? 0.01 : scaleY;
        });
      }

      if (name === "sides") {
       this.sides = Math.max(3, Number(e.target.value) || 3);
        this.points = [];
      }

      if (name === "cornerRadius") {
        if (
          this.selectedArea === "pointIndex" &&
          this.points[this.selectedLineIndex].edgeModes === "rounded"
        ) {
          this.points[this.selectedLineIndex].cornerRadius = value;
        } else {
          this.cornerRadius = value;
        }
      }

      if (
        name !== "x" &&
        name !== "y" &&
        name !== "opacity" &&
        name !== "width" &&
        name !== "height" &&
        name !== "sides" &&
        name !== "cornerRadius"
      ) {
        this[name] = value;
      }
    }

    if (this.outlineType.length !== 0) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    }

    requestDraw();
  }
  showClone(isUndo = false) {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.points = this.points.map((p) => ({
      points: { x: p.points.x, y: p.points.y },
      edgeModes: p.edgeModes,
      controls: p.controls.map((c) => ({ x: c.x, y: c.y })),
      cornerRadius: p.cornerRadius,
    }));
    if (!isUndo) {
      clone.id = crypto.randomUUID();
    }
    clone.clips = this.clips.map((c) => c.showClone());
    return clone;
  }
  doubleClicked(mouse) {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    const localMouseX = dx * cos - dy * sin;
    const localMouseY = dx * sin + dy * cos;
    if (this.mode === "edit") {
      super.pointDblClick(localMouseX, localMouseY);
    } else {
      objectProperties.isRotatingObject = true;
      this.isDoubleClicked = this.isDoubleClicked ? false : true;
      return true;
    }
  }
  whereToSnap() {
    if (this.points.length === 0) {
      const w = this.radiusX * 2;
      const h = this.radiusY * 2;
      const x0 = this.x - this.radiusX;
      const y0 = this.y - this.radiusY;
      return {
        x: [x0, this.x, x0 + w],
        y: [y0, this.y, y0 + h],
        pos: {
          x: x0,
          y: y0,
          width: w,
          height: h,
        },
      };
    }
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    const worldPoints = this.points.map((p) => this.pointToWorld(p.points));
    worldPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    let newWidth = maxX - minX;
    let newHeight = maxY - minY;

    return {
      x: [minX, minX + newWidth / 2, maxX],
      y: [minY, minY + newHeight / 2, maxY],
      pos: {
        x: minX,
        y: minY,
        width: newWidth,
        height: newHeight,
      },
    };
  }

  changeLocation(value, type) {
    if (type === "x") {
      if (this.points.length > 0) {
        this.x = value - this.minX;
      } else {
        this.x = value + this.radiusX;
      }
    } else if (type === "y") {
      if (this.points.length > 0) {
        this.y = value - this.minY;
      } else {
        this.y = value + this.radiusY;
      }
    } else if (type === "scaleX") {
      this.points.forEach((p) => {
        p.points.x = p.points.x * value;
        p.controls[0].x = p.controls[0].x * value;
        p.controls[1].x = p.controls[1].x * value;
      });
      this.radiusX *= value;
      if (typeof this.minX === "number") this.minX *= value;
      if (typeof this.maxX === "number") this.maxX *= value;
    } else if (type === "scaleY") {
      this.points.forEach((p) => {
        p.points.y = p.points.y * value;
        p.controls[0].y = p.controls[0].y * value;
        p.controls[1].y = p.controls[1].y * value;
      });
      this.radiusY *= value;
      if (typeof this.minY === "number") this.minY *= value;
      if (typeof this.maxY === "number") this.maxY *= value;
    }
  }
}