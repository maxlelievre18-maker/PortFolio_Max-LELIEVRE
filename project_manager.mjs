import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, writeFile, mkdir, stat, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = "127.0.0.1";
const PORT = 8765;
const MAX_FILE = 1024 * 1024 * 1024;
const DATA_FILE = path.join(ROOT, "data", "portfolio.json");
const JS_FILE = path.join(ROOT, "js", "projects.js");
const PDF_DIR = path.join(ROOT, "output", "pdf");
let pdfTimer;
const MEDIA = {
  cover: ["images", "cover"], still: ["images", "still"],
  before: ["images", "before-after", "before"], after: ["images", "before-after", "after"],
  breakdown: ["videos", "breakdown"], technical: ["images", "capture"],
  workflow: ["images", "workflow"], bts: ["images", "bts"], film: ["videos", "project"]
};
const VIDEO_MEDIA = {
  still: ["videos", "still"], technical: ["videos", "capture"],
  workflow: ["videos", "workflow"], bts: ["videos", "bts"]
};
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".pdf": "application/pdf", ".svg": "image/svg+xml", ".webp": "image/webp",
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
    if (size > Math.ceil(MAX_FILE * 1.4) + 1024 * 1024) throw new Error("La requête dépasse la limite locale de 1 Go.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function upload(payload) {
  const projectId = String(payload.projectId || "");
  if (!/^[a-z0-9-]+$/.test(projectId)) throw new Error("Enregistre d’abord le projet pour créer son identifiant.");
  const type = String(payload.mediaType || "");
  const ext = path.extname(path.basename(String(payload.filename || ""))).toLowerCase();
  const isVideo = [".mp4", ".webm", ".mov"].includes(ext);
  const spec = isVideo ? (VIDEO_MEDIA[type] || MEDIA[type]) : MEDIA[type];
  if (!spec || (isVideo && ["cover", "before", "after"].includes(type)) || (!isVideo && ["breakdown", "film"].includes(type))) throw new Error("Type de média ou format de fichier non pris en charge.");
  const video = isVideo;
  const allowed = video ? [".mp4", ".webm", ".mov"] : [".webp", ".jpg", ".jpeg", ".png", ".avif"];
  if (!allowed.includes(ext)) throw new Error("Format de fichier non pris en charge.");
  const bytes = Buffer.from(String(payload.data || ""), "base64");
  if (!bytes.length || bytes.length > MAX_FILE) throw new Error("Fichier vide ou supérieur à 1 Go.");
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
async function uploadHomeImage(payload) {
  const ext = path.extname(path.basename(String(payload.filename || ""))).toLowerCase();
  if (![".webp", ".jpg", ".jpeg", ".png", ".avif"].includes(ext)) throw new Error("Choisis une image WebP, JPEG, PNG ou AVIF.");
  const bytes = Buffer.from(String(payload.data || ""), "base64");
  if (!bytes.length || bytes.length > MAX_FILE) throw new Error("Fichier vide ou supérieur à 1 Go.");
  const folder = path.join(ROOT, "assets", "images", "home");
  await mkdir(folder, { recursive: true });
  const full = path.join(folder, `hero${ext}`);
  await writeFile(full, bytes);
  return { ok: true, path: path.relative(ROOT, full).replaceAll("\\", "/"), size: bytes.length };
}
async function uploadShowreel(payload) {
  const ext = path.extname(path.basename(String(payload.filename || ""))).toLowerCase();
  if (![".mp4", ".webm", ".mov"].includes(ext)) throw new Error("Choisis une vidéo MP4, WebM ou MOV.");
  const bytes = Buffer.from(String(payload.data || ""), "base64");
  if (!bytes.length || bytes.length > MAX_FILE) throw new Error("Fichier vide ou supérieur à 1 Go.");
  const folder = path.join(ROOT, "assets", "videos", "showreel");
  await mkdir(folder, { recursive: true });
  const full = path.join(folder, `showreel${ext}`);
  await writeFile(full, bytes);
  return { ok: true, path: path.relative(ROOT, full).replaceAll("\\", "/"), size: bytes.length };
}
async function removeMedia(payload) {
  const relative = String(payload.path || "").replaceAll("\\", "/");
  const normalized = path.posix.normalize(relative);
  if (!relative || relative.startsWith("/") || normalized !== relative) throw new Error("Chemin de média invalide.");
  const full = path.resolve(ROOT, relative);
  const allowedRoots = [
    path.join(ROOT, "assets", "images", "projects") + path.sep,
    path.join(ROOT, "assets", "videos", "projects") + path.sep,
    path.join(ROOT, "assets", "images", "home") + path.sep
  ];
  if (!allowedRoots.some(root => full.startsWith(root))) throw new Error("Ce fichier ne peut pas être retiré depuis le gestionnaire.");
  const data = await readData();
  const isReferenced = value => {
    if (value === relative) return true;
    if (Array.isArray(value)) return value.some(isReferenced);
    if (value && typeof value === "object") return Object.values(value).some(isReferenced);
    return false;
  };
  if (isReferenced(data)) throw new Error("Ce média est encore utilisé dans une autre partie du portfolio.");
  const info = await stat(full);
  if (!info.isFile()) throw new Error("Fichier média introuvable.");
  await rm(full);
  return { ok: true, path: relative };
}
async function findEdge() {
  const candidates = [
    process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe")
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch {}
  }
  return null;
}
function runEdge(edgePath, args, lang) {
  return new Promise((resolve, reject) => {
    const child = spawn(edgePath, args, { windowsHide: true, stdio: "ignore" });
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Edge a dépassé le délai de génération du PDF.")); }, 45000);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`Edge a terminé avec le code ${code ?? signal} pour le CV ${lang.toUpperCase()}.`));
    });
  });
}
async function generateCVPdfs() {
  const edgePath = await findEdge();
  if (!edgePath) {
    console.warn("Edge n'a pas été détecté : les PDF n'ont pas été régénérés. Tu peux imprimer la page #/cv en PDF.");
    return;
  }
  await mkdir(PDF_DIR, { recursive: true });
  for (const lang of ["fr", "en"]) {
    const output = path.join(PDF_DIR, `cv-max-lelievre-${lang}.pdf`);
    const profile = path.join(tmpdir(), `portfolio-cv-${process.pid}-${lang}-${Date.now()}`);
    const url = `http://${HOST}:${PORT}/?lang=${lang}#/cv`;
    try {
      await runEdge(edgePath, [
        "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
        "--disable-extensions", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=5000", "--window-size=1440,2000", `--user-data-dir=${profile}`,
        `--print-to-pdf=${output}`, url
      ], lang);
      const info = await stat(output);
      if (info.size < 1000) throw new Error(`Le PDF ${lang.toUpperCase()} semble incomplet.`);
      console.log(`CV PDF ${lang.toUpperCase()} généré (${Math.round(info.size / 1024)} Ko).`);
    } catch (error) {
      console.error(`Échec de génération du PDF ${lang.toUpperCase()} : ${error.message}`);
    } finally {
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    }
  }
}
function queuePdfGeneration() {
  clearTimeout(pdfTimer);
  pdfTimer = setTimeout(() => { generateCVPdfs(); }, 900);
}
function openLocalPages() {
  if (!process.argv.includes("--open") || process.platform !== "win32") return;
  for (const url of [`http://${HOST}:${PORT}/admin/`, `http://${HOST}:${PORT}/`]) {
    const opener = spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true });
    opener.unref();
  }
}
async function serve(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    if (req.method === "GET" && url.pathname === "/api/data") { json(res, 200, await readData()); return; }
    if (req.method === "POST") {
      const origin = req.headers.origin || "";
      if (origin && origin !== `http://${HOST}:${PORT}`) { json(res, 403, { error: "Origine refusée." }); return; }
      const payload = await body(req);
      if (url.pathname === "/api/save") { await writeData(payload); queuePdfGeneration(); json(res, 200, { ok: true }); return; }
      if (url.pathname === "/api/upload-home-image") { json(res, 200, await uploadHomeImage(payload)); return; }
      if (url.pathname === "/api/upload-showreel") { json(res, 200, await uploadShowreel(payload)); return; }
      if (url.pathname === "/api/remove-media") { json(res, 200, await removeMedia(payload)); return; }
      if (url.pathname === "/api/upload") { json(res, 200, await upload(payload)); return; }
      json(res, 404, { error: "Route inconnue." }); return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { json(res, 405, { error: "Méthode non autorisée." }); return; }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    if (pathname === "/admin" || pathname === "/admin/") pathname = "/admin/gestion.html";
    const target = path.resolve(ROOT, "." + pathname);
    if (target !== ROOT && !target.startsWith(ROOT + path.sep)) { res.writeHead(403).end("Forbidden"); return; }
    const info = await stat(target);
    if (!info.isFile()) { res.writeHead(404).end("Not found"); return; }
    const type = MIME[path.extname(target).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;
    if (type.startsWith("video/") && range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) { res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end(); return; }
      const start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
      const end = match[2] && match[1] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
        res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end(); return;
      }
      res.writeHead(206, { "Content-Type": type, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" });
      if (req.method === "HEAD") res.end(); else createReadStream(target, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": info.size, "Accept-Ranges": type.startsWith("video/") ? "bytes" : "none", "Cache-Control": "no-cache" });
    if (req.method === "HEAD") res.end(); else if (type.startsWith("video/")) createReadStream(target).pipe(res); else res.end(await readFile(target));
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
  queuePdfGeneration();
  openLocalPages();
});
