import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = "127.0.0.1";
const PORT = 8765;
const MAX_FILE = 120 * 1024 * 1024;
const DATA_FILE = path.join(ROOT, "data", "portfolio.json");
const JS_FILE = path.join(ROOT, "js", "projects.js");
const MEDIA = {
  cover: ["images", "cover"], still: ["images", "still"],
  before: ["images", "before-after", "before"], after: ["images", "before-after", "after"],
  breakdown: ["videos", "breakdown"], technical: ["images", "capture"],
  workflow: ["images", "workflow"], bts: ["images", "bts"], film: ["videos", "project"]
};
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"
};

async function readData() { return JSON.parse(await readFile(DATA_FILE, "utf8")); }
async function writeData(data) {
  if (!data || typeof data !== "object" || !data.SITE || !Array.isArray(data.PROJECTS)) throw new Error("Données du portfolio invalides.");
  const ids = data.PROJECTS.map(p => String(p?.id || ""));
  if (ids.some(id => !/^[a-z0-9-]+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error("Chaque projet doit avoir un identifiant unique en minuscules, chiffres et tirets.");
  const json = JSON.stringify(data, null, 2) + "\n";
  const script = "/* Fichier généré depuis data/portfolio.json avec project_manager.mjs. */\n" +
    "window.SITE = " + JSON.stringify(data.SITE, null, 2) + ";\n" +
    "window.PROJECTS = " + JSON.stringify(data.PROJECTS, null, 2) + ";\n" +
    "window.SOFTWARE_CATALOG = " + JSON.stringify(data.SOFTWARE_CATALOG || [], null, 2) + ";\n";
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE + ".tmp", json, "utf8");
  await writeFile(JS_FILE + ".tmp", script, "utf8");
  const { rename } = await import("node:fs/promises");
  await rename(DATA_FILE + ".tmp", DATA_FILE);
  await rename(JS_FILE + ".tmp", JS_FILE);
}
function json(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-store" });
  res.end(body);
}
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > Math.ceil(MAX_FILE * 1.4) + 1024 * 1024) throw new Error("Le fichier dépasse la limite locale de 120 Mo.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function upload(payload) {
  const projectId = String(payload.projectId || "");
  if (!/^[a-z0-9-]+$/.test(projectId)) throw new Error("Enregistre d’abord le projet pour créer son identifiant.");
  const type = String(payload.mediaType || "");
  const spec = MEDIA[type];
  if (!spec) throw new Error("Type de média non pris en charge.");
  const ext = path.extname(path.basename(String(payload.filename || ""))).toLowerCase();
  const video = ["breakdown", "film"].includes(type);
  const allowed = video ? [".mp4", ".webm", ".mov"] : [".webp", ".jpg", ".jpeg", ".png", ".avif"];
  if (!allowed.includes(ext)) throw new Error("Format de fichier non pris en charge.");
  const bytes = Buffer.from(String(payload.data || ""), "base64");
  if (!bytes.length || bytes.length > MAX_FILE) throw new Error("Fichier vide ou supérieur à 120 Mo.");
  const data = await readData();
  if (!data.PROJECTS.some(project => project.id === projectId)) throw new Error("Projet introuvable : enregistre-le d’abord.");
  const folder = path.join(ROOT, "assets", spec[0], "projects", projectId);
  await mkdir(folder, { recursive: true });
  let filename;
  if (type === "before" || type === "after") {
    const sequence = Number(payload.sequence || 1);
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) throw new Error("Numéro de comparaison invalide.");
    filename = `before-after-${String(sequence).padStart(2, "0")}-${spec[2]}${ext}`;
  } else if (type === "cover" || type === "film") filename = spec[1] + ext;
  else {
    const names = await readdir(folder);
    let index = 1;
    while (names.some(name => name.startsWith(`${spec[1]}-${String(index).padStart(2, "0")}`))) index++;
    filename = `${spec[1]}-${String(index).padStart(2, "0")}${spec[2] ? `-${spec[2]}` : ""}${ext}`;
  }
  const full = path.join(folder, filename);
  await writeFile(full, bytes);
  return { ok: true, path: path.relative(ROOT, full).replaceAll("\\", "/"), size: bytes.length };
}
async function serve(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    if (req.method === "GET" && url.pathname === "/api/data") { json(res, 200, await readData()); return; }
    if (req.method === "POST") {
      const origin = req.headers.origin || "";
      if (origin && origin !== `http://${HOST}:${PORT}`) { json(res, 403, { error: "Origine refusée." }); return; }
      const payload = await body(req);
      if (url.pathname === "/api/save") { await writeData(payload); json(res, 200, { ok: true }); return; }
      if (url.pathname === "/api/upload") { json(res, 200, await upload(payload)); return; }
      json(res, 404, { error: "Route inconnue." }); return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { json(res, 405, { error: "Méthode non autorisée." }); return; }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    if (pathname === "/admin" || pathname === "/admin/") pathname = "/admin/index.html";
    const target = path.resolve(ROOT, "." + pathname);
    if (target !== ROOT && !target.startsWith(ROOT + path.sep)) { res.writeHead(403).end("Forbidden"); return; }
    const info = await stat(target);
    if (!info.isFile()) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream", "Content-Length": info.size, "Cache-Control": "no-cache" });
    if (req.method === "HEAD") res.end(); else res.end(await readFile(target));
  } catch (error) {
    const code = error.code === "ENOENT" ? 404 : 400;
    if (!res.headersSent) json(res, code, { error: error.message || "Erreur du gestionnaire." });
    else res.destroy();
  }
}

try { await writeData(await readData()); }
catch (error) { console.error("Impossible de préparer les données du portfolio :", error.message); process.exit(1); }
createServer(serve).listen(PORT, HOST, () => {
  console.log(`Gestionnaire local prêt : http://${HOST}:${PORT}/admin/`);
  console.log(`Prévisualisation du site : http://${HOST}:${PORT}/`);
  console.log("Arrête le serveur avec Ctrl+C après utilisation.");
});
