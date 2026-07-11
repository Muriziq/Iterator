import Formats from "./formats.js";
import LineUtils from "./lineUtils.js";
import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties } from "../variable.js";
import { adapt } from "../state/canvas.js";
import { applyOpacityToHex, backValues, changeValues, radToDeg } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
import { initPickrs, destroyPickrs } from "../utils/colorPicker.js";

export default class Group extends Formats {
  constructor(list) {
    super();
    this.type = "group";
    this.list = list;
    this.isDoubleClicked = false;
    // this.angle = 0;
    this.minX;
    this.maxX;
    this.minY;
    this.maxY;
    this.x;
    this.y;
    this.clipped = "none";
  }
  addObject(targetCtx = ctx) {
    this.minX = Math.min(...this.list.map((l) => l.whereToSnap().x[0]));
    this.maxX = Math.max(...this.list.map((l) => l.whereToSnap().x[2]));
    this.minY = Math.min(...this.list.map((l) => l.whereToSnap().y[0]));
    this.maxY = Math.max(...this.list.map((l) => l.whereToSnap().y[2]));
    this.x = (this.minX + this.maxX) / 2;
    this.y = (this.minY + this.maxY) / 2;
    targetCtx.save();

    targetCtx.translate(this.x, this.y);
    targetCtx.rotate(this.angle);
    targetCtx.scale(this.scaleX, this.scaleY);
    this.list.forEach((obj) => {
      targetCtx.save();
      targetCtx.translate(-this.x, -this.y);
      obj.addObject(targetCtx);
      targetCtx.restore();
    });
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
        this.minX - this.x,
        this.minY - this.y,
        this.maxX - this.minX,
        this.maxY - this.minY,
      );
      targetCtx.closePath();

