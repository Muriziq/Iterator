import Formats from "./formats.js";
import LineUtils from "./lineUtils.js";
import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties } from "../variable.js";
import { applyOpacityToHex, backValues, changeValues, radToDeg } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";

export default class Rectangle extends Formats {
  constructor(x, y, width, height) {
    super();
    this.type = "rectangle";
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.roundedOrbeveled = "beveled";
    this.cornerRadius = 0;
    this.clipped = "none";
    this.clips = [];

    this.points = [
      {
        points: { x: -this.width / 2, y: -this.height / 2 },
        edgeModes: null,
        controls: [
          { x: -this.width / 2 + this.width * 0.25, y: -this.height / 2 },
          { x: -this.width / 2 + this.width * 0.75, y: -this.height / 2 },
        ],
        cornerRadius: 0,
      },
      {
        points: { x: -this.width / 2 + this.width, y: -this.height / 2 },
        edgeModes: null,
        controls: [
          {
            x: -this.width / 2 + this.width,
            y: -this.height / 2 + this.height * 0.25,
          },
          {
            x: -this.width / 2 + this.width,
            y: -this.height / 2 + this.height * 0.75,
          },
        ],
        cornerRadius: 0,
      },
      {
        points: {
          x: -this.width / 2 + this.width,
          y: -this.height / 2 + this.height,
        },
        edgeModes: null,
        controls: [
          {
            x: -this.width / 2 + this.width * 0.75,
            y: -this.height / 2 + this.height,
          },
          {
            x: -this.width / 2 + this.width * 0.25,
            y: -this.height / 2 + this.height,
          },
        ],
        cornerRadius: 0,
      },
      {
        points: { x: -this.width / 2, y: -this.height / 2 + this.height },
        edgeModes: null,
        controls: [
          { x: -this.width / 2, y: -this.height / 2 + this.height * 0.75 },
          { x: -this.width / 2, y: -this.height / 2 + this.height * 0.25 },
        ],
        cornerRadius: 0,
      },
    ];
    this.selectedLineIndex = null;
    this.mode = "edit";
    this.previousSnap = { x: null, y: null };
  }
  addObject() {
    const xs = this.points.map((p) => p.points.x);
    const ys = this.points.map((p) => p.points.y);

    this.minX = Math.min(...xs);
    this.minY = Math.min(...ys);
    this.maxX = Math.max(...xs);
    this.maxY = Math.max(...ys);

    ctx.save();

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.beginPath();
    this.createPath();
    if (this.colorFill !== "none") {
      ctx.fillStyle = this.colorType();
      ctx.fill();
    }

    if (this.roundedOrbeveled === "shaped") {
      if (this.outline) {
        ctx.save();
        ctx.lineWidth = this.outlineThickness;
        ctx.setLineDash(this.outlineType);
        ctx.strokeStyle = this.outlineColor;
        ctx.stroke();
        ctx.restore();
      }
      if (this.mode === "edit" && objectProperties.selectedObj === this)
        LineUtils.drawEditArcs(
          this.points,
          this.selectedArea,
          this.selectedLineIndex,
        );
    }
    ctx.closePath();
    if (this.outline && this.roundedOrbeveled !== "shaped") {
      ctx.beginPath();
      ctx.lineWidth = this.outlineThickness;
      ctx.strokeStyle = this.outlineColor;
      ctx.setLineDash(this.outlineType);
      if (this.roundedOrbeveled === "rounded") {
        this.drawRoundedRect(
          -this.width / 2 - this.outlineThickness / 2,
          -this.height / 2 - this.outlineThickness / 2,
          this.width + this.outlineThickness,
          this.height + this.outlineThickness,
          this.cornerRadius,
        );
      } else if (this.roundedOrbeveled === "beveled") {
        this.drawBeveledRect(
          -this.width / 2 - this.outlineThickness / 2,
          -this.height / 2 - this.outlineThickness / 2,
          this.width + this.outlineThickness,
          this.height + this.outlineThickness,
          this.cornerRadius,
        );
      }

      ctx.stroke();
      ctx.closePath();
    }
    if (objectProperties.selectedObj === this) {
      ctx.beginPath();
      ctx.lineWidth = thresholds.slineWidth();
      ctx.strokeStyle = thresholds.sColor;
      ctx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);
      if (this.roundedOrbeveled !== "shaped") {
        ctx.strokeRect(
          -this.width / 2 - thresholds.sWidth() / 2,
          -this.height / 2 - thresholds.sWidth() / 2,
          this.width + thresholds.sWidth(),
          this.height + thresholds.sWidth(),
        );
      } else {
        ctx.strokeRect(
          this.minX,
          this.minY,
          this.maxX - this.minX,
          this.maxY - this.minY,
        );
        if (this.mode === "normal") {
          ctx.beginPath();
          ctx.fillStyle = thresholds.normalModeColor;
          ctx.fillRect(
            this.maxX - thresholds.normalMode() / 2,
            this.maxY - thresholds.normalMode() / 2,
            thresholds.normalMode(),
            thresholds.normalMode(),
          );
        }
      }

      ctx.closePath();
    }
    ctx.restore();
    if (this.clips.length > 0 && this.clipped !== "editclip") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(this.angle);
      this.createPath();
      ctx.clip();
      ctx.translate(-centerX, -centerY);
      this.clips.forEach((clip) => {
        clip.addObject();
      });
      ctx.restore();
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
      let minX, minY, maxX, maxY;
      if (this.roundedOrbeveled === "shaped") {
        minX = this.minX;
        minY = this.minY;
        maxX = this.maxX;
        maxY = this.maxY;
      } else {
        minX = -this.width / 2;
        minY = -this.height / 2;
        maxX = -this.width / 2 + this.width;
        maxY = -this.height / 2 + this.height;
      }

