/* ============================================================
   MAX LELIÈVRE — PORTFOLIO
   Application statique : routage par ancre, FR / EN, projets.
   Aucune dépendance, aucun backend.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     DONNÉES ET ÉTAT
     ---------------------------------------------------------- */
  const T = window.TRANSLATIONS || { fr: {}, en: {} };
  const RAW_SITE = window.SITE || {};
  const PROJECTS = Array.isArray(window.PROJECTS) ? window.PROJECTS.slice() : [];
  const SOFTWARE_CATALOG = Array.isArray(window.SOFTWARE_CATALOG) ? window.SOFTWARE_CATALOG : [];

  const DEFAULT_LANG = "fr";
  const STORAGE_KEY = "max-lelievre-lang";
  const THEME_STORAGE_KEY = "max-lelievre-theme";
  const THEMES = ["blue", "light", "dark"];
  const REDUCED = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SITE = Object.assign({
    name: "Max Lelièvre",
    location: "",
    email: "",
    linkedin: "",
    vimeo: "",
    youtube: "",
    cv: "",
    heroImage: "",
    heroImageAlt: { fr: "", en: "" },
    showreel: {}
  }, RAW_SITE);
  SITE.showreel = Object.assign({
    embed: "",
    file: "",
    poster: "",
    year: "",
    breakdown: []
  }, RAW_SITE.showreel || {});

  const BACKGROUNDS = ["deep-space", "nebula", "horizon", "orbital", "topographic", "hud", "streaks", "minimal"];

  const THEME_COLORS = {
    blue: "#0B1E2A",
    dark: "#101112",
    light: "#EDF2F5"
  };

  const state = {
    lang: readLang(),
    theme: readTheme(),
    background: readBackground(),
    animationsEnabled: readAnimationsEnabled(),
    filter: "all",
    route: { name: "home" },
    menuOpen: false,
    lightbox: { items: [], index: 0, trigger: null },
    gallery: [],
    firstRender: true
  };

  const NAV = [
    { key: "home", name: "home", href: "#/" },
    { key: "projects", name: "projects", href: "#/projects" },
    { key: "showreel", name: "showreel", href: "#/showreel" },
    { key: "about", name: "about", href: "#/about" },
    { key: "cv", name: "cv", href: "#/cv" },
    { key: "contact", name: "contact", href: "#/contact" }
  ];

  /* ----------------------------------------------------------
     OUTILS
     ---------------------------------------------------------- */
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function readLang() {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (requested === "fr" || requested === "en") return requested;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "fr" || saved === "en") return saved;
    } catch (error) { /* stockage indisponible */ }
    return DEFAULT_LANG;
  }

  function readTheme() {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (THEMES.indexOf(saved) !== -1) return saved;
    } catch (error) { /* stockage indisponible */ }
    const theme = SITE.theme;
    return THEMES.indexOf(theme) !== -1 ? theme : "blue";
  }

  function readBackground() {
    const background = SITE.backgroundStyle;
    return BACKGROUNDS.indexOf(background) !== -1 ? background : "deep-space";
  }

  function readAnimationsEnabled() {
    return SITE.backgroundMotion !== false;
  }

  function getPath(object, path) {
    return path.split(".").reduce(function (value, key) {
      return value && value[key] !== undefined ? value[key] : undefined;
    }, object);
  }

  function t(path, vars) {
    let value = getPath(T[state.lang], path);
    if (value === undefined) value = getPath(T.fr, path);
    if (value === undefined) return path;
    if (typeof value === "string" && vars) {
      return value.replace(/\{(\w+)\}/g, function (match, key) {
        return vars[key] !== undefined ? vars[key] : match;
      });
    }
    return value;
  }

  function pick(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    return value[state.lang] || "";
  }

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/[&<>"']/g, function (char) { return ESCAPES[char]; });
  }

  function assetUrl(path) {
    const relativePath = String(path || "").replace(/^\/+/, "");
    return relativePath ? new URL(relativePath, document.baseURI).href : "";
  }

  function youtubeEmbedUrl(videoId) {
    const url = new URL("https://www.youtube-nocookie.com/embed/" + videoId);
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      url.searchParams.set("origin", window.location.origin);
    }
    return url.href;
  }

  function hasText(value) {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Boolean(pick(value).trim());
    return String(value).trim().length > 0;
  }

  function formatText(value) {
    const text = pick(value).trim();
    if (!text) return "";
    return text.split(/\n{2,}/).map(function (paragraph) {
      return "<p>" + esc(pick(paragraph) || paragraph).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function taxonomyLabel(group, key) {
    if (!key) return "";
    const value = getPath(T[state.lang], "taxonomy." + group + "." + key) ||
      getPath(T.fr, "taxonomy." + group + "." + key);
    return value || key;
  }

  function categoryLabels(project) {
    return (project.categories || []).map(function (key) {
      return taxonomyLabel("category", key);
    }).filter(Boolean);
  }

  function projectTitle(project) {
    return state.lang === "en" && project.titleEN ? project.titleEN : project.title;
  }

  function softwareMarks(items, modifier) {
    return (items || []).map(function (item) {
      const name = typeof item === "string" ? item : (item.name || "");
      if (!name) return "";
      const catalogItem = SOFTWARE_CATALOG.find(function (entry) { return entry.name === name; });
      const icon = catalogItem ? '<img class="software-mark__icon" src="' + esc(assetUrl(catalogItem.logo)) + '" alt="" loading="lazy">' : "";
      const level = typeof item === "object" && item.level ? '<small>' + esc(item.level) + '</small>' : "";
      return '<span class="software-mark' + (modifier ? " software-mark--" + modifier : "") + '">' + icon + '<span>' + esc(name) + '</span>' + level + '</span>';
    }).join("");
  }

  function projectCountLabel(count) {
    return t(count === 1 ? "projectsPage.countOne" : "projectsPage.countMany", { n: count });
  }

  function visibleProjects() {
    return PROJECTS.filter(function (project) {
      return project && project.id && project.visible !== false;
    }).sort(function (a, b) {
      const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : PROJECTS.indexOf(a) + 1;
      const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : PROJECTS.indexOf(b) + 1;
      return orderA - orderB;
    });
  }

  function featuredProjects() {
    return visibleProjects().filter(function (project) { return project.featured === true; });
  }

  function additionalProjects() {
    return visibleProjects().filter(function (project) { return project.featured !== true; });
  }

  function projectById(id) {
    return visibleProjects().find(function (project) { return project.id === id; }) || null;
  }

  function announce(message) {
    const region = $("#live-region");
    if (!region) return;
    region.textContent = "";
    window.setTimeout(function () { region.textContent = message; }, 60);
  }

  function activeNav(item) {
    const route = state.route;
    if (item.name === "home") return route.name === "home";
    if (item.name === "projects") return route.name === "projects" || route.name === "project";
    return route.name === item.name;
  }

  /* ----------------------------------------------------------
     ROUTAGE
     ---------------------------------------------------------- */
  function parseRoute() {
    const raw = (window.location.hash || "").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    if (!parts.length) return { name: "home" };
    if (parts[0] === "project" && parts[1]) {
      return { name: "project", id: decodeURIComponent(parts[1]) };
    }
    if (["projects", "showreel", "about", "contact", "cv"].indexOf(parts[0]) !== -1) {
      return { name: parts[0] };
    }
    return { name: "notfound" };
  }

  function routeKey(route) {
    return route.name + (route.id ? "/" + route.id : "");
  }

  function navHref(item) {
    return item.href;
  }

  function setMeta(title, description) {
    document.title = title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) descriptionTag.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", description);
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", state.lang === "fr" ? "fr_FR" : "en_GB");
  }

  /* ----------------------------------------------------------
     INTERFACE : EN-TÊTE, MENU, PIED DE PAGE
     ---------------------------------------------------------- */
  function brandMarkup(modifier) {
    return '<a class="brand ' + (modifier || "") + '" href="#/" aria-label="' + esc(t("common.homeLink")) + '">' +
      '<span class="brand__mark" aria-hidden="true">ML</span>' +
      '<span class="brand__text">' +
        '<span class="brand__name">Max Lelièvre</span>' +
        '<span class="brand__role">VFX · Compositing</span>' +
      '</span>' +
    '</a>';
  }

  function langSwitcher(modifier) {
    return '<div class="lang-switch ' + (modifier || "") + '" role="group" aria-label="' + esc(t("common.language")) + '">' +
      '<button class="lang-switch__btn' + (state.lang === "fr" ? " is-active" : "") + '" type="button" data-lang="fr" aria-pressed="' + (state.lang === "fr") + '" title="' + esc(t("common.switchToFr")) + '">FR<span class="sr-only"> — ' + esc(t("common.french")) + '</span></button>' +
      '<button class="lang-switch__btn' + (state.lang === "en" ? " is-active" : "") + '" type="button" data-lang="en" aria-pressed="' + (state.lang === "en") + '" title="' + esc(t("common.switchToEn")) + '">EN<span class="sr-only"> — ' + esc(t("common.english")) + '</span></button>' +
    '</div>';
  }

  function themeName(theme) {
    return t("common.theme" + theme.charAt(0).toUpperCase() + theme.slice(1));
  }

  function themeSwitcher(modifier) {
    return '<div class="theme-switch ' + (modifier || "") + '" role="group" aria-label="' + esc(t("common.themeGroup")) + '">' +
      THEMES.map(function (theme) {
        const active = state.theme === theme;
        return '<button class="theme-switch__btn' + (active ? " is-active" : "") + '" type="button" data-theme-choice="' + theme +
          '" aria-pressed="' + active + '" aria-label="' + esc(themeName(theme)) + '" title="' + esc(themeName(theme)) + '">' +
          '<span class="theme-switch__swatch theme-switch__swatch--' + theme + '" aria-hidden="true"></span>' +
          '<span class="theme-switch__name" aria-hidden="true">' + esc(themeName(theme)) + '</span>' +
        '</button>';
      }).join("") +
    '</div>';
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[state.theme] || THEME_COLORS.blue);
    const scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute("content", state.theme === "light" ? "light" : "dark");
  }

  function applyAppearance() {
    const enabled = SITE.backgroundEffects !== false && state.background !== "minimal";
    document.body.classList.toggle("has-background-art", enabled);
    document.body.dataset.background = state.background;
    document.body.dataset.backgroundMotion = state.animationsEnabled && !REDUCED() ? "on" : "off";
  }

  function contactAction(className) {
    return '<a class="' + className + '" href="#/contact">' + esc(t("nav.contact")) + '<span aria-hidden="true">→</span></a>';
  }

  function renderShell() {
    applyTheme();
    applyAppearance();
    const header = $("#site-header");
    if (header) {
      header.innerHTML =
        '<div class="container header__inner">' +
          brandMarkup() +
          '<nav class="header__nav" aria-label="' + esc(t("nav.primary")) + '">' +
            NAV.map(function (item) {
              const current = activeNav(item);
              return '<a class="header__link' + (current ? " is-active" : "") + '" href="' + navHref(item) + '"' +
                (current ? ' aria-current="page"' : "") + '>' + esc(t("nav." + item.key)) + '</a>';
            }).join("") +
          '</nav>' +
          '<div class="header__actions">' +
            langSwitcher("lang-switch--header") +
            themeSwitcher("theme-switch--header") +
            '<button class="menu-toggle" type="button" data-menu-toggle aria-expanded="' + state.menuOpen +
              '" aria-controls="mobile-menu" aria-label="' + esc(state.menuOpen ? t("common.closeMenu") : t("common.openMenu")) + '">' +
              '<span class="menu-toggle__label">' + esc(t("common.menu")) + '</span>' +
              '<span class="menu-toggle__icon" aria-hidden="true"><span></span><span></span></span>' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    const menu = $("#mobile-menu");
    if (menu) {
      menu.innerHTML =
        '<div class="mobile-menu__inner container">' +
          '<nav class="mobile-menu__nav" aria-label="' + esc(t("nav.mobile")) + '">' +
            NAV.map(function (item, index) {
              const current = activeNav(item);
              return '<a class="mobile-menu__link' + (current ? " is-active" : "") + '" href="' + navHref(item) + '"' +
                (current ? ' aria-current="page"' : "") + '>' +
                '<span class="mobile-menu__index">0' + (index + 1) + '</span>' +
                '<span class="mobile-menu__label">' + esc(t("nav." + item.key)) + '</span>' +
                '<span class="mobile-menu__arrow" aria-hidden="true">↗</span>' +
              '</a>';
            }).join("") +
          '</nav>' +
          '<div class="mobile-menu__footer">' +
            '<div class="mobile-menu__row">' +
              '<span class="mobile-menu__kicker">' + esc(t("common.language")) + '</span>' +
              langSwitcher("lang-switch--menu") +
            '</div>' +
            '<div class="mobile-menu__row mobile-menu__row--theme">' +
              '<span class="mobile-menu__kicker">' + esc(t("common.theme")) + '</span>' +
              themeSwitcher("theme-switch--menu") +
            '</div>' +
            '<div class="mobile-menu__row">' +
              '<span class="mobile-menu__kicker">' + esc(t("footer.location")) + '</span>' +
              '<span>' + esc(SITE.location) + '</span>' +
            '</div>' +
            '<div class="mobile-menu__contact">' + contactAction("mobile-menu__cta") + '</div>' +
          '</div>' +
        '</div>';
      menu.setAttribute("aria-hidden", String(!state.menuOpen));
      menu.inert = !state.menuOpen;
      menu.classList.toggle("is-open", state.menuOpen);
    }

    const footer = $("#site-footer");
    if (footer) {
      footer.innerHTML =
        '<div class="container">' +
          '<div class="footer__top">' +
            '<div class="footer__brand">' +
              brandMarkup("brand--footer") +
              '<p class="footer__location">' + esc(SITE.location) + '</p>' +
            '</div>' +
            '<nav class="footer__col" aria-label="' + esc(t("nav.footer")) + '">' +
              '<h2 class="footer__title">' + esc(t("footer.navTitle")) + '</h2>' +
              '<ul class="footer__list">' +
                NAV.map(function (item) {
                  return '<li><a class="footer__link" href="' + navHref(item) + '">' + esc(t("nav." + item.key)) + '</a></li>';
                }).join("") +
              '</ul>' +
            '</nav>' +
            '<div class="footer__col">' +
              '<h2 class="footer__title">' + esc(t("footer.contactTitle")) + '</h2>' +
              '<ul class="footer__list">' +
                '<li>' + socialLink(t("contact.linkedinLabel"), SITE.linkedin) + '</li>' +
                '<li>' + socialLink(t("contact.youtubeLabel"), SITE.youtube) + '</li>' +
              '</ul>' +
            '</div>' +
            '<div class="footer__col">' +
              '<h2 class="footer__title">' + esc(t("footer.languageTitle")) + '</h2>' +
              langSwitcher("lang-switch--footer") +
              '<button class="footer__top-link" type="button" data-back-to-top>' +
                esc(t("footer.top")) + '<span aria-hidden="true">↑</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="footer__bottom">' +
            '<p>' + esc(t("footer.copyright", { year: new Date().getFullYear() })) + '</p>' +
          '</div>' +
        '</div>';
    }

    const skip = $("[data-i18n-skip]");
    if (skip) skip.textContent = t("common.skip");

    const lightbox = $("#lightbox");
    if (lightbox) lightbox.setAttribute("aria-label", t("project.gallery"));

    document.documentElement.lang = state.lang;
    document.documentElement.dataset.theme = state.theme;
  }

  function socialLink(label, url) {
    const kind = label.toLowerCase().includes("youtube") ? "youtube" : "linkedin";
    const icon = '<img class="social-logo" src="assets/icons/social-' + kind + '.svg" alt="">';
    if (url) return '<a class="footer__link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + icon + esc(label) + '<span aria-hidden="true"> ↗</span><span class="sr-only"> (' + esc(t("common.externalLink")) + ')</span></a>';
    return '<span class="footer__link footer__link--pending">' + esc(label) + '<span class="footer__pending">' + esc(t("common.pending")) + '</span></span>';
  }

  function contactIcon(kind) {
    if (kind === "linkedin" || kind === "youtube") return '<img class="contact-icon contact-icon--' + kind + '" src="assets/icons/social-' + kind + '.svg" alt="">';
    const paths = {
      email: '<path d="M3 5h18v14H3z"/><path d="m3 6 9 7 9-7"/>',
      phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.68 2.8a2 2 0 0 1-.45 2.11L8.07 9.93a16 16 0 0 0 6 6l1.3-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.68A2 2 0 0 1 22 16.92z"/>'
    };
    return '<svg class="contact-icon contact-icon--' + kind + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (paths[kind] || paths.email) + '</svg>';
  }

  function contactProfileCard(kind, label, text) {
    return '<div class="contact-profile contact-profile--static">' + contactIcon(kind) + '<span><small>' + esc(label) + '</small><strong>' + esc(text) + '</strong></span></div>';
  }

  function contactProfileLink(kind, label, url, text) {
    if (!url) return '';
    const external = kind === "linkedin" || kind === "youtube";
    return '<a class="contact-profile" href="' + esc(url) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
      contactIcon(kind) + '<span><small>' + esc(label) + '</small><strong>' + esc(text) + '</strong></span>' +
      (external ? '<span class="contact-profile__arrow" aria-hidden="true">↗</span>' : '') +
    '</a>';
  }

  /* ----------------------------------------------------------
     LANGUE
     ---------------------------------------------------------- */
  function setLang(lang) {
    if ((lang !== "fr" && lang !== "en") || lang === state.lang) return;
    state.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (error) { /* stockage indisponible */ }

    const wasMenuOpen = state.menuOpen;
    const scrollPosition = window.scrollY;
    renderRoute({ preserveScroll: true });
    if (wasMenuOpen) setMenu(true);
    window.scrollTo(0, scrollPosition);
    announce(lang === "fr" ? "Langue : français" : "Language: English");
  }

  /* ----------------------------------------------------------
     THÈME
     ---------------------------------------------------------- */
  function setTheme(theme) {
    if (THEMES.indexOf(theme) === -1 || theme === state.theme) return;
    state.theme = theme;
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (error) { /* stockage indisponible */ }
    applyTheme();
    $$("[data-theme-choice]").forEach(function (button) {
      const active = button.getAttribute("data-theme-choice") === theme;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    announce(t("common.themeAnnounce", { theme: themeName(theme) }));
  }

  /* ----------------------------------------------------------
     MENU MOBILE
     ---------------------------------------------------------- */
  function setMenu(open, returnFocus) {
    const menu = $("#mobile-menu");
    if (!menu) return;
    state.menuOpen = open;
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menu.inert = !open;
    document.body.classList.toggle("menu-open", open);

    const toggle = $("[data-menu-toggle]", $("#site-header"));
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? t("common.closeMenu") : t("common.openMenu"));
    }

    if (open) {
      const first = $("a, button", menu);
      if (first) first.focus({ preventScroll: true });
    } else if (returnFocus && toggle) {
      toggle.focus({ preventScroll: true });
    }
  }

  function trapFocus(event, container) {
    if (event.key !== "Tab" || !container) return;
    const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (element) { return element.getClientRects().length > 0; });
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ----------------------------------------------------------
     EN-TÊTE AU DÉFILEMENT
     ---------------------------------------------------------- */
  function updateHeader() {
    const header = $("#site-header");
    if (!header) return;
    header.classList.toggle("is-inner", state.route.name !== "home");
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  /* ----------------------------------------------------------
     RENDU DES ROUTES
     ---------------------------------------------------------- */
  function renderRoute(options) {
    options = options || {};
    const previousRoute = state.route;
    state.route = parseRoute();
    const routeChanged = !state.firstRender && routeKey(previousRoute) !== routeKey(state.route);
    renderShell();
    const main = $("#main");
    if (!main) return;

    let html = "";
    switch (state.route.name) {
      case "home":
        html = renderHome();
        setMeta(t("meta.homeTitle"), t("meta.homeDescription"));
        break;
      case "projects":
        html = renderProjectsPage();
        setMeta(t("meta.projectsTitle"), t("meta.projectsDescription"));
        break;
      case "project":
        html = renderProjectPage(state.route.id);
        break;
      case "showreel":
        html = renderShowreelPage();
        setMeta(t("meta.showreelTitle"), t("meta.showreelDescription"));
        break;
      case "about":
        html = renderAboutPage();
        setMeta(t("meta.aboutTitle"), t("meta.aboutDescription"));
        break;
      case "contact":
        html = renderContactPage();
        setMeta(t("meta.contactTitle"), t("meta.contactDescription"));
        break;
      case "cv":
        html = renderCVPage();
        setMeta("CV — Max Lelièvre", SITE.headline[state.lang]);
        break;
      default:
        html = renderNotFoundPage();
        setMeta(t("meta.notFoundTitle"), t("meta.notFoundTitle"));
    }

    main.innerHTML = html;
    if (routeChanged) {
      main.classList.remove("route-enter");
      void main.offsetWidth;
      main.classList.add("route-enter");
      window.setTimeout(function () { main.classList.remove("route-enter"); }, 420);
    }
    updateHeader();
    setupReveals();
    setupComparisons();

    if (!options.preserveScroll) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (!state.firstRender) main.focus({ preventScroll: true });
    }
    state.firstRender = false;
  }

  /* ----------------------------------------------------------
     ÉVÉNEMENTS
     ---------------------------------------------------------- */
  function bindEvents() {
    window.addEventListener("hashchange", function () {
      closeLightbox();
      setMenu(false);
      renderRoute();
    });

    window.addEventListener("scroll", updateHeader, { passive: true });

    // Le routage est traité dès la phase de capture : un clic gauche sur un lien
    // interne reste donc fiable, même si un contrôle voisin gère aussi les clics.
    document.addEventListener("click", function (event) {
      if (event.button !== 0) return;
      const hashLink = event.target.closest('a[href^="#/"]');
      if (!hashLink) return;
      event.preventDefault();
      event.stopPropagation();
      const destination = hashLink.getAttribute("href");
      if (state.menuOpen) setMenu(false);
      if (window.location.hash === destination) renderRoute();
      else window.location.hash = destination;
    }, true);

    document.addEventListener("click", function (event) {
      const themeButton = event.target.closest("[data-theme-choice]");
      if (themeButton) {
        event.preventDefault();
        setTheme(themeButton.getAttribute("data-theme-choice"));
        return;
      }

      const langButton = event.target.closest("[data-lang]");
      if (langButton) {
        event.preventDefault();
        setLang(langButton.getAttribute("data-lang"));
        return;
      }

      const menuToggle = event.target.closest("[data-menu-toggle]");
      if (menuToggle) {
        event.preventDefault();
        setMenu(!state.menuOpen, true);
        return;
      }

      const filterButton = event.target.closest("[data-filter]");
      if (filterButton) {
        event.preventDefault();
        state.filter = filterButton.getAttribute("data-filter") || "all";
        renderRoute({ preserveScroll: true });
        const active = $('[data-filter="' + state.filter + '"]');
        if (active) active.focus({ preventScroll: true });
        return;
      }

      const scrollButton = event.target.closest("[data-scroll]");
      if (scrollButton) {
        event.preventDefault();
        const target = document.getElementById(scrollButton.getAttribute("data-scroll"));
        if (target) target.scrollIntoView({ behavior: REDUCED() ? "auto" : "smooth", block: "start" });
        return;
      }

      if (event.target.closest("[data-back-to-top]")) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: REDUCED() ? "auto" : "smooth" });
        return;
      }

      const copyButton = event.target.closest("[data-copy-email]");
      if (copyButton) {
        event.preventDefault();
        copyEmail(copyButton.getAttribute("data-copy-email"), copyButton);
        return;
      }

      const lightboxTrigger = event.target.closest("[data-lightbox-index]");
      if (lightboxTrigger) {
        event.preventDefault();
        openLightbox(Number(lightboxTrigger.getAttribute("data-lightbox-index")), lightboxTrigger);
        return;
      }

      if (event.target.closest("[data-lightbox-close]") || event.target.id === "lightbox") {
        closeLightbox();
        return;
      }
      if (event.target.closest("[data-lightbox-prev]")) {
        moveLightbox(-1);
        return;
      }
      if (event.target.closest("[data-lightbox-next]")) {
        moveLightbox(1);
        return;
      }

    });

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", applyAppearance);
    } else if (typeof motionQuery.addListener === "function") {
      motionQuery.addListener(applyAppearance);
    }

    document.addEventListener("submit", function (event) {
      const form = event.target.closest("[data-contact-form]");
      if (!form) return;
      event.preventDefault();
      if (!SITE.email) { window.alert(t("contact.configureEmail")); return; }
      const data = new FormData(form);
      const subject = encodeURIComponent(data.get("subject"));
      const body = encodeURIComponent((state.lang === "fr" ? "Nom / Studio : " : "Name / Studio: ") + data.get("name") + "\n" + (state.lang === "fr" ? "E-mail : " : "Email: ") + data.get("email") + "\n\n" + data.get("message"));
      window.location.href = "mailto:" + encodeURIComponent(SITE.email) + "?subject=" + subject + "&body=" + body;
    });

    document.addEventListener("keydown", function (event) {
      const lightbox = $("#lightbox");
      const lightboxOpen = lightbox && !lightbox.inert;

      if (event.key === "Escape") {
        if (lightboxOpen) { closeLightbox(); return; }
        if (state.menuOpen) { setMenu(false, true); return; }
      }

      if (state.menuOpen) {
        trapFocus(event, $("#mobile-menu"));
        return;
      }

      if (lightboxOpen) {
        if (event.key === "ArrowLeft") { event.preventDefault(); moveLightbox(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); moveLightbox(1); }
        trapFocus(event, lightbox);
      }
    });
  }

  /* ----------------------------------------------------------
     INITIALISATION
     ---------------------------------------------------------- */
  function init() {
    if (!window.location.hash) {
      try { history.replaceState(null, "", "#/"); } catch (error) { window.location.hash = "#/"; }
    }
    document.documentElement.lang = state.lang;
    renderRoute();
    bindEvents();
    updateHeader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ----------------------------------------------------------
     MÉDIAS ET CARTES PROJET
     ---------------------------------------------------------- */
  function mediaMarkup(options) {
    const ratio = options.ratio || "16 / 9";
    const src = options.src || "";
    const alt = options.alt || "";
    const code = options.code || "";
    const label = options.label || t("common.visualPending");
    const meta = options.meta || "";
    const className = options.className || "";
    const variant = options.variant || 1;
    const loading = options.eager
      ? ' loading="eager" fetchpriority="high"'
      : ' loading="lazy"';

    if (src) {
      return '<figure class="media ' + className + '" style="aspect-ratio:' + ratio + '">' +
        '<img src="' + esc(src) + '" alt="' + esc(alt) + '"' + loading + ' decoding="async">' +
      '</figure>';
    }

    return '<div class="media-ph media-ph--v' + variant + ' ' + className + '" style="aspect-ratio:' + ratio + '" role="img" aria-label="' + esc(alt || label) + '">' +
      '<span class="media-ph__frame" aria-hidden="true"></span>' +
      (options.orbit ? '<span class="orbit" aria-hidden="true"><i></i><i></i><i></i><b></b></span>' : '') +
      '<span class="media-ph__top" aria-hidden="true"><span class="media-ph__dot"></span>' + esc(label) + '</span>' +
      (code ? '<span class="media-ph__code" aria-hidden="true">' + esc(code) + '</span>' : '') +
      '<span class="media-ph__bottom" aria-hidden="true"><span>' + esc(meta) + '</span><span>' + esc(options.corner || "") + '</span></span>' +
    '</div>';
  }

  function projectCard(project, index, variant) {
    const isCompact = variant === "compact";
    const categories = categoryLabels(project).join(" · ");
    const status = taxonomyLabel("status", project.status);
    const role = pick(project.role);
    const description = pick(project.shortDescription);
    const metaBits = [categories, project.year ? String(project.year) : "", status].filter(Boolean);

    return '<article class="project-card project-card--' + (isCompact ? "compact" : "featured") + '" data-reveal>' +
      '<a class="project-card__link" href="#/project/' + encodeURIComponent(project.id) + '" aria-label="' + esc(t("common.projectLink", { title: projectTitle(project) })) + '">' +
        '<div class="project-card__media">' +
          mediaMarkup({
            src: project.thumbnail,
            alt: pick(project.thumbnailAlt) || projectTitle(project),
            ratio: isCompact ? "3 / 2" : "16 / 10",
            code: project.code,
            label: t("common.visualPending"),
            meta: projectTitle(project),
            variant: (index % 3) + 1,
            className: "project-card__visual"
          }) +
          (project.thumbnail && project.code ? '<span class="project-card__index" aria-hidden="true">' + esc(project.code) + '</span>' : "") +
          (!isCompact && status ? '<span class="status-badge status-badge--' + esc(project.status || "draft") + '">' + esc(status) + '</span>' : "") +
        '</div>' +
        '<div class="project-card__body">' +
          '<div class="project-card__meta">' +
            metaBits.map(function (item) { return '<span>' + esc(item) + '</span>'; }).join('<span class="project-card__sep" aria-hidden="true">/</span>') +
          '</div>' +
          '<h3 class="project-card__title">' + esc(projectTitle(project)) + '</h3>' +
          (role ? '<p class="project-card__role">' + esc(role) + '</p>' : "") +
          (description && !isCompact ? '<p class="project-card__desc">' + esc(description) + '</p>' : "") +
          '<span class="project-card__arrow" aria-hidden="true">→</span>' +
        '</div>' +
      '</a>' +
    '</article>';
  }

  function emptyState(title, text, label) {
    return '<div class="empty-state" data-reveal>' +
      '<span class="empty-state__mark" aria-hidden="true">+</span>' +
      '<div class="empty-state__content">' +
        '<p class="empty-state__label">' + esc(label || t("home.emptyLabel")) + '</p>' +
        '<h3 class="empty-state__title">' + esc(title) + '</h3>' +
        '<p class="empty-state__text">' + esc(text) + '</p>' +
      '</div>' +
    '</div>';
  }

  /* ----------------------------------------------------------
     PAGE D'ACCUEIL
     ---------------------------------------------------------- */
  function renderHome() {
    const featured = featuredProjects();
    const additional = additionalProjects();
    const homeSoftware = (SITE.software || []).filter(function (name) { return SOFTWARE_CATALOG.some(function (item) { return item.name === name && item.logo; }); });

    return '<section class="hero" aria-labelledby="hero-title">' +
        '<div class="hero__bg" aria-hidden="true"></div>' +
        '<div class="container hero__inner">' +
          '<div class="hero__top">' +
            '<p class="eyebrow">' + esc(t("home.eyebrow")) + '</p>' +
            '<p class="hero__availability"><span class="dot" aria-hidden="true"></span>' + esc(t("home.availability")) + '</p>' +
          '</div>' +
          '<div class="hero__grid">' +
            '<div class="hero__content">' +
              '<h1 class="hero__title" id="hero-title">' +
                '<span class="hero__line hero__line--1">' + esc(t("home.titleLine1")) + '</span>' +
                '<span class="hero__line hero__line--2">' + esc(t("home.titleLine2")) + '</span>' +
              '</h1>' +
              '<p class="hero__role"><span>' + esc(t("home.role")) + '</span></p>' +
              '<p class="hero__intro">' + esc(pick(SITE.home?.intro) || t("home.intro")) + '</p>' +
              (homeSoftware.length ? '<div class="hero__software"><span class="hero__software-label">' + esc(t("home.softwareLabel")) + '</span><div class="software-logo-list software-logo-list--hero">' + softwareMarks(homeSoftware, "hero") + '</div></div>' : '') +
              '<div class="hero__actions">' +
                '<a class="btn btn--primary" href="#/projects">' + esc(t("home.ctaProjects")) + '<span aria-hidden="true">→</span></a>' +
                '<a class="btn btn--ghost" href="#/contact">' + esc(t("home.ctaContact")) + '</a>' +
              '</div>' +
              '<p class="hero__meta">' + esc(t("home.heroMeta")) + '</p>' +
            '</div>' +
            '<div class="hero__visual">' +
              mediaMarkup({
                src: SITE.heroImage,
                alt: pick(SITE.heroImageAlt) || t("home.heroCaption"),
                ratio: "4 / 5",
                code: "001",
                label: t("common.heroVisual"),
                meta: t("home.heroCaption"),
                variant: 1,
                orbit: true,
                className: "hero__media",
                eager: true
              }) +
              '<span class="hero__visual-caption" aria-hidden="true">MAX LELIÈVRE — VISUAL 001</span>' +
            '</div>' +
          '</div>' +
          '<div class="hero__footer">' +
            '<button class="scroll-cue" type="button" data-scroll="showreel-section">' +
              '<span class="scroll-cue__line" aria-hidden="true"></span>' +
              '<span>' + esc(t("home.scroll")) + '</span>' +
            '</button>' +
            '<p class="hero__footer-note">' + esc(t("home.location")) + '</p>' +
          '</div>' +
        '</div>' +
      '</section>' +
      renderShowreelTeaser() +
      renderFeaturedSection(featured) +
      renderAdditionalSection(additional) +
      renderStatement();
  }

  function renderShowreelTeaser() {
    return '<section class="section showreel-teaser" id="showreel-section" aria-labelledby="showreel-teaser-title">' +
      '<div class="container">' +
        '<div class="section-head" data-reveal>' +
          '<div class="section-head__title">' +
            '<p class="eyebrow">' + esc(t("home.showreelEyebrow")) + '</p>' +
            '<h2 class="section-title" id="showreel-teaser-title">' + esc(t("home.showreelTitle")) + '</h2>' +
          '</div>' +
          '<p class="section-intro">' + esc(t("home.showreelDesc")) + '</p>' +
        '</div>' +
        '<a class="showreel-frame" href="#/showreel" aria-label="' + esc(t("home.showreelCta")) + '" data-reveal>' +
          '<div class="showreel-frame__media">' +
            mediaMarkup({
              ratio: "16 / 9",
              label: t("common.videoPending"),
              meta: "SHOWREEL — " + t("home.showreelStatus"),
              variant: 2,
              orbit: true,
              className: "showreel-frame__visual"
            }) +
            '<span class="play-button" aria-hidden="true"><span></span></span>' +
            '<span class="showreel-frame__status">' + esc(t("home.showreelStatus")) + '</span>' +
          '</div>' +
          '<div class="showreel-frame__bar">' +
            '<span>' + esc(t("home.showreelYear")) + '</span>' +
            '<span>' + esc(t("home.showreelDuration")) + '</span>' +
            '<span class="showreel-frame__cta">' + esc(t("home.showreelCta")) + ' <span aria-hidden="true">↗</span></span>' +
          '</div>' +
        '</a>' +
      '</div>' +
    '</section>';
  }

  function renderFeaturedSection(featured) {
    return '<section class="section" aria-labelledby="featured-title">' +
      '<div class="container">' +
        '<div class="section-head" data-reveal>' +
          '<div class="section-head__title">' +
            '<p class="eyebrow">' + esc(t("home.featuredEyebrow")) + '</p>' +
            '<h2 class="section-title" id="featured-title">' + esc(t("home.featuredTitle")) + '</h2>' +
          '</div>' +
          '<p class="section-intro">' + esc(t("home.featuredIntro")) + '</p>' +
        '</div>' +
        (featured.length
          ? '<div class="featured-grid">' + featured.map(function (project, index) {
              return projectCard(project, index, "featured");
            }).join("") + '</div>'
          : emptyState(t("home.emptyTitle"), t("home.emptyText"))) +
        '<div class="section-foot">' +
          '<a class="text-link" href="#/projects">' + esc(t("common.viewAllProjects")) + ' <span aria-hidden="true">→</span></a>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function renderAdditionalSection(additional) {
    return '<section class="section section--additional" aria-labelledby="additional-title">' +
      '<div class="container">' +
        '<div class="section-head" data-reveal>' +
          '<div class="section-head__title">' +
            '<p class="eyebrow">' + esc(t("home.additionalEyebrow")) + '</p>' +
            '<h2 class="section-title" id="additional-title">' + esc(t("home.additionalTitle")) + '</h2>' +
          '</div>' +
          '<p class="section-intro">' + esc(t("home.additionalIntro")) + '</p>' +
        '</div>' +
        (additional.length
          ? '<div class="compact-grid">' + additional.map(function (project, index) {
              return projectCard(project, index, "compact");
            }).join("") + '</div>'
          : emptyState(t("home.emptyTitle"), t("home.emptyText"))) +
      '</div>' +
    '</section>';
  }

  function renderStatement() {
    return '<section class="statement" aria-labelledby="statement-title">' +
      '<div class="container statement__inner" data-reveal>' +
        '<p class="eyebrow">' + esc(t("home.statementEyebrow")) + '</p>' +
        '<h2 class="statement__text" id="statement-title">' + esc(pick(SITE.home?.statement) || t("home.statement")) + '</h2>' +
        '<a class="text-link" href="#/about">' + esc(t("home.statementCta")) + ' <span aria-hidden="true">→</span></a>' +
      '</div>' +
    '</section>';
  }

  /* ----------------------------------------------------------
     PAGE PROJETS
     ---------------------------------------------------------- */
  function filterButton(value, label, count) {
    const active = state.filter === value;
    return '<button class="filter-btn' + (active ? " is-active" : "") + '" type="button" data-filter="' + value +
      '" aria-pressed="' + active + '">' + esc(label) +
      '<span class="filter-btn__count">' + count + '</span></button>';
  }

  function renderProjectsPage() {
    const featured = featuredProjects();
    const additional = additionalProjects();
    const all = visibleProjects();
    const showFeatured = state.filter === "all" || state.filter === "featured";
    const showAdditional = state.filter === "all" || state.filter === "additional";

    let content = "";
    if (!all.length) {
      content = emptyState(t("projectsPage.emptyAll"), t("projectsPage.emptyAdditional"), t("projectsPage.emptyLabel"));
    } else {
      if (showFeatured) {
        content += '<section class="project-group" aria-labelledby="group-featured">' +
          '<div class="project-group__head">' +
            '<h2 class="project-group__title" id="group-featured">' + esc(t("projectsPage.featuredTitle")) + '</h2>' +
            '<span class="project-group__count">' + featured.length + '</span>' +
          '</div>' +
          (featured.length
            ? '<div class="featured-grid">' + featured.map(function (project, index) {
                return projectCard(project, index, "featured");
              }).join("") + '</div>'
            : emptyState(t("projectsPage.emptyFeatured"), t("projectsPage.emptyFeaturedText"), t("projectsPage.emptyLabel"))) +
        '</section>';
      }
      if (showAdditional) {
        content += '<section class="project-group" aria-labelledby="group-additional">' +
          '<div class="project-group__head">' +
            '<div>' +
              '<h2 class="project-group__title" id="group-additional">' + esc(t("projectsPage.additionalTitle")) + '</h2>' +
              '<p class="project-group__intro">' + esc(t("projectsPage.additionalIntro")) + '</p>' +
            '</div>' +
            '<span class="project-group__count">' + additional.length + '</span>' +
          '</div>' +
          (additional.length
            ? '<div class="compact-grid">' + additional.map(function (project, index) {
                return projectCard(project, index, "compact");
              }).join("") + '</div>'
            : emptyState(t("projectsPage.emptyAdditional"), t("projectsPage.emptyAdditionalText"), t("projectsPage.emptyLabel"))) +
        '</section>';
      }
    }

    return '<section class="page-hero" aria-labelledby="projects-title">' +
        '<div class="container">' +
          '<p class="eyebrow">' + esc(t("projectsPage.eyebrow")) + '</p>' +
          '<h1 class="page-title" id="projects-title">' + esc(t("projectsPage.title")) + '</h1>' +
        '</div>' +
      '</section>' +
      '<div class="filters-bar">' +
        '<div class="container filters-bar__inner">' +
          '<div class="filters" role="group" aria-label="' + esc(t("projectsPage.filtersLabel")) + '">' +
            filterButton("all", t("projectsPage.filterAll"), all.length) +
            filterButton("featured", t("projectsPage.filterFeatured"), featured.length) +
            filterButton("additional", t("projectsPage.filterAdditional"), additional.length) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="container projects-content">' + content + '</div>';
  }

  /* ----------------------------------------------------------
     PAGE PROJET
     ---------------------------------------------------------- */
  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function metaItem(label, value) {
    return '<div class="project-meta__item">' +
      '<dt class="project-meta__label">' + esc(label) + '</dt>' +
      '<dd class="project-meta__value">' + esc(value) + '</dd>' +
    '</div>';
  }

  function compareMarkup(before, after, label) {
    const alt = label || t("project.compareLabel");
    return '<div class="compare" data-compare>' +
      '<img class="compare__after" src="' + esc(after) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' +
      '<div class="compare__before-wrap"><img class="compare__before" src="' + esc(before) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async"></div>' +
      '<span class="compare__handle" aria-hidden="true"><span></span></span>' +
      '<div class="compare__control">' +
        '<input type="range" min="0" max="100" value="50" step="1" aria-label="' + esc(t("project.compareLabel")) + '">' +
      '</div>' +
    '</div>';
  }

  function renderGallery(project) {
    const items = orderedGalleryItems(project);
    if (!items.length) return "";
    return '<div class="gallery">' + items.map(function (item, index) {
      const alt = pick(item.alt) || projectTitle(project);
      const caption = pick(item.caption);
      return '<figure class="gallery__item">' +
        '<button class="gallery__button" type="button" data-lightbox-index="' + index +
          '" aria-label="' + esc(t("project.galleryItem", { title: caption || alt })) + '">' +
          '<img src="' + esc(item.src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' +
          '<span class="gallery__zoom" aria-hidden="true">↗</span>' +
        '</button>' +
        (caption ? '<figcaption class="gallery__caption">' + esc(caption) + '</figcaption>' : "") +
      '</figure>';
    }).join("") + '</div>';
  }

  function orderedGalleryItems(project) {
    return (project.gallery || []).filter(function (item) { return item && item.src; }).map(function (item, index) {
      const path = String(item.src || "").toLowerCase();
      const rank = /bts-/.test(path) ? 2 : /workflow-/.test(path) ? 1 : 0;
      return { item: item, index: index, rank: rank };
    }).sort(function (a, b) { return a.rank - b.rank || a.index - b.index; }).map(function (entry) { return entry.item; });
  }

  function videoMarkup(item, index) {
    const title = pick(item.title) || (t("project.videos") + " " + padNumber(index + 1));
    if (item.type === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(item.videoId || "")) {
      return '<iframe class="video-frame__el" src="' + esc(youtubeEmbedUrl(item.videoId)) + '" title="' + esc(title) +
        '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"' +
        ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    }
    if (!item.src) {
      return mediaMarkup({
        ratio: "16 / 9",
        label: t("common.videoPending"),
        meta: title,
        variant: (index % 3) + 1
      });
    }
    if (item.type === "file") {
      return '<video class="video-frame__el" controls preload="metadata"' +
        (item.poster ? ' poster="' + esc(item.poster) + '"' : "") + '>' +
      '<source src="' + esc(item.src) + '"' + (/\.mov(?:$|[?#])/i.test(item.src) ? ' type="video/quicktime"' : /\.webm(?:$|[?#])/i.test(item.src) ? ' type="video/webm"' : ' type="video/mp4"') + '>' +
        esc(t("project.videoFallback")) +
      '</video>';
    }
    return '<iframe class="video-frame__el" src="' + esc(item.src) + '" title="' + esc(title) +
      '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"' +
      ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
  }

  function renderVideos(project) {
    const items = (project.videos || []).filter(Boolean);
    if (!items.length) return "";
    return '<div class="video-list">' + items.map(function (item, index) {
      const title = pick(item.title);
      const youtubeFallback = item.type === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(item.videoId || "")
        ? '<a class="video-youtube-link" href="https://www.youtube.com/watch?v=' + esc(item.videoId) + '" target="_blank" rel="noopener">' + (state.lang === "fr" ? "Ouvrir la vidéo sur YouTube ↗" : "Open video on YouTube ↗") + '</a>'
        : "";
      return '<figure class="video-block">' +
        '<div class="video-frame">' + videoMarkup(item, index) + '</div>' +
        youtubeFallback +
        (title || pick(item.caption) ? '<figcaption class="video-block__caption">' + (title ? '<span>' + esc(title) + '</span>' : '') + (pick(item.caption) ? '<span class="video-block__comment">' + esc(pick(item.caption)) + '</span>' : '') + '</figcaption>' : "") +
      '</figure>';
    }).join("") + '</div>';
  }

  function renderBreakdown(project) {
    const items = (project.breakdown || []).filter(Boolean);
    if (!items.length) return "";
    return '<div class="breakdown-list">' + items.map(function (item, index) {
      const title = pick(item.title) || (state.lang === "fr" ? "Étape " : "Breakdown ") + padNumber(index + 1);
      let media = "";
      if (item.before && item.after) {
        media = compareMarkup(item.before, item.after, title);
      } else if (item.image) {
        media = mediaMarkup({ src: item.image, alt: title, ratio: "16 / 9" });
      } else {
        media = mediaMarkup({
          ratio: "16 / 9",
          label: t("common.imagePending"),
          meta: title,
          variant: (index % 3) + 1
        });
      }
      return '<article class="breakdown">' +
        '<div class="breakdown__media">' + media + '</div>' +
        '<div class="breakdown__text">' +
          '<span class="breakdown__num">' + padNumber(index + 1) + '</span>' +
          '<h3 class="breakdown__title">' + esc(title) + '</h3>' +
          (hasText(item.text) ? '<div class="prose prose--small">' + formatText(item.text) + '</div>' : "") +
        '</div>' +
      '</article>';
    }).join("") + '</div>';
  }

  function renderComparisons(project) {
    const items = (project.comparisons || []).filter(function (item) {
      return item && item.before && item.after;
    });
    if (!items.length) return "";
    return '<div class="compare-list">' + items.map(function (item) {
      const label = pick(item.label) || (state.lang === "fr" ? "Avant / après" : "Before / after");
      return '<figure class="compare-block">' +
        compareMarkup(item.before, item.after, label) +
        '<figcaption class="compare-block__caption">' +
          '<span>' + esc(label) + '</span>' +
          (pick(item.beforeCaption) ? '<span class="compare-block__side-caption"><small>' + esc(state.lang === "fr" ? "Avant" : "Before") + '</small>' + esc(pick(item.beforeCaption)) + '</span>' : "") +
          (pick(item.afterCaption) ? '<span class="compare-block__side-caption"><small>' + esc(state.lang === "fr" ? "Après" : "After") + '</small>' + esc(pick(item.afterCaption)) + '</span>' : "") +
        '</figcaption>' +
      '</figure>';
    }).join("") + '</div>';
  }

  function renderCredits(project) {
    const items = (project.credits || []).filter(Boolean);
    const collaborator = project.collaborator && project.collaborator.name ? project.collaborator : null;
    if (!items.length && !collaborator) return "";
    const collaboratorUrl = /^https?:\/\//i.test(collaborator?.url || "") ? esc(collaborator.url) : "";
    const collaboratorRow = collaborator
      ? '<li class="credits-list__item"><span class="credits-list__role">' + esc(t("project.collaborator")) + '</span>' + (collaboratorUrl
        ? '<a class="credits-list__name" href="' + collaboratorUrl + '" target="_blank" rel="noopener noreferrer">' + esc(collaborator.name) + ' ↗</a>'
        : '<span class="credits-list__name">' + esc(collaborator.name) + '</span>') + '</li>'
      : "";
    return '<ul class="credits-list">' + items.map(function (item) {
      if (typeof item === "string") {
        return '<li class="credits-list__item"><span class="credits-list__name">' + esc(item) + '</span></li>';
      }
      return '<li class="credits-list__item">' +
        '<span class="credits-list__role">' + esc(pick(item.role)) + '</span>' +
        '<span class="credits-list__name">' + esc(item.name || "") + '</span>' +
      '</li>';
    }).join("") + collaboratorRow + '</ul>';
  }

  function renderProjectPager(project) {
    const list = visibleProjects();
    if (list.length < 2) return "";
    const index = list.findIndex(function (item) { return item.id === project.id; });
    if (index === -1) return "";
    const previous = list[(index - 1 + list.length) % list.length];
    const next = list[(index + 1) % list.length];

    return '<nav class="project-pager" aria-label="' + esc(t("project.sectionNav")) + '">' +
      '<a class="project-pager__item project-pager__item--prev" href="#/project/' + encodeURIComponent(previous.id) + '">' +
        '<span class="project-pager__label"><span aria-hidden="true">←</span> ' + esc(t("project.prev")) + '</span>' +
        '<span class="project-pager__title">' + esc(projectTitle(previous)) + '</span>' +
      '</a>' +
      '<a class="project-pager__item project-pager__item--next" href="#/project/' + encodeURIComponent(next.id) + '">' +
        '<span class="project-pager__label">' + esc(t("project.next")) + ' <span aria-hidden="true">→</span></span>' +
        '<span class="project-pager__title">' + esc(projectTitle(next)) + '</span>' +
      '</a>' +
    '</nav>';
  }

  function renderProjectPage(id) {
    const project = projectById(id);
    if (!project) {
      setMeta(t("meta.projectNotFoundTitle"), t("project.notFoundText"));
      return renderProjectNotFound();
    }

    setMeta(
      t("meta.projectTitle", { title: projectTitle(project) }),
      pick(project.shortDescription) || t("meta.projectsDescription")
    );

    state.gallery = orderedGalleryItems(project);

    const status = taxonomyLabel("status", project.status);
    const type = taxonomyLabel("type", project.type);
    const role = pick(project.role);
    const roleDescription = pick(project.roleDescription);
    const categories = categoryLabels(project);
    const software = (project.software || []).filter(Boolean);
    const isOngoing = project.status === "in-development" || project.status === "preproduction";

    const metaItems = [
      project.year ? metaItem(t("project.year"), String(project.year)) : "",
      status ? metaItem(t("project.status"), status) : "",
      role ? metaItem(t("project.role"), role) : "",
      categories.length ? metaItem(t("project.categories"), categories.join(" · ")) : "",
      type ? metaItem(t("project.type"), type) : "",
      software.length ? '<div class="project-meta__item"><dt class="project-meta__label">' + esc(t("project.software")) + '</dt><dd class="project-meta__value project-meta__software">' + software.map(function (name) { var item = SOFTWARE_CATALOG.find(function (entry) { return entry.name === name; }); return item ? '<span class="project-meta__software-item"><img src="' + esc(assetUrl(item.logo)) + '" alt="" loading="lazy"><span>' + esc(name) + '</span></span>' : ''; }).join("") + '</dd></div>' : ""
    ].filter(Boolean).join("");

    const sections = [];
    if (hasText(project.description)) {
      sections.push({
        id: "overview",
        label: t("project.overview"),
        html: '<div class="prose">' + formatText(project.description) + '</div>'
      });
    }
    const contributions = (project.contributions || []).filter(function (item) { return Boolean(pick(item)); });
    if (contributions.length) {
      sections.push({
        id: "contributions",
        label: t("project.contributions"),
        html: '<ol class="contribution-list">' + contributions.map(function (item) {
          return '<li class="contribution-list__item">' + esc(pick(item)) + '</li>';
        }).join("") + '</ol>'
      });
    }
    if (hasText(project.technicalNotes)) {
      sections.push({
        id: "technical-notes",
        label: t("project.technicalNotes"),
        html: '<div class="note-panel"><p class="note-panel__label">' + esc(t("project.technicalNotes")) + '</p><div class="prose prose--small">' + formatText(project.technicalNotes) + '</div></div>'
      });
    }
    if ((project.videos || []).length) {
      sections.push({ id: "videos", label: t("project.videos"), html: renderVideos(project) });
    }
    if ((project.comparisons || []).filter(function (item) { return item && item.before && item.after; }).length) {
      sections.push({ id: "comparisons", label: t("project.comparisons"), html: renderComparisons(project) });
    }
    if ((project.breakdown || []).length) {
      sections.push({ id: "breakdown", label: t("project.breakdown"), html: renderBreakdown(project) });
    }
    if ((project.credits || []).length || project.collaborator?.name) {
      sections.push({ id: "credits", label: t("project.credits"), html: renderCredits(project) });
    }
    if ((project.gallery || []).some(function (item) { return item && item.src; })) {
      sections.push({ id: "gallery", label: t("project.gallery"), html: renderGallery(project) });
    }

    const note = hasText(project.note)
      ? '<div class="project-note" data-reveal>' +
          '<span class="project-note__label">' + esc(t("project.mediaNoteLabel")) + '</span>' +
          '<p class="project-note__text">' + esc(pick(project.note)) + '</p>' +
        '</div>'
      : (isOngoing
        ? '<div class="project-note" data-reveal>' +
            '<span class="project-note__label">' + esc(status) + '</span>' +
            '<p class="project-note__text">' + esc(t("project.ongoing")) + '</p>' +
          '</div>'
        : "");

    const toc = sections.length > 1
      ? '<aside class="project-aside" aria-label="' + esc(t("project.sectionNav")) + '">' +
          '<p class="project-aside__title">' + esc(t("project.sectionNav")) + '</p>' +
          '<nav class="project-toc">' +
            sections.map(function (section, index) {
              return '<button class="project-toc__link" type="button" data-scroll="' + section.id + '">' +
                '<span class="project-toc__num">' + padNumber(index + 1) + '</span>' +
                '<span>' + esc(section.label) + '</span>' +
              '</button>';
            }).join("") +
          '</nav>' +
        '</aside>'
      : "";

    const sectionHtml = sections.map(function (section, index) {
      return '<section class="p-section" id="' + section.id + '" aria-labelledby="' + section.id + '-title">' +
        '<header class="p-section__head">' +
          '<span class="p-section__num">' + padNumber(index + 1) + '</span>' +
          '<h2 class="p-section__title" id="' + section.id + '-title">' + esc(section.label) + '</h2>' +
        '</header>' +
        '<div class="p-section__body">' + section.html + '</div>' +
      '</section>';
    }).join("");

    return '<section class="project-hero" aria-labelledby="project-title">' +
        '<div class="container">' +
          '<a class="back-link" href="#/projects"><span aria-hidden="true">←</span> ' + esc(t("project.back")) + '</a>' +
          '<div class="project-hero__top">' +
            '<p class="eyebrow">' + esc(t("projectsPage.eyebrow")) + (project.code ? " — " + esc(project.code) : "") + '</p>' +
            (status ? '<span class="status-badge status-badge--' + esc(project.status || "draft") + '">' + esc(status) + '</span>' : "") +
          '</div>' +
          '<h1 class="project-title" id="project-title">' + esc(projectTitle(project)) + '</h1>' +
          (roleDescription ? '<p class="project-role">' + esc(roleDescription) + '</p>' : "") +
          (metaItems ? '<dl class="project-meta">' + metaItems + '</dl>' : "") +
        '</div>' +
      '</section>' +
      '<div class="container">' +
        '<div class="project-hero-media" data-reveal>' +
          mediaMarkup({
            src: project.hero,
            alt: pick(project.heroAlt) || projectTitle(project),
            ratio: "21 / 9",
            code: project.code,
            label: t("common.heroVisual"),
            meta: projectTitle(project),
            variant: 1,
            orbit: true
          }) +
          (pick(project.thumbnailCaption) ? '<p class="project-cover-caption">' + esc(pick(project.thumbnailCaption)) + '</p>' : '') +
        '</div>' +
        note +
      '</div>' +
      '<div class="container project-layout">' +
        toc +
        '<div class="project-content' + (toc ? "" : " project-content--full") + '">' +
          sectionHtml +
        '</div>' +
      '</div>' +
      '<div class="container">' + renderProjectPager(project) + '</div>' +
      '<div class="container project-return">' +
        '<a class="text-link" href="#/projects"><span aria-hidden="true">←</span> ' + esc(t("project.return")) + '</a>' +
      '</div>';
  }

  function renderProjectNotFound() {
    return '<section class="not-found">' +
      '<div class="container not-found__inner">' +
        '<p class="eyebrow">404</p>' +
        '<h1 class="not-found__title">' + esc(t("project.notFoundTitle")) + '</h1>' +
        '<p class="not-found__text">' + esc(t("project.notFoundText")) + '</p>' +
        '<a class="btn btn--primary" href="#/projects">' + esc(t("project.back")) + '<span aria-hidden="true">→</span></a>' +
      '</div>' +
    '</section>';
  }

  /* ----------------------------------------------------------
     PAGE SHOWREEL
     ---------------------------------------------------------- */
  function renderShowreelPlayer() {
    const showreel = SITE.showreel;
    if (showreel.embed) {
      const youtubeId = String(showreel.embed).match(/(?:embed\/|[?&]v=)([A-Za-z0-9_-]{11})/)?.[1] || "";
      return '<div class="showreel-player" data-reveal>' +
        '<div class="video-frame video-frame--showreel">' +
          '<iframe class="video-frame__el" src="' + esc(youtubeId ? youtubeEmbedUrl(youtubeId) : showreel.embed) + '" title="Showreel — Max Lelièvre"' +
            ' loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"' +
            ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
        '</div>' +
        (youtubeId ? '<a class="video-youtube-link" href="https://www.youtube.com/watch?v=' + esc(youtubeId) + '" target="_blank" rel="noopener">' + (state.lang === "fr" ? "Ouvrir le showreel sur YouTube ↗" : "Open showreel on YouTube ↗") + '</a>' : "") +
      '</div>';
    }
    if (showreel.file) {
      return '<div class="showreel-player" data-reveal>' +
        '<div class="video-frame video-frame--showreel">' +
          '<video class="video-frame__el" controls preload="metadata"' +
            (showreel.poster ? ' poster="' + esc(showreel.poster) + '"' : "") + '>' +
            '<source src="' + esc(showreel.file) + '">' +
            esc(t("project.videoFallback")) +
          '</video>' +
        '</div>' +
      '</div>';
    }
    return '<div class="showreel-player" data-reveal>' +
      mediaMarkup({
        ratio: "16 / 9",
        label: t("common.videoPending"),
        meta: "SHOWREEL — " + t("showreel.status"),
        variant: 2,
        orbit: true,
        className: "showreel-player__visual"
      }) +
      '<span class="play-button play-button--large" aria-hidden="true"><span></span></span>' +
      '<div class="showreel-player__overlay">' +
        '<p class="showreel-player__label">' + esc(t("showreel.placeholderTitle")) + '</p>' +
        '<p class="showreel-player__text">' + esc(t("showreel.placeholderText")) + '</p>' +
      '</div>' +
    '</div>';
  }

  function renderShowreelPage() {
    const related = visibleProjects().slice(0, 3);
    const breakdown = SITE.showreel.breakdown || [];
    const breakdownId = String(SITE.showreel.breakdownEmbed || "").match(/(?:embed\/|[?&]v=)([A-Za-z0-9_-]{11})/)?.[1] || "";
    const year = SITE.showreel.year;
    const breakdownVideo = breakdownId
      ? '<figure class="video-block"><div class="video-frame"><iframe class="video-frame__el" src="' + esc(youtubeEmbedUrl(breakdownId)) + '" title="Breakdown du showreel" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><a class="video-youtube-link" href="https://www.youtube.com/watch?v=' + esc(breakdownId) + '" target="_blank" rel="noopener">' + (state.lang === "fr" ? "Ouvrir le breakdown sur YouTube ↗" : "Open the breakdown on YouTube ↗") + '</a></figure>'
      : "";

    return '<section class="page-hero" aria-labelledby="showreel-title">' +
        '<div class="container">' +
          '<p class="eyebrow">' + esc(t("showreel.eyebrow")) + '</p>' +
          '<h1 class="page-title" id="showreel-title">' + esc(t("showreel.title")) + '</h1>' +
          '<div class="page-hero__grid">' +
            '<p class="page-intro">' + esc(t("showreel.intro")) + '</p>' +
            '<div class="page-meta">' +
              '<span>' + esc(year ? t("project.year") + " — " + year : t("showreel.year")) + '</span>' +
              '<span>' + esc(t("showreel.duration")) + '</span>' +
              '<span class="page-meta__status">' + esc(t("showreel.status")) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<div class="container">' + renderShowreelPlayer() + '</div>' +
      '<section class="section section--tight" aria-labelledby="showreel-breakdown-title">' +
        '<div class="container">' +
          '<div class="section-head" data-reveal>' +
            '<div class="section-head__title">' +
              '<p class="eyebrow">Breakdown</p>' +
              '<h2 class="section-title" id="showreel-breakdown-title">' + esc(t("showreel.breakdownTitle")) + '</h2>' +
            '</div>' +
            '<p class="section-intro">' + esc(t("showreel.breakdownIntro")) + '</p>' +
          '</div>' +
          breakdownVideo +
          (breakdown.length
            ? renderBreakdown({ breakdown: breakdown })
            : (breakdownVideo ? "" : emptyState(t("showreel.breakdownTitle"), t("showreel.breakdownEmpty"), t("projectsPage.emptyLabel")))) +
        '</div>' +
      '</section>' +
      '<section class="section" aria-labelledby="showreel-projects-title">' +
        '<div class="container">' +
          '<div class="section-head" data-reveal>' +
            '<div class="section-head__title">' +
              '<p class="eyebrow">' + esc(t("home.featuredEyebrow")) + '</p>' +
              '<h2 class="section-title" id="showreel-projects-title">' + esc(t("showreel.projectsTitle")) + '</h2>' +
            '</div>' +
            '<p class="section-intro">' + esc(t("showreel.projectsIntro")) + '</p>' +
          '</div>' +
          '<div class="compact-grid">' + related.map(function (project, index) {
            return projectCard(project, index, "compact");
          }).join("") + '</div>' +
        '</div>' +
      '</section>';
  }

  /* ----------------------------------------------------------
     PAGE À PROPOS
     ---------------------------------------------------------- */
  function renderAboutPage() {
    const identity = t("about.identity");
    const about = SITE.about || {};
    const sections = about.sections || t("about.sections");
    const aboutIntro = pick(about.intro) || pick(SITE.bio);
    const software = (SITE.software || [])
      .filter(function (name) { return SOFTWARE_CATALOG.some(function (item) { return item.name === name && item.logo; }); });

    return '<section class="page-hero" aria-labelledby="about-title">' +
        '<div class="container">' +
          '<p class="eyebrow">' + esc(t("about.eyebrow")) + '</p>' +
          '<h1 class="page-title" id="about-title">' + esc(t("about.title")) + '</h1>' +
          '<div class="page-intro page-intro--large">' + String(aboutIntro).split(/\n\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("") + '</div>' +
        '</div>' +
      '</section>' +
      '<div class="container about-layout">' +
        '<aside class="about-card" data-reveal>' +
          (SITE.portrait ? '<img class="about-card__portrait" src="' + esc(SITE.portrait) + '" alt="' + esc(state.lang === "fr" ? "Portrait de Max Lelièvre" : "Portrait of Max Lelièvre") + '" onerror="this.hidden=true">' : '<div class="about-card__monogram" aria-hidden="true">ML</div>') +
          '<dl class="about-card__list">' +
            '<div class="about-card__row"><dt>' + esc(t("project.role")) + '</dt><dd>' + esc(identity.role) + '</dd></div>' +
            '<div class="about-card__row"><dt>Formation</dt><dd>' + esc(identity.status) + '</dd></div>' +
            '<div class="about-card__row"><dt>École</dt><dd>' + esc(identity.school) + '</dd></div>' +
            '<div class="about-card__row"><dt>' + esc(t("contact.locationLabel")) + '</dt><dd>' + esc(identity.location) + '</dd></div>' +
          '</dl>' +
          '<p class="about-card__availability"><span class="dot" aria-hidden="true"></span>' + esc(t("contact.availability")) + '</p>' +
        '</aside>' +
        '<div class="about-content">' +
          sections.map(function (section, index) {
            return '<section class="about-section" data-reveal>' +
              '<div class="about-section__head">' +
                '<span class="about-section__num">' + padNumber(index + 1) + '</span>' +
                '<h2 class="about-section__title">' + esc(pick(section.title) || section.title) + '</h2>' +
              '</div>' +
              '<div class="prose">' + (Array.isArray(section.body) ? section.body : (pick(section.body) || [])).map(function (paragraph) {
                return '<p>' + esc(pick(paragraph) || paragraph) + '</p>';
              }).join("") + '</div>' +
            '</section>';
          }).join("") +
          '<section class="about-section" data-reveal>' +
            '<div class="about-section__head">' +
              '<span class="about-section__num">' + padNumber(sections.length + 1) + '</span>' +
              '<h2 class="about-section__title">' + esc(t("about.softwareTitle")) + '</h2>' +
            '</div>' +
            (software.length
              ? '<div class="software-logo-list">' + softwareMarks(software, "about") + '</div>'
              : '<p class="about-note">' + esc(t("common.toBeCompleted")) + '</p>') +
          '</section>' +
          '<section class="cv-panel" data-reveal aria-labelledby="cv-title">' +
            '<div class="cv-panel__content">' +
              '<p class="eyebrow">CV</p>' +
              '<h2 class="cv-panel__title" id="cv-title">' + esc(t("about.cvTitle")) + '</h2>' +
              '<p class="cv-panel__text">' + esc(t("about.cvText")) + '</p>' +
            '</div>' +
            '<div class="cv-panel__action">' +
              '<a class="btn btn--primary" href="#/cv">' + esc(t("about.cvButton")) + '<span aria-hidden="true">→</span></a>' +
            '</div>' +
          '</section>' +
          '<section class="about-contact" data-reveal aria-labelledby="about-contact-title">' +
            '<div>' +
              '<p class="eyebrow">' + esc(t("contact.eyebrow")) + '</p>' +
              '<h2 class="about-contact__title" id="about-contact-title">' + esc(t("about.contactTitle")) + '</h2>' +
              '<p class="about-contact__text">' + esc(t("about.contactText")) + '</p>' +
            '</div>' +
            '<a class="btn btn--ghost" href="#/contact">' + esc(t("about.contactCta")) + '<span aria-hidden="true">→</span></a>' +
          '</section>' +
        '</div>' +
      '</div>';
  }

  /* ----------------------------------------------------------
     CV — GÉNÉRÉ DEPUIS LES DONNÉES DU PORTFOLIO
     ---------------------------------------------------------- */
  function cvProjects() {
    const valid = PROJECTS.filter(function (project) {
      const contributions = (project.contributions || []).filter(function (item) { return Boolean(pick(item)); });
      return project.visible !== false && project.status !== "draft" && hasText(project.title) &&
        (hasText(project.role) || hasText(project.cvDescriptionFR) || hasText(project.cvDescriptionEN)) &&
        (hasText(project.shortDescription) || hasText(project.description) || hasText(project.cvDescriptionFR) || hasText(project.cvDescriptionEN) || contributions.length > 0);
    });
    const chosen = valid.filter(function (project) { return project.includeInCV === true; })
      .sort(function (a, b) { return Number(a.cvPriority ?? 999) - Number(b.cvPriority ?? 999); });
    valid.filter(function (project) { return project.includeInCV !== true && project.includeInCV !== false; })
      .sort(function (a, b) {
        return String(b.year || "").localeCompare(String(a.year || "")) || PROJECTS.indexOf(b) - PROJECTS.indexOf(a);
      })
      .forEach(function (project) { if (chosen.length < 5) chosen.push(project); });
    return chosen.slice(0, 5);
  }

  function renderCVPage() {
    const lang = state.lang;
    const labels = lang === "fr"
      ? { profile: "Profil", skills: "Compétences", software: "Logiciels", education: "Formation", experience: "Expérience professionnelle", projects: "Projets", download: "Télécharger le CV en PDF", back: "Retour au portfolio", year: "Année à préciser", developed: "Compétences développées" }
      : { profile: "Profile", skills: "Skills", software: "Software", education: "Education", experience: "Professional experience", projects: "Projects", download: "Download CV as PDF", back: "Back to portfolio", year: "Year to be confirmed", developed: "Skills developed" };
    const projects = cvProjects();
    const cvSpacing = SITE.cvSettings || {};
    const sectionSpacing = Math.max(1, Math.min(8, Number(cvSpacing.sectionSpacing) || 2.5));
    const projectSpacing = Math.max(0, Math.min(5, Number(cvSpacing.projectSpacing) || 1.5));
    const portfolioUrl = SITE.portfolioUrl || "https://maxlelievre18-maker.github.io/PortFolio_Max-LELIEVRE/";
    const phone = String(SITE.phone || "").trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneHref = phoneDigits ? "tel:" + (phoneDigits.startsWith("0") ? "+33" + phoneDigits.slice(1) : "+" + phoneDigits) : "";
    const cvContacts = [
      contactProfileLink("email", t("contact.emailLabel"), SITE.email ? "mailto:" + SITE.email : "", SITE.email),
      contactProfileLink("linkedin", t("contact.linkedinLabel"), SITE.linkedin, SITE.name),
      contactProfileLink("phone", t("contact.phoneLabel"), phoneHref, phone)
    ].filter(Boolean).join("");
    const educationSection = '<section class="cv-section"><h2>' + esc(labels.education) + '</h2>' + (SITE.education || []).map(item => '<div class="cv-education"><strong>' + esc(item.school) + '</strong><span>' + esc(pick(item.degree)) + '</span><span>' + esc(pick(item.graduation)) + '</span></div>').join("") + '</section>';
    const projectSection = '<section class="cv-section"><h2>' + esc(labels.projects) + '</h2><div class="cv-projects">' + projects.map(project => {
      const contribution = (project.contributions || []).map(pick).filter(Boolean).join(" · ");
      const description = lang === "fr"
        ? (project.cvDescriptionFR || contribution || pick(project.shortDescription) || pick(project.description))
        : (project.cvDescriptionEN || contribution || pick(project.shortDescription) || pick(project.description));
      if (!description) return "";
      const status = project.status !== "completed"
        ? '<span class="cv-status">' + esc(pick(project.status === "preproduction" ? { fr: "En préproduction", en: "In preproduction" } : { fr: "En cours", en: "Ongoing" })) + '</span>'
        : "";
      const image = project.thumbnail
        ? '<img src="' + esc(project.thumbnail) + '" alt="" loading="lazy">'
        : '<div class="cv-thumb cv-thumb--empty">' + esc(project.code || "VFX") + '</div>';
      return '<article class="cv-project">' + image + '<div><h3>' + esc(projectTitle(project)) + '</h3><p class="cv-project__meta">' + esc(pick(project.role) || "VFX / Postproduction") + ' · ' + esc(project.year || labels.year) + '</p><p>' + esc(description) + '</p>' + status + (project.software?.length ? '<div class="software-logo-list software-logo-list--project">' + softwareMarks(project.software, "cv") + '</div>' : "") + '</div></article>';
    }).join("") + '</div></section>';
    const experienceSection = (SITE.experience || []).filter(item => item && item.employer).map(item => {
      const skills = (item.skillsDeveloped?.[lang] || []).filter(Boolean);
      return '<article class="cv-experience"><div><h3>' + esc(item.employer) + '</h3><p>' + esc(pick(item.role)) + '</p><strong>' + esc(pick(item.period)) + '</strong>' + (skills.length ? '<p class="cv-experience__skills"><strong>' + esc(labels.developed) + '</strong><br>' + skills.map(esc).join(' / ') + '</p>' : '') + '</div><p>' + esc(pick(item.description)) + '</p></article>';
    }).join("");
    const qrCode = '<a class="cv-qr" href="' + esc(portfolioUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(portfolioUrl) + '"><img src="assets/images/portfolio-qr.jpg" alt="QR code vers le portfolio de ' + esc(SITE.name) + '"><span>Portfolio</span></a>';
    return '<div class="cv-toolbar"><a class="btn btn--ghost" href="#/">← ' + esc(labels.back) + '</a>' + langSwitcher("lang-switch--cv") + '<a class="btn btn--primary" href="' + esc(assetUrl('output/pdf/cv-max-lelievre-' + lang + '.pdf')) + '" download="Max-Lelievre-CV-' + lang.toUpperCase() + '.pdf" type="application/pdf">' + esc(labels.download) + ' ↓</a></div>' +
      '<article class="cv-sheet" style="--cv-section-gap:' + sectionSpacing + 'mm;--cv-project-gap:' + projectSpacing + 'mm" aria-label="CV ' + esc(SITE.name) + '"><header class="cv-header cv-header--with-qr' + ((SITE.portrait || SITE.heroImage) ? ' cv-header--with-portrait' : '') + '"><div class="cv-header__main"><div class="cv-contact-box" aria-label="' + esc(t("contact.title")) + '">' + cvContacts + '</div><h1>' + esc(SITE.name.toLocaleUpperCase("fr")) + '</h1><p class="cv-headline">' + esc(pick(SITE.headline)) + '</p></div>' + qrCode + ((SITE.portrait || SITE.heroImage) ? '<img class="cv-header__portrait" src="' + esc(SITE.portrait || SITE.heroImage) + '" alt="Portrait de ' + esc(SITE.name) + '" onerror="this.hidden=true">' : '') + '</header>' +
      '<section class="cv-section"><h2>' + esc(labels.profile) + '</h2><p>' + esc(pick(SITE.cvIntro)) + '</p></section>' + educationSection + projectSection +
      (experienceSection ? '<section class="cv-section"><h2>' + esc(labels.experience) + '</h2><div class="cv-experiences">' + experienceSection + '</div></section>' : "") +
      '<footer class="cv-footer"><span>Lien de mon portfolio :</span> <a href="' + esc(portfolioUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(portfolioUrl) + '</a></footer></article>';
  }

  /* ----------------------------------------------------------
     PAGE CONTACT
     ---------------------------------------------------------- */
  function renderContactPage() {
    const email = SITE.email || "";
    const phone = String(SITE.phone || "").trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneHref = phoneDigits ? "tel:" + (phoneDigits.startsWith("0") ? "+33" + phoneDigits.slice(1) : "+" + phoneDigits) : "";
    return '<section class="page-hero" aria-labelledby="contact-title"><div class="container"><p class="eyebrow">' + esc(t("contact.eyebrow")) + '</p><h1 class="page-title" id="contact-title">' + esc(t("contact.title")) + '</h1><p class="page-intro page-intro--large">' + esc(t("contact.intro")) + '</p></div></section>' +
      '<section class="container contact-profiles" aria-label="' + esc(t("contact.title")) + '" data-reveal>' +
        contactProfileCard("email", t("contact.emailLabel"), email) +
        (phone ? contactProfileLink("phone", t("contact.phoneLabel"), phoneHref, phone) : "") +
        (SITE.linkedin ? contactProfileLink("linkedin", t("contact.linkedinLabel"), SITE.linkedin, SITE.name) : "") +
        (SITE.youtube ? contactProfileLink("youtube", t("contact.youtubeLabel"), SITE.youtube, SITE.name) : "") +
      '</section>' +
      '<section class="container contact-form-section" aria-labelledby="contact-form-title"><h2 class="section-title" id="contact-form-title">' + esc(t("contact.formTitle")) + '</h2><p class="section-intro">' + esc(t("contact.formIntro")) + '</p>' +
        '<form class="contact-form" data-contact-form>' +
          '<label>' + esc(t("contact.nameLabel")) + '<input name="name" type="text" autocomplete="name" required></label>' +
          '<label>' + esc(t("contact.subjectLabel")) + '<input name="subject" type="text" required></label>' +
          '<label>' + esc(t("contact.emailFromLabel")) + '<input name="email" type="email" autocomplete="email" required></label>' +
          '<label>' + esc(t("contact.messageLabel")) + '<textarea name="message" rows="6" required></textarea></label>' +
          '<button class="btn btn--primary" type="submit">' + esc(t("contact.send")) + '</button>' +
        '</form></section>';
  }

  function renderNotFoundPage() {
    return '<section class="not-found">' +
      '<div class="container not-found__inner">' +
        '<p class="eyebrow">404</p>' +
        '<h1 class="not-found__title">' + esc(t("notFound.title")) + '</h1>' +
        '<p class="not-found__text">' + esc(t("notFound.text")) + '</p>' +
        '<a class="btn btn--primary" href="#/">' + esc(t("notFound.cta")) + '<span aria-hidden="true">→</span></a>' +
      '</div>' +
    '</section>';
  }

  /* ----------------------------------------------------------
     VISIONNEUSE D'IMAGES
     ---------------------------------------------------------- */
  function renderLightbox() {
    const lightbox = $("#lightbox");
    if (!lightbox) return;
    const items = state.lightbox.items;
    const item = items[state.lightbox.index];
    if (!item) return;

    const stage = $(".lightbox__stage", lightbox);
    const caption = $(".lightbox__caption", lightbox);
    const counter = $(".lightbox__counter", lightbox);
    const alt = pick(item.alt) || "";
    const text = pick(item.caption) || alt;

    if (stage) {
      stage.innerHTML = '<img src="' + esc(item.src) + '" alt="' + esc(alt) + '" decoding="async">';
    }
    if (caption) caption.textContent = text;
    if (counter) counter.textContent = t("common.imageCounter", {
      current: state.lightbox.index + 1,
      total: items.length
    });

    lightbox.classList.toggle("is-single", items.length < 2);
  }

  function openLightbox(index, trigger) {
    const items = state.gallery || [];
    if (!items.length) return;
    state.lightbox.items = items;
    state.lightbox.index = Math.max(0, Math.min(index, items.length - 1));
    state.lightbox.trigger = trigger || null;

    const lightbox = $("#lightbox");
    if (!lightbox) return;
    lightbox.inert = false;
    lightbox.setAttribute("aria-hidden", "false");
    lightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
    renderLightbox();

    const close = $("[data-lightbox-close]", lightbox);
    if (close) close.focus({ preventScroll: true });
  }

  function moveLightbox(direction) {
    const items = state.lightbox.items;
    if (!items.length) return;
    state.lightbox.index = (state.lightbox.index + direction + items.length) % items.length;
    renderLightbox();
  }

  function closeLightbox() {
    const lightbox = $("#lightbox");
    if (!lightbox || lightbox.inert) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.inert = true;
    document.body.classList.remove("lightbox-open");
    const stage = $(".lightbox__stage", lightbox);
    if (stage) stage.innerHTML = "";
    const trigger = state.lightbox.trigger;
    state.lightbox.trigger = null;
    if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
  }

  /* ----------------------------------------------------------
     RÉVÉLATIONS AU DÉFILEMENT
     ---------------------------------------------------------- */
  function setupReveals() {
    const elements = $$("[data-reveal]");
    if (!elements.length) return;

    if (REDUCED() || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    elements.forEach(function (element) { observer.observe(element); });
  }

  /* ----------------------------------------------------------
     COMPARAISONS AVANT / APRÈS
     ---------------------------------------------------------- */
  function setupComparisons() {
    $$("[data-compare]").forEach(function (compare) {
      if (compare.dataset.ready === "true") return;
      compare.dataset.ready = "true";
      const input = $('input[type="range"]', compare);
      if (!input) return;
      const update = function () {
        compare.style.setProperty("--compare-pos", input.value + "%");
      };
      input.addEventListener("input", update);
      update();
    });
  }

  /* ----------------------------------------------------------
     COPIE DE L'ADRESSE E-MAIL
     ---------------------------------------------------------- */
  function copyEmail(email, button) {
    const done = function () {
      announce(t("contact.copied"));
      const original = button.innerHTML;
      button.innerHTML = esc(t("contact.copied")) + '<span aria-hidden="true">✓</span>';
      window.setTimeout(function () { button.innerHTML = original; }, 2200);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(email).then(done).catch(function () {
        fallbackCopy(email, done);
      });
    } else {
      fallbackCopy(email, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (error) { /* copie non disponible */ }
    document.body.removeChild(area);
  }
})();

