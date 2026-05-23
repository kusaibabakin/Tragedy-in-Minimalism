const { app, BrowserWindow, shell, ipcMain } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildScenarioOutline, outlinePathForStory } = require('./story-outline');

let win = null;
let server = null;

function uniquePaths(paths) {
  const out = [];
  for (const entry of paths) {
    const normalized = path.normalize(entry);
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out;
}

function findProjectRoot() {
  const seeds = uniquePaths([
    app.getAppPath(),
    __dirname,
    process.cwd()
  ]);

  for (const seed of seeds) {
    let cursor = path.resolve(seed);

    for (let depth = 0; depth < 10; depth += 1) {
      const rootStory = path.join(cursor, 'story.json');
      const desktopPackage = path.join(cursor, 'desktop-app', 'package.json');

      if (fs.existsSync(rootStory) && fs.existsSync(desktopPackage)) {
        return cursor;
      }

      const base = path.basename(cursor);
      if (base === 'desktop-app') {
        const parent = path.dirname(cursor);
        if (fs.existsSync(path.join(parent, 'story.json'))) {
          return parent;
        }
      }

      const next = path.dirname(cursor);
      if (next === cursor) break;
      cursor = next;
    }
  }

  return null;
}

function candidateStoryPaths() {
  const appPath = app.getAppPath();
  const projectRoot = findProjectRoot();
  const candidates = [
    path.resolve(appPath, '..', 'story.json'),
    path.resolve(appPath, 'content', 'story.json'),
    path.resolve(appPath, '..', '..', '..', '..', '..', '..', '..', 'story.json'),
    path.resolve(appPath, '..', '..', '..', '..', '..', '..', 'content', 'story.json')
  ];

  if (projectRoot) {
    candidates.unshift(
      path.join(projectRoot, 'story.json'),
      path.join(projectRoot, 'desktop-app', 'content', 'story.json')
    );
  }

  return uniquePaths(candidates);
}

function writableStoryTargets() {
  return candidateStoryPaths().filter((target) => {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.accessSync(path.dirname(target), fs.constants.W_OK);
      return true;
    } catch (_err) {
      return false;
    }
  });
}

function sanitizeSceneVideoName(sceneId, sourcePath) {
  const ext = path.extname(sourcePath || '').toLowerCase();
  const allowed = new Set(['.mp4', '.webm', '.mov', '.m4v']);
  if (!allowed.has(ext)) {
    throw new Error(`Unsupported video format: ${ext || 'unknown'}`);
  }
  return `${sceneId}${ext}`;
}

function candidateVideoPaths(fileName) {
  const projectRoot = findProjectRoot();
  const candidates = [path.join(contentRoot(), 'videos', fileName)];

  if (projectRoot) {
    candidates.unshift(
      path.join(projectRoot, 'videos', fileName),
      path.join(projectRoot, 'desktop-app', 'content', 'videos', fileName)
    );
  }

  return uniquePaths(candidates);
}

function writableVideoTargets(fileName) {
  return candidateVideoPaths(fileName).filter((target) => {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.accessSync(path.dirname(target), fs.constants.W_OK);
      return true;
    } catch (_err) {
      return false;
    }
  });
}

function candidateVideoDirectories() {
  const projectRoot = findProjectRoot();
  const dirs = [path.join(contentRoot(), 'videos')];

  if (projectRoot) {
    dirs.unshift(
      path.join(projectRoot, 'videos'),
      path.join(projectRoot, 'desktop-app', 'content', 'videos')
    );
  }

  return uniquePaths(dirs);
}

function listAvailableVideos() {
  const names = new Set();

  for (const dir of candidateVideoDirectories()) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        names.add(entry.name);
      }
    } catch (_err) {
      // ignore unreadable directories
    }
  }

  return { files: Array.from(names).sort() };
}

function importSceneVideoFile(sceneId, sourcePath) {
  if (!sceneId || typeof sceneId !== 'string') {
    throw new Error('Scene id is required.');
  }
  if (!sourcePath || typeof sourcePath !== 'string') {
    throw new Error('Source video path is required.');
  }

  fs.accessSync(sourcePath, fs.constants.R_OK);

  const fileName = sanitizeSceneVideoName(sceneId, sourcePath);
  const targets = writableVideoTargets(fileName);
  const saved = [];

  for (const target of targets) {
    try {
      const sameFile = path.normalize(target) === path.normalize(sourcePath);
      if (!sameFile) {
        fs.copyFileSync(sourcePath, target);
      }
      saved.push(target);
    } catch (_err) {
      // keep trying the next target
    }
  }

  if (!saved.length) {
    throw new Error('No writable videos target found.');
  }

  return { fileName, videoPaths: saved };
}

