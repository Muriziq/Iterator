importScripts("https://unpkg.com/localbase/dist/localbase.dev.js")
// importScripts("node_modules/localbase/dist/localbase.min.js")
let allDatas = []
let names = []
let formerName = ""
let saveTimeout = null;
let isSaving = false;
let autoSave = false
let newStorage = ""
let namesDont = false
let drawingImage = null
let deleteData = false
let db = new Localbase("db") || [];
let stopSaving = false 
onmessage = (message) =>{
    const messageData = message.data
    if('formerName' in messageData){
        formerName = messageData.formerName
    }
    if('names' in messageData){
        names = messageData.names
    }
    if('deleteData' in messageData){
        deleteData = messageData.deleteData
    }
    if('stopSaving' in messageData){
        stopSaving = messageData.stopSaving
    }
    if('drawingImage' in messageData){
        drawingImage = messageData.drawingImage
        console.log(drawingImage)
    }
    if('allData' in messageData){
        allDatas = JSON.parse(messageData.allData)
    }
    if('justSave' in messageData && !stopSaving){
        runSave("manual")
    }
    else if('autoSave' in messageData && !stopSaving){
        autoSave = true
        runSave()
    }

}

function runSave(source) {
  clearTimeout(saveTimeout);

  const delay = source === "manual" ? 0 : 2000;
  saveTimeout = setTimeout(async () => {
    if (isSaving) return;

    isSaving = true;

    try {
      await saveToFile();
        if(deleteData){
await deleteUnusedImage()
deleteData = false
        } 
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
              }
        );
      } else {
        console.log(
          "✅ Autosaved at:",
          new Date().toLocaleTimeString()
        );

        postMessage(
          namesDont
            ? {
                autoSave: autoSave,
                newStorage: newStorage,
              }
            : {
                autoSave: autoSave,
              }
        );
      }
    } catch (err) {
      console.log(err);
    } finally {
      isSaving = false;
    }
  }, delay);
}

async function saveToFile() {
  let allData = allDatas
namesDont = false 
  try {
    if (names.includes(formerName)) {
      await db.collection("projects").doc({ name: formerName }).set({
        name: formerName,
        object: allData,
        entryDate: new Date().getTime(),
      });
    } else {
      await db.collection("projects").add({
        name: formerName,
        object: allData,
        entryDate: new Date().getTime(),
      });
      newStorage = JSON.stringify([...names, formerName])
      namesDont = true
    }
  } catch (err) {
    console.log(err);
    notify("Error Saving");
  }

}

async function deleteUnusedImage() {
    // Get all images from LocalBase
    const images = allDatas.filter(data=>data.type === "image")
    const allImageFile = await db.collection(`img${formerName}`).get();
    if(drawingImage !== null) return
    // Create Set for O(1) lookups
    const imagesInSet = new Set();
    images.forEach(img => {
        img.originalFiles?.forEach(file => {
            imagesInSet.add(file);
        });
    });
    
    // Filter IDs to delete
    const toDeleteIds = allImageFile
        .filter(doc => !imagesInSet.has(doc.id))
        .map(doc => doc.id);
    
    if (toDeleteIds.length === 0) return;
    
    // Delete sequentially (LocalBase doesn't support batch AFAIK)
    for (const id of toDeleteIds) {
        await db.collection(`img${formerName}`).doc({ id }).delete();
        console.log("data Deleted")
    }
}