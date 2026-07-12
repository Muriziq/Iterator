import { objectProperties } from "../variable.js";
import requestDraw from "../utils/draw.js";
export function bringToFront(selected) {
  if (selected.clipped === "objectProperties.clipped") {
    const clipIndex = objectProperties.objects.find((obj) => obj.id === selected.clipper);
    if (clipIndex) {
      const selectedIndex = clipIndex.clips.indexOf(selected);
      clipIndex.clips.splice(selectedIndex, 1);
      clipIndex.clips.push(selected);
      requestDraw();
    }
  }
  let index = objectProperties.objects.indexOf(selected);
  if (index === -1) return;
  objectProperties.objects.splice(index, 1);
  objectProperties.objects.push(selected);
  requestDraw();
}
export function sendToBack(selected) {
  if (selected.clipped === "objectProperties.clipped") {
    const clipIndex = objectProperties.objects.find((obj) => obj.id === selected.clipper);
    if (clipIndex) {
      const selectedIndex = clipIndex.clips.indexOf(selected);
      clipIndex.clips.splice(selectedIndex, 1);
      clipIndex.clips.unshift(selected);
      requestDraw();
    }
  }
  let index = objectProperties.objects.indexOf(selected);
  if (index === -1) return;
  objectProperties.objects.splice(index, 1);
  objectProperties.objects.unshift(selected);
  requestDraw();
}
export function pageUp(selected) {
  // Handle clipping reorder FIRST if selected is objectProperties.clipped
  if (selected.clipped === "objectProperties.clipped") {
    const clipParent = objectProperties.objects.find((obj) => obj.id === selected.clipper);
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

  // Reorder in main objectProperties.objects array (for non-objectProperties.clipped or root objectProperties.objects)
  const i = objectProperties.objects.indexOf(selected);
  if (i === -1 || i >= objectProperties.objects.length - 1) return;

  // swap with next
  [objectProperties.objects[i], objectProperties.objects[i + 1]] = [objectProperties.objects[i + 1], objectProperties.objects[i]];
  requestDraw();
}

export function pageDown(selected) {
  // Handle clipping reorder FIRST if selected is objectProperties.clipped
  if (selected.clipped === "objectProperties.clipped") {
    const clipParent = objectProperties.objects.find((obj) => obj.id === selected.clipper);
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

  // Reorder in main objectProperties.objects array (for non-objectProperties.clipped or root objectProperties.objects)
  const i = objectProperties.objects.indexOf(selected);
  if (i === -1 || i === 0) return;

  // swap with previous
  [objectProperties.objects[i], objectProperties.objects[i - 1]] = [objectProperties.objects[i - 1], objectProperties.objects[i]];
  requestDraw();
}