
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
let cloneObj = null;
let pen = null;
let multipleSelect = false;
let multipleSelectArr = [];
let undoObject = [];
let redoObject = [];
let isDrawing = null;
let scaleRatio = 1;
let newWidth;
let newHeight;
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
let multipleSelectCoor = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
};
let isPanning = false;
let startPanning = false;
let startX = 0;
let startY = 0;
let drawingImage = null;
let selectedObj = null;
let clipped = null;
let thresholds = {
  selected: () => adapt(2),
  normalMode: () => adapt(25),
  threshold: () => adapt(2),
  pthreshold: () => adapt(5),
  maxCanvasSize: () => adapt(5000),
  pointHold: () => adapt(15),
  slineWidth: () => adapt(1),
  sLineDashWidth: () => adapt(2.5),
  sLineDashSpacing: () => adapt(1.5),
  sWidth: () => adapt(2),
  clipWidth: () => adapt(2),
  drawPenControls: () => adapt(10),
  arrowKeys: () => adapt(5),
  zoomScroll: () => adapt(5),
  sColor: "#0000ff",
  normalModeColor: "#0000ff88",
};
let generateInfo = {
  renderPage: "auto",
  renderWidth: 100,
  renderHeight: 100,
  noPerRow: 1,
  noPerColumn: 1,
  spacing: 30,
};
let defaultFonts = [
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "emoji",
  "math",
  "fangsong",
];
const newFonts = JSON.parse(localStorage.getItem("fontNames")) || [];
let allFonts = [...defaultFonts, ...newFonts];
let db = new Localbase("db") || [];

const projectName = document.getElementById("project-name");
let formerName = "";
projectName.addEventListener("input", async (e) => {
  const dbName = `${e.target.value.trim().toLowerCase()}.json`;
  const names = JSON.parse(localStorage.getItem("project-names")) || [];
  if (names.includes(formerName)) {
    await db.collection("projects").doc({ name: formerName }).update({
      name: dbName,
      entryDate: new Date().getTime(),
    });
    const imageDatas = await db.collection(`img${formerName}`).get();
    for (imageFiles of imageDatas) {
      await db.collection(`img${dbName}`).add(imageFiles);
    }
    await db.collection(`img${formerName}`).delete();
    const formerIndex = names.indexOf(formerName);
    names[formerIndex] = dbName;
    localStorage.setItem("project-names", JSON.stringify([...names]));
  }
  formerName = dbName;
  notify("changed");
});
window.addEventListener("resize", () => {
  canvasSize();
});
window.addEventListener("load", async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (data) {
      const decoded = decodeURIComponent(data);

      const objectsData = await db
        .collection("projects")
        .doc({ name: data })
        .get();
      projectName.value = objectsData.name.replace(/\.json$/i, "");
      formerName = objectsData.name;
      await importLoaded(objectsData.object);
    } else {
      const names = JSON.parse(localStorage.getItem("project-names")) || [];
      const newProjectCount = names.filter((project) =>
        /^new project(\s+\d+)?$/i.test(project),
      ).length;
      projectName.value = `new project ${newProjectCount === 0 ? "" : newProjectCount}`;
    }
  } catch (error) {
    console.log(error);
  }

  width.value = measurement.width;
  height.value = measurement.height;
  canvasSize();
  const mediaQuery = window.matchMedia("(max-width: 768px)");
  if (mediaQuery.matches) {
    thresholds.pointHold = () => adapt(15);
    thresholds.normalMode = () => adapt(25);
  } else {
    thresholds.pointHold = () => adapt(7.5);
    thresholds.normalMode = () => adapt(15);
  }
});
class LineUtils {
  static getEdgeAtPosition(localMouseX, localMouseY, points) {
    let threshold = thresholds.threshold();
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
      if (
        pdx * pdx + pdy * pdy <
        thresholds.pointHold() * thresholds.pointHold()
      ) {
        return { value: i, type: "pointIndex" };
      }
    }

    for (let i = 0; i < points.length; i++) {
      if (points[i].edgeModes === "shaped") {
        for (let j = 0; j < 2; j++) {
          const cp = points[i].controls[j];
          const cdx = localMouseX - cp.x;
          const cdy = localMouseY - cp.y;
          if (
            cdx * cdx + cdy * cdy <
            thresholds.pointHold() * thresholds.pointHold()
          ) {
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
      ctx.rect(
        p.points.x - thresholds.pointHold() / 2,
        p.points.y - thresholds.pointHold() / 2,
        thresholds.pointHold(),
        thresholds.pointHold(),
      );

      if (selectedArea === "pointIndex" && i === selectedLineIndex)
        ctx.fillStyle = "#0000ff";
      else ctx.fillStyle = "#0000ff88";
      ctx.strokeStyle = "#e4e4e4";
      ctx.fill();
      ctx.lineWidth = adapt(2);
      ctx.stroke();
    });

    points.forEach((isCurve, i) => {
      if (isCurve.edgeModes === "shaped") {
        isCurve.controls.forEach((cp, j) => {
          ctx.beginPath();
          ctx.moveTo(isCurve.points.x, isCurve.points.y);
          ctx.lineTo(cp.x, cp.y);
          ctx.strokeStyle = "#0000ff88";
          ctx.lineWidth = adapt(2);
          ctx.stroke();
          ctx.beginPath();
          ctx.rect(
            cp.x - thresholds.pointHold() / 2,
            cp.y - thresholds.pointHold() / 2,
            thresholds.pointHold(),
            thresholds.pointHold(),
          );
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
class LoaderManager {
  constructor(maxItems = 10) {
    this.maxItems = maxItems;
    this.currentIndex = 0;
    this.loaderContainer = null;
  }

  // Create the loader UI container
  createLoader(containerId = "loader-container") {
    let container = document.createElement("div");
    container.id = containerId;
    container.classList.add("loader-container");
    document.body.appendChild(container);
    this.loaderContainer = container;
    this.loaderContainer.style.display = "block";
  }

  // Increment and show progress
  incrementOriginalState() {
    this.currentIndex++;
    this.showProgress();

    // Auto-hide when complete
    if (this.currentIndex >= this.maxItems) {
      setTimeout(() => this.reset(), 500);
    }
  }

  // Update the display
  showProgress() {
    if (!this.loaderContainer) return;

    const percentage = (this.currentIndex / this.maxItems) * 100;

    this.loaderContainer.style.display = "block";
    this.loaderContainer.innerHTML = `
      <div style="text-align: center;">
        <div style="margin-bottom: 10px;">Loading Images...</div>
        <div style="
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          height: 20px;
        ">
          <div style="
            width: ${percentage}%;
            background: #4caf50;
            height: 100%;
            transition: width 0.3s ease;
          "></div>
        </div>
        <div style="margin-top: 10px; font-size: 12px;">
          ${this.currentIndex} / ${this.maxItems}
        </div>
      </div>
    `;
  }

  reset() {
    this.currentIndex = 0;
    document.body.removeChild(this.loaderContainer);
  }
}
class Formats {
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
  }
  similarPropties() {
    document.querySelector(".normalb").addEventListener("click", () => {
      this.outlineType = [];
      if (this.type === "group") {
        this.list.forEach((l) => (l.outlineType = []));
      }
      this.formatProperties();
          undoObject.push(cloneObject(objects));
    redoObject.length = 0;
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
                undoObject.push(cloneObject(objects));
    redoObject.length = 0;
    });
    document.getElementById("outline").addEventListener("click", () => {
      this.outline = !this.outline;
      if (this.type === "group") {
        this.list.forEach((l) => (l.outline = this.outline));
      }
      this.formatProperties();
                undoObject.push(cloneObject(objects));
    redoObject.length = 0;
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
                undoObject.push(cloneObject(objects));
    redoObject.length = 0;
      });
      document.querySelectorAll(".color-div").forEach((div, i) => {
        div
          .querySelector("input[type='number']")
          .addEventListener("input", (e) => {
            this.colorStop[i] = e.target.value;
            if (this.type === "group") {
              this.list.forEach((l) => (l.colorStop[i] = e.target.value));
            }
                      undoObject.push(cloneObject(objects));
    redoObject.length = 0;
          });
        div
          .querySelector("input[type='color']")
          .addEventListener("input", (e) => {
            this.color[i] = e.target.value;
            if (this.type === "group") {
              this.list.forEach((l) => (l.color[i] = e.target.value));
            }
                      undoObject.push(cloneObject(objects));
    redoObject.length = 0;
          });
        div.querySelector("button").addEventListener("click", (e) => {
          this.color.splice(i, 1);
          this.colorStop = [];
          if (this.type === "group") {
            this.list.forEach((l) => {
              l.color.splice(i, 1);
              l.colorStop = [];
            });
                      undoObject.push(cloneObject(objects));
    redoObject.length = 0;
          }
          this.addObject();
          this.formatProperties();
                    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
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
                undoObject.push(cloneObject(objects));
    redoObject.length = 0;
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

                <input type="color" value="${color.length > 7 ? color.slice(0, 7) : color}">
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
          <input type="color" name="outlineColor" value="${this.outlineColor}">
        </label>

        <label class="thick">
          <span>Outline Thickness</span>
          <input type="number" name="outlineThickness" value="${changeValues(this.outlineThickness)}">
        </label>

        <div class="uniform-div">
          Outline Type
          <div>
            <button class="normalb ${this.outlineType !== [] ? "selected" : "" }"></button>
            <button class="dashedb ${this.outlineType === [] ? "selected" : "" }"></button>
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

    // Remove scale
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

    // 2. Check other objects for X snapping
    if (!pointXfound) {
      for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i] === this) continue; // Skip self

        const worldPoints = objects[i].getWorldPoints(); // You need this method
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

    // 4. Check other objects for Y snapping
    if (!pointYfound) {
      for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i] === this) continue;

        const worldPoints = objects[i].getWorldPoints();
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const xCoor = objects[i].whereToSnap().x;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const xCoor = objects[i].whereToSnap().x;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const yCoor = objects[i].whereToSnap().y;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const yCoor = objects[i].whereToSnap().y;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const xCoor = objects[i].whereToSnap().x;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const yCoor = objects[i].whereToSnap().y;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const yCoor = objects[i].whereToSnap().y;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const xCoor = objects[i].whereToSnap().x;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const xCoor = objects[i].whereToSnap().x;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const yCoor = objects[i].whereToSnap().y;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const xCoor = objects[i].whereToSnap().x;
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
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i] === this) continue;
          const yCoor = objects[i].whereToSnap().y;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const xCoor = objects[i].whereToSnap().x;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const xCoor = objects[i].whereToSnap().x;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const yCoor = objects[i].whereToSnap().y;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const yCoor = objects[i].whereToSnap().y;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const xCoor = objects[i].whereToSnap().x;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const yCoor = objects[i].whereToSnap().y;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const xCoor = objects[i].whereToSnap().x;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const yCoor = objects[i].whereToSnap().y;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const xCoor = objects[i].whereToSnap().x;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const yCoor = objects[i].whereToSnap().y;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const xCoor = objects[i].whereToSnap().x;
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
          for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i] === this) continue;
            const yCoor = objects[i].whereToSnap().y;
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
        this.x += mouse.x - lastMouseX;
        this.y += mouse.y - lastMouseY;
        if (this.clips.length > 0) {
          this.clips.forEach((clip) =>
            clip.moveClip(mouse.x - lastMouseX, mouse.y - lastMouseY),
          );
        }
      }

      this.radiusX = this.radiusX <= 0 ? 0 : this.radiusX;
      this.radiusY = this.radiusY <= 0 ? 0 : this.radiusY;
    }
  }
}
class Rectangle extends Formats {
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
          this.selectedArea = "scale";

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
        ctx.setTransform(scale, 0, 0, scale, panX, panY);
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(this.angle);
        ctx.scale(this.scaleX, this.scaleY);
        this.createPath();
        // const worldMouse = {
        //   x: (mouse.x - panX) / scale,
        //   y: (mouse.y - panY) / scale,
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
      } else if (this.selectedArea === "scaleR") {
        const lastWidth = lastMouseX - this.x;
        const currentWidth = mouse.x - this.x;
        const scaleX = currentWidth / lastWidth;
        this.points.forEach((p) => {
          p.points.x = p.points.x * scaleX;
          p.controls[0].x = p.controls[0].x * scaleX;
          p.controls[1].x = p.controls[1].x * scaleX;
        });
      } else if (this.selectedArea === "scaleB") {
        const lastHeight = lastMouseY - this.y;
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
        input.addEventListener("input", (e) => this.changeProperties(e));
      });
    propertiesBar.querySelectorAll("input[type='color']").forEach((input) => {
      input.addEventListener("change", (e) => this.changeProperties(e));
    });
    requestDraw();
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
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
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
    this.type = "ellipse";
    this.isDashed = false;
    this.arcStart = 0;
    this.arcEnd = 2 * Math.PI;
    this.clipped = "none";
    this.clips = [];
    this.mode = "fill"
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
      ctx.lineWidth = thresholds.slineWidth();
      ctx.strokeStyle = thresholds.sColor;
      ctx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);
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
    requestDraw();
  }
  changeProperties(e) {
    const name = e.target.name;

    if (name === "angle" || name=== "arcStart" || name=== "arcEnd") {
      this[name] = radToDeg(Number(e.target.value) || 0, "rad");
    }

    else if (name === "bgColor") {
      this.color[0] = e.target.value;
    }

    else if (name === "colorDeg" || name === "arcStart" || name === "arcEnd") {
      this[name] = radToDeg(Number(e.target.value) || 0, "rad");
    }

    else if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    }

    else if (e.target.type === "number") {
      let value = backValues(Number(e.target.value) || 0);
      value = value <= 0 ? 0 : value;
      if (!isNaN(value) && value !== null) {
        if (name === "x") {
          this.x = value + this.radiusX;
        }

        else if (name === "y") {
          this.y = value + this.radiusY;
        }

        else if (name === "opacity") {
          this.opacity = Number(e.target.value) || 0;
        }
        else if (name === "radiusX" || name === "radiusY") {
          this[name] = value / 2;
        }

        else  {
          this[name] = value;
        }
      }
    }

    if (this.outlineType.length !== 0) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    }

    requestDraw();

    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
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
class Polygon extends Formats {
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
      ctx.lineWidth = thresholds.slineWidth();
      ctx.strokeStyle = thresholds.sColor;
      ctx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);
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
    } else if (this.mode === "normal") {
      if (
        Math.abs(localX - this.maxX) < thresholds.normalMode() / 2 &&
        Math.abs(localY - this.maxY) < thresholds.normalMode() / 2
      ) {
        this.selectedArea = "scale";
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
      if (scaleRatio > 1) {
      }
      // const worldMouse = {
      //   x: (mouse.x - panX) / scale,
      //   y: (mouse.y - panY) / scale,
      // };

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
    } else if (this.selectedArea === "scaleR") {
      const lastWidth = lastMouseX - this.x;
      const currentWidth = mouse.x - this.x;
      const scaleX = currentWidth / lastWidth;
      this.points.forEach((p) => {
        p.points.x = p.points.x * scaleX;
        p.controls[0].x = p.controls[0].x * scaleX;
        p.controls[1].x = p.controls[1].x * scaleX;
      });
    } else if (this.selectedArea === "scaleB") {
      const lastHeight = lastMouseY - this.y;
      const currentHeight = mouse.y - this.y;
      const scaleY = currentHeight / lastHeight;
      this.points.forEach((p) => {
        p.points.y = p.points.y * scaleY;
      });
    }
  }
  formatProperties() {
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
      <input type="number" name="y" value="${changeValues(this.x + this.minY)}">
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

  <div class="shape-row" style="display: ${this.mode === "edit" ? "flex" : "none"}">
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
    requestDraw();
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
        this.sides = Number(e.target.value) || 0;
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

    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
    requestDraw();
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
      this.x = value + this.radiusX;
    } else if (type === "y") {
      this.y = value + this.radiusY;
    } else if (type === "scaleX") {
      this.points.forEach((p) => {
        p.points.x = p.points.x * value;
        p.controls[0].x = p.controls[0].x * value;
        p.controls[1].x = p.controls[1].x * value;
      });
    } else if (type === "scaleY") {
      this.points.forEach((p) => {
        p.points.y = p.points.y * value;
        p.controls[0].y = p.controls[0].y * value;
        p.controls[1].y = p.controls[1].y * value;
      });
    }
  }
}
class Line extends Formats {
  constructor() {
    super();
    this.points = [];
    this.mode = "edit";
    this.selectedLineIndex = null;
    this.x;
    this.y;
    this.isClosed = false;
    this.clipped = "none";
    this.clips = [];
    this.type = "line";
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
      ctx.scale(this.scaleX, this.scaleY);
      ctx.beginPath();
      LineUtils.drawSmartShape(this.points, this.isClosed);

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
        ctx.lineWidth = thresholds.slineWidth();
        ctx.strokeStyle = thresholds.sColor;
        ctx.setLineDash([
          thresholds.sLineDashWidth(),
          thresholds.sLineDashSpacing(),
        ]);
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
        {
          x: mouse.x - this.x - thresholds.drawPenControls(),
          y: mouse.y - this.y,
        },
        {
          x: mouse.x - this.x + thresholds.drawPenControls(),
          y: mouse.y - this.y,
        },
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
      if (Math.abs(localX - this.maxX) < thresholds.threshold()) {
        this.selectedArea = "scaleR";
        return true;
      }
      if (Math.abs(localY - this.maxY) < thresholds.threshold()) {
        this.selectedArea = "scaleB";
        return true;
      }
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.scale(this.scaleX, this.scaleY);
      ctx.beginPath();
      LineUtils.drawSmartShape(this.points, this.close);
      // const worldMouse = {
      //   x: (mouse.x - panX) / scale,
      //   y: (mouse.y - panY) / scale,
      // };
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
      } else if (this.selectedArea === "scaleR") {
        const lastWidth = lastMouseX - this.x;
        const currentWidth = mouse.x - this.x;
        const scaleX = currentWidth / lastWidth;
        this.points.forEach((p) => {
          p.points.x = p.points.x * scaleX;
          p.controls[0].x = p.controls[0].x * scaleX;
          p.controls[1].x = p.controls[1].x * scaleX;
        });
      } else if (this.selectedArea === "scaleB") {
        const lastHeight = lastMouseY - this.y;
        const currentHeight = mouse.y - this.y;
        const scaleY = currentHeight / lastHeight;
        this.points.forEach((p) => {
          p.points.y = p.points.y * scaleY;
        });
      }
    }
  }
  formatProperties() {
    if (pen) {
      propertiesBar.innerHTML = `
          <section class="shape" >
          <button class="normal done">Done</button>
          <button class="normal close">Close</button>
          </section>
      `;
    } else {
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
    </div>
  </section>

  ${super.similarProptiesOutput()}

  <section class="shape">
    <div class="shape-row">
      <button class="convert">
        <img src="imagess/spline-pointer.svg" alt="Convert">
      </button>

      <button class="rounded-edge">
        <img src="imagess/square-round-corner.svg" alt="Rounded edge">
      </button>
    </div>

    <label
      class="field thick"
      style="display:${
        this.selectedArea === "pointIndex" &&
        this.points[this.selectedLineIndex].edgeModes === "rounded"
          ? "flex"
          : "none"
      }"
    >
      <span class="field-label">Corner Radius</span>
      <input 
        type="number" 
        name="cornerRadius" 
        value="${
          this.selectedArea === "pointIndex" &&
          this.points[this.selectedLineIndex].edgeModes === "rounded"
            ? changeValues(this.points[this.selectedLineIndex].cornerRadius)
            : 0
        }"
      >
    </label>

    <div class="shape-row shape-actions" style="justify-content:end;align-items:end">
      <button class="normal">
        ${this.mode === "edit" ? "Done" : "Edit"}
      </button>
    </div>
  </section>
