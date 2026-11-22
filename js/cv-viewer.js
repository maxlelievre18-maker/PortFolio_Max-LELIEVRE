(() => {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") === "en" ? "en" : "fr";
  const pdfPath = "output/pdf/cv-max-lelievre-" + lang + ".pdf";
  const frame = document.querySelector("#pdf-frame");
  const fallback = document.querySelector("#pdf-fallback");
  const download = document.querySelector("#pdf-download");
  const labels = {
    fr: { title: "CV — Max Lelièvre", download: "TÉLÉCHARGER LE PDF ↓", back: "RETOUR AU PORTFOLIO ↗", preparing: "Le PDF est en cours de préparation", fallback: "Le CV est automatiquement régénéré au démarrage du gestionnaire local. Tu peux aussi consulter l’aperçu HTML et l’imprimer au format PDF.", open: "Ouvrir l’aperçu CV" },
    en: { title: "CV — Max Lelièvre", download: "DOWNLOAD PDF ↓", back: "BACK TO PORTFOLIO ↗", preparing: "The PDF is being prepared", fallback: "The CV PDF is regenerated when the local manager starts. You can also open the HTML preview and print it as a PDF.", open: "Open CV preview" }
  }[lang];

  document.documentElement.lang = lang;
  document.title = labels.title;
  document.querySelectorAll("[data-language]").forEach(link => link.classList.toggle("is-active", link.dataset.language === lang));
  download.href = pdfPath;
  download.setAttribute("download", "Max-Lelievre-CV-" + lang.toUpperCase() + ".pdf");
  download.textContent = labels.download;
  document.querySelector(".pdf-back").textContent = labels.back;
  document.querySelector("#fallback-title").textContent = labels.preparing;
  document.querySelector("#fallback-text").textContent = labels.fallback;
  document.querySelector("#fallback-link").textContent = labels.open;

  fetch(pdfPath, { method: "HEAD", cache: "no-store" }).then(response => {
    if (response.ok) frame.src = pdfPath + "#view=FitH";
    else { frame.hidden = true; fallback.hidden = false; }
  }).catch(() => { frame.hidden = true; fallback.hidden = false; });
})();
