(() => {
  "use strict";

  const config = window.SPA_CONFIG || {};
  const isPagesDirectory = window.location.pathname.replace(/\\/g, "/").includes("/pages/");
  const rootPrefix = isPagesDirectory ? "../" : "";
  let currentLanguage = localStorage.getItem("spaLanguage") || "en";
  let translations = {};
  let courses = {};

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return response.json();
  }

  function text(key, fallback = key) {
    if (translations?.strings?.[key] !== undefined) return translations.strings[key];
    return key.split(".").reduce((value, part) => value?.[part], translations) ?? fallback;
  }

  function translateTextNodes() {
    const root = document.body;
    if (!root || !translations?.strings) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)) return;
      const raw = node.nodeValue || '';
      const trimmed = raw.trim();
      if (!trimmed) return;
      const translated = translations.strings[trimmed];
      if (translated && translated !== trimmed) {
        node.nodeValue = raw.replace(trimmed, translated);
      }
    });
  }

  function resolveCourse(value) {
    const input = String(value || "").trim().toLowerCase();
    return Object.values(courses).find(course =>
      course.slug.toLowerCase() === input ||
      course.name.toLowerCase() === input
    ) || null;
  }

  function buildGoogleFormUrl(courseName = "") {
    const baseUrl = config.googleForm?.viewUrl || "";
    const entryId = config.googleForm?.courseEntryId || "";

    if (!baseUrl || !entryId || !courseName) return baseUrl;

    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}usp=pp_url&${encodeURIComponent(entryId)}=${encodeURIComponent(courseName)}`;
  }

  function openGoogleForm(courseName = "") {
    const url = buildGoogleFormUrl(courseName || localStorage.getItem("spaSelectedCourse") || "");

    if (!url) {
      alert(currentLanguage === "ar" ? "رابط التسجيل غير مُعد بعد." : "The registration form is not configured yet.");
      return;
    }

    if (courseName) localStorage.setItem("spaSelectedCourse", courseName);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  window.openAcademyRegistration = () => openGoogleForm();
  window.openGoogleRegistration = openGoogleForm;

  window.openCourse = (value) => {
    const course = resolveCourse(value);
    if (!course) {
      window.location.href = `${rootPrefix}pages/courses.html`;
      return;
    }

    localStorage.setItem("spaSelectedCourse", course.name);
    window.location.href = `${rootPrefix}pages/course.html?course=${encodeURIComponent(course.slug)}`;
  };

  window.toggleLanguage = async () => {
    currentLanguage = currentLanguage === "en" ? "ar" : "en";
    await applyLanguage();
  };

  function applyNavigationLinks() {
    const links = {
      home: `${rootPrefix}index.html`,
      courses: `${rootPrefix}pages/courses.html`,
      about: `${rootPrefix}pages/about.html`,
      contact: `${rootPrefix}pages/contact.html`
    };

    $$('[data-nav]').forEach(link => {
      const target = links[link.dataset.nav];
      if (target) link.href = target;
    });
  }

  function renderTranslations() {
    $$('[data-i18n]').forEach(element => {
      const value = text(element.dataset.i18n, element.textContent);
      element.textContent = value;
    });

    $$('[data-i18n-placeholder]').forEach(element => {
      element.placeholder = text(element.dataset.i18nPlaceholder, element.placeholder);
    });

    const languageLabel = $("#langLabel");
    if (languageLabel) languageLabel.textContent = currentLanguage === "ar" ? "English" : "العربية";
  }

  async function applyLanguage() {
    try {
      translations = await loadJson(`${rootPrefix}data/translations/${currentLanguage}.json`);
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
      renderTranslations();
      translateTextNodes();
      renderMobileCoursePreview();
      updateActiveNavigation();
      document.dispatchEvent(new CustomEvent("spa:languageChanged", { detail: { language: currentLanguage } }));
      localStorage.setItem("spaLanguage", currentLanguage);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadCourseData() {
    try {
      courses = await loadJson(`${rootPrefix}data/courses.json`);
      window.SPA_COURSES = courses;
    } catch (error) {
      console.error(error);
      courses = {};
    }
  }

  async function loadNavbar() {
    const mount = $("#siteNavbar");
    if (!mount) return;

    try {
      const response = await fetch(`${rootPrefix}navbar.html`);
      if (!response.ok) throw new Error("Navbar could not be loaded.");
      mount.innerHTML = await response.text();
      applyNavigationLinks();
      updateActiveNavigation();
      setupMobileMenu();
      renderTranslations();
      translateTextNodes();
      updateActiveNavigation();
    } catch (error) {
      console.error(error);
      mount.innerHTML = "";
    }
  }

  function setupMobileMenu() {
    const button = $("#mobileMenuBtn");
    const menu = $("#mobileMenu");
    if (!button || !menu) return;

    button.addEventListener("click", () => {
      const isHidden = menu.classList.toggle("hidden");
      button.setAttribute("aria-expanded", String(!isHidden));
    });

    $$("#mobileMenu a").forEach(link => {
      link.addEventListener("click", () => {
        menu.classList.add("hidden");
        button.setAttribute("aria-expanded", "false");
      });
    });
  }

  function renderMobileCoursePreview() {
    const mount = $("#mobileCourseCards");
    if (!mount || !Object.keys(courses).length) return;

    mount.innerHTML = Object.values(courses).map(course => `
      <article class="mobile-course-card">
        <div class="mobile-course-icon" aria-hidden="true"><i class="${course.icon}"></i></div>
        <div class="course-copy">
          <div class="course-title">${text(course.name, course.name)}</div>
          <div class="course-meta">
            ${text("Level 1", "Level 1")} · ${text(course.duration, course.duration)} ·
            ${
              course.oldPrice
                ? `<span class="line-through text-gray-400">${course.oldPrice}</span>
                  <span class="font-bold text-gray-900">${course.price}</span>`
                : `<span class="font-bold text-gray-900">${course.price}</span>`
            }
          </div>
        </div>
        <button type="button" class="btn-primary course-action" data-view-course="${course.slug}">${text("VIEW COURSE", "VIEW COURSE")}</button>
      </article>
    `).join("");

  }

  function updateActiveNavigation() {
    const path = window.location.pathname.replace(/\\/g, "/");
    let active = "home";
    if (path.includes("/pages/courses") || path.includes("/pages/course")) active = "courses";
    else if (path.includes("/pages/about")) active = "about";
    else if (path.includes("/pages/contact")) active = "contact";

    $$('[data-nav]').forEach(link => {
      link.classList.toggle("active", link.dataset.nav === active);
      if (link.dataset.nav === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function setupCourseActions() {
    if (document.body.dataset.courseActionsReady === "true") return;
    document.body.dataset.courseActionsReady = "true";

    document.addEventListener("click", event => {
      const viewButton = event.target.closest("[data-view-course]");
      if (viewButton) {
        openCourse(viewButton.dataset.viewCourse);
        return;
      }

      const registerButton = event.target.closest("[data-register-course]");
      if (registerButton) openGoogleForm(registerButton.dataset.registerCourse);
    });
  }

  async function initialize() {
    await loadCourseData();
    await loadNavbar();
    await applyLanguage();
    renderMobileCoursePreview();
    setupCourseActions();
    document.dispatchEvent(new CustomEvent("spa:ready", { detail: { courses } }));
    translateTextNodes();
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
