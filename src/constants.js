import { adapt } from "./state/canvas.js";

export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d");
export const canvass = document.querySelector(".canvas");
export const canvassDiv = canvass.querySelector("div");
export const propertiesBar = document.getElementById("properties");
export const notification = document.querySelector(".notification");
export const editclip = document.querySelector(".editclip");
export const width = document.getElementById("width");
export const height = document.getElementById("height");
export const saveWorker = new Worker("saveWorker.js");
export const measurementArr = [
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
export const db = new Localbase("db") || [];
export const projectName = document.getElementById("project-name");
export const thresholds = {
  selected: () => adapt(2),
  normalMode: () => adapt(15),
  threshold: () => adapt(3),
  pthreshold: () => adapt(5),
  maxCanvasSize: () => adapt(5000),
  pointHold: () => adapt(10),
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
export const generationArea = document.getElementById("generationArea");
