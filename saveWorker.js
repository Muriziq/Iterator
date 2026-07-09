// importScripts("https://unpkg.com/localbase/dist/localbase.dev.js")
importScripts("node_modules/localbase/dist/localbase.min.js");
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
let images = [];
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
  if ("images" in messageData) {
    images = JSON.parse(messageData.images);
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

function runSave(source) {
  clearTimeout(saveTimeout);

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

async function deleteUnusedImage() {
  const allImageFile = await db.collection(`img${formerName}`).get();
  if (drawingImage !== null) return;
  // Create Set for O(1) lookups
  const imagesInSet = new Set();
  images.forEach((img) => {
    img.originalFiles?.forEach((file) => {
      imagesInSet.add(file);
    });
  });
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
