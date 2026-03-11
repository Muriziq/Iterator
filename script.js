const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;
const canvass = document.querySelector(".canvas");
const canvassDiv = canvass.querySelector("div");
const propertiesBar = document.getElementById("properties");
let textBoxes = [];
const generationArea = document.getElementById("generationArea");
let objects = [];
let images = [];
const notification = document.querySelector(".notification");
const editclip = document.querySelector(".editclip");
const width = document.getElementById("width");
const height = document.getElementById("height");
let whatsMeasured = "px";
let measurement = { width: 817, height: 1055 };
let renderPageResolution = "auto";
let cloneObj = null;
let renderPageRow = 1;
let renderPageColumn = 1;
let renderPageSize = "auto";
let pen = null;
let multipleSelect = false;
let multipleSelectArr = [];
let undoObject = [];
let redoObject = [];
let renderWidth;
let renderHeight;
let noPerRow = 1;
let noPerColumn = 1;
let isDrawing = null;
let duplicateClicked = false;
let drawingCoordinate = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
let drawingStart = false;
const measurementArr = [
  { width: 2244, height: 3182 },
  { width: 1588, height: 2244 },
  { width: 1123, height: 1588 },
  { width: 794, height: 1123 },
  { width: 559, height: 794 },
  { width: 397, height: 559 },
  { width: 208, height: 340 },
  { width: 817, height: 1055 },
  { width: 3178, height: 4494 },
  { width: 816, height: 1344 },
];
let isDraggingObject = false;
let isRotatingObject = false;
let lastMouseX = 0;
let lastMouseY = 0;
let scale = 1;
let panX = 0;
let panY = 0;

let isPanning = false;
let startX = 0;
let startY = 0;

let selectedObj = null;
let clipped = null;
let defaultFonts =[  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "emoji",
  "math",
  "fangsong",]
let allFonts = [
...defaultFonts
];

fetch(
  "https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDRS1aSfDb6lfNx2ORZ118ZTasvu0KNni8",
)
  .then((res) => res.json())
  .then((data) => {
    const newFonts = data.items.map((item) => item.family);
    allFonts.push(...newFonts);
  })
  .catch(console.error);

window.addEventListener("load", () => {
  width.value = measurement.width;
  height.value = measurement.height;
  canvasSize();
});
class LineUtils {
  static getEdgeAtPosition(localMouseX, localMouseY, points) {
    let threshold = 10;
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];

      const p1 = current.points;
      const p2 = next.points;

