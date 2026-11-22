(() => {
  "use strict";
  const form = document.querySelector("#project-form");
  const list = document.querySelector("#project-list");
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
  function flash(message, error = false) {
    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle("is-error", error);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => { notice.hidden = true; }, error ? 7000 : 4000);
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
      '<label class="software-choice"><input type="checkbox" name="software" value="' + esc(item.name) + '"' + (selected.includes(item.name) ? ' checked' : '') + '><img src="/' + esc(item.logo) + '" alt="" loading="lazy"><span>' + esc(item.name) + '</span></label>'
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
  function addPreview(container, path, video = false) {
    if (!path) return;
    const element = document.createElement(video ? "video" : "img");
    element.src = "/" + path;
    if (video) { element.controls = true; element.muted = true; }
    else element.alt = "Aperçu du média";
    container.appendChild(element);
  }
  function refreshPreviews(project = state.data.PROJECTS.find(item => item.id === state.currentId)) {
    $$('[data-preview]').forEach(node => { node.replaceChildren(); });
    $$('[data-media-result]').forEach(node => { node.textContent = node.dataset.mediaResult + " · aucun fichier ajouté"; });
    if (!project) return;
    addPreview($('[data-preview="cover"]'), project.thumbnail);
    const gallery = project.gallery || [];
    const groups = {
      still: gallery.filter(item => /still-/.test(mediaPath(item))),
      technical: gallery.filter(item => /capture-/.test(mediaPath(item))),
      workflow: gallery.filter(item => /workflow-/.test(mediaPath(item))),
      bts: gallery.filter(item => /bts-/.test(mediaPath(item)))
    };
    Object.keys(groups).forEach(key => groups[key].slice(-4).forEach(item => addPreview($('[data-preview="' + key + '"]'), mediaPath(item))));
    const comparisons = project.comparisons || [];
    comparisons.slice(-1).forEach(item => { addPreview($('[data-preview="comparison"]'), item.before); addPreview($('[data-preview="comparison"]'), item.after); });
    const videos = project.videos || [];
    videos.filter(item => /breakdown-/.test(item.src || "")).slice(-3).forEach(item => addPreview($('[data-preview="breakdown"]'), item.src, true));
    videos.filter(item => /project\./.test(item.src || "")).slice(-1).forEach(item => addPreview($('[data-preview="film"]'), item.src, true));
    const counts = { cover: project.thumbnail ? 1 : 0, still: groups.still.length, technical: groups.technical.length, workflow: groups.workflow.length, bts: groups.bts.length, comparison: comparisons.filter(item => item.before && item.after).length, breakdown: videos.filter(item => /breakdown-/.test(item.src || "")).length, film: videos.filter(item => /project\./.test(item.src || "")).length };
    Object.entries(counts).forEach(([key, count]) => { const node = $('[data-media-result="' + key + '"]'); if (node && count) node.textContent = count + (count > 1 ? " fichier(s) ajouté(s)" : " fichier ajouté"); });
  }
  function dataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Impossible de lire ce fichier."));
      reader.readAsDataURL(file);
    });
  }
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
    } else if (["still", "technical", "workflow", "bts"].includes(type)) {
      const labels = { still: ["Image du projet", "Project still"], technical: ["Capture technique", "Technical capture"], workflow: ["Workflow", "Workflow"], bts: ["Coulisses", "Behind the scenes"] };
      project.gallery ||= [];
      project.gallery.push({ src: result.path, alt: { fr: labels[type][0] + " — " + project.title, en: labels[type][1] + " — " + projectTitle(project) }, caption: { fr: labels[type][0], en: labels[type][1] } });
    } else if (type === "breakdown" || type === "film") {
      project.videos ||= [];
      const label = type === "breakdown" ? { fr: "Breakdown VFX", en: "VFX breakdown" } : { fr: "Extrait du projet", en: "Project excerpt" };
      project.videos.push({ type: "file", src: result.path, title: label });
    }
    await request("/api/save", state.data);
    return result;
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
    if (id) window.open("/#/project/" + encodeURIComponent(id), "_blank", "noopener");
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    try { await saveProject(); } catch (error) { flash(error.message, true); }
  });
  form.addEventListener("change", async event => {
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
      renderSoftwarePicker();
      renderList();
      setForm(null);
    } catch (error) { flash(error.message + " — démarre le serveur avec node project_manager.mjs ou demarrer-portfolio.bat.", true); }
  })();
})();
