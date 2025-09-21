const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;
const canvass = document.querySelector(".canvas");
const propertiesBar = document.getElementById("properties");
const textBoxes = [];
const generationArea = document.getElementById("generationArea");
const objects = [];
const images = [];
const width = document.getElementById("width");
const height = document.getElementById("height");
let whatsMeasured = "px";
let canvasOrientation = "potrait";
let measurement = { width: 817, height: 1055 };
let renderPageResolution = "auto";
let cloneObj = null;
let cloneText = null;
let renderPageRow = 1;
let renderPageColumn = 1;
let renderPageSize = "auto";
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
let selectedObj = null;
let selectedText = null;
let textLastMouseX = 0;
let textLastMouseY = 0;
let isDraggingText = false;

let allFonts = [];
fetch(
  "https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDRS1aSfDb6lfNx2ORZ118ZTasvu0KNni8"
)
  .then((res) => res.json())
  .then((data) => {
    allFonts = data.items.map((item) => item.family);
  })
  .catch(console.error);

window.addEventListener("load", () => {
  width.value = canvas.width;
  height.value = canvas.height;
});

class Rectangle {
  constructor() {
    this.x = 100;
    this.y = 100;
    this.width = 150;
    this.height = 100;
    this.color = "#ff0000";
    this.outline = false;
    this.outlineColor = "#00ff00";
    this.outlineThickness = 2;
    this.lineJoin = "round";
    this.lineDashWidth = 5;
    this.lineDashSpacing = 3;
    this.selectedArea = null;
    this.outlineType = [];
    this.isDashed = false;
    this.isDoubleClicked = false;
    this.angle = 0;
    this.roundedOrbeveled = "shaped";
    this.cornerRadius = 0;
    this.points = [
      {
        points: { x: -this.width / 2, y: -this.height / 2 },
        edgeModes: false,
        controls: [
          { x: -this.width / 2 + this.width * 0.25, y: -this.height / 2 },
          { x: -this.width / 2 + this.width * 0.75, y: -this.height / 2 },
        ],
      },
      {
        points: { x: -this.width / 2 + this.width, y: -this.height / 2 },
        edgeModes: false,
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
      },
      {
        points: {
          x: -this.width / 2 + this.width,
          y: -this.height / 2 + this.height,
        },
        edgeModes: false,
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
      },
      {
        points: { x: -this.width / 2, y: -this.height / 2 + this.height },
        edgeModes: false,
        controls: [
          { x: -this.width / 2, y: -this.height / 2 + this.height * 0.75 },
          { x: -this.width / 2, y: -this.height / 2 + this.height * 0.25 },
        ],
      },
    ];
    this.selectedPointIndex = null;
    this.selectedControl = null;
    this.shapeType;
    this.selectedLineIndex = null;
    this.mode = "edit";
  }
  addObject() {
    ctx.save();
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.fillStyle = this.color;
    if (this.roundedOrbeveled === "rounded") {
      this.drawRoundedRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
        this.cornerRadius
      );
    } else if (this.roundedOrbeveled === "beveled") {
      this.drawBeveledRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
        this.cornerRadius
      );
    } else if (this.roundedOrbeveled === "shaped") {
      ctx.moveTo(this.points[0].points.x, this.points[0].points.y);

      for (let i = 0; i < this.points.length; i++) {
        const next = (i + 1) % this.points.length;
        if (this.points[i].edgeModes) {
          const cp1 = this.points[i].controls[0];
          const cp2 = this.points[i].controls[1];
          const pNext = this.points[next].points;
          ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pNext.x, pNext.y);
        } else {
          ctx.lineTo(this.points[next].points.x, this.points[next].points.y);
        }
      }

      ctx.closePath();

      ctx.fillStyle = this.color;
      ctx.fill();
      if (this.outline) {
        ctx.save();
        ctx.lineWidth = this.outlineThickness;
        ctx.setLineDash(this.outlineType);
        ctx.strokeStyle = this.outlineColor;
        ctx.lineJoin = "round"
        ctx.stroke();
        ctx.restore();
      }
      if (this.mode === "edit") {
        this.points.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.points.x, p.points.y, 7, 0, Math.PI * 2);
          ctx.fillStyle =
            i === this.selectedPointIndex ? "#0000ff" : "#0000ff88";
          ctx.fill();
          ctx.strokeStyle = "#000";
          ctx.stroke();
        });

        this.points.forEach((isCurve, i) => {
          if (isCurve.edgeModes) {
            isCurve.controls.forEach((cp, j) => {
              ctx.beginPath();
              ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
              const isSelected =
                this.selectedControl &&
                this.selectedControl.curveIndex === i &&
                this.selectedControl.controlIndex === j;
              ctx.fillStyle = isSelected ? "#00cc00" : "#00cc0088";
              ctx.fill();
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(isCurve.points.x, isCurve.points.y);
              ctx.lineTo(cp.x, cp.y);
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = 2;
              ctx.stroke();
            });
          }
        });
      }
    }
    ctx.fill();
    ctx.closePath();
    if (
      (this.outline && this.roundedOrbeveled !== "shaped") ||
      this.roundedOrbeveled !== "normal"
    ) {
      ctx.beginPath();
      ctx.lineJoin = this.lineJoin;
      ctx.lineWidth = this.outlineThickness;
      ctx.strokeStyle = this.outlineColor;
      ctx.setLineDash(this.outlineType);
      if (this.roundedOrbeveled === "rounded") {
        this.drawRoundedRect(
          -this.width / 2 - this.outlineThickness / 2,
          -this.height / 2 - this.outlineThickness / 2,
          this.width + this.outlineThickness,
          this.height + this.outlineThickness,
          this.cornerRadius
        );
      } else if (this.roundedOrbeveled === "beveled") {
        this.drawBeveledRect(
          -this.width / 2 - this.outlineThickness / 2,
          -this.height / 2 - this.outlineThickness / 2,
          this.width + this.outlineThickness,
          this.height + this.outlineThickness,
          this.cornerRadius
        );
      }

      ctx.stroke();
      ctx.closePath();
    }
    if (selectedObj === this && this.roundedOrbeveled !== "shaped") {
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

  whatSelected(mouse) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    if (this.roundedOrbeveled === "shaped") {
      if (this.mode === "edit") {
        if (this.getPointPositon(mouse) || this.getEdgeAtPosition(mouse))
          return true;
      } else {
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        let inside = false;
        for (
          let i = 0, j = this.points.length - 1;
          i < this.points.length;
          j = i++
        ) {
          const xi = this.points[i].points.x,
            yi = this.points[i].points.y;
          const xj = this.points[j].points.x,
            yj = this.points[j].points.y;

          const intersect =
            yi > localY != yj > localY &&
            localX < ((xj - xi) * (localY - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        this.selectedArea = "Selected"
        return inside;
      }
      return false;
    } else {
      const threshold = 10;
    const localX = dx * cos - dy * sin + this.width / 2;
    const localY = dx * sin + dy * cos + this.height / 2;
      const nearLeft = Math.abs(localX) < threshold;
      const nearRight = Math.abs(localX - this.width) < threshold;
      const nearTop = Math.abs(localY) < threshold;
      const nearBottom = Math.abs(localY - this.height) < threshold;

      if (nearLeft && nearTop) this.selectedArea = "TopLeft";
      else if (nearRight && nearTop) this.selectedArea = "TopRight";
      else if (nearLeft && nearBottom) this.selectedArea = "BottomLeft";
      else if (nearRight && nearBottom) this.selectedArea = "BottomRight";
      else if (nearLeft) this.selectedArea = "Left";
      else if (nearRight) this.selectedArea = "Right";
      else if (nearTop) this.selectedArea = "Top";
      else if (nearBottom) this.selectedArea = "Bottom";
      else if (
        localX > 0 &&
        localX < this.width &&
        localY > 0 &&
        localY < this.height
      ) {
        this.selectedArea = "Selected";
      } else {
        this.selectedArea = null;
      }

      return this.selectedArea !== null;
    }
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

      const cos = Math.cos(-this.angle);
      const sin = Math.sin(-this.angle);

      const localDeltaX = deltaX * cos - deltaY * sin;
      const localDeltaY = deltaX * sin + deltaY * cos;
      if (this.shapeType === "line") {
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
      } else {
        if (this.selectedPointIndex !== null) {
          this.points[this.selectedPointIndex].points.x = localMouseX;
          this.points[this.selectedPointIndex].points.y = localMouseY;
          this.points[this.selectedPointIndex].controls[0].x += localDeltaX;
          this.points[this.selectedPointIndex].controls[0].y += localDeltaY;
          this.points[this.selectedPointIndex].controls[1].x += localDeltaX;
          this.points[this.selectedPointIndex].controls[1].y += localDeltaY;
        }

        if (this.selectedControl !== null) {
          const { curveIndex, controlIndex } = this.selectedControl;
          this.points[curveIndex].controls[controlIndex].x = localMouseX;
          this.points[curveIndex].controls[controlIndex].y = localMouseY;
        }
      }
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
        if (this.selectedArea === "Selected") {
          this.x += mouse.x - lastMouseX;
          this.y += mouse.y - lastMouseY;
        }
      }
    }
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.x = lastMouseX - this.width / 2;
    clone.y = lastMouseY - this.height / 2;
    return clone;
  }

  formatProperties() {
    propertiesBar.innerHTML = `
    <label>x:</label><input type="number" name="x" value="${changeValues(
      this.x
    )}">
    <label>y:</label><input type="number" name="y" value="${changeValues(
      this.y
    )}">
    <label>width:</label><input type="number" name="width" value="${changeValues(
      this.width
    )}">
    <label>height:</label><input type="number" name="height" value="${changeValues(
      this.height
    )}">
    <label>Background Color:</label> <input type="color" name="color" value="${
      this.color
    }">
    <label>Rotation (inRad):</label> <input type="number" name="angle" value="${
      this.angle
    }">
    <hr>
    <p>
    <span>Rounded:<input type="radio" name="roundedOrbeveled" value="rounded" ${
      this.roundedOrbeveled === "rounded" ? "checked" : ""
    }/></span>
    <span>Beveled:<input type="radio" name="roundedOrbeveled" value="beveled" ${
      this.roundedOrbeveled === "rounded" ? "" : "checked"
    }/></span>
    </p>
    <label>Corner Radius</label><input type="number" name="cornerRadius" value="${
      this.cornerRadius
    }" />
    <hr>
        <label>Outline True <input type="checkbox" name="outline" value="true" ${
          this.outline ? "checked" : ""
        }/></label>
    <div id="outline" style="display: ${this.outline ? "flex" : "none"}">
    <label>Outline Properties:</label><p><span><input type="radio" name="outlineType" value="solid" ${
      this.isDashed ? "" : "checked"
    }/>Solid</span><span><input type="radio" name="outlineType" value="dashed" ${
      this.isDashed ? "checked" : ""
    }/>Dashed</span></p>
      <label>Outline Color:</label><input type="color" name="outlineColor" value="${
        this.outlineColor
      }">
      <label>outlineThickness:</label><input type="number" name="outlineThickness" value="${
        this.outlineThickness
      }">
      ${
        this.isDashed
          ? `<label>Line Dash Width:</label><input type="number" name="lineDashWidth" value="${this.lineDashWidth}"/>
          <label>Line Dash Spacing:</label><input type="number" name="lineDashSpacing" value="${this.lineDashSpacing}"/>`
          : ""
      }  
    </div>
    <button class="convert">Convert</button>
    <button class="normal">Normal</button>

  `;

    document.querySelector(".convert").addEventListener("click", () => {
      this.points[this.selectedPointIndex].edgeModes =
        !this.points[this.selectedPointIndex].edgeModes;
      draw();
    });
    document.querySelector(".normal").addEventListener("click", () => {
      this.mode = this.mode === "normal" ? "edit" : "normal";
      draw();
    });
    propertiesBar.querySelectorAll("input").forEach((input) => {
      input.addEventListener(
        "input",
        (e) => setTimeout(this.changeProperties(e)),
        1000
      );
    });
  }
  getPointPositon(mouse) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    const localMouseX = dx * cos - dy * sin;
    const localMouseY = dx * sin + dy * cos;

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i].points;
      const pdx = localMouseX - p.x;
      const pdy = localMouseY - p.y;
      if (pdx * pdx + pdy * pdy < 10 * 10) {
        this.selectedPointIndex = i;
        this.selectedControl = null;
        this.selectedLineIndex = null;
        this.shapeType = "point";
        return true;
      }
    }

    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].edgeModes) {
        for (let j = 0; j < 2; j++) {
          const cp = this.points[i].controls[j];
          const cdx = localMouseX - cp.x;
          const cdy = localMouseY - cp.y;
          if (cdx * cdx + cdy * cdy < 10 * 10) {
            this.selectedControl = { curveIndex: i, controlIndex: j };
            this.selectedPointIndex = null;
            this.selectedLineIndex = null;
            this.shapeType = "point";
            return true;
          }
        }
      }
    }

    this.selectedPointIndex = null;
    this.selectedControl = null;
    return false;
  }
  changeProperties(e) {
    const name = e.target.name;
    if (e.target.name === "angle") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this[name] = value;
      }
    } else if (e.target.type === "number") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this[name] = backValues(value);
      }
    } else if (name === "outlineType") {
      const value = e.target.value;
      if (value === "dashed") {
        this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
        this.isDashed = true;
      } else {
        this.outlineType = [];
        this.isDashed = false;
      }
      this.formatProperties();
    } else if (name === "outline") {
      const value = e.target.value;
      if (value === "true") {
        this[name] = true;
      } else {
        this[name] = false;
      }
      this.formatProperties();
    } else {
      const value = e.target.value;
      if (value != NaN) {
        this[name] = value;
      }
    }
    if (this.isDashed) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    } else {
      this.outlineType = [];
    }

    draw();
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
  pointLineDistance(px, py, x1, y1, x2, y2) {
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
  computeBezierPoint(p0, p1, p2, p3, t) {
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

  getEdgeAtPosition(mouse) {
    const threshold = 10;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    const localMouseX = dx * cos - dy * sin;
    const localMouseY = dx * sin + dy * cos;

    for (let i = 0; i < this.points.length; i++) {
      const current = this.points[i];
      const next = this.points[(i + 1) % this.points.length];

      const p1 = current.points;
      const p2 = next.points;

      if (current.edgeModes) {
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
            curr.y
          );
          if (dist < threshold) {
            this.shapeType = "line";
            this.selectedLineIndex = i;
            this.selectedPointIndex = null;
            this.selectedControl = null;
            return true;
          }
          prev = curr;
        }
      } else {
        const dist = this.pointLineDistance(
          localMouseX,
          localMouseY,
          p1.x,
          p1.y,
          p2.x,
          p2.y
        );
        if (dist <= threshold) {
          this.shapeType = "line";
          this.selectedLineIndex = i;
          this.selectedPointIndex = null;
          this.selectedControl = null;
          return true;
        }
      }
    }
    return false;
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
      if (this.selectedPointIndex != null) {
        if (this.points.length > 3) {
          this.points.splice(this.selectedPointIndex, 1);
          return true;
        }
      }
      if (this.selectedLineIndex != null) {
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
            edgeModes: false,
            controls: [control1, control2],
          });
        }
        return true;
      }
    } else {
      isRotatingObject = true;
      this.isDoubleClicked = this.isDoubleClicked ? false : true;
      return true;
    }
  }
}