      if (current.edgeModes === "shaped") {
        const cp1 = current.controls[0];
        const cp2 = current.controls[1];

        const steps = 50;
        let prev = this.computeBezierPoint(p1, cp1, cp2, p2, 0);

        for (let t = 1; t <= steps; t++) {
          const tNorm = t / steps;
          const curr = this.computeBezierPoint(p1, cp1, cp2, p2, tNorm);
          const dist = this.pointLineDistance(
            localMouseX,
            localMouseY,
            prev.x,
            prev.y,
            curr.x,
            curr.y,
          );
          if (dist < threshold) return { value: i, type: "lineIndex" };
          prev = curr;
        }
      } else {
        const dist = this.pointLineDistance(
          localMouseX,
          localMouseY,
          p1.x,
          p1.y,
          p2.x,
          p2.y,
        );
        if (dist <= threshold) return { value: i, type: "lineIndex" };
      }
    }
    return false;
  }
  static getPointPositon(localMouseX, localMouseY, points) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i].points;
      const pdx = localMouseX - p.x;
      const pdy = localMouseY - p.y;
      if (pdx * pdx + pdy * pdy < 10 * 10) {
        return { value: i, type: "pointIndex" };
      }
    }

    for (let i = 0; i < points.length; i++) {
      if (points[i].edgeModes === "shaped") {
        for (let j = 0; j < 2; j++) {
          const cp = points[i].controls[j];
          const cdx = localMouseX - cp.x;
          const cdy = localMouseY - cp.y;
          if (cdx * cdx + cdy * cdy < 10 * 10) {
            return {
              value: { curveIndex: i, controlIndex: j },
              type: "curveIndex",
            };
          }
        }
      }
    }

    return false;
  }
  static drawRoundedShape(points, radius) {
    if (points.length < 2) return;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const prev = points[(i - 1 + points.length) % points.length].points;
      const curr = points[i].points;
      const next = points[(i + 1) % points.length].points;

      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const len1 = Math.hypot(v1.x, v1.y);
      v1.x /= len1;
      v1.y /= len1;
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const len2 = Math.hypot(v2.x, v2.y);
      v2.x /= len2;
      v2.y /= len2;
      const p1 = {
        x: curr.x - v1.x * Math.min(radius, len1 / 2),
        y: curr.y - v1.y * Math.min(radius, len1 / 2),
      };
      const p2 = {
        x: curr.x + v2.x * Math.min(radius, len2 / 2),
        y: curr.y + v2.y * Math.min(radius, len2 / 2),
      };

      if (i === 0) {
        ctx.moveTo(p1.x, p1.y);
      } else {
        ctx.lineTo(p1.x, p1.y);
      }

      ctx.arcTo(curr.x, curr.y, p2.x, p2.y, radius);
    }
    ctx.closePath();
  }
  static drawSmartShape(points, close = true) {
    if (points.length < 2) return;

    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const curr = points[i].points;
      const prevIdx = (i - 1 + points.length) % points.length;
      const nextIdx = (i + 1) % points.length;
      const prev = points[prevIdx].points;
      const next = points[nextIdx].points;
      const mode = points[i].edgeModes;
      if (mode === "rounded") {
        const radius = points[i].cornerRadius;
        const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
        const len1 = Math.hypot(v1.x, v1.y);
        v1.x /= len1;
        v1.y /= len1;
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };
        const len2 = Math.hypot(v2.x, v2.y);
        v2.x /= len2;
        v2.y /= len2;
        const p1 = {
          x: curr.x - v1.x * Math.min(radius, len1 / 2),
          y: curr.y - v1.y * Math.min(radius, len1 / 2),
        };
        const p2 = {
          x: curr.x + v2.x * Math.min(radius, len2 / 2),
          y: curr.y + v2.y * Math.min(radius, len2 / 2),
        };

        if (i === 0) {
          ctx.moveTo(p1.x, p1.y);
        } else {
          const prevPoint = points[prevIdx];
          if (prevPoint.edgeModes && prevPoint.controls) {
            const cp1 = prevPoint.controls[0];
            const cp2 = prevPoint.controls[1];
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p1.x, p1.y);
          } else {
            ctx.lineTo(p1.x, p1.y);
          }
        }

        ctx.arcTo(curr.x, curr.y, p2.x, p2.y, radius);
      } else {
        if (i === 0) {
          ctx.moveTo(curr.x, curr.y);
        } else {
          const prevPoint = points[prevIdx];
          if (prevPoint.edgeModes === "shaped") {
            const cp1 = prevPoint.controls[0];
            const cp2 = prevPoint.controls[1];
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
          } else {
            ctx.lineTo(curr.x, curr.y);
          }
        }
      }
    }
    if (close) {
      const last = points[points.length - 1];
      const first = points[0];
      if (last.edgeModes === "shaped") {
        const cp1 = last.controls[0];
        const cp2 = last.controls[1];
        ctx.bezierCurveTo(
          cp1.x,
          cp1.y,
          cp2.x,
          cp2.y,
          first.points.x,
          first.points.y,
        );
      } else {
        ctx.lineTo(first.points.x, first.points.y);
      }
      ctx.closePath();
    }
  }

  static drawEditArcs(points, selectedArea, selectedLineIndex) {
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.rect(p.points.x - 4, p.points.y - 4, 8, 8);

      if (selectedArea === "pointIndex" && i === selectedLineIndex)
        ctx.fillStyle = "#0000ff";
      else ctx.fillStyle = "#0000ff88";
      ctx.strokeStyle = "#e4e4e4";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    points.forEach((isCurve, i) => {
      if (isCurve.edgeModes === "shaped") {
        isCurve.controls.forEach((cp, j) => {
          ctx.beginPath();
          ctx.moveTo(isCurve.points.x, isCurve.points.y);
          ctx.lineTo(cp.x, cp.y);
          ctx.strokeStyle = "#0000ff88";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.rect(cp.x - 3, cp.y - 3, 6, 6);
          const isSelected =
            selectedArea === "curveIndex" &&
            selectedLineIndex.curveIndex === i &&
            selectedLineIndex.controlIndex === j;
          ctx.fillStyle = isSelected ? "#00ff00" : "#00ff0088";
          ctx.fill();
          ctx.stroke();
        });
      }
    });
  }
  static getNormalPostion(localX, localY, width, height, threshold) {
    let selectedArea = null;
    const nearLeft = Math.abs(localX) < threshold;
    const nearRight = Math.abs(localX - width) < threshold;
    const nearTop = Math.abs(localY) < threshold;
    const nearBottom = Math.abs(localY - height) < threshold;
    if (nearLeft && nearTop) selectedArea = "TopLeft";
    else if (nearRight && nearTop) selectedArea = "TopRight";
    else if (nearLeft && nearBottom) selectedArea = "BottomLeft";
    else if (nearRight && nearBottom) selectedArea = "BottomRight";
    else if (nearLeft) selectedArea = "Left";
    else if (nearRight) selectedArea = "Right";
    else if (nearTop) selectedArea = "Top";
    else if (nearBottom) selectedArea = "Bottom";
    else if (localX > 0 && localX < width && localY > 0 && localY < height) {
      selectedArea = "Selected";
    }
    return selectedArea;
  }
  static pointLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  static computeBezierPoint(p0, p1, p2, p3, t) {
    const x =
      Math.pow(1 - t, 3) * p0.x +
      3 * Math.pow(1 - t, 2) * t * p1.x +
      3 * (1 - t) * Math.pow(t, 2) * p2.x +
      Math.pow(t, 3) * p3.x;

    const y =
      Math.pow(1 - t, 3) * p0.y +
      3 * Math.pow(1 - t, 2) * t * p1.y +
      3 * (1 - t) * Math.pow(t, 2) * p2.y +
      Math.pow(t, 3) * p3.y;

    return { x, y };
  }
}
class Formats {
  constructor() {
    this.scaleX = 1;
    this.scaleY = 1;
  }
  similarPropties() {
    document.querySelector(".normalb").addEventListener("click", () => {
      this.outlineType = [];
      this.formatProperties();
    });
    document.querySelector(".dashedb").addEventListener("click", () => {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
      this.formatProperties();
    });
    document.getElementById("outline").addEventListener("click", () => {
      this.outline = !this.outline;
      this.formatProperties();
    });
    if (this.colorFill === "linear" || this.colorFill === "radial") {
      document.querySelector(".addColor").addEventListener("click", () => {
        this.color.push("#ff0000");
        this.colorStop = [];
        requestDraw()
        this.formatProperties();
      });
      document.querySelectorAll(".color-div").forEach((div, i) => {
        div
          .querySelector("input[type='number']")
          .addEventListener("input", (e) => {
            this.colorStop[i] = e.target.value;
          });
        div
          .querySelector("input[type='color']")
          .addEventListener("input", (e) => {
            this.color[i] = e.target.value;
          });
        div.querySelector("button").addEventListener("click", (e) => {
          this.color.splice(i, 1);
          this.colorStop = [];
          requestDraw()
          this.formatProperties();
        });
      });
    }

    document.querySelector(".color-select").addEventListener("change", (e) => {
      this.colorFill = e.target.value;
      this.formatProperties();
    });
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
        <input
          type="color"
          name="bgColor"
          value="${this.color[0].length > 7 ? this.color[0].slice(0, 7) : this.color[0]}"
        >
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

                <label>
                  Stop:
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value="${this.colorStop[i]}"
                  >
                </label>

                <input type="color" value="${color.length > 7 ? color.slice(0, 7) : color}">
                <button></button>
              </div>
            `
          )
          .join("")}

        <section class="color-sec">
          <button class="addColor">Add Color <img src="images/Group 27.svg"></button>

          <label style="display:${this.colorFill === "linear" ? "flex" : "none"}">
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
          <input type="color" name="outlineColor" value="${this.outlineColor}">
        </label>

        <label class="thick">
          <span>Outline Thickness</span>
          <input type="number" name="outlineThickness" value="${changeValues(this.outlineThickness)}">
        </label>

        <div class="uniform-div">
          Outline Type
          <div>
            <button class="normalb"></button>
            <button class="dashedb"></button>
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
  `;
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
    } else if (this.selectedArea === "pointIndex") {
      this.points[this.selectedLineIndex].points.x = localMouseX;
      this.points[this.selectedLineIndex].points.y = localMouseY;
      this.points[this.selectedLineIndex].controls[0].x += localDeltaX;
      this.points[this.selectedLineIndex].controls[0].y += localDeltaY;
      this.points[this.selectedLineIndex].controls[1].x += localDeltaX;
      this.points[this.selectedLineIndex].controls[1].y += localDeltaY;

      for (let i = 0; i < this.points.length; i++) {
        if (i === this.selectedLineIndex) continue;
        const nextPoint = this.points[i].points;
        if (
          Math.abs(nextPoint.x - this.points[this.selectedLineIndex].points.x) <
          10
        ) {
          this.points[this.selectedLineIndex].points.x = nextPoint.x;
        }
        if (
          Math.abs(nextPoint.y - this.points[this.selectedLineIndex].points.y) <
          10
        ) {
          this.points[this.selectedLineIndex].points.y = nextPoint.y;
        }
      }
    } else if (this.selectedArea === "curveIndex") {
      const { curveIndex, controlIndex } = this.selectedLineIndex;
      this.points[curveIndex].controls[controlIndex].x = localMouseX;
      this.points[curveIndex].controls[controlIndex].y = localMouseY;
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
      const newWidth = this.width + (this.x - mouse.x);
      if (newWidth > 0) {
        this.x = mouse.x;
        this.width = newWidth;
      }
    } else if (this.selectedArea === "Right") {
      this.width = mouse.x - this.x;
    } else if (this.selectedArea === "Top") {
      const newHeight = this.height + (this.y - mouse.y);
      if (newHeight > 0) {
        this.y = mouse.y;
        this.height = newHeight;
      }
    } else if (this.selectedArea === "Bottom") {
      this.height = mouse.y - this.y;
    } else if (this.selectedArea === "TopLeft") {
      const newWidth = this.width + (this.x - mouse.x);
      if (newWidth > 0) {
        this.x = mouse.x;
        this.width = newWidth;
      }
      const newHeight = this.height + (this.y - mouse.y);
      if (newHeight > 0) {
        this.y = mouse.y;
        this.height = newHeight;
      }
    } else if (this.selectedArea === "TopRight") {
      this.width = mouse.x - this.x;
      const newHeight = this.height + (this.y - mouse.y);
      if (newHeight > 0) {
        this.y = mouse.y;
        this.height = newHeight;
      }
    } else if (this.selectedArea === "BottomLeft") {
      const newWidth = this.width + (this.x - mouse.x);
      if (newWidth > 0) {
        this.x = mouse.x;
        this.width = newWidth;
      }
      this.height = mouse.y - this.y;
    } else if (this.selectedArea === "BottomRight") {
      this.width = mouse.x - this.x;
      this.height = mouse.y - this.y;
    }
  }
  circFormat(mouse, x, y) {
    if (this.isDoubleClicked) {
      this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2;
    } else {
      if (this.selectedArea === "Left") {
        const newRadiusX = this.radiusX + (x - mouse.x);
        if (newRadiusX > 0) {
          this.radiusX = newRadiusX;
        }
      } else if (this.selectedArea === "Right") {
        this.radiusX = mouse.x - this.x;
      } else if (this.selectedArea === "Top") {
        const newRadiusY = this.radiusY + (y - mouse.y);
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
      } else if (this.selectedArea === "Bottom") {
        const newRadiusY = mouse.y - this.y;
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
      } else if (this.selectedArea === "TopLeft") {
        const newRadiusY = this.radiusY + (y - mouse.y);
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
        const newRadiusX = this.radiusX + (x - mouse.x);
        if (newRadiusX > 0) {
          this.radiusX = newRadiusX;
        }
      } else if (this.selectedArea === "TopRight") {
        const newRadiusY = this.radiusY + (y - mouse.y);
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
        this.radiusX = mouse.x - this.x;
      } else if (this.selectedArea === "BottomLeft") {
        const newRadiusY = mouse.y - this.y;
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
        const newRadiusX = this.radiusX + (x - mouse.x);
        if (newRadiusX > 0) {
          this.radiusX = newRadiusX;
        }
      } else if (this.selectedArea === "BottomRight") {
        const newRadiusY = mouse.y - this.y;
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
        this.radiusX = mouse.x - this.x;
      } else if (this.selectedArea === "Selected") {
        this.x += mouse.x - lastMouseX;
        this.y += mouse.y - lastMouseY;
        if (this.clips.length > 0) {
          this.clips.forEach((clip) =>
            clip.moveClip(mouse.x - lastMouseX, mouse.y - lastMouseY),
          );
        }
      }
    }
  }
}
class Rectangle extends Formats {
  constructor(x, y, width, height) {
    super();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = ["#ff0000", "#0000ff"];
    this.outline = false;
    this.outlineColor = "#00ff00";
    this.outlineThickness = 2;
    this.lineDashWidth = 5;
    this.lineDashSpacing = 3;
    this.selectedArea = null;
    this.outlineType = [];
    this.isDoubleClicked = false;
    this.angle = 0;
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
    this.opacity = 100;
    this.selectedLineIndex = null;
    this.mode = "edit";
    this.colorFill = "uniform";
    this.colorDeg = 0.2;
    this.colorStop = [];
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
      if (this.mode === "edit" && selectedObj === this)
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
    if (selectedObj === this || multipleSelectArr.includes(this)) {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#0000ff";
      ctx.setLineDash([5, 3]);
      if (this.roundedOrbeveled !== "shaped") {
        ctx.strokeRect(
          -this.width / 2 - 2,
          -this.height / 2 - 2,
          this.width + 4,
          this.height + 4,
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
          ctx.fillStyle = "#0000ff88";
          ctx.fillRect(this.maxX - 10, this.maxY - 10, 20, 20);
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
          Math.abs(localMouseX - this.maxX) < 10 &&
          Math.abs(localMouseY - this.maxY) < 10
        ) {
          this.selectedArea = "scale";

          return true;
        }

        this.createPath();
        const isInside = ctx.isPointInPath(localMouseX, localMouseY);
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
        10,
      );

      return this.selectedArea !== null;
    }
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
      const deltaX = mouse.x - lastMouseX;
      const deltaY = mouse.y - lastMouseY;
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
      } else {
        if (this.roundedOrbeveled !== "shaped") {
          super.rectFormat(mouse);
        }
        if (this.selectedArea === "Selected") {
          this.x += mouse.x - lastMouseX;
          this.y += mouse.y - lastMouseY;
          if (this.clips.length > 0) {
            this.clips.forEach((clip) =>
              clip.moveClip(mouse.x - lastMouseX, mouse.y - lastMouseY),
            );
          }
        }
        if (this.selectedArea === "scale") {
          const centerX = (this.minX + this.maxX) / 2;
          const centerY = (this.minY + this.maxY) / 2;
          const lastWidth = lastMouseX - centerX;
          const lastHeight = lastMouseY - centerY;
          const currentWidth = mouse.x - centerX;
          const currentHeight = mouse.y - centerY;
          const scaleX = currentWidth / lastWidth;
          const scaleY = currentHeight / lastHeight;
          this.points.forEach((p) => {
            p.points.x = centerX + (p.points.x - centerX) * scaleX;
            p.points.y = centerY + (p.points.y - centerY) * scaleY;
            p.controls[0].x = centerX + (p.controls[0].x - centerX) * scaleX;
            p.controls[0].y = centerY + (p.controls[0].y - centerY) * scaleY;
            p.controls[1].x = centerX + (p.controls[1].x - centerX) * scaleX;
            p.controls[1].y = centerY + (p.controls[1].y - centerY) * scaleY;
          });
        }
      }
    }
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.points = this.points.map((p) => ({
      points: { x: p.points.x, y: p.points.y },
      edgeModes: p.edgeModes,
      controls: p.controls.map((c) => ({ x: c.x, y: c.y })),
      cornerRadius: p.cornerRadius,
    }));

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
        <img src="images/Vector 169.svg" alt="Beveled">
      </button>
      <button class="rounded ${this.roundedOrbeveled === "rounded" ? "selected" : ""}">
        <img src="images/Rectangle 128.svg" alt="Rounded">
      </button>
      <button class="shapetool ${this.roundedOrbeveled === "shaped" ? "selected" : ""}">
        <img src="images/Group 33.svg" alt="Shape tool">
      </button>
    </div>

    <div class="shape-row" style="display:${this.roundedOrbeveled === "shaped" ? "flex" : "none"}">
      <button class="convert ${
        this.selectedArea === "pointIndex" &&
        this.points[this.selectedLineIndex].edgeModes === "shaped"
          ? "selected"
          : ""
      }">
        <img src="images/Group 34.svg" alt="Convert">
      </button>
      <button class="rounded-edge">
        <img src="images/Group 32.svg" alt="Rounded edge">
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
    });
    document.querySelector(".rounded").addEventListener("click", () => {
      this.roundedOrbeveled = "rounded";
      this.formatProperties();
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
    });

    document.querySelector(".rounded-edge").addEventListener("click", () => {
      if (this.selectedArea === "pointIndex") {
        this.points[this.selectedLineIndex].edgeModes =
          this.points[this.selectedLineIndex].edgeModes === "rounded"
            ? null
            : "rounded";
        this.formatProperties();
      }
    });
    document.querySelector(".convert").addEventListener("click", () => {
      if (this.selectedArea === "pointIndex") {
        this.points[this.selectedLineIndex].edgeModes =
          this.points[this.selectedLineIndex].edgeModes === "shaped"
            ? null
            : "shaped";
        this.formatProperties();
      }
    });
    document.querySelector(".normal").addEventListener("click", () => {
      this.mode = this.mode === "normal" ? "edit" : "normal";
      this.formatProperties();
    });
    propertiesBar
      .querySelectorAll("input[type='text'],input[type='number']")
      .forEach((input) => {
        input.addEventListener(
          "input",
          (e) => this.changeProperties(e)
        );
      });
    propertiesBar.querySelectorAll("input[type='color']").forEach((input) => {
      input.addEventListener(
        "change",
       (e) => this.changeProperties(e)
      );
    });
    requestDraw()
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
    const value = backValues(Number(e.target.value) || 0);
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
          p.points.x *= scaleX;
          p.controls[0].x *= scaleX;
          p.controls[1].x *= scaleX;
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
          p.points.y *= scaleY;
          p.controls[0].y *= scaleY;
          p.controls[1].y *= scaleY;
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

  requestDraw()
  undoObject.push(cloneObject(objects));

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
      return {
        x: [
          this.minX + this.x + this.width / 2,
          this.minX + this.x + this.width,
          this.minX + this.x + (3 * this.width) / 2,
        ],
        y: [
          this.minY + this.y + this.height / 2,
          this.minY + this.y + this.height,
          this.minY + this.y + (3 * this.height) / 2,
        ],
        pos: {
          x: this.minX + this.x + this.width / 2,
          y: this.minY + this.y + this.height / 2,
          width: this.maxX - this.minX,
          height: this.maxY - this.minY,
        },
      };
    }
    return {
      x: [this.x, this.x + this.width / 2, this.x + this.width],
      y: [this.y, this.y + this.height / 2, this.y + this.height],
      pos: { x: this.x, y: this.y, width: this.width, height: this.height },
    };
  }

  changeLocation(value, type) {
    if (type === "x") {
      this.clips.forEach((clip) => {
        const lastLocation = clip.whereToSnap().pos.x - this.x + value;
        clip.changeLocation(lastLocation, "x");
      });
      this.x = value;
    } else {
      this.clips.forEach((clip) => {
        const lastLocation = clip.whereToSnap().pos.y - this.y + value;
        clip.changeLocation(lastLocation, "y");
      });

      this.y = value;
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
      isRotatingObject = true;
      this.isDoubleClicked = this.isDoubleClicked ? false : true;
      return true;
    }
  }
}

