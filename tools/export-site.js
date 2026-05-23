const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "site");
const siteConfigPath = path.join(root, "site.config.json");

const siteFiles = [
  "index.html",
  "app.js",
  "style.css",
  "story.json"
];

const siteDirs = [
  "audio",
  "fonts"
];

function loadSiteConfig() {
  if (!fs.existsSync(siteConfigPath)) {
    return {
      videoBaseUrl: ""
    };
  }

  const raw = JSON.parse(fs.readFileSync(siteConfigPath, "utf8"));
  return {
    videoBaseUrl: typeof raw?.videoBaseUrl === "string" ? raw.videoBaseUrl : ""
  };
}

function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
}

function writeSiteStory(config) {
  const storyPath = path.join(root, "story.json");
  const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
  story.settings = story.settings || {};

  const videoBaseUrl = normalizeBaseUrl(config.videoBaseUrl);
  if (videoBaseUrl) {
    story.settings.videoBaseUrl = videoBaseUrl;
  } else {
    delete story.settings.videoBaseUrl;
  }

  fs.writeFileSync(path.join(out, "story.json"), `${JSON.stringify(story, null, 2)}\n`, "utf8");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const target = path.join(dir, name);
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir) {
  ensureDir(dstDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
      continue;
    }
    if (entry.isFile()) {
      copyFile(src, dst);
    }
  }
}

function writeNoJekyllFile() {
  fs.writeFileSync(path.join(out, ".nojekyll"), "", "utf8");
}

function run() {
  const config = loadSiteConfig();
  ensureDir(out);
  emptyDir(out);

  for (const file of siteFiles) {
    const src = path.join(root, file);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing source file: ${src}`);
    }
    copyFile(src, path.join(out, file));
  }

  writeSiteStory(config);

  for (const dirName of siteDirs) {
    const srcDir = path.join(root, dirName);
    const dstDir = path.join(out, dirName);
    if (!fs.existsSync(srcDir)) {
      ensureDir(dstDir);
      continue;
    }
    copyDir(srcDir, dstDir);
  }

  writeNoJekyllFile();
  console.log(`Exported player site -> ${out}`);
  console.log(`videoBaseUrl -> ${normalizeBaseUrl(config.videoBaseUrl) || "(local videos path)"}`);
}

run();
