const circleFill = document.querySelector(".circle-fill");
const percentageDisplay = document.getElementById("percentageDisplay");
const usedDisplay = document.getElementById("usedDisplay");
const quotaDisplay = document.getElementById("quotaDisplay");
const remainingDisplay = document.getElementById("remainingDisplay");
const storageTypeSpan = document.getElementById("storageType");
const statusDiv = document.getElementById("statusMessage");
const orderProjects = document.querySelector(".order-projects");
const incessive = document.querySelector(".incessive");
const fontProject = document.querySelector(".font-project");
let db = new Localbase("db");
// Helper: Convert bytes to human readable format
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Show 2 decimal places for MB and up, 0 for smaller units
  const decimals = i >= 2 ? 2 : 0;
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
  return `${val} ${sizes[i]}`;
}

// Helper: Convert bytes to MB with 1 decimal (for display inside stats)
function toMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

// Update status color and text based on usage percent
function updateStatusColor(percent, remainingMB) {
  statusDiv.classList.remove("good", "warning", "danger");

  if (percent < 50) {
    statusDiv.classList.add("good");
    statusDiv.innerHTML = `✅ Excellent! You have plenty of space left (${remainingMB} MB free). Keep building!`;
  } else if (percent < 80) {
    statusDiv.classList.add("warning");
    statusDiv.innerHTML = `⚠️ Storage is filling up (${remainingMB} MB remaining). Consider cleaning old data soon.`;
  } else {
    statusDiv.classList.add("danger");
    statusDiv.innerHTML = `🔥 Critical: Only ${remainingMB} MB left! Your app may stop saving data soon.`;
  }
}

// Check if storage is persistent
async function checkPersistence() {
  if ("storage" in navigator && "persisted" in navigator.storage) {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      storageTypeSpan.innerHTML = "Persistent";
      storageTypeSpan.style.color = "#276749";
    } else {
      storageTypeSpan.innerHTML = "Temporary";
      storageTypeSpan.style.color = "#c05621";
    }
    return isPersisted;
  } else {
    storageTypeSpan.innerHTML = "Unknown";
    return false;
  }
}

// Main function to update storage info
async function updateStorageInfo() {
  // Check if API is available
  if (!("storage" in navigator) || !("estimate" in navigator.storage)) {
    statusDiv.innerHTML =
      "❌ Your browser doesn't support the Storage API. Try Chrome, Edge, or Safari.";
    percentageDisplay.textContent = "?";
    usedDisplay.textContent = "N/A";
    quotaDisplay.textContent = "N/A";
    remainingDisplay.textContent = "N/A";
    return;
  }

  try {
    // Get storage estimate
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;

    // Calculate values
    const usedMB = toMB(usage);
    const quotaMB = toMB(quota);
    const remaining = quota - usage;
    const remainingMB = toMB(remaining);
    const percentUsed = (usage / quota) * 100;

    // Update text displays
    percentageDisplay.textContent = `${Math.round(percentUsed)}%`;
    usedDisplay.textContent = `${usedMB} MB`;
    quotaDisplay.textContent = `${quotaMB} MB`;
    remainingDisplay.textContent = `${remainingMB} MB`;

    // Update status and color
    updateStatusColor(percentUsed, remainingMB);

    // Update circle progress animation
    const circumference = 2 * Math.PI * 42; // r=42, circumference = 263.89
    const offset = circumference - (percentUsed / 100) * circumference;
    circleFill.style.strokeDasharray = `${circumference}`;
    circleFill.style.strokeDashoffset = `${offset}`;

    // Also show IndexedDB specific usage if available
    if (estimate.usageDetails && estimate.usageDetails.indexedDB) {
      const indexedDBUsage = estimate.usageDetails.indexedDB;
      const idbMB = toMB(indexedDBUsage);
      // You could display this in a tooltip or a secondary element if desired.
    }

    // Check persistence status
    await checkPersistence();
  } catch (error) {
    console.error("Error fetching storage info:", error);
    statusDiv.innerHTML =
      "⚠️ Unable to read storage information. Please refresh and try again.";
    percentageDisplay.textContent = "?";
  }
}

// Initial load
updateStorageInfo();