class Ellipse extends Formats {
  constructor(x, y, radiusX, radiusY) {
    super();
    this.x = x;
    this.y = y;
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.angle = 0;
    this.color = ["#ff0000", "#00ff00"];
    this.outline = false;
    this.outlineColor = "#00ff00";
    this.outlineThickness = 10;
    this.lineDashWidth = 5;
    this.outlineType = [];
    this.isDashed = false;
    this.lineDashSpacing = 3;
    this.isDoubleClicked = false;
    this.selectedArea;
    this.opacity = 100;
    this.arcStart = 0;
    this.arcEnd = 2 * Math.PI;
    this.colorFill = "uniform";
    this.mode = "fill";
    this.colorStop = [];
    this.colorDeg = 0;
    this.clipped = "none";
    this.clips = [];
  }
  addObject() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.beginPath();
    if (this.mode === "pie") {
      ctx.moveTo(0, 0);
      ctx.ellipse(
        0,
        0,
        this.radiusX,
        this.radiusY,
        0,
        this.arcStart,
        this.arcEnd,
      );
    } else {
      ctx.ellipse(
        0,
        0,
        this.radiusX,
        this.radiusY,
        0,
        this.arcStart,
        this.arcEnd,
      );
    }
    if (this.mode !== "curve") ctx.closePath();
    if (this.colorFill !== "none") ctx.fillStyle = this.colorType();
    if (this.mode !== "curve" && this.colorFill !== "none") ctx.fill();
    if (this.outline) {
      ctx.lineWidth = this.outlineThickness;
      ctx.strokeStyle = this.outlineColor;
      ctx.setLineDash(this.outlineType);
      ctx.stroke();
    }
    if (selectedObj === this || multipleSelectArr.includes(this)) {
      ctx.beginPath();
      ctx.strokeStyle = "#0000ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(
        -this.radiusX,
        -this.radiusY,
        this.radiusX * 2,
        this.radiusY * 2,
      );
      ctx.closePath();
    }

    ctx.restore();
    if (this.clips.length > 0 && this.clipped !== "editclip") {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      if (this.mode === "pie") {
        ctx.moveTo(0, 0);
        ctx.ellipse(
          0,
          0,
          this.radiusX,
          this.radiusY,
          0,
          this.arcStart,
          this.arcEnd,
        );
      } else {
        ctx.ellipse(
          0,
          0,
          this.radiusX,
          this.radiusY,
          0,
          this.arcStart,
          this.arcEnd,
        );
      }
      ctx.clip();
      ctx.translate(-this.x, -this.y);
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
      10,
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
    propertiesBar.innerHTML = `
    <div>
    <h3>Coordinate</h3>
        <div class="two-grid">
    <div>X    <input type="number" name="x" value="${changeValues(
      this.x - this.radiusX,
    )}"></div>
    <div> Y   <input type="number" name="y" value="${changeValues(
      this.y,
    )}"></div>
    <div>W    <input type="number" name="radiusX" value="${changeValues(
      this.radiusX,
    )}"></div>
    <div> H  <input type="number" name="radiusY" value="${changeValues(
      this.radiusY,
    )}"> </div> 
    <div>Rotation <input type="number" name="angle" value="${radToDeg(
      this.angle,
      "deg",
    )}"></div>
    <div>Opacity <input type="number" name="opacity" min="0" max="100" value="100" ></div>
    </div>
    </div>
    ${super.similarProptiesOutput()}
    <div class="shape">
    <div><button class="fill"><img src="images/Ellipse 11.svg"></button><button class="pie"><img src="images/pie.png"></button><button class="curve"><img src="images/curveEnd.png" style="transform: rotate(-45deg)"></button></div>
    <div style="display:${
      this.mode === "fill" ? "none" : "grid"
    }" class="two-grid"><div><img style="transform: rotate(-90deg)" src="images/curveEnd.png"><input type="number" value="${radToDeg(
      this.arcStart,
      "deg",
    )}" name="arcStart"></div><div><img src="images/curveEnd.png"><input type="number" value="${radToDeg(
      this.arcEnd,
      "deg",
    )}" name="arcEnd"></div></div>
    </div>

    `;
    super.similarPropties();
    document.querySelector(".fill").addEventListener("click", () => {
      this.mode = "fill";
      this.arcStart = 0;
      this.arcEnd = Math.PI * 2;
      this.formatProperties();
    });
    document.querySelector(".pie").addEventListener("click", () => {
      this.mode = "pie";
      this.formatProperties();
    });
    document.querySelector(".curve").addEventListener("click", () => {
      this.mode = "curve";
      this.colorFill = "none";
      if (!this.outline) this.outline = true;
      this.formatProperties();
    });
    propertiesBar
      .querySelectorAll("input[type='text'],input[type='number']")
      .forEach((input) => {
        input.addEventListener(
          "input",
          (e) => setTimeout(this.changeProperties(e)),
          1000,
        );
      });
    propertiesBar.querySelectorAll("input[type='color']").forEach((input) => {
      input.addEventListener(
        "change",
        (e) => setTimeout(this.changeProperties(e)),
        1000,
      );
    });
    requestDraw()
  }
  changeProperties(e) {
    const name = e.target.name;
    if (name === "angle") {
      this.angle = radToDeg(e.target.value, "rad");
    } else if (name === "bgColor") {
      this.color[0] = e.target.value;
    } else if (
      name === "colorDeg" ||
      name === "arcStart" ||
      name === "arcEnd"
    ) {
      this[name] = radToDeg(e.target.value, "rad");
    } else if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    } else if (e.target.type === "number") {
      const value = backValues(parseFloat(e.target.value));
      if (!isNaN(value) && value !== null) {
        if (name === "x") this.x = value + this.radiusX;
        else if (name === "y") this.x = value + this.radiusY;
        else if (name === "opacity") {
          this.opacity = Number(e.target.value);
        } else this[name] = value;
      }
    }
    if (this.outlineType.length !== 0)
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    requestDraw()
    undoObject.push(cloneObject(objects));
    undoText.push("object");
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.clips = this.clips.map((c) => c.showClone());
    return clone;
  }
  doubleClicked(mouse) {
    isRotatingObject = true;
    this.isDoubleClicked = this.isDoubleClicked ? false : true;
    return true;
  }
  whereToSnap() {
    return {
      x: [this.x - this.radiusX, this.x, this.x + this.radiusX],
      y: [this.y - this.radiusY, this.y, this.y + this.radiusY],
      pos: {
        x: this.x - this.radiusX,
        y: this.y - this.radiusY,
        width: this.radiusX * 2,
        height: this.radiusY * 2,
      },
    };
  }
  changeLocation(value, type) {
    if (type === "x") {
      this.x = value + this.radiusX;
    } else {
      this.y = value + this.radiusY;
    }
  }
}
class Polygon extends Formats {
  constructor(x, y, radiusX, radiusY) {
    super();
    this.sides = 6;
    this.x = x;
    this.y = y;
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.angle = 0;
    this.color = ["#FFCC00", "#ff0000"];
    this.outline = false;
    this.outlineColor = "#00ff00";
    this.outlineThickness = 10;
    this.lineDashWidth = 5;
    this.outlineType = [];
    this.lineDashSpacing = 3;
    this.selectedArea = null;
    this.isDoubleClicked = false;
    this.points = [];
    this.mode = "normal";
    this.cornerRadius = 0;
    this.selectedLineIndex = null;
    this.colorStop = [];
    this.colorDeg = 0;
    this.colorFill = "uniform";
    this.opacity = 100;
    this.clipped = "none";
    this.clips = [];
  }

