/* Fichier généré depuis data/portfolio.json avec project_manager.mjs. */
(function () {
  var theme = "dark";
  var background = "deep-space";
  var effects = true;
  var motion = true;
  var root = document.documentElement;
  var body = document.body;
  var themes = ["blue","dark","light"];
  var backgrounds = ["deep-space","nebula","horizon","orbital","topographic","hud","streaks","minimal"];
  try {
    var stored = localStorage.getItem("max-lelievre-theme");
    if (themes.indexOf(stored) !== -1) theme = stored;
  } catch (error) { /* stockage indisponible */ }
  if (themes.indexOf(theme) === -1) theme = "blue";
  if (backgrounds.indexOf(background) === -1) background = "deep-space";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.dataset.theme = theme;
  body.dataset.background = background;
  body.dataset.backgroundMotion = motion && !reduced ? "on" : "off";
  body.classList.toggle("has-background-art", effects !== false && background !== "minimal");
  var colors = { blue: "#0B1E2A", dark: "#101112", light: "#EDF2F5" };
  var colorScheme = document.querySelector('meta[name="color-scheme"]');
  if (colorScheme) colorScheme.setAttribute("content", theme === "light" ? "light" : "dark");
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", colors[theme] || colors.blue);
})();