// Optional: Auto-refresh every 10 seconds (can be removed if not needed)
setInterval(updateStorageInfo, 10000); // Refreshes every 10 seconds
document.getElementById("showProjects").addEventListener("click", (e) => {
  importData();
  e.target.classList.add("active");
  document.getElementById("showFonts").classList.remove("active");
});
document.getElementById("showFonts").addEventListener("click", (e) => {
  importFonts();
  e.target.classList.add("active");
  document.getElementById("showProjects").classList.remove("active");
});
async function renderData(search = "") {
  try {
    orderProjects.innerHTML = ""
    let allData = "";
    let datas = await db
      .collection("projects")
      .orderBy("entryDate", "desc")
      .get();
    if (datas.length <= 0) {
      orderProjects.innerHTML = `<p style="text-align:center;margin-top:2rem;">No projects saved yet.</p>`;
      return;
    }
    if (search === "") allData = datas;
    else
      allData = datas.filter((dat) =>
        dat.name.toLowerCase().includes(search.toLowerCase()),
      );

    orderProjects.innerHTML = `${allData
      .map((dat) => {
        return `
        <div class="objects">
            <div class="objects1"><img src=${dat?.object?.[0]?.backgroundImage || ""} alt="Image Not Found"></div>
            <p>${dat.name}</p>
            <div class="objects2">
                <button class="export">Export</button>
                <button class="delete">Delete</button>
            </div>
        </div>
        `;
      })
      .join("")}`;

    document.querySelectorAll(".objects").forEach((button) => {
      const name = button.querySelector("p").textContent;
      button.querySelector(".export").addEventListener("click", async (e) => {
        e.target.textContent = "Exporting"
        const datar = await db.collection("projects").doc({ name: name }).get();
        let data = datar.object
        for (let dat = 0; dat < data.length; dat++) {
          if (data[dat].type === "image") {
            if (!data[dat].isConverted) {
              for (let i = 0; i < data[dat].originalFiles.length; i++) {
                const imageData = await db
                  .collection(`img${name}`)
                  .doc({ id: data[dat].originalFiles[i] })
                  .get();
                data[dat].originalFiles[i] = imageData.image;
              }
              data[dat].isConverted = true;
            }
          }
        }

        const stringFied = JSON.stringify(data);

        const blob = new Blob([stringFied], { type: "application/json" });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        e.target.textContent = "Export"
      });
      button.querySelector(".delete").addEventListener("click", async () => {
        await db.collection("projects").doc({ name: name }).delete();
        await db.collection(`img${name}`).delete();
        let projects = JSON.parse(localStorage.getItem("project-names")) || [];
        let index = projects.indexOf(name);
        if (index > -1) {
          projects.splice(index, 1);
        }
        localStorage.setItem("project-names", JSON.stringify(projects));
        alert(`${name} has been deleted`);
        await renderData();
      });
      button.querySelector(".objects1").addEventListener("click", async () => {
        try {
          const encoded = encodeURIComponent(name);
          window.location.href = `project.html?data=${encoded}`;
        } catch (error) {
          console.error("Failed to encode data:", error);
        }
      });
    });
  } catch (error) {
    console.error("Error rendering data:", error);
  }
}

async function importData() {
  try {
    fontProject.innerHTML = "";
    orderProjects.innerHTML = `<p style="text-align:center;margin-top:2rem;">Loading...</p>`;
    incessive.innerHTML = `
        <div><input class="search" placeholder="Search fonts..."/></div>
        <div>
        <button>Import<input type="file" multiple class="import" accept=".json"/></button>
        <button class="export-all">Export All</button>
        <button class="delete-all">Delete All</button>        
        </div>
        `;
    document
      .querySelector(".delete-all")
      .addEventListener("click", async () => {
        if (
          confirm(
            "Are you sure you want to delete all projects? This action cannot be undone.",
          )
        ) {
          const allFonts = await db.collection("fonts").get()
          await db.delete()
          localStorage.removeItem("project-names");
          for(font = 0;font<allFonts.length;font++){
            console.log(font)
            await db.collection("fonts").add({...font})
          }
                    await renderData();
          await updateStorageInfo()
          alert("All projects have been deleted");

        }
      });

    document.querySelector(".import").addEventListener("change", async (e) => {
      const files = e.target.files;
      if (files.length <= 0) return;
      try {
        for (const file of files) {
          const reader = new FileReader();
          const read = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
          });
          const result = await read;
          const jsonData = JSON.parse(result);
          const names = JSON.parse(localStorage.getItem("project-names")) || [];
          const fileName = file.name.trim().toLowerCase();
          if (names.includes(fileName)) {
            alert(
              `Project with name ${fileName} already exists. Please rename the file and try again.`,
            );
            continue;
          }
          await db.collection("projects").add({
            name: fileName,
            object: jsonData || [],
            entryDate: new Date().getTime(),
          });
                localStorage.setItem(
        "project-names",
        JSON.stringify([...names, fileName]),
      );
        }
        await renderData();
      } catch (error) {
        console.error("Error reading files:", error);
      }
    });

    document
      .querySelector(".export-all")
      .addEventListener("click", async () => {
        const datas = await db
          .collection("projects")
          .orderBy("entryDate", "desc")
          .get();
        if (datas.length <= 0) {
          alert("No projects to export");
          return;
        }
        const zip = new JSZip();
for (let idx = 0; idx < datas.length; idx++) {
  let data = datas[idx].object;
  for (let dat = 0; dat < data.length; dat++) {
    if (data[dat].type === "image") {
      if (!data[dat].isConverted) {
        for (let i = 0; i < data[dat].originalFiles.length; i++) {
          const imageData = await db
            .collection(`img${name}`)
            .doc({ id: data[dat].originalFiles[i] })
            .get();
          data[dat].originalFiles[i] = imageData.image;
        }
        data[dat].isConverted = true;
      }
    }
  }
  datas[idx].object = data; // Update the modified data back
  const stringFied = JSON.stringify(datas[idx]);
  zip.file(`${datas[idx].name}.json`, stringFied);
}
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);

        const link = document.createElement("a");
        link.href = url;
        link.download = "allProjects.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

    await renderData();
  } catch (error) {
    console.error("Error importing data:", error);
  }
}