  addObject() {
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
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.beginPath();
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
    if (this.colorFill !== "none") {
      ctx.fillStyle = this.colorType();
      ctx.fill();
    }

    if (this.outline) {
      ctx.save();
      ctx.lineWidth = this.outlineThickness;
      ctx.setLineDash(this.outlineType);
      ctx.strokeStyle = this.outlineColor;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }
    if (this.mode === "edit" && selectedObj === this)
      LineUtils.drawEditArcs(
        this.points,
        this.selectedArea,
        this.selectedLineIndex,
      );

    if (selectedObj === this || multipleSelectArr.includes(this)) {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#0000ff";
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(
        this.minX,
        this.minY,
        this.maxX - this.minX,
        this.maxY - this.minY,
      );
      if (this.mode === "normal") {
        ctx.beginPath();
        ctx.fillStyle = "#0000ff88";
        ctx.fillRect(this.maxX - 10, this.maxY - 10, 20, 20);
      }
    }

    ctx.closePath();
    ctx.restore();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    if (edgeCurve) LineUtils.drawSmartShape(this.points);
    else {
      LineUtils.drawRoundedShape(this.points, this.cornerRadius);
      this.points.forEach((p) => {
        p.cornerRadius = this.cornerRadius;
      });
    }
    ctx.clip();
    ctx.translate(-this.x, -this.y);
    this.clips.forEach((clip) => {
      clip.addObject();
    });
    ctx.restore();
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
    } else {
      if (
        Math.abs(localX - this.maxX) < 10 &&
        Math.abs(localY - this.maxY) < 10
      ) {
        this.selectedArea = "scale";

        return true;
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
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
      const deltaX = mouse.x - lastMouseX;
      const deltaY = mouse.y - lastMouseY;
      const localDeltaX = deltaX * cos - deltaY * sin;
      const localDeltaY = deltaX * sin + deltaY * cos;
      super.lineFormat(localX, localY, localDeltaX, localDeltaY);
    } else {
      if (this.isDoubleClicked) {
        this.angle =
          Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2;
      } else if (this.selectedArea === "Selected") {
        this.x += mouse.x - lastMouseX;
        this.y += mouse.y - lastMouseY;
        if (this.clips.length > 0) {
          this.clips.forEach((clip) =>
            clip.moveClip(mouse.x - lastMouseX, mouse.y - lastMouseY),
          );
        }
      }
    }
    if (this.selectedArea === "scale") {
      const lastWidth = lastMouseX - this.x;
      const lastHeight = lastMouseY - this.y;
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
    }
  }
  formatProperties() {
    propertiesBar.innerHTML = `
   <div>
    <h3>Coordinate</h3>
    <div class="two-grid">
    <div>X    <input type="number" name="x" value="${changeValues(
      this.x + this.minX,
    )}"></div>
    <div> Y   <input type="number" name="y" value="${changeValues(
      this.x + this.minY,
    )}"></div>
    <div>W    <input type="number" name="width" value="${changeValues(
      this.maxX - this.minX,
    )}"></div>
    <div> H  <input type="number" name="height" value="${changeValues(
      this.maxY - this.minY,
    )}"> </div> 
    <div>Rotation <input type="number" name="angle" value="${radToDeg(
      this.angle,
      "deg",
    )}"></div>
    <div>Opacity <input type="number" name="opacity" min="0" max="100" value="100" ></div>
    <div>Sides <input type="number" name="sides" value="${this.sides}"></div>
    </div>
    </div>
    ${super.similarProptiesOutput()}
    <div class="shape">
            <div><button class="convert"><img src="images/Group 34.svg"></button><button class="rounded-edge"><img src="images/Group 32.svg"></button></div>
    <div style="display:${
      this.selectedArea === "pointIndex" &&
      this.points[this.selectedLineIndex].edgeModes === "shaped"
        ? "none"
        : "flex"
    }" class="thick">
    Corner Radius <input type="number" name="cornerRadius" value="${
      this.selectedArea === "pointIndex"
        ? changeValues(this.points[this.selectedLineIndex].cornerRadius)
        : changeValues(this.cornerRadius)
    }">
    </div>
    <div style="display: flex;justify-content:end;align-items:end"><button class="normal">${
      this.mode === "edit" ? "Done" : "Edit"
    }</button></div>
    </div>
    `;
    super.similarPropties();
    document.querySelector(".rounded-edge").addEventListener("click", () => {
      if (this.selectedArea === "pointIndex") {
        this.points[this.selectedLineIndex].edgeModes = "rounded";
      }
    });
    document.querySelector(".convert").addEventListener("click", () => {
      if (this.selectedArea === "pointIndex") {
        this.points[this.selectedLineIndex].edgeModes = "shaped";
      }
    });
    document.querySelector(".normal").addEventListener("click", () => {
      this.mode = this.mode === "normal" ? "edit" : "normal";
      this.formatProperties();
    });
    propertiesBar
      .querySelectorAll("input[type='text'],input[type='number']")
      .forEach((input) => {
        input.addEventListener(
          "input",
          (e) => setTimeout(this.changeProperties(e)),
          1000,
        );
      });
    propertiesBar.querySelectorAll("input[type='color']").forEach((input) => {
      input.addEventListener(
        "change",
        (e) => setTimeout(this.changeProperties(e)),
        1000,
      );
    });
    requestDraw()
  }
  changeProperties(e) {
    const name = e.target.name;
    if (name === "angle") {
      this.angle = radToDeg(e.target.value, "rad");
    } else if (name === "bgColor") {
      this.color[0] = e.target.value;
    } else if (name === "colorDeg") {
      this.colorDeg = radToDeg(e.target.value, "rad");
    } else if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    } else if (e.target.type === "number") {
      const value = backValues(parseFloat(e.target.value));
      if (name === "x") {
        this.x = value - this.minX;
      } else if (name === "y") {
        this.y = value - this.minY;
      } else if (name === "opacity") {
        this.opacity = Number(e.target.value);
      } else if (name === "width") {
        const scaleX = value / (this.maxX - this.minX);
        this.points.forEach((p) => {
          p.points.x *= scaleX;
          p.controls[0].x *= scaleX;
          p.controls[1].x *= scaleX;
        });
      } else if (name === "height") {
        const scaleY = value / (this.maxY - this.minY);
        this.points.forEach((p) => {
          p.points.y *= scaleY;
          p.controls[0].y *= scaleY;
          p.controls[1].y *= scaleY;
        });
      } else if (name === "sides") {
        this.sides = Number(e.target.value);
        this.points = [];
      } else if (name === "cornerRadius") {
        if (
          this.selectedArea === "pointIndex" &&
          this.points[this.selectedLineIndex].edgeModes === "rounded"
        )
          this.points[this.selectedLineIndex].cornerRadius = value;
        else this.cornerRadius = value;
      } else this[name] = value;
    }
    if (this.outlineType.length !== 0)
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    undoObject.push(cloneObject(objects));
    undoText.push("object");
    requestDraw()
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.points = this.points.map((p) => ({
      points: { x: p.points.x, y: p.points.y },
      edgeModes: p.edgeModes,
      controls: p.controls.map((c) => ({ x: c.x, y: c.y })),
      cornerRadius: p.cornerRadius,
    }));

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
      isRotatingObject = true;
      this.isDoubleClicked = this.isDoubleClicked ? false : true;
      return true;
    }
  }
  whereToSnap() {
    return {
      x: [
        this.centerX - this.radiusX,
        this.centerX,
        this.centerX + this.radiusX,
      ],
      y: [
        this.centerY - this.radiusY,
        this.centerY,
        this.centerY + this.radiusY,
      ],
      pos: {
        x: this.centerX - this.radiusX,
        y: this.centerY - this.radiusY,
        width: this.radiusX * 2,
        height: this.radiusY * 2,
      },
    };
  }
  RectProperties() {
    return {
      x: this.centerX - this.radiusX,
      y: this.centerY - this.radiusY,
      width: this.radiusX * 2,
      height: this.radiusY * 2,
    };
  }
  changeLocation(value, type) {
    if (type === "x") {
      this.centerX = value + this.radiusX;
    } else {
      this.centerY = value + this.radiusY;
    }
  }
}
class Line extends Formats {
  constructor() {
    super();
    this.points = [];
    this.color = ["#ff0000", "#0000ff"];
    this.outlineColor = "#00ff00";
    this.outlineThickness = 2;
    this.outline = true;
    this.lineDashWidth = 5;
    this.outlineType = [];
    this.lineDashSpacing = 3;
    this.mode = "edit";
    this.selectedLineIndex = null;
    this.angle = 0;
    this.x;
    this.y;
    this.selectedArea = null;
    this.colorStop = [];
    this.colorDeg = 0;
    this.colorFill = "uniform";
    this.opacity = 100;
    this.isDoubleClicked = false;
    this.close = false;
    this.clipped = "none";
    this.clips = [];
  }
  addObject() {
    if (this.points.length > 0) {
      const xs = this.points.map((p) => p.points.x);
      const ys = this.points.map((p) => p.points.y);
      this.minX = Math.min(...xs);
      this.minY = Math.min(...ys);
      this.maxX = Math.max(...xs);
      this.maxY = Math.max(...ys);
      const first = this.points[0].points;
      const last = this.points[this.points.length - 1].points;
      this.close = Math.hypot(first.x - last.x, first.y - last.y) < 3;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      LineUtils.drawSmartShape(this.points, this.close);
      if (this.colorFill !== "none") {
        ctx.fillStyle = this.colorType();
        ctx.fill();
      }

      if (this.outline) {
        ctx.save();
        ctx.lineWidth = this.outlineThickness;
        ctx.setLineDash(this.outlineType);
        ctx.strokeStyle = this.outlineColor;
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      }
      if (this.mode === "edit" && selectedObj === this)
        LineUtils.drawEditArcs(
          this.points,
          this.selectedArea,
          this.selectedLineIndex,
        );
      if (selectedObj === this || multipleSelectArr.includes(this)) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#0000ff";
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(
          this.minX,
          this.minY,
          this.maxX - this.minX,
          this.maxY - this.minY,
        );
        if (this.mode === "normal") {
          ctx.beginPath();
          ctx.fillStyle = "#0000ff88";
          ctx.fillRect(this.maxX - 10, this.maxY - 10, 20, 20);
        }
      }
      ctx.restore();
      if (this.clips.length > 0 && this.clipped !== "editclip") {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        LineUtils.drawSmartShape(this.points, this.close);
        ctx.clip();
        ctx.translate(-this.x, -this.y);
        this.clips.forEach((clip) => {
          clip.addObject();
        });
        ctx.restore();
      }
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
  drawPen(mouse) {
    if (this.points.length === 0) {
      this.x = mouse.x;
      this.y = mouse.y;
    }
    this.points.push({
      points: { x: mouse.x - this.x, y: mouse.y - this.y },
      edgeModes: null,
      controls: [
        { x: mouse.x - this.x - 20, y: mouse.y - this.y },
        { x: mouse.x - this.x + 20, y: mouse.y - this.y },
      ],
      cornerRadius: 0,
    });
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
    } else {
      if (
        Math.abs(localX - this.maxX) < 10 &&
        Math.abs(localY - this.maxY) < 10
      ) {
        this.selectedArea = "scale";

        return true;
      }
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      LineUtils.drawSmartShape(this.points, this.close);
      const isInside = ctx.isPointInPath(mouse.x, mouse.y);
      ctx.restore();
      if (isInside) {
        this.selectedArea = "Selected";
      }
      return isInside;
    }
    return false;
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
      isRotatingObject = true;
      this.isDoubleClicked = this.isDoubleClicked ? false : true;
      return true;
    }
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.points = this.points.map((p) => ({
      points: { x: p.points.x, y: p.points.y },
      edgeModes: p.edgeModes,
      controls: p.controls.map((c) => ({ x: c.x, y: c.y })),
      cornerRadius: p.cornerRadius,
    }));

    clone.clips = this.clips.map((c) => c.showClone());
    return clone;
  }
  formatSelected(mouse) {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    if (this.mode === "edit") {
      const deltaX = mouse.x - lastMouseX;
      const deltaY = mouse.y - lastMouseY;
      const localDeltaX = deltaX * cos - deltaY * sin;
      const localDeltaY = deltaX * sin + deltaY * cos;
      super.lineFormat(localX, localY, localDeltaX, localDeltaY);
    } else {
      if (this.isDoubleClicked) {
        this.angle =
          Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2;
      } else if (this.selectedArea === "Selected") {
        this.x += mouse.x - lastMouseX;
        this.y += mouse.y - lastMouseY;
      } else if (this.selectedArea === "scale") {
        const lastWidth = lastMouseX - this.x;
        const lastHeight = lastMouseY - this.y;
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
      }
    }
  }
  formatProperties() {
    if (pen) {
      propertiesBar.innerHTML = `
          <div style="display: flex;justify-content:end;align-items:end"><button class="done">Done</button></div>
      `;
    } else {
      propertiesBar.innerHTML = `
       <div>
    <h3>Coordinate</h3>
    <div class="two-grid">
    <div>X    <input type="number" name="x" value="${changeValues(
      this.x + this.minX,
    )}"></div>
    <div> Y   <input type="number" name="y" value="${changeValues(
      this.x + this.minY,
    )}"></div>
    <div>W    <input type="number" name="width" value="${changeValues(
      this.maxX - this.minX,
    )}"></div>
    <div> H  <input type="number" name="height" value="${changeValues(
      this.maxY - this.minY,
    )}"> </div> 
    <div>Rotation <input type="number" name="angle" value="${radToDeg(
      this.angle,
      "deg",
    )}"></div>
    <div>Opacity <input type="number" name="opacity" min="0" max="100" value="100" ></div>    </div>
    </div>
    ${super.similarProptiesOutput()}
    <div class="shape">
            <div><button class="convert"><img src="images/Group 34.svg"></button><button class="rounded-edge"><img src="images/Group 32.svg"></button></div>
    <div style="display:${
      this.selectedArea === "pointIndex" &&
      this.points[this.selectedLineIndex].edgeModes === "rounded"
        ? "flex"
        : "none"
    }" class="thick">
    Corner Radius <input type="number" name="cornerRadius" value="${
      this.selectedArea === "pointIndex" &&
      this.points[this.selectedLineIndex].edgeModes === "rounded"
        ? changeValues(this.points[this.selectedLineIndex].cornerRadius)
        : 0
    }">
    </div>
    <div style="display: flex;justify-content:end;align-items:end"><button class="normal">${
      this.mode === "edit" ? "Done" : "Edit"
    }</button></div>
    </div>
    `;
    }
    if (pen) {
      document.querySelector(".done").addEventListener("click", () => {
        objects.push(this);
        pen = null;
        this.formatProperties();
      });
    } else {
      super.similarPropties();
      document.querySelector(".rounded-edge").addEventListener("click", () => {
        if (this.selectedArea === "pointIndex") {
          this.points[this.selectedLineIndex].edgeModes = "rounded";
          this.formatProperties();
        }
      });
      document.querySelector(".convert").addEventListener("click", () => {
        if (this.selectedArea === "pointIndex") {
          this.points[this.selectedLineIndex].edgeModes = "shaped";
        }
      });
      document.querySelector(".normal").addEventListener("click", () => {
        this.mode = this.mode === "normal" ? "edit" : "normal";
        this.formatProperties();
      });
      propertiesBar
        .querySelectorAll("input[type='text'],input[type='number']")
        .forEach((input) => {
          input.addEventListener(
            "input",
            (e) => setTimeout(this.changeProperties(e)),
            1000,
          );
        });
      propertiesBar.querySelectorAll("input[type='color']").forEach((input) => {
        input.addEventListener(
          "change",
          (e) => setTimeout(this.changeProperties(e)),
          1000,
        );
      });
      requestDraw()
    }
  }
  changeProperties(e) {
    const name = e.target.name;
    if (name === "angle") {
      this.angle = radToDeg(e.target.value, "rad");
    } else if (name === "bgColor") {
      this.color[0] = e.target.value;
    } else if (name === "colorDeg") {
      this.colorDeg = radToDeg(e.target.value, "rad");
    } else if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    } else if (e.target.type === "number") {
      const value = backValues(parseFloat(e.target.value));
      if (name === "x") {
        this.x = value - this.minX;
      } else if (name === "y") {
        this.y = value - this.minY;
      } else if (name === "opacity") {
        this.opacity = Number(e.target.value);
      } else if (name === "width") {
        const scaleX = value / (this.maxX - this.minX);
        this.points.forEach((p) => {
          p.points.x *= scaleX;
          p.controls[0].x *= scaleX;
          p.controls[1].x *= scaleX;
        });
      } else if (name === "height") {
        const scaleY = value / (this.maxY - this.minY);
        this.points.forEach((p) => {
          p.points.y *= scaleY;
          p.controls[0].y *= scaleY;
          p.controls[1].y *= scaleY;
        });
      } else if (name === "cornerRadius") {
        if (
          this.selectedArea === "pointIndex" &&
          this.points[this.selectedLineIndex].edgeModes === "rounded"
        )
          this.points[this.selectedLineIndex].cornerRadius = value;
      } else this[name] = value;
    }
    if (this.outlineType.length !== 0)
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    requestDraw()
    undoObject.push(cloneObject(objects));
    undoText.push("object");
  }
}

