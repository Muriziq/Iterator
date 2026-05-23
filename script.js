const nameDiv = document.querySelector(".name");
const already = document.querySelector(".already");
const orderProjects = document.querySelector(".order-projects");
const nameInput = document.getElementById("name");
let db = new Localbase("db");
let data;
window.addEventListener("load", async () => {
  const fonts = await db.collection("fonts").get();
  let fontNames = [];
  if (fonts.length > 0) {
    fontNames = fonts.map((font) => font.fontFamily);
  }

  localStorage.setItem("fontNames", JSON.stringify([...fontNames]));
  const datas = await db
    .collection("projects")
    .orderBy("entryDate", "desc")
    .get();
  let projectNames = [];
  if (datas.length > 0) {
    projectNames = datas.map((project) => project.name);
  }
  localStorage.setItem("project-names", JSON.stringify([...projectNames]));
  if (datas.length <= 0) return;

  orderProjects.innerHTML = `
    ${datas
      .map((dat) => {
        return `
        <button>
            <div class="objects1"><img src=${dat?.object?.[0]?.backgroundImage || ""} alt="Image Not Found"></div>
            <p>${dat.name}</p>
        </button>
        `;
      })
      .join("")}
    `;
  orderProjects.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.querySelector("p").textContent.toLowerCase();
      try {
        const encoded = encodeURIComponent(name);
        window.location.href = `project.html?data=${encoded}`;
      } catch (error) {
        console.error("Failed to encode data:", error);
      }
    });
  });
});
nameInput.addEventListener("input", (e) => {
  const value = e.target.value.trim().toLowerCase();
  const availableNames =
    JSON.parse(localStorage.getItem("project-names")) || [];
  if (availableNames.includes(`${value}.json`)) {
    already.textContent = "Name Already Exists";
    already.style.display = "flex";
  } else {
    already.style.display = "none";
  }
});
document.getElementById("new-project").addEventListener("click", () => {
  data = [];
  nameDiv.style.display = "flex";
  nameInput.value = "";
  nameInput.focus();
  already.style.display = "none";
});
document
  .querySelector("#upload-project input")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = async () => {
      const jsonData = JSON.parse(reader.result);
      const projectName = file.name;
      const names = JSON.parse(localStorage.getItem("project-names")) || [];
      if (
        projectName.replace(/\.json$/i, "") === "" ||
        names.includes(projectName)
      ) {
        data = jsonData;
        nameDiv.style.display = "flex";
        nameInput.value = projectName.replace(/\.json$/i, "");
        already.textContent = "Invalid Name Input Another";
        return;
      }
      saveAndSend(projectName, jsonData);
    };
  });
function cancel() {
  nameDiv.style.display = "none";
}
async function proceed() {
  let nameInputs = nameInput.value.trim().toLowerCase();
  if (nameInputs === "undefined" || !nameInput) {
    already.textContent = "Input Name";
    already.style.display = "flex";
    return;
  }
  nameInputs += ".json";
  const names = JSON.parse(localStorage.getItem("project-names")) || [];
  if (names.includes(nameInputs)) {
    already.textContent = "Name Already Exists";
    already.style.display = "flex";
    return;
  }
  saveAndSend(nameInputs, data);
}
async function saveAndSend(namer, data) {
  const names = JSON.parse(localStorage.getItem("project-names")) || [];
  localStorage.setItem("project-names", JSON.stringify([...names, namer]));
  await db.collection("projects").add({
    name: namer,
    object: data,
    entryDate: new Date().getTime(),
  });
  try {
    const encoded = encodeURIComponent(namer);
    window.location.href = `project.html?data=${encoded}`;
  } catch (error) {
    console.error("Failed to encode data:", error);
  }
}