function saveStoryFile(nextStory) {
  const pretty = `${JSON.stringify(nextStory, null, 2)}\n`;
  const targets = writableStoryTargets();
  const saved = [];
  const outline = buildScenarioOutline(nextStory);
  const outlineSaved = [];

  for (const target of targets) {
    try {
      fs.writeFileSync(target, pretty, 'utf8');
      saved.push(target);
      const outlineTarget = outlinePathForStory(target);
      fs.writeFileSync(outlineTarget, outline, 'utf8');
      outlineSaved.push(outlineTarget);
    } catch (_err) {
      // keep trying the next target
    }
  }

  if (!saved.length) {
    throw new Error('No writable story.json target found.');
  }

  return {
    storyPaths: saved,
    outlinePaths: outlineSaved
  };
}

function contentRoot() {
  const projectRoot = findProjectRoot();
  const externalContent = projectRoot ? path.join(projectRoot, 'desktop-app', 'content') : '';

  if (externalContent && fs.existsSync(path.join(externalContent, 'index.html'))) {
    return externalContent;
  }

  return path.join(app.getAppPath(), 'content');
}

function mimeByExt(ext) {
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.m4v': 'video/x-m4v',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const relPath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
      const safeRoot = path.resolve(rootDir);
      const fullPath = path.resolve(rootDir, path.normalize(relPath));

      if (!fullPath.startsWith(safeRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(fullPath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const contentType = mimeByExt(path.extname(fullPath));
        const range = req.headers.range;

        if (range && contentType.startsWith('video/')) {
          const match = /bytes=(\d+)-(\d*)/.exec(range);
          if (!match) {
            res.writeHead(416);
            res.end();
            return;
          }

          const start = Number(match[1]);
          const end = match[2] ? Number(match[2]) : stat.size - 1;
          if (start >= stat.size || end >= stat.size || start > end) {
            res.writeHead(416);
            res.end();
            return;
          }

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': contentType,
            'Cache-Control': 'no-store'
          });
          fs.createReadStream(fullPath, { start, end }).pipe(res);
          return;
        }

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stat.size,
          'Cache-Control': 'no-store'
        });
        fs.createReadStream(fullPath).pipe(res);
      });
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : null;
      if (!port) {
        reject(new Error('Failed to allocate local server port'));
        return;
      }
      resolve(port);
    });
  });
}

function stopStaticServer() {
  if (!server) return;
  server.close();
  server = null;
}

function createMainWindow(url) {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#000000',
    title: 'Tragedy in Minimalism',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  win.maximize();
  win.loadURL(url);

  win.webContents.on('before-input-event', (event, input) => {
    const shortcutPressed = input.meta || input.control;
    const isKeyDown = input.type === 'keyDown';
    const isCreatorShortcut = input.code === 'KeyZ' || input.key === 'Z' || input.key === 'z' || input.key === 'Я' || input.key === 'я';
    if (!isKeyDown || !shortcutPressed || !input.shift || !isCreatorShortcut) return;
    event.preventDefault();
    win.webContents.executeJavaScript(
      "window.dispatchEvent(new CustomEvent('tragedy:open-creator-gate'));",
      true
    ).catch(() => {});
  });

  win.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(async () => {
  try {
    ipcMain.handle('story:save', async (_event, payload) => {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid story payload.');
      }
      const saved = saveStoryFile(payload);
      return { ok: true, ...saved };
    });

    ipcMain.handle('scene-video:import', async (_event, payload) => {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid import payload.');
      }
      return { ok: true, ...importSceneVideoFile(payload.sceneId, payload.sourcePath) };
    });

    ipcMain.handle('videos:list', async () => {
      return { ok: true, ...listAvailableVideos() };
    });

    const root = contentRoot();
    const port = await startStaticServer(root);
    createMainWindow(`http://127.0.0.1:${port}/index.html`);
  } catch (err) {
    console.error('[TragedyApp] startup failed:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      app.relaunch();
      app.exit(0);
    }
  });
});

app.on('window-all-closed', () => {
  stopStaticServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopStaticServer();
});
