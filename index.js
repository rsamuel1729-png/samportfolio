document.addEventListener("DOMContentLoaded", () => {
  const panelNames = ["home", "about", "skills", "projects", "certificates", "resume", "contact"];
  const panels = [...document.querySelectorAll(".panel")];
  const track = document.getElementById("panelTrack");
  const dockItems = [...document.querySelectorAll(".dock-item")];
  const panelNumber = document.getElementById("panelNumber");
  const indicatorProgress = document.getElementById("indicatorProgress");
  const navigationHint = document.getElementById("navigationHint");
  const desktopQuery = window.matchMedia("(min-width: 901px)");

  let activePanel = 0;
  let isPanelAnimating = false;
  let wheelAccumulator = 0;
  let wheelResetTimer;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateHash(name) {
    if (history.replaceState) {
      history.replaceState(null, "", `#${name}`);
    }
  }

  function goToPanel(index, options = {}) {
    const { updateUrl = true, smoothMobile = true } = options;
    const clamped = Math.max(0, Math.min(panelNames.length - 1, index));
    activePanel = clamped;

    panels.forEach((panel, panelIndex) => {
      panel.classList.toggle("active", panelIndex === activePanel);
    });

    dockItems.forEach((item, itemIndex) => {
      item.classList.toggle("active", itemIndex === activePanel);
      item.setAttribute("aria-current", itemIndex === activePanel ? "page" : "false");
    });

    panelNumber.textContent = pad(activePanel + 1);
    indicatorProgress.style.height = `${((activePanel + 1) / panelNames.length) * 100}%`;

    if (desktopQuery.matches) {
      isPanelAnimating = true;
      track.style.transform = `translateY(-${activePanel * 100}%)`;
      const currentScroll = panels[activePanel].querySelector(".panel-scroll");
      if (currentScroll) currentScroll.scrollTop = 0;
      window.setTimeout(() => {
        isPanelAnimating = false;
      }, 680);
    } else {
      const target = panels[activePanel];
      target.scrollIntoView({ behavior: smoothMobile ? "smooth" : "auto", block: "start" });
    }

    if (updateUrl) updateHash(panelNames[activePanel]);
    navigationHint?.classList.add("hidden");
  }

  function goToName(name) {
    const index = panelNames.indexOf(name);
    if (index !== -1) goToPanel(index);
  }

  dockItems.forEach((item) => {
    item.addEventListener("click", () => goToName(item.dataset.target));
  });

  document.querySelectorAll("[data-jump], [data-panel-link]").forEach((element) => {
    element.addEventListener("click", (event) => {
      const target = element.dataset.jump || element.dataset.panelLink;
      if (!target) return;
      event.preventDefault();
      goToName(target);
    });
  });

  const hashName = window.location.hash.replace("#", "");
  if (panelNames.includes(hashName)) {
    activePanel = panelNames.indexOf(hashName);
  }
  goToPanel(activePanel, { updateUrl: false, smoothMobile: false });

  function canNavigateByWheel(direction) {
    const currentScroll = panels[activePanel].querySelector(".panel-scroll");
    if (!currentScroll) return true;
    const atTop = currentScroll.scrollTop <= 1;
    const atBottom = currentScroll.scrollTop + currentScroll.clientHeight >= currentScroll.scrollHeight - 2;
    return direction > 0 ? atBottom : atTop;
  }

  window.addEventListener("wheel", (event) => {
    if (!desktopQuery.matches || isPanelAnimating || document.body.classList.contains("modal-open")) return;

    const direction = Math.sign(event.deltaY);
    if (!direction || !canNavigateByWheel(direction)) return;

    event.preventDefault();
    wheelAccumulator += event.deltaY;
    clearTimeout(wheelResetTimer);
    wheelResetTimer = setTimeout(() => {
      wheelAccumulator = 0;
    }, 160);

    if (Math.abs(wheelAccumulator) > 54) {
      goToPanel(activePanel + direction);
      wheelAccumulator = 0;
    }
  }, { passive: false });

  window.addEventListener("keydown", (event) => {
    const targetTag = event.target.tagName;
    const isTyping = targetTag === "INPUT" || targetTag === "TEXTAREA";
    if (isTyping || document.body.classList.contains("modal-open")) return;

    if (desktopQuery.matches && ["ArrowDown", "PageDown"].includes(event.key)) {
      event.preventDefault();
      goToPanel(activePanel + 1);
    }

    if (desktopQuery.matches && ["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      goToPanel(activePanel - 1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      goToPanel(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      goToPanel(panelNames.length - 1);
    }
  });

  if (!desktopQuery.matches) {
    const mobileObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = panelNames.indexOf(visible.target.dataset.panel);
      if (index === -1 || index === activePanel) return;
      activePanel = index;
      panels.forEach((panel, panelIndex) => panel.classList.toggle("active", panelIndex === index));
      dockItems.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === index));
      updateHash(panelNames[index]);
    }, { threshold: [0.3, 0.55, 0.75] });
    panels.forEach((panel) => mobileObserver.observe(panel));
  }

  desktopQuery.addEventListener("change", () => {
    track.style.transform = desktopQuery.matches ? `translateY(-${activePanel * 100}%)` : "none";
  });

  // Project tabs / carousel.
  const projectTabs = [...document.querySelectorAll(".project-tab")];
  const projectViews = [...document.querySelectorAll(".project-view")];
  const projectCounter = document.getElementById("projectCounter");
  let activeProject = 0;

  function showProject(index) {
    activeProject = (index + projectViews.length) % projectViews.length;
    projectTabs.forEach((tab, tabIndex) => {
      const active = tabIndex === activeProject;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    projectViews.forEach((view, viewIndex) => view.classList.toggle("active", viewIndex === activeProject));
    projectCounter.textContent = `${pad(activeProject + 1)} / ${pad(projectViews.length)}`;
  }

  projectTabs.forEach((tab) => {
    tab.addEventListener("click", () => showProject(Number(tab.dataset.project)));
  });
  document.getElementById("projectPrev")?.addEventListener("click", () => showProject(activeProject - 1));
  document.getElementById("projectNext")?.addEventListener("click", () => showProject(activeProject + 1));

  // Command palette.
  const commandButton = document.getElementById("commandButton");
  const commandOverlay = document.getElementById("commandOverlay");
  const commandInput = document.getElementById("commandInput");
  const commandButtons = [...document.querySelectorAll("[data-command-target]")];
  let commandFocus = 0;

  function visibleCommandButtons() {
    return commandButtons.filter((button) => button.style.display !== "none");
  }

  function refreshCommandFocus() {
    commandButtons.forEach((button) => button.classList.remove("focused"));
    const buttons = visibleCommandButtons();
    if (!buttons.length) return;
    commandFocus = Math.max(0, Math.min(commandFocus, buttons.length - 1));
    buttons[commandFocus].classList.add("focused");
  }

  function openCommandPalette() {
    commandOverlay.classList.add("open");
    commandOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    commandInput.value = "";
    commandButtons.forEach((button) => { button.style.display = "grid"; });
    commandFocus = 0;
    refreshCommandFocus();
    setTimeout(() => commandInput.focus(), 40);
  }

  function closeCommandPalette() {
    commandOverlay.classList.remove("open");
    commandOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  commandButton.addEventListener("click", openCommandPalette);

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      commandOverlay.classList.contains("open") ? closeCommandPalette() : openCommandPalette();
      return;
    }

    if (!commandOverlay.classList.contains("open")) return;

    if (event.key === "Escape") closeCommandPalette();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      commandFocus = (commandFocus + 1) % Math.max(visibleCommandButtons().length, 1);
      refreshCommandFocus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commandFocus = (commandFocus - 1 + Math.max(visibleCommandButtons().length, 1)) % Math.max(visibleCommandButtons().length, 1);
      refreshCommandFocus();
    }
    if (event.key === "Enter") {
      const buttons = visibleCommandButtons();
      buttons[commandFocus]?.click();
    }

    const numericIndex = Number(event.key) - 1;
    if (numericIndex >= 0 && numericIndex < panelNames.length) {
      closeCommandPalette();
      goToPanel(numericIndex);
    }
  });

  commandOverlay.addEventListener("click", (event) => {
    if (event.target === commandOverlay) closeCommandPalette();
  });

  commandInput.addEventListener("input", () => {
    const query = commandInput.value.trim().toLowerCase();
    commandButtons.forEach((button) => {
      button.style.display = button.textContent.toLowerCase().includes(query) ? "grid" : "none";
    });
    commandFocus = 0;
    refreshCommandFocus();
  });

  commandButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeCommandPalette();
      goToName(button.dataset.commandTarget);
    });
  });

  // Certificate viewer.
  const certificateCards = [...document.querySelectorAll(".certificate-card")];
  const certificateModal = document.getElementById("certificateModal");
  const certificateImage = document.getElementById("certificateImage");
  const certificateTitle = document.getElementById("certificateTitle");
  const certificateMeta = document.getElementById("certificateMeta");
  let activeCertificate = 0;

  function displayCertificate(index) {
    activeCertificate = (index + certificateCards.length) % certificateCards.length;
    const card = certificateCards[activeCertificate];
    certificateImage.src = card.dataset.image;
    certificateImage.alt = card.dataset.title;
    certificateTitle.textContent = card.dataset.title;
    certificateMeta.textContent = card.dataset.meta;
  }

  function openCertificate(index) {
    displayCertificate(index);
    certificateModal.classList.add("open");
    certificateModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeCertificate() {
    certificateModal.classList.remove("open");
    certificateModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  certificateCards.forEach((card, index) => card.addEventListener("click", () => openCertificate(index)));
  document.getElementById("certificateClose").addEventListener("click", closeCertificate);
  document.getElementById("certificatePrev").addEventListener("click", () => displayCertificate(activeCertificate - 1));
  document.getElementById("certificateNext").addEventListener("click", () => displayCertificate(activeCertificate + 1));

  certificateModal.addEventListener("click", (event) => {
    if (event.target === certificateModal) closeCertificate();
  });

  window.addEventListener("keydown", (event) => {
    if (!certificateModal.classList.contains("open")) return;
    if (event.key === "Escape") closeCertificate();
    if (event.key === "ArrowLeft") displayCertificate(activeCertificate - 1);
    if (event.key === "ArrowRight") displayCertificate(activeCertificate + 1);
  });

  // Subtle 3D cards on devices with a precise pointer.
  if (window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".tilt-card").forEach((card) => {
      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 6}deg) translateY(-2px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  // Contact form opens the user's email app with a prepared message.
  const contactForm = document.getElementById("contactForm");
  const formNote = document.getElementById("formNote");

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`Hello Samuel,\n\n${message}\n\nFrom: ${name}\nEmail: ${email}`);
    formNote.textContent = "Opening your email application...";
    window.location.href = `mailto:samuelxxx1207@gmail.com?subject=${subject}&body=${body}`;
    setTimeout(() => {
      formNote.textContent = "No message is stored on this website.";
    }, 1800);
  });

  setTimeout(() => navigationHint?.classList.add("hidden"), 6000);
});