      targetCtx.beginPath();
      targetCtx.fillStyle = thresholds.normalModeColor;
      targetCtx.fillRect(
        this.maxX - this.x - thresholds.normalMode() / 2,
        this.maxY - this.y - thresholds.normalMode() / 2,
        thresholds.normalMode(),
        thresholds.normalMode(),
      );
      targetCtx.closePath();
    }
    targetCtx.restore();
  }
  whatSelected(mouse) {
    this.selectedArea = null;
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const angle = -this.angle;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (
      Math.abs(localX - this.maxX + this.x) < adapt(10) &&
      Math.abs(localY - this.maxY + this.y) < adapt(10)
    ) {
      this.selectedArea = "objectProperties.scale";
    } else if (
      localX >= this.minX - this.x &&
      localX <= this.maxX - this.x &&
      localY >= this.minY - this.y &&
      localY <= this.maxY - this.y
    ) {
      this.selectedArea = "normal";
    }
    return this.selectedArea !== null;
  }

  formatSelected(mouse) {
    if (this.isDoubleClicked) {
      this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2;
    } else {
      if (this.selectedArea === "normal") {
        this.list.forEach((l) =>
          l.moveClip(mouse.x - objectProperties.lastMouseX, mouse.y - objectProperties.lastMouseY),
        );
      } else {
        const lastWidth = objectProperties.lastMouseX - this.x;
        const lastHeight = objectProperties.lastMouseY - this.y;

        const currentWidth = mouse.x - this.x;
        const currentHeight = mouse.y - this.y;
        if (
          currentWidth <= 0 ||
          currentHeight <= 0 ||
          lastWidth <= 0 ||
          lastHeight <= 0
        )
          return;
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);
        const localMouseX = currentWidth * cos - currentHeight * sin;
        const localMouseY = currentWidth * sin + currentHeight * cos;

        const lastlocalMouseX = lastWidth * cos - lastHeight * sin;
        const lastlocalMouseY = lastWidth * sin + lastHeight * cos;

        const scaleX = localMouseX / lastlocalMouseX;
        const scaleY = localMouseY / lastlocalMouseY;
        this.list.forEach((l) => {
          // 1. Get distance from center
          const pos = l.whereToSnap().pos;
          const dx = pos.x - this.x;
          const dy = pos.y - this.y;

          l.changeLocation(scaleX, "scaleX");
          l.changeLocation(scaleY, "scaleY");
          l.changeLocation(this.x + dx * scaleX, "x");
          l.changeLocation(this.y + dy * scaleY, "y");
        });
        this.updateBounds();
      }
    }
  }
  showClone(isUndo = false) {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.list = this.list.map((obj) => obj.showClone());
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
  formatProperties() {
    destroyPickrs();
    propertiesBar.innerHTML = `
    <button class="imageb" style="margin-top:1rem ;margin-left:0.5rem" id="ungroup-btn">UnGroup</button>
    <section class="coord-section">
          <h3>Coordinate</h3>
          <div class="two-grid coord-grid">
            <label class="field">
              <span class="field-label">X</span>
              <input type="number" name="x" value="${changeValues(this.minX)}">
            </label>
            <label class="field">
              <span class="field-label">Y</span>
              <input type="number" name="y" value="${changeValues(this.minY)}">
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
          </div>
        </section>
        
  ${super.similarProptiesOutput()}

    `;
    document.getElementById("ungroup-btn").addEventListener("click", () => {
      this.list.forEach((l) => objectProperties.objects.push(l));
      const index = objectProperties.objects.indexOf(this);
      objectProperties.objects.splice(index, 1);
      objectProperties.selectedObj = null;
      Tools("moveTool");
      requestDraw();
    });
    super.similarPropties();
    initPickrs(propertiesBar);
  }
  changeProperties(e) {
    const name = e.target.name;
    if (name === "angle") {
      this.angle = radToDeg(Number(e.target.value) || 0, "rad");
    } else if (name === "x") {
      const value = backValues(Number(e.target.value) || 0);
      const diff = value - this.minX;
      // this.x = diff + this.x;
      this.list.forEach((l) => l.moveClip(diff, 0));
    } else if (name === "y") {
      const value = backValues(Number(e.target.value) || 0);
      const diff = value - this.minY;
      // this.y = diff + this.y;
      this.list.forEach((l) => l.moveClip(0, diff));
    } else if (name === "width") {
      let value = backValues(Number(e.target.value) || 0);

      let diff = value / (this.maxX - this.minX);
      diff = diff <= 0 ? 1 : diff;
      this.list.forEach((l) => l.changeLocation(diff, "scaleX"));
    } else if (name === "height") {
      let value = backValues(Number(e.target.value) || 0);

      let diff = value / (this.maxY - this.minY);
      diff = diff <= 0 ? 1 : diff;
      this.list.forEach((l) => l.changeLocation(diff, "scaleY"));
    } else if (name === "opacity") {
      const value = Number(e.target.value) || 0;
      this.list.forEach((l) => (l.opacity = value));
      this.opacity = value;
    } else if (e.target.type === "number") {
      const value = backValues(Number(e.target.value) || 0);
      this.list.forEach((l) => (l[name] = value));
      this[name] = value;
    } else {
      this.list.forEach((l) => (l[name] = e.target.value));
      this[name] = e.target.value;
    }
    this.updateBounds();
    requestDraw();
  }
  moveClip(x, y) {
    this.x += x;
    this.y += y;
    if (this.list.length > 0) this.list.forEach((list) => list.moveClip(x, y));
    if (typeof this.minX === "number") {
      this.minX += x;
      this.maxX += x;
      this.minY += y;
      this.maxY += y;
    }
  }
  whereToSnap() {
    let cos = Math.cos(this.angle);
    let sin = Math.sin(this.angle);
    let formerWidth = this.maxX - this.minX;
    let formerHeight = this.maxY - this.minY;
    let newWidth = Math.abs(formerWidth * cos) + Math.abs(formerHeight * sin);
    let newHeight = Math.abs(formerWidth * sin) + Math.abs(formerHeight * cos);
    let rectx = this.x - newWidth / 2;
    let recty = this.y - newHeight / 2;
    return {
      x: [rectx, rectx + newWidth / 2, rectx + newWidth],
      y: [recty, recty + newHeight / 2, recty + newHeight],
      pos: { x: rectx, y: recty, width: newWidth, height: newHeight },
    };
  }
  changeLocation(value, type) {
    if (type === "x") {
      const diff = value - this.minX;
      this.list.forEach((l) => l.moveClip(diff, 0));
    } else if (type === "y") {
      const diff = value - this.minY;
      this.list.forEach((l) => l.moveClip(0, diff));
    } else if (type === "scaleX") {
      this.list.forEach((l) => {
        // 1. Get distance from center
        const pos = l.whereToSnap().pos;
        const dx = pos.x - this.x;

        l.changeLocation(value, "scaleX");
        l.changeLocation(this.x + dx * value, "x");
      });
    } else if (type === "scaleY") {
      this.list.forEach((l) => {
        // 1. Get distance from center
        const pos = l.whereToSnap().pos;
        const dy = pos.y - this.y;

        l.changeLocation(value, "scaleY");
        l.changeLocation(this.y + dy * value, "y");
      });
    }
    this.updateBounds();
  }

  updateBounds() {
    if (this.list.length === 0) return;
    this.minX = Math.min(...this.list.map((l) => l.whereToSnap().x[0]));
    this.maxX = Math.max(...this.list.map((l) => l.whereToSnap().x[2]));
    this.minY = Math.min(...this.list.map((l) => l.whereToSnap().y[0]));
    this.maxY = Math.max(...this.list.map((l) => l.whereToSnap().y[2]));
    this.x = (this.minX + this.maxX) / 2;
    this.y = (this.minY + this.maxY) / 2;
  }
}