class TextBox extends Formats{
  constructor(x, y) {
    super()
    this.text = "Add Textbox";
    this.fontSize = 30;
    this.fontFamily = "Arial";
    this.color = ["#FFCC00", "#ff0000"];
    this.x = x;
    this.y = y;
    this.fontStyle = "bold";
    this.angle = 0;
    this.width = 0;
    this.height = 0;
    this.selectedArea;
    this.outline = false;
    this.outlineColor = "#ff0000";
    this.outlineThickness = 5;
    this.textAllign = "left";
    this.lineDashWidth = 5;
    this.outlineType = [];
    this.lineDashSpacing = 3;
    this.colorStop = [];
    this.colorDeg = 0;
    this.colorFill = "uniform";
    this.opacity = 100;
    this.clipped = "none";
    this.clips = [];
    this.shadow = false;
    this.shadowStyle = { color: "#000000", blur: 10, offsetX: 5, offsetY: 5 };
    this.isDoubleClicked = false;
    this.lineHeight = 30;
        this.textArea = "";
    this.iterated = false;
  }
addObject() {
  ctx.save();

  const lines = this.text.split("\n");

  ctx.font = `${this.fontStyle} ${this.fontSize}px ${this.fontFamily}`;
  ctx.textAlign = this.textAllign;
  ctx.textBaseline = "alphabetic";

  let maxWidth = 0;
  let textHeight = 0;

  lines.forEach((line) => {
    const metrics = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, metrics.width);
    textHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  });

  this.width = maxWidth;
  this.height = textHeight + (lines.length - 1) * this.lineHeight;

  const centerX = this.x + this.width / 2;
  const centerY = this.y + this.height / 2;

  ctx.translate(centerX, centerY);
  ctx.rotate(this.angle);
  ctx.scale(this.scaleX, this.scaleY);

  if (this.shadow) {
    ctx.shadowColor = this.shadowStyle.color;
    ctx.shadowBlur = this.shadowStyle.blur;
    ctx.shadowOffsetX = this.shadowStyle.offsetX;
    ctx.shadowOffsetY = this.shadowStyle.offsetY;
  }

  const startY = -this.height / 2 + textHeight;

  // ✅ FIX: Correct X position based on alignment
  let drawX = -this.width / 2; // left default
  if (this.textAllign === "center") drawX = 0;
  if (this.textAllign === "right") drawX = this.width / 2;

  lines.forEach((line, index) => {
    const y = startY + index * this.lineHeight;

    if (this.outline) {
      ctx.beginPath();
      ctx.lineWidth = this.outlineThickness;
      ctx.strokeStyle = this.outlineColor;
      ctx.setLineDash(this.outlineType);
      ctx.strokeText(line, drawX, y);
      ctx.closePath();
    }

    if (this.colorFill !== "none") {
      ctx.fillStyle = this.colorType();
      ctx.fillText(line, drawX, y);
    }
  });

  if (selectedObj === this || multipleSelectArr.includes(this)) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#0000ff";
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(
      -this.width / 2 - 2,
      -this.height / 2 - 2,
      this.width + 4,
      this.height + 4
    );
    ctx.closePath();
  }

  ctx.restore();
}


  colorType() {
    const colors = this.color.map((color) =>
      applyOpacityToHex(color, this.opacity),
    );
    this.color = colors;
    if (this.colorFill === "uniform") {
      return this.color[0];
    } else if (this.colorFill === "linear") {
      let minX = -this.width / 2;
      let minY = -this.height / 2;
      let maxX = -this.width / 2 + this.width;
      let maxY = -this.height / 2 + this.height;

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
      let minX = -this.width / 2;
      let minY = -this.height / 2;
      let maxX = -this.width / 2 + this.width;
      let maxY = -this.height / 2 + this.height;
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
  whatSelected(mouse) {
    const threshold = 10;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin + this.width / 2;
    const localY = dx * sin + dy * cos + this.height / 2;
    if (
      localX > 0 &&
      localX < this.width &&
      localY > 0 &&
      localY < this.height
    ) {
      this.selectedArea = "Selected";
    } else this.selectedArea = null;

    return this.selectedArea !== null;
  }
  formatSelected(mouse) {
    console.log(this.selectedArea);
    if (this.isDoubleClicked) {
      const center = {
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
      };
      this.angle =
        Math.atan2(mouse.y - center.y, mouse.x - center.x) - Math.PI / 2;
    } else {
      this.x += mouse.x - lastMouseX;
      this.y += mouse.y - lastMouseY;
    }
  }
formatProperties() {
  propertiesBar.innerHTML = `
    <section class="coord-section">
      <h3>Coordinate</h3>

      <div class="two-grid coord-grid">
        <label class="field">
          <span class="field-label">X</span>
          <input type="number" name="x" value="${changeValues(this.x)}">
        </label>

        <label class="field">
          <span class="field-label">Y</span>
          <input type="number" name="y" value="${changeValues(this.y)}">
        </label>

        <label class="field">
          <span class="field-label">W</span>
          <input type="number" name="width" value="${changeValues(this.width)}">
        </label>

        <label class="field">
          <span class="field-label">H</span>
          <input type="number" name="height" value="${changeValues(this.height)}">
        </label>

        <label class="field">
          <span class="field-label">Rotation</span>
          <input type="number" name="angle" value="${radToDeg(this.angle, "deg")}">
        </label>

        <label class="field">
          <span class="field-label">Opacity</span>
          <input type="number" name="opacity" min="0" max="100" value="${changeValues(this.opacity)}">
        </label>
      </div>
    </section>

    <section class="text-section">
      <h3>Text Content</h3>
      <textarea style="height:100px" class="text" name="text">${this.text}</textarea>
    </section>

    <section class="text-style-section" style="display:flex; flex-direction:column; gap:1rem">
      <h3>Text Style</h3>

      <div class="two-grid">
        <label class="field">
          <span class="field-label">Font Size</span>
          <input type="number" name="fontSize" value="${changeValues(this.fontSize)}">
        </label>

        <label class="field">
          <span class="field-label">Line Height</span>
          <input type="number" name="lineHeight" value="${changeValues(this.lineHeight)}">
        </label>
      </div>

      <label class="uniform-div">
        <span>Font Family</span>
        <input type="text" list="fonts" name="fontFamily" value="${this.fontFamily}">
        <datalist id="fonts" >
        ${allFonts.map(font=>`<option value="${font}"></option>`).join("")}
        </datalist>
      </label>

      <label class="uniform-div">
        <span>Font Style</span>
        <select name="fontStyle">
          <option value="normal" ${this.fontStyle === "normal" ? "selected" : ""}>Normal</option>
          <option value="bold" ${this.fontStyle === "bold" ? "selected" : ""}>Bold</option>
          <option value="italic" ${this.fontStyle === "italic" ? "selected" : ""}>Italic</option>
          <option value="bold italic" ${this.fontStyle === "bold italic" ? "selected" : ""}>Bold Italic</option>
        </select>
      </label>

      <label class="uniform-div">
        <span>Text Align</span>
        <select name="textAllign">
          <option value="left" ${this.textAllign === "left" ? "selected" : ""}>Left</option>
          <option value="center" ${this.textAllign === "center" ? "selected" : ""}>Center</option>
          <option value="right" ${this.textAllign === "right" ? "selected" : ""}>Right</option>
        </select>
      </label>
    </section>

    ${super.similarProptiesOutput()}

    <section class="shadow-section" style="display:flex; flex-direction:column; gap:1rem">
      <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center">
        <h3>Shadow</h3>
        <button class="${this.shadow ? "outlinet" : "outlinef"}" id="shadowToggle"></button>
      </div>

      <section style="display:${this.shadow ? "flex" : "none"}; flex-direction:column; gap:1rem">
        <label class="uniform-div">
          <span>Shadow Color</span>
          <input type="color" name="shadowColor" value="${this.shadowStyle.color}">
        </label>

        <div class="two-grid">
          <label class="field">
            <span class="field-label">Blur</span>
            <input type="number" name="shadowBlur" value="${changeValues(this.shadowStyle.blur)}">
          </label>

          <label class="field">
            <span class="field-label">Offset X</span>
            <input type="number" name="shadowOffsetX" value="${changeValues(this.shadowStyle.offsetX)}">
          </label>

          <label class="field">
            <span class="field-label">Offset Y</span>
            <input type="number" name="shadowOffsetY" value="${changeValues(this.shadowStyle.offsetY)}">
          </label>
        </div>
      </section>
    </section>
    <section>
          <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center">
        <h3>Iterarate</h3>
        <button class="${this.iterated ? "outlinet" : "outlinef"}" id="iterateToggle"></button>
      </div>
<textarea style="display:${
      this.iterated ? "block" : "none"
    }" name="textarea" class="text">${this.textArea}</textarea>
    </section>
  `;


super.similarPropties()
  // Bind inputs
  propertiesBar.querySelectorAll("input, textarea, select, button#shadowToggle,button#iterateToggle").forEach((el) => {
    // Shadow toggle button
    if (el.id === "shadowToggle") {
      el.addEventListener("click", () => {
        this.shadow = !this.shadow;
        this.formatProperties();
        requestDraw()
      });
      return;
    }
    if (el.id === "iterateToggle") {
      el.addEventListener("click", () => {
        this.iterated= !this.iterated;
        this.formatProperties();
        requestDraw()
      });
      return;
    }

    // Normal inputs/selects
    el.addEventListener("input", (e) => {
      this.changeProperties(e);
    });
  });
draw()
  // Optional: outline toggle is inside similarProptiesOutput(), keep existing handler if you have one.
}

changeProperties(e) {
  const name = e.target.name;

  if (name === "text") this.text = e.target.value;

  if (name === "x") this.x = Number(e.target.value) || 0;
  if (name === "y") this.y = Number(e.target.value) || 0;

  // Width/Height: if you want them editable, you can scale text box;
  // for now we set the values directly (matches your existing props panel pattern).
  if (name === "width") this.width = backValues(Number(e.target.value) || 0);
  if (name === "height") this.height = backValues(Number(e.target.value) || 0);

  if (name === "angle") this.angle = degToRad(Number(e.target.value) || 0);
  if (name === "opacity") this.opacity = Math.max(0, Math.min(100, Number(e.target.value) || 0));

  if (name === "fontSize") this.fontSize = Math.max(1, Number(e.target.value) || 1);
  if (name === "lineHeight") this.lineHeight = Math.max(1, Number(e.target.value) || 1);
if (name === "textarea") {
        this.textArea = e.target.value;
    }
  if (name === "fontFamily"){
this.fontFamily = e.target.value;
if(!(defaultFonts.includes(this.fontFamily))){
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${this.fontFamily.replace(
      / /g,
      "+"
    )}&display=swap`;
    document.head.appendChild(link);
    defaultFonts.push(this.fontFamily)
}
  } 
  if (name === "outlineThickness") this.outlineThickness = backValues(Number(e.target.value) || 0)
        if (name === "lineDashWidth") {
      this.lineDashWidth =  backValues(Number(e.target.value) || 0);
    }

    if (name === "lineDashSpacing") {
      this.lineDashSpacing =  backValues(Number(e.target.value) || 0);
    }
  

  if (this.outlineType.length !== 0) {
    this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
  }
  if (name === "fontStyle") this.fontStyle = e.target.value;
  if (name === "textAllign") this.textAllign = e.target.value;
  if (name === "outlineColor") {
    this.outlineColor = e.target.value;
  }
  // Shadow fields
  if (name === "shadowColor") this.shadowStyle.color = e.target.value;
  if (name === "shadowBlur") this.shadowStyle.blur = Number(e.target.value) || 0;
  if (name === "shadowOffsetX") this.shadowStyle.offsetX = Number(e.target.value) || 0;
  if (name === "shadowOffsetY") this.shadowStyle.offsetY = Number(e.target.value) || 0;

  requestDraw()
}

  doubleClicked(mouse) {
    this.doubleClicked = true;
  }
  drawIteratedImage(i){
    const texts = this.textArea.split("\n")
    if(this.iterated && i < texts.length) this.text = texts[i]
  }
}

class Images extends Formats {
  constructor(image, width, height, originalFile) {
    super();
    this.x = 100;
    this.y = 100;
    this.width = 150;
    this.aspectRatio = height / width;
    this.height = this.width * this.aspectRatio;
    this.image = 0;
    this.isDoubleClicked = false;
    this.angle = 0;
    this.selectedArea;
    this.originalFiles = [originalFile];
    this.iteratedFiles = [image];
    this.opacity = 100;
    this.maintainApect = false;
    this.clipped = "none";
    this.imagePreview = image.src;
  }
  addObject() {
    ctx.save();
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = this.opacity / 100;

    ctx.drawImage(
      this.iteratedFiles[this.image],
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
    );
    ctx.closePath();
    ctx.restore();

    if (selectedObj === this || multipleSelectArr.includes(this)) {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#0000ff";
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(
        -this.width / 2 - 2,
        -this.height / 2 - 2,
        this.width + 4,
        this.height + 4,
      );
      ctx.closePath();
    }
    ctx.restore();
  }

  moveClip(x, y) {
    this.x += x;
    this.y += y;
  }
  whatSelected(mouse) {
    const threshold = 10;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin + this.width / 2;
    const localY = dx * sin + dy * cos + this.height / 2;
    this.selectedArea = LineUtils.getNormalPostion(
      localX,
      localY,
      this.width,
      this.height,
      10,
    );

    return this.selectedArea !== null;
  }
  formatSelected(mouse) {
    if (this.isDoubleClicked) {
      const center = {
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
      };
      this.angle =
        Math.atan2(mouse.y - center.y, mouse.x - center.x) - Math.PI / 2;
    } else {
      super.rectFormat(mouse);
      if (this.selectedArea === "Selected") {
        this.x += mouse.x - lastMouseX;
        this.y += mouse.y - lastMouseY;
      }
    }
  }
  showClone() {
    const clone = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
    );
    clone.originalFiles = [...this.originalFiles];
    clone.iteratedFiles = this.iteratedFiles.map((img) => {
      const newImg = new Image();
      newImg.src = img.src;
      return newImg;
    });
    return clone;
  }
  formatProperties() {
    propertiesBar.innerHTML = `
    <div>
    <h3>Coordinate</h3>
       <div class="two-grid">
    <div>X <input type="number" name="x" value="${changeValues(this.x)}"> </div>
        <div>Y<input type="number" name="y" value="${changeValues(
          this.y,
        )}"></div>
    <div>W </label><input type="number" name="width" value="${changeValues(
      this.width,
    )}"></div>
    <div>H <input type="number" name="height" value="${changeValues(
      this.height,
    )}"></div>
    <div>Opacity <input type="number" name="opacity" value="${
      this.opacity
    }"></div>
    <div>Rotation <input type="number" name="angle" value="${radToDeg(
      this.angle,
      "deg",
    )}"></div>
    </div> 
        <div style="display:flex;flex-direction:column; gap:1rem"><button class="imageb" id="removeBg">Remove Background</button>
    <button class="imageb" id="maintainAspect">Aspect Ratio</button></div>
    </div>
    <div>
    <h3>All Images</h3>
        <div class="preview"><img src="${this.imagePreview}"></div>
    <section class="iteratedsec">

      ${this.originalFiles
        .map(
          (file, i) =>
            `<div ${
              this.imagePreview === this.iteratedFiles[i].src
                ? "class='selected'"
                : ""
            }>
        <p>${file.name}</p>
        <button>Change<input type="file"></button>
        </div>`,
        )
        .join("")}
    </section>
    <button class="image-file">Add Images <input type="file" multiple accept=".jpg,.png,.svg" name="iteratedFiles" >
