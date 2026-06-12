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
  "fonts",
  "assets"
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

function loadRootStory() {
  return JSON.parse(fs.readFileSync(path.join(root, "story.json"), "utf8"));
}

function collectUsedAudioFiles(story) {
  const used = new Set();
  const music = story?.settings?.music;
  if (music?.file) {
    used.add(String(music.file).trim());
  }
  const cues = Array.isArray(music?.cues) ? music.cues : [];
  for (const cue of cues) {
    if (!cue?.file) continue;
    used.add(String(cue.file).trim());
  }

  const sceneAudioFiles = story?.settings?.sceneAudio?.files;
  if (sceneAudioFiles && typeof sceneAudioFiles === "object") {
    for (const file of Object.values(sceneAudioFiles)) {
      if (!file) continue;
      used.add(String(file).trim());
    }
  }

  return [...used].filter(Boolean).sort();
}

function copyUsedAudio(story) {
  const srcDir = path.join(root, "audio");
  const dstDir = path.join(out, "audio");
  ensureDir(dstDir);
  if (!fs.existsSync(srcDir)) return;

  for (const fileName of collectUsedAudioFiles(story)) {
    const src = path.join(srcDir, fileName);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing audio file referenced by story.json: ${src}`);
    }
    copyFile(src, path.join(dstDir, fileName));
  }
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
  const story = loadRootStory();
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
  copyUsedAudio(story);

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