`;
    }
    if (pen) {
      document.querySelector(".done").addEventListener("click", () => {
        pen = null;
        Tools("moveTool");
        selectedObj = this;
        let minX = Infinity,
          minY = Infinity;
        let maxX = -Infinity,
          maxY = -Infinity;

        this.points.forEach((p) => {
          // anchor point
          minX = Math.min(minX, p.points.x);
          minY = Math.min(minY, p.points.y);
          maxX = Math.max(maxX, p.points.x);
          maxY = Math.max(maxY, p.points.y);

          // control points (IMPORTANT for curves)
          p.controls.forEach((c) => {
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x);
            maxY = Math.max(maxY, c.y);
          });
        });
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.points.forEach((p) => {
          p.points.x -= centerX;
          p.points.y -= centerY;

          p.controls.forEach((c) => {
            c.x -= centerX;
            c.y -= centerY;
          });
        });
        this.x += centerX;
        this.y += centerY;
        this.formatProperties();
      });
      document.querySelector(".close").addEventListener("click", () => {
        this.isClosed = !this.isClosed;
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
      requestDraw();
    }
  }
  changeProperties(e) {
    const name = e.target.name;
    if (name === "angle") {
      this.angle = radToDeg(e.target.value, "rad");
    }
    if (name === "bgColor") {
      this.color[0] = e.target.value;
    }
    if (name === "colorDeg") {
      this.colorDeg = radToDeg(e.target.value, "rad");
    }
    if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    }
    if (e.target.type === "number") {
      let value = backValues(parseFloat(e.target.value));
      value = value <= 0 ? 0 : value;
      if (name === "x") {
        this.x = value - this.minX;
      } else if (name === "y") {
        this.y = value - this.minY;
      } else if (name === "opacity") {
        this.opacity = Number(e.target.value);
      } else if (name === "width") {
        const scaleX = value / (this.maxX - this.minX);
        this.points.forEach((p) => {
          p.points.x *= scaleX <= 0 ? 0.01 : scaleX;
          p.controls[0].x *= scaleX <= 0 ? 0.01 : scaleX;
          p.controls[1].x *= scaleX <= 0 ? 0.01 : scaleX;
        });
      } else if (name === "height") {
        const scaleY = value / (this.maxY - this.minY);
        this.points.forEach((p) => {
          p.points.y *= scaleY <= 0 ? 0.01 : scaleY;
          p.controls[0].y *= scaleY <= 0 ? 0.01 : scaleY;
          p.controls[1].y *= scaleY <= 0 ? 0.01 : scaleY;
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
    requestDraw();
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
  }
  whereToSnap() {
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
      this.x = value - this.minX;
    } else if (type === "y") {
      this.y = value - this.minY;
    } else if (type === "scaleX") {
      this.points.forEach((p) => {
        p.points.x = p.points.x * value;
        p.controls[0].x = p.controls[0].x * value;
        p.controls[1].x = p.controls[1].x * value;
      });
    } else if (type === "scaleY") {
      this.points.forEach((p) => {
        p.points.y = p.points.y * value;
        p.controls[0].y = p.controls[0].y * value;
        p.controls[1].y = p.controls[1].y * value;
      });
    }
  }
  moveClip(x, y) {
    this.x += x;
    this.y += y;
    if (this.clips.length > 0)
      this.clips.forEach((clip) => clip.moveClip(x, y));
  }
}

class TextBox extends Formats {
  constructor(x, y) {
    super();
    this.text = "";
    this.fontSize = adapt(30);
    this.fontFamily = "sans-serif";
    this.fonts = [];
    this.textPlace = document.createElement("textarea");
    this.type = "text";
    this.x = x;
    this.y = y;
    this.fontStyle = "normal";
    this.width = 0;
    this.maintainedWidth = 0;
    this.originalText = "";
    this.originalFontSize = "";
    this.originalPosition = { x: this.x, y: this.y };
    this.height = 0;
    this.textAllign = "left";
    this.clipped = "none";
    this.shadow = false;
    this.shadowStyle = { color: "#000000", blur: 10, offsetX: 5, offsetY: 5 };
    this.lineHeight = adapt(30);
    this.textArea = "";
    this.iterated = false;
    this.clipped = "none";
    this.outline = false;
    this.colorFill = "uniform";
    this.formatIterated = "none";
    this.iterateAllign = "left";
  }
  addObject() {
    if (this.isDoubleClicked) {
      return;
    }
    if (canvass.contains(this.textPlace)) {
      canvass.removeChild(this.textPlace);
    }

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
      ctx.lineWidth = thresholds.slineWidth();
      ctx.strokeStyle = thresholds.sColor;
      ctx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);
      ctx.strokeRect(
        -this.width / 2 - thresholds.sWidth() / 2,
        -this.height / 2 - thresholds.sWidth() / 2,
        this.width + thresholds.sWidth(),
        this.height + thresholds.sWidth(),
      );
      ctx.closePath();
    }

    ctx.restore();
  }

  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.textPlace = document.createElement("textarea");
    return clone;
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

      <label class="uniform-div" style="position:relative">
        <span>Font Family</span>
        <input class="fontInput"  type="text" list="fonts" name="fontFamily" value="${this.fontFamily}">
        <div id="fonts" style="display:${this.fonts.length > 0 ? "flex" : "none"} ">
        </div>
        <button class="font-imports"><input type="file" accept=".ttf,.otf,.woff,.woff2"/><img src="imagess/upload.svg" /></button>
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
      <div style="display:${this.iterated ? "block" : "none"}">
      <textarea  name="textarea" class="text">${this.textArea}</textarea>
  <label class="uniform-div" style="margin-top:1rem">
  <span>Format Iterated</span>
  <select name="formatIterated" class="formatIterated">
    <option value="none" ${this.formatIterated === "none" ? "selected" : ""}>None</option>
    <option value="Fit" ${this.formatIterated === "Fit" ? "selected" : ""}>Fit</option>
    <option value="shrinkToFit" ${this.formatIterated === "shrinkToFit" ? "selected" : ""}>Shrink To Fit</option>
    <option value="createNewLine" ${this.formatIterated === "createNewLine" ? "selected" : ""}>Create New Line</option>
    <option value="atWhiteSpace" ${this.formatIterated === "atWhiteSpace" ? "selected" : ""}>At White Space</option>
  </select>
  </label> 

  <label class="uniform-div" style="margin-top:1rem">
  <span>Iterate Align</span>
  <select name="iterateAllign" class="iterateAllign">
    <option value="left" ${this.iterateAllign === "left" ? "selected" : ""}>Left</option>
    <option value="center" ${this.iterateAllign === "center" ? "selected" : ""}>Center</option>
    <option value="right" ${this.iterateAllign === "right" ? "selected" : ""}>Right</option>
  </select>
  </label>        
      </div>

    </section>
  `;
    document
      .querySelector(".font-imports input")
      .addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          // Get font name from file
          const fileName = file.name;
          const fontNames = JSON.parse(localStorage.getItem("fontNames")) || [];
          if (fontNames.includes(fileName)) {
            notify("Font already imported");
            return;
          }

          const fileExt = fileName.substring(fileName.lastIndexOf("."));
          const fontFamily = null || fileName.replace(fileExt, "");

          // Read file directly (no fetch needed!)
          const reader = new FileReader();
          const fontData = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file); // Direct file read, not fetch
          });
          const fontFormat = getFormatFromExtension(fileExt);
          // Set the font family to the newly imported font

          // Store in IndexedDB
          await db.collection("fonts").add({
            id: fontFamily,
            fontFamily: fontFamily,
            fontData: fontData, // Complete font data from file
            fontFormat: fontFormat,
            timestamp: new Date().getTime(),
            fileName: fileName, // Store original filename
            fileSize: file.size, // Store size for info
          });

          console.log(
            `Font ${fontFamily} stored successfully from uploaded file`,
          );
          localStorage.setItem(
            "fontNames",
            JSON.stringify([...fontNames, fontFamily]),
          );

          const style = document.createElement("style");
          const fontCSS = `
        @font-face {
          font-family: '${fontFamily}';
          src: url('${fontData}') format('${fontFormat}');
          font-display: swap;
        }
      `;
          style.textContent = fontCSS;
          document.head.appendChild(style);
          this.fontFamily = fontFamily;
          defaultFonts.push(fontFamily);
          this.fonts = [];
          this.formatProperties();
          requestDraw();
        } catch (error) {
          console.error("Error storing font:", error);
        }
      });

    super.similarPropties();
    // Bind inputs
    propertiesBar
      .querySelectorAll(
        "input, textarea, select, button#shadowToggle,button#iterateToggle",
      )
      .forEach((el) => {
        // Shadow toggle button
        if (el.id === "shadowToggle") {
          el.addEventListener("click", () => {
            this.shadow = !this.shadow;
            this.formatProperties();
            requestDraw();
          });
          return;
        }
        if (el.id === "iterateToggle") {
          el.addEventListener("click", () => {
            this.iterated = !this.iterated;
            this.formatProperties();
            requestDraw();
          });
          return;
        }

        // Normal inputs/selects
        el.addEventListener("input", (e) => {
          this.changeProperties(e);
        });
      });
    draw();
    // Optional: outline toggle is inside similarProptiesOutput(), keep existing handler if you have one.
  }
  changeProperties(e) {
    const name = e.target.name;

    if (name === "text") this.text = e.target.value;

    if (name === "x") this.x = backValues(Number(e.target.value) || 0);
    if (name === "y") this.y = backValues(Number(e.target.value) || 0);

    // Width/Height: if you want them editable, you can scale text box;
    // for now we set the values directly (matches your existing props panel pattern).
    if (name === "width") {
      const scale =
        (this.fontSize * backValues(Number(e.target.value) || 0)) / this.width;
      this.fontSize = scale > 0 ? scale : 1;
    }
    if (name === "iterateAllign") {
      this.iterateAllign = e.target.value;
    }
    if (name === "height") {
      const scale =
        (this.fontSize * backValues(Number(e.target.value) || 0)) / this.height;
      this.fontSize = scale > 0 ? scale : 1;
    }

    if (name === "angle")
      this.angle = radToDeg(Number(e.target.value) || 0, "rad");
    if (name === "opacity")
      this.opacity = Math.max(0, Math.min(100, Number(e.target.value) || 0));

    if (name === "fontSize") {
      this.fontSize = backValues(Math.max(1, Number(e.target.value) || 1));
      this.lineHeight = backValues(Math.max(1, Number(e.target.value) || 1));
    }
    if (name === "lineHeight")
      this.lineHeight = backValues(Math.max(1, Number(e.target.value) || 1));
    if (name === "textarea") {
      this.textArea = e.target.value;
    }
    if (name === "formatIterated") {
      this.formatIterated = e.target.value;
    }
    if (name === "fontFamily") {
      this.fonts = allFonts.filter((font) =>
        font.toLowerCase().includes(e.target.value.toLowerCase()),
      );

      if (this.fonts.length > 0) {
        document.getElementById("fonts").style.display = "flex";
        document.getElementById("fonts").innerHTML = this.fonts
          .map(
            (font) => `
    <div class="dropdown-item">${font}</div>
  `,
          )
          .join("");
        document.querySelectorAll(".dropdown-item").forEach((div) => {
          div.addEventListener("click", async () => {
            this.fontFamily = div.textContent;
            if (!defaultFonts.includes(this.fontFamily)) {
              const result = await db
                .collection("fonts")
                .doc({ id: this.fontFamily })
                .get();
              if (result && result.fontData) {
                // Create dynamic @font-face rule
                const style = document.createElement("style");
                const fontCSS = `
        @font-face {
          font-family: '${result.fontFamily}';
          src: url('${result.fontData}') format('${result.fontFormat}');
          font-display: swap;
        }
      `;
                style.textContent = fontCSS;
                document.head.appendChild(style);

                console.log(`Font ${fontFamily} loaded from IndexedDB`);
              } else {
                notify("Font not found in database");
                this.fontFamily = "sans-serif";
              }
              defaultFonts.push(this.fontFamily);
            }
            requestDraw();
            this.fonts = [];
            this.formatProperties();
          });
        });
      } else document.getElementById("fonts").style.display = "flex";
    }

    if (name === "outlineThickness")
      this.outlineThickness = backValues(Number(e.target.value) || 0);
    if (name === "lineDashWidth") {
      this.lineDashWidth = backValues(Number(e.target.value) || 0);
    }

    if (name === "lineDashSpacing") {
      this.lineDashSpacing = backValues(Number(e.target.value) || 0);
    }

    if (this.outlineType.length !== 0) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    }
    if (name === "fontStyle") this.fontStyle = e.target.value;
    if (name === "textAllign") this.textAllign = e.target.value;
    if (name === "outlineColor") {
      this.outlineColor = e.target.value;
    }
    if (name === "bgColor") {
      this.color[0] = e.target.value;
    }

    if (name === "colorDeg") {
      this.colorDeg = radToDeg(Number(e.target.value) || 0, "rad");
    }
    // Shadow fields
    if (name === "shadowColor") this.shadowStyle.color = e.target.value;
    if (name === "shadowBlur")
      this.shadowStyle.blur = Number(e.target.value) || 0;
    if (name === "shadowOffsetX")
      this.shadowStyle.offsetX = Number(e.target.value) || 0;
    if (name === "shadowOffsetY")
      this.shadowStyle.offsetY = Number(e.target.value) || 0;

    requestDraw();
  }

  doubleClicked(mouse) {
    const padding = () => adapt(5);
    const rect = reverseMousePos(canvas, {
      x: this.whereToSnap().pos.x - padding() * 2,
      y: this.whereToSnap().pos.y - padding() * 2,
    });

    this.isDoubleClicked = true;
    // Create or reuse a hidden measuring element
    if (!this.measurer) {
      this.measurer = document.createElement("div");
      this.measurer.style.position = "absolute";
      this.measurer.style.visibility = "hidden";
      this.measurer.style.height = "auto";
      this.measurer.style.width = "auto";
      this.measurer.style.whiteSpace = "pre-wrap";
      this.measurer.style.wordWrap = "break-word";
      document.body.appendChild(this.measurer);
    }

    // Copy all text styles to measurer
    this.measurer.style.fontSize = `${this.fontSize / scaleRatio}px`;
    this.measurer.style.fontFamily = this.fontFamily;
    this.measurer.style.fontStyle = this.fontStyle;
    this.measurer.style.fontWeight = this.fontStyle;
    this.measurer.style.lineHeight = `${this.lineHeight / scaleRatio}px`;
    this.measurer.style.padding = `${adapt(5)}px`;
    this.measurer.style.boxSizing = "border-box";

    // Measure text
    this.measurer.textContent = this.text || " ";
    const measuredWidth = this.measurer.offsetWidth;
    const measuredHeight = this.measurer.offsetHeight;

    // Setup textarea
    this.textPlace.value = this.text.trim();
    this.textPlace.classList.add("textArea");
    this.textPlace.style.position = "absolute";
    this.textPlace.style.left = `${rect.x}px`;
    this.textPlace.style.top = `${rect.y}px`;
    this.textPlace.style.border = `${thresholds.slineWidth() / scaleRatio}px dashed ${thresholds.sColor}`;
    this.textPlace.style.fontSize = `${this.fontSize / scaleRatio}px`;
    this.textPlace.style.fontFamily = this.fontFamily;
    this.textPlace.style.fontStyle = this.fontStyle;
    this.textPlace.style.fontWeight = this.fontWeight;
    this.textPlace.style.textAlign = this.textAllign;
    this.textPlace.style.lineHeight = `${this.lineHeight / scaleRatio}px`;
    this.textPlace.style.color = this.color[0];
    this.textPlace.style.boxSizing = "border-box";
    this.textPlace.style.padding = `${padding()}px`;
    this.textPlace.style.overflow = "hidden";
    this.textPlace.style.resize = "none";
    this.textPlace.style.whiteSpace = "pre-wrap";
    this.textPlace.style.wordWrap = "break-word";

    // Set exact width based on measurement
    this.textPlace.style.width = `${Math.max(measuredWidth, adapt(10)) + adapt(2)}px`;
    this.textPlace.style.height = `${Math.max(measuredHeight, adapt(5)) + adapt(2)}px`;

    canvass.appendChild(this.textPlace);
    this.textPlace.focus();
    this.textPlace.select();

    // Input handler using measurer
    if (this.inputHandler) {
      this.textPlace.removeEventListener("input", this.inputHandler);
    }

    this.inputHandler = (e) => {
      this.text = e.target.value;

      // Update measurer with new text
      this.measurer.textContent = this.text || " ";

      // Get dimensions from measurer (not the textarea)
      const newWidth = this.measurer.offsetWidth;
      const newHeight = this.measurer.offsetHeight;

      // Apply to textarea
      this.textPlace.style.width = `${Math.max(newWidth, adapt(10)) + adapt(2)}px`;
      this.textPlace.style.height = `${Math.max(newHeight, adapt(5)) + adapt(2)}px`;
      this.formatProperties();
      requestDraw();
    };

    this.textPlace.addEventListener("input", this.inputHandler);
  }
  backToDefault() {
    this.fontSize = this.originalFontSize;
    this.text = this.originalText;
    this.x = this.originalPosition.x;
    this.y = this.originalPosition.y;
  }
  drawIteratedImage(i) {
    const texts = this.textArea
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (i === 0) {
      this.maintainedWidth = this.width;
      this.originalText = this.text;
      this.originalFontSize = this.fontSize;
      this.originalPosition = { x: this.x, y: this.y };
    }
    if (this.iterated && i < texts.length) {
      ctx.font = `${this.fontStyle} ${this.fontSize}px ${this.fontFamily}`;
      ctx.textAlign = this.textAllign;
      ctx.textBaseline = "alphabetic";
      if (this.formatIterated === "shrinkToFit") {
        const textWidth = ctx.measureText(texts[i]).width;
        if (textWidth > this.maintainedWidth) {
          const scale = this.maintainedWidth / textWidth;
          this.fontSize *= scale;
          this.text = texts[i];
        }
      } else if (this.formatIterated === "Fit") {
        const textWidth = ctx.measureText(texts[i]).width;
        const scale = this.maintainedWidth / textWidth;
        this.fontSize *= scale > 0 ? scale : 1;
        this.text = texts[i];
      } else if (this.formatIterated === "atWhiteSpace") {
        const words = texts[i].split(" ");
        let line = "";
        let result = "";

        for (let t = 0; t < words.length; t++) {
          const testLine = line + words[t] + " ";
          const testWidth = ctx.measureText(testLine).width;

          if (testWidth > this.maintainedWidth && t > 0) {
            result += line.trim() + "\n";
            line = words[t] + " ";
          } else {
            line = testLine;
          }
        }

        result += line.trim();
        this.text = result;
      } else if (this.formatIterated === "createNewLine") {
        const words = texts[i].split("");

        let line = "";
        let result = "";

        for (let t = 0; t < words.length; t++) {
          const testLine = line + words[t];
          const testWidth = ctx.measureText(testLine).width;
          if (testWidth > this.maintainedWidth && t > 0) {
            result += line.trim() + "\n";
            line = words[t];
          } else {
            line = testLine;
          }
        }
        result += line.trim();
        this.text = result;
      } else {
        this.text = texts[i];
      }

      if (this.iterateAllign === "center") {
        this.x =
          this.originalPosition.x +
          this.maintainedWidth / 2 -
          ctx.measureText(this.text).width / 2;
      } else if (this.iterateAllign === "right") {
        this.x =
          this.originalPosition.x +
          this.maintainedWidth -
          ctx.measureText(this.text).width;
      } else {
        this.x = this.originalPosition.x;
      }
    }
  }
  whereToSnap() {
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
      this.x = value;
    } else if (type === "y") {
      this.y = value;
    } else {
      this.fontSize *= value;
    }
  }
  moveClip(x, y) {
    this.x += x;
    this.y += y;
  }
}
function getFormatFromExtension(ext) {
  const formats = {
    ".ttf": "truetype",
    ".otf": "opentype",
    ".woff": "woff",
    ".woff2": "woff2",
  };
  return formats[ext.toLowerCase()] || "truetype";
}
function getFontFormat(url) {
  if (url.endsWith(".woff2")) return "woff2";
  if (url.endsWith(".woff")) return "woff";
  if (url.endsWith(".ttf")) return "truetype";
  if (url.endsWith(".otf")) return "opentype";
  return "truetype";
}

