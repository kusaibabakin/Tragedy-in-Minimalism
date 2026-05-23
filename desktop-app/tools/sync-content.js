const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const appRoot = path.resolve(__dirname, '..');
const out = path.join(appRoot, 'content');
const srcFiles = [
  'index.html',
  'app.js',
  'style.css',
  'story.json',
  'scenario-outline.md',
  'editor.html',
  'editor.css',
  'editor.js'
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir) {
  ensureDir(dstDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else if (entry.isFile()) copyFile(src, dst);
  }
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const target = path.join(dir, name);
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function filesDiffer(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return true;
  const aBuf = fs.readFileSync(a);
  const bBuf = fs.readFileSync(b);
  return !aBuf.equals(bBuf);
}

function protectNewerContentStory() {
  const rootStory = path.join(root, 'story.json');
  const contentStory = path.join(out, 'story.json');

  if (!fs.existsSync(contentStory) || !fs.existsSync(rootStory)) return;

  const rootStat = fs.statSync(rootStory);
  const contentStat = fs.statSync(contentStory);
  const contentIsNewer = contentStat.mtimeMs > rootStat.mtimeMs;

  if (!contentIsNewer) return;
  if (!filesDiffer(rootStory, contentStory)) return;

  copyFile(contentStory, rootStory);
}

function run() {
  ensureDir(out);
  protectNewerContentStory();
  emptyDir(out);

  for (const file of srcFiles) {
    const src = path.join(root, file);
    if (!fs.existsSync(src)) {
      if (file === 'scenario-outline.md') continue;
      throw new Error(`Missing source file: ${src}`);
    }
    copyFile(src, path.join(out, file));
  }

  const videosSrc = path.join(root, 'videos');
  const videosDst = path.join(out, 'videos');
  if (fs.existsSync(videosSrc)) {
    copyDir(videosSrc, videosDst);
  } else {
    ensureDir(videosDst);
  }

  const audioSrc = path.join(root, 'audio');
  const audioDst = path.join(out, 'audio');
  if (fs.existsSync(audioSrc)) {
    copyDir(audioSrc, audioDst);
  } else {
    ensureDir(audioDst);
  }

  const fontsSrc = path.join(root, 'fonts');
  const fontsDst = path.join(out, 'fonts');
  if (fs.existsSync(fontsSrc)) {
    copyDir(fontsSrc, fontsDst);
  } else {
    ensureDir(fontsDst);
  }

  console.log(`Synced content -> ${out}`);
}

run();