</button>
    </div>
   
  `;
     super.similarPropties();
    document.querySelectorAll(".iteratedsec > div").forEach((div, i) => {
      div.addEventListener("click", () => {
        this.imagePreview = this.iteratedFiles[i].src;
        this.formatProperties();
      });
      div.querySelector("button").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          this.iteratedFiles[i] = img;
          this.originalFiles[i] = file;
        };
        this.imagePreview = img.src;
        this.formatProperties();
      });
    });

    document.getElementById("maintainAspect").addEventListener("click", () => {
      this.height = this.aspectRatio * this.width;
      requestDraw()
    });
    document.getElementById("removeBg").addEventListener("click", async () => {
      try {
        const formData = new FormData();
        let files = null;
        this.iteratedFiles.forEach((file, i) => {
          if (file.src === this.imagePreview) files = i;
        });
        if (files === null) {
          alert("Original image file not available for background removal.");
          return;
        }
        formData.append("image_file", this.originalFiles[files]);
        formData.append("size", "auto");
        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: {
            "X-Api-Key": "qYJAiV6LvvHifoPU12kRt8T5",
          },
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.errors ? err.errors[0].title : "Unknown error");
        }

        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        const newImage = new Image();
        newImage.src = base64;

        newImage.onload = () => {
          this.iteratedFiles[files] = newImage;
          const name = this.originalFiles[files].name;
          this.originalFiles[files] = blob;
          this.originalFiles[files].name = name;
          this.imagePreview = base64;
          this.formatProperties();
        };
      } catch (err) {
        console.log(err);
      }
    });

    propertiesBar.querySelectorAll("input").forEach((input) => {
      input.addEventListener(
        "input",
        (e) => setTimeout(this.changeProperties(e)),
        1000,
      );
    });
    requestDraw()
  }
  changeProperties(e) {
    const name = e.target.name;
    if (name === "angle") {
      this.angle = radToDeg(e.target.value, "rad");
    } else if (e.target.type === "number") {
      const value = backValues(parseFloat(e.target.value));
      if (!isNaN(value) && value !== null) {
        if (name === "opacity") {
          this.opacity = Number(e.target.value);
        } else {
          this[name] = value;
        }
      }
    } else if (name === "iteratedFiles") {
      Array.from(e.target.files).forEach((file) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          this.iteratedFiles.push(img);
          this.originalFiles.push(file);
          this.formatProperties();
        };
      });
    }
    requestDraw()
  }
  drawIteratedImage(i) {
    if (this.iteratedFiles.length >= i) {
      this.image = i;
    } else {
      this.image = 0;
    }
  }
  doubleClicked(mouse) {
    isRotatingObject = true;
    this.isDoubleClicked = this.isDoubleClicked ? false : true;
    return true;
  }
  whereToSnap() {
    return {
      x: [this.x, this.x + this.width / 2, this.x + this.width],
      y: [this.y, this.y + this.height / 2, this.y + this.height],
      pos: { x: this.x, y: this.y, width: this.width, height: this.height },
    };
  }
  changeLocation(value, type) {
    if (type === "x") {
      this.x = value;
    } else {
      this.y = value;
    }
  }
}
class Group {
  constructor(list) {
    this.list = list;
    this.isDoubleClicked = false;
    this.rotationAngle = 0;
  }
  addObject() {
    this.minX = Math.min(...this.list.map((l) => l.whereToSnap().x[0]));
    this.maxX = Math.max(...this.list.map((l) => l.whereToSnap().x[2]));
    this.minY = Math.min(...this.list.map((l) => l.whereToSnap().y[0]));
    this.maxY = Math.max(...this.list.map((l) => l.whereToSnap().y[2]));
    this.x = (this.minX + this.maxX) / 2;
    this.y = (this.minY + this.maxY) / 2;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotationAngle);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#0000ff";
    ctx.setLineDash([5, 3]);

    ctx.strokeRect(
      this.minX - this.x,
      this.minY - this.y,
      this.maxX - this.minX,
      this.maxY - this.minY,
    );

    this.list.forEach((obj) => {
      const snap = obj.whereToSnap();
      ctx.save();
      ctx.translate(-this.x, -this.y);
      obj.addObject();
      ctx.restore();
    });

    ctx.restore();
  }
  whatSelected(mouse) {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const angle = -this.rotationAngle;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (
      localX >= this.minX - this.x &&
      localX <= this.maxX - this.x &&
      localY >= this.minY - this.y &&
      localY <= this.maxY - this.y
    ) {
      return true;
      console.log("true");
    }
    return false;
  }

  formatSelected(mouse) {
    if (this.isDoubleClicked) {
      this.rotationAngle =
        Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2;
    } else {
      this.list.forEach((l) =>
        l.moveClip(mouse.x - lastMouseX, mouse.y - lastMouseY),
      );
    }
  }
  doubleClicked(mouse) {
    isRotatingObject = true;
    this.isDoubleClicked = this.isDoubleClicked ? false : true;
    return true;
  }
  formatProperties() {
    console.log("yah");
  }
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function cloneObject(object) {
  return object.map((obj) => obj.showClone());
}
function undo() {
  if (undoObject.length > 1) {
    redoObject.push(undoObject.pop());
    objects = cloneObject(undoObject[undoObject.length - 1]);
    requestDraw()
  }
}

function redo() {
  if (redoObject.length > 0) {
    const redoState = redoObject.pop();
    undoObject.push(redoState);
    objects = cloneObject(redoState);
    requestDraw()
  }
}

function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g);
  if (!result) return rgb;

  return (
    "#" +
    result
      .slice(0, 3)
      .map((x) => {
        const hex = parseInt(x).toString(16);
        return hex.padStart(2, "0");
      })
      .join("")
  );
}

document.querySelector(".saveAsPdf").addEventListener("click", saveAsPDF);
function changeOrientation(value) {
  if (value === "potrait" && measurement.width > measurement.height) {
    [measurement.width, measurement.height] = [
      measurement.height,
      measurement.width,
    ];
  } else if (value === "landscape" && measurement.height > measurement.width) {
    [measurement.width, measurement.height] = [
      measurement.height,
      measurement.width,
    ];
  }
  canvasSize();
}

document.getElementById("measurement").addEventListener("change", (e) => {
  whatsMeasured = e.target.value;
  width.value = changeValues(canvassDiv.getBoundingClientRect().width);
  height.value = changeValues(canvassDiv.getBoundingClientRect().height);
  requestDraw()
  if (selectedObj) selectedObj.formatProperties();
});
document.getElementById("paperSize").addEventListener("change", (e) => {
  const value = e.target.value;
  if (value === "a1") {
    measurement = measurementArr[0];
  } else if (value === "a2") {
    measurement = measurementArr[1];
  } else if (value === "a3") {
    measurement = measurementArr[2];
  } else if (value === "a4") {
    measurement = measurementArr[3];
  } else if (value === "a5") {
    measurement = measurementArr[4];
  } else if (value === "a6") {
    measurement = measurementArr[5];
  } else if (value === "business-card") {
    measurement = measurementArr[6];
  } else if (value === "letter") {
    measurement = measurementArr[7];
  }
  canvasSize();
});
document.querySelectorAll(".leftSidebar button").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.add("active");
    document.querySelectorAll(".leftSidebar button").forEach((butt) => {
      if (butt !== button) butt.classList.remove("active");
    });
  });
});
width.addEventListener("input", (e) => {
  const widthValue = backValues(e.target.value);
  const heightValue = backValues(height.value);
  measurement = { width: widthValue, height: heightValue };
  canvasSize();
});
height.addEventListener("input", (e) => {
  const widthValue = backValues(width.value);
  const heightValue = backValues(e.target.value);
  measurement = { width: widthValue, height: heightValue };
  canvasSize();
});
document.getElementById("renderPage").addEventListener("change", (e) => {
  renderPageResolution = e.target.value;
  switch (renderPageResolution) {
    case "a0":
      renderPageSize = measurementArr[9];
      break;
    case "a1":
      renderPageSize = measurementArr[0];
      break;
    case "a2":
      renderPageSize = measurementArr[1];
      break;
    case "a3":
      renderPageSize = measurementArr[2];
      break;
    case "a4":
      renderPageSize = measurementArr[3];
      break;
    case "a5":
      renderPageSize = measurementArr[4];
      break;
    case "legal":
      renderPageSize = measurementArr[10];
      break;
    case "auto":
      renderPageSize = "";

      break;
    case "letter":
      renderPageSize = measurementArr[7];
      break;
    case "custom":
      renderPageSize = { width: renderWidth, height: renderHeight };
      renderPageResolution = "custom";
      break;
  }
  const rows = document.getElementById("noPerRow");
  const columns = document.getElementById("noPerColumn");
  if (renderPageSize !== "") {
    rows.readOnly = false;
    columns.readOnly = false;
    const height = document.getElementById("renderHeight");
    const width = document.getElementById("renderWidth");
    width.value = renderPageSize.width;
    height.value = renderPageSize.height;
    if (renderPageResolution === "custom") {
      height.readOnly = false;
      width.readOnly = false;
    } else {
      height.readOnly = true;
      width.readOnly = true;
    }
  } else {
    rows.readOnly = true;
    columns.readOnly = true;
    rows.value = 1;
    columns.value = 1;
  }
});
document.getElementById("zoom").addEventListener("click", () => {
  propertiesBar.innerHTML = `
  <div style="display:flex;flex-direction:row;align-items:center; justify-content:center; gap:1rem;border:none">
    <button class="zoomin"><img src="images/Group 46.svg"></button>
    <button class="zoomout"><img src="images/Group 47.svg"></button>
    <button class="fitToPage">Fit To Page</button>
  </div>
  `;

  isDrawing = "zoom";
  canvas.style.cursor = "zoom-in";


  const zoomInBtn = propertiesBar.querySelector(".zoomin");
  const zoomOutBtn = propertiesBar.querySelector(".zoomout");
  const fitBtn = propertiesBar.querySelector(".fitToPage");

  let zoomInterval;

  function zoomIn() {
    scale *= 1.05;
    requestDraw();
  }

  function zoomOut() {
    scale /= 1.05;
    requestDraw();
  }

  /* HOLD TO ZOOM IN */
  zoomInBtn.addEventListener("mousedown", () => {
    zoomIn();
    zoomInterval = setInterval(zoomIn, 30);
  });

  /* HOLD TO ZOOM OUT */
  zoomOutBtn.addEventListener("mousedown", () => {
    zoomOut();
    zoomInterval = setInterval(zoomOut, 30);
  });

  /* STOP WHEN RELEASED */
  window.addEventListener("mouseup", () => {
    clearInterval(zoomInterval);
  });

  /* FIT TO PAGE */
  fitBtn.addEventListener("click", () => {
    scale = 1;
    panX = 0;
    panY = 0;
    requestDraw();
  });

  requestDraw();
});
function flip(value) {
  if (selectedObj) {
    if (value === "x") {
      selectedObj.scaleX *= -1;
    } else selectedObj.scaleY *= -1;
  }
  requestDraw()
}
document.querySelector(".generateButton").addEventListener("click", () => {
  document.querySelector(".generate").style.display = "flex";
  const canvasDiv = canvassDiv.getBoundingClientRect();
  document.getElementById("renderWidth").value = canvasDiv.width;
  document.getElementById("renderHeight").value = canvasDiv.height;
  document.getElementById("renderPage").value = "auto";
  document.getElementById("noPerRow").value = 1;
  document.getElementById("noPerColumn").value = 1;
});
function cancelGenerate() {
  document.querySelector(".generate").style.display = "none";
}
document.getElementById("noPerRow").addEventListener("input", (e) => {
  renderPageRow = e.target.value;
});
document.getElementById("noPerColumn").addEventListener("input", (e) => {
  renderPageColumn = e.target.value;
});
document.getElementById("renderHeight").addEventListener("input", (e) => {
  renderPageSize.height = e.target.value;
});
document.getElementById("renderWidth").addEventListener("input", (e) => {
  renderPageSize.width = e.target.value;
});

document.getElementById("duplicate").addEventListener("click", () => {
  duplicateClicked = true;
  if (duplicateClicked) {
    if (selectedObj) {
      cloneObj = selectedObj.showClone();
      cloneObj.changeLocation(lastMouseX, "x");
      cloneObj.changeLocation(lastMouseY, "y");
    } else {
      notify("Please Select An Object");
      duplicateClicked = false;
      document.getElementById("moveTool").classList.add("active");
      document.getElementById("duplicate").classList.remove("active");
    }
  } else {
    cloneObj = null;
    cloneText = null;
  }
});
// document.getElementById("pageTop").addEventListener("click", () => {
//   if (selectedObj) {
//     let index = objects.indexOf(selectedObj);
//     if (index !== -1) {
//       objects.splice(index, 1);
//       objects.push(selectedObj);
//      requestDraw()
//     }
//   }
// });
// document.getElementById("pageEnd").addEventListener("click", () => {
//   if (selectedObj) {
//     let index = objects.indexOf(selectedObj);
//     if (index !== -1) {
//       objects.splice(index, 1);
//       objects.unshift(selectedObj);
//      requestDraw()
//     }
//   }
// });
document.getElementById("delete").addEventListener("click", () => {
  if (selectedObj) {
    let index = objects.indexOf(selectedObj);
    objects.splice(index, 1);
    selectedObj = null;
    propertiesBar.innerHTML = "";
    requestDraw()
  }
});
let scaleRatio;
let newWidth;
let newHeight;
document.querySelector(".saveAsImage").addEventListener("click", saveAsImage);
function canvasSize() {
  scale = 1
  panX=0
  panY=0
  requestDraw()
  const canvassRect = canvas.getBoundingClientRect();
  width.value = changeValues(measurement.width);
  height.value = changeValues(measurement.height);
  canvassDiv.style.width = measurement.width + "px";
  canvassDiv.style.height = measurement.height + "px";
  scaleRatio = Math.max(
    measurement.width / (canvassRect.width - 30),
    measurement.height / (canvassRect.height - 30),
  );
  if (scaleRatio > 1) {
    newWidth = canvassRect.width * scaleRatio;
    newHeight = canvassRect.height * scaleRatio;
    canvas.style.width = canvass.style.width = `${newWidth}px`;
    canvas.style.height = canvass.style.height = `${newHeight}px`;
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvass.style.transform = `scale(${ 1 / scaleRatio})`
  }else{
   zoomToRect({x:(canvas.width-measurement.width)/2,
    y:(canvas.height-measurement.height)/2,
    width:measurement.width,
    height:measurement.height})
  }

  requestDraw()
}
function applyOpacityToHex(hexColor, opacityPercent) {
  if (hexColor.length >= 9) hexColor = hexColor.slice(0, 7);
  let alpha = Math.round((opacityPercent / 100) * 255);
  let alphaHex = alpha.toString(16).padStart(2, "0");
  hexColor = hexColor.replace("#", "");
  if (hexColor.length === 3) {
    hexColor = hexColor
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hexColor}${alphaHex}`;
}

