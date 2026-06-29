const nameDiv = document.querySelector(".name");
const already = document.querySelector(".already");
const orderProjects = document.querySelector(".order-projects");
const nameInput = document.getElementById("name");
let db = new Localbase("db");
let data;
let cachedProjectNames = [];

async function getProjectNames() {
  const projects = await db.collection("projects").orderBy("entryDate", "desc").get();
  return projects.map((p) => p.name);
}

window.addEventListener("load", async () => {
  const datas = await db
    .collection("projects")
    .orderBy("entryDate", "desc")
    .get();

  cachedProjectNames = datas.map((project) => project.name);

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
        alert("Failed to open the project. Please try again.");
      }
    });
  });
});
nameInput.addEventListener("input", (e) => {
  const value = e.target.value.trim().toLowerCase();
  if (cachedProjectNames.includes(`${value}.json`)) {
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
      const names = await getProjectNames();
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
  const names = await getProjectNames();
  if (names.includes(nameInputs)) {
    already.textContent = "Name Already Exists";
    already.style.display = "flex";
    return;
  }
  saveAndSend(nameInputs, data);
}
async function saveAndSend(namer, data) {
  await db.collection("projects").add({
    name: namer,
    object: data,
    entryDate: new Date().getTime(),
  });
  cachedProjectNames.push(namer);
  try {
    const encoded = encodeURIComponent(namer);
    window.location.href = `project.html?data=${encoded}`;
  } catch (error) {
    console.error("Failed to encode data:", error);
    alert("Failed to save and navigate to the project. Please try again.");
  }
}
