export const objectProperties = {
  objects: [],
  images: [],
  textBoxes: [],
  cloneObj: null,
  pen: null,
  multipleSelect: false,
  multipleSelectArr: [],
  drawingCoordinate: { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
  drawingStart: false,
  isDraggingObject: false,
  isRotatingObject: false,
  lastMouseX: 0,
  lastMouseY: 0,
  scale: 1,
  panX: 0,
  panY: 0,
  multipleSelectCoor: {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  },
  isPanning: false,
  startPanning: false,
  duplicateClicked: false,
  isDrawing: null,
  startX: 0,
  startY: 0,
  drawingImage: null,
  selectedObj: null,
  clipped: null,
   previousClip : null,
   previousOpacity : 0,
   clippedObject : null,
};
export const canvasProperties = {
  whatsMeasured: "px",
  measurement: { width: 817, height: 1055 },
  scaleRatio: 1,
  newWidth: 0,
  newHeight: 0,
  generateInfo: {
    renderPage: "auto",
    renderWidth: 100,
    renderHeight: 100,
    noPerRow: 1,
    noPerColumn: 1,
    spacing: 30,
  },
  formerName: ""
};

export const defaultFonts = [
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

export const newFonts = JSON.parse(localStorage.getItem("fontNames")) || [];
