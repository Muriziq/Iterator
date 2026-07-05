import {
  canvas,
  ctx,
  canvass,
  canvassDiv,
  propertiesBar,
  notification,
  editclip,
  width,
  height,
  saveWorker,
  measurementArr,
  db,
  projectName,
  thresholds,
  generationArea,
} from "../constants.js";
import { objectProperties } from "../variable.js";
import { adapt, drawingObject } from "../state/canvas.js";
import { changeValues, radToDeg } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
export default class Formats {
  constructor() {
    this.id = crypto.randomUUID();
    this.clips = null;
    this.scaleX = 1;
    this.scaleY = 1;
    this.color = ["#ff0000", "#0000ff"];
    this.outline = true;
    this.outlineColor = "#00ff00";
    this.outlineThickness = adapt(2);
    this.lineDashWidth = adapt(5);
    this.lineDashSpacing = adapt(3);
    this.outlineType = [];
    this.isDoubleClicked = false;
    this.opacity = 100;
    this.colorFill = "none";
    this.colorDeg = 0.2;
    this.colorStop = [];
    this.selectedArea = null;
    this.angle = 0;
    this.clipper = null;
    this.blurEnabled = false;
    this.blur = 10;
    this.shadow = false;
    this.shadowColor = "#000000";
    this.shadowBlur = 10;
    this.shadowOffsetX = 5;
    this.shadowOffsetY = 5;
  }
  similarPropties() {
    document.querySelector(".normalb").addEventListener("click", () => {
      this.outlineType = [];
      if (this.type === "group") {
        this.list.forEach((l) => (l.outlineType = []));
      }
      this.formatProperties();
      requestDraw();
    });
    document.querySelector(".dashedb").addEventListener("click", () => {
      if (this.type === "group") {
        this.list.forEach((l) => {
          l.lineDashWidth = this.lineDashWidth;
          l.lineDashSpacing = this.lineDashSpacing;
        });
      }
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
      if (this.type === "group") {
        this.list.forEach(
          (l) => (l.outlineType = [l.lineDashWidth, l.lineDashSpacing]),
        );
      }
      this.formatProperties();
      requestDraw();
    });
    document.getElementById("outline").addEventListener("click", () => {
      this.outline = !this.outline;
      if (this.type === "group") {
        this.list.forEach((l) => (l.outline = this.outline));
      }
      this.formatProperties();
      requestDraw();
    });
    if (this.colorFill === "linear" || this.colorFill === "radial") {
      if (this.type === "group") {
        this.list.forEach((l) => {
          l.color = this.color;
          l.colorStop = this.colorStop;
          l.colorDeg = this.colorDeg;
        });
      }
      document.querySelector(".addColor").addEventListener("click", () => {
        this.color.push("#ff0000");
        this.colorStop = [];
        if (this.type === "group") {
          this.list.forEach((l) => {
            this.color.push("#ff0000");
            this.colorStop = [];
          });
        }
        this.addObject();
        this.formatProperties();
        requestDraw();
      });
      document.querySelectorAll(".color-div").forEach((div, i) => {
        div
          .querySelector("input[type='number']")
          .addEventListener("input", (e) => {
            this.colorStop[i] = e.target.value;
            if (this.type === "group") {
              this.list.forEach((l) => (l.colorStop[i] = e.target.value));
            }
            requestDraw();
          });
        div
          .querySelector("input[type='color']")
          .addEventListener("input", (e) => {
            this.color[i] = e.target.value;
            if (this.type === "group") {
              this.list.forEach((l) => (l.color[i] = e.target.value));
            }
            requestDraw();
          });
        div.querySelector("button").addEventListener("click", (e) => {
          this.color.splice(i, 1);
          this.colorStop = [];
          if (this.type === "group") {
            this.list.forEach((l) => {
              l.color.splice(i, 1);
              l.colorStop = [];
            });
            requestDraw();
          }
          this.addObject();
          this.formatProperties();
          requestDraw();
        });
      });
    }

    document.querySelector(".color-select").addEventListener("change", (e) => {
      this.colorFill = e.target.value;
      if (this.type === "group") {
        this.list.forEach((l) => (l.colorFill = this.colorFill));
      }
      this.addObject();
      this.formatProperties();
      requestDraw();
    });
    const shadowToggle = document.getElementById("shadowToggle");
    if (shadowToggle) {
      shadowToggle.addEventListener("click", () => {
        this.shadow = !this.shadow;
        if (this.type === "group") {
          this.list.forEach((l) => (l.shadow = this.shadow));
        }
        this.formatProperties();
        requestDraw();
      });
    }
    const blurToggle = document.getElementById("blurToggle");
    if (blurToggle) {
      blurToggle.addEventListener("click", () => {
        this.blurEnabled = !this.blurEnabled;
        if (this.type === "group") {
          this.list.forEach((l) => (l.blurEnabled = this.blurEnabled));
        }
        this.formatProperties();
        requestDraw();
      });
    }
  }
  similarProptiesOutput() {
    return `
    <section class="fill-section">
      <h3>Fill</h3>

      <select class="color-select">
        <option value="none" ${this.colorFill === "none" ? "selected" : ""}>None</option>
        <option value="uniform" ${this.colorFill === "uniform" ? "selected" : ""}>Uniform</option>
        <option value="linear" ${this.colorFill === "linear" ? "selected" : ""}>Linear-Gradient</option>
        <option value="radial" ${this.colorFill === "radial" ? "selected" : ""}>Radial-Gradient</option>
      </select>

      <label class="uniform-div" style="display:${this.colorFill === "uniform" ? "flex" : "none"}">
        <span>Background-Color:</span>
        <div class="pickr-wrap" data-name="bgColor">
          <button type="button" class="pickr-trigger"></button>
          <input
            type="color"
            name="bgColor"
            value="${this.color[0].length > 7 ? this.color[0].slice(0, 7) : this.color[0]}"
            hidden
          >
        </div>
      </label>

      <section
        class="gradient-section"
        style="display:${this.colorFill === "linear" || this.colorFill === "radial" ? "flex" : "none"};flex-direction:column;gap:1rem"
      >
        ${this.color
          .map(
            (color, i) => `
              <div class="color-div">
                <div style="text-wrap:nowrap; padding:0.5rem 1rem">Index: ${i}</div>

                <label style="display:flex;flex-direaction:row;gap:0.5rem">
                  Stop:
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value="${this.colorStop[i]}"
                  >
                </label>

                <div class="pickr-wrap">
                  <button type="button" class="pickr-trigger"></button>
                  <input type="color" value="${color.length > 7 ? color.slice(0, 7) : color}" hidden>
                </div>
                <button></button>
              </div>
            `,
          )
          .join("")}

        <section class="color-sec">
          <button class="addColor">Add Color <img src="imagess/plus.svg"></button>

          <label  style="display:${this.colorFill === "linear" ? "flex" : "none"}">
            Rotation
            <input type="number" name="colorDeg" value="${radToDeg(this.colorDeg, "deg")}">deg
          </label>
        </section>
      </section>
    </section>

    <section class="outline-section" style="display:flex; flex-direction:column; gap:1rem">
      <header style="display:flex; flex-direction:row; justify-content:space-between; align-items:center">
        <h3>Outline</h3>
        <button class="${this.outline ? "outlinet" : "outlinef"}" id="outline"></button>
      </header>

      <section style="display:${this.outline ? "flex" : "none"}; flex-direction:column; gap:1rem">
        <label class="uniform-div">
          <span>Outiline Color</span>
          <div class="pickr-wrap" data-name="outlineColor">
            <button type="button" class="pickr-trigger"></button>
            <input type="color" name="outlineColor" value="${this.outlineColor}" hidden>
          </div>
        </label>

        <label class="thick">
          <span>Outline Thickness</span>
          <input type="number" name="outlineThickness" value="${changeValues(this.outlineThickness)}">
        </label>

        <div class="uniform-div">
          Outline Type
          <div>
            <button class="normalb ${this.outlineType.length === 0 ? "selected" : ""}"></button>
            <button class="dashedb ${this.outlineType.length !== 0 ? "selected" : ""}"></button>
          </div>
        </div>

        <div class="two-grid" style="display:${this.outlineType.length !== 0 ? "grid" : "none"}">
          <label class="field">
            <span class="field-label">Width</span>
            <input type="number" name="lineDashWidth" value="${this.lineDashWidth}">
          </label>

          <label class="field">
            <span class="field-label">Spacing</span>
            <input type="number" name="lineDashSpacing" value="${this.lineDashSpacing}">
          </label>
        </div>
      </section>
    </section>

    <section class="blur-section" style="display:flex; flex-direction:column; gap:1rem">
      <header style="display:flex; flex-direction:row; justify-content:space-between; align-items:center">
        <h3>Blur</h3>
        <button class="${this.blurEnabled ? "outlinet" : "outlinef"}" id="blurToggle"></button>
      </header>

      <section style="display:${this.blurEnabled ? "flex" : "none"}; flex-direction:column; gap:1rem">
        <label class="thick">
          <span>Blur Radius</span>
          <input type="number" name="blur" min="0" value="${changeValues(this.blur || 0)}">
        </label>
      </section>
    </section>

    <section class="shadow-section" style="display:flex; flex-direction:column; gap:1rem">
      <header style="display:flex; flex-direction:row; justify-content:space-between; align-items:center">
        <h3>Shadow</h3>
        <button class="${this.shadow ? "outlinet" : "outlinef"}" id="shadowToggle"></button>
      </header>

      <section style="display:${this.shadow ? "flex" : "none"}; flex-direction:column; gap:1rem">
        <label class="uniform-div">
          <span>Shadow Color</span>
          <div class="pickr-wrap" data-name="shadowColor">
            <button type="button" class="pickr-trigger"></button>
            <input type="color" name="shadowColor" value="${this.shadowColor}" hidden>
          </div>
        </label>

        <div class="two-grid">
          <label class="field">
            <span class="field-label">Blur</span>
            <input type="number" name="shadowBlur" value="${changeValues(this.shadowBlur)}">
          </label>

          <label class="field">
            <span class="field-label">Offset X</span>
            <input type="number" name="shadowOffsetX" value="${changeValues(this.shadowOffsetX)}">
          </label>

          <label class="field">
            <span class="field-label">Offset Y</span>
            <input type="number" name="shadowOffsetY" value="${changeValues(this.shadowOffsetY)}">
          </label>
        </div>
      </section>
    </section>
  `;
  }
  shapeProperties() {
    return `
          <button class="convert ${
            this.selectedArea === "pointIndex" &&
            this.points[this.selectedLineIndex].edgeModes === "shaped"
              ? "selected"
              : ""
          }">
        <img src="imagess/spline-pointer.svg" alt="Convert">
      </button>
      <button class="rounded-edge ${
        this.selectedArea === "pointIndex" &&
        this.points[this.selectedLineIndex].edgeModes === "rounded"
          ? "selected"
          : ""
      }" >
        <img src="imagess/square-round-corner.svg" alt="Rounded edge">
      </button>
    `;
  }
  getWorldPoints() {
    if (
      this.type === "ellipse" ||
      this.type === "text" ||
      this.type === "image" ||
      this.type === "group"
    ) {
      let ellipseW = this.whereToSnap();
      return [
        { x: ellipseW.x[0], y: ellipseW.y[0] },
        { x: ellipseW.x[1], y: ellipseW.y[1] },
        { x: ellipseW.x[2], y: ellipseW.y[2] },
      ];
    }
    if (this.type === "rectangle" && this.roundedOrbeveled !== "shaped") {
      let rectW = this.whereToSnap();
      return [
        { x: rectW.x[0], y: rectW.y[0] },
        { x: rectW.x[1], y: rectW.y[1] },
        { x: rectW.x[2], y: rectW.y[2] },
      ];
    }

    return this.points.map((point) => this.pointToWorld(point.points));
  }
  pointToWorld(point) {
    let centerX;
    let centerY;
    if (this.type === "rectangle") {
      centerX = this.x + this.width / 2;
      centerY = this.y + this.height / 2;
    } else {
      centerX = this.x;
      centerY = this.y;
    }
    const scaledX = point.x * this.scaleX;
    const scaledY = point.y * this.scaleY;

    const rotatedX =
      scaledX * Math.cos(this.angle) - scaledY * Math.sin(this.angle);
    const rotatedY =
      scaledX * Math.sin(this.angle) + scaledY * Math.cos(this.angle);

    // Step 2: Translate to world position
    const worldX = centerX + rotatedX;
    const worldY = centerY + rotatedY;
    return { x: worldX, y: worldY };
  }
  worldToPoint(point) {
    let centerX;
    let centerY;
    if (this.type === "rectangle") {
      centerX = this.x + this.width / 2;
      centerY = this.y + this.height / 2;
    } else {
      centerX = this.x;
      centerY = this.y;
    }
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    // Remove translation
    const translatedX = point.x - centerX;
    const translatedY = point.y - centerY;

    // Remove rotation
    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;

    // Remove objectProperties.scale
    return {
      x: rotatedX / this.scaleX,
      y: rotatedY / this.scaleY,
    };
  }

