import Formats from "./formats.js";
import LineUtils from "./lineUtils.js";
import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties } from "../variable.js";
import { applyOpacityToHex, backValues, changeValues, radToDeg } from "../utils/convert.js";
import requestDraw from "../utils/draw.js";
import { pauseSaving, continueSaving } from "../state/save.js";

export default class Images extends Formats {
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
    if (objectProperties.selectedObj === this ) {
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
          .collection(`img${canvasProperties.formerName}`)
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
              .collection(`img${canvasProperties.formerName}`)
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
            .collection(`img${canvasProperties.formerName}`)
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
              .collection(`img${canvasProperties.formerName}`)
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

    propertiesBar.querySelector("input[name='iteratedFiles']").addEventListener("change", (e) => {
      this.changeProperties(e);
    });
    super.addingListeners();
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
      pauseSaving()
      const loader = new LoaderManager(e.target.files.length); // Set max items to the number of selected files
      loader.createLoader();
      await new Promise((resolve) => setTimeout(resolve, 50));
      // Option 1: Use for...of loop (recommended)
      const files = Array.from(e.target.files);

      for (let i = 0; i < files.length; i++) {
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
              await db.collection(`img${canvasProperties.formerName}`).add({
                id: imageID,
                image: reader.result,
                entryDate: new Date().getTime(),
              });
              this.originalFiles.push(imageID);
              loader.incrementOriginalState();
              if (i % 10 === 0) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
              }
              this.formatProperties();
              URL.revokeObjectURL(url);
              resolve(true);
            };
          };
        });
      }
continueSaving()
    }

    requestDraw();
  }
  async backToDefault() {
    this.width = this.originalWidth;
    this.height = this.originalHeight;
    URL.revokeObjectURL(this.image.url);
    const imageIterateFile = await db
      .collection(`img${canvasProperties.formerName}`)
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
        .collection(`img${canvasProperties.formerName}`)
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
        .collection(`img${canvasProperties.formerName}`)
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