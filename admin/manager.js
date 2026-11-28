(() => {
  "use strict";
  const form = document.querySelector("#project-form");
  const siteForm = document.querySelector("#site-settings-form");
  const cvForm = document.querySelector("#cv-settings-form");
  const homeForm = document.querySelector("#home-settings-form");
  const list = document.querySelector("#project-list");
  const library = document.querySelector(".library");
  const editor = document.querySelector(".editor");
  const siteSettings = document.querySelector("#site-settings-panel");
  const cvSettings = document.querySelector("#cv-settings-panel");
  const homeSettings = document.querySelector("#home-settings-panel");
  const adminLayout = document.querySelector(".admin-layout");
  const mediaGrid = document.querySelector(".media-grid");
  const adminTabs = [...document.querySelectorAll("[data-admin-tab]")];
  const notice = document.querySelector("#notice");
  const state = { data: null, currentId: null, saving: false };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function textFor(value, lang = "fr") {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value[lang] || value.fr || value.en || "";
  }
  function assetUrl(path) {
    const relativePath = String(path || "").replace(/^\/+/, "");
    return relativePath ? new URL(relativePath, new URL("../", window.location.href)).href : "";
  }
  function youtubeVideoId(value) {
    try {
      const url = new URL(String(value || "").trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
      let id = "";
      if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
      else if (host === "youtube.com" || host === "youtube-nocookie.com") {
        if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
        else id = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] || "";
      } else return "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
    } catch { return ""; }
  }
  function youtubeEmbedUrl(id) {
    const url = new URL("https://www.youtube-nocookie.com/embed/" + id);
    if (window.location.protocol === "http:" || window.location.protocol === "https:") url.searchParams.set("origin", window.location.origin);
    return url.href;
  }
  function previewYouTube(container, id) {
    if (!container) return;
    container.replaceChildren();
    if (!id) return;
    const frame = document.createElement("iframe");
    frame.src = youtubeEmbedUrl(id);
    frame.title = "Aperçu YouTube";
    frame.loading = "lazy";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    container.appendChild(frame);
  }
  function setVideoSourceMode(type) {
    const mode = $('[data-video-mode="' + type + '"]', mediaGrid)?.value || "file";
    const filePanel = $('[data-video-file-panel="' + type + '"]', mediaGrid);
    const youtubePanel = $('[data-video-youtube-panel="' + type + '"]', mediaGrid);
    if (filePanel) filePanel.hidden = mode !== "file";
    if (youtubePanel) youtubePanel.hidden = mode !== "youtube";
  }
  function flash(message, error = false) {
    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle("is-error", error);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => { notice.hidden = true; }, error ? 7000 : 4000);
  }
  function setAdminTab(name) {
    const onProjects = name === "projects";
    const onHome = name === "home";
    const onCV = name === "cv";
    editor.hidden = !onProjects;
    homeSettings.hidden = !onHome;
    siteSettings.hidden = onProjects || onHome || onCV;
    cvSettings.hidden = !onCV;
    library.hidden = !onProjects;
    adminLayout.classList.toggle("is-site-settings", !onProjects);
    adminTabs.forEach(tab => {
      const active = tab.dataset.adminTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }
  async function request(url, body) {
    const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");
    return result;
  }
  function projectTitle(project) { return project.title || project.titleEN || "Nouveau projet"; }
  function byOrder(a, b) { return Number(a.order ?? 9999) - Number(b.order ?? 9999); }
  function renderList() {
    const projects = [...state.data.PROJECTS].sort(byOrder);
    list.innerHTML = projects.length ? projects.map(project =>
      '<button type="button" class="project-entry' + (project.id === state.currentId ? ' is-active' : '') + '" data-edit="' + esc(project.id) + '">' +
        '<span><strong>' + esc(projectTitle(project)) + '</strong><small>' + esc(project.year || "Année à préciser") + ' · ' + (project.visible === false ? "Masqué" : project.featured ? "À la une" : "Autres projets") + '</small></span>' +
        '<span class="project-entry__flag">' + (project.includeInCV === true ? "CV PRIORITAIRE" : project.includeInCV === false ? "CV EXCLU" : "CV AUTO") + '</span>' +
      '</button>'
    ).join("") : '<p class="muted">Aucun projet pour le moment.</p>';
  }
  function renderSoftwarePicker(selected = []) {
    const picker = $("#software-picker");
    const catalog = state.data.SOFTWARE_CATALOG || [];
    picker.innerHTML = catalog.length ? catalog.map(item =>
      '<label class="software-choice"><input type="checkbox" name="software" value="' + esc(item.name) + '"' + (selected.includes(item.name) ? ' checked' : '') + '><img src="' + esc(assetUrl(item.logo)) + '" alt="" loading="lazy"><span>' + esc(item.name) + '</span></label>'
    ).join("") : '<span class="muted">Aucun logo disponible dans le catalogue des logiciels.</span>';
  }
  function renderSiteSoftwarePicker(selected = []) {
    const picker = $("#site-software-picker");
    if (!picker) return;
    const catalog = state.data.SOFTWARE_CATALOG || [];
    picker.innerHTML = catalog.length ? catalog.map(item =>
      '<label class="software-choice"><input type="checkbox" name="siteSoftware" value="' + esc(item.name) + '"' + (selected.includes(item.name) ? ' checked' : '') + '><img src="' + esc(assetUrl(item.logo)) + '" alt="" loading="lazy"><span>' + esc(item.name) + '</span></label>'
    ).join("") : '<span class="muted">Aucun logo disponible dans le catalogue des logiciels.</span>';
  }
  function val(name, value) {
    const control = form.elements.namedItem(name);
    if (control) control.value = value ?? "";
  }
  function checked(name, value) {
    const control = form.elements.namedItem(name);
    if (control) control.checked = Boolean(value);
  }
  function setForm(project) {
    form.reset();
    form.elements.namedItem("id").value = project?.id || "";
    val("title", project?.title || "");
    val("titleEN", project?.titleEN || "");
    val("year", project?.year || "");
    val("order", project?.order ?? Math.max(0, ...state.data.PROJECTS.map(p => Number(p.order || 0))) + 1);
    val("cvPriority", project?.cvPriority ?? 10);
    val("type", project?.type || "");
    val("collaboratorName", project?.collaborator?.name || "");
    val("collaboratorUrl", project?.collaborator?.url || "");
    val("status", project?.status || "in-development");
    val("roleFR", textFor(project?.role, "fr"));
    val("roleEN", textFor(project?.role, "en"));
    val("descriptionFR", textFor(project?.shortDescription, "fr") || textFor(project?.description, "fr"));
    val("descriptionEN", textFor(project?.shortDescription, "en") || textFor(project?.description, "en"));
    val("contributionFR", (project?.contributions || []).map(item => textFor(item, "fr")).join("\n"));
    val("contributionEN", (project?.contributions || []).map(item => textFor(item, "en")).join("\n"));
    val("objectiveFR", textFor(project?.technicalNotes, "fr"));
    val("objectiveEN", textFor(project?.technicalNotes, "en"));
    val("credits", (project?.credits || []).map(item => typeof item === "string" ? item : [textFor(item.role), item.name].filter(Boolean).join(" | ")).join("\n"));
    checked("featured", project?.featured);
    val("cvSelection", project?.includeInCV === true ? "yes" : project?.includeInCV === false ? "no" : "auto");
    checked("visible", project ? project.visible !== false : true);
    renderSoftwarePicker(project?.software || []);
    $$('input[name="category"]', form).forEach(input => { input.checked = Boolean(project?.categories?.includes(input.value)); });
    $('[data-collaborator-fields]').hidden = form.elements.namedItem("type").value !== "collaboration";
    const isNew = !project;
    $("#editor-title").textContent = isNew ? "Nouveau projet" : "Modifier · " + project.title;
    $("#preview-project").disabled = isNew;
    $$('[data-upload]', form).forEach(input => { input.value = ""; input.disabled = isNew; });
    refreshPreviews(project);
    renderList();
  }
  function newId(title) {
    const slug = String(title || "projet").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "projet";
    let id = slug, n = 2;
    while (state.data.PROJECTS.some(project => project.id === id)) id = slug + "-" + n++;
    return id;
  }
  function lines(value) { return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean); }
  function formProject() {
    const previous = state.data.PROJECTS.find(project => project.id === state.currentId);
    const title = form.elements.namedItem("title").value.trim();
    const id = previous?.id || newId(title);
    const frContrib = lines(form.elements.namedItem("contributionFR").value);
    const enContrib = lines(form.elements.namedItem("contributionEN").value);
    const credits = lines(form.elements.namedItem("credits").value).map(line => {
      const [role, ...name] = line.split("|").map(part => part.trim());
      return name.length ? { role, name: name.join(" | ") } : { name: role };
    });
    const description = { fr: form.elements.namedItem("descriptionFR").value.trim(), en: form.elements.namedItem("descriptionEN").value.trim() };
    const contribution = { fr: frContrib.join("\n"), en: enContrib.join("\n") };
    const roleFR = form.elements.namedItem("roleFR").value.trim();
    const roleEN = form.elements.namedItem("roleEN").value.trim();
    const project = {
      ...(previous || {}), id,
      code: previous?.code || String(Math.max(0, ...state.data.PROJECTS.map(p => Number(p.code || 0))) + 1).padStart(2, "0"),
      title,
      titleEN: form.elements.namedItem("titleEN").value.trim(),
      year: form.elements.namedItem("year").value.trim() || null,
      order: Number(form.elements.namedItem("order").value || 0),
      cvPriority: Number(form.elements.namedItem("cvPriority").value || 0),
      type: form.elements.namedItem("type").value || null,
      status: form.elements.namedItem("status").value,
      categories: $$('input[name="category"]:checked', form).map(input => input.value),
      role: { fr: roleFR, en: roleEN },
      roleDescription: contribution,
      shortDescription: description,
      description,
      contributions: frContrib.map((fr, index) => ({ fr, en: enContrib[index] || "" })),
      technicalNotes: { fr: form.elements.namedItem("objectiveFR").value.trim(), en: form.elements.namedItem("objectiveEN").value.trim() },
      software: $$('input[name="software"]:checked', form).map(input => input.value),
      credits,
      collaborator: form.elements.namedItem("type").value === "collaboration" && form.elements.namedItem("collaboratorName").value.trim()
        ? { name: form.elements.namedItem("collaboratorName").value.trim(), url: form.elements.namedItem("collaboratorUrl").value.trim() }
        : null,
      featured: form.elements.namedItem("featured").checked,
      visible: form.elements.namedItem("visible").checked
    };
    const cvSelection = form.elements.namedItem("cvSelection").value;
    if (cvSelection === "auto") delete project.includeInCV;
    else project.includeInCV = cvSelection === "yes";
    return project;
  }
  async function saveProject(showMessage = true) {
    if (!form.reportValidity()) return null;
    const project = formProject();
    const index = state.data.PROJECTS.findIndex(item => item.id === project.id);
    if (index < 0) state.data.PROJECTS.push(project);
    else state.data.PROJECTS[index] = project;
    state.currentId = project.id;
    await request("/api/save", state.data);
    form.elements.namedItem("id").value = project.id;
    $$("[data-upload]", form).forEach(input => { input.disabled = false; });
    $("#preview-project").disabled = false;
    $("#editor-title").textContent = "Modifier · " + project.title;
    if (showMessage) flash("Projet enregistré dans data/portfolio.json et js/projects.js.");
    renderList();
    return project;
  }
  function mediaPath(item) { return item?.src || item || ""; }
  function addPreview(container, path, video = false, captionTarget = null, videoId = "") {
    if (!path) return;
    const item = document.createElement("div");
    item.className = "media-preview-item";
    item.dataset.mediaPath = path;
    if (captionTarget?.kind === "comparison-before" || captionTarget?.kind === "comparison-after") {
      const badge = document.createElement("strong");
      badge.className = "media-pair-label";
      badge.textContent = (captionTarget.kind === "comparison-before" ? "AVANT" : "APRÈS") + " · PAIRE " + (Number(captionTarget.index) + 1);
      item.appendChild(badge);
    }
    const element = document.createElement(videoId ? "iframe" : video ? "video" : "img");
    if (videoId) {
      element.src = youtubeEmbedUrl(videoId);
      element.title = "Aperçu YouTube";
      element.allowFullscreen = true;
      element.loading = "lazy";
      element.referrerPolicy = "strict-origin-when-cross-origin";
    } else element.src = "/" + path;
    if (video && !videoId) { element.controls = true; element.muted = true; }
    else if (!video) element.alt = "Aperçu du média";
    item.appendChild(element);
    if (captionTarget) {
      item.dataset.captionKind = captionTarget.kind;
      item.dataset.captionIndex = String(captionTarget.index ?? "");
      item.innerHTML += '<button class="button button--quiet media-caption-toggle" type="button" data-caption-toggle>Légender</button><div class="media-caption-fields" data-caption-fields hidden><label class="field"><span>Commentaire — français</span><textarea name="captionFR" rows="2">' + esc(textFor(captionTarget.caption, "fr")) + '</textarea></label><label class="field"><span>Caption — English</span><textarea name="captionEN" rows="2">' + esc(textFor(captionTarget.caption, "en")) + '</textarea></label><button class="button button--blue" type="button" data-caption-save>Enregistrer</button></div>';
    }
    item.innerHTML += '<button class="button button--quiet media-remove" type="button" data-media-remove>' + (video ? "Retirer la vidéo" : "Retirer l’image") + '</button>';
    container.appendChild(item);
  }
  function refreshPreviews(project = state.data.PROJECTS.find(item => item.id === state.currentId)) {
    $$('[data-preview]').forEach(node => { node.replaceChildren(); });
    $$('[data-youtube-preview]').forEach(node => { node.replaceChildren(); });
    $$('[data-media-result]').forEach(node => { node.textContent = node.dataset.mediaResult + " · aucun fichier ajouté"; });
    if (!project) return;
    addPreview($('[data-preview="cover"]'), project.thumbnail, false, { kind: "cover", caption: project.thumbnailCaption });
    const gallery = project.gallery || [];
    const videos = project.videos || [];
    const groups = {
      still: gallery.filter(item => /still-/.test(mediaPath(item))),
      technical: gallery.filter(item => /capture-/.test(mediaPath(item))),
      workflow: gallery.filter(item => /workflow-/.test(mediaPath(item))),
      bts: gallery.filter(item => /bts-/.test(mediaPath(item)))
    };
    Object.keys(groups).forEach(key => groups[key].slice(-4).forEach(item => addPreview($('[data-preview="' + key + '"]'), mediaPath(item), false, { kind: "gallery", index: project.gallery.indexOf(item), caption: item.caption })));
    const videoGroups = {};
    ["still", "technical", "workflow", "bts"].forEach(key => {
      videoGroups[key] = videos.filter(item => item.mediaCategory === key || (!item.mediaCategory && new RegExp((key === "technical" ? "capture" : key) + "-").test(item.src || "")));
      videoGroups[key].slice(-4).forEach(item => addPreview($('[data-preview="' + key + '"]'), item.src, true, { kind: "video", index: project.videos.indexOf(item), caption: item.caption }, item.videoId));
    });
    const comparisons = project.comparisons || [];
    comparisons.forEach((item, index) => { addPreview($('[data-preview="comparison"]'), item.before, false, { kind: "comparison-before", index, caption: item.beforeCaption }); addPreview($('[data-preview="comparison"]'), item.after, false, { kind: "comparison-after", index, caption: item.afterCaption }); });
    const breakdownVideos = videos.filter(item => item.mediaCategory === "breakdown" || /breakdown-/.test(item.src || ""));
    const filmVideos = videos.filter(item => item.mediaCategory === "film" || /project\./.test(item.src || ""));
    breakdownVideos.slice(-3).forEach(item => addPreview($('[data-preview="breakdown"]'), item.src, true, { kind: "video", index: project.videos.indexOf(item), caption: item.caption }, item.videoId));
    filmVideos.slice(-1).forEach(item => addPreview($('[data-preview="film"]'), item.src, true, { kind: "video", index: project.videos.indexOf(item), caption: item.caption }, item.videoId));
    ["film", "breakdown"].forEach(type => {
      const youtubeItem = videos.find(item => item.mediaCategory === type && item.videoId);
      const input = $('[data-youtube-url="' + type + '"]', mediaGrid);
      const mode = $('[data-video-mode="' + type + '"]', mediaGrid);
      if (input) input.value = youtubeItem?.src || "";
      if (mode) mode.value = youtubeItem ? "youtube" : "file";
      setVideoSourceMode(type);
      previewYouTube($('[data-youtube-preview="' + type + '"]', mediaGrid), youtubeItem?.videoId);
    });
    const counts = { cover: project.thumbnail ? 1 : 0, still: groups.still.length + videoGroups.still.length, technical: groups.technical.length + videoGroups.technical.length, workflow: groups.workflow.length + videoGroups.workflow.length, bts: groups.bts.length + videoGroups.bts.length, comparison: comparisons.filter(item => item.before && item.after).length, breakdown: breakdownVideos.length, film: filmVideos.length };
    Object.entries(counts).forEach(([key, count]) => { const node = $('[data-media-result="' + key + '"]'); if (node && count) node.textContent = count + (count > 1 ? " fichier(s) ajouté(s)" : " fichier ajouté"); });
  }
  function setSiteForm() {
    if (!siteForm || !state.data) return;
    const site = state.data.SITE;
    const set = (name, value) => { const field = siteForm.elements.namedItem(name); if (field) field.value = value ?? ""; };
    set("bioFR", textFor(site.bio, "fr")); set("bioEN", textFor(site.bio, "en"));
    (site.about?.sections || []).forEach((section, index) => {
      set("aboutTitleFR" + index, textFor(section.title, "fr")); set("aboutTitleEN" + index, textFor(section.title, "en"));
      set("aboutBodyFR" + index, (section.body?.fr || []).join("\n\n")); set("aboutBodyEN" + index, (section.body?.en || []).join("\n\n"));
    });
    const experience = site.experience?.[0] || {};
    set("experienceEmployer", experience.employer); set("experienceRoleFR", textFor(experience.role, "fr")); set("experienceRoleEN", textFor(experience.role, "en"));
    set("experiencePeriodFR", textFor(experience.period, "fr")); set("experiencePeriodEN", textFor(experience.period, "en"));
    set("experienceDescriptionFR", textFor(experience.description, "fr")); set("experienceDescriptionEN", textFor(experience.description, "en"));
    set("experienceSkillsFR", (experience.skillsDeveloped?.fr || []).join("\n")); set("experienceSkillsEN", (experience.skillsDeveloped?.en || []).join("\n"));
    siteForm.elements.namedItem("backgroundEffects").checked = site.backgroundEffects !== false;
    siteForm.elements.namedItem("backgroundMotion").checked = site.backgroundMotion !== false;
    set("backgroundStyle", site.backgroundStyle || "deep-space");
    set("theme", site.theme || "blue");
    const reel = site.showreel || {};
    const reelUrl = siteForm.elements.namedItem("showreelUrl");
    if (reelUrl) reelUrl.value = reel.embed || "";
    const breakdownUrl = siteForm.elements.namedItem("breakdownUrl");
    if (breakdownUrl) breakdownUrl.value = reel.breakdownEmbed || "";
    const reelResult = $("[data-showreel-result]");
    if (reelResult) reelResult.textContent = reel.file ? "Vidéo actuelle : " + reel.file : "Aucun fichier importé.";
  }
  function setCVForm() {
    if (!cvForm || !state.data) return;
    const site = state.data.SITE;
    const set = (name, value) => { const field = cvForm.elements.namedItem(name); if (field) field.value = value ?? ""; };
    const education = site.education?.[0] || {};
    const experience = site.experience?.[0] || {};
    set("cvName", site.name);
    set("cvPhone", site.phone);
    set("cvEducationSchool", education.school);
    set("cvHeadlineFR", textFor(site.headline, "fr")); set("cvHeadlineEN", textFor(site.headline, "en"));
    set("cvIntroFR", textFor(site.cvIntro, "fr")); set("cvIntroEN", textFor(site.cvIntro, "en"));
    set("cvDegreeFR", textFor(education.degree, "fr")); set("cvDegreeEN", textFor(education.degree, "en"));
    set("cvGraduationFR", textFor(education.graduation, "fr")); set("cvGraduationEN", textFor(education.graduation, "en"));
    set("cvExperienceRoleFR", textFor(experience.role, "fr")); set("cvExperienceRoleEN", textFor(experience.role, "en"));
    set("cvExperiencePeriodFR", textFor(experience.period, "fr")); set("cvExperiencePeriodEN", textFor(experience.period, "en"));
    set("cvExperienceDescriptionFR", textFor(experience.description, "fr")); set("cvExperienceDescriptionEN", textFor(experience.description, "en"));
    set("cvExperienceSkillsFR", (experience.skillsDeveloped?.fr || []).join("\n")); set("cvExperienceSkillsEN", (experience.skillsDeveloped?.en || []).join("\n"));
    set("cvSectionSpacing", site.cvSettings?.sectionSpacing ?? 2.5); set("cvProjectSpacing", site.cvSettings?.projectSpacing ?? 1.5);
  }
  function setHomeForm() {
    if (!homeForm || !state.data) return;
    const home = state.data.SITE.home || {};
    const set = (name, value) => { const field = homeForm.elements.namedItem(name); if (field) field.value = value ?? ""; };
    set("homeIntroFR", textFor(home.intro, "fr")); set("homeIntroEN", textFor(home.intro, "en"));
    set("homeStatementFR", textFor(home.statement, "fr")); set("homeStatementEN", textFor(home.statement, "en"));
    renderSiteSoftwarePicker(state.data.SITE.software || []);
    const preview = $("[data-home-preview]");
    preview.replaceChildren();
    if (state.data.SITE.heroImage) addPreview(preview, state.data.SITE.heroImage);
  }
  function dataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Impossible de lire ce fichier."));
      reader.readAsDataURL(file);
    });
  }
  adminTabs.forEach(tab => tab.addEventListener("click", () => setAdminTab(tab.dataset.adminTab)));
  if (homeForm) homeForm.addEventListener("submit", async event => {
    event.preventDefault();
    const site = state.data.SITE;
    const value = name => homeForm.elements.namedItem(name).value.trim();
    site.home = { intro: { fr: value("homeIntroFR"), en: value("homeIntroEN") }, statement: { fr: value("homeStatementFR"), en: value("homeStatementEN") } };
    site.software = $$('input[name="siteSoftware"]:checked', homeForm).map(input => input.value);
    try { await request("/api/save", state.data); flash("Page d’accueil enregistrée."); }
    catch (error) { flash(error.message, true); }
  });
  if (cvForm) cvForm.addEventListener("submit", async event => {
    event.preventDefault();
    const site = state.data.SITE;
    const value = name => cvForm.elements.namedItem(name).value.trim();
    const education = site.education?.[0] || {};
    const experience = site.experience?.[0] || {};
    site.name = value("cvName");
    site.phone = value("cvPhone");
    site.headline = { fr: value("cvHeadlineFR"), en: value("cvHeadlineEN") };
    site.cvIntro = { fr: value("cvIntroFR"), en: value("cvIntroEN") };
    if (!site.education) site.education = [];
    site.education[0] = { ...education, school: value("cvEducationSchool"), degree: { fr: value("cvDegreeFR"), en: value("cvDegreeEN") }, graduation: { fr: value("cvGraduationFR"), en: value("cvGraduationEN") } };
    if (!site.experience) site.experience = [];
    site.experience[0] = { ...experience, employer: experience.employer || "Super U", role: { fr: value("cvExperienceRoleFR"), en: value("cvExperienceRoleEN") }, period: { fr: value("cvExperiencePeriodFR"), en: value("cvExperiencePeriodEN") }, description: { fr: value("cvExperienceDescriptionFR"), en: value("cvExperienceDescriptionEN") }, skillsDeveloped: { fr: lines(value("cvExperienceSkillsFR")), en: lines(value("cvExperienceSkillsEN")) } };
    site.cvSettings = { sectionSpacing: Math.max(1, Math.min(8, Number(value("cvSectionSpacing")) || 2.5)), projectSpacing: Math.max(0, Math.min(5, Number(value("cvProjectSpacing")) || 1.5)) };
    try { await request("/api/save", state.data); setCVForm(); flash("CV enregistré. Les PDF seront générés localement."); }
    catch (error) { flash(error.message, true); }
  });
  if (homeForm) homeForm.addEventListener("change", async event => {
    const input = event.target;
    if (input.name !== "homeHeroImage" || !input.files?.length) return;
    input.disabled = true;
    try {
      const result = await request("/api/upload-home-image", { filename: input.files[0].name, data: await dataUrl(input.files[0]) });
      state.data.SITE.heroImage = result.path;
      await request("/api/save", state.data);
      setHomeForm();
      flash("Image principale de l’accueil enregistrée.");
    } catch (error) { setHomeForm(); flash(error.message, true); }
    finally { input.disabled = false; input.value = ""; }
  });
  if (homeForm) homeForm.addEventListener("click", async event => {
    if (!event.target.closest("[data-media-remove]")) return;
    const row = event.target.closest(".media-preview-item");
    if (!row) return;
    const path = row.dataset.mediaPath;
    const site = state.data.SITE;
    if (site.heroImage === path) site.heroImage = "";
    try {
      await request("/api/save", state.data);
      await request("/api/remove-media", { path });
      setHomeForm();
      flash("Image principale retirée de l’accueil.");
    } catch (error) { setHomeForm(); flash(error.message, true); }
  });
  function nextPairIndex(project, side) {
    const comparisons = project.comparisons || [];
    const pendingIndex = comparisons.findIndex(item => !item[side]);
    return pendingIndex >= 0 ? pendingIndex + 1 : comparisons.length + 1;
  }
  async function upload(file, type, project) {
    const payload = { projectId: project.id, mediaType: type, filename: file.name, data: await dataUrl(file) };
    if (type === "before" || type === "after") payload.sequence = nextPairIndex(project, type);
    const result = await request("/api/upload", payload);
    if (type === "cover") {
      project.thumbnail = result.path; project.hero = result.path;
      project.thumbnailAlt = { fr: "Image principale — " + project.title, en: "Project cover — " + projectTitle(project) };
      project.heroAlt = project.thumbnailAlt;
    } else if (type === "before" || type === "after") {
      const index = payload.sequence - 1;
      project.comparisons ||= [];
      while (project.comparisons.length <= index) project.comparisons.push({ label: { fr: "Avant / après", en: "Before / after" } });
      project.comparisons[index][type] = result.path;
    } else if (["still", "technical", "workflow", "bts"].includes(type) && file.type.startsWith("video/")) {
      project.videos ||= [];
      const labels = { still: ["Vidéo du projet", "Project video"], technical: ["Capture technique vidéo", "Technical video capture"], workflow: ["Workflow vidéo", "Video workflow"], bts: ["Coulisses vidéo", "Behind-the-scenes video"] };
      project.videos.push({ type: "file", src: result.path, title: { fr: labels[type][0], en: labels[type][1] }, mediaCategory: type });
    } else if (["still", "technical", "workflow", "bts"].includes(type)) {
      const labels = { still: ["Image du projet", "Project still"], technical: ["Capture technique", "Technical capture"], workflow: ["Workflow", "Workflow"], bts: ["Coulisses", "Behind the scenes"] };
      project.gallery ||= [];
      project.gallery.push({ src: result.path, alt: { fr: labels[type][0] + " — " + project.title, en: labels[type][1] + " — " + projectTitle(project) }, caption: { fr: labels[type][0], en: labels[type][1] } });
    } else if (type === "breakdown" || type === "film") {
      project.videos ||= [];
      const label = type === "breakdown" ? { fr: "Breakdown VFX", en: "VFX breakdown" } : { fr: "Extrait du projet", en: "Project excerpt" };
      project.videos.push({ type: "file", src: result.path, title: label, mediaCategory: type });
    }
    await request("/api/save", state.data);
    return result;
  }
  async function saveYouTubeLink(type) {
    const input = $('[data-youtube-url="' + type + '"]', mediaGrid);
    const src = input?.value.trim() || "";
    const videoId = youtubeVideoId(src);
    if (!videoId) {
      flash("Lien YouTube invalide. Utilise une URL youtube.com, youtu.be ou un lien Shorts.", true);
      input?.focus();
      return;
    }
    try {
      const project = await saveProject(false);
      if (!project) return;
      project.videos ||= [];
      const labels = type === "film"
        ? { fr: "Extrait YouTube du projet", en: "YouTube project excerpt" }
        : { fr: "Breakdown YouTube", en: "YouTube breakdown" };
      const entry = { type: "youtube", src, videoId, mediaCategory: type, title: labels };
      const index = project.videos.findIndex(item => item.type === "youtube" && item.mediaCategory === type);
      if (index >= 0) project.videos[index] = { ...project.videos[index], ...entry };
      else project.videos.push(entry);
      await request("/api/save", state.data);
      refreshPreviews(project);
      flash("Lien YouTube enregistré dans le projet.");
    } catch (error) { flash(error.message, true); }
  }

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-edit]");
    if (!button) return;
    const project = state.data.PROJECTS.find(item => item.id === button.dataset.edit);
    state.currentId = project.id;
    setForm(project);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#new-project").addEventListener("click", () => { state.currentId = null; setForm(null); window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("#preview-project").addEventListener("click", () => {
    const id = form.elements.namedItem("id").value;
    if (id) window.open(new URL("/#/project/" + encodeURIComponent(id), window.location.href).href, "_blank", "noopener");
  });
  if (mediaGrid) mediaGrid.addEventListener("change", event => {
    const select = event.target.closest("[data-video-mode]");
    if (select) setVideoSourceMode(select.dataset.videoMode);
  });
  if (mediaGrid) mediaGrid.addEventListener("input", event => {
    const input = event.target.closest("[data-youtube-url]");
    if (!input) return;
    previewYouTube($('[data-youtube-preview="' + input.dataset.youtubeUrl + '"]', mediaGrid), youtubeVideoId(input.value));
  });
  if (mediaGrid) mediaGrid.addEventListener("click", async event => {
    const youtubeButton = event.target.closest("[data-youtube-save]");
    if (youtubeButton) { await saveYouTubeLink(youtubeButton.dataset.youtubeSave); return; }
    const row = event.target.closest("[data-caption-kind]");
    if (!row) return;
    const fields = row.querySelector("[data-caption-fields]");
    if (event.target.closest("[data-caption-toggle]")) { fields.hidden = !fields.hidden; return; }
    if (event.target.closest("[data-media-remove]")) {
      const project = state.data.PROJECTS.find(item => item.id === state.currentId);
      if (!project) return;
      const path = row.dataset.mediaPath;
      const index = Number(row.dataset.captionIndex);
      if (row.dataset.captionKind === "cover") {
        if (project.thumbnail === path) project.thumbnail = "";
        if (project.hero === path) project.hero = "";
        delete project.thumbnailCaption;
      } else if (row.dataset.captionKind === "gallery") project.gallery.splice(index, 1);
      else if (row.dataset.captionKind === "comparison-before" || row.dataset.captionKind === "comparison-after") {
        const side = row.dataset.captionKind === "comparison-before" ? "before" : "after";
        const captionSide = side + "Caption";
        delete project.comparisons[index][side];
        delete project.comparisons[index][captionSide];
        if (!project.comparisons[index].before && !project.comparisons[index].after) project.comparisons.splice(index, 1);
      } else if (row.dataset.captionKind === "video") project.videos.splice(index, 1);
      try {
        await request("/api/save", state.data);
        if (path.startsWith("assets/")) await request("/api/remove-media", { path });
        refreshPreviews(project);
        flash("Média retiré du projet.");
      } catch (error) { refreshPreviews(project); flash(error.message, true); }
      return;
    }
    if (!event.target.closest("[data-caption-save]")) return;
    const project = state.data.PROJECTS.find(item => item.id === state.currentId);
    if (!project) return;
    const caption = { fr: row.querySelector('[name="captionFR"]').value.trim(), en: row.querySelector('[name="captionEN"]').value.trim() };
    const index = Number(row.dataset.captionIndex);
    if (row.dataset.captionKind === "cover") project.thumbnailCaption = caption;
    else if (row.dataset.captionKind === "gallery") project.gallery[index].caption = caption;
    else if (row.dataset.captionKind === "comparison-before") project.comparisons[index].beforeCaption = caption;
    else if (row.dataset.captionKind === "comparison-after") project.comparisons[index].afterCaption = caption;
    else if (row.dataset.captionKind === "video") project.videos[index].caption = caption;
    try { await request("/api/save", state.data); flash("Commentaire enregistré en français et en anglais."); }
    catch (error) { flash(error.message, true); }
  });
  if (siteForm) siteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const site = state.data.SITE;
    const value = name => siteForm.elements.namedItem(name).value.trim();
    const paragraphs = name => value(name).split(/\r?\n\s*\r?\n/).map(text => text.trim()).filter(Boolean);
    site.bio = { fr: value("bioFR"), en: value("bioEN") };
    site.about = { intro: site.bio, sections: [0, 1, 2].map(index => ({
      title: { fr: value("aboutTitleFR" + index), en: value("aboutTitleEN" + index) },
      body: { fr: paragraphs("aboutBodyFR" + index), en: paragraphs("aboutBodyEN" + index) }
    })) };
    site.experience = [{ employer: value("experienceEmployer"), role: { fr: value("experienceRoleFR"), en: value("experienceRoleEN") }, period: { fr: value("experiencePeriodFR"), en: value("experiencePeriodEN") }, description: { fr: value("experienceDescriptionFR"), en: value("experienceDescriptionEN") }, skillsDeveloped: { fr: lines(value("experienceSkillsFR")), en: lines(value("experienceSkillsEN")) } }].filter(item => item.employer);
    site.backgroundEffects = siteForm.elements.namedItem("backgroundEffects").checked;
    site.backgroundMotion = siteForm.elements.namedItem("backgroundMotion").checked;
    site.backgroundStyle = value("backgroundStyle") || "deep-space";
    site.theme = ["blue", "dark", "light"].includes(value("theme")) ? value("theme") : "blue";
    site.showreel ||= {};
    const reelUrl = value("showreelUrl");
    const reelId = youtubeVideoId(reelUrl);
    const breakdownUrl = value("breakdownUrl");
    const breakdownId = youtubeVideoId(breakdownUrl);
    if (reelUrl && !reelId) { flash("Lien YouTube de showreel invalide.", true); return; }
    if (breakdownUrl && !breakdownId) { flash("Lien YouTube de breakdown invalide.", true); return; }
    site.showreel.embed = reelId ? "https://www.youtube-nocookie.com/embed/" + reelId : "";
    site.showreel.breakdownEmbed = breakdownId ? "https://www.youtube-nocookie.com/embed/" + breakdownId : "";
    try { await request("/api/save", state.data); flash("Page À propos, expérience et apparence enregistrées. Recharge le site pour afficher les changements."); }
    catch (error) { flash(error.message, true); }
  });
  if (siteForm) siteForm.addEventListener("change", async event => {
    const input = event.target.closest('[name="showreelFile"]');
    if (!input?.files?.length) return;
    const file = input.files[0];
    try {
      const result = await request("/api/upload-showreel", { filename: file.name, data: await dataUrl(file) });
      state.data.SITE.showreel ||= {};
      state.data.SITE.showreel.file = result.path;
      await request("/api/save", state.data);
      const label = $("[data-showreel-result]");
      if (label) label.textContent = "Vidéo importée : " + result.path;
      flash("Showreel importé et enregistré.");
    } catch (error) { flash(error.message, true); }
    finally { input.value = ""; }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    try { await saveProject(); } catch (error) { flash(error.message, true); }
  });
  form.addEventListener("change", async event => {
    if (event.target.name === "type") {
      $('[data-collaborator-fields]').hidden = event.target.value !== "collaboration";
      return;
    }
    const input = event.target.closest("[data-upload]");
    if (!input || !input.files?.length) return;
    const type = input.dataset.upload;
    const files = [...input.files];
    input.disabled = true;
    try {
      const project = await saveProject(false);
      if (!project) return;
      input.disabled = true;
      for (const file of files) {
        flash("Envoi local de « " + file.name + " »…");
        const result = await upload(file, type, project);
        flash("Fichier ajouté : " + result.path);
      }
      refreshPreviews(project);
    } catch (error) { flash(error.message, true); }
    finally { input.disabled = false; input.value = ""; }
  });

  (async () => {
    try {
      state.data = await request("/api/data");
      state.data.PROJECTS.sort(byOrder);
      setSiteForm();
      setCVForm();
      setHomeForm();
      setAdminTab("projects");
      renderSoftwarePicker();
      renderList();
      setForm(null);
    } catch (error) { flash(error.message + " — démarre le serveur avec node project_manager.mjs ou demarrer-portfolio.bat.", true); }
  })();
})();
