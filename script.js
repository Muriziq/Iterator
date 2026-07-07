const nameDiv = document.querySelector(".name");
const already = document.querySelector(".already");
const orderProjects = document.querySelector(".order-projects");
const nameInput = document.getElementById("name");
let db = new Localbase("db");
let data;
let cachedProjectNames = [];

async function getProjectNames() {
  const projects = await db.collection("projects").orderBy("entryDate", "desc").get();
  return (projects || []).map((p) => p.name);
}

window.addEventListener("load", async () => {
  const datas = await db
    .collection("projects")
    .orderBy("entryDate", "desc")
    .get();

  cachedProjectNames = (datas || []).map((project) => project.name);

  if (!datas || datas.length <= 0) return;

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

  // Update stats on load
  const templatesCount = (datas || []).length;
  document.getElementById("count-templates").textContent = templatesCount;

  try {
    const fonts = await db.collection("fonts").get();
    const fontsCount = (fonts || []).length;
    document.getElementById("count-fonts").textContent = fontsCount;
  } catch (err) {
    console.error("Error loading fonts count:", err);
  }
});

let selectedPreset = null;

const presets = {
  "business-card": [
    {
      type: "canvas",
      measurement: { width: 336, height: 192 },
      whatsMeasured: "landscape",
      generateInfo: {
        renderWidth: 1056,
        renderHeight: 816,
        noPerRow: 3,
        noPerColumn: 4,
        spacing: 20,
        quality: 1,
        batchSize: 50,
        renderPage: "letter"
      }
    }
  ],
  "id-card": [
    {
      type: "canvas",
      measurement: { width: 204, height: 324 },
      whatsMeasured: "potrait",
      generateInfo: {
        renderWidth: 816,
        renderHeight: 1056,
        noPerRow: 3,
        noPerColumn: 3,
        spacing: 20,
        quality: 1,
        batchSize: 50,
        renderPage: "letter"
      }
    }
  ],
  "certificate": [
    {
      type: "canvas",
      measurement: { width: 1123, height: 794 },
      whatsMeasured: "landscape",
      generateInfo: {
        renderWidth: 1123,
        renderHeight: 794,
        noPerRow: 1,
        noPerColumn: 1,
        spacing: 0,
        quality: 1,
        batchSize: 20,
        renderPage: "a4"
      }
    }
  ],
  "event-tag": [
    {
      type: "canvas",
      measurement: { width: 384, height: 576 },
      whatsMeasured: "potrait",
      generateInfo: {
        renderWidth: 816,
        renderHeight: 1056,
        noPerRow: 2,
        noPerColumn: 2,
        spacing: 30,
        quality: 1,
        batchSize: 50,
        renderPage: "letter"
      }
    }
  ]
};

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
  selectedPreset = null;
  data = [];
  nameDiv.style.display = "flex";
  nameInput.value = "";
  nameInput.focus();
  already.style.display = "none";
});

document.querySelectorAll(".preset-card").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedPreset = btn.getAttribute("data-preset");
    data = presets[selectedPreset] || [];
    nameDiv.style.display = "flex";
    nameInput.value = "";
    nameInput.focus();
    already.style.display = "none";
  });
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

// ── EmailJS & Contact Form logic ──────────────────────────────────────────
const YOUR_EMAIL = "sannidawodumuriziq@gmail.com";
const EMAILJS_KEY = "LFIVYfUIeEk6qMadX";
const EMAILJS_SVC = "service_x1ibzah";
const EMAILJS_TPLT = "template_fhqfb9v";

if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_KEY);
}

function validateContact() {
  let valid = true;
  const fields = [
    { id: "cf-name", fieldId: "field-name", check: (v) => v.trim().length > 0 },
    {
      id: "cf-email",
      fieldId: "field-email",
      check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    },
    { id: "cf-subject", fieldId: "field-subject", check: (v) => v !== "" },
    {
      id: "cf-message",
      fieldId: "field-message",
      check: (v) => v.trim().length > 0,
    },
  ];
  fields.forEach(({ id, fieldId, check }) => {
    const el = document.getElementById(id);
    const field = document.getElementById(fieldId);
    if (el && field) {
      if (!check(el.value)) {
        field.classList.add("error");
        valid = false;
      } else {
        field.classList.remove("error");
      }
    }
  });
  return valid;
}

function showContactToast(msg, type) {
  const toast = document.getElementById("cf-toast");
  const icon = document.getElementById("toast-icon");
  if (toast && icon) {
    document.getElementById("toast-text").textContent = msg;
    toast.className = "toast show " + type;
    icon.innerHTML =
      type === "success"
        ? `<polyline points="20 6 9 17 4 12"/>`
        : `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
  }
}

const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateContact()) return;

    const btn = document.getElementById("cf-submit");
    if (btn) {
      btn.classList.add("loading");
      btn.disabled = true;
    }

    try {
      await emailjs.send(EMAILJS_SVC, EMAILJS_TPLT, {
        from_name: document.getElementById("cf-name").value.trim(),
        reply_to: document.getElementById("cf-email").value.trim(),
        subject: document.getElementById("cf-subject").value,
        message: document.getElementById("cf-message").value.trim(),
      });
      showContactToast("Message sent — I'll get back to you soon.", "success");
      contactForm.reset();
    } catch (error) {
      console.error("Error sending message:", error);
      showContactToast("Couldn't send right now. Reach me directly below.", "error");
      const fallbacks = document.getElementById("fallback-btns");
      if (fallbacks) fallbacks.classList.add("show");
    } finally {
      if (btn) {
        btn.classList.remove("loading");
        btn.disabled = false;
      }
    }
  });
}

const btnCopyEmail = document.getElementById("btn-copy-email");
if (btnCopyEmail) {
  btnCopyEmail.addEventListener("click", () => {
    navigator.clipboard.writeText(YOUR_EMAIL).then(() => {
      const label = document.getElementById("copy-label");
      if (label) {
        label.textContent = "Copied!";
        setTimeout(() => (label.textContent = "Copy email"), 2000);
      }
    });
  });
}

// Copy on tap for contact-item elements
document.querySelectorAll(".contact-item").forEach((item) => {
  item.addEventListener("click", () => {
    const valueToCopy = item.getAttribute("data-copy");
    if (!valueToCopy) return;

    navigator.clipboard.writeText(valueToCopy).then(() => {
      const labelEl = item.querySelector(".contact-label");
      if (labelEl) {
        const originalText = labelEl.getAttribute("data-original") || labelEl.textContent;
        labelEl.textContent = "Copied!";
        item.classList.add("copied");
        setTimeout(() => {
          labelEl.textContent = originalText;
          item.classList.remove("copied");
        }, 2000);
      }
    }).catch(err => {
      console.error("Failed to copy text: ", err);
    });
  });

  // Support keyboard accessibility
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      item.click();
    }
  });
});
