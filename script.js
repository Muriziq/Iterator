const nameDiv = document.querySelector(".name");
const already = document.querySelector(".already");
const orderProjects = document.querySelector(".order-projects");
let data;
window.addEventListener("load", async () => {
  let db = new Localbase("db");
  const fonts = await db.collection("fonts").get();
  if (fonts.length > 0) {
    let fontNames = fonts.map((font) => font.fontFamily);
    localStorage.setItem("fontNames", JSON.stringify([...fontNames]));
  }
  const datas = await db
    .collection("projects")
    .orderBy("entryDate", "desc")
    .get();
  if (datas.length <= 0) return;
  let projectNames = datas.map((project) => project.name);
  localStorage.setItem("project-names", JSON.stringify([...projectNames]));

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
      const name = button.querySelector("p").textContent;
      try {
        const encoded = encodeURIComponent(name);
        window.location.href = `project.html?data=${encoded}`;
      } catch (error) {
        console.error("Failed to encode data:", error);
      }
    });
  });
});

document.getElementById("new-project").addEventListener("click", () => {
  data = [];
  nameDiv.style.display = "flex";
});
document
  .querySelector("#upload-project input")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = async () => {
      const jsonData = JSON.parse(reader.result);
      const projectName = `${file.name.trim()}.json`;
      const names = JSON.parse(localStorage.getItem("project-names")) || [];

      if (
        projectName.replace(/\.json$/i, "") === "" ||
        names.includes(projectName)
      ) {
        data = jsonData;
        nameDiv.style.display = "flex";
        nameInput = document.getElementById("name").value = projectName;
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
  let nameInput = document.getElementById("name").value.trim();
  if (nameInput === "undefined" || !nameInput) {
    already.textContent = "Input Name";
    already.style.display = "flex";
    return;
  }
  nameInput += ".json";
  console.log(nameInput);
  const names = JSON.parse(localStorage.getItem("project-names")) || [];
  if (names.includes(nameInput)) {
    already.textContent = "Name Already Exists";
    already.style.display = "flex";
    return;
  }
  saveAndSend(nameInput, data);
}
async function saveAndSend(name, data) {
  const names = JSON.parse(localStorage.getItem("project-names")) || [];
  localStorage.setItem("project-names", JSON.stringify([...names, name]));
  let db = new Localbase("db");
  await db.collection("projects").add({
    name: name,
    object: data,
    entryDate: new Date().getTime(),
  });
  try {
    const encoded = encodeURIComponent(name);
    window.location.href = `project.html?data=${encoded}`;
  } catch (error) {
    console.error("Failed to encode data:", error);
  }
}
