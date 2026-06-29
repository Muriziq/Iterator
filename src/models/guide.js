import Formats from "./formats.js";
import { ctx, propertiesBar, thresholds, canvas } from "../constants.js";
import { objectProperties } from "../variable.js";
import { changeValues, backValues, radToDeg } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
import { adapt } from "../state/canvas.js";
import { initPickrs, destroyPickrs } from "../utils/colorPicker.js";

export default class Guide extends Formats {
  constructor(orientation, position) {
    super();
    this.type = "guide";
    this.orientation = orientation; // "horizontal" or "vertical"
    this.position = position; // The specific X or Y coordinate
    this.color = "#00ffff"; // Default cyan color for guides
    this.thickness = adapt(1); // Allow users to adjust thickness
    this.angle = 0; // Allow users to rotate the guide
    this.selectedArea = null;
    this.isDoubleClicked = false;
  }

  addObject(targetCtx = ctx) {
    targetCtx.save();

    // Move context to the base position intercept
    if (this.orientation === "vertical") {
      targetCtx.translate(this.position, 0);
    } else {
      targetCtx.translate(0, this.position);
    }

    // Apply rotation
    targetCtx.rotate(this.angle);

    targetCtx.beginPath();

    // Turn red when selected to indicate active status
    targetCtx.strokeStyle =
      objectProperties.selectedObj === this ? "#ff0000" : this.color;

    // Keep the line thickness consistent regardless of zoom level
    const currentScale = objectProperties.scale || 1;
    targetCtx.lineWidth = this.thickness / currentScale;
    targetCtx.setLineDash([5 / currentScale, 5 / currentScale]);

    // Draw a very long line to act as an infinite guide across the workspace
    // Use the canvas diagonal adjusted by zoom, with a large multiplier to cover panning
    const size = (Math.hypot(canvas.width, canvas.height) / currentScale) * 100;
    if (this.orientation === "vertical") {
      targetCtx.moveTo(0, -size);
      targetCtx.lineTo(0, size);
    } else {
      targetCtx.moveTo(-size, 0);
      targetCtx.lineTo(size, 0);
    }

    targetCtx.stroke();
    targetCtx.closePath();
    targetCtx.restore();
  }

  whatSelected(mouse) {
    let localX = mouse.x;
    let localY = mouse.y;

    // Offset by position to treat the pivot accurately
    if (this.orientation === "vertical") {
      localX -= this.position;
    } else {
      localY -= this.position;
    }

    // Inverse rotate mouse coords
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    let distance = 0;
    if (this.orientation === "vertical") {
      distance = Math.abs(rotatedX);
    } else {
      distance = Math.abs(rotatedY);
    }

    // Base threshold + dynamic thickness inclusion
    const currentScale = objectProperties.scale || 1;
    const hitThreshold =
      thresholds.threshold() + this.thickness / currentScale / 2;

    if (distance < hitThreshold) {
      this.selectedArea = "Selected";
      return true;
    }
    this.selectedArea = null;
    return false;
  }

  formatSelected(mouse) {
    if (this.selectedArea === "Selected") {
      if (this.orientation === "vertical") {
        this.position += mouse.x - objectProperties.lastMouseX;
      } else {
        this.position += mouse.y - objectProperties.lastMouseY;
      }
    }
  }

  whereToSnap() {
    let cos = Math.cos(this.angle);
    let sin = Math.sin(this.angle);

    const currentScale = objectProperties.scale || 1;
    const size = (Math.hypot(canvas.width, canvas.height) / currentScale) * 100;

    let baseWidth = this.orientation === "vertical" ? this.thickness : size * 2;
    let baseHeight =
      this.orientation === "vertical" ? size * 2 : this.thickness;

    let centerX = this.orientation === "vertical" ? this.position : 0;
    let centerY = this.orientation === "vertical" ? 0 : this.position;

    let newWidth = Math.abs(baseWidth * cos) + Math.abs(baseHeight * sin);
    let newHeight = Math.abs(baseWidth * sin) + Math.abs(baseHeight * cos);

    let rectx = centerX - newWidth / 2;
    let recty = centerY - newHeight / 2;

    return {
      x: [rectx, rectx + newWidth / 2, rectx + newWidth],
      y: [recty, recty + newHeight / 2, recty + newHeight],
      pos: { x: rectx, y: recty, width: newWidth, height: newHeight },
    };
  }

  formatProperties() {
    destroyPickrs();
    propertiesBar.innerHTML = `
      <section class="coord-section">
        <h3>Guide Properties</h3>
        
        <label class="uniform-div" style="margin-top: 10px;">
          <span>Orientation</span>
          <select name="orientation">
            <option value="horizontal" ${this.orientation === "horizontal" ? "selected" : ""}>Horizontal</option>
            <option value="vertical" ${this.orientation === "vertical" ? "selected" : ""}>Vertical</option>
          </select>
        </label>

        <div class="two-grid coord-grid" style="margin-top: 10px;">
          <label class="field">
            <span class="field-label">${this.orientation === "vertical" ? "X Position" : "Y Position"}</span>
            <input type="number" name="position" value="${changeValues(this.position)}">
          </label>
          <label class="field">
            <span class="field-label">Color</span>
            <div class="pickr-wrap" data-name="color">
              <button type="button" class="pickr-trigger"></button>
              <input type="color" name="color" value="${this.color}" hidden>
            </div>
          </label>
          <label class="field">
            <span class="field-label">Thickness</span>
            <input type="number" name="thickness" value="${this.thickness}">
          </label>
          <label class="field">
            <span class="field-label">Rotation</span>
            <input type="number" name="angle" value="${radToDeg(this.angle, "deg")}">
          </label>
        </div>
      </section>
    `;

    const orientationSelect = propertiesBar.querySelector(
      "select[name='orientation']",
    );
    if (orientationSelect) {
      orientationSelect.addEventListener("change", (e) => {
        this.changeProperties(e);
      });
    }
    initPickrs(propertiesBar);
  }

  changeProperties(e) {
    const name = e.target.name;
    if (name === "position")
      this.position = backValues(Number(e.target.value) || 0);
    if (name === "color") this.color = e.target.value;
    if (name === "thickness")
      this.thickness = Math.max(1, Number(e.target.value) || 1);
    if (name === "angle")
      this.angle = radToDeg(Number(e.target.value) || 0, "rad");
    if (name === "orientation") {
      this.orientation = e.target.value;
      this.formatProperties(); // Refresh the panel to swap the X/Y label
    }
    requestDraw();
  }

  showClone(isUndo = false) {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    if (!isUndo) {
      clone.id = crypto.randomUUID();
    }
    return clone;
  }

  changeLocation(value, type) {
    if (this.orientation === "vertical" && type === "x") {
      this.position = value;
    } else if (this.orientation === "horizontal" && type === "y") {
      this.position = value;
    }
  }

  moveClip(x, y) {
    if (this.orientation === "vertical") {
      this.position += x;
    } else {
      this.position += y;
    }
  }

  doubleClicked(mouse) {
    this.isDoubleClicked = !this.isDoubleClicked;
    return true;
  }

  backToDefault() {
    // Guides are static across iterations, so nothing to reset
  }

  drawIteratedImage(i) {
    // Guides do not iterate visually
  }

  getWorldPoints() {
    return []; // Return empty so path-snapping algorithms don't throw an undefined error
  }
}
