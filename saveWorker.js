
importScripts("vendor/localbase/localbase.min.js");
let allDatas = [];
let names = [];
let formerName = "";
let saveTimeout = null;
let isSaving = false;
let autoSave = false;
let newStorage = "";
let namesDont = false;
let drawingImage = null;
let deleteData = false;
let db = new Localbase("db") || [];
let stopSaving = false;
onmessage = (message) => {
  const messageData = message.data;
  if ("formerName" in messageData) {
    formerName = messageData.formerName;
  }
  if ("names" in messageData) {
    names = messageData.names;
  }
  if ("stopSaving" in messageData) {
    stopSaving = messageData.stopSaving;
    if (stopSaving) {
      clearTimeout(saveTimeout);
    }
  }
  if ("drawingImage" in messageData) {
    drawingImage = messageData.drawingImage;
  }
  if ("allData" in messageData) {
    allDatas = JSON.parse(messageData.allData);
  }
  if ("deleteData" in messageData) {
    deleteUnusedImage();
  }
  if ("justSave" in messageData && !stopSaving) {
    runSave("manual");
  } else if ("autoSave" in messageData && !stopSaving) {
    autoSave = true;
    runSave();
  }
};

let savePending = null;

function runSave(source) {
  clearTimeout(saveTimeout);

  if (isSaving) {
    if (source === "manual" || !savePending) {
      savePending = source || "auto";
    }
    return;
  }

  const delay = source === "manual" ? 0 : 2000;
  saveTimeout = setTimeout(async () => {
    if (isSaving || stopSaving) return;

    isSaving = true;

    try {
      await saveToFile();
      if (source === "manual") {
        postMessage(
          namesDont
            ? {
                notify: "saved",
                autoSave: autoSave,
                newStorage: newStorage,
              }
            : {
                notify: "saved",
                autoSave: autoSave,
              },
        );
      } else {
        console.log("✅ Autosaved at:", new Date().toLocaleTimeString());

        postMessage(
          namesDont
            ? {
                autoSave: autoSave,
                newStorage: newStorage,
              }
            : {
                autoSave: autoSave,
              },
        );
      }
    } catch (error) {
      console.error("Autosave error:", error);
    } finally {
      isSaving = false;
      if (savePending && !stopSaving) {
        const nextSource = savePending;
        savePending = null;
        runSave(nextSource);
      }
    }
  }, delay);
}

async function saveToFile() {
  let allData = allDatas;
  namesDont = false;
  try {
    const existingProject = await db
      .collection("projects")
      .doc({ name: formerName })
      .get();
    if (existingProject && existingProject.name) {
      await db.collection("projects").doc({ name: formerName }).update({
        object: allData,
        entryDate: new Date().getTime(),
      });
    } else {
      console.log("adding", formerName);
      await db.collection("projects").add({
        name: formerName,
        object: allData,
        entryDate: new Date().getTime(),
      });
      names.push(formerName);
      newStorage = JSON.stringify([...names]);
      namesDont = true;
    }
  } catch (error) {
    console.error("Save to file error:", error);
  }
}

function getActiveImageFiles(list) {
  const fileSet = new Set();
  if (!list) return fileSet;

  function traverse(items) {
    if (!items) return;
    items.forEach((obj) => {
      if (obj.type === "image" && obj.originalFiles) {
        obj.originalFiles.forEach((file) => fileSet.add(file));
      }
      if (obj.list) {
        traverse(obj.list);
      }
      if (obj.clips) {
        traverse(obj.clips);
      }
    });
  }

  traverse(list);
  return fileSet;
}

async function deleteUnusedImage() {
  const allImageFile = await db.collection(`img${formerName}`).get();
  if (drawingImage !== null) return;
  // Create Set for O(1) lookups
  const imagesInSet = getActiveImageFiles(allDatas);
  // Filter IDs to delete
  const toDeleteIds = allImageFile
    .filter((doc) => !imagesInSet.has(doc.id))
    .map((doc) => doc.id);

  if (toDeleteIds.length === 0) return;

  // Delete sequentially (LocalBase doesn't support batch AFAIK)
  for (const id of toDeleteIds) {
    await db.collection(`img${formerName}`).doc({ id }).delete();
    console.log("data Deleted");
  }
}
