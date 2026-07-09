import Formats from "./formats.js";
import {
  canvas,
  ctx,
  canvass,
  propertiesBar,
  db,
  thresholds,
} from "../constants.js";
import {
  objectProperties,
  defaultFonts,
  newFonts,
  canvasProperties,
} from "../variable.js";
import {
  applyOpacityToHex,
  backValues,
  changeValues,
  radToDeg,
  getFormatFromExtension,
} from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
import { adapt } from "../state/canvas.js";
import { reverseMousePos } from "../utils/mousePos.js";
import { notify } from "../utils/uiHelpers.js";
import { initPickrs, destroyPickrs } from "../utils/colorPicker.js";

const getAllFonts = () => [...defaultFonts, ...newFonts];

export default class TextBox extends Formats {
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
    this.maintainedHeight = 0;
    this.originalText = "";
    this.originalFontSize = "";
    this.originalPosition = { x: this.x, y: this.y };
    this.height = 0;
    this.textAllign = "left";
    this.clipped = "none";
    this.shadow = false;
    this.lineHeight = adapt(30);
    this.textArea = "";
    this.iterated = false;
    this.clipped = "none";
    this.outline = false;
    this.colorFill = "uniform";
    this.formatIterated = "none";
    this.iterateAllign = "left";
    this.iterateVAllign = "top";
    this._isDoubleClicked = false;
    this._dimensionsDirty = true;
    this._cachedLines = null;
    this._cachedTextHeight = 0;
  }

  get isDoubleClicked() {
    return this._isDoubleClicked;
  }

  set isDoubleClicked(val) {
    const oldVal = this._isDoubleClicked;
    this._isDoubleClicked = val;
    if (oldVal && !val) {
      this.cleanupDOM();
    }
  }

  cleanupDOM() {
    if (this.textPlace && this.textPlace.parentNode) {
      this.textPlace.parentNode.removeChild(this.textPlace);
    }
    if (this.measurer && this.measurer.parentNode) {
      this.measurer.parentNode.removeChild(this.measurer);
      this.measurer = null;
    }
  }

  recalculateDimensions(targetCtx = ctx) {
    const lines = this.text.split("\n");
    const oldFont = targetCtx.font;
    const oldAlign = targetCtx.textAlign;
    const oldBaseline = targetCtx.textBaseline;

    targetCtx.font = `${this.fontStyle} ${this.fontSize}px ${this.fontFamily}`;
    targetCtx.textAlign = this.textAllign;
    targetCtx.textBaseline = "alphabetic";

    let maxWidth = 0;
    let textHeight = 0;

    lines.forEach((line) => {
      const metrics = targetCtx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
      textHeight =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    });

    this.width = maxWidth;
    this.height = textHeight + (lines.length - 1) * this.lineHeight;
    this._cachedLines = lines;
    this._cachedTextHeight = textHeight;
    this._dimensionsDirty = false;

    targetCtx.font = oldFont;
    targetCtx.textAlign = oldAlign;
    targetCtx.textBaseline = oldBaseline;
  }
  addObject(targetCtx = ctx) {
    if (this.isDoubleClicked) {
      return;
    }

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

    if (this._dimensionsDirty || !this._cachedLines) {
      this.recalculateDimensions(targetCtx);
    }

    const lines = this._cachedLines;
    const textHeight = this._cachedTextHeight;

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    targetCtx.translate(centerX, centerY);
    targetCtx.rotate(this.angle);
    targetCtx.scale(this.scaleX, this.scaleY);

    targetCtx.font = `${this.fontStyle} ${this.fontSize}px ${this.fontFamily}`;
    targetCtx.textAlign = this.textAllign;
    targetCtx.textBaseline = "alphabetic";

    const startY = -this.height / 2 + textHeight;

    // ✅ FIX: Correct X position based on alignment
    let drawX = -this.width / 2; // left default
    if (this.textAllign === "center") drawX = 0;
    if (this.textAllign === "right") drawX = this.width / 2;

    lines.forEach((line, index) => {
      const y = startY + index * this.lineHeight;

      if (this.outline) {
        targetCtx.save();
        targetCtx.shadowColor = "transparent";
        targetCtx.shadowBlur = 0;
        targetCtx.shadowOffsetX = 0;
        targetCtx.shadowOffsetY = 0;
        targetCtx.beginPath();
        targetCtx.lineWidth = this.outlineThickness;
        targetCtx.strokeStyle = this.outlineColor;
        targetCtx.setLineDash(this.outlineType);
        targetCtx.strokeText(line, drawX, y);
        targetCtx.closePath();
        targetCtx.restore();
      }

      if (this.colorFill !== "none") {
        targetCtx.fillStyle = this.colorType();
        targetCtx.fillText(line, drawX, y);
      }
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
        -this.width / 2 - thresholds.sWidth() / 2,
        -this.height / 2 - thresholds.sWidth() / 2,
        this.width + thresholds.sWidth(),
        this.height + thresholds.sWidth(),
      );
      targetCtx.closePath();
    }

    targetCtx.restore();
  }

  showClone(isUndo = false) {
    let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.textPlace = document.createElement("textarea");
    if (!isUndo) {
      clone.id = crypto.randomUUID();
    }
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
      this.x += mouse.x - objectProperties.lastMouseX;
      this.y += mouse.y - objectProperties.lastMouseY;
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
  <label class="uniform-div" style="margin-top:1rem">
  <span>Vertical Iterate Align</span>
  <select name="iterateVAllign" class="iterateVAllign">
    <option value="top" ${this.iterateVAllign === "top" ? "selected" : ""}>Top</option>
    <option value="center" ${this.iterateVAllign === "center" ? "selected" : ""}>Center</option>
    <option value="bottom" ${this.iterateVAllign === "bottom" ? "selected" : ""}>Bottom</option>
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
          const existingFonts = await db.collection("fonts").get();
          const fontNames = (existingFonts || []).map((f) => f.fontFamily);
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
          newFonts.push(fontFamily);

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
          if (!newFonts.includes(fontFamily)) {
            newFonts.push(fontFamily);
          }
          this.fonts = [];
          this.formatProperties();
          requestDraw();
        } catch (error) {
          console.error("Error storing font:", error);
          alert("Failed to store the uploaded font. Please try again.");
        }
      });

    super.similarPropties();
    // Bind inputs
    propertiesBar
      .querySelectorAll(
        "textarea, select, button#shadowToggle,button#iterateToggle",
      )
      .forEach((el) => {
        if (el.id === "iterateToggle") {
          el.addEventListener("click", () => {
            this.iterated = !this.iterated;
            if (this.iterated) {
              this.originalText = this.text;
              const lines = this.textArea
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l.length > 0);
              this.text = lines[0] || this.originalText;
            } else {
              this.text = this.originalText || "";
            }
            this._dimensionsDirty = true;
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
    initPickrs(propertiesBar);
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
    if (name === "iterateVAllign") {
      this.iterateVAllign = e.target.value;
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
      if (this.iterated) {
        const lines = this.textArea
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        this.text = lines[0] || "";
        this._dimensionsDirty = true;
      }
    }
    if (name === "formatIterated") {
      this.formatIterated = e.target.value;
    }
    if (name === "fontFamily") {
      this.fonts = getAllFonts().filter((font) =>
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
            const currentAllFonts = getAllFonts();
            if (!currentAllFonts.includes(this.fontFamily)) {
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

                console.log(`Font ${this.fontFamily} loaded from IndexedDB`);
              } else {
                notify("Font not found in database");
                this.fontFamily = "sans-serif";
              }
              if (!newFonts.includes(this.fontFamily)) {
                newFonts.push(this.fontFamily);
              }
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
    // Shadow fields & blur
    if (name === "blur") {
      this.blur = backValues(Number(e.target.value) || 0);
      if (this.blur < 0) this.blur = 0;
    }
    if (name === "shadowColor") this.shadowColor = e.target.value;
    if (name === "shadowBlur")
      this.shadowBlur = backValues(Number(e.target.value) || 0);
    if (name === "shadowOffsetX")
      this.shadowOffsetX = backValues(Number(e.target.value) || 0);
    if (name === "shadowOffsetY")
      this.shadowOffsetY = backValues(Number(e.target.value) || 0);

    if (
      name === "text" ||
      name === "width" ||
      name === "height" ||
      name === "fontSize" ||
      name === "lineHeight" ||
      name === "fontFamily" ||
      name === "fontStyle" ||
      name === "textAllign"
    ) {
      this._dimensionsDirty = true;
    }
    requestDraw();
  }

  doubleClicked(mouse) {
    const padding = () => adapt(5);
    const rect = reverseMousePos(canvas, {
      x: this.x,
      y: this.y,
    });
    const paddingVal = padding();
    const borderVal =
      thresholds.slineWidth() / adapt(canvasProperties.scaleRatio);

    this._dimensionsDirty = true;
    this.isDoubleClicked = true;
    // Create or reuse a hidden measuring element
    if (!this.measurer) {
      this.measurer = document.createElement("div");
      this.measurer.style.position = "absolute";
      this.measurer.style.visibility = "hidden";
      this.measurer.style.height = "auto";
      this.measurer.style.width = "auto";
      this.measurer.style.whiteSpace = "pre";
      this.measurer.style.wordWrap = "break-word";
      document.body.appendChild(this.measurer);
    }

    // Copy all text styles to measurer
    const isBold = this.fontStyle.includes("bold");
    const isItalic = this.fontStyle.includes("italic");
    const weightVal = isBold ? "bold" : "normal";
    const styleVal = isItalic ? "italic" : "normal";

    this.measurer.style.fontSize = `${adapt(this.fontSize) / adapt(canvasProperties.scaleRatio)}px`;
    this.measurer.style.fontFamily = this.fontFamily;
    this.measurer.style.fontStyle = styleVal;
    this.measurer.style.fontWeight = weightVal;
    this.measurer.style.lineHeight = `${adapt(this.lineHeight) / adapt(canvasProperties.scaleRatio)}px`;
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
    this.textPlace.style.left = `${rect.x - paddingVal - borderVal}px`;
    this.textPlace.style.top = `${rect.y - paddingVal - borderVal}px`;
    this.textPlace.style.border = `${thresholds.slineWidth() / adapt(canvasProperties.scaleRatio)}px dashed ${thresholds.sColor}`;
    this.textPlace.style.fontSize = `${adapt(this.fontSize) / adapt(canvasProperties.scaleRatio)}px`;
    this.textPlace.style.fontFamily = this.fontFamily;
    this.textPlace.style.fontStyle = styleVal;
    this.textPlace.style.fontWeight = weightVal;
    this.textPlace.style.textAlign = this.textAllign;
    this.textPlace.style.lineHeight = `${adapt(this.lineHeight) / adapt(canvasProperties.scaleRatio)}px`;
    this.textPlace.style.color = this.color[0];
    this.textPlace.style.boxSizing = "border-box";
    this.textPlace.style.padding = `${padding()}px`;
    this.textPlace.style.overflow = "hidden";
    this.textPlace.style.resize = "none";
    this.textPlace.style.whiteSpace = "pre";
    this.textPlace.style.wordWrap = "break-word";

    // Set exact width based on canvasProperties.measurement
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
      this._dimensionsDirty = true;

      // Update measurer with new text
      this.measurer.textContent = this.text || " ";

      // Get dimensions from measurer (not the textarea)
      const newWidth = this.measurer.offsetWidth;
      const newHeight = this.measurer.offsetHeight;

      // Apply to textarea
      this.textPlace.style.width = `${Math.max(newWidth, adapt(10)) + adapt(5)}px`;
      this.textPlace.style.height = `${Math.max(newHeight, adapt(5)) + adapt(5)}px`;
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
    this._dimensionsDirty = true;
  }
  drawIteratedImage(i) {
    const texts = this.textArea
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (i === 0) {
      this.maintainedWidth = this.width;
      this.maintainedHeight = this.height;
      this.originalText = this.text;
      this.originalFontSize = this.fontSize;
      this.originalPosition = { x: this.x, y: this.y };
    } else {
      this.fontSize = this.originalFontSize;
      this.text = this.originalText;
      this.x = this.originalPosition.x;
      this.y = this.originalPosition.y;
    }
    if (this.iterated && i < texts.length) {
      ctx.font = `${this.fontStyle} ${this.originalFontSize}px ${this.fontFamily}`;
      ctx.textAlign = this.textAllign;
      ctx.textBaseline = "alphabetic";
      if (this.formatIterated === "shrinkToFit") {
        const lines = texts[i].split("\n");
        let maxLineWidth = 0;
        lines.forEach((l) => {
          maxLineWidth = Math.max(maxLineWidth, ctx.measureText(l).width);
        });
        const textWidth = maxLineWidth;

        if (textWidth > this.maintainedWidth) {
          const scale = this.maintainedWidth / textWidth;
          this.fontSize = this.originalFontSize * scale;
        } else {
          this.fontSize = this.originalFontSize;
        }
        this.text = texts[i];
      } else if (this.formatIterated === "Fit") {
        const lines = texts[i].split("\n");
        let maxLineWidth = 0;
        lines.forEach((l) => {
          maxLineWidth = Math.max(maxLineWidth, ctx.measureText(l).width);
        });
        const textWidth = maxLineWidth;

        const scale = this.maintainedWidth / textWidth;
        this.fontSize = this.originalFontSize * (scale > 0 ? scale : 1);
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

      this.recalculateDimensions(ctx);

      if (this.iterateAllign === "center") {
        this.x =
          this.originalPosition.x + this.maintainedWidth / 2 - this.width / 2;
      } else if (this.iterateAllign === "right") {
        this.x = this.originalPosition.x + this.maintainedWidth - this.width;
      } else {
        this.x = this.originalPosition.x;
      }

      if (this.iterateVAllign === "center") {
        this.y =
          this.originalPosition.y + this.maintainedHeight / 2 - this.height / 2;
      } else if (this.iterateVAllign === "bottom") {
        this.y = this.originalPosition.y + this.maintainedHeight - this.height;
      } else {
        this.y = this.originalPosition.y;
      }

      this._dimensionsDirty = true;
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
