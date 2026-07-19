import { objectProperties } from "../variable.js";
import { rebuildSubArrays } from "../state/undo.js";
import requestDraw from "./draw.js";
import { multipleSelectFunction, adapt } from "../state/canvas.js";
import { reviveObjects } from "../state/save.js";

// Local in-memory fallback for environments where navigator.clipboard is unavailable
let localClipboardFallback = null;
let lastPastedJson = null;
let pasteCount = 0;



/**
 * Copies the current selection (single or multiple) to the system clipboard.
 */
export async function copyToClipboard() {
  const targets =
    objectProperties.multipleSelect &&
    objectProperties.multipleSelectArr.length > 0
      ? objectProperties.multipleSelectArr
      : objectProperties.selectedObj
        ? [objectProperties.selectedObj]
        : [];

  if (targets.length === 0) return;

  const clipboardData = {
    signature: "IteratorCanvasObjects",
    version: "1.0",
    objects: targets.map((obj) => obj.showClone()),
  };

  const jsonString = JSON.stringify(clipboardData);
  localClipboardFallback = jsonString;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(jsonString);
    } catch (err) {
      console.warn("System clipboard write failed, using fallback:", err);
    }
  }
}

/**
 * Cuts the current selection to the system clipboard and deletes it from the canvas.
 */
export async function cutToClipboard() {
  const targets =
    objectProperties.multipleSelect &&
    objectProperties.multipleSelectArr.length > 0
      ? objectProperties.multipleSelectArr
      : objectProperties.selectedObj
        ? [objectProperties.selectedObj]
        : [];

  if (targets.length === 0) return;

  await copyToClipboard();

  // Delete cut targets from canvas
  targets.forEach((obj) => {
    const idx = objectProperties.objects.indexOf(obj);
    if (idx > -1) {
      objectProperties.objects.splice(idx, 1);
    }

    // Clean up clipper association if object was clipped
    if (obj.clipped === "objectProperties.clipped") {
      const clipIndex = objectProperties.objects.find(
        (o) => o.id === obj.clipper,
      );
      if (clipIndex) {
        const selectedIndex = clipIndex.clips.indexOf(obj);
        if (selectedIndex > -1) {
          clipIndex.clips.splice(selectedIndex, 1);
        }
      }
    }
  });

  // Clear focus / selections
  objectProperties.selectedObj = null;
  objectProperties.multipleSelect = false;
  objectProperties.multipleSelectArr = [];

  rebuildSubArrays();
  requestDraw();
}

/**
 * Pastes items from the system clipboard or local fallback onto the canvas.
 */
export async function pasteFromClipboard() {
  let text = "";
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      console.warn("System clipboard read failed, using fallback:", err);
      text = localClipboardFallback;
    }
  } else {
    text = localClipboardFallback;
  }

  if (!text) return;

  let clipboardData;
  try {
    clipboardData = JSON.parse(text);
  } catch (e) {
    return; // Ignore invalid JSON text
  }

  if (
    !clipboardData ||
    clipboardData.signature !== "IteratorCanvasObjects" ||
    !Array.isArray(clipboardData.objects)
  ) {
    return; // Ignore non-application format
  }

  // Manage paste count to shift coordinates on consecutive pastes of the same item
  if (text === lastPastedJson) {
    pasteCount++;
  } else {
    lastPastedJson = text;
    pasteCount = 1;
  }

  const offset = adapt(10) * pasteCount;

  // Revive objects asynchronously
  const revivedObjects = (
    await Promise.all(
      clipboardData.objects.map(async (objData) => {
        const revived = await reviveObjects(objData);
        if (revived) {
          // Use showClone to create a fresh copy with new IDs recursively
          const finalClone = revived.showClone();
          finalClone.moveClip(offset, -offset);
          return finalClone;
        }
        return null;
      }),
    )
  ).filter(Boolean);

  if (revivedObjects.length === 0) return;

  objectProperties.objects.push(...revivedObjects);

  // Set visual selection to newly pasted objects
  if (revivedObjects.length === 1) {
    objectProperties.selectedObj = revivedObjects[0];
    objectProperties.multipleSelect = false;
    objectProperties.multipleSelectArr = [];
  } else {
    objectProperties.selectedObj = null;
    objectProperties.multipleSelect = true;
    objectProperties.multipleSelectArr = revivedObjects;
    multipleSelectFunction();
  }

  rebuildSubArrays();
  requestDraw();
}
