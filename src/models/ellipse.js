import Formats from "./formats.js";
import { applyOpacityToHex, backValues, changeValues, radToDeg } from "../utils/convert.js";
import { ctx, thresholds, propertiesBar } from "../constants.js";
import requestDraw from "../utils/draw.js";
import { initPickrs, destroyPickrs } from "../utils/colorPicker.js";

import LineUtils from "./lineUtils.js";
import { objectProperties } from "../variable.js";
export default class Ellipse extends Formats {
  constructor(x, y, radiusX, radiusY) {
    super();
    this.x = x;
    this.y = y;
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.type = "ellipse";
    this.isDashed = false;
    this.arcStart = 0;
    this.arcEnd = 2 * Math.PI;
    this.clipped = "none";
    this.clips = [];
    this.mode = "fill";
  }
  addObject(targetCtx = ctx) {
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
    if (this.mode === "pie") {
      targetCtx.moveTo(0, 0);
      targetCtx.ellipse(
        0,
        0,
        this.radiusX,
        this.radiusY,
        0,
        this.arcStart,
        this.arcEnd,
      );
    } else {
      targetCtx.ellipse(
        0,
        0,
        this.radiusX,
        this.radiusY,
        0,
        this.arcStart,
        this.arcEnd,
      );
    }
    if (this.mode !== "curve") targetCtx.closePath();
    if (this.colorFill !== "none") targetCtx.fillStyle = this.colorType();
    if (this.mode !== "curve" && this.colorFill !== "none") targetCtx.fill();
    if (this.outline) {
      targetCtx.shadowColor = "transparent";
      targetCtx.shadowBlur = 0;
      targetCtx.shadowOffsetX = 0;
      targetCtx.shadowOffsetY = 0;
      targetCtx.lineWidth = this.outlineThickness;
      targetCtx.strokeStyle = this.outlineColor;
      targetCtx.setLineDash(this.outlineType);
      targetCtx.stroke();
    }
    if (objectProperties.selectedObj === this) {
      targetCtx.filter = "none";
      targetCtx.shadowColor = "transparent";
      targetCtx.shadowBlur = 0;
      targetCtx.shadowOffsetX = 0;
      targetCtx.shadowOffsetY = 0;
      targetCtx.beginPath();
      targetCtx.lineWidth = thresholds.slineWidth();
      targetCtx.strokeStyle = thresholds.sColor;
      targetCtx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);
      targetCtx.strokeRect(
        -this.radiusX,
        -this.radiusY,
        this.radiusX * 2,
        this.radiusY * 2,
      );
      targetCtx.closePath();
    }