class Images extends Formats {
  constructor(x, y, image, width, aspectRatio, originalFile, fileName) {
    super();
    this.x = x;
    this.type = "image";
    this.y = y;
    this.width = width;
    this.fileName = [fileName];
    this.aspectRatio = aspectRatio;
    this.height = this.width * this.aspectRatio;
    this.image = image;
    this.selectedArea = null;
    this.originalFiles = [originalFile];
    this.selectedFile = originalFile;
    this.maintainApect = false;
    this.clipped = "none";
    this.formatIterated = "maintainSize";
    this.isConverted = false;
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
      this.image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
    );
    ctx.closePath();
    ctx.restore();
    if (selectedObj === this || multipleSelectArr.includes(this)) {
      ctx.beginPath();
      ctx.lineWidth = thresholds.slineWidth();
      ctx.strokeStyle = thresholds.sColor;
      ctx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);
      ctx.strokeRect(
        -this.width / 2 - thresholds.sWidth() / 2,
        -this.height / 2 - thresholds.sWidth() / 2,
        this.width + thresholds.sWidth(),
        this.height + thresholds.sWidth(),
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
      thresholds.threshold(),
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
    return clone;
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
        <span class="field-label">Opacity</span>
        <input type="number" name="opacity" value="${this.opacity}">
      </label>

      <label class="field">
        <span class="field-label">Rotation</span>
        <input type="number" name="angle" value="${radToDeg(this.angle, "deg")}">
      </label>
    </div>

    <div  style=" display:flex;flex-direction:column; gap:1rem">
      <button class="imageb" id="maintainAspect">Aspect Ratio</button>
    </div>
  </section>

  <section class="coord-section">
    <h3>All Images</h3>

    <div class="preview">
      <img src="${this.image.src}" alt="Selected preview">
    </div>

    <section class="iteratedsec">
      ${this.originalFiles
        .map(
          (file, i) => `
            <div ${
              this.selectedFile === this.originalFiles[i]
                ? "class='selected'"
                : ""
            }>
              <p>${this.fileName[i]}</p>
              <button class="change">
                Change
                <input type="file">
              </button>
              <button class="del">D</button>
            </div>
          `,
        )
        .join("")}
    </section>
    <button class="image-file">
      <p>Add Images</p>
      <input type="file" multiple accept=".png,.jpeg,.jpg,.svg,.jfif" name="iteratedFiles">
    </button>
    <label class="uniform-div" style="margin-top:1rem">
      <span>Format Iterated</span>
                <select name="formatIterated" class="formatIterated">
    <option value="maintainHeight" ${this.formatIterated === "maintainHeight" ? "selected" : ""}>Maintain Height</option>
    <option value="maintainWidth" ${this.formatIterated === "maintainWidth" ? "selected" : ""}>Maintain Width</option>
    <option value="maintainSize" ${this.formatIterated === "maintainSize" ? "selected" : ""} >Maintain Size</option>
  </select>
    </label>

  </section>
`;
    document
      .querySelector(".formatIterated")
      .addEventListener("change", (e) => {
        this.formatIterated = e.target.value;
        this.formatProperties();
      });
    document.querySelectorAll(".iteratedsec > div").forEach((div, i) => {
      div.addEventListener("click", async () => {
        const imageFiles = await db
          .collection(`img${formerName}`)
          .doc({ id: this.originalFiles[i] })
          .get();
        const imageP = imageFiles.image;
        URL.revokeObjectURL(this.image.url);
        let newImg = new Image();
        newImg.src = imageP;
        await new Promise((resolve, reject) => {
          newImg.onload = () => {
            this.image = newImg;
            this.selectedFile = this.originalFiles[i];
            resolve(true);
          };
        });
        requestDraw();
        this.formatProperties();
      });

      div.querySelector(".change").addEventListener("change", async (e) => {
        const loader = new LoaderManager(1); // Set max items to 10
        loader.createLoader();
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          this.fileName[i] = file.name;
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
            await db
              .collection(`img${formerName}`)
              .doc({ id: this.originalFiles[i] })
              .update({
                image: reader.result,
                entryDate: new Date().getTime(),
              });
            if (this.selectedFile === this.originalFiles[i]) {
              this.image = img;
            }
            loader.incrementOriginalState();
            requestDraw();
            this.formatProperties();

            if (this.selectedFile !== this.originalFiles[i]) {
              URL.revokeObjectURL(url);
            }
          };
        };
      });
      div.querySelector(".del").addEventListener("click", async () => {
        if (this.originalFiles.length > 1) {
          const deleteImage = this.originalFiles[i];
          await db
            .collection(`img${formerName}`)
            .doc({ id: deleteImage })
            .delete();
          this.originalFiles.splice(i, 1);
          if (deleteImage === this.selectedFile) {
            URL.revokeObjectURL(this.image.url);
            const newIndex =
              i >= this.originalFiles.length
                ? this.originalFiles.length - 1
                : i;
            const newImageFiles = await db
              .collection(`img${formerName}`)
              .doc({ id: this.originalFiles[newIndex] })
              .get();
            const newImage = newImageFiles.image;
            await new Promise((resolve, reject) => {
              const img = new Image();
              img.src = newImage;
              img.onload = () => {
                this.image = img;
                this.selectedFile = this.originalFiles[newIndex];
                resolve(true);
              };
            });
          }
          requestDraw();
          this.formatProperties();
        }
      });
    });

    document.getElementById("maintainAspect").addEventListener("click", () => {
      this.height = this.aspectRatio * this.width;
      requestDraw();
    });

    propertiesBar.querySelectorAll("input").forEach((input) => {
      input.addEventListener(
        "input",
        (e) => setTimeout(this.changeProperties(e)),
        1000,
      );
    });
    requestDraw();
  }
  async changeProperties(e) {
    const name = e.target.name;

    if (name === "angle") {
      this.angle = radToDeg(Number(e.target.value) || 0, "rad");
    }

    if (e.target.type === "number") {
      let value = backValues(Number(e.target.value) || 0);
      value = value <= 0 ? 0 : value;
      if (!isNaN(value) && value !== null) {
        if (name === "opacity") {
          this.opacity = Number(e.target.value) || 0;
        }

        if (name !== "opacity") {
          this[name] = value;
        }
      }
    }

    if (name === "iteratedFiles") {
      const loader = new LoaderManager(e.target.files.length); // Set max items to the number of selected files
      loader.createLoader();
        await new Promise((resolve) => setTimeout(resolve, 50));
      // Option 1: Use for...of loop (recommended)
      const files = Array.from(e.target.files);

      for ( let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        await new Promise((resolve, reject) => {
          img.onload = () => {
            this.fileName.push(file.name);
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = async () => {
              const imageID = crypto.randomUUID();
              await db.collection(`img${formerName}`).add({
                id: imageID,
                image: reader.result,
                entryDate: (new Date()).getTime(),
              });
              this.originalFiles.push(imageID);
              loader.incrementOriginalState();
                  if (i % 10 === 0) {
await new Promise(resolve => requestAnimationFrame(resolve))
}
              this.formatProperties();
              URL.revokeObjectURL(url);
              resolve(true);
            };
          };
        });
      }
    }

    requestDraw();
  }
  async backToDefault() {
    this.width = this.originalWidth;
    this.height = this.originalHeight;
    URL.revokeObjectURL(this.image.url);
    const imageIterateFile = await db
      .collection(`img${formerName}`)
      .doc({ id: this.selectedFile })
      .get();
    let imageIterate = imageIterateFile.image;
    let img = new Image();
    img.src = imageIterate;
    await new Promise((resolve, reject) => {
      img.onload = () => {
        this.image = img;
        resolve(true);
      };
    });
  }
  async drawIteratedImage(i) {
    if (this.originalFiles.length >= i) {
      if (i === 0) {
        this.originalWidth = this.width;
        this.originalHeight = this.height;
      }
      URL.revokeObjectURL(this.image.url);
      const imageIterateFile = await db
        .collection(`img${formerName}`)
        .doc({ id: this.originalFiles[i] })
        .get();
      let imageIterate = imageIterateFile.image;
      let img = new Image();
      img.src = imageIterate;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          this.image = img;
          resolve(true);
        };
      });

      if (this.formatIterated === "maintainHeight") {
        const scale = this.image.width / this.image.height;

        this.height = this.originalHeight;
        this.width = this.originalWidth * scale;
        console.log(scale, i);
      } else if (this.formatIterated === "maintainWidth") {
        const scale = this.image.width / this.image.height;

        this.width = this.originalWidth;
        this.height = this.originalHeight / scale;
      } else {
        this.width = this.originalWidth;
        this.height = this.originalHeight;
      }
    } else {
      URL.revokeObjectURL(this.image.url);
      const imageIterateFile = await db
        .collection(`img${formerName}`)
        .doc({ id: this.selectedFile })
        .get();
      let imageIterate = imageIterateFile.image;
      let img = new Image();
      img.src = imageIterate;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          this.image = img;
          resolve(true);
        };
      });
    }
  }
  doubleClicked(mouse) {
    isRotatingObject = true;
    this.isDoubleClicked = this.isDoubleClicked ? false : true;
    return true;
  }
  whereToSnap() {
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
      this.x = value;
    } else if (type === "y") {
      this.y = value;
    } else if (type === "scaleX") {
      this.width *= value;
    } else if (type === "scaleY") {
      this.height *= value;
    }
  }
}
class Group extends Formats {
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
  addObject() {
    this.minX = Math.min(...this.list.map((l) => l.whereToSnap().x[0]));
    this.maxX = Math.max(...this.list.map((l) => l.whereToSnap().x[2]));
    this.minY = Math.min(...this.list.map((l) => l.whereToSnap().y[0]));
    this.maxY = Math.max(...this.list.map((l) => l.whereToSnap().y[2]));
    this.x = (this.minX + this.maxX) / 2;
    this.y = (this.minY + this.maxY) / 2;
    ctx.save();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(this.scaleX, this.scaleY);
    this.list.forEach((obj) => {
      ctx.save();
      ctx.translate(-this.x, -this.y);
      obj.addObject();
      ctx.restore();
    });
    if (selectedObj === this || multipleSelectArr.includes(this)) {
      ctx.beginPath();
      ctx.lineWidth = thresholds.slineWidth();
      ctx.strokeStyle = thresholds.sColor;
      ctx.setLineDash([
        thresholds.sLineDashWidth(),
        thresholds.sLineDashSpacing(),
      ]);

      ctx.strokeRect(
        this.minX - this.x,
        this.minY - this.y,
        this.maxX - this.minX,
        this.maxY - this.minY,
      );
      ctx.closePath();

      ctx.beginPath();
      ctx.fillStyle = thresholds.normalModeColor;
      ctx.fillRect(
        this.maxX - this.x - thresholds.normalMode() / 2,
        this.maxY - this.y - thresholds.normalMode() / 2,
        thresholds.normalMode(),
        thresholds.normalMode(),
      );
      ctx.closePath();
    }
    ctx.restore();
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
      this.selectedArea = "scale";
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
          l.moveClip(mouse.x - lastMouseX, mouse.y - lastMouseY),
        );
      } else {
        const lastWidth = lastMouseX - this.x;
        const lastHeight = lastMouseY - this.y;

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

          l.changeLocation(this.x + dx * scaleX, "x");
          l.changeLocation(this.y + dy * scaleY, "y");
          l.changeLocation(scaleX, "scaleX");
          l.changeLocation(scaleY, "scaleY");
        });
      }
    }
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.list = this.list.map((obj) => obj.showClone());
    return clone;
  }
  doubleClicked(mouse) {
    isRotatingObject = true;
    this.isDoubleClicked = this.isDoubleClicked ? false : true;
    return true;
  }
  formatProperties() {
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
      this.list.forEach((l) => objects.push(l));
      const index = objects.indexOf(this);
      objects.splice(index, 1);
      selectedObj = null;
      Tools("moveTool");
    });
    super.similarPropties();
    propertiesBar
      .querySelectorAll("input[type='text'],input[type='number']")
      .forEach((input) => {
        input.addEventListener("input", (e) => this.changeProperties(e));
      });
    propertiesBar.querySelectorAll("input[type='color']").forEach((input) => {
      input.addEventListener("change", (e) => this.changeProperties(e));
    });
    requestDraw();
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
    requestDraw();
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
  }
  moveClip(x, y) {
    this.x += x;
    this.y += y;
    if (this.list.length > 0) this.list.forEach((list) => list.moveClip(x, y));
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

        l.changeLocation(this.x + dx * value, "x");
        l.changeLocation(value, "scaleX");
      });
    } else if (type === "scaleY") {
      this.list.forEach((l) => {
        // 1. Get distance from center
        const pos = l.whereToSnap().pos;
        const dy = pos.y - this.y;

        l.changeLocation(this.y + dy * value, "y");
        l.changeLocation(value, "scaleY");
      });
    }
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
    if (pen !== null && objects[objects.length - 1].type === "line") {
      pen = objects[objects.length - 1];
    } else selectedObj = objects[objects.length - 1];
    requestDraw();
  }
}

function redo() {
  if (redoObject.length > 0) {
    const redoState = redoObject.pop();
    undoObject.push(redoState);
    objects = cloneObject(redoState);
    if (pen !== null && objects[objects.length - 1].type === "line") {
      pen = objects[objects.length - 1];
    } else selectedObj = objects[objects.length - 1];
    requestDraw();
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
  requestDraw();
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
  generateInfo.renderPage = e.target.value;
  switch (generateInfo.renderPage) {
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
      generateInfo.renderPage = "custom";
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
    if (generateInfo.renderPage === "custom") {
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
async function addImage(e) {
  canvas.style.cursor = "wait";
  const file = e.target.files[0];
  if (!file) return;
  const loader = new LoaderManager(1); // Set max items to the number of selected files
  loader.createLoader();
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await new Promise((resolve) => {
    img.onload = () => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.addEventListener("load", async () => {
        const imageID = crypto.randomUUID();
        await db.collection(`img${formerName}`).add({
          id: imageID,
          image: reader.result,
          entryDate: new Date().getTime(),
        });
        drawingImage = {
          image: img,
          originalFile: imageID,
          aspectRatio: img.height / img.width,
          fileName: file.name,
        };
        resolve(true);
      });
    };
  });
  loader.incrementOriginalState();
  canvas.style.cursor = "crosshair";
  isDrawing = "image";
}
// For Saving and Retrieving
async function importLoaded(jsonData, shouldCanvas = true) {
  const { canvasItems, revivableItems } = jsonData.reduce(
    (acc, data) => {
      if (data.type === "canvas") {
        acc.canvasItems.push(data);
      } else {
        acc.revivableItems.push(data);
      }
      return acc;
    },
    { canvasItems: [], revivableItems: [] },
  );

  if (canvasItems.length > 0 && shouldCanvas) {
    measurement = canvasItems[0].measurement;
    whatsMeasured = canvasItems[0].whatsMeasured;
    canvasSize();
  }

  const revived = await Promise.all(
    revivableItems.map((item) => reviveObjects(item)),
  );
  objects.push(...revived);
  requestDraw();
  await saveToFile();
}
async function reviveObjects(objData) {
  let instance;

  switch (objData.type) {
    case "rectangle":
      instance = new Rectangle();
      break;
    case "ellipse":
      instance = new Ellipse();
      break;
    case "polygon":
      instance = new Polygon();
      break;
    case "line":
      instance = new Line();
      break;
    case "text":
      instance = new TextBox();
      break;
    case "image":
      instance = new Images();
      break;
    case "group":
      instance = new Group();
      break;
    default:
      console.warn(`Unknown type: ${objData.type}`);
      return null;
  }

  // ✅ Handle group children
  if (objData.type === "group" && objData.list) {
    objData.list = await Promise.all(
      objData.list.map((item) => reviveObjects(item)),
    );
  }
  if (objData.type === "image") {
    if (objData.isConverted) {
      for (let i = 0; i < objData.originalFiles.length; i++) {
        const imageID = crypto.randomUUID();
        await db.collection(`img${formerName}`).add({
          id: imageID,
          image: objData.originalFiles[i],
          entryDate: new Date().getTime(),
        });
        objData.originalFiles[i] = imageID;
      }
      objData.isConverted = false;
    }
    const revivedImageFile = await db
      .collection(`img${formerName}`)
      .limit(1)
      .get();
    const revivedImage = revivedImageFile[0].image;
    const img = new Image();
    img.src = revivedImage;
    await new Promise((resolve, reject) => {
      img.onload = () => {
        objData.image = img;
        resolve(true);
      };
    });
  }
  if (objData.type === "text") {
    objData.textPlace = document.createElement("textarea");
    objData.measurer = false;
    if (!defaultFonts.includes(objData.fontFamily)) {
      if (newFonts.includes(objData.fontFamily)) {
        const result = await db
          .collection("fonts")
          .doc({ id: this.fontFamily })
          .get();
        if (result && result.fontData) {
          // Create dynamic @font-face rule
          const style = document.createElement("style");
          const fontCSS = `
        @font-face {
          font-family: '${result.fontFamily}';
          src: url('${result.fontData}') format('${result.fontFormat}');
          font-display: swap;
        }
      `;
          style.textContent = fontCSS;
          document.head.appendChild(style);
        }
      } else {
        objData.fontFamily = "sans-serif";
      }
    }
  }

  // ✅ Handle clips
  if (objData.clips && objData.clips.length > 0) {
    objData.clips = await Promise.all(
      objData.clips.map(async (clip) => {
        // ← Add async
        const reviveClip = await reviveObjects(clip); // ← Add await
        reviveClip.clipper = objData.id;
        return reviveClip;
      }),
    );
  }

  // ✅ Handle images properly
  // if (objData.type === "image" && objData.originalFiles?.length) {
  //   const loadedImages = await Promise.all(
  //     objData.originalFiles.map((src) => {
  //       return new Promise((resolve) => {
  //         const img = new Image();
  //         img.src = src;
  //         img.onload = () => resolve(img);
  //       });
  //     }),
  //   );

  //   objData.iteratedFiles = loadedImages;
  //   objData.imagePreview = loadedImages[0]?.src || "";
  // }

  Object.assign(instance, objData);
  if (objData.type === "text") textBoxes.push(instance);
  if (objData.type === "image") images.push(instance);
  return instance;
}
document
  .getElementById("retrieve-file")
  .addEventListener("change", (e) => retrieveFile(e));
async function retrieveFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = async () => {
    const jsonData = JSON.parse(reader.result);
    importLoaded(jsonData, false);
  };
}
let saveTimeout;

function autoSave() {
  // Clear previous timeout to avoid multiple saves
  clearTimeout(saveTimeout);

  // Save after 2 seconds of no changes (debouncing)
  saveTimeout = setTimeout(async () => {
    await saveToFile();
    console.log("✅ Autosaved at:", new Date().toLocaleTimeString());
    autoSave();
  }, 2000);
}
document.querySelector(".save").addEventListener("click", async () => {
  await saveToFile();
  notify("Saved");
});
async function saveToFile() {
  let allData = [
    {
      type: "canvas",
      measurement: measurement,
      whatsMeasured: whatsMeasured,
      backgroundImage: canvas.toDataURL(),
    },
    ...objects,
  ];
  allData = JSON.parse(JSON.stringify(allData));

  const names = JSON.parse(localStorage.getItem("project-names")) || [];
  try {
    if (names.includes(formerName)) {
      await db.collection("projects").doc({ name: formerName }).set({
        name: formerName,
        object: allData,
        entryDate: new Date().getTime(),
      });
    } else {
      await db.collection("projects").add({
        name: formerName,
        object: allData,
        entryDate: new Date().getTime(),
      });
      localStorage.setItem(
        "project-names",
        JSON.stringify([...names, formerName]),
      );
    }
  } catch (err) {
    console.log(err);
    notify("Error Saving");
  }

  // const data = JSON.stringify(allData);

  // const blob = new Blob([data], { type: "application/json" });

  // const a = document.createElement("a");
  // a.href = URL.createObjectURL(blob);
  // a.download = `${projectName.value}.json`;
  // a.click();
}

// fetch("project.json")
//   .then(res => res.json())
//   .then(async data => {
//     const revived = await Promise.all(
//       data.map(item => reviveObjects(item))
//     );

//     objects.push(...revived);
//     requestDraw();
//   });
// End
async function Tools(tool) {
  document.querySelectorAll(".leftSidebar button").forEach((button) => {
    if (pen !== null && pen.points.length > 0) {
      if (button.id !== "addLine") button.classList.remove("active");
      else {
        button.classList.add("active");
      }
    } else {
      if (button.id === tool) {
        button.classList.add("active");
      } else button.classList.remove("active");
    }
  });
  if (pen !== null && pen.points.length > 0) return;
  isDrawing = null;
  multipleSelect = false;
  multipleSelectArr = [];
  startPanning = false;
  duplicateClicked = false;
  cloneObj = null;
  pen = null;
  propertiesBar.innerHTML = "";
  switch (tool) {
    case "moveTool":
      canvas.style.cursor = "default";
      break;

    case "multipleSelection":
      selectedObj = null;
      canvas.style.cursor = "default";
      multipleSelect = true;
      break;
    case "panTool":
      canvas.style.cursor = "grab";
      selectedObj = null;
      startPanning = !startPanning;

      break;
    case "addRectangle":
      canvas.style.cursor = "crosshair";
      selectedObj = null;
      isDrawing = "rect";
      break;

    case "addEllipse":
      canvas.style.cursor = "crosshair";
      selectedObj = null;
      isDrawing = "ellipse";
      break;

    case "addLine":
      selectedObj = null;
      canvas.style.cursor = "crosshair";
      const line = new Line();
      pen = line;
      objects.push(line);
      requestDraw();
      break;

    case "addPolygon":
      selectedObj = null;
      canvas.style.cursor = "crosshair";
      selectedObj = null;
      isDrawing = "polygon";
      break;

    case "addTextbox":
      selectedObj = null;
      canvas.style.cursor = "inherit";
      isDrawing = "text";
      break;

    case "zoom":
      selectedObj = null;
      propertiesBar.innerHTML = `
  <div style="display:flex;flex-direction:row;align-items:center; justify-content:center; gap:1rem;border:none">
    <button class="zoomin"><img src="imagess/zoom-in.svg"></button>
    <button class="zoomout"><img src="imagess/zoom-out.svg"></button>
    <button class="fitToPage imageb">Fit To Page</button>
  </div>
  `;

      isDrawing = "zoom";
      canvas.style.cursor = "zoom-in";

      const zoomInBtn = propertiesBar.querySelector(".zoomin");
      const zoomOutBtn = propertiesBar.querySelector(".zoomout");
      const fitBtn = propertiesBar.querySelector(".fitToPage");

      let zoomInterval;

      function zoomIn() {
        scale += 0.01 * 0.9 ** (scale * 10 - 10);
        requestDraw();
      }

      function zoomOut() {
        scale -= 0.01 * 0.9 ** (scale * 10 - 10);
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
        zoomToRect({
          x: (canvas.width - measurement.width) / 2,
          y: (canvas.height - measurement.height) / 2,
          width: measurement.width,
          height: measurement.height,
        });
        requestDraw();
        Tools("zoom");
      });

      requestDraw();
      break;

    case "duplicate":
      duplicateClicked = !duplicateClicked;
      if (duplicateClicked) {
        if (selectedObj) {
          cloneObj = selectedObj.showClone();
          cloneObj.changeLocation(lastMouseX, "x");
          cloneObj.changeLocation(lastMouseY, "y");
        } else {
          notify("Please Select An Object");
          duplicateClicked = false;
          Tools("moveTool");
        }
      } else {
        cloneObj = null;
      }
      break;

    case "delete":
      if (selectedObj) {
        let index = objects.indexOf(selectedObj);
        if (objects[selectedObj].type === "image") {
          await db
            .collection(`img${formerName}`)
            .doc({ id: objects[selectedObj] });
        }
        objects.splice(index, 1);

        if (selectedObj.clipped === "clipped") {
          const clipIndex = objects.find(
            (obj) => obj.id === selectedObj.clipper,
          );
          if (clipIndex) {
            const selectedIndex = clipIndex.clips.indexOf(selectedObj);
            clipIndex.clips.splice(selectedIndex, 1);
          }
        }
        selectedObj = null;
        propertiesBar.innerHTML = "";
        requestDraw();
      }
      break;
    case "add-image":
      return;

    case "pageTo":
      propertiesBar.innerHTML = `
  <section>
    <button class="bringFront imageb">Bring To Front</button>
    <button class="sendBack imageb">Send To Back</button>
    <button class="pageUp imageb">Page Up</button>
    <button class="pageDown imageb">Page Down</button>
  </section>
  `;
      document.querySelector(".bringFront").addEventListener("click", () => {
        if (selectedObj) bringToFront(selectedObj);
      });
      document.querySelector(".sendBack").addEventListener("click", () => {
        if (selectedObj) sendToBack(selectedObj);
      });
      document.querySelector(".pageUp").addEventListener("click", () => {
        if (selectedObj) pageUp(selectedObj);
      });
      document.querySelector(".pageDown").addEventListener("click", () => {
        if (selectedObj) pageDown(selectedObj);
      });

      break;

    default:
      console.log("Unknown tool:", tool);
      break;
  }
  requestDraw();
}

function flip(value) {
  if (selectedObj) {
    if (value === "x") {
      selectedObj.scaleX *= -1;
    } else selectedObj.scaleY *= -1;
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
    requestDraw();
  }
  if (multipleSelect && multipleSelectArr.length > 0) {
    if (value === "x") {
      multipleSelectArr.forEach((obj) => (obj.scaleX *= -1));
    } else {
      multipleSelectArr.forEach((obj) => (obj.scaleY *= -1));
    }
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
    requestDraw();
  }
}
document.querySelector(".generateButton").addEventListener("click", () => {
  document.querySelector(".generate").style.display = "flex";
  const canvasDiv = canvassDiv.getBoundingClientRect();
  generateInfo.renderWidth = canvasDiv.width;
  generateInfo.renderHeight = canvasDiv.height;
  document.getElementById("renderWidth").value = changeValues(
    generateInfo.renderWidth,
  );
  document.getElementById("renderHeight").value = changeValues(
    generateInfo.renderHeight,
  );
  document.getElementById("renderPage").value = generateInfo.renderPage;
  document.getElementById("noPerRow").value = generateInfo.noPerRow;
  document.getElementById("noPerColumn").value = generateInfo.noPerColumn;
  document.getElementById("spacing").value = changeValues(generateInfo.spacing);
  if (generateInfo.renderPage === "auto") {
    document.getElementById("noPerRow").readOnly = true;
    document.getElementById("noPerColumn").readOnly = true;
    document.getElementById("renderWidth").readOnly = true;
    document.getElementById("renderHeight").readOnly = true;
  }
  document.querySelectorAll(".generate input").forEach((input) => {
    input.addEventListener("input", (e) => {
      if (
        e.target.id === "renderPage" ||
        e.target.id === "noPerRow" ||
        e.target.id === "noPerColumn"
      ) {
        generateInfo[e.target.id] = Number(e.target.value) || 0;
      } else {
        generateInfo[e.target.id] = backValues(Number(e.target.value) || 0);
      }
    });
  });
});

function cancelGenerate() {
  document.querySelector(".generate").style.display = "none";
}

document.querySelector(".saveAsImage").addEventListener("click", saveAsImage);
function canvasSize() {
  scale = 1;
  panX = 0;
  panY = 0;
  requestDraw();
  const canvassRect = canvas.getBoundingClientRect();
  measurement.width = Math.min(thresholds.maxCanvasSize(), measurement.width);
  measurement.height = Math.min(thresholds.maxCanvasSize(), measurement.height);
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
    canvas.width = newWidth;
    canvas.height = newHeight;
  }
  requestAnimationFrame(() => {
    zoomToRect({
      x: (canvas.width - measurement.width) / 2,
      y: (canvas.height - measurement.height) / 2,
      width: measurement.width,
      height: measurement.height,
    });
    requestDraw();
  });
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
function drawingObject(original = false) {
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
    case "image":
      if (original) {
        return new Images(
          start.x,
          start.y,
          drawingImage.image,
          end.x - start.x,
          drawingImage.aspectRatio,
          drawingImage.originalFile,
          drawingImage.fileName,
        );
      }
      return new Images(
        start.x,
        start.y,
        drawingImage.image,
        end.x - start.x,
        drawingImage.aspectRatio,
        null,
        drawingImage.fileName,
      );
  }
}
function bringToFront(selected) {
  if (selected.clipped === "clipped") {
    const clipIndex = objects.find((obj) => obj.id === selected.clipper);
    if (clipIndex) {
      const selectedIndex = clipIndex.clips.indexOf(selected);
      clipIndex.clips.splice(selectedIndex, 1);
      clipIndex.clips.push(selected);
      requestDraw();
    }
  }
  let index = objects.indexOf(selected);
  if (index === -1) return;
  objects.splice(index, 1);
  objects.push(selected);
  requestDraw();
  undoObject.push(cloneObject(objects));
  redoObject.length = 0;
}
function sendToBack(selected) {
  if (selected.clipped === "clipped") {
    const clipIndex = objects.find((obj) => obj.id === selected.clipper);
    if (clipIndex) {
      const selectedIndex = clipIndex.clips.indexOf(selected);
      clipIndex.clips.splice(selectedIndex, 1);
      clipIndex.clips.unshift(selected);
      requestDraw();
    }
  }
  let index = objects.indexOf(selected);
  if (index === -1) return;
  objects.splice(index, 1);
  objects.unshift(selected);
  requestDraw();
  undoObject.push(cloneObject(objects));
  redoObject.length = 0;
}
function pageUp(selected) {
  // Handle clipping reorder FIRST if selected is clipped
  if (selected.clipped === "clipped") {
    const clipParent = objects.find((obj) => obj.id === selected.clipper);
    if (clipParent) {
      const selectedIndex = clipParent.clips.indexOf(selected);
      if (selectedIndex === -1 || selectedIndex >= clipParent.clips.length - 1)
        return;

      [clipParent.clips[selectedIndex], clipParent.clips[selectedIndex + 1]] = [
        clipParent.clips[selectedIndex + 1],
        clipParent.clips[selectedIndex],
      ];

      requestDraw();
    }
  }

  // Reorder in main objects array (for non-clipped or root objects)
  const i = objects.indexOf(selected);
  if (i === -1 || i >= objects.length - 1) return;

  // swap with next
  [objects[i], objects[i + 1]] = [objects[i + 1], objects[i]];
  requestDraw();
  undoObject.push(cloneObject(objects));
  redoObject.length = 0;
}

function pageDown(selected) {
  // Handle clipping reorder FIRST if selected is clipped
  if (selected.clipped === "clipped") {
    const clipParent = objects.find((obj) => obj.id === selected.clipper);
    if (clipParent) {
      const selectedIndex = clipParent.clips.indexOf(selected);
      if (selectedIndex === -1 || selectedIndex === 0) return;

      [clipParent.clips[selectedIndex], clipParent.clips[selectedIndex - 1]] = [
        clipParent.clips[selectedIndex - 1],
        clipParent.clips[selectedIndex],
      ];
      requestDraw();
    }
  }

  // Reorder in main objects array (for non-clipped or root objects)
  const i = objects.indexOf(selected);
  if (i === -1 || i === 0) return;

  // swap with previous
  [objects[i], objects[i - 1]] = [objects[i - 1], objects[i]];
  requestDraw();
  undoObject.push(cloneObject(objects));
  redoObject.length = 0;
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
function adapt(size) {
  if (scaleRatio > 1) {
    return (size / scale) * scaleRatio;
  }
  return size / scale;
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
let toggleHome = "flex";

document.getElementById("home-button").addEventListener("click", () => {
  document.getElementById("home-menu").style.display = toggleHome;
  toggleHome = toggleHome === "flex" ? "none" : "flex";
});

async function saveAsPDF() {
  const container = document.getElementById("generationArea");

  if (generateInfo.renderPage === "auto") {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await html2canvas(container);
      const { jsPDF } = window.jspdf;

      const rect = container.getBoundingClientRect();
      const pdfWidth = rect.width * 0.264583;
      const pdfHeight = rect.height * 0.264583;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "l" : "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(
        dataUrl.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight,
      );
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
      format: generateInfo.renderPage.toLowerCase(),
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
  if (generateInfo.renderPage === "auto") {
    images = element.querySelectorAll("div");
  } else {
    images = element.querySelectorAll("section");
  }
  for (let i = 0; i < images.length; i++) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await html2canvas(images[i]);
      const link = document.createElement("a");
      link.download = `${formerName.replace(/\.json$/i, "")}${i}.png`;
      link.href = dataUrl.toDataURL("image/png");
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

function align(arg) {
  let last;
  let other;
  let value;
  let valid = false;
  if (multipleSelectArr.length > 1) {
    last = multipleSelectArr[multipleSelectArr.length - 1].whereToSnap();
    other = multipleSelectArr.slice(0, -1);
    valid = true;
  } else if (selectedObj) {
    const offsetX = (canvas.width - measurement.width) / 2;
    const offsetY = (canvas.height - measurement.height) / 2;

    last = {
      x: [
        offsetX,
        offsetX + measurement.width / 2,
        offsetX + measurement.width,
      ],
      y: [
        offsetY,
        offsetY + measurement.height / 2,
        offsetY + measurement.height,
      ],
    };
    other = [selectedObj];
    valid = true;
  }
  if (!valid) return;

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
  for (let oth = 0; oth < other.length; oth++) {
    const otherSnap = other[oth].whereToSnap().pos;
    switch (arg) {
      case "left":
        other[oth].changeLocation(value, "x");
        break;
      case "centerX":
        other[oth].changeLocation(value - otherSnap.width / 2, "x");
        break;
      case "right":
        other[oth].changeLocation(value - otherSnap.width, "x");
        break;
      case "top":
        other[oth].changeLocation(value, "y");
        break;
      case "centerY":
        other[oth].changeLocation(value - otherSnap.height / 2, "y");
        break;
      case "bottom":
        other[oth].changeLocation(value - otherSnap.height, "y");
    }
  }
  if (multipleSelectArr.length > 1) multipleSelectFunction();
  requestDraw();
  undoObject.push(cloneObject(objects));
  redoObject.length = 0;
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
    selectedObj = newGroup;
    requestDraw();
    Tools("moveTool");
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
function reverseMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const screenX = evt.x * scale + panX;
  const screenY = evt.y * scale + panY;
  const canvasX = screenX / (canvas.width / rect.width);
  const canvasY = screenY / (canvas.height / rect.height);
  return {
    x: canvasX,
    y: canvasY,
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
  const fragment = document.createDocumentFragment();
  document.querySelector("footer").style.display = "block";
  cancelGenerate();
  await new Promise((resolve) => setTimeout(resolve, 50));
  scale = 1;
  panX = 0;
  panY = 0;
  requestDraw();
  // generationArea.style.padding = generateInfo.spacing + "px";
  generationArea.style.gap = generateInfo.spacing + "px";
const currentPageWidth = generationArea.getBoundingClientRect().width - (generateInfo.spacing * 2)
const currentPageHeight = (currentPageWidth * generateInfo.renderHeight) / generateInfo.renderWidth
  let previouslySelectedObj = selectedObj;
  selectedObj = null;
  generationArea.innerHTML = "";

  const boxesPerPage = generateInfo.noPerColumn * generateInfo.noPerRow;

  const createNewPage = () => {
    const page = document.createElement("section");
    fragment.append(page);
    page.style.width = "100%";
    page.style.backgroundColor = "#ffffff";
    page.style.display = "grid";
    page.style.gridTemplateRows = `repeat(${generateInfo.noPerColumn}, 1fr)`;
    page.style.gridTemplateColumns = `repeat(${generateInfo.noPerRow}, 1fr)`;
    page.style.placeItems = "center";

    // const width = page.getBoundingClientRect().width;
    const width = currentPageWidth
    const height = currentPageHeight
      ;
    page.style.height = `${height}px`;

    return page;
  };

  // let currentPage = createNewPage();

  const containerWidth =
    currentPageWidth - generateInfo.spacing;
  const containerHeight =
    currentPageHeight - generateInfo.spacing;

  const cellWidth = containerWidth / generateInfo.noPerRow;
  const cellHeight = containerHeight / generateInfo.noPerColumn;

  // scale for preview grid placement (DOM sizing)
  const paperRect0 = canvassDiv.getBoundingClientRect();
  const localScale = Math.min(
    cellWidth / paperRect0.width,
    cellHeight / paperRect0.height,
  );
  // currentPage.style.display = "none";
  let iterationLength = 1;

  if (textBoxes.length > 0) {
    iterationLength = Math.max(
      iterationLength,
      ...textBoxes.map((tb) => tb.textArea.split("\n").length),
    );
  }

  const maxImageIterLength = Math.max(
    1,
    ...images.map((imgObj) =>
      imgObj.originalFiles.length ? imgObj.originalFiles.length : 1,
    ),
  );

  iterationLength = Math.max(iterationLength, maxImageIterLength);
  let boxCountInPage = 0;

  // Increase output resolution. You can change this to 1, 2, 3...
  const scaleFactor = 2;
  const loader = new LoaderManager(iterationLength); // Set max items to the number of selected files
  loader.createLoader();
  await new Promise((resolve) => setTimeout(resolve, 50));
      // 2) compute crop region (paper div) in CANVAS pixel coords
    const canvasRect = canvas.getBoundingClientRect();
    const paperRect = canvassDiv.getBoundingClientRect();
    const cropX = (canvas.width - measurement.width) / 2;
    const cropY = (canvas.height - measurement.height) / 2;
    const cropW = measurement.width;
    const cropH = measurement.height;
    // 3) copy cropped area to an offscreen canvas
    const croppedCanvas = document.createElement("canvas");
    const cty = croppedCanvas.getContext("2d");
    croppedCanvas.width = cropW * scaleFactor;
    croppedCanvas.height = cropH * scaleFactor;


  for (let i = 0; i < iterationLength; i++) {
    // 1) draw current iteration onto main canvas

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await Promise.all([
      ...images.map(img => img.drawIteratedImage(i)),
      ...textBoxes.map(textBox => textBox.drawIteratedImage(i))
    ]);
    objects.forEach((obj) => obj.addObject());

    cty.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    cty.drawImage(
      canvas,
      cropX,
      cropY,
      cropW,
      cropH, // source (canvas pixels)
      0,
      0,
      cropW,
      cropH, // dest (before scaleFactor transform)
    );

    const blob = await new Promise(resolve =>
  croppedCanvas.toBlob(resolve, "image/webp", 0.9)
);
const url = URL.createObjectURL(blob);

    // 4) create preview element
    const div = document.createElement("div");
    const img = document.createElement("img");
       await new Promise((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(url); // Now safe to revoke
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url); // Clean up on error too
        resolve();
      };
      img.src = url;
    });
  div.classList.add("iterationDiv")
    // div.style.position = "relative";
    // div.style.backgroundColor = "#ffffff";
    // div.style.display = "flex";
    // div.style.alignItems = "center";
    // div.style.justifyContent = "center";

    if (generateInfo.renderPage === "auto") {
      div.style.width = "100%";
      img.classList.add("iterationImgAuto");
      // img.style.width = "100%";
      // img.style.height = "100%";
      // img.style.objectFit = "cover";
      div.append(img);
      fragment.append(div);

      // const w = div.getBoundingClientRect().width;
      div.style.height = `${(currentPageWidth * paperRect.height) / paperRect.width}px`;
    } else {
      if (boxCountInPage >= boxesPerPage) {
        currentPage = createNewPage();
        boxCountInPage = 0;
      }

      div.style.width = `${paperRect0.width * localScale}px`;
      div.style.height = `${paperRect0.height * localScale}px`;
 img.classList.add("iterationImgElse");
      // img.style.width = "100%";
      // img.style.height = "100%";
      // img.style.objectFit = "contain";

      div.append(img);
      currentPage.append(div);

      boxCountInPage++;
    }
    loader.incrementOriginalState();
    if (i % 10 === 0) {
await new Promise(resolve => requestAnimationFrame(resolve))
}
  
}
generationArea.append(fragment);
  images.forEach((img) => img.backToDefault());
  textBoxes.forEach((textBox) => textBox.backToDefault());

  const generationAreaPosition = generationArea.offsetTop;
  window.scrollTo({
    top: generationAreaPosition,
    behavior: "smooth",
  });
  selectedObj = previouslySelectedObj;
  requestDraw();
}

let needsDraw = false;

function requestDraw() {
  if (needsDraw) return;
  needsDraw = true;

  requestAnimationFrame(() => {
    needsDraw = false;
    draw();
  });
}
function multipleSelectFunction() {
  multipleSelectCoor.start.x = Math.min(
    ...multipleSelectArr.map((obj) => obj.whereToSnap().pos.x),
  );
  multipleSelectCoor.start.y = Math.min(
    ...multipleSelectArr.map((obj) => obj.whereToSnap().pos.y),
  );
  multipleSelectCoor.end.x = Math.max(
    ...multipleSelectArr.map(
      (obj) => obj.whereToSnap().pos.x + obj.whereToSnap().pos.width,
    ),
  );
  multipleSelectCoor.end.y = Math.max(
    ...multipleSelectArr.map(
      (obj) => obj.whereToSnap().pos.y + obj.whereToSnap().pos.height,
    ),
  );
}
function cMousedown(event) {
  for (let i = objects.length - 1; i >= 0; i--) {
    objects[i].isDoubleClicked = false;
  }
  if (startPanning) {
    isPanning = true;
    startX = event.clientX;
    startY = event.clientY;
    return;
  }
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });
  isDraggingObject = false;

  if (isDrawing !== null) {
    if (isDrawing === "text") {
      const text = new TextBox(pos.x, pos.y);
      objects.push(text);
      textBoxes.push(text);
      text.doubleClicked(pos);
      isDrawing = null;
      selectedObj = text;
      selectedObj.formatProperties();
      Tools("moveTool");
    } else {
      drawingStart = true;
      drawingCoordinate.start = { x: pos.x, y: pos.y };
      drawingCoordinate.end = { x: pos.x, y: pos.y };
    }
  } else if (pen !== null) {
    pen.drawPen(pos);
    undoObject.push(cloneObject(objects));
    selectedObj = pen;
    selectedObj.formatProperties();
  } else if (clipped !== null) {
    for (let i = objects.length - 1; i >= 0; i--) {
      if (
        objects[i].whatSelected(pos) &&
        objects[i] !== clipped &&
        objects[i].clips !== null
      ) {
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
            "x",
          );
          clipped.changeLocation(
            objectsCoordinate.y +
              (objectsCoordinate.height - clippedCoordinate.height) / 2,
            "y",
          );
        }
        clipped.clipper = objects[i].id;
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
      Tools("moveTool");
      undoObject.push(cloneObject(objects));
      redoObject.length = 0;
      return;
    } else {
      notify("Select An Object");
    }
  } else if (cloneObj !== null) {
    const cloned = cloneObj.showClone();
    cloned.changeLocation(pos.x, "x");
    cloned.changeLocation(pos.y, "y");
    objects.push(cloned);
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
    return;
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
        return;
      }
    }
  } else if (multipleSelect) {
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].whatSelected(pos)) {
        if (!multipleSelectArr.includes(objects[i])) {
          multipleSelectArr.push(objects[i]);
          break;
        }
      }
    }
    if (multipleSelectArr.length === 0) {
      isDrawing = "multipleSelect";
      drawingStart = true;
      drawingCoordinate.start = { x: pos.x, y: pos.y };
      drawingCoordinate.end = { x: pos.x, y: pos.y };
    }

    if (multipleSelectArr.length > 0) {
      multipleSelectFunction();
      if (
        pos.x >= multipleSelectCoor.start.x &&
        pos.x <= multipleSelectCoor.end.x &&
        pos.y >= multipleSelectCoor.start.y &&
        pos.y <= multipleSelectCoor.end.y
      ) {
        isDraggingObject = true;
        multipleSelectArr.forEach((obj) => (obj.isDoubleClicked = false));
        selectedObj = null;
      }
    }
  } else {
    let hitObject = null;

    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].whatSelected(pos)) {
        hitObject = objects[i];
        break;
      }
    }

    if (hitObject !== null) {
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
      startX = event.clientX;
      startY = event.clientY;
    }
  }

  lastMouseX = pos.x;
  lastMouseY = pos.y;
  requestDraw();
}
function cDoubleClick(event) {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });

  for (let i = objects.length - 1; i >= 0; i--) {
    if (objects[i].whatSelected(pos)) {
      selectedObj = objects[i];

      selectedObj.doubleClicked(pos);

      requestDraw();
      break;
    }
  }
}
function wMouseUp() {
  if (drawingStart) {
    drawingStart = false;

    if (isDrawing === "zoom") {
      const x = Math.min(drawingCoordinate.start.x, drawingCoordinate.end.x);
      const y = Math.min(drawingCoordinate.start.y, drawingCoordinate.end.y);
      const w = Math.abs(drawingCoordinate.end.x - drawingCoordinate.start.x);
      const h = Math.abs(drawingCoordinate.end.y - drawingCoordinate.start.y);

      zoomToRect({ x: x, y: y, width: w, height: h });
    } else if (isDrawing === "multipleSelect") {
      const x = Math.min(drawingCoordinate.start.x, drawingCoordinate.end.x);
      const y = Math.min(drawingCoordinate.start.y, drawingCoordinate.end.y);
      const w = Math.abs(drawingCoordinate.end.x - drawingCoordinate.start.x);
      const h = Math.abs(drawingCoordinate.end.y - drawingCoordinate.start.y);

      objects.forEach((obj) => {
        const coor = obj.whereToSnap().pos;
        if (
          coor.x >= x &&
          coor.x + coor.width <= x + w &&
          coor.y >= y &&
          coor.y + coor.height <= y + h
        ) {
          multipleSelectArr.push(obj);
        }
      });
      isDrawing = null;
      multipleSelect = true;
    } else {
      const drawedObject = drawingObject(true);
      objects.push(drawedObject);
      if (isDrawing === "image") {
        images.push(drawedObject);
      }
      selectedObj = drawedObject;
      selectedObj.formatProperties();
      Tools("moveTool");
      undoObject.push(cloneObject(objects));
      redoObject.length = 0;
    }
  }

  if (isDraggingObject || isRotatingObject || multipleSelect) {
    undoObject.push(cloneObject(objects));
    redoObject.length = 0;
  }

  isDraggingObject = false;
  isRotatingObject = false;
  isPanning = false;

  requestDraw();
}
function cMouseUp() {
  if (selectedObj && !cloneObj && !pen) {
    selectedObj.formatProperties();
  }
  requestDraw();
}
function cMouseLeave() {
  if (!isDraggingObject && !drawingStart) {
    isPanning = false;
  }
}
function cMouseMove(event) {
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
  } else if (cloneObj !== null) {
    cloneObj.formatSelected(pos);
    changed = true;
  } else if (
    isDraggingObject &&
    multipleSelect &&
    multipleSelectArr.length > 0
  ) {
    const deltaX = pos.x - lastMouseX;
    const deltaY = pos.y - lastMouseY;

    multipleSelectArr.forEach((obj) => {
      obj.moveClip(deltaX, deltaY);
    });
    multipleSelectFunction();

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
}
// document.addEventListener("contextmenu", (e) => {
//   e.preventDefault();
// });
document.addEventListener("keydown", async (e) => {
  const tag = e.target.tagName;
  const isTyping =
    tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
  // console.log(e.key)
  if (isTyping) return;

  e.preventDefault();
  if ((e.ctrlKey && e.key === "-") || (e.ctrlKey && e.key === "=")) return;
  if (e.code === "ArrowUp") {
    if (selectedObj !== null) selectedObj.moveClip(0, -thresholds.arrowKeys());
    else if (multipleSelect && multipleSelectArr.length > 0) {
      multipleSelectArr.forEach((obj) =>
        obj.moveClip(0, -thresholds.arrowKeys()),
      );
    } else {
      panY += -thresholds.arrowKeys();
    }
  } else if (e.code === "ArrowDown") {
    if (selectedObj !== null) selectedObj.moveClip(0, thresholds.arrowKeys());
    else if (multipleSelect && multipleSelectArr.length > 0) {
      multipleSelectArr.forEach((obj) =>
        obj.moveClip(0, thresholds.arrowKeys()),
      );
    } else panY += thresholds.arrowKeys();
  } else if (e.code === "ArrowLeft") {
    if (selectedObj !== null) selectedObj.moveClip(-thresholds.arrowKeys(), 0);
    else if (multipleSelect && multipleSelectArr.length > 0) {
      multipleSelectArr.forEach((obj) =>
        obj.moveClip(-thresholds.arrowKeys(), 0),
      );
    } else panX += -thresholds.arrowKeys();
  } else if (e.code === "ArrowRight") {
    if (selectedObj !== null) selectedObj.moveClip(thresholds.arrowKeys(), 0);
    else if (multipleSelect && multipleSelectArr.length > 0) {
      multipleSelectArr.forEach((obj) =>
        obj.moveClip(thresholds.arrowKeys(), 0),
      );
    } else panX += thresholds.arrowKeys();
  } else if (e.ctrlKey && e.key.toLowerCase() === "d" && selectedObj !== null) {
    Tools("duplicate");
  } else if (e.shiftKey && e.key === "@" && selectedObj !== null) {
    zoomToRect(selectedObj.whereToSnap().pos);
  } else if(e.ctrlKey && e.key === "a"){
    Tools('multipleSelection')
    multipleSelectArr = [...objects];
    multipleSelect = true;
  } else if (
    e.ctrlKey &&
    e.key.toLowerCase() === "g" &&
    multipleSelectArr.length > 1
  ) {
    group();
  } else if (e.ctrlKey && e.key.toLowerCase() === "s") {
    await saveToFile();
    notify("Saved");
  } else if (
    e.ctrlKey &&
    e.key.toLowerCase() === "u" &&
    selectedObj !== null &&
    selectedObj.type === "group"
  ) {
    selectedObj.list.forEach((l) => objects.push(l));
    const index = objects.indexOf(selectedObj);
    objects.splice(index, 1);
    selectedObj = null;
    Tools("moveTool");
  } else if (e.key.toLowerCase() === "delete" && selectedObj !== null) {
    Tools("delete");
  } else if (e.key.toLowerCase() === "pageup") {
    if (selectedObj !== null) pageUp(selectedObj);
  } else if (e.key.toLowerCase() === "pagedown") {
    if (selectedObj !== null) pageDown(selectedObj);
  } else if (e.key.toLowerCase() === "home") {
    if (selectedObj) bringToFront(selectedObj);
  } else if (e.key.toLowerCase() === "end") {
    if (selectedObj) sendToBack(selectedObj);
  } else if (e.key.toLowerCase() === "l") align("left");
  else if (e.key.toLowerCase() === "c") align("centerX");
  else if (e.key.toLowerCase() === "r") align("right");
  else if (e.key.toLowerCase() === "t") align("top");
  else if (e.key.toLowerCase() === "e") align("centerY");
  else if (e.key.toLowerCase() === "b") align("bottom");
  else if (e.key.toLowerCase() === "q") flip("x");
  else if (e.key.toLowerCase() === "w") flip("y");
  else if (e.key.toLowerCase() === "m") {
    Tools("moveTool");
  } else if (e.key.toLowerCase() === "s") {
    Tools("multipleSelection");
  } else if (e.key.toLowerCase() === "h") {
    Tools("panTool");
  } else if (e.ctrlKey && e.key.toLowerCase() === "z") {
    undo();
    return;
  } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
    redo();
  } else if (e.key.toLowerCase() === "z") {
    Tools("zoom");
  } else if (e.key.toLowerCase() === "p") {
    Tools("addLine");
  }

  requestDraw();
});
canvas.addEventListener("mousedown", (event) => {
  cMousedown(event);
});

canvas.addEventListener("dblclick", (event) => {
  cDoubleClick(event);
});

window.addEventListener("mouseup", wMouseUp);
canvas.addEventListener("mouseup", cMouseUp);
canvas.addEventListener("mouseleave", cMouseLeave);

canvas.addEventListener("mousemove", (event) => {
  cMouseMove(event);
});
let lastTouch = 0;
canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    const currentTime = new Date().getTime();
    const touchLength = currentTime - lastTouch;

    if (touchLength < 300 && touchLength > 0) {
      cDoubleClick(event.touches[0]);
    } else {
      cMousedown(event.touches[0]);
    }

    lastTouch = currentTime;
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    cMouseMove(event.touches[0]);
  },
  { passive: false },
);
canvas.addEventListener("touchend", () => {
  cMouseUp();
  cMouseLeave();
});
window.addEventListener("touchend", wMouseUp);

function draw() {
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, panX, panY);

    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      (canvas.width - measurement.width) / 2,
      (canvas.height - measurement.height) / 2,
      measurement.width,
      measurement.height,
    );
    ctx.closePath();

    if (objects.length > 0) {
      objects.forEach((obj) => {
        obj.addObject();
      });
    }
    if (cloneObj) {
      cloneObj.addObject();
    }
    if (multipleSelect && multipleSelectArr.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = adapt(1);
      ctx.strokeStyle = "#0000ff";
      ctx.setLineDash([adapt(5), adapt(3)]);
      ctx.strokeRect(
        multipleSelectCoor.start.x,
        multipleSelectCoor.start.y,
        multipleSelectCoor.end.x - multipleSelectCoor.start.x,
        multipleSelectCoor.end.y - multipleSelectCoor.start.y,
      );
      ctx.restore();
    }
    if (drawingStart) {
      if (isDrawing === "zoom" || isDrawing === "multipleSelect") {
        const x = Math.min(drawingCoordinate.start.x, drawingCoordinate.end.x);
        const y = Math.min(drawingCoordinate.start.y, drawingCoordinate.end.y);
        const w = Math.abs(drawingCoordinate.end.x - drawingCoordinate.start.x);
        const h = Math.abs(drawingCoordinate.end.y - drawingCoordinate.start.y);

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
    if (previousClip !== null) {
      const clone = clippedObject.showClone();
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

requestDraw();
// autoSave()
