import { canvasProperties } from "../variable.js";

export function getFormatFromExtension(ext) {
  const formats = {
    ".ttf": "truetype",
    ".otf": "opentype",
    ".woff": "woff",
    ".woff2": "woff2",
  };
  return formats[ext.toLowerCase()] || "truetype";
}
export function getFontFormat(url) {
  if (url.endsWith(".woff2")) return "woff2";
  if (url.endsWith(".woff")) return "woff";
  if (url.endsWith(".ttf")) return "truetype";
  if (url.endsWith(".otf")) return "opentype";
  return "truetype";
}

export function rgbToHex(rgb) {
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

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function radToDeg(val, type) {
  if (type === "rad") {
    return parseFloat(((val * Math.PI) / 180).toFixed(2));
  } else {
    return parseFloat(((val * 180) / Math.PI).toFixed(2));
  }
}

export function backValues(x) {
  let val = parseFloat(x);
  if (isNaN(val)) val = 0;
  if (canvasProperties.whatsMeasured === "px") {
    return val;
  } else if (canvasProperties.whatsMeasured === "pt") {
    return val * 1.333;
  } else if (canvasProperties.whatsMeasured === "in") {
    return val * 96;
  } else if (canvasProperties.whatsMeasured === "m") {
    return val * 3780;
  } else if (canvasProperties.whatsMeasured === "cm") {
    return val * 37.8;
  } else if (canvasProperties.whatsMeasured === "mm") {
    return val * 3.78;
  }
}

export function changeValues(x) {
  x = parseFloat(x);
  if (isNaN(x)) return 0;
  let value = 0;
  if (canvasProperties.whatsMeasured === "px") {
    value = x;
  } else if (canvasProperties.whatsMeasured === "pt") {
    value = x / 1.333;
  } else if (canvasProperties.whatsMeasured === "in") {
    value = x / 96;
  } else if (canvasProperties.whatsMeasured === "m") {
    value = x / 3780;
  } else if (canvasProperties.whatsMeasured === "cm") {
    value = x / 37.8;
  } else if (canvasProperties.whatsMeasured === "mm") {
    value = x / 3.78;
  }
  return parseFloat(parseFloat(value).toFixed(2));
}

export function applyOpacityToHex(hexColor, opacityPercent) {
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