  lineFormat(localMouseX, localMouseY, localDeltaX, localDeltaY) {
    if (this.selectedArea === "lineIndex") {
      const next = (this.selectedLineIndex + 1) % this.points.length;
      this.points[this.selectedLineIndex].points.x += localDeltaX;
      this.points[this.selectedLineIndex].points.y += localDeltaY;
      this.points[next].points.x += localDeltaX;
      this.points[next].points.y += localDeltaY;
      this.points[this.selectedLineIndex].controls[0].x += localDeltaX;
      this.points[this.selectedLineIndex].controls[0].y += localDeltaY;
      this.points[this.selectedLineIndex].controls[1].x += localDeltaX;
      this.points[this.selectedLineIndex].controls[1].y += localDeltaY;
      this.points[next].controls[0].x += localDeltaX;
      this.points[next].controls[0].y += localDeltaY;
      this.points[next].controls[1].x += localDeltaX;
      this.points[next].controls[1].y += localDeltaY;
      return;
    } else if (this.selectedArea === "pointIndex") {
      this.points[this.selectedLineIndex].points.x = localMouseX;
      this.points[this.selectedLineIndex].points.y = localMouseY;
      this.points[this.selectedLineIndex].controls[0].x += localDeltaX;
      this.points[this.selectedLineIndex].controls[0].y += localDeltaY;
      this.points[this.selectedLineIndex].controls[1].x += localDeltaX;
      this.points[this.selectedLineIndex].controls[1].y += localDeltaY;
    } else if (this.selectedArea === "curveIndex") {
      const { curveIndex, controlIndex } = this.selectedLineIndex;
      this.points[curveIndex].controls[controlIndex].x = localMouseX;
      this.points[curveIndex].controls[controlIndex].y = localMouseY;
      return;
    }
    // Store current local position
    const currentLocalPoint = this.points[this.selectedLineIndex].points;
    const currentWorldPoint = this.pointToWorld(currentLocalPoint);

    let pointXfound = false;
    let pointYfound = false;

    // 1. Check internal points (in local space for X)
    for (let i = 0; i < this.points.length; i++) {
      if (i === this.selectedLineIndex) continue;

      // For X snapping - compare world X coordinates
      const otherWorldPoint = this.pointToWorld(this.points[i].points);
      if (
        Math.abs(otherWorldPoint.x - currentWorldPoint.x) <
        thresholds.pthreshold()
      ) {
        // Create new world point with snapped X, keep original Y
        const snappedWorldPoint = {
          x: otherWorldPoint.x,
          y: currentWorldPoint.y,
        };
        const newLocalPoint = this.worldToPoint(snappedWorldPoint);
        this.points[this.selectedLineIndex].points.x = newLocalPoint.x;
        pointXfound = true;
        break;
      }
    }

    // 2. Check other objectProperties.objects for X snapping
    if (!pointXfound) {
      for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
        if (objectProperties.objects[i] === this) continue; // Skip self

        const worldPoints = objectProperties.objects[i].getWorldPoints(); // You need this method
        for (let e = worldPoints.length - 1; e >= 0; e--) {
          if (
            Math.abs(worldPoints[e].x - currentWorldPoint.x) <
            thresholds.pthreshold()
          ) {
            // Snap X only, keep current Y in world space
            const snappedWorldPoint = {
              x: worldPoints[e].x,
              y: currentWorldPoint.y,
            };
            const newLocalPoint = this.worldToPoint(snappedWorldPoint);
            this.points[this.selectedLineIndex].points.x = newLocalPoint.x;
            pointXfound = true;
            break;
          }
        }
        if (pointXfound) break;
      }
    }

