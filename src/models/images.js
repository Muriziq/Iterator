import Formats from "./formats.js";
import LineUtils from "./lineUtils.js";
import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties, canvasProperties } from "../variable.js";
import { changeValues, backValues, radToDeg, applyOpacityToHex } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
import { pauseSaving, continueSaving } from "../state/save.js";
import { initPickrs, destroyPickrs } from "../utils/colorPicker.js";
import LoaderManager from "./loader.js";
import { notify } from "../utils/uiHelpers.js";
export default class Images extends Formats {
  constructor(x = 0, y = 0, image = null, width = 0, aspectRatio = 1, originalFile = null, fileName = "") {
    super();
    this.x = x;
    this.type = "image";
    this.y = y;
    this.width = width;
    this.fileName = fileName ? [fileName] : [];
    this.aspectRatio = aspectRatio;
    this.height = this.width * this.aspectRatio;
    this.image = image;
    this.selectedArea = null;
    this.originalFiles = originalFile ? [originalFile] : [];
    this.selectedFile = originalFile;
    this.maintainAspect = false;
    this.clipped = "none";
    this.formatIterated = "maintainSize";
    this.isConverted = false;
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
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    targetCtx.translate(centerX, centerY);
    targetCtx.rotate(this.angle);
    targetCtx.scale(this.scaleX, this.scaleY);
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.globalAlpha = this.opacity / 100;
    if (this.image && this.image.complete && this.image.naturalWidth > 0) {
      targetCtx.drawImage(
        this.image,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
      );
    } else {
      targetCtx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      targetCtx.strokeRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
      );
    }
    targetCtx.closePath();
    targetCtx.restore();
    if (this.blur > 0 || this.shadow) {
      targetCtx.filter = "none";
      targetCtx.shadowColor = "transparent";
      targetCtx.shadowBlur = 0;
      targetCtx.shadowOffsetX = 0;
      targetCtx.shadowOffsetY = 0;
    }
    if (objectProperties.selectedObj === this ) {
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
        this.x += mouse.x - objectProperties.lastMouseX;
        this.y += mouse.y - objectProperties.lastMouseY;
      }
    }
  }
  showClone(isUndo = false) {
    const clone = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
    );
    if (!isUndo) {
      clone.id = crypto.randomUUID();
    }
    return clone;
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
          .collection(`img${canvasProperties.formerName}`)
          .doc({ id: this.originalFiles[i] })
          .get();
        const imageP = (imageFiles && imageFiles.image) ? imageFiles.image : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        if (this.image && this.image.url) URL.revokeObjectURL(this.image.url);
        let newImg = new Image();
        newImg.src = imageP;
        await new Promise((resolve) => {
          newImg.onload = () => {
            this.image = newImg;
            this.selectedFile = this.originalFiles[i];
            this.aspectRatio = newImg.height / newImg.width;
            resolve(true);
          };
          newImg.onerror = () => {
            console.warn("Failed to load image, using fallback");
            const fallbackImg = new Image();
            fallbackImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            fallbackImg.onload = () => {
              this.image = fallbackImg;
              this.selectedFile = this.originalFiles[i];
              this.aspectRatio = fallbackImg.height / fallbackImg.width;
              resolve(true);
            };
          };
        });
        requestDraw();
        this.formatProperties();
      });

      div.querySelector(".change").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !file.type || !file.type.startsWith("image/")) {
          notify(`File "${file ? file.name : "none"}" is not an Image File`);
          return;
        }
        const loader = new LoaderManager(1);
        loader.createLoader();
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.url = url;
        img.onload = () => {
          this.fileName[i] = file.name;
          this.aspectRatio = img.height / img.width;
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
            await db
              .collection(`img${canvasProperties.formerName}`)
              .doc({ id: this.originalFiles[i] })
              .update({
                image: reader.result,
                entryDate: new Date().getTime(),
              });
            if (this.selectedFile === this.originalFiles[i]) {
              if (this.image && this.image.url) URL.revokeObjectURL(this.image.url);
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
            .collection(`img${canvasProperties.formerName}`)
            .doc({ id: deleteImage })
            .delete();
          this.originalFiles.splice(i, 1);
          if (deleteImage === this.selectedFile) {
            if (this.image && this.image.url) URL.revokeObjectURL(this.image.url);
            const newIndex =
              i >= this.originalFiles.length
                ? this.originalFiles.length - 1
                : i;
            const newImageFiles = await db
              .collection(`img${canvasProperties.formerName}`)
              .doc({ id: this.originalFiles[newIndex] })
              .get();
            const newImage = (newImageFiles && newImageFiles.image) ? newImageFiles.image : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            await new Promise((resolve) => {
              const img = new Image();
              img.src = newImage;
              img.onload = () => {
                this.image = img;
                this.selectedFile = this.originalFiles[newIndex];
                this.aspectRatio = img.height / img.width;
                resolve(true);
              };
              img.onerror = () => {
                console.warn("Failed to load image, using fallback");
                const fallbackImg = new Image();
                fallbackImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                fallbackImg.onload = () => {
                  this.image = fallbackImg;
                  this.selectedFile = this.originalFiles[newIndex];
                  this.aspectRatio = fallbackImg.height / fallbackImg.width;
                  resolve(true);
                };
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

    const shadowToggle = document.getElementById("shadowToggle");
    if (shadowToggle) {
      shadowToggle.addEventListener("click", () => {
        this.shadow = !this.shadow;
        this.formatProperties();
        requestDraw();
      });
    }

    const blurToggle = document.getElementById("blurToggle");
    if (blurToggle) {
      blurToggle.addEventListener("click", () => {
        this.blurEnabled = !this.blurEnabled;
        this.formatProperties();
        requestDraw();
      });
    }

    propertiesBar.querySelector("input[name='iteratedFiles']").addEventListener("change", (e) => {
      this.changeProperties(e);
    });
    initPickrs(propertiesBar);
  }
  async changeProperties(e) {
    const name = e.target.name;

    if (name === "angle") {
      this.angle = radToDeg(Number(e.target.value) || 0, "rad");
      requestDraw();
      return;
    }

    if (e.target.type === "number") {
      let value = backValues(Number(e.target.value) || 0);
      
      // Clamp width, height, blur, and shadowBlur to positive values.
      // Coordinates (x, y) and shadow offsets (shadowOffsetX, shadowOffsetY) can be negative.
      if (["width", "height", "blur", "shadowBlur"].includes(name)) {
        value = value <= 0 ? 0 : value;
      }
      
      if (!isNaN(value) && value !== null) {
        if (name === "opacity") {
          this.opacity = Math.max(0, Math.min(100, Number(e.target.value) || 0));
        } else {
          this[name] = value;
        }
      }
    }

    if (name === "iteratedFiles") {
      const files = Array.from(e.target.files).filter(
        (file) => file.type && file.type.startsWith("image/")
      );
      if (files.length === 0) {
        return;
      }
      pauseSaving();
      const loader = new LoaderManager(files.length);
      loader.createLoader();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const batchSize = 10;

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(
          batch.map((file) => {
            return new Promise((resolve) => {
              const url = URL.createObjectURL(file);
              const img = new Image();
              img.src = url;
              img.url = url;
              img.onload = () => {
                this.fileName.push(file.name);
                const reader = new FileReader();
                reader.readAsDataURL(file);

                reader.onload = async () => {
                  try {
                    const imageID = crypto.randomUUID();
                    await db.collection(`img${canvasProperties.formerName}`).add({
                      id: imageID,
                      image: reader.result,
                      entryDate: new Date().getTime(),
                    });
                    this.originalFiles.push(imageID);
                    loader.incrementOriginalState();
                    URL.revokeObjectURL(url);
                    resolve(true);
                  } catch (err) {
                    console.error("Failed to save image to IndexedDB:", err);
                    loader.incrementOriginalState();
                    URL.revokeObjectURL(url);
                    resolve(false);
                  }
                };
                reader.onerror = () => {
                  console.error("FileReader failed for file:", file.name);
                  loader.incrementOriginalState();
                  URL.revokeObjectURL(url);
                  resolve(false);
                };
              };
              img.onerror = () => {
                console.warn("Failed to load image:", file.name);
                loader.incrementOriginalState();
                URL.revokeObjectURL(url);
                resolve(false);
              };
            });
          })
        );
        this.formatProperties();
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      continueSaving();
    }

    requestDraw();
  }
  async backToDefault() {
    this.width = this.originalWidth;
    this.height = this.originalHeight;
    if (this.image && this.image.url) URL.revokeObjectURL(this.image.url);
    const imageIterateFile = await db
      .collection(`img${canvasProperties.formerName}`)
      .doc({ id: this.selectedFile })
      .get();
    let imageIterate = (imageIterateFile && imageIterateFile.image) ? imageIterateFile.image : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    await new Promise((resolve) => {
      const img = new Image();
      img.src = imageIterate;
      img.onload = () => {
        this.image = img;
        this.aspectRatio = img.height / img.width;
        resolve(true);
      };
      img.onerror = () => {
        console.warn("Failed to load image, using fallback");
        const fallbackImg = new Image();
        fallbackImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        fallbackImg.onload = () => {
          this.image = fallbackImg;
          this.aspectRatio = fallbackImg.height / fallbackImg.width;
          resolve(true);
        };
      };
    });
  }
  async drawIteratedImage(i) {
    if (this.originalFiles.length > i) {
      if (i === 0) {
        this.originalWidth = this.width;
        this.originalHeight = this.height;
      }
      if (this.image && this.image.url) URL.revokeObjectURL(this.image.url);
      const imageIterateFile = await db
        .collection(`img${canvasProperties.formerName}`)
        .doc({ id: this.originalFiles[i] })
        .get();
      let imageIterate = (imageIterateFile && imageIterateFile.image) ? imageIterateFile.image : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      await new Promise((resolve) => {
        const img = new Image();
        img.src = imageIterate;
        img.onload = () => {
          this.image = img;
          this.aspectRatio = img.height / img.width;
          resolve(true);
        };
        img.onerror = () => {
          console.warn("Failed to load image, using fallback");
          const fallbackImg = new Image();
          fallbackImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          fallbackImg.onload = () => {
            this.image = fallbackImg;
            this.aspectRatio = fallbackImg.height / fallbackImg.width;
            resolve(true);
          };
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
      if (this.image && this.image.url) URL.revokeObjectURL(this.image.url);
      const imageIterateFile = await db
        .collection(`img${canvasProperties.formerName}`)
        .doc({ id: this.selectedFile })
        .get();
      let imageIterate = (imageIterateFile && imageIterateFile.image) ? imageIterateFile.image : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      await new Promise((resolve) => {
        const img = new Image();
        img.src = imageIterate;
        img.onload = () => {
          this.image = img;
          this.aspectRatio = img.height / img.width;
          resolve(true);
        };
        img.onerror = () => {
          console.warn("Failed to load image, using fallback");
          const fallbackImg = new Image();
          fallbackImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          fallbackImg.onload = () => {
            this.image = fallbackImg;
            this.aspectRatio = fallbackImg.height / fallbackImg.width;
            resolve(true);
          };
        };
      });
    }
  }
  doubleClicked(mouse) {
    objectProperties.isRotatingObject = true;
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