class Ellipse {
  constructor() {
    this.x = 100;
    this.y = 100;
    this.radiusX = 50;
    this.radiusY = 50;
    this.angle = 0;
    this.color = "#ff0000";
    this.outline = false;
    this.outlineColor = "#00ff00";
    this.outlineThickness = 10;
    this.lineDashWidth = 5;
    this.outlineType = [];
    this.isDashed = false;
    this.lineDashSpacing = 3;
    this.isDoubleClicked = false;
    this.selectedArea;
  }
  addObject() {
    ctx.save();
    ctx.beginPath();
    if (this.outline) {
      ctx.lineWidth = this.outlineThickness;
      ctx.strokeStyle = this.outlineColor;
      ctx.setLineDash(this.outlineType);
    }
    ctx.fillStyle = this.color;
    ctx.ellipse(
      this.x,
      this.y,
      this.radiusX,
      this.radiusY,
      this.angle,
      0,
      2 * Math.PI
    );
    ctx.stroke();
    ctx.fill();

    ctx.closePath();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (selectedObj === this) {
      ctx.beginPath();
      ctx.strokeStyle = "#0000ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(
        -this.radiusX,
        -this.radiusY,
        this.radiusX * 2,
        this.radiusY * 2
      );
      ctx.closePath();
    }
    ctx.restore();
  }
  whatSelected(mouse) {
    const threshold = 10;
    const rectW = this.radiusX * 2;
    const rectH = this.radiusY * 2;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin + rectW / 2;
    const localY = dx * sin + dy * cos + rectH / 2;

    const nearLeft = Math.abs(localX) < threshold;
    const nearRight = Math.abs(localX - rectW) < threshold;
    const nearTop = Math.abs(localY) < threshold;
    const nearBottom = Math.abs(localY - rectH) < threshold;

    if (nearLeft && nearTop) this.selectedArea = "TopLeft";
    else if (nearRight && nearTop) this.selectedArea = "TopRight";
    else if (nearLeft && nearBottom) this.selectedArea = "BottomLeft";
    else if (nearRight && nearBottom) this.selectedArea = "BottomRight";
    else if (nearLeft) this.selectedArea = "Left";
    else if (nearRight) this.selectedArea = "Right";
    else if (nearTop) this.selectedArea = "Top";
    else if (nearBottom) this.selectedArea = "Bottom";
    else if (localX > 0 && localX < rectW && localY > 0 && localY < rectH) {
      this.selectedArea = "Selected";
    } else {
      this.selectedArea = null;
    }

    return this.selectedArea !== null;
  }
  formatSelected(mouse) {
    const x = this.x - this.radiusX;
    const y = this.y - this.radiusY;
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
      }
    }
  }
  formatProperties() {
    propertiesBar.innerHTML = `
    <label>x:</label><input type="number" name="x" value="${changeValues(
      this.x - this.radiusX
    )}">
    <label>y:</label><input type="number" name="y" value="${changeValues(
      this.y - this.radiusY
    )}">
    <label>radiusX:</label><input type="number" name="radiusX" value="${changeValues(
      this.radiusX
    )}">
    <label>radiusY:</label><input type="number" name="radiusY" value="${changeValues(
      this.radiusY
    )}">
    <label>Background Color:</label><input type="color" name="color" value="${
      this.color
    }">
    <label>Rotation (inRad):</label><input type="number" name="angle" value="${
      this.angle
    }">
    <hr>
        <label>Outline True <input type="checkbox" name="outline" value="true" ${
          this.outline ? "checked" : ""
        }/></label>
    <div id="outline" style="display: ${this.outline ? "flex" : "none"}">
    <label>Outline Properties:</label><p><span><input type="radio" name="outlineType" value="solid" ${
      this.isDashed ? "" : "checked"
    }/>Solid</span><span><input type="radio" name="outlineType" value="dashed" ${
      this.isDashed ? "checked" : ""
    }/>Dashed</span></p>
      <label>Outline Color:</label><input type="color" name="outlineColor" value="${
        this.outlineColor
      }">
      <label>outlineThickness:</label><input type="number" name="outlineThickness" value="${
        this.outlineThickness
      }">
      ${
        this.isDashed
          ? `<label>Line Dash Width:</label><input type="number" name="lineDashWidth" value="${this.lineDashWidth}"/>
          <label>Line Dash Spacing:</label><input type="number" name="lineDashSpacing" value="${this.lineDashSpacing}"/>`
          : ""
      }  
    </div>

    `;
    propertiesBar.querySelectorAll("input").forEach((input) => {
      input.addEventListener(
        "input",
        (e) => setTimeout(this.changeProperties(e)),
        1000
      );
    });
  }
  changeProperties(e) {
    const name = e.target.name;
    if (this.isDashed) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    } else if (e.target.name === "angle") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this[name] = value;
      }
    } else if (name === "x") {
      const value = backValues(parseFloat(e.target.value)) + this.radiusX;
      if (value != NaN) {
        this[name] = value;
      }
    } else if (name === "y") {
      const value = backValues(parseFloat(e.target.value)) + this.radiusY;
      if (value != NaN) {
        this[name] = value;
      }
    } else if (e.target.type === "number") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this[name] = backValues(value);
      }
    } else if (name === "outlineType") {
      const value = e.target.value;
      if (value === "dashed") {
        this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
        this.isDashed = true;
      } else {
        this.outlineType = [];
        this.isDashed = false;
      }
      this.formatProperties();
    } else if (name === "outline") {
      const value = e.target.value;
      if (value === "true") {
        this[name] = true;
      } else {
        this[name] = false;
      }
      this.formatProperties();
    } else {
      const value = e.target.value;
      if (value != NaN) {
        this[name] = value;
      }
    }
    draw();
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.x = lastMouseX;
    clone.y = lastMouseY;
    return clone;
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
class Polygon {
  constructor() {
    this.sides = 6;
    this.centerX = 100;
    this.centerY = 100;
    this.radiusX = 50;
    this.radiusY = 30;
    this.angle = 0;
    this.color = "#FFCC00";
    this.outline = false;
    this.outlineColor = "#00ff00";
    this.outlineThickness = 10;
    this.lineDashWidth = 5;
    this.outlineType = [];
    this.isDashed = false;
    this.lineDashSpacing = 3;
    this.selectedArea = null;
    this.isDoubleClicked = false;
  }