function changeValues(x) {
  x = parseFloat(x);
  if (isNaN(x)) return 0;
  let value = 0;
  if (whatsMeasured === "px") {
    value = x;
  } else if (whatsMeasured === "pt") {
    value = x / 1.333;
  } else if (whatsMeasured === "in") {
    value = x / 96;
  } else if (whatsMeasured === "m") {
    value = x / 3780;
  } else if (whatsMeasured === "cm") {
    value = x / 37.8;
  } else if (whatsMeasured === "mm") {
    value = x / 3.78;
  }
  return parseFloat(parseFloat(value).toFixed(2));
}
function drawingObject() {
  const start = drawingCoordinate.start;
  if (drawingCoordinate.end.x - start.x < 1)
    drawingCoordinate.end.x = start.x + 1;
  if (drawingCoordinate.end.y - start.y < 1)
    drawingCoordinate.end.y = start.y + 1;
  const end = drawingCoordinate.end;
  switch (isDrawing) {
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
  }
}
function moveTool() {
  isDrawing = null;
  canvas.style.cursor = "default";
  multipleSelect = false;
  multipleSelectArr = [];
  selectedObj = null;

  duplicateClicked = false;
}

function multipleSelection() {
  isDrawing = null;
  canvas.style.cursor = "default";
  multipleSelect = true;
  multipleSelectArr = [];
  selectedObj = null;
}
function backValues(x) {
  if (whatsMeasured === "px") {
    return x;
  } else if (whatsMeasured === "pt") {
    return x * 1.333;
  } else if (whatsMeasured === "in") {
    return x * 96;
  } else if (whatsMeasured === "m") {
    return x * 3780;
  } else if (whatsMeasured === "cm") {
    return x * 37.8;
  } else if (whatsMeasured === "mm") {
    return x * 3.78;
  }
}
let previousClip = null;
let previousOpacity;
let clippedObject = null;
editclip.addEventListener("click", () => {
  if (clippedObject === null) return;
  if (clippedObject.clipped !== "editclip") {
    clippedObject = clippedObject;
    previousClip = clippedObject.clipped;
    clippedObject.clipped = "editclip";
    clippedObject.clips.forEach((clip) => objects.push(clip));
    editclip.textContent = "Done";
    if (clippedObject.opacity > 80) {
      previousOpacity = clippedObject.opacity;
      clippedObject.opacity = 80;
    }
    console.log(clippedObject);
  } else {
    clippedObject.clipped = previousClip;
    clippedObject.opacity = previousOpacity;
    clippedObject.clips.forEach((clip) => {
      let index = objects.indexOf(clip);
      objects.splice(index, 1);
    });
    editclip.textContent = "Edit Clip";
    selectedObj = clippedObject;
    clippedObject = null;
    previousClip = null;
  }
});
function notify(name) {
  notification.textContent = name;
  notification.style.display = "block";
  setTimeout(() => (notification.style.display = "none"), 1500);
}
function radToDeg(val, type) {
  if (type === "rad") {
    return parseFloat(((val * Math.PI) / 180).toFixed(2));
  } else {
    return parseFloat(((val * 180) / Math.PI).toFixed(2));
  }
}

async function saveAsPDF() {
  const container = document.getElementById("generationArea");

  if (renderPageResolution === "auto") {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await domtoimage.toPng(container);
      const { jsPDF } = window.jspdf;

      const rect = container.getBoundingClientRect();
      const pdfWidth = rect.width * 0.264583;
      const pdfHeight = rect.height * 0.264583;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "l" : "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("content.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  } else {
    const sections = container.querySelectorAll("section");
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: renderPageResolution.toLowerCase(),
    });

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const dataUrl = await domtoimage.toPng(section);

        const imgProps = pdf.getImageProperties(dataUrl);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgRatio = imgProps.width / imgProps.height;
        const pageRatio = pageWidth / pageHeight;

        let imgWidth, imgHeight;

        if (imgRatio > pageRatio) {
          imgWidth = pageWidth;
          imgHeight = (imgProps.height * pageWidth) / imgProps.width;
        } else {
          imgHeight = pageHeight;
          imgWidth = (imgProps.width * pageHeight) / imgProps.height;
        }

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, 0, imgWidth, imgHeight);
      } catch (error) {
        console.error(`Failed to render section ${i + 1}`, error);
      }
    }

    pdf.save("content.pdf");
  }
}

