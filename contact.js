// ── Config ────────────────────────────────────────────────────────────────
const YOUR_EMAIL = "sannidawodumuriziq@gmail.com";
const EMAILJS_KEY = "LFIVYfUIeEk6qMadX";
const EMAILJS_SVC = "service_x1ibzah";
const EMAILJS_TPLT = "template_fhqfb9v";

emailjs.init(EMAILJS_KEY);



// ── Validation ────────────────────────────────────────────────────────────
function validate() {
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
    if (!check(el.value)) {
      field.classList.add("error");
      valid = false;
    } else field.classList.remove("error");
  });
  return valid;
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  const toast = document.getElementById("cf-toast");
  const icon = document.getElementById("toast-icon");
  document.getElementById("toast-text").textContent = msg;
  toast.className = "toast show " + type;
  icon.innerHTML =
    type === "success"
      ? `<polyline points="20 6 9 17 4 12"/>`
      : `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;
}

// ── Submit ────────────────────────────────────────────────────────────────
document
  .getElementById("contact-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const btn = document.getElementById("cf-submit");
    btn.classList.add("loading");
    btn.disabled = true;

    try {
      await emailjs.send(EMAILJS_SVC, EMAILJS_TPLT, {
        from_name: document.getElementById("cf-name").value.trim(),
        reply_to: document.getElementById("cf-email").value.trim(),
        subject: document.getElementById("cf-subject").value,
        message: document.getElementById("cf-message").value.trim(),
      });
      showToast("Message sent — I'll get back to you soon.", "success");
      document.getElementById("contact-form").reset();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send your message. Please try again.");
      showToast("Couldn't send right now. Reach me directly below.", "error");
      document.getElementById("fallback-btns").classList.add("show");
    } finally {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  });

// ── Copy email ────────────────────────────────────────────────────────────
function copyEmail() {
  navigator.clipboard.writeText(YOUR_EMAIL).then(() => {
    const label = document.getElementById("copy-label");
    label.textContent = "Copied!";
    setTimeout(() => (label.textContent = "Copy email"), 2000);
  });
}