  addObject() {
    if (this.sides < 3) return;

    const angleStep = (2 * Math.PI) / this.sides;
    const points = [];

    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;

    // === Generate original (fill) points ===
    for (let i = 0; i <= this.sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = this.radiusX * Math.cos(angle);
      const y = this.radiusY * Math.sin(angle);

      const rotatedX = x * Math.cos(this.angle) - y * Math.sin(this.angle);
      const rotatedY = x * Math.sin(this.angle) + y * Math.cos(this.angle);

      const finalX = this.centerX + rotatedX;
      const finalY = this.centerY + rotatedY;

      points.push({ x: finalX, y: finalY });

      this.minX = Math.min(this.minX, finalX);
      this.minY = Math.min(this.minY, finalY);
      this.maxX = Math.max(this.maxX, finalX);
      this.maxY = Math.max(this.maxY, finalY);
    }

    ctx.save();

    ctx.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.outline) {
      const outlinePoints = points.map((pt) => {
        const dx = pt.x - this.centerX;
        const dy = pt.y - this.centerY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return pt;
        const offset = this.outlineThickness / 2;
        return {
          x: pt.x + (dx / len) * offset,
          y: pt.y + (dy / len) * offset,
        };
      });

      ctx.beginPath();
      outlinePoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();

      ctx.lineWidth = this.outlineThickness;
      ctx.strokeStyle = this.outlineColor;
      ctx.setLineDash(this.outlineType);
      ctx.stroke();
    }