    targetCtx.restore();
    if (this.clips.length > 0 && this.clipped !== "editclip") {
      targetCtx.save();
      targetCtx.translate(this.x, this.y);
      targetCtx.rotate(this.angle);
      targetCtx.beginPath();
      if (this.mode === "pie") {
        targetCtx.moveTo(0, 0);
        targetCtx.ellipse(
          0,
          0,
          this.radiusX,
          this.radiusY,
          0,
          this.arcStart,
          this.arcEnd,
        );
      } else {
        targetCtx.ellipse(
          0,
          0,
          this.radiusX,
          this.radiusY,
          0,
          this.arcStart,
          this.arcEnd,
        );
      }
      targetCtx.clip();
      targetCtx.translate(-this.x, -this.y);
      this.clips.forEach((clip) => {
        clip.addObject(targetCtx);
      });
      targetCtx.restore();
    }
  }

  colorType() {
    const colors = this.color.map((color) =>
      applyOpacityToHex(color, this.opacity),
    );
    this.color = colors;
    if (this.colorFill === "uniform") {
      return this.color[0];
    } else if (this.colorFill === "linear") {
      let length = Math.sqrt((this.radiusX * 2) ** 2 + (this.radiusY * 2) ** 2);

      const endX = -this.radiusX + length * Math.cos(this.colorDeg);
      const endY = -this.radiusY + length * Math.sin(this.colorDeg);
      const grad = ctx.createLinearGradient(
        -this.radiusX,
        -this.radiusY,
        endX,
        endY,
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
    } else if (this.colorFill === "radial") {
      const radius = Math.max(this.radiusX, this.radiusY);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
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
    const rectW = this.radiusX * 2;
    const rectH = this.radiusY * 2;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin + rectW / 2;
    const localY = dx * sin + dy * cos + rectH / 2;

    this.selectedArea = LineUtils.getNormalPostion(
      localX,
      localY,
      rectW,
      rectH,
      thresholds.threshold(),
    );
    return this.selectedArea !== null;
  }
  moveClip(x, y) {
    this.x += x;
    this.y += y;
    if (this.clips.length > 0)
      this.clips.forEach((clip) => clip.moveClip(x, y));
  }
  formatSelected(mouse) {
    const x = this.x - this.radiusX;
    const y = this.y - this.radiusY;
    super.circFormat(mouse, x, y);
  }
  formatProperties() {
    destroyPickrs();
    const pie = "imagess/chart-pie.svg";
    const curveEnd = "imagess/loader-circle.svg";
    propertiesBar.innerHTML = `
  <section class="coord-section">
    <h3>Coordinate</h3>

    <div class="two-grid coord-grid">
      <label class="field">
        <span class="field-label">X</span>
        <input type="number" name="x" value="${changeValues(this.x - this.radiusX)}">
      </label>

      <label class="field">
        <span class="field-label">Y</span>
        <input type="number" name="y" value="${changeValues(this.y)}">
      </label>

      <label class="field">
        <span class="field-label">W</span>
        <input type="number" name="radiusX" value="${changeValues(this.radiusX * 2)}">
      </label>

      <label class="field">
        <span class="field-label">H</span>
        <input type="number" name="radiusY" value="${changeValues(this.radiusY * 2)}">
      </label>

      <label class="field">
        <span class="field-label">Rotation</span>
        <input type="number" name="angle" value="${radToDeg(this.angle, "deg")}">
      </label>

      <label class="field">
        <span class="field-label">Opacity</span>
        <input type="number" name="opacity" min="0" max="100" value="100">
      </label>
    </div>
  </section>

  ${super.similarProptiesOutput()}
  <section class="shape">
    <div class="shape-row">
      <button class="fill ${this.mode === "fill" ? "selected" : ""}">
        <img src="imagess/circle.svg" alt="Fill">
      </button>

      <button class="pie ${this.mode === "pie" ? "selected" : ""}">
        <img src="${pie}" alt="Pie">
      </button>

      <button class="curve ${this.mode === "curve" ? "selected" : ""}">
        <img src="${curveEnd}" style="transform: rotate(-45deg)" alt="Curve">
      </button>
    </div>

    <div
      class="two-grid coord-grid"
      style="display:${this.mode === "fill" ? "none" : "grid"}"
    >
      <label class="field">
        <span class="field-label"><img style="transform: rotate(-90deg)" src="${curveEnd}" alt="Arc start"></span>
                  <input type="number" name="arcStart" value="${radToDeg(this.arcStart, "deg")}">

      </label>

      <label class="field">
        <span class="field-label"><img src="${curveEnd}" alt="Arc end"></span>
          <input type="number" name="arcEnd" value="${radToDeg(this.arcEnd, "deg")}">
      </label>
    </div>
  </section>
`;
    super.similarPropties();
    document.querySelector(".fill").addEventListener("click", () => {
      this.mode = "fill";
      this.arcStart = 0;
      this.arcEnd = Math.PI * 2;
      this.formatProperties();
          requestDraw();
    });
    document.querySelector(".pie").addEventListener("click", () => {
      this.mode = "pie";
      this.formatProperties();
          requestDraw();
    });
    document.querySelector(".curve").addEventListener("click", () => {
      this.mode = "curve";
      this.colorFill = "none";
      if (!this.outline) this.outline = true;
      this.formatProperties();
          requestDraw();
    });
    initPickrs(propertiesBar);
  }
  changeProperties(e) {
    const name = e.target.name;

    if (name === "angle" || name === "arcStart" || name === "arcEnd") {
      this[name] = radToDeg(Number(e.target.value) || 0, "rad");
    } else if (name === "bgColor") {
      this.color[0] = e.target.value;
    } else if (
      name === "colorDeg" ||
      name === "arcStart" ||
      name === "arcEnd"
    ) {
      this[name] = radToDeg(Number(e.target.value) || 0, "rad");
    } else if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    } else if (e.target.type === "number") {
      let value = backValues(Number(e.target.value) || 0);
      value = value <= 0 ? 0 : value;
      if (!isNaN(value) && value !== null) {
        if (name === "x") {
          this.x = value + this.radiusX;
        } else if (name === "y") {
          this.y = value + this.radiusY;
        } else if (name === "opacity") {
          this.opacity = Number(e.target.value) || 0;
        } else if (name === "radiusX" || name === "radiusY") {
          this[name] = value / 2;
        } else {
          this[name] = value;
        }
      }
    }

    if (this.outlineType.length !== 0) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    }

    requestDraw();

  }
  showClone(isUndo = false) {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.clips = this.clips.map((c) => c.showClone());
    if (!isUndo) {
      clone.id = crypto.randomUUID();
    }
    return clone;
  }
  doubleClicked(mouse) {
    objectProperties.isRotatingObject = true;
    this.isDoubleClicked = this.isDoubleClicked ? false : true;
    return true;
  }
  whereToSnap() {
    let cos = Math.cos(this.angle);
    let sin = Math.sin(this.angle);

    let rx = this.radiusX;
    let ry = this.radiusY;

    let newWidth = 2 * Math.sqrt((rx * cos) ** 2 + (ry * sin) ** 2);
    let newHeight = 2 * Math.sqrt((rx * sin) ** 2 + (ry * cos) ** 2);
    let centerX = this.x;
    let centerY = this.y;

    let rectx = centerX - newWidth / 2;
    let recty = centerY - newHeight / 2;
    return {
      x: [rectx, rectx + newWidth / 2, rectx + newWidth],
      y: [recty, recty + newHeight / 2, recty + newHeight],
      pos: { x: rectx, y: recty, width: newWidth, height: newHeight },
    };
  }

  changeLocation(value, type) {
    if (type === "x") {
      this.x = value + this.radiusX;
    } else if (type === "y") {
      this.y = value + this.radiusY;
    } else if (type === "scaleX") {
      this.radiusX *= value;
    } else if (type === "scaleY") {
      this.radiusY *= value;
    }
  }
}