    // 3. Check internal points for Y snapping
    for (let i = 0; i < this.points.length; i++) {
      if (i === this.selectedLineIndex) continue;

      const otherWorldPoint = this.pointToWorld(this.points[i].points);
      if (
        Math.abs(otherWorldPoint.y - currentWorldPoint.y) <
        thresholds.pthreshold()
      ) {
        const snappedWorldPoint = {
          x: currentWorldPoint.x,
          y: otherWorldPoint.y,
        };
        const newLocalPoint = this.worldToPoint(snappedWorldPoint);
        this.points[this.selectedLineIndex].points.y = newLocalPoint.y;
        pointYfound = true;
        break;
      }
    }

    // 4. Check other objectProperties.objects for Y snapping
    if (!pointYfound) {
      for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
        if (objectProperties.objects[i] === this) continue;

        const worldPoints = objectProperties.objects[i].getWorldPoints();
        for (let e = worldPoints.length - 1; e >= 0; e--) {
          if (
            Math.abs(worldPoints[e].y - currentWorldPoint.y) <
            thresholds.pthreshold()
          ) {
            const snappedWorldPoint = {
              x: currentWorldPoint.x,
              y: worldPoints[e].y,
            };
            const newLocalPoint = this.worldToPoint(snappedWorldPoint);
            this.points[this.selectedLineIndex].points.y = newLocalPoint.y;
            pointYfound = true;
            break;
          }
        }
        if (pointYfound) break;
      }
    }
  }
  pointDblClick(localMouseX, localMouseY) {
    if (this.selectedArea === "pointIndex") {
      if (this.points.length > 3) {
        this.points.splice(this.selectedLineIndex, 1);
        return true;
      }
    }
    if (this.selectedArea === "lineIndex") {
      const next = (this.selectedLineIndex + 1) % this.points.length;
      if (this.points[this.selectedLineIndex].edgeModes !== true) {
        const prev = this.points[this.selectedLineIndex];
        const nextPoint = this.points[next];
        const dx = nextPoint.points.x - prev.points.x;
        const dy = nextPoint.points.y - prev.points.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / length;
        const uy = dy / length;
        const handleLength = length * 0.2;
        const control1 = {
          x: localMouseX - ux * handleLength,
          y: localMouseY - uy * handleLength,
        };
        const control2 = {
          x: localMouseX + ux * handleLength,
          y: localMouseY + uy * handleLength,
        };
        this.points.splice(next, 0, {
          points: { x: localMouseX, y: localMouseY },
          edgeModes: null,
          controls: [control1, control2],
          cornerRadius: 0,
        });
      }
      return true;
    }
  }
  rectFormat(mouse) {
    if (this.selectedArea === "Left") {
      let snap = false;
      const newWidth = this.width + (this.x - mouse.x);
      if (newWidth > 0) {
        let newX = mouse.x;
        let newWidthCalc = newWidth;

        // Snap logic for Left
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const xCoor = objectProperties.objects[i].whereToSnap().x;
          for (let e = 0; e < xCoor.length; e++) {
            if (Math.abs(xCoor[e] - newX) < thresholds.pthreshold()) {
              const difference = xCoor[e] - newX;
              newX = xCoor[e];
              newWidthCalc = newWidth - difference; // Adjust width when snapping
              snap = true;
              break;
            }
          }
          if (snap) break;
        }

        this.x = newX;
        this.width = newWidthCalc;
      }
    } else if (this.selectedArea === "Right") {
      let snap = false;
      const newWidth = mouse.x - this.x;
      if (newWidth > 0) {
        let newWidthCalc = newWidth;

        // Snap logic for Right
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const xCoor = objectProperties.objects[i].whereToSnap().x;
          for (let e = 0; e < xCoor.length; e++) {
            if (
              Math.abs(xCoor[e] - (this.x + newWidthCalc)) <
              thresholds.pthreshold()
            ) {
              newWidthCalc = xCoor[e] - this.x;
              snap = true;
              break;
            }
          }
          if (snap) break;
        }

        this.width = newWidthCalc;
      }
    } else if (this.selectedArea === "Top") {
      let snap = false;
      const newHeight = this.height + (this.y - mouse.y);
      if (newHeight > 0) {
        let newY = mouse.y;
        let newHeightCalc = newHeight;

        // Snap logic for Top
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const yCoor = objectProperties.objects[i].whereToSnap().y;
          for (let e = 0; e < yCoor.length; e++) {
            if (Math.abs(yCoor[e] - newY) < thresholds.pthreshold()) {
              const difference = yCoor[e] - newY;
              newY = yCoor[e];
              newHeightCalc = newHeight - difference;
              snap = true;
              break;
            }
          }
          if (snap) break;
        }

        this.y = newY;
        this.height = newHeightCalc;
      }
    } else if (this.selectedArea === "Bottom") {
      let snap = false;
      const newHeight = mouse.y - this.y;
      if (newHeight > 0) {
        let newHeightCalc = newHeight;

        // Snap logic for Bottom
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const yCoor = objectProperties.objects[i].whereToSnap().y;
          for (let e = 0; e < yCoor.length; e++) {
            if (
              Math.abs(yCoor[e] - (this.y + newHeightCalc)) <
              thresholds.pthreshold()
            ) {
              newHeightCalc = yCoor[e] - this.y;
              snap = true;
              break;
            }
          }
          if (snap) break;
        }

        this.height = newHeightCalc;
      }
    } else if (this.selectedArea === "TopLeft") {
      let snapX = false,
        snapY = false;
      let newX = mouse.x;
      let newY = mouse.y;
      let newWidth = this.width + (this.x - mouse.x);
      let newHeight = this.height + (this.y - mouse.y);

      if (newWidth > 0) {
        // Snap X
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const xCoor = objectProperties.objects[i].whereToSnap().x;
          for (let e = 0; e < xCoor.length; e++) {
            if (Math.abs(xCoor[e] - newX) < thresholds.pthreshold()) {
              const difference = xCoor[e] - newX;
              newX = xCoor[e];
              newWidth = newWidth - difference;
              snapX = true;
              break;
            }
          }
          if (snapX) break;
        }

        // Snap Y
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const yCoor = objectProperties.objects[i].whereToSnap().y;
          for (let e = 0; e < yCoor.length; e++) {
            if (Math.abs(yCoor[e] - newY) < thresholds.pthreshold()) {
              const difference = yCoor[e] - newY;
              newY = yCoor[e];
              newHeight = newHeight - difference;
              snapY = true;
              break;
            }
          }
          if (snapY) break;
        }

        this.x = newX;
        this.y = newY;
        this.width = newWidth;
        this.height = newHeight;
      }
    } else if (this.selectedArea === "TopRight") {
      let snapY = false;
      let newY = mouse.y;
      let newWidth = mouse.x - this.x;
      let newHeight = this.height + (this.y - mouse.y);

      if (newWidth > 0 && newHeight > 0) {
        // Snap Y (Top side)
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const yCoor = objectProperties.objects[i].whereToSnap().y;
          for (let e = 0; e < yCoor.length; e++) {
            if (Math.abs(yCoor[e] - newY) < thresholds.pthreshold()) {
              const difference = yCoor[e] - newY;
              newY = yCoor[e];
              newHeight = newHeight - difference;
              snapY = true;
              break;
            }
          }
          if (snapY) break;
        }

        // Snap X (Right side)
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const xCoor = objectProperties.objects[i].whereToSnap().x;
          for (let e = 0; e < xCoor.length; e++) {
            if (
              Math.abs(xCoor[e] - (this.x + newWidth)) < thresholds.pthreshold()
            ) {
              newWidth = xCoor[e] - this.x;
              break;
            }
          }
        }

        this.y = newY;
        this.width = newWidth;
        this.height = newHeight;
      }
    } else if (this.selectedArea === "BottomLeft") {
      let snapX = false;
      let newX = mouse.x;
      let newWidth = this.width + (this.x - mouse.x);
      let newHeight = mouse.y - this.y;

      if (newWidth > 0 && newHeight > 0) {
        // Snap X (Left side)
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const xCoor = objectProperties.objects[i].whereToSnap().x;
          for (let e = 0; e < xCoor.length; e++) {
            if (Math.abs(xCoor[e] - newX) < thresholds.pthreshold()) {
              const difference = xCoor[e] - newX;
              newX = xCoor[e];
              newWidth = newWidth - difference;
              snapX = true;
              break;
            }
          }
          if (snapX) break;
        }

        // Snap Y (Bottom side)
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const yCoor = objectProperties.objects[i].whereToSnap().y;
          for (let e = 0; e < yCoor.length; e++) {
            if (
              Math.abs(yCoor[e] - (this.y + newHeight)) <
              thresholds.pthreshold()
            ) {
              newHeight = yCoor[e] - this.y;
              break;
            }
          }
        }

        this.x = newX;
        this.width = newWidth;
        this.height = newHeight;
      }
    } else if (this.selectedArea === "BottomRight") {
      let newWidth = mouse.x - this.x;
      let newHeight = mouse.y - this.y;

      if (newWidth > 0 && newHeight > 0) {
        // Snap X (Right side)
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const xCoor = objectProperties.objects[i].whereToSnap().x;
          for (let e = 0; e < xCoor.length; e++) {
            if (
              Math.abs(xCoor[e] - (this.x + newWidth)) < thresholds.pthreshold()
            ) {
              newWidth = xCoor[e] - this.x;
              break;
            }
          }
        }

        // Snap Y (Bottom side)
        for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
          if (objectProperties.objects[i] === this) continue;
          const yCoor = objectProperties.objects[i].whereToSnap().y;
          for (let e = 0; e < yCoor.length; e++) {
            if (
              Math.abs(yCoor[e] - (this.y + newHeight)) <
              thresholds.pthreshold()
            ) {
              newHeight = yCoor[e] - this.y;
              break;
            }
          }
        }

        this.width = newWidth;
        this.height = newHeight;
      }
    }

    // Ensure positive dimensions
    this.width = this.width <= 0 ? 0 : this.width;
    this.height = this.height <= 0 ? 0 : this.height;
  }
  circFormat(mouse, x, y) {
    if (this.isDoubleClicked) {
      this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2;
    } else {
      if (this.selectedArea === "Left") {
        let snap = false;
        const newRadiusX = this.radiusX + (x - mouse.x);
        if (newRadiusX > 0) {
          this.radiusX = newRadiusX;
          let newX = mouse.x;
          let newWidthCalc = this.radiusX;

          // Snap logic for Left
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const xCoor = objectProperties.objects[i].whereToSnap().x;
            for (let e = 0; e < xCoor.length; e++) {
              if (Math.abs(xCoor[e] - newX) < thresholds.pthreshold()) {
                const difference = xCoor[e] - newX;
                newX = xCoor[e];
                newWidthCalc = newRadiusX - difference;
                snap = true;
                break;
              }
            }
            if (snap) break;
          }
          this.radiusX = newWidthCalc;
        }
      } else if (this.selectedArea === "Right") {
        let snap = false;
        const newRadiusX = mouse.x - this.x;
        if (newRadiusX > 0) {
          let newRadiusCalc = newRadiusX;

          // Snap logic for Right
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const xCoor = objectProperties.objects[i].whereToSnap().x;
            for (let e = 0; e < xCoor.length; e++) {
              if (
                Math.abs(xCoor[e] - (this.x + newRadiusCalc)) <
                thresholds.pthreshold()
              ) {
                newRadiusCalc = xCoor[e] - this.x;
                snap = true;
                break;
              }
            }
            if (snap) break;
          }
          this.radiusX = newRadiusCalc;
        }
      } else if (this.selectedArea === "Top") {
        let snap = false;
        const newRadiusY = this.radiusY + (y - mouse.y);
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
          let newY = mouse.y;
          let newHeightCalc = this.radiusY;

          // Snap logic for Top
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const yCoor = objectProperties.objects[i].whereToSnap().y;
            for (let e = 0; e < yCoor.length; e++) {
              if (Math.abs(yCoor[e] - newY) < thresholds.pthreshold()) {
                const difference = yCoor[e] - newY;
                newY = yCoor[e];
                newHeightCalc = newRadiusY - difference;
                snap = true;
                break;
              }
            }
            if (snap) break;
          }
          this.radiusY = newHeightCalc;
        }
      } else if (this.selectedArea === "Bottom") {
        let snap = false;
        const newRadiusY = mouse.y - this.y;
        if (newRadiusY > 0) {
          let newRadiusCalc = newRadiusY;

          // Snap logic for Bottom
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const yCoor = objectProperties.objects[i].whereToSnap().y;
            for (let e = 0; e < yCoor.length; e++) {
              if (
                Math.abs(yCoor[e] - (this.y + newRadiusCalc)) <
                thresholds.pthreshold()
              ) {
                newRadiusCalc = yCoor[e] - this.y;
                snap = true;
                break;
              }
            }
            if (snap) break;
          }
          this.radiusY = newRadiusCalc;
        }
      } else if (this.selectedArea === "TopLeft") {
        let snapX = false,
          snapY = false;
        const newRadiusX = this.radiusX + (x - mouse.x);
        const newRadiusY = this.radiusY + (y - mouse.y);

        if (newRadiusX > 0 && newRadiusY > 0) {
          let newX = mouse.x;
          let newY = mouse.y;
          let newRadiusXCalc = newRadiusX;
          let newRadiusYCalc = newRadiusY;

          // Snap X (Left)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const xCoor = objectProperties.objects[i].whereToSnap().x;
            for (let e = 0; e < xCoor.length; e++) {
              if (Math.abs(xCoor[e] - newX) < thresholds.pthreshold()) {
                const difference = xCoor[e] - newX;
                newX = xCoor[e];
                newRadiusXCalc = newRadiusX - difference;
                snapX = true;
                break;
              }
            }
            if (snapX) break;
          }

          // Snap Y (Top)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const yCoor = objectProperties.objects[i].whereToSnap().y;
            for (let e = 0; e < yCoor.length; e++) {
              if (Math.abs(yCoor[e] - newY) < thresholds.pthreshold()) {
                const difference = yCoor[e] - newY;
                newY = yCoor[e];
                newRadiusYCalc = newRadiusY - difference;
                snapY = true;
                break;
              }
            }
            if (snapY) break;
          }

          this.radiusX = newRadiusXCalc;
          this.radiusY = newRadiusYCalc;
        }
      } else if (this.selectedArea === "TopRight") {
        let snapY = false;
        const newRadiusX = mouse.x - this.x;
        const newRadiusY = this.radiusY + (y - mouse.y);

        if (newRadiusX > 0 && newRadiusY > 0) {
          let newY = mouse.y;
          let newRadiusXCalc = newRadiusX;
          let newRadiusYCalc = newRadiusY;

          // Snap X (Right)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const xCoor = objectProperties.objects[i].whereToSnap().x;
            for (let e = 0; e < xCoor.length; e++) {
              if (
                Math.abs(xCoor[e] - (this.x + newRadiusXCalc)) <
                thresholds.pthreshold()
              ) {
                newRadiusXCalc = xCoor[e] - this.x;
                snapY = true;
                break;
              }
            }
            if (snapY) break;
          }

          // Snap Y (Top)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const yCoor = objectProperties.objects[i].whereToSnap().y;
            for (let e = 0; e < yCoor.length; e++) {
              if (Math.abs(yCoor[e] - newY) < thresholds.pthreshold()) {
                const difference = yCoor[e] - newY;
                newY = yCoor[e];
                newRadiusYCalc = newRadiusY - difference;
                snapY = true;
                break;
              }
            }
            if (snapY) break;
          }

          this.radiusX = newRadiusXCalc;
          this.radiusY = newRadiusYCalc;
        }
      } else if (this.selectedArea === "BottomLeft") {
        let snapX = false;
        const newRadiusX = this.radiusX + (x - mouse.x);
        const newRadiusY = mouse.y - this.y;

        if (newRadiusX > 0 && newRadiusY > 0) {
          let newX = mouse.x;
          let newRadiusXCalc = newRadiusX;
          let newRadiusYCalc = newRadiusY;

          // Snap X (Left)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const xCoor = objectProperties.objects[i].whereToSnap().x;
            for (let e = 0; e < xCoor.length; e++) {
              if (Math.abs(xCoor[e] - newX) < thresholds.pthreshold()) {
                const difference = xCoor[e] - newX;
                newX = xCoor[e];
                newRadiusXCalc = newRadiusX - difference;
                snapX = true;
                break;
              }
            }
            if (snapX) break;
          }

          // Snap Y (Bottom)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const yCoor = objectProperties.objects[i].whereToSnap().y;
            for (let e = 0; e < yCoor.length; e++) {
              if (
                Math.abs(yCoor[e] - (this.y + newRadiusYCalc)) <
                thresholds.pthreshold()
              ) {
                newRadiusYCalc = yCoor[e] - this.y;
                snapX = true;
                break;
              }
            }
            if (snapX) break;
          }

          this.radiusX = newRadiusXCalc;
          this.radiusY = newRadiusYCalc;
        }
      } else if (this.selectedArea === "BottomRight") {
        let snapX = false,
          snapY = false;
        const newRadiusX = mouse.x - this.x;
        const newRadiusY = mouse.y - this.y;

        if (newRadiusX > 0 && newRadiusY > 0) {
          let newRadiusXCalc = newRadiusX;
          let newRadiusYCalc = newRadiusY;

          // Snap X (Right)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const xCoor = objectProperties.objects[i].whereToSnap().x;
            for (let e = 0; e < xCoor.length; e++) {
              if (
                Math.abs(xCoor[e] - (this.x + newRadiusXCalc)) <
                thresholds.pthreshold()
              ) {
                newRadiusXCalc = xCoor[e] - this.x;
                snapX = true;
                break;
              }
            }
            if (snapX) break;
          }

          // Snap Y (Bottom)
          for (let i = objectProperties.objects.length - 1; i >= 0; i--) {
            if (objectProperties.objects[i] === this) continue;
            const yCoor = objectProperties.objects[i].whereToSnap().y;
            for (let e = 0; e < yCoor.length; e++) {
              if (
                Math.abs(yCoor[e] - (this.y + newRadiusYCalc)) <
                thresholds.pthreshold()
              ) {
                newRadiusYCalc = yCoor[e] - this.y;
                snapY = true;
                break;
              }
            }
            if (snapY) break;
          }

          this.radiusX = newRadiusXCalc;
          this.radiusY = newRadiusYCalc;
        }
      } else if (this.selectedArea === "Selected") {
        this.x += mouse.x - objectProperties.lastMouseX;
        this.y += mouse.y - objectProperties.lastMouseY;
        if (this.clips.length > 0) {
          this.clips.forEach((clip) =>
            clip.moveClip(
              mouse.x - objectProperties.lastMouseX,
              mouse.y - objectProperties.lastMouseY,
            ),
          );
        }
      }

      this.radiusX = this.radiusX <= 0 ? 0 : this.radiusX;
      this.radiusY = this.radiusY <= 0 ? 0 : this.radiusY;
    }
  }
}