    if (selectedObj === this) {
      const corners = [
        { x: this.minX, y: this.minY },
        { x: this.maxX, y: this.minY },
        { x: this.maxX, y: this.maxY },
        { x: this.minX, y: this.maxY },
      ];

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = "#FF0000";
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  whatSelected(mouse) {
    const threshold = 8;

    const centerX = (this.minX + this.maxX) / 2;
    const centerY = (this.minY + this.maxY) / 2;
    const width = this.maxX - this.minX;
    const height = this.maxY - this.minY;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin + width / 2;
    const localY = dx * sin + dy * cos + height / 2;

    const nearLeft = Math.abs(localX) < threshold;
    const nearRight = Math.abs(localX - width) < threshold;
    const nearTop = Math.abs(localY) < threshold;
    const nearBottom = Math.abs(localY - height) < threshold;

    if (nearLeft && nearTop) this.selectedArea = "TopLeft";
    else if (nearRight && nearTop) this.selectedArea = "TopRight";
    else if (nearLeft && nearBottom) this.selectedArea = "BottomLeft";
    else if (nearRight && nearBottom) this.selectedArea = "BottomRight";
    else if (nearLeft) this.selectedArea = "Left";
    else if (nearRight) this.selectedArea = "Right";
    else if (nearTop) this.selectedArea = "Top";
    else if (nearBottom) this.selectedArea = "Bottom";
    else if (localX > 0 && localX < width && localY > 0 && localY < height) {
      this.selectedArea = "Selected";
    } else {
      this.selectedArea = null;
    }

    return this.selectedArea !== null;
  }

  formatSelected(mouse) {
    if (this.isDoubleClicked) {
      this.angle =
        Math.atan2(mouse.y - this.minY, mouse.x - this.minX) - Math.PI / 2;
    } else {
      if (this.selectedArea === "Left") {
        const newRadiusX = this.radiusX + (this.minX - mouse.x);
        if (newRadiusX > 0) {
          this.radiusX = newRadiusX;
        }
      } else if (this.selectedArea === "Right") {
        this.radiusX = (mouse.x - this.minX) / 2;
      } else if (this.selectedArea === "Top") {
        const newRadiusY = this.radiusY + (this.minY - mouse.y);
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
      } else if (this.selectedArea === "Bottom") {
        this.radiusY = (mouse.y - this.minY) / 2;
      } else if (this.selectedArea === "TopLeft") {
        const newRadiusY = this.radiusY + (this.minY - mouse.y);
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
        const newRadiusX = this.radiusX + (this.minX - mouse.x);
        if (newRadiusX > 0) {
          this.radiusX = newRadiusX;
        }
      } else if (this.selectedArea === "TopRight") {
        const newRadiusY = this.radiusY + (this.minY - mouse.y);
        if (newRadiusY > 0) {
          this.radiusY = newRadiusY;
        }
        this.radiusX = (mouse.x - this.minX) / 2;
      } else if (this.selectedArea === "BottomLeft") {
        this.radiusY = (mouse.y - this.minY) / 2;
        const newRadiusX = this.radiusX + (this.minX - mouse.x);
        if (newRadiusX > 0) {
          this.radiusX = newRadiusX;
        }
      } else if (this.selectedArea === "BottomRight") {
        this.radiusY = (mouse.y - this.minY) / 2;
        this.radiusX = (mouse.x - this.minX) / 2;
      } else if (this.selectedArea === "Selected") {
        this.centerX += mouse.x - lastMouseX;
        this.centerY += mouse.y - lastMouseY;
      }
    }
  }
  formatProperties() {
    propertiesBar.innerHTML = `
    <label>x:</label><input type="number" name="centerX" value="${changeValues(
      this.centerX - this.radiusX
    )}">
    <label>y:</label><input type="number" name="centerY" value="${changeValues(
      this.centerY - this.radiusY
    )}">
    <label>radiusX:</label><input type="number" name="radiusX" value="${changeValues(
      this.radiusX
    )}">
    <label>radiusY:</label><input type="number" name="radiusY" value="${changeValues(
      this.radiusY
    )}">
    <label>Background Color:</label> <input type="color" name="color" value="${
      this.color
    }">
    <label>Rotation (inRad): </label> <input type="number" name="angle" value="${
      this.angle
    }">
    <label>Sides:</label> <input type="number" name="sides" value="${
      this.sides
    }">
        <hr>
        <label>Outline True <input type="checkbox" name="outline" value="true" ${
          this.outline ? "checked" : ""
        }/></label>
    <div id="outline" style="display: ${this.outline ? "flex" : "none"}">
    <label>Outline Properties:</label><p><span><input type="radio" name="outlineType" value="solid" ${
      this.isDashed ? "" : "checked"
    }/>Solid</span><span><input type="radio" name="outlineType" value="dashed" ${
      this.isDashed ? "checked" : ""
    }/>Dashed</span></p>
      <label>Outline Color:</label><input type="color" name="outlineColor" value="${
        this.outlineColor
      }">
      <label>outlineThickness:</label><input type="number" name="outlineThickness" value="${
        this.outlineThickness
      }">
      ${
        this.isDashed
          ? `<label>Line Dash Width:</label><input type="number" name="lineDashWidth" value="${this.lineDashWidth}"/>
          <label>Line Dash Spacing:</label><input type="number" name="lineDashSpacing" value="${this.lineDashSpacing}"/>`
          : ""
      }  
    </div>

    `;
    propertiesBar.querySelectorAll("input").forEach((input) => {
      input.addEventListener(
        "input",
        (e) => setTimeout(this.changeProperties(e)),
        1000
      );
    });
  }
  changeProperties(e) {
    const name = e.target.name;
    if (this.isDashed) {
      this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
    } else if (e.target.name === "angle") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this[name] = value;
      }
    } else if (name === "sides") {
      const value = parseInt(e.target.value);
      if (value != NaN) {
        this[name] = value;
      }
    } else if (name === "centerX") {
      const value = backValues(parseFloat(e.target.value)) + this.radiusX;
      if (value != NaN) {
        this[name] = value;
      }
    } else if (name === "centerY") {
      const value = backValues(parseFloat(e.target.value)) + this.radiusY;
      if (value != NaN) {
        this[name] = value;
      }
    } else if (e.target.type === "number") {
      const value = backValues(parseFloat(e.target.value));
      if (value != NaN) {
        this[name] = value;
      }
    } else if (name === "outlineType") {
      const value = e.target.value;
      if (value === "dashed") {
        this.outlineType = [this.lineDashWidth, this.lineDashSpacing];
        this.isDashed = true;
      } else {
        this.outlineType = [];
        this.isDashed = false;
      }
      this.formatProperties();
    } else if (name === "outline") {
      const value = e.target.value;
      if (value === "true") {
        this[name] = true;
      } else {
        this[name] = false;
      }
      this.formatProperties();
    } else {
      const value = e.target.value;
      if (value != NaN) {
        this[name] = value;
      }
    }
    draw();
  }
  showClone() {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.centerX = lastMouseX;
    clone.centerY = lastMouseY;
    return clone;
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
class Line {
  constructor() {
    this.startingPointX = 100;
    this.startingPointY = 100;
    this.lengthX = 200;
    this.lengthY = 0;
    this.strokeStyle = "#FF0000";
    this.lineWidth = 2;
    this.angle = 0;
    this.isDoubleClicked = false;
    this.selectedArea;
  }
  addObject() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.startingPointX, this.startingPointY);
    ctx.lineTo(
      this.startingPointX + this.lengthX,
      this.startingPointY + this.lengthY
    );
    ctx.strokeStyle = this.strokeStyle;
    ctx.lineWidth = this.lineWidth;
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }
  isMouseNearLine(mouse, threshold = 5) {
    const x1 = this.startingPointX;
    const y1 = this.startingPointY;
    const x2 = this.startingPointX + this.lengthX;
    const y2 = this.startingPointY + this.lengthY;
    const x0 = mouse.x;
    const y0 = mouse.y;

    // Compute distance from point to line segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) return false; // line is a point

    let t = ((x0 - x1) * dx + (y0 - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const dist = Math.hypot(x0 - closestX, y0 - closestY);
    return dist <= threshold;
  }

  whatSelected(mouse) {
    const edgeThreshold = 10;
    const nearLeft = Math.abs(mouse.x - this.startingPointX) < edgeThreshold;
    const nearRight =
      Math.abs(mouse.x - (this.startingPointX + this.lengthX)) < edgeThreshold;
    const nearTop = Math.abs(mouse.y - this.startingPointY) < edgeThreshold;
    const nearBottom =
      Math.abs(mouse.y - (this.startingPointY + this.lengthY)) < edgeThreshold;
    if (nearLeft && nearTop) this.selectedArea = "TopLeft";
    else if (nearRight && nearBottom) this.selectedArea = "BottomRight";
    else if (this.isMouseNearLine(mouse, 10)) {
      this.selectedArea = "Selected";
    } else {
      this.selectedArea = null;
    }
    return this.selectedArea != null;
  }
  formatSelected(mouse) {
    if (this.isDoubleClicked) {
      this.angle =
        Math.atan2(
          mouse.y - this.startingPointY,
          mouse.x - this.startingPointX
        ) -
        Math.PI / 2;
    } else {
      if (this.selectedArea === "TopLeft") {
        this.startingPointX = mouse.x;
        this.startingPointY = mouse.y;
      } else if (this.selectedArea === "BottomRight") {
        this.lengthX = mouse.x - this.startingPointX;
        this.lengthY = mouse.y - this.startingPointY;
      } else {
        this.startingPointX += mouse.x - lastMouseX;
        this.startingPointY += mouse.y - lastMouseY;
      }
    }
  }
  formatProperties() {}
}

class TextBox {
  constructor() {
    this.input = document.createElement("textarea");
    this.text = "Add Textbox";
    this.angle = 0;
    this.isDoubleClicked = false;
    this.selectedArea;
    this.textArea = "";
    this.iterated = false;
    this.shadow = false;
    this.shadowX = 2;
    this.shadowY = 2;
    this.shadowColor = "#000000";
    this.shadowBlur = 3;
  }
  addObject() {
    this.input.value = this.text;
    this.input.readOnly = true;
    this.input.style.resize = "none";
    this.input.className = "textarea";
    this.input.style.position = "absolute";
    this.input.style.left = "100px";
    this.input.style.top = "100px";
    this.input.style.width = "150px";
    this.input.style.height = "30px";
    this.input.style.color = "#03624c";
    this.input.style.fontSize = "15px";
    this.input.style.paddingTop = "10px";
    this.input.style.paddingBottom = "10px";
    this.input.style.paddingLeft = "10px";
    this.input.style.paddingRight = "10px";
    this.input.style.outline = "none";
    this.input.style.backgroundColor = "transparent";
    this.input.style.border = "none";
    this.input.style.textAlign = "left";
    this.input.style.fontFamily = "san-serif";
    this.input.addEventListener("input", (e) => {
      this.text = e.target.value;
    });
    canvass.append(this.input);
  }
  whatSelected(mouse) {
    const rect = this.input.getBoundingClientRect();
    const edgeThreshold = 10;
    const nearLeft = Math.abs(mouse.x - rect.x) < edgeThreshold;
    const nearRight = Math.abs(mouse.x - (rect.x + rect.width)) < edgeThreshold;
    const nearTop = Math.abs(mouse.y - rect.y) < edgeThreshold;
    const nearBottom =
      Math.abs(mouse.y - (rect.y + rect.height)) < edgeThreshold;
    if (nearLeft && nearTop) this.selectedArea = "TopLeft";
    else if (nearRight && nearTop) this.selectedArea = "TopRight";
    else if (nearLeft && nearBottom) this.selectedArea = "BottomLeft";
    else if (nearRight && nearBottom) this.selectedArea = "BottomRight";
    else if (nearLeft) this.selectedArea = "Left";
    else if (nearRight) this.selectedArea = "Right";
    else if (nearTop) this.selectedArea = "Top";
    else if (nearBottom) this.selectedArea = "Bottom";
    else if (
      mouse.x > rect.x &&
      mouse.x < rect.x + rect.width &&
      mouse.y > rect.y &&
      mouse.y < rect.y + rect.height
    ) {
      this.selectedArea = "Selected";
      this.input.style.border = "2px dotted #0000ff";
      this.input.style.resize = "both";
    } else {
      this.selectedArea = null;
      this.input.style.border = "none";
    }
    return this.selectedArea !== null;
  }
  formatSelected(mouse) {
    const rect = this.input.getBoundingClientRect();
    const canvassRect = canvass.getBoundingClientRect();
    const textPos = textMousePos(mouse);

    if (this.isDoubleClicked) {
      this.input.readOnly = false;
    } else {
      this.input.readOnly = true;
      if (this.selectedArea === "Left") {
        const newWidth = rect.width + rect.x - mouse.x;
        if (newWidth > 0 && rect.x > canvassRect.x) {
          this.input.style.left = textPos.x + "px";
          this.input.style.width = newWidth + "px";
        }
      } else if (this.selectedArea === "Right") {
        if (canvassRect.right > rect.right) {
          this.input.style.width = mouse.x - rect.x + "px";
        }
      } else if (this.selectedArea === "Top") {
        const newHeight = rect.height + rect.y - mouse.y;
        if (newHeight > 0 && rect.top > canvassRect.top) {
          this.input.style.top = textPos.y + "px";
          this.input.style.height = newHeight + "px";
        }
      } else if (this.selectedArea === "Bottom") {
        if (rect.bottom < canvassRect.bottom) {
          this.input.style.height = mouse.y - rect.y + "px";
        }
      } else if (this.selectedArea === "TopLeft") {
        const newHeight = rect.height + rect.y - mouse.y;
        if (newHeight > 0 && rect.top > canvassRect.top) {
          this.input.style.top = textPos.y + "px";
          this.input.style.height = newHeight + "px";
        }
        const newWidth = rect.width + rect.x - mouse.x;
        if (newWidth > 0 && rect.x > canvassRect.x) {
          this.input.style.left = textPos.x + "px";
          this.input.style.width = newWidth + "px";
        }
      } else if (this.selectedArea === "TopRight") {
        const newHeight = rect.height + rect.y - mouse.y;
        if (newHeight > 0 && rect.top > canvassRect.top) {
          this.input.style.top = textPos.y + "px";
          this.input.style.height = newHeight + "px";
        }
        if (canvassRect.right > rect.right) {
          this.input.style.width = mouse.x - rect.x + "px";
        }
      } else if (this.selectedArea === "BottomLeft") {
        if (rect.bottom < canvassRect.bottom) {
          this.input.style.height = mouse.y - rect.y + "px";
        }
        const newWidth = rect.width + rect.x - mouse.x;
        if (newWidth > 0 && rect.x > canvassRect.x) {
          this.input.style.left = textPos.x + "px";
          this.input.style.width = newWidth + "px";
        }
      } else if (this.selectedArea === "BottomRight") {
        if (rect.bottom < canvassRect.bottom) {
          this.input.style.height = mouse.y - rect.y + "px";
        }
        if (canvassRect.right > rect.right) {
          this.input.style.width = mouse.x - rect.x + "px";
        }
      } else if (this.selectedArea === "Selected") {
        if (textPos.x < rect.width / 2) {
          textPos.x = rect.width / 2;
        } else if (textPos.x > canvassRect.width - rect.width / 2) {
          textPos.x = canvassRect.width - rect.width / 2;
        }
        if (textPos.y < rect.height / 2) {
          textPos.y = rect.height / 2;
        } else if (textPos.y > canvassRect.height - rect.height / 2) {
          textPos.y = canvassRect.height - rect.height / 2;
        }
        this.input.style.left = textPos.x - rect.width / 2 + "px";
        this.input.style.top = textPos.y - rect.height / 2 + "px";
      }
    }
  }

  formatProperties() {
    const rect = this.input.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    propertiesBar.innerHTML = `
          <label>x:</label><input type="number" name="x" value="${changeValues(
            rect.left - canvasRect.left
          )}">
    <label>y:</label><input type="number" name="y" value="${changeValues(
      rect.top - canvasRect.top
    )}">
    <label>width:</label><input type="number" name="width" value="${changeValues(
      rect.width
    )}">
    <label>height:</label><input type="number" name="height" value="${changeValues(
      rect.height
    )}">
    <label>Background Color:</label> <input type="color" name="color" value="${
      this.input.style.color
    }">
    <label>Rotation (inRad):</label> <input type="number" name="angle" value="${
      this.angle
    }">
    <label>Font Type:</label>
      <div class="autocomplete-container">
    <input type="text" id="fontInput" placeholder="Search Google Fonts..." autocomplete="off" />
    <div id="dropdown" class="dropdown"></div>
    </div>
    </div>
    <label>Font Size:</label><input type="number" name="fontSize" value="${changeValues(
      parseFloat(this.input.style.fontSize)
    )}">
    <label>Text Allign:</label>
    <select class="allign">
      <option value="left" selected>Left</option>
      <option value="right">Right</option>
      <option value="center">Center</option>
    </select>
    <label>Shadow: <input type="checkbox" name="shadow" value="true" ${
      this.shadow ? "checked" : ""
    }></label>
    <label>Iterate: <input type="checkbox" name="iterated" value="true" ${
      this.iterated ? "checked" : ""
    }></label>
      `;
    this.shadowX = 2;
    this.shadowY = 2;
    this.shadowColor = "#000000";
    this.shadowBlur = 3;
    if (this.shadow) {
      propertiesBar.innerHTML += `
      <label>ShadowX:</label><input type="number" name="shadowX" value="${changeValues(
        this.shadowX
      )}" >
      <label>ShadowY:</label><input type="number" name="shadowY" value="${changeValues(
        this.shadowY
      )}" >
      <label>Shadow Color:</label><input type="color" name="shadowColor" value="${
        this.shadowColor
      }" >
      <label>Shadow Blur:</label><input type="number" name="shadowBlur" value="${changeValues(
        this.shadowBlur
      )}" >
      `;
    }
    if (this.iterated) {
      propertiesBar.innerHTML += `
      <textarea name="textarea">${this.textArea}</textarea>
      `;
    }

    const input = document.getElementById("fontInput");
    const dropdown = document.getElementById("dropdown");
    input.addEventListener("focus", () => {
      if (!input.value.trim()) {
        this.showDropdown(allFonts);
      }
    });
    input.addEventListener("input", () => {
      const value = input.value.toLowerCase().trim();
      if (value === "") {
        this.showDropdown(allFonts);
      } else {
        const matches = allFonts
          .filter((font) => font.toLowerCase().includes(value))
          .slice(0, 10);
        this.showDropdown(matches);
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".autocomplete-container")) {
        dropdown.style.display = "none";
      }
    });

    document.querySelector(".allign").addEventListener("change", (e) => {
      this.input.style.textAlign = e.target.value;
    });
    propertiesBar.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener(
        "input",
        (e) => setTimeout(this.changeProperties(e)),
        1000
      );
    });
  }
  showDropdown(fonts) {
    dropdown.innerHTML = "";
    if (fonts.length === 0) {
      dropdown.style.display = "none";
      return;
    }
    fonts.forEach((font) => {
      const option = document.createElement("div");
      option.textContent = font;
      option.style.fontFamily = `'${font}', sans-serif`;
      option.addEventListener("click", () => {
        document.getElementById("fontInput").value = font;
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
        this.loadFont(font);
      });
      dropdown.appendChild(option);
    });
    dropdown.style.display = "block";
  }
  loadFont(font) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(
      / /g,
      "+"
    )}&display=swap`;
    document.head.appendChild(link);
    this.input.style.fontFamily = `'${font}', sans-serif`;
  }
  changeProperties(e) {
    const name = e.target.name;
    if (e.target.type === "checkbox") {
      this[name] = e.target.checked;
      this.formatProperties();
    } else if (
      name === "shadowX" ||
      name === "shadowY" ||
      name === "shadowBlur" ||
      name === "shadowColor"
    ) {
      const value = e.target.value;
      if (value != NaN) {
        this[name] = value;
      }
    } else if (name === "textarea") {
      const value = e.target.value;
      if (value != NaN) {
        this.textArea = value;
      }
    } else if (e.target.type === "number") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this.input.style[name] = backValues(value) + "px";
      }
    } else {
      const value = e.target.value;
      if (value != NaN) {
        this.input.style[name] = value;
      }
    }
    if (this.shadow) {
      this.input.style.textShadow = `${backValues(this.shadowX)}px ${backValues(
        this.shadowY
      )}px ${backValues(this.shadowBlur)}px ${this.shadowColor}`;
    } else {
      this.input.style.textShadow = "none";
    }
  }
  generateText(num, iteratedBox) {
    const paragraph = document.createElement("p");
    const canvassRect = canvass.getBoundingClientRect();
    if (this.iterated && num < this.textArea.split("\n").length) {
      paragraph.textContent = this.textArea.split("\n")[num];
    } else {
      paragraph.textContent = this.text;
    }
    paragraph.style.position = "absolute";
    paragraph.style.left = `${
      (parseFloat(this.input.style.left) / canvassRect.width) * 100
    }%`;
    paragraph.style.top = `${
      (parseFloat(this.input.style.top) / canvassRect.height) * 100
    }%`;
    paragraph.style.fontSize =
      parseFloat(this.input.style.fontSize) *
        (iteratedBox.width / canvassRect.width) +
      "px";
    paragraph.style.color = this.input.style.color;
    paragraph.style.width =
      parseFloat(this.input.offsetWidth) *
        (iteratedBox.width / canvassRect.width) +
      "px";
    paragraph.style.height =
      parseFloat(this.input.offsetHeight) *
        (iteratedBox.height / canvassRect.height) +
      "px";
    paragraph.style.paddingLeft =
      parseFloat(this.input.style.paddingLeft) *
        (iteratedBox.width / canvassRect.width) +
      "px";
    paragraph.style.paddingRight =
      parseFloat(this.input.style.paddingRight) *
        (iteratedBox.width / canvassRect.width) +
      "px";
    paragraph.style.paddingTop =
      parseFloat(this.input.style.paddingTop) *
        (iteratedBox.height / canvassRect.height) +
      "px";
    paragraph.style.paddingBottom =
      parseFloat(this.input.style.paddingBottom) *
        (iteratedBox.height / canvassRect.height) +
      "px";
    paragraph.style.textAlign = this.input.style.textAlign;
    paragraph.style.fontFamily = this.input.style.fontFamily;

    return paragraph;
  }
  showClone() {
    const cloneInput = this.input.cloneNode(true);
    cloneInput.style.left = textLastMouseX + "px";
    cloneInput.style.top = textLastMouseY + "px";
    const newTextBox = new TextBox();
    newTextBox.input = cloneInput;
    newTextBox.text = this.text;
    newTextBox.angle = this.angle;
    newTextBox.isDoubleClicked = this.isDoubleClicked;
    newTextBox.iterated = this.iterated;
    newTextBox.textArea = this.textArea;
    newTextBox.shadow = this.shadow;
    newTextBox.shadowX = this.shadowX;
    newTextBox.shadowY = this.shadowY;
    newTextBox.shadowColor = this.shadowColor;
    newTextBox.shadowBlur = this.shadowBlur;
    canvass.appendChild(cloneInput);

    return newTextBox;
  }
  whereToSnap() {
    const rect = this.input.getBoundingClientRect();
    const xY = getMousePos(canvas, { x: rect.x, y: rect.y });
    return {
      x: [xY.x, xY.x + rect.width / 2, xY.x + rect.width],
      y: [xY.y, xY.y + rect.height / 2, xY.y + rect.height],
      pos: { x: xY.x, y: xY.y, width: rect.width, height: rect.height },
    };
  }
  RectProperties() {
    const rect = this.input.getBoundingClientRect();
    const xY = getMousePos(canvas, { x: rect.x, y: rect.y });
    return { x: xY.x, y: xY.y, width: rect.width, height: rect.height };
  }
  changeLocation(value, type) {
    const rect = this.input.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    if (type === "x") {
      const newValue =
        (value + canvasRect.left) / (canvas.width / canvasRect.width);
      this.input.style.left =
        newValue - canvass.getBoundingClientRect().left + "px";
    } else {
      const newValue =
        (value + canvasRect.top) / (canvas.height / canvasRect.height);

      this.input.style.top =
        newValue - canvass.getBoundingClientRect().top + "px";
    }
  }
}
class Images {
  constructor(image, width, height, originalFile) {
    this.x = 100;
    this.y = 100;
    this.width = 150;
    this.aspectRatio = height / width;
    this.height = this.width * this.aspectRatio;
    this.image = image;
    this.isDoubleClicked = false;
    this.angle = 0;
    this.selectedArea;
    this.originalFile = originalFile;
    this.iteratedFiles = [];
  }
  addObject() {
    ctx.save();
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.drawImage(
      this.image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    ctx.closePath();

    if (selectedObj === this) {
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

    const nearLeft = Math.abs(localX) < threshold;
    const nearRight = Math.abs(localX - this.width) < threshold;
    const nearTop = Math.abs(localY) < threshold;
    const nearBottom = Math.abs(localY - this.height) < threshold;

    if (nearLeft && nearTop) this.selectedArea = "TopLeft";
    else if (nearRight && nearTop) this.selectedArea = "TopRight";
    else if (nearLeft && nearBottom) this.selectedArea = "BottomLeft";
    else if (nearRight && nearBottom) this.selectedArea = "BottomRight";
    else if (nearLeft) this.selectedArea = "Left";
    else if (nearRight) this.selectedArea = "Right";
    else if (nearTop) this.selectedArea = "Top";
    else if (nearBottom) this.selectedArea = "Bottom";
    else if (
      localX > 0 &&
      localX < this.width &&
      localY > 0 &&
      localY < this.height
    ) {
      this.selectedArea = "Selected";
    } else {
      this.selectedArea = null;
    }

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
      } else if (this.selectedArea === "Selected") {
        this.x += mouse.x - lastMouseX;
        this.y += mouse.y - lastMouseY;
      }
    }
  }
  formatProperties() {
    propertiesBar.innerHTML = `
    <button id="removeBg">Remove Background</button>
    <button id="maintainAspect">Aspect Ratio</button>
        <label>x:</label><input type="number" name="x" value="${changeValues(
          this.x
        )}">
    <label>y:</label><input type="number" name="y" value="${changeValues(
      this.y
    )}">
    <label>width:</label><input type="number" name="width" value="${changeValues(
      this.width
    )}">
    <label>height:</label><input type="number" name="height" value="${changeValues(
      this.height
    )}">
    <label>Rotation (inRad):</label> <input type="number" name="angle" value="${
      this.angle
    }">
    <input type="file" multiple accept=".jpg,.png,.svg" name="iteratedFiles" >
  `;
    document.getElementById("maintainAspect").addEventListener("click", () => {
      this.height = this.aspectRatio * this.width;
      draw();
    });
    document.getElementById("removeBg").addEventListener("click", async () => {
      try {
        const formData = new FormData();
        if (!this.originalFile) {
          alert("Original image file not available for background removal.");
          return;
        }
        formData.append("image_file", this.originalFile);
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
        const imageUrl = URL.createObjectURL(blob);

        const newImage = new Image();
        newImage.onload = () => {
          this.image = newImage;
          draw();
          URL.revokeObjectURL(imageUrl);
        };
        newImage.src = imageUrl;
      } catch (err) {
        errorDiv.textContent = "Error: " + err.message;
      }
    });
    propertiesBar.querySelectorAll("input").forEach((input) => {
      input.addEventListener(
        "input",
        (e) => setTimeout(this.changeProperties(e)),
        1000
      );
    });
  }
  changeProperties(e) {
    const name = e.target.name;
    if (name === "iteratedFiles") {
      this.iteratedFiles = Array.from(e.target.files);
      console.log(this.iteratedFiles);
    } else if (e.target.name === "angle") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this[name] = value;
      }
    } else if (e.target.type === "number") {
      const value = parseFloat(e.target.value);
      if (value != NaN) {
        this[name] = backValues(value);
      }
    } else {
      const value = e.target.value;
      if (value != NaN) {
        this[name] = value;
      }
    }
    draw();
  }
  async drawIteratedImage(i) {
    const file = this.iteratedFiles[i % this.iteratedFiles.length];
    if (!file) return;

    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.image = img; // update the image object’s image
          this.addObject(); // draw it using the existing method
          resolve();
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
document.querySelector(".addRectangle").addEventListener("click", addRectangle);
document.querySelector(".addEllipse").addEventListener("click", addEllipse);
document.querySelector(".addPolygon").addEventListener("click", addPolygon);
document.querySelector(".addLine").addEventListener("click", addLine);
document.querySelector(".addTextbox").addEventListener("click", addTextbox);
document.getElementById("file").addEventListener("change", (e) => addImage(e));
document.querySelector(".saveAsPdf").addEventListener("click", saveAsPDF);
document.getElementById("orientation").addEventListener("change", (e) => {
  canvasOrientation = e.target.value;
  canvasSize(measurement);
});
document.getElementById("measurement").addEventListener("change", (e) => {
  whatsMeasured = e.target.value;
  width.value = changeValues(canvas.getBoundingClientRect().width);
  height.value = changeValues(canvas.getBoundingClientRect().height);
  draw();
  if (selectedObj) selectedObj.formatProperties();
  if (selectedText) selectedText.formatProperties();
});
document.getElementById("paperSize").addEventListener("change", (e) => {
  const value = e.target.value;
  if (value === "a1") {
    measurement = measurementArr[0];
    canvasSize();
  } else if (value === "a2") {
    measurement = measurementArr[1];
    canvasSize();
  } else if (value === "a3") {
    measurement = measurementArr[2];
    canvasSize();
  } else if (value === "a4") {
    measurement = measurementArr[3];
    canvasSize();
  } else if (value === "a5") {
    measurement = measurementArr[4];
    canvasSize();
  } else if (value === "a6") {
    measurement = measurementArr[5];
    canvasSize();
  } else if (value === "business-card") {
    measurement = measurementArr[6];
    canvasSize();
  } else if (value === "letter") {
    measurement = measurementArr[7];
    canvasSize();
  }
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
  document.querySelector(".perRow").style.display = "block";
  if (e.target.value === "a0") {
    renderPageSize = measurementArr[9];
  } else if (e.target.value === "a1") {
    renderPageSize = measurementArr[0];
  } else if (e.target.value === "a2") {
    renderPageSize = measurementArr[1];
  } else if (e.target.value === "a3") {
    renderPageSize = measurementArr[2];
  } else if (e.target.value === "a4") {
    renderPageSize = measurementArr[3];
  } else if (e.target.value === "a5") {
    renderPageSize = measurementArr[4];
  } else if (e.target.value === "legal") {
    renderPageSize = measurementArr[10];
  } else if (e.target.value === "auto") {
    renderPageSize = "";
    document.querySelector(".perRow").style.display = "none";
  } else if (e.target.value === "letter") {
    renderPageSize = measurementArr[7];
  }
});
document.getElementById("noPerRow").addEventListener("input", (e) => {
  renderPageRow = e.target.value;
});
document.getElementById("noPerColumn").addEventListener("input", (e) => {
  renderPageColumn = e.target.value;
});
let duplicateClicked = false;
document.getElementById("duplicate").addEventListener("click", () => {
  duplicateClicked = !duplicateClicked;
  if (duplicateClicked) {
    if (selectedObj) {
      cloneObj = selectedObj.showClone();
    } else if (selectedText) {
      cloneText = selectedText.showClone();
    } else {
      alert("No Selected Object");
    }
  } else {
    if (cloneText) {
      cloneText.input.remove();
    }
    cloneObj = null;
    cloneText = null;
  }
});
document.getElementById("pageTop").addEventListener("click", () => {
  if (selectedObj) {
    let index = objects.indexOf(selectedObj);
    if (index !== -1) {
      objects.splice(index, 1);
      objects.push(selectedObj);
      draw();
    }
  }
});
document.getElementById("pageEnd").addEventListener("click", () => {
  if (selectedObj) {
    let index = objects.indexOf(selectedObj);
    if (index !== -1) {
      objects.splice(index, 1);
      objects.unshift(selectedObj);
      draw();
    }
  }
});
document.getElementById("deleter").addEventListener("click", () => {
  if (selectedObj) {
    let index = objects.indexOf(selectedObj);
    objects.splice(index, 1);
    selectedObj = null;
    propertiesBar.innerHTML = "";
    draw();
  } else if (selectedText) {
    let index = objects.indexOf(selectedText);
    selectedText.input.remove();
    textBoxes.splice(index, 1);
    selectedText = null;
    propertiesBar.innerHTML = "";
  }
});
document.querySelector(".saveAsImage").addEventListener("click", saveAsImage);
function canvasSize() {
  const style = window.getComputedStyle(canvass);
  const canvassRect = canvass.getBoundingClientRect();
  width.value = changeValues(measurement.width);
  height.value = changeValues(measurement.height);
  const rect = {
    width: canvassRect.width - parseFloat(style.padding) * 2,
    height: canvassRect.height - parseFloat(style.padding) * 2,
  };
  if (canvasOrientation === "potrait") {
    if (measurement.height > measurement.width) {
      const newWidth = (measurement.width / measurement.height) * rect.height;
      canvas.style.width = newWidth + "px";
      canvas.style.height = rect.height + "px";
    } else {
      const newHeight = (measurement.height / measurement.width) * rect.width;
      canvas.style.width = rect.width + "px";
      canvas.style.height = newHeight + "px";
    }
  } else {
    if (measurement.height > measurement.width) {
      const newHeight = (measurement.width / measurement.height) * rect.width;
      canvas.style.width = rect.width + "px";
      canvas.style.height = newHeight + "px";
    } else {
      const newWidth = (measurement.height / measurement.width) * rect.height;
      canvas.style.width = newWidth + "px";
      canvas.style.height = rect.height + "px";
    }
  }
  canvas.width = parseFloat(canvas.style.width);
  canvas.height = parseFloat(canvas.style.height);
  fitToPage();
  draw();
}
function changeValues(x) {
  if (whatsMeasured === "px") {
    return x;
  } else if (whatsMeasured === "pt") {
    return x / 1.333;
  } else if (whatsMeasured === "in") {
    return x / 96;
  } else if (whatsMeasured === "m") {
    return x / 3780;
  } else if (whatsMeasured === "cm") {
    return x / 37.8;
  } else if (whatsMeasured === "mm") {
    return x / 3.78;
  }
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
function fitToPage() {
  const style = window.getComputedStyle(canvass);
  const rect = canvas.getBoundingClientRect();
  const container = canvass.getBoundingClientRect();

  const widthDifference =
    rect.width - container.width + parseFloat(style.padding) * 2;
  const heightDifference =
    rect.height - container.height + parseFloat(style.padding) * 2;
  console.log(rect.height, container.height);
  if (heightDifference > 0 || widthDifference > 0) {
    if (heightDifference > widthDifference) {
      canvas.style.width =
        rect.width - heightDifference - parseFloat(style.padding) + "px";
      canvas.style.height =
        rect.height - heightDifference - parseFloat(style.padding) + "px";
    } else {
      canvas.style.width =
        rect.width - widthDifference - parseFloat(style.padding) + "px";
      canvas.style.height =
        rect.height - widthDifference - parseFloat(style.padding) + "px";
    }
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

function addImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  img.onload = () => {
    const sprite = new Images(img, img.width, img.height, file);
    objects.push(sprite);
    images.push(sprite);
    draw();
  };
}

function addTextbox() {
  const textBox = new TextBox();
  textBox.addObject();
  textBoxes.push(textBox);
}
function addPolygon() {
  const polygon = new Polygon();
  objects.push(polygon);
  draw();
}
function addLine() {
  const line = new Line();
  objects.push(line);
  draw();
}
function addRectangle() {
  const rect = new Rectangle();
  objects.push(rect);
  draw();
}
function addEllipse() {
  const ellipse = new Ellipse();
  objects.push(ellipse);
  draw();
}

function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (evt.x - rect.left) * scaleX,
    y: (evt.y - rect.top) * scaleY,
  };
}

function textMousePos(evt) {
  const rect = canvass.getBoundingClientRect();
  return {
    x: evt.x - rect.left,
    y: evt.y - rect.top,
  };
}
async function generateCard() {
  selectedObj = null;
  selectedText = null;
  generationArea.innerHTML = "";
  const canvaDefault = canvas.getBoundingClientRect();
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

  const scale = Math.min(
    cellWidth / canvaDefault.width,
    cellHeight / canvaDefault.height
  );
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
  for (let i = 0; i < iterationLength; i++) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const obj of objects) {
      if (!images.includes(obj)) {
        obj.addObject();
      }
    }
    for (const imgObj of images) {
      if (imgObj.iteratedFiles && imgObj.iteratedFiles.length > i) {
        await imgObj.drawIteratedImage(i);
      } else {
        imgObj.addObject();
      }
    }
    const canvasData = canvas.toDataURL();
    const div = document.createElement("div");
    const img = document.createElement("img");
    img.src = canvasData;

    div.style.position = "relative";
    div.style.backgroundColor = "lightblue";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    if (renderPageResolution === "auto") {
      div.style.width = "90%";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      div.append(img);
      generationArea.append(div);
      div.style.height = `${
        (div.getBoundingClientRect().width * canvaDefault.height) /
        canvaDefault.width
      }px`;
      textBoxes.forEach((textbox) => {
        div.append(
          textbox.generateText(i, {
            width: div.getBoundingClientRect().width,
            height: div.getBoundingClientRect().height,
          })
        );
      });
    } else {
      if (boxCountInPage >= boxesPerPage) {
        currentPage = createNewPage();
        boxCountInPage = 0;
      }

      div.style.width = `${canvaDefault.width * scale}px`;
      div.style.height = `${canvaDefault.height * scale}px`;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";

      div.append(img);
      currentPage.append(div);

      textBoxes.forEach((textbox) => {
        div.append(
          textbox.generateText(i, {
            width: div.getBoundingClientRect().width,
            height: div.getBoundingClientRect().height,
          })
        );
      });

      boxCountInPage++;
    }
  }
}

canvas.addEventListener("mousedown", (event) => {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });

  selectedObj = null;
  isDraggingObject = false;
  if (cloneObj) {
    let cloned = cloneObj.showClone();
    objects.push(cloned);
  } else {
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].whatSelected(pos)) {
        selectedObj = objects[i];
        isRotatingObject = false;
        selectedText = null;
        selectedObj.isDoubleClicked = false;
        selectedObj.formatProperties();
        isDraggingObject = true;
        break;
      }
    }
  }

  lastMouseX = pos.x;
  lastMouseY = pos.y;
  draw();
});
canvass.addEventListener("mousedown", (event) => {
  const textPos = textMousePos(event);
  if (cloneText) {
    const cloned = cloneText.showClone();
    cloned.input.style.left = `${
      textPos.x - cloneText.input.getBoundingClientRect().width / 2
    }px`;
    cloned.input.style.top = `${
      textPos.y - cloneText.input.getBoundingClientRect().height / 2
    }px`;
    textBoxes.push(cloneText);
  } else {
    for (let i = textBoxes.length - 1; i >= 0; i--) {
      if (textBoxes[i].whatSelected({ x: event.clientX, y: event.clientY })) {
        if (textBoxes[i].isDoubleClicked === false) {
          event.preventDefault();
        }
        selectedText = textBoxes[i];
        selectedObj = null;
        isRotatingObject = false;
        selectedText.formatProperties();
        isDraggingText = true;
        break;
      }
    }
  }

  if (selectedText) {
    selectedText.isDoubleClicked = false;
  }
  textLastMouseX = textPos.x;
  textLastMouseY = textPos.y;
  draw();
});

canvas.addEventListener("dblclick", (event) => {
  const pos = getMousePos(canvas, event);
  for (let i = objects.length - 1; i >= 0; i--) {
    if (objects[i].whatSelected({ x: pos.x, y: pos.y })) {
      objects[i].doubleClicked(pos);
      selectedObj = objects[i];
      draw();
    }
  }
});
canvass.addEventListener("dblclick", (event) => {
  for (let i = textBoxes.length - 1; i >= 0; i--) {
    if (textBoxes[i].whatSelected({ x: event.clientX, y: event.clientY })) {
      textBoxes[i].isDoubleClicked = textBoxes[i].isDoubleClicked
        ? false
        : true;
      selectedText = textBoxes[i];
      selectedText.formatSelected({ x: event.clientX, y: event.clientY });
    }
  }
});
canvas.addEventListener("mouseup", () => {
  isDraggingObject = false;
});
canvass.addEventListener("mouseup", () => {
  isDraggingText = false;
  isDraggingObject = false;
});

canvas.addEventListener("mousemove", (event) => {
  const pos = getMousePos(canvas, { x: event.clientX, y: event.clientY });
  if (cloneObj) {
    cloneObj.formatSelected(pos);
  } else if ((isDraggingObject || isRotatingObject) && selectedObj) {
    selectedObj.formatSelected(pos);
    selectedObj.formatProperties();
  }
  lastMouseX = pos.x;
  lastMouseY = pos.y;
  draw();
});
canvass.addEventListener("mousemove", (event) => {
  const textPos = textMousePos({ x: event.clientX, y: event.clientY });

  if (cloneText) {
    cloneText.input.style.left = `${
      textPos.x - cloneText.input.getBoundingClientRect().width / 2
    }px`;
    cloneText.input.style.top = `${
      textPos.y - cloneText.input.getBoundingClientRect().height / 2
    }px`;
  } else if (isDraggingText && selectedText) {
    selectedText.formatSelected({ x: event.clientX, y: event.clientY });
    selectedText.formatProperties();
  }
  textLastMouseX = textPos.x;
  textLastMouseY = textPos.y;
  draw();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let snap = { x: null, y: null };
  const objectsSnapped = [...objects, ...textBoxes];
  let selection = null;
  if (selectedObj || selectedText) {
    for (let i = 0; i < objectsSnapped.length; i++) {
      if (
        objectsSnapped[i] !== selectedObj &&
        objectsSnapped[i] !== selectedText
      ) {
        selection = selectedObj != null ? selectedObj : selectedText;
        let select =
          selectedObj !== null
            ? selectedObj.whereToSnap().pos
            : selectedText.whereToSnap().pos;
        let snapX = objectsSnapped[i].whereToSnap().x;
        let snapY = objectsSnapped[i].whereToSnap().y;
        let pos = objectsSnapped[i].whereToSnap().pos;
        for (let j = 0; j < snapX.length; j++) {
          if (
            Math.abs(select.x - snapX[j]) < 10 &&
            (Math.abs(pos.y + pos.height - select.y) < 50 ||
              Math.abs(pos.y - select.y) < 20 ||
              Math.abs(pos.y - select.y - select.height) < 20)
          ) {
            snap.x = snapX[j];
            break;
          }
        }
        for (let j = 0; j < snapY.length; j++) {
          if (
            Math.abs(select.y - snapY[j]) < 10 &&
            (Math.abs(pos.x + pos.width - select.x) < 50 ||
              Math.abs(pos.x - select.x) < 10 ||
              Math.abs(pos.x - select.x - select.width) < 10)
          ) {
            snap.y = snapY[j];
            break;
          }
        }
      }
    }
    if (snap.x != null) {
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(snap.x, 0);
      ctx.lineTo(snap.x, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
      selection.changeLocation(snap.x, "x");
      lastMouseX = snap.x;
    }
    if (snap.y != null) {
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, snap.y);
      ctx.lineTo(canvas.width, snap.y);
      ctx.stroke();
      ctx.setLineDash([]);
      selection.changeLocation(snap.y, "y");
      lastMouseY = snap.y;
    }
  }
  if (cloneObj) {
    cloneObj.addObject();
  }
  objects.forEach((obj) => {
    obj.addObject();
  });
}

draw();
