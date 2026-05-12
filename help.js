
    // Active nav link
    function setActive(el) {
      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      el.classList.add("active");
    }

    // Highlight nav on scroll
    const sections = document.querySelectorAll(".section");
    const navLinks = document.querySelectorAll(".nav-link");
    window.addEventListener("scroll", () => {
      let current = "";
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 120) current = s.id;
      });
      navLinks.forEach(l => {
        l.classList.toggle("active", l.getAttribute("href") === "#" + current);
      });
    });

    // Search filter
    function filterItems(query) {
      const q = query.toLowerCase().trim();
      document.querySelectorAll(".tool-item, .shortcut-item").forEach(item => {
        const name = (item.dataset.name || "").toLowerCase();
        const desc = (item.dataset.desc || "").toLowerCase();
        item.style.display = (!q || name.includes(q) || desc.includes(q)) ? "" : "none";
      });
    }