async function saveAsImage() {
  const element = document.getElementById("generationArea");
  let images;
  if (renderPageResolution === "auto") {
    images = element.querySelectorAll("div");
  } else {
    images = element.querySelectorAll("section");
  }
  for (let i = 0; i < images.length; i++) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await domtoimage.toPng(element);
      const link = document.createElement("a");
      link.download = `content${i}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to save as image:", error);
    }
  }
}
document.querySelector(".snip").addEventListener("click", () => {
  if (clipped === null) {
    if (selectedObj && selectedObj.clipped === "none") {
      clipped = selectedObj;
      canvas.style.cursor = "pointer";
    }
  } else {
    clipped = null;
    canvas.style.cursor = "default";
  }
});
document
  .querySelector(".add-image input")
  .addEventListener("change", (e) => addImage(e));
function addImage(e) {
  canvas.style.cursor = "crosshair";
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  img.onload = () => {
    const sprite = new Images(img, img.width, img.height, file);
    objects.push(sprite);
    images.push(sprite);
    requestDraw()
  };
}
function addTextbox() {
  canvas.style.cursor = "inherit";
  isDrawing = "text";

}
function addPolygon() {
  canvas.style.cursor = "crosshair";
  isDrawing = "polygon";
}
function addLine() {
  canvas.style.cursor = "crosshair";
  const line = new Line();
  pen = line;
  requestDraw()
}
function addRectangle() {
  canvas.style.cursor = "crosshair";
  isDrawing = "rect";
}
function addEllipse() {
  canvas.style.cursor = "crosshair";
  isDrawing = "ellipse";
}
function align(arg) {
  if (multipleSelectArr.length > 1) {
    const last = multipleSelectArr[multipleSelectArr.length - 1].whereToSnap();
    const others = multipleSelectArr.slice(0, -1);
    let value;
    switch (arg) {
      case "left":
        value = last.x[0];
        break;
      case "centerX":
        value = last.x[1];
        break;
      case "right":
        value = last.x[2];
        break;
      case "top":
        value = last.y[0];
        break;
      case "centerY":
        value = last.y[1];
        break;
      case "bottom":
        value = last.y[2];
        break;
    }
    others.forEach((other) => {
      const otherSnap = other.whereToSnap().pos;
      switch (arg) {
        case "left":
          other.changeLocation(value, "x");
          break;
        case "centerX":
          other.changeLocation(value - otherSnap.width / 2, "x");
          break;
        case "right":
          other.changeLocation(value - otherSnap.width, "x");
          break;
        case "top":
          other.changeLocation(value, "y");
          break;
        case "centerY":
          other.changeLocation(value - otherSnap.height / 2, "y");
          break;
        case "bottom":
          other.changeLocation(value - otherSnap.height, "y");
      }
    });
    requestDraw()
  }
}
function group() {
  if (multipleSelectArr.length > 1) {
    const newGroup = new Group(multipleSelectArr);
    multipleSelectArr.forEach((arr) => {
      const index = objects.indexOf(arr);
      objects.splice(index, 1);
    });
    multipleSelectArr = [];
    multipleSelect = false;
    objects.push(newGroup);
  }
}
function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();

  // Mouse position inside the canvas element
  const screenX = evt.x - rect.left;
  const screenY = evt.y - rect.top;

  // Convert CSS pixels to actual canvas pixels
  const canvasX = screenX * (canvas.width / rect.width);
  const canvasY = screenY * (canvas.height / rect.height);

  // Undo pan + zoom to get world coordinates
  return {
    x: (canvasX - panX) / scale,
    y: (canvasY - panY) / scale,
  };
}
function zoomToRect(rect) {
  if (rect.width <= 0 || rect.height <= 0) return;

  const padding = 20; // optional space around the rect

  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;

  const scaleX = availableWidth / rect.width;
  const scaleY = availableHeight / rect.height;

  scale = Math.min(scaleX, scaleY);

  const rectCenterX = rect.x + rect.width / 2;
  const rectCenterY = rect.y + rect.height / 2;

  panX = canvas.width / 2 - rectCenterX * scale;
  panY = canvas.height / 2 - rectCenterY * scale;

  requestDraw();
}

async function generateCard() {
  scale = 1
  panX=0;panY=0;
  requestDraw()
  selectedObj = null;
  generationArea.innerHTML = "";

  const boxesPerPage = renderPageColumn * renderPageRow;

  const createNewPage = () => {
    const page = document.createElement("section");
    generationArea.append(page);

    page.style.width = "100%";
    page.style.backgroundColor = "#00FF00";
    page.style.display = "grid";
    page.style.gridTemplateRows = `repeat(${renderPageColumn}, 1fr)`;
    page.style.gridTemplateColumns = `repeat(${renderPageRow}, 1fr)`;
    page.style.placeItems = "center";

    const width = page.getBoundingClientRect().width;
    const height = (width * renderPageSize.height) / renderPageSize.width;
    page.style.height = `${height}px`;

    return page;
  };

  let currentPage = createNewPage();

  const containerWidth = currentPage.getBoundingClientRect().width - 50;
  const containerHeight = currentPage.getBoundingClientRect().height - 50;

  const cellWidth = containerWidth / renderPageRow;
  const cellHeight = containerHeight / renderPageColumn;

  // scale for preview grid placement (DOM sizing)
  const paperRect0 = canvassDiv.getBoundingClientRect();
  const localScale = Math.min(cellWidth / paperRect0.width, cellHeight / paperRect0.height);

  let iterationLength = 1;

  if (textBoxes.length > 0) {
    iterationLength = Math.max(
      iterationLength,
      ...textBoxes.map((tb) => tb.textArea.split("\n").length)
    );
  }

  const maxImageIterLength = Math.max(
    1,
    ...images.map((imgObj) =>
      imgObj.iteratedFiles && imgObj.iteratedFiles.length > 0
        ? imgObj.iteratedFiles.length
        : 1
    )
  );

  iterationLength = Math.max(iterationLength, maxImageIterLength);

  let boxCountInPage = 0;

  // Increase output resolution. You can change this to 1, 2, 3...
  const scaleFactor = 2;

  for (let i = 0; i < iterationLength; i++) {
    // 1) draw current iteration onto main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    images.forEach((img) => img.drawIteratedImage(i));
    textBoxes.forEach((textBox) => textBox.drawIteratedImage(i));
    objects.forEach((obj) => obj.addObject());

    // 2) compute crop region (paper div) in CANVAS pixel coords
    const canvasRect = canvas.getBoundingClientRect();
    const paperRect = canvassDiv.getBoundingClientRect();

    const sx = canvas.width / canvasRect.width;
    const sy = canvas.height / canvasRect.height;

    const cropX = (paperRect.left - canvasRect.left) * sx;
    const cropY = (paperRect.top - canvasRect.top) * sy;
    const cropW = paperRect.width * sx;
    const cropH = paperRect.height * sy;

    // 3) copy cropped area to an offscreen canvas
    const croppedCanvas = document.createElement("canvas");
    const cty = croppedCanvas.getContext("2d");

    croppedCanvas.width = cropW * scaleFactor;
    croppedCanvas.height = cropH * scaleFactor;

    cty.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    cty.drawImage(
      canvas,
      cropX, cropY, cropW, cropH,   // source (canvas pixels)
      0, 0, cropW, cropH            // dest (before scaleFactor transform)
    );

    const canvasData = croppedCanvas.toDataURL();

    // 4) create preview element
    const div = document.createElement("div");
    const img = document.createElement("img");
    img.src = canvasData;

    div.style.position = "relative";
    div.style.backgroundColor = "#ffffff";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";

    if (renderPageResolution === "auto") {
      div.style.width = "100%";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      div.append(img);
      generationArea.append(div);

      const w = div.getBoundingClientRect().width;
      div.style.height = `${(w * paperRect.height) / paperRect.width}px`;
    } else {
      if (boxCountInPage >= boxesPerPage) {
        currentPage = createNewPage();
        boxCountInPage = 0;
      }

      div.style.width = `${paperRect0.width * localScale}px`;
      div.style.height = `${paperRect0.height * localScale}px`;

      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";

      div.append(img);
      currentPage.append(div);

      boxCountInPage++;
    }
  }

  document.querySelector(".generate").style.display = "none";
}

let needsDraw = false;

function requestDraw() {
  if (needsDraw) return;
  needsDraw = true;

  requestAnimationFrame(() => {
    needsDraw = false;
    draw()
  });
}

canvas.addEventListener("mousedown", (event) => {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });

  isDraggingObject = false;
  isPanning = false;

  if (isDrawing !== null) {
    if (isDrawing === "text") {
      const text = new TextBox(pos.x, pos.y);
      objects.push(text);
      textBoxes.push(text);
    } else {
      drawingStart = true;
      drawingCoordinate.start = { x: pos.x, y: pos.y };
      drawingCoordinate.end = { x: pos.x, y: pos.y };
    }
  } else if (pen !== null) {
    pen.drawPen(pos);
    selectedObj = pen;
    selectedObj.formatProperties();
  } else if (clipped !== null) {
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].whatSelected(pos) && objects[i] !== clipped) {
        clipped.clipped = "clipped";

        const objectsCoordinate = objects[i].whereToSnap().pos;
        const clippedCoordinate = clipped.whereToSnap().pos;

        if (
          clippedCoordinate.x >
          objectsCoordinate.x + objectsCoordinate.width
        ) {
          clipped.changeLocation(
            objectsCoordinate.x +
              (objectsCoordinate.width - clippedCoordinate.width) / 2,
            "x"
          );
          clipped.changeLocation(
            objectsCoordinate.y +
              (objectsCoordinate.height - clippedCoordinate.height) / 2,
            "y"
          );
        }

        objects[i].clips.push(clipped);

        const index = objects.indexOf(clipped);
        selectedObj = objects[i];
        objects.splice(index, 1);
        clipped = null;
        break;
      }
    }

    if (clipped === null) {
      notify("Clipped");
      canvas.style.cursor = "default";
    } else {
      notify("Select An Object");
    }
  } else if (cloneObj) {
    const cloned = cloneObj.showClone();
    objects.push(cloned);
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
  } else if (clippedObject !== null && previousClip !== null) {
    editclip.style.display = "block";

    for (let i = clippedObject.clips.length - 1; i >= 0; i--) {
      if (clippedObject.clips[i].whatSelected(pos)) {
        selectedObj = clippedObject.clips[i];
        isDraggingObject = true;
        isRotatingObject = false;
        selectedObj.isDoubleClicked = false;
        selectedObj.formatProperties();
        break;
      }
    }
  } else if (multipleSelect) {
    objects.forEach((obj) => {
      if (obj.whatSelected(pos)) {
        if (!measurementArr.includes(obj) && !multipleSelectArr.includes(obj)) {
          multipleSelectArr.push(obj);
        }
      }
    });
  } else {
    let hitObject = null;

    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].whatSelected(pos)) {
        hitObject = objects[i];
        break;
      }
    }

    if (hitObject) {
      selectedObj = hitObject;

      if (selectedObj.clips && selectedObj.clips.length > 0) {
        editclip.style.display = "block";
        clippedObject = selectedObj;
      } else {
        editclip.style.display = "none";
      }

      isRotatingObject = false;
      selectedObj.isDoubleClicked = false;
      selectedObj.formatProperties();
      isDraggingObject = true;
    } else {
      selectedObj = null;
      editclip.style.display = "none";
      isPanning = true;
      startX = event.clientX;
      startY = event.clientY;
    }
  }

  lastMouseX = pos.x;
  lastMouseY = pos.y;
  requestDraw();
});

canvas.addEventListener("dblclick", (event) => {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });

  for (let i = objects.length - 1; i >= 0; i--) {
    if (objects[i].whatSelected(pos)) {
      selectedObj = objects[i];
      selectedObj.doubleClicked(pos);
      requestDraw();
      break;
    }
  }
});

window.addEventListener("mouseup", () => {
  if (drawingStart) {
    drawingStart = false;

    if (isDrawing === "zoom") {
              const x = Math.min(drawingCoordinate.start.x, drawingCoordinate.end.x);
        const y = Math.min(drawingCoordinate.start.y, drawingCoordinate.end.y);
        const w = Math.abs(drawingCoordinate.end.x - drawingCoordinate.start.x);
        const h = Math.abs(drawingCoordinate.end.y - drawingCoordinate.start.y);

      zoomToRect({x:x,y:y,width:w,height:h})
    } else {
      objects.push(drawingObject());
    }
  }

  // if (isDraggingObject || isRotatingObject) {
  //   undoObject.push(cloneObject(objects));
  //   redoObject.length = 0;
  // }

  isDraggingObject = false;
  isRotatingObject = false;
  isPanning = false;

  // if (selectedObj && !cloneObj && !pen) {
  //   selectedObj.formatProperties();
  // }

  requestDraw();
});

canvas.addEventListener("mouseleave", () => {
  if (!isDraggingObject && !drawingStart) {
    isPanning = false;
  }
});

canvas.addEventListener("mousemove", (event) => {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });
  let changed = false;

  if (isPanning) {
    panX += event.clientX - startX;
    panY += event.clientY - startY;

    startX = event.clientX;
    startY = event.clientY;
    changed = true;
  }

  if (drawingStart) {
    drawingCoordinate.end = { x: pos.x, y: pos.y };
    changed = true;
  } else if (cloneObj) {
    cloneObj.formatSelected(pos);
    changed = true;
  } else if ((isDraggingObject || isRotatingObject) && selectedObj) {
    selectedObj.formatSelected(pos);
    changed = true;
  }

  lastMouseX = pos.x;
  lastMouseY = pos.y;

  if (changed) {
    requestDraw();
  }
});

function draw() {
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, panX, panY);

    ctx.beginPath()
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(
      (canvas.width-measurement.width)/2,
      (canvas.height-measurement.height)/2,
      measurement.width,
      measurement.height
    )
    ctx.closePath()
    if (pen) {
      pen.addObject();
    }

    if (cloneObj) {
      cloneObj.addObject();
    }

    if (objects.length > 0) {
      objects.forEach((obj) => {
        obj.addObject();
      });
    }

    if (drawingStart) {
      if (isDrawing === "zoom") {
        const x = Math.min(drawingCoordinate.start.x, drawingCoordinate.end.x);
        const y = Math.min(drawingCoordinate.start.y, drawingCoordinate.end.y);
        const w = Math.abs(drawingCoordinate.end.x - drawingCoordinate.start.x);
        const h = Math.abs(drawingCoordinate.end.y - drawingCoordinate.start.y);

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      } else {
        drawingObject().addObject();
      }
    }
  } catch (err) {
    console.log(err);
  }
}

requestDraw();