      let length = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);

      const endX = minX + length * Math.cos(this.colorDeg);
      const endY = minY + length * Math.sin(this.colorDeg);
      const grad = ctx.createLinearGradient(minX, minY, endX, endY);
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
      let minX, minY, maxX, maxY;
      if (this.roundedOrbeveled === "shaped") {
        minX = this.minX;
        minY = this.minY;
        maxX = this.maxX;
        maxY = this.maxY;
      } else {
        minX = -this.width / 2;
        minY = -this.height / 2;
        maxX = -this.width / 2 + this.width;
        maxY = -this.height / 2 + this.height;
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const radius = Math.max(maxX - minX, maxY - minY) / 2;
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
  createPath() {
    if (this.roundedOrbeveled === "shaped") {
      let edgeCurve = false;
      this.points.forEach((p) => {
        if (p.edgeModes !== null) edgeCurve = true;
      });
      if (edgeCurve) LineUtils.drawSmartShape(this.points);
      else {
        LineUtils.drawRoundedShape(this.points, this.cornerRadius);
        this.points.forEach((p) => {
          p.cornerRadius = this.cornerRadius;
        });
      }
    } else if (this.roundedOrbeveled === "rounded") {
      this.drawRoundedRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
        this.cornerRadius,
      );
    } else if (this.roundedOrbeveled === "beveled") {
      this.drawBeveledRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
        this.cornerRadius,
      );
    }
  }

  whatSelected(mouse) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    if (this.roundedOrbeveled === "shaped") {
      const localMouseX = dx * cos - dy * sin;
      const localMouseY = dx * sin + dy * cos;
      if (
        this.mode === "edit" &&
        (LineUtils.getPointPositon(localMouseX, localMouseY, this.points) ||
          LineUtils.getEdgeAtPosition(localMouseX, localMouseY, this.points))
      ) {
        const answer =
          LineUtils.getPointPositon(localMouseX, localMouseY, this.points) ===
          false
            ? LineUtils.getEdgeAtPosition(localMouseX, localMouseY, this.points)
            : LineUtils.getPointPositon(localMouseX, localMouseY, this.points);
        this.selectedArea = answer.type;
        this.selectedLineIndex = answer.value;
        return true;
      } else if (this.mode === "normal") {
        if (
          Math.abs(localMouseX - this.maxX) < thresholds.normalMode() / 2 &&
          Math.abs(localMouseY - this.maxY) < thresholds.normalMode() / 2
        ) {
          this.selectedArea = "objectProperties.scale";

          return true;
        }
        if (Math.abs(localMouseX - this.maxX) < thresholds.threshold()) {
          this.selectedArea = "scaleR";
          return true;
        }
        if (Math.abs(localMouseY - this.maxY) < thresholds.threshold()) {
          this.selectedArea = "scaleB";
          return true;
        }
        ctx.save();
        ctx.setTransform(objectProperties.scale, 0, 0, objectProperties.scale, objectProperties.panX, objectProperties.panY);
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(this.angle);
        ctx.scale(this.scaleX, this.scaleY);
        this.createPath();
        // const worldMouse = {
        //   x: (mouse.x - objectProperties.panX) / objectProperties.scale,
        //   y: (mouse.y - objectProperties.panY) / objectProperties.scale,
        // };
        const isInside = ctx.isPointInPath(mouse.x, mouse.y);
        ctx.restore();

        if (isInside) {
          this.selectedArea = "Selected";
        }
        return isInside;
      }
      return false;
    } else {
      const localX = dx * cos - dy * sin + this.width / 2;
      const localY = dx * sin + dy * cos + this.height / 2;

      this.selectedArea = LineUtils.getNormalPostion(
        localX,
        localY,
        this.width,
        this.height,
        thresholds.threshold(),
      );

      return this.selectedArea !== null;
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
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localMouseX = dx * cos - dy * sin;
    const localMouseY = dx * sin + dy * cos;
    if (this.roundedOrbeveled === "shaped" && this.mode === "edit") {
      const deltaX = mouse.x - objectProperties.lastMouseX;
      const deltaY = mouse.y - objectProperties.lastMouseY;
      const localDeltaX = deltaX * cos - deltaY * sin;
      const localDeltaY = deltaX * sin + deltaY * cos;
      super.lineFormat(localMouseX, localMouseY, localDeltaX, localDeltaY);
    } else {
      if (this.isDoubleClicked) {
        const center = {
          x: this.x + this.width / 2,
          y: this.y + this.height / 2,
        };
        this.angle =
          Math.atan2(mouse.y - center.y, mouse.x - center.x) - Math.PI / 2;
      } else if (this.selectedArea === "objectProperties.scale") {
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
      } else {
        if (this.roundedOrbeveled !== "shaped") {
          super.rectFormat(mouse);
        }
        if (this.selectedArea === "Selected") {
          this.x += mouse.x - objectProperties.lastMouseX;
          this.y += mouse.y - objectProperties.lastMouseY;
          if (this.clips.length > 0) {
            this.clips.forEach((clip) =>
              clip.moveClip(mouse.x - objectProperties.lastMouseX, mouse.y - objectProperties.lastMouseY),
            );
          }
        }
      }
    }
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

  formatProperties() {
    propertiesBar.innerHTML = `
  <section class="coord-section">
    <h3>Coordinate</h3>

    <div class="two-grid coord-grid">
      <label class="field">
        <span class="field-label">X</span>
        <input type="number" name="x" value="${
          this.roundedOrbeveled === "shaped"
            ? changeValues(this.x + this.minX + this.width / 2)
            : changeValues(this.x)
        }">
      </label>

      <label class="field">
        <span class="field-label">Y</span>
        <input type="number" name="y" value="${
          this.roundedOrbeveveled === "shaped"
            ? changeValues(this.x + this.minY + this.height / 2)
            : changeValues(this.y)
        }">
      </label>

      <label class="field">
        <span class="field-label">W</span>
        <input type="number" name="width" value="${
          this.roundedOrbeveled === "shaped"
            ? changeValues(this.maxX - this.minX)
            : changeValues(this.width)
        }">
      </label>

      <label class="field">
        <span class="field-label">H</span>
        <input type="number" name="height" value="${
          this.roundedOrbeveled === "shaped"
            ? changeValues(this.maxY - this.minY)
            : changeValues(this.height)
        }">
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
      <button class="beveled ${this.roundedOrbeveled === "beveled" ? "selected" : ""}">
        <img src="imagess/Vector 169.svg" alt="Beveled">
      </button>
      <button class="rounded ${this.roundedOrbeveled === "rounded" ? "selected" : ""}">
        <img src="imagess/Rectangle 128.svg" alt="Rounded">
      </button>
      <button class="shapetool ${this.roundedOrbeveled === "shaped" ? "selected" : ""}">
        <img src="imagess/vector-square.svg" alt="Shape tool">
      </button>
    </div>

    <div class="shape-row" style="display:${this.roundedOrbeveled === "shaped" ? "flex" : "none"}">
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

    <div class="shape-row shape-actions" style="display:${this.roundedOrbeveled === "shaped" ? "flex" : "none"};justify-content:end;align-items:end">
      <button class="normal">${this.mode === "edit" ? "Done" : "Edit"}</button>
    </div>
  </section>
`;

    if (this.roundedOrbeveled === "shaped") {
      let ifRounded = false;
      this.points.forEach((p) => {
        if (p.edgeModes !== null) ifRounded = true;
      });
      if (
        ifRounded &&
        this.selectedArea === "pointIndex" &&
        this.points[this.selectedLineIndex].edgeModes !== "rounded"
      ) {
        document.querySelector(".thick input").readOnly = true;
      } else document.querySelector(".thick input").readOnly = false;
    }
    super.similarPropties();
    document.querySelector(".beveled").addEventListener("click", () => {
      this.roundedOrbeveled = "beveled";
      this.formatProperties();
          requestDraw();
    });
    document.querySelector(".rounded").addEventListener("click", () => {
      this.roundedOrbeveled = "rounded";
      this.formatProperties();
          requestDraw();
    });
    document.querySelector(".shapetool").addEventListener("click", () => {
      this.roundedOrbeveled = "shaped";
      this.points = [
        {
          points: { x: -this.width / 2, y: -this.height / 2 },
          edgeModes: null,
          controls: [
            { x: -this.width / 2 + this.width * 0.25, y: -this.height / 2 },
            { x: -this.width / 2 + this.width * 0.75, y: -this.height / 2 },
          ],
          cornerRadius: 0,
        },
        {
          points: { x: -this.width / 2 + this.width, y: -this.height / 2 },
          edgeModes: null,
          controls: [
            {
              x: -this.width / 2 + this.width,
              y: -this.height / 2 + this.height * 0.25,
            },
            {
              x: -this.width / 2 + this.width,
              y: -this.height / 2 + this.height * 0.75,
            },
          ],
          cornerRadius: 0,
        },
        {
          points: {
            x: -this.width / 2 + this.width,
            y: -this.height / 2 + this.height,
          },
          edgeModes: null,
          controls: [
            {
              x: -this.width / 2 + this.width * 0.75,
              y: -this.height / 2 + this.height,
            },
            {
              x: -this.width / 2 + this.width * 0.25,
              y: -this.height / 2 + this.height,
            },
          ],
          cornerRadius: 0,
        },
        {
          points: { x: -this.width / 2, y: -this.height / 2 + this.height },
          edgeModes: null,
          controls: [
            { x: -this.width / 2, y: -this.height / 2 + this.height * 0.75 },
            { x: -this.width / 2, y: -this.height / 2 + this.height * 0.25 },
          ],
          cornerRadius: 0,
        },
      ];
      this.cornerRadius = 0;
      this.scaleX = 1;
      this.scaleY = 1;
      document.querySelector(".thick input").readOnly = true;
      this.formatProperties();
          requestDraw();
    });

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
    super.addingListeners();
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
      if (name === "outlineThickness") this.outlineThickness = value;

      if (name === "x") {
        this.x =
          this.roundedOrbeveled === "shaped"
            ? value - this.minX - this.width / 2
            : value;
      }

      if (name === "y") {
        this.y =
          this.roundedOrbeveled === "shaped"
            ? value - this.minY - this.height / 2
            : value;
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

      if (name === "opacity") {
        this.opacity = Number(e.target.value) || 0;
      }

      if (name === "width") {
        if (this.roundedOrbeveled === "shaped") {
          const base = this.maxX - this.minX || 1;
          const scaleX = value / base;
          this.points.forEach((p) => {
            p.points.x *= scaleX <= 0 ? 0.01 : scaleX;
            p.controls[0].x *= scaleX <= 0 ? 0.01 : scaleX;
            p.controls[1].x *= scaleX <= 0 ? 0.01 : scaleX;
          });
        } else {
          this.width = value;
        }
      }

      if (name === "height") {
        if (this.roundedOrbeveled === "shaped") {
          const base = this.maxY - this.minY || 1;
          const scaleY = value / base;

          this.points.forEach((p) => {
            p.points.y *= scaleY <= 0 ? 0.01 : scaleY;
            p.controls[0].y *= scaleY <= 0 ? 0.01 : scaleY;
            p.controls[1].y *= scaleY <= 0 ? 0.01 : scaleY;
          });
        } else {
          this.height = value;
        }
      }

      if (name === "lineDashWidth") {
        this.lineDashWidth = value;
      }

      if (name === "lineDashSpacing") {
        this.lineDashSpacing = value;
      }
    }

    if (this.outlineType.length !== 0) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    }

    requestDraw();
  }

  drawBeveledRect(x, y, width, height, bevel) {
    ctx.beginPath();
    ctx.moveTo(x + bevel, y);
    ctx.lineTo(x + width - bevel, y);
    ctx.lineTo(x + width, y + bevel);
    ctx.lineTo(x + width, y + height - bevel);
    ctx.lineTo(x + width - bevel, y + height);
    ctx.lineTo(x + bevel, y + height);
    ctx.lineTo(x, y + height - bevel);
    ctx.lineTo(x, y + bevel);
    ctx.closePath();
  }
  drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  whereToSnap() {
    if (this.roundedOrbeveled === "shaped") {
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
    let cos = Math.cos(this.angle);
    let sin = Math.sin(this.angle);
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    let newWidth = Math.abs(this.width * cos) + Math.abs(this.height * sin);
    let newHeight = Math.abs(this.width * sin) + Math.abs(this.height * cos);
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
      this.clips.forEach((clip) => {
        const lastLocation = clip.whereToSnap().pos.x - this.x + value;
        clip.changeLocation(lastLocation, "x");
      });
      this.x = value;
    } else if (type === "y") {
      {
        this.clips.forEach((clip) => {
          const lastLocation = clip.whereToSnap().pos.y - this.y + value;
          clip.changeLocation(lastLocation, "y");
        });

        this.y = value;
      }
    } else if (type === "scaleX") {
      this.width *= value;
    } else if (type === "scaleY") {
      this.height *= value;
    }
  }

  doubleClicked(mouse) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    const localMouseX = dx * cos - dy * sin;
    const localMouseY = dx * sin + dy * cos;
    if (this.roundedOrbeveled === "shaped") {
      super.pointDblClick(localMouseX, localMouseY);
    } else {
      objectProperties.isRotatingObject = true;
      this.isDoubleClicked = this.isDoubleClicked ? false : true;
      return true;
    }
  }
}
