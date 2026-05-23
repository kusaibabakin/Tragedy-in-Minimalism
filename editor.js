(() => {
  "use strict";

  const NODE_W = 240;
  const NODE_H = 280;

  const refs = {
    svg: document.getElementById("graphSvg"),
    edges: document.getElementById("edgesLayer"),
    nodes: document.getElementById("nodesLayer"),
    titleInput: document.getElementById("titleInput"),
    startSelect: document.getElementById("startSelect"),
    crossfadeInput: document.getElementById("crossfadeInput"),
    leftSelect: document.getElementById("leftSelect"),
    rightSelect: document.getElementById("rightSelect"),
    nextSelect: document.getElementById("nextSelect"),
    musicPreview: document.getElementById("editorMusicPreview"),
    musicPreviewBtn: document.getElementById("musicPreviewBtn"),
    musicTimeline: document.getElementById("musicTimeline"),
    musicTimelineMeta: document.getElementById("musicTimelineMeta"),
    musicDuration: document.getElementById("musicDuration"),
    musicStartSceneInput: document.getElementById("musicStartSceneInput"),
    musicStartInput: document.getElementById("musicStartInput"),
    musicFadeInInput: document.getElementById("musicFadeInInput"),
    musicFadeOutStartInput: document.getElementById("musicFadeOutStartInput"),
    musicFadeOutDurationInput: document.getElementById("musicFadeOutDurationInput"),
    musicVolumeInput: document.getElementById("musicVolumeInput"),
    musicVolumeMeta: document.getElementById("musicVolumeMeta"),
    sceneMeta: document.getElementById("sceneMeta"),
    status: document.getElementById("status"),
    openPlayerBtn: document.getElementById("openPlayerBtn"),
    addSceneBtn: document.getElementById("addSceneBtn"),
    deleteSceneBtn: document.getElementById("deleteSceneBtn"),
    autoLayoutBtn: document.getElementById("autoLayoutBtn"),
    saveBtn: document.getElementById("saveBtn"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn")
  };

  const state = {
    story: null,
    selectedId: null,
    positions: {},
    durations: {},
    availableVideos: new Set(),
    durationQueue: [],
    durationWorkerRunning: false,
    drag: null,
    dropTargetId: null,
    importingSceneId: null,
    linkDrag: null,
    pan: null,
    viewBox: { x: 0, y: 0, width: 4600, height: 1400 },
    homeViewBox: { x: 0, y: 0, width: 4600, height: 1400 },
    projectDirHandle: null,
    undoStack: [],
    redoStack: []
  };

  function setStatus(text, isError = false) {
    refs.status.textContent = text || "";
    refs.status.style.color = isError ? "#fca5a5" : "#34d399";
  }

  function canUseBrowserProjectSave() {
    return typeof window.showDirectoryPicker === "function" && window.isSecureContext;
  }

  async function ensureBrowserProjectHandle() {
    if (!canUseBrowserProjectSave()) return null;

    const existing = state.projectDirHandle;
    if (existing) {
      try {
        const permission = await existing.queryPermission({ mode: "readwrite" });
        if (permission === "granted") return existing;
        const requested = await existing.requestPermission({ mode: "readwrite" });
        if (requested === "granted") return existing;
      } catch (_err) {
        state.projectDirHandle = null;
      }
    }

    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    state.projectDirHandle = handle;
    return handle;
  }

  async function writeTextFile(handle, fileName, contents) {
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  function normalizeScene(story, sceneId) {
    return story?.scenes?.[sceneId] || null;
  }

  function sceneTitle(sceneId, scene) {
    if (!scene) return sceneId;
    return scene.title ? `${sceneId} - ${scene.title}` : sceneId;
  }

  function sceneVideo(sceneId, scene) {
    return scene?.video || `${sceneId}.mp4`;
  }

  function formatChoice(label, target) {
    if (!target) return null;
    return label ? `${label} -> ${target}` : target;
  }

  function formatNote(note) {
    if (!note) return [];
    return String(note)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function sceneType(scene) {
    if (!scene) return "scene";
    if (scene.uiMode === "activation") return "activation";
    if (scene.left || scene.right) return "choice";
    if (scene.next) return "linear";
    return "ending";
  }

  function collectReachableSceneIds(story) {
    const start = story?.settings?.start;
    const scenes = story?.scenes || {};
    const seen = new Set();
    const order = [];

    function visit(sceneId) {
      if (!sceneId || seen.has(sceneId) || !scenes[sceneId]) return;
      seen.add(sceneId);
      order.push(sceneId);

      const scene = scenes[sceneId];
      visit(scene.left);
      visit(scene.right);
      visit(scene.next);

      const variants = scene.variants && typeof scene.variants === "object" ? Object.values(scene.variants) : [];
      for (const variant of variants) {
        if (!variant || typeof variant !== "object") continue;
        visit(variant.left);
        visit(variant.right);
        visit(variant.next);
      }
    }

    visit(start);

    for (const sceneId of Object.keys(scenes)) {
      if (!seen.has(sceneId)) order.push(sceneId);
    }

    return order;
  }

  function collectEndingScenes(story) {
    const scenes = story?.scenes || {};
    return Object.entries(scenes)
      .filter(([, scene]) => !scene.left && !scene.right && !scene.next)
      .map(([sceneId, scene]) => ({
        sceneId,
        title: scene.title || ""
      }));
  }

  function collectBranchSummary(story) {
    const scenes = story?.scenes || {};
    return collectReachableSceneIds(story)
      .map((sceneId) => {
        const scene = scenes[sceneId];
        const parts = [];
        if (scene.left) parts.push(formatChoice(scene.leftLabel, scene.left));
        if (scene.right) parts.push(formatChoice(scene.rightLabel, scene.right));
        if (scene.next) parts.push(`AUTO -> ${scene.next}`);
        return {
          sceneId,
          title: scene?.title || "",
          parts
        };
      })
      .filter((entry) => entry.parts.length);
  }

  function buildScenarioOutline(story) {
    const title = story?.settings?.title || "Untitled Project";
    const start = story?.settings?.start || "-";
    const music = story?.settings?.music || {};
    const sceneIds = collectReachableSceneIds(story);
    const endings = collectEndingScenes(story);
    const branches = collectBranchSummary(story);

    const lines = [
      `# ${title} — Scenario Outline`,
      "",
      "## Project",
      `- Start scene: ${start}`,
      `- Total scenes: ${Object.keys(story?.scenes || {}).length}`,
      `- Crossfade: ${Number(story?.settings?.crossfadeMs || 0)} ms`,
      ""
    ];

    if (music.file) {
      lines.push("## Music");
      lines.push(`- File: ${music.file}`);
      lines.push(`- Start scene: ${music.startSceneId || "-"}`);
      lines.push(`- Start at: ${Number(music.startAtSec || 0)} sec`);
      lines.push(`- Fade in: ${Number(music.fadeInSec || 0)} sec`);
      lines.push(`- Fade out start: ${Number(music.fadeOutStartSec || 0)} sec`);
      lines.push(`- Fade out duration: ${Number(music.fadeOutDurationSec || 0)} sec`);
      lines.push(`- Volume: ${Math.round(Number(music.volume || 0) * 100)}%`);
      lines.push("");
    }

    lines.push("## Scene Breakdown");
    lines.push("");

    for (const sceneId of sceneIds) {
      const scene = normalizeScene(story, sceneId);
      if (!scene) continue;

      lines.push(`### ${sceneTitle(sceneId, scene)}`);
      lines.push(`- Type: ${sceneType(scene)}`);
      lines.push(`- Video: ${sceneVideo(sceneId, scene)}`);

      const left = formatChoice(scene.leftLabel, scene.left);
      const right = formatChoice(scene.rightLabel, scene.right);
      if (left) lines.push(`- Left choice: ${left}`);
      if (right) lines.push(`- Right choice: ${right}`);
      if (scene.next) lines.push(`- Auto next: ${scene.next}`);

      const notes = formatNote(scene.note);
      if (notes.length) lines.push(`- Notes: ${notes.join(" | ")}`);

      if (scene.variants && typeof scene.variants === "object") {
        for (const [variantId, variant] of Object.entries(scene.variants)) {
          const variantParts = [];
          if (variant.left) variantParts.push(`left: ${formatChoice(variant.leftLabel, variant.left)}`);
          if (variant.right) variantParts.push(`right: ${formatChoice(variant.rightLabel, variant.right)}`);
          if (variant.next) variantParts.push(`next: ${variant.next}`);
          if (variantParts.length) {
            lines.push(`- Variant ${variantId}: ${variantParts.join(" | ")}`);
          }
        }
      }

      lines.push("");
    }

    lines.push("## Branch Summary");
    lines.push("");

    if (!branches.length) {
      lines.push("- No branches found.");
    } else {
      for (const branch of branches) {
        const label = branch.title ? `${branch.sceneId} (${branch.title})` : branch.sceneId;
        lines.push(`- ${label}: ${branch.parts.join(" | ")}`);
      }
    }

    lines.push("");
    lines.push("## Endings");
    lines.push("");

    if (!endings.length) {
      lines.push("- No terminal scenes found.");
    } else {
      for (const ending of endings) {
        lines.push(`- ${sceneTitle(ending.sceneId, { title: ending.title })}`);
      }
    }

    lines.push("");
    lines.push("## Writing Notes");
    lines.push("");
    lines.push("- Use each scene block as a prose beat.");
    lines.push("- Expand scene notes into action, image, and dialogue.");
    lines.push("- Use the branch summary to separate alternative scene versions.");
    lines.push("- Use the endings list as targets for full linear screenplay drafts.");
    lines.push("");

    return `${lines.join("\n")}\n`;
  }

  async function saveStoryViaBrowserProjectAccess() {
    const handle = await ensureBrowserProjectHandle();
    if (!handle) return false;

    const storyText = `${JSON.stringify(state.story, null, 2)}\n`;
    const outlineText = buildScenarioOutline(state.story);
    await writeTextFile(handle, "story.json", storyText);
    await writeTextFile(handle, "scenario-outline.md", outlineText);
    setStatus("Saved story.json + scenario-outline.md to project folder");
    return true;
  }

  async function init() {
    try {
      const story = await loadStory();
      validate(story);
      state.story = story;
      await refreshAvailableVideos();
      readInitialViewBox();
      state.homeViewBox = { ...state.viewBox };
      ensurePositions();
      bindUi();
      renderAll();
      bindMusicPreview();
      queueSceneDurations();
      setStatus("Loaded story.json");
    } catch (err) {
      setStatus(`Init failed: ${String(err.message || err)}`, true);
      console.error(err);
    }
  }

  async function loadStory() {
    const res = await fetch("./story.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  function validate(story) {
    if (!story || typeof story !== "object") throw new Error("Invalid story");
    if (!story.scenes || typeof story.scenes !== "object") throw new Error("Missing scenes");
    if (!story.settings || typeof story.settings !== "object") throw new Error("Missing settings");
    const currentMusic = story.settings.music;
    story.settings.music = {
      file: "tragedyminimalism.mp3",
      startSceneId: "S2",
      startAtSec: 0,
      fadeInSec: 0,
      fadeOutStartSec: 0,
      fadeOutDurationSec: 0,
      volume: 1,
      ...(currentMusic && typeof currentMusic === "object" ? currentMusic : {})
    };
  }

  function sceneIds() {
    return Object.keys(state.story.scenes);
  }

  function sceneVideoPath(id) {
    const scene = state.story.scenes[id];
    if (!scene || scene.uiMode === "activation") return "";
    const file = scene.video || `${id}.mp4`;
    return `./videos/${file}`;
  }

  function sceneVideoFileName(id) {
    const scene = state.story.scenes[id];
    if (!scene || scene.uiMode === "activation") return "";
    return scene.video || `${id}.mp4`;
  }

  function sceneHasVideo(id) {
    const scene = state.story.scenes[id];
    if (!scene || scene.uiMode === "activation") return false;
    return state.availableVideos.has(sceneVideoFileName(id));
  }

  function sceneHasVideoBinding(id) {
    const scene = state.story.scenes[id];
    return Boolean(scene && scene.uiMode !== "activation" && sceneVideoFileName(id));
  }

  function shouldRenderLivePreview(id) {
    return state.selectedId === id || state.dropTargetId === id || state.importingSceneId === id;
  }

  async function refreshAvailableVideos() {
    if (!window.tragedyEditor?.listAvailableVideos) return;
    try {
      const result = await window.tragedyEditor.listAvailableVideos();
      const files = Array.isArray(result?.files) ? result.files : [];
      state.availableVideos = new Set(files);
    } catch (_err) {
      state.availableVideos = new Set();
    }
  }

  function musicPreviewPath() {
    const file = state.story?.settings?.music?.file || "tragedyminimalism.mp3";
    return `./audio/${file}`;
  }

  function ensurePositions() {
    const ids = sceneIds();
    if (!state.story.layout || typeof state.story.layout !== "object") {
      state.story.layout = {};
    }

    let i = 0;
    const cols = 6;
    const sx = 220;
    const sy = 150;

    for (const id of ids) {
      const existing = state.story.layout[id];
      if (existing && Number.isFinite(existing.x) && Number.isFinite(existing.y)) {
        state.positions[id] = { x: existing.x, y: existing.y };
      } else {
        state.positions[id] = { x: 120 + (i % cols) * sx, y: 100 + Math.floor(i / cols) * sy };
      }
      i += 1;
    }
  }

  function savePositionsIntoStory() {
    state.story.layout = state.story.layout || {};
    for (const id of sceneIds()) {
      const p = state.positions[id];
      if (p) state.story.layout[id] = { x: Math.round(p.x), y: Math.round(p.y) };
    }
  }

  function bindUi() {
    refs.titleInput.addEventListener("input", () => {
      pushUndo();
      state.story.settings.title = refs.titleInput.value;
    });

    refs.startSelect.addEventListener("change", () => {
      pushUndo();
      state.story.settings.start = refs.startSelect.value;
      renderAll();
    });

    refs.crossfadeInput.addEventListener("input", () => {
      pushUndo();
      state.story.settings.crossfadeMs = Number(refs.crossfadeInput.value || 0);
    });

    refs.leftSelect.addEventListener("change", () => applyTarget("left", refs.leftSelect.value));
    refs.rightSelect.addEventListener("change", () => applyTarget("right", refs.rightSelect.value));
    refs.nextSelect.addEventListener("change", () => applyTarget("next", refs.nextSelect.value));
    refs.musicPreviewBtn.addEventListener("click", toggleMusicPreview);
    refs.musicTimeline.addEventListener("input", onMusicTimelineInput);
    refs.musicStartSceneInput.addEventListener("input", () => applyMusicSceneStart());
    refs.musicStartInput.addEventListener("input", () => applyMusicSetting("startAtSec", refs.musicStartInput.value));
    refs.musicFadeInInput.addEventListener("input", () => applyMusicSetting("fadeInSec", refs.musicFadeInInput.value));
    refs.musicFadeOutStartInput.addEventListener("input", () => applyMusicSetting("fadeOutStartSec", refs.musicFadeOutStartInput.value));
    refs.musicFadeOutDurationInput.addEventListener("input", () => applyMusicSetting("fadeOutDurationSec", refs.musicFadeOutDurationInput.value));
    refs.musicVolumeInput.addEventListener("input", () => applyMusicSetting("volume", refs.musicVolumeInput.value));

    refs.openPlayerBtn.addEventListener("click", () => {
      window.location.href = "./index.html";
    });
    refs.addSceneBtn.addEventListener("click", addScene);
    refs.deleteSceneBtn.addEventListener("click", deleteSelectedScene);
    refs.autoLayoutBtn.addEventListener("click", () => {
      pushUndo();
      autoLayout();
      renderGraph();
      setStatus("Auto layout applied");
    });
    refs.saveBtn.addEventListener("click", saveStory);
    refs.undoBtn.addEventListener("click", undoLastChange);
    refs.redoBtn.addEventListener("click", redoLastChange);

    refs.svg.addEventListener("mousemove", onDragMove);
    refs.svg.addEventListener("mouseup", endDrag);
    refs.svg.addEventListener("mouseleave", endDrag);
    refs.svg.addEventListener("wheel", onWheelZoom, { passive: false });
    refs.svg.addEventListener("mousedown", beginPan);
    refs.svg.addEventListener("dragover", onCanvasDragOver);
    refs.svg.addEventListener("drop", onCanvasDrop);
    document.addEventListener("dragover", preventDocumentDropNavigation);
    document.addEventListener("drop", preventDocumentDropNavigation);
    document.addEventListener("keydown", onEditorKeyDown);
  }

  function readInitialViewBox() {
    const raw = (refs.svg.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
    if (raw.length === 4 && raw.every(Number.isFinite)) {
      state.viewBox = { x: raw[0], y: raw[1], width: raw[2], height: raw[3] };
    }
    applyViewBox();
  }

  function applyViewBox() {
    const v = state.viewBox;
    refs.svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.width} ${v.height}`);
  }

  function snapshotState() {
    savePositionsIntoStory();
    return {
      story: JSON.parse(JSON.stringify(state.story)),
      selectedId: state.selectedId,
      viewBox: { ...state.viewBox }
    };
  }

  function pushUndo() {
    state.undoStack.push(snapshotState());
    if (state.undoStack.length > 100) state.undoStack.shift();
    state.redoStack = [];
  }

  function undoLastChange() {
    const snap = state.undoStack.pop();
    if (!snap) {
      setStatus("Nothing to undo");
      return;
    }
    state.redoStack.push(snapshotState());
    state.story = snap.story;
    state.selectedId = snap.selectedId;
    state.viewBox = { ...snap.viewBox };
    state.positions = {};
    ensurePositions();
    renderAll();
    setStatus("Undo applied");
  }

  function redoLastChange() {
    const snap = state.redoStack.pop();
    if (!snap) {
      setStatus("Nothing to redo");
      return;
    }
    state.undoStack.push(snapshotState());
    state.story = snap.story;
    state.selectedId = snap.selectedId;
    state.viewBox = { ...snap.viewBox };
    state.positions = {};
    ensurePositions();
    renderAll();
    setStatus("Redo applied");
  }

  function onEditorKeyDown(evt) {
    if ((evt.metaKey || evt.ctrlKey) && !evt.shiftKey && evt.code === "KeyZ") {
      evt.preventDefault();
      undoLastChange();
    }
  }

  function selectScene(id) {
    state.selectedId = id;
    renderAll();
  }

  function applyTarget(kind, value) {
    const id = state.selectedId;
    if (!id) return;
    pushUndo();
    const scene = state.story.scenes[id];
    const nextValue = value || undefined;

    if (kind === "left") {
      if (nextValue) scene.left = nextValue; else delete scene.left;
    }
    if (kind === "right") {
      if (nextValue) scene.right = nextValue; else delete scene.right;
    }
    if (kind === "next") {
      if (nextValue) scene.next = nextValue; else delete scene.next;
    }

    renderGraph();
  }

  function addScene() {
    pushUndo();
    let index = 1;
    let id = `S_NEW_${index}`;
    while (state.story.scenes[id]) {
      index += 1;
      id = `S_NEW_${index}`;
    }
    state.story.scenes[id] = {};
    state.positions[id] = { x: 140 + sceneIds().length * 28, y: 120 + sceneIds().length * 16 };
    state.selectedId = id;
    renderAll();
    setStatus(`Scene '${id}' created`);
  }

  function deleteSelectedScene() {
    const id = state.selectedId;
    if (!id) return;
    if (!confirm(`Delete scene '${id}'?`)) return;
    pushUndo();

    delete state.story.scenes[id];
    delete state.positions[id];

    for (const scene of Object.values(state.story.scenes)) {
      if (scene.left === id) delete scene.left;
      if (scene.right === id) delete scene.right;
      if (scene.next === id) delete scene.next;
    }

    if (state.story.settings.start === id) {
      state.story.settings.start = sceneIds()[0] || "";
    }

    state.selectedId = sceneIds()[0] || null;
    renderAll();
    setStatus(`Scene '${id}' deleted`);
  }

  function autoLayout() {
    const ids = sceneIds();
    const start = state.story.settings.start || ids[0];
    const visited = new Set();
    const queue = [{ id: start, depth: 0, row: 0 }];
    const byDepth = new Map();

    while (queue.length) {
      const item = queue.shift();
      if (!item || visited.has(item.id) || !state.story.scenes[item.id]) continue;
      visited.add(item.id);
      if (!byDepth.has(item.depth)) byDepth.set(item.depth, []);
      byDepth.get(item.depth).push(item.id);

      const s = state.story.scenes[item.id];
      [s.left, s.right, s.next].filter(Boolean).forEach((to, i) => {
        queue.push({ id: to, depth: item.depth + 1, row: item.row * 3 + i });
      });
    }

    for (const id of ids) {
      if (!visited.has(id)) {
        const d = byDepth.size;
        if (!byDepth.has(d)) byDepth.set(d, []);
        byDepth.get(d).push(id);
      }
    }

    const depthKeys = Array.from(byDepth.keys()).sort((a, b) => a - b);
    for (const d of depthKeys) {
      const rowIds = byDepth.get(d);
      rowIds.forEach((id, idx) => {
        state.positions[id] = { x: 120 + d * 220, y: 110 + idx * 130 };
      });
    }
  }

  function renderAll() {
    renderProjectPanel();
    renderScenePanel();
    renderMusicPanel();
    renderGraph();
  }

  function renderProjectPanel() {
    const ids = sceneIds();
    refs.titleInput.value = state.story.settings.title || "";
    refs.crossfadeInput.value = Number(state.story.settings.crossfadeMs || 0);

    fillSelect(refs.startSelect, ids, state.story.settings.start, true);

    if (!state.selectedId && ids.length) {
      state.selectedId = state.story.settings.start || ids[0];
    }
  }

  function renderScenePanel() {
    const ids = sceneIds();
    const id = state.selectedId;
    const scene = id ? state.story.scenes[id] : null;

    refs.sceneMeta.textContent = scene ? `Selected: ${id}` : "No scene selected";
    refs.deleteSceneBtn.disabled = !scene;

    fillSelect(refs.leftSelect, ids, scene?.left || "", false);
    fillSelect(refs.rightSelect, ids, scene?.right || "", false);
    fillSelect(refs.nextSelect, ids, scene?.next || "", false);

    refs.leftSelect.disabled = !scene;
    refs.rightSelect.disabled = !scene;
    refs.nextSelect.disabled = !scene;
  }

  function renderMusicPanel() {
    const music = state.story.settings.music || {};
    const expectedSrc = new URL(musicPreviewPath(), window.location.href).href;
    if (refs.musicPreview && refs.musicPreview.src !== expectedSrc) {
      refs.musicPreview.src = expectedSrc;
      refs.musicPreview.load();
    }
    refs.musicStartSceneInput.value = music.startSceneId || "S2";
    refs.musicStartInput.value = Number(music.startAtSec || 0);
    refs.musicFadeInInput.value = Number(music.fadeInSec || 0);
    refs.musicFadeOutStartInput.value = Number(music.fadeOutStartSec || 0);
    refs.musicFadeOutDurationInput.value = Number(music.fadeOutDurationSec || 0);
    refs.musicVolumeInput.value = String(Math.round(Number(music.volume ?? 1) * 100));
    refs.musicVolumeMeta.textContent = `${Math.round(Number(music.volume ?? 1) * 100)}%`;
    syncMusicTimelineUi();
  }

  function fillSelect(select, ids, value, required) {
    const prev = select.value;
    select.innerHTML = "";

    if (!required) {
      const none = document.createElement("option");
      none.value = "";
      none.textContent = "(none)";
      select.appendChild(none);
    }

    ids.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = id;
      select.appendChild(opt);
    });

    if (value && ids.includes(value)) select.value = value;
    else if (!required) select.value = "";
    else if (ids.length) select.value = ids[0];
    else select.value = prev;
  }

  function bindMusicPreview() {
    const audio = refs.musicPreview;
    if (!audio) return;
    audio.src = musicPreviewPath();
    audio.addEventListener("loadedmetadata", syncMusicTimelineUi);
    audio.addEventListener("timeupdate", syncMusicTimelineUi);
    audio.addEventListener("ended", () => {
      audio.currentTime = Number(state.story.settings.music?.startAtSec || 0);
      syncMusicTimelineUi();
    });
  }

  function toggleMusicPreview() {
    const audio = refs.musicPreview;
    if (!audio) return;
    const startAt = Number(state.story.settings.music?.startAtSec || 0);
    if (audio.paused) {
      if (!Number.isFinite(audio.duration) || audio.currentTime < startAt) {
        audio.currentTime = startAt;
      }
      audio.volume = clamp(Number(state.story.settings.music?.volume ?? 1), 0, 1);
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function onMusicTimelineInput() {
    const audio = refs.musicPreview;
    if (!audio) return;
    audio.currentTime = Number(refs.musicTimeline.value || 0);
    syncMusicTimelineUi();
  }

  function syncMusicTimelineUi() {
    const audio = refs.musicPreview;
    const duration = Number(audio?.duration || 0);
    const currentTime = Number(audio?.currentTime || 0);
    refs.musicTimeline.max = String(duration > 0 ? duration : 100);
    refs.musicTimeline.value = String(Math.min(currentTime, duration > 0 ? duration : 100));
    refs.musicDuration.textContent = duration > 0 ? formatDuration(duration) : "--:--";
    refs.musicTimelineMeta.textContent = `${formatDuration(currentTime)} / ${duration > 0 ? formatDuration(duration) : "--:--"}`;
  }

  function applyMusicSetting(key, rawValue) {
    pushUndo();
    let value = Number(rawValue || 0);
    if (!Number.isFinite(value)) value = 0;
    if (key === "volume") {
      value = clamp(value, 0, 100) / 100;
    } else {
      value = Math.max(0, value);
    }
    state.story.settings.music[key] = value;

    if (key === "startAtSec" && refs.musicPreview) {
      refs.musicPreview.currentTime = value;
    }
    if (key === "volume" && refs.musicPreview) {
      refs.musicPreview.volume = value;
      refs.musicVolumeMeta.textContent = `${Math.round(value * 100)}%`;
    }
    syncMusicTimelineUi();
  }

  function applyMusicSceneStart() {
    pushUndo();
    const value = (refs.musicStartSceneInput.value || "").trim();
    state.story.settings.music.startSceneId = value || "S2";
  }

  function renderGraph() {
    refs.edges.innerHTML = "";
    refs.nodes.innerHTML = "";

    savePositionsIntoStory();
    applyViewBox();

    for (const [id, scene] of Object.entries(state.story.scenes)) {
      drawEdge(id, "left", scene.left, scene.leftLabel || "L");
      drawEdge(id, "right", scene.right, scene.rightLabel || "R");
      drawEdge(id, "next", scene.next, "NEXT");
    }

    if (state.linkDrag) {
      drawPreviewEdge(state.linkDrag.from, state.linkDrag.kind, state.linkDrag.pointer);
    }

    for (const id of sceneIds()) {
      drawNode(id);
    }
  }

  function drawEdge(from, kind, to, label) {
    if (!to || !state.positions[from] || !state.positions[to]) return;
    if (state.linkDrag && state.linkDrag.from === from && state.linkDrag.kind === kind) return;

    const a = state.positions[from];
    const b = state.positions[to];

    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x;
    const y2 = b.y + NODE_H / 2;

    const c1x = x1 + Math.max(40, Math.abs(x2 - x1) * 0.35);
    const c1y = y1;
    const c2x = x2 - Math.max(40, Math.abs(x2 - x1) * 0.35);
    const c2y = y2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "edge");
    path.setAttribute("d", `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`);
    refs.edges.appendChild(path);

    const tx = (x1 + x2) / 2;
    const ty = (y1 + y2) / 2 - 6;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "edge-label");
    text.setAttribute("x", String(tx));
    text.setAttribute("y", String(ty));
    text.textContent = label;
    refs.edges.appendChild(text);

    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.setAttribute("class", "edge-handle");
    handle.setAttribute("cx", String(x2 - 10));
    handle.setAttribute("cy", String(y2));
    handle.setAttribute("r", "8");
    handle.addEventListener("mousedown", (evt) => beginLinkDrag(evt, from, kind));
    refs.edges.appendChild(handle);
  }

  function drawPreviewEdge(from, kind, pointer) {
    if (!pointer || !state.positions[from]) return;

    const a = state.positions[from];
    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = pointer.x;
    const y2 = pointer.y;
    const c1x = x1 + Math.max(40, Math.abs(x2 - x1) * 0.35);
    const c2x = x2 - Math.max(40, Math.abs(x2 - x1) * 0.35);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "edge edge-preview");
    path.setAttribute("d", `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`);
    refs.edges.appendChild(path);
  }

  function beginLinkDrag(evt, from, kind) {
    evt.preventDefault();
    evt.stopPropagation();
    const pointer = toSvgCoords(evt.clientX, evt.clientY);
    state.linkDrag = { from, kind, pointer };
    refs.svg.classList.add("is-linking");
    renderGraph();
  }

  function nodeAtPoint(point, excludeId = "") {
    for (const id of sceneIds()) {
      if (id === excludeId) continue;
      const pos = state.positions[id];
      if (!pos) continue;
      const withinX = point.x >= pos.x && point.x <= pos.x + NODE_W;
      const withinY = point.y >= pos.y && point.y <= pos.y + NODE_H;
      if (withinX && withinY) return id;
    }
    return "";
  }

  function finishLinkDrag() {
    if (!state.linkDrag) return;
    const { from, kind, pointer } = state.linkDrag;
    const scene = state.story.scenes[from];
    const target = nodeAtPoint(pointer, from);
    const previous = scene?.[kind] || "";

    if (scene && (previous || target)) {
      pushUndo();
    }

    if (scene) {
      if (target) {
        scene[kind] = target;
        setStatus(`Connected ${from}.${kind} -> ${target}`);
      } else {
        delete scene[kind];
        if (kind === "left") delete scene.leftLabel;
        if (kind === "right") delete scene.rightLabel;
        setStatus(previous ? `Disconnected ${from}.${kind} -> ${previous}` : `Cleared ${from}.${kind}`);
      }
    }

    state.linkDrag = null;
    refs.svg.classList.remove("is-linking");
    if (state.selectedId === from) renderScenePanel();
    renderGraph();
  }

  function drawNode(id) {
    const p = state.positions[id];
    if (!p) return;
    const scene = state.story.scenes[id] || {};

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodeClasses = ["node"];
    if (state.selectedId === id) nodeClasses.push("selected");
    if (state.dropTargetId === id) nodeClasses.push("is-drop-target");
    g.setAttribute("class", nodeClasses.join(" "));
    g.setAttribute("data-id", id);
    g.setAttribute("transform", `translate(${p.x},${p.y})`);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", String(NODE_W));
    rect.setAttribute("height", String(NODE_H));
    g.appendChild(rect);

    const variant = scene?.variants?.citizen;
    const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreign.setAttribute("x", "8");
    foreign.setAttribute("y", "8");
    foreign.setAttribute("width", String(NODE_W - 16));
    foreign.setAttribute("height", String(NODE_H - 16));

    const card = document.createElement("div");
    card.className = "node-editor";

    const header = document.createElement("div");
    header.className = "node-editor-head";

    const idLabel = document.createElement("div");
    idLabel.className = "node-editor-id";
    idLabel.textContent = id;
    header.appendChild(idLabel);

    const badges = document.createElement("div");
    badges.className = "node-editor-badges";
    const durationText = formatDuration(state.durations[id]);
    if (durationText) badges.appendChild(createBadge(durationText, "time"));
    if (scene.left) badges.appendChild(createBadge("L"));
    if (scene.right) badges.appendChild(createBadge("R"));
    if (scene.next) badges.appendChild(createBadge("N"));
    if (state.story.settings.start === id) badges.appendChild(createBadge("START"));
    if (!badges.children.length) badges.appendChild(createBadge("END"));
    header.appendChild(badges);

    const titleInput = document.createElement("input");
    titleInput.className = "node-editor-title";
    titleInput.type = "text";
    titleInput.placeholder = "Название сцены";
    titleInput.value = scene.title || "";
    bindNodeField(titleInput, id, (value) => {
      if (value.trim()) scene.title = value;
      else delete scene.title;
    });

    const choices = document.createElement("div");
    choices.className = "node-editor-choices";

    const leftInput = document.createElement("input");
    leftInput.className = "node-editor-choice";
    leftInput.type = "text";
    leftInput.placeholder = "Текст левого выбора";
    leftInput.value = scene.leftLabel || "";
    leftInput.disabled = !scene.left;
    bindNodeField(leftInput, id, (value) => {
      if (value.trim()) scene.leftLabel = value;
      else delete scene.leftLabel;
    }, true);
    choices.appendChild(leftInput);

    const rightInput = document.createElement("input");
    rightInput.className = "node-editor-choice";
    rightInput.type = "text";
    rightInput.placeholder = "Текст правого выбора";
    rightInput.value = scene.rightLabel || "";
    rightInput.disabled = !scene.right;
    bindNodeField(rightInput, id, (value) => {
      if (value.trim()) scene.rightLabel = value;
      else delete scene.rightLabel;
    }, true);
    choices.appendChild(rightInput);

    const dropzone = document.createElement("div");
    dropzone.className = `node-editor-dropzone${state.dropTargetId === id ? " is-active" : ""}`;

    const dropLabel = document.createElement("div");
    dropLabel.className = "node-editor-drop-label";
    if (state.importingSceneId === id) {
      dropLabel.textContent = "Importing video...";
    } else if (sceneHasVideo(id)) {
      dropLabel.textContent = "Drop video to replace";
    } else {
      dropLabel.textContent = "Drop video here";
    }
    dropzone.appendChild(dropLabel);

    const dropFile = document.createElement("div");
    dropFile.className = "node-editor-drop-file";
    dropFile.textContent = sceneHasVideo(id)
      ? `${sceneVideoFileName(id)} • rename not needed`
      : sceneHasVideoBinding(id)
        ? `${sceneVideoFileName(id)} • file missing`
        : "Any filename is OK";
    dropzone.appendChild(dropFile);

    const preview = document.createElement("div");
    preview.className = "node-editor-preview";

    if (sceneHasVideo(id) && shouldRenderLivePreview(id)) {
      const previewVideo = document.createElement("video");
      previewVideo.className = "node-editor-preview-video";
      previewVideo.src = sceneVideoPath(id);
      previewVideo.preload = "metadata";
      previewVideo.muted = true;
      previewVideo.playsInline = true;
      previewVideo.setAttribute("aria-hidden", "true");
      preview.appendChild(previewVideo);

      const previewBadge = document.createElement("div");
      previewBadge.className = "node-editor-preview-badge";
      previewBadge.textContent = "Current video";
      preview.appendChild(previewBadge);
    } else if (sceneHasVideo(id)) {
      const previewEmpty = document.createElement("div");
      previewEmpty.className = "node-editor-preview-empty";
      previewEmpty.textContent = "Video attached. Select node to preview.";
      preview.appendChild(previewEmpty);
    } else if (sceneHasVideoBinding(id)) {
      const previewEmpty = document.createElement("div");
      previewEmpty.className = "node-editor-preview-empty";
      previewEmpty.textContent = "Video file missing. Drop a new file here.";
      preview.appendChild(previewEmpty);
    } else {
      const previewEmpty = document.createElement("div");
      previewEmpty.className = "node-editor-preview-empty";
      previewEmpty.textContent = "No video attached yet";
      preview.appendChild(previewEmpty);
    }

    const noteInput = document.createElement("textarea");
    noteInput.className = "node-editor-note";
    noteInput.placeholder = "Заметка внутри ноды";
    noteInput.value = scene.note || scene.notes || "";
    bindNodeField(noteInput, id, (value) => {
      if (value.trim()) {
        scene.note = value;
      } else {
        delete scene.note;
      }
      delete scene.notes;
    });

    card.appendChild(header);
    card.appendChild(titleInput);
    card.appendChild(choices);
    card.appendChild(dropzone);
    card.appendChild(preview);
    card.appendChild(noteInput);

    if (variant) {
      const variantInfo = document.createElement("div");
      variantInfo.className = "node-editor-variant";
      variantInfo.textContent = `D: ${scene.left}/${scene.right} • C: ${variant.left}/${variant.right}`;
      card.appendChild(variantInfo);
    }

    foreign.appendChild(card);
    g.appendChild(foreign);

    g.addEventListener("mousedown", (evt) => beginDrag(evt, id));
    g.addEventListener("click", () => selectScene(id));
    bindNodeDropTarget(g, id);
    bindNodeDropTarget(dropzone, id);

    refs.nodes.appendChild(g);
  }

  function createBadge(text, kind = "") {
    const badge = document.createElement("span");
    badge.className = `node-editor-badge${kind ? ` is-${kind}` : ""}`;
    badge.textContent = text;
    return badge;
  }

  function bindNodeField(element, id, applyValue, rerenderGraphOnBlur = false) {
    const stop = (evt) => evt.stopPropagation();

    element.addEventListener("mousedown", stop);
    element.addEventListener("click", stop);
    element.addEventListener("dblclick", stop);
    element.addEventListener("focus", (evt) => {
      evt.stopPropagation();
      pushUndo();
      state.selectedId = id;
      renderScenePanel();
    });
    element.addEventListener("input", (evt) => {
      evt.stopPropagation();
      applyValue(element.value);
    });
    element.addEventListener("blur", () => {
      if (rerenderGraphOnBlur) {
        renderGraph();
      }
      renderScenePanel();
    });
  }

  function toSvgCoords(clientX, clientY) {
    const pt = refs.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = refs.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function beginDrag(evt, id) {
    evt.preventDefault();
    evt.stopPropagation();
    pushUndo();
    const p = state.positions[id];
    const s = toSvgCoords(evt.clientX, evt.clientY);
    state.drag = {
      id,
      dx: s.x - p.x,
      dy: s.y - p.y
    };
    selectScene(id);
  }

  function bindNodeDropTarget(element, id) {
    const stop = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
    };

    element.addEventListener("dragenter", (evt) => {
      stop(evt);
      if (!canImportSceneVideos()) return;
      state.dropTargetId = id;
      if (state.selectedId !== id) {
        state.selectedId = id;
        renderAll();
      } else {
        renderGraph();
      }
    });

    element.addEventListener("dragover", (evt) => {
      stop(evt);
      if (!canImportSceneVideos()) {
        evt.dataTransfer.dropEffect = "none";
        return;
      }
      evt.dataTransfer.dropEffect = "copy";
      if (state.dropTargetId !== id) {
        state.dropTargetId = id;
        renderGraph();
      }
    });

    element.addEventListener("drop", async (evt) => {
      stop(evt);
      state.dropTargetId = null;
      renderGraph();
      await importDroppedVideo(id, evt.dataTransfer);
    });
  }

  function onCanvasDragOver(evt) {
    evt.preventDefault();
  }

  function onCanvasDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const point = toSvgCoords(evt.clientX, evt.clientY);
    const targetId = nodeAtPoint(point);
    state.dropTargetId = null;
    renderGraph();
    if (targetId) {
      importDroppedVideo(targetId, evt.dataTransfer);
    }
  }

  function preventDocumentDropNavigation(evt) {
    if (!evt.dataTransfer?.files?.length) return;
    evt.preventDefault();
  }

  function canImportSceneVideos() {
    return typeof window.tragedyEditor?.importSceneVideo === "function";
  }

  async function importDroppedVideo(sceneId, dataTransfer) {
    if (!canImportSceneVideos()) {
      setStatus("Video import works only in the desktop editor.", true);
      return;
    }

    const file = dataTransfer?.files?.[0] || dataTransfer?.items?.[0]?.getAsFile?.();
    const sourcePath = file?.path || window.tragedyEditor?.getPathForDroppedFile?.(file) || "";
    if (!file || !sourcePath) {
      setStatus("Could not access the dropped file path from Electron.", true);
      return;
    }

    const scene = state.story.scenes[sceneId];
    if (!scene) {
      setStatus(`Scene '${sceneId}' not found.`, true);
      return;
    }

    pushUndo();
    state.importingSceneId = sceneId;
    renderGraph();
    setStatus(`Importing '${file.name}' into ${sceneId}...`);

    try {
      const result = await window.tragedyEditor.importSceneVideo({ sceneId, sourcePath });
      scene.video = result.fileName;
      state.availableVideos.add(result.fileName);
      state.durations[sceneId] = await readVideoDuration(sceneVideoPath(sceneId));
      state.selectedId = sceneId;
      await saveStory();
      renderAll();
      setStatus(`Video attached to ${sceneId}: ${result.fileName}`);
    } catch (err) {
      setStatus(`Video import failed: ${String(err.message || err)}`, true);
    } finally {
      state.importingSceneId = null;
      renderGraph();
    }
  }

  function onDragMove(evt) {
    if (state.drag) {
      const s = toSvgCoords(evt.clientX, evt.clientY);
      state.positions[state.drag.id] = {
        x: Math.max(16, s.x - state.drag.dx),
        y: Math.max(16, s.y - state.drag.dy)
      };
      renderGraph();
      return;
    }

    if (state.linkDrag) {
      state.linkDrag.pointer = toSvgCoords(evt.clientX, evt.clientY);
      renderGraph();
      return;
    }

    if (!state.pan) return;
    const s = toSvgCoords(evt.clientX, evt.clientY);
    state.viewBox.x = state.pan.viewBoxX - (s.x - state.pan.start.x);
    state.viewBox.y = state.pan.viewBoxY - (s.y - state.pan.start.y);
    applyViewBox();
  }

  function endDrag() {
    if (state.drag) {
      state.drag = null;
      savePositionsIntoStory();
    }
    if (state.linkDrag) {
      finishLinkDrag();
    }
    if (state.pan) {
      state.pan = null;
      refs.svg.classList.remove("is-panning");
    }
  }

  function beginPan(evt) {
    if (state.linkDrag) return;
    const wantsPan = evt.button === 1 || evt.altKey || evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.target === refs.svg;
    if (!wantsPan || state.drag) return;
    evt.preventDefault();
    const s = toSvgCoords(evt.clientX, evt.clientY);
    state.pan = {
      start: s,
      viewBoxX: state.viewBox.x,
      viewBoxY: state.viewBox.y
    };
    refs.svg.classList.add("is-panning");
  }

  function clamp(num, min, max) {
    return Math.min(max, Math.max(min, num));
  }

  function onWheelZoom(evt) {
    if (state.drag || state.linkDrag || state.pan) return;
    evt.preventDefault();

    const pointer = toSvgCoords(evt.clientX, evt.clientY);
    const factor = evt.deltaY > 0 ? 1.08 : 0.92;
    const nextWidth = clamp(state.viewBox.width * factor, 700, 7000);
    const nextHeight = clamp(state.viewBox.height * factor, 300, 3000);
    const scaleX = (pointer.x - state.viewBox.x) / state.viewBox.width;
    const scaleY = (pointer.y - state.viewBox.y) / state.viewBox.height;

    state.viewBox.x = pointer.x - nextWidth * scaleX;
    state.viewBox.y = pointer.y - nextHeight * scaleY;
    state.viewBox.width = nextWidth;
    state.viewBox.height = nextHeight;
    applyViewBox();
  }

  function downloadStory() {
    savePositionsIntoStory();
    const blob = new Blob([JSON.stringify(state.story, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "story.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("Downloaded story.json");
  }

  async function saveStory() {
    savePositionsIntoStory();

    if (window.tragedyEditor?.saveStory) {
      try {
        const result = await window.tragedyEditor.saveStory(state.story);
        const storyPaths = Array.isArray(result?.storyPaths) ? result.storyPaths : [];
        const outlinePaths = Array.isArray(result?.outlinePaths) ? result.outlinePaths : [];
        if (storyPaths.length && outlinePaths.length) {
          setStatus(`Saved story + outline: ${storyPaths[0]}`);
        } else if (storyPaths.length) {
          setStatus(`Saved: ${storyPaths[0]}`);
        } else {
          setStatus("Saved story.json");
        }
        return;
      } catch (err) {
        setStatus(`Direct save failed: ${String(err.message || err)}`, true);
        return;
      }
    }

    if (canUseBrowserProjectSave()) {
      try {
        const saved = await saveStoryViaBrowserProjectAccess();
        if (saved) return;
      } catch (err) {
        setStatus(`Browser save failed: ${String(err.message || err)}`, true);
        return;
      }
    }

    downloadStory();
  }

  function queueSceneDurations() {
    state.durationQueue = sceneIds().filter((id) => {
      if (!sceneHasVideo(id)) {
        state.durations[id] = null;
        return false;
      }
      return typeof state.durations[id] === "undefined";
    });
    runDurationQueue();
  }

  async function runDurationQueue() {
    if (state.durationWorkerRunning) return;
    state.durationWorkerRunning = true;

    try {
      while (state.durationQueue.length) {
        const id = state.durationQueue.shift();
        if (!id || !sceneHasVideo(id)) {
          state.durations[id] = null;
          continue;
        }

        state.durations[id] = await readVideoDuration(sceneVideoPath(id));
        if (state.selectedId === id) {
          renderGraph();
        }

        await pause(10);
      }
    } finally {
      state.durationWorkerRunning = false;
      renderGraph();
      setStatus("Таймкоды сцен обновлены");
    }
  }

  function readVideoDuration(src) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      let settled = false;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        video.removeAttribute("src");
        video.load();
        resolve(value);
      };

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        const duration = Number(video.duration);
        finish(Number.isFinite(duration) && duration > 0 ? duration : null);
      };
      video.onerror = () => finish(null);
      window.setTimeout(() => finish(null), 5000);
      video.src = src;
    });
  }

  function formatDuration(value) {
    if (!Number.isFinite(value) || value <= 0) return "";
    const total = Math.round(value);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function pause(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  init();
})();