async function renderFonts(search = "") {
  try {
    let allFonts = "";
    let fonts = await db.collection("fonts").orderBy("id").get();
    if (fonts.length <= 0) {
      fontProject.innerHTML = `<p style="text-align:center;margin-top:2rem;">No fonts imported yet.</p>`;
      return;
    }
    if (search === "") allFonts = fonts;
    else
      allFonts = fonts.filter((font) =>
        font.id.toLowerCase().includes(search.toLowerCase()),
      );
    fontProject.innerHTML = `${allFonts
      .map((font) => {
        return `
            <div>
            <p>${font.id}</p>
            <button class="delete">Delete</button>
            </div>
            `;
      })
      .join("")}`;

    fontProject.querySelectorAll("div").forEach((div) => {
      const name = div.querySelector("p").textContent;
      const button = div.querySelector("button");
      button.addEventListener("click", async () => {
        await db.collection("fonts").doc({ id: name }).delete();
        const fonts = JSON.parse(localStorage.getItem("fontNames")) || [];

        let index = fonts.indexOf(name);
        if (index > -1) {
          fonts.splice(index, 1);
        }
        localStorage.setItem("fontNames", JSON.stringify(fonts));
        alert(`${name} has been deleted`);
        await renderFonts();
      });
    });
  } catch (error) {
    console.error("Error rendering fonts:", error);
  }
}
async function importFonts() {
  orderProjects.innerHTML = "";
  fontProject.innerHTML = `<p style="text-align:center;margin-top:2rem;">Loading...</p>`;

  try {
    incessive.innerHTML = `
        <div><input class="search" placeholder="Search fonts..."/></div>
        <div>
        <button>Import<input type="file" multiple class="import" accept=".ttf,.otf,.woff,.woff2"/></button>
        <button class="delete-all">Delete All</button>        
        </div>


        `;
    document
      .querySelector(".delete-all")
      .addEventListener("click", async () => {
        if (
          confirm(
            "Are you sure you want to delete all fonts? This action cannot be undone.",
          )
        ) {
          await db.collection("fonts").delete();
          localStorage.removeItem("fontNames");
          alert("All fonts have been deleted");
          await renderFonts();
        }
      });

    document.querySelector(".import").addEventListener("change", async (e) => {
      const files = e.target.files;
      if (files.length <= 0) return;
      try {
        for (const file of files) {
          const fileName = file.name;
          const fontNames = JSON.parse(localStorage.getItem("fontNames")) || [];
          if (fontNames.includes(fileName)) {
            alert("Font already imported");
            continue;
          }

          const fileExt = fileName.substring(fileName.lastIndexOf("."));
          const fontFamily = null || fileName.replace(fileExt, "");

          // Read file directly (no fetch needed!)
          const reader = new FileReader();
          const fontData = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file); // Direct file read, not fetch
          });
          const fontFormat = getFormatFromExtension(fileExt);
          // Set the font family to the newly imported font

          // Store in IndexedDB
          await db.collection("fonts").add({
            id: fontFamily,
            fontFamily: fontFamily,
            fontData: fontData, // Complete font data from file
            fontFormat: fontFormat,
            timestamp: new Date().getTime(),
            fileName: fileName, // Store original filename
            fileSize: file.size, // Store size for info
          });

          console.log(
            `Font ${fontFamily} stored successfully from uploaded file`,
          );
          localStorage.setItem(
            "fontNames",
            JSON.stringify([...fontNames, fontFamily]),
          );
        }
      } catch (error) {
        console.error("Error reading files:", error);
      }
      await renderFonts();
    });

    document.querySelector(".search").addEventListener("input", async (e) => {
      const searchTerm = e.target.value.trim().toLowerCase();
      await renderFonts(searchTerm);
    });

    await renderFonts();
  } catch (error) {
    console.error("Error importing fonts:", error);
  }
}
function getFormatFromExtension(ext) {
  const formats = {
    ".ttf": "truetype",
    ".otf": "opentype",
    ".woff": "woff",
    ".woff2": "woff2",
  };
  return formats[ext.toLowerCase()] || "truetype";
}
function getFontFormat(url) {
  if (url.endsWith(".woff2")) return "woff2";
  if (url.endsWith(".woff")) return "woff";
  if (url.endsWith(".ttf")) return "truetype";
  if (url.endsWith(".otf")) return "opentype";
  return "truetype";
}

window.onload = function () {
  importData();
};
