(() => {
  "use strict";

  const state = {
    story: null,
    currentId: null,
    previousId: null,
    activeLayerKey: "A",
    choiceEnabled: false,
    sceneEnded: false,
    pendingChoice: null,
    debugEnabled: true,
    transitionLock: false,
    musicUnlocked: false,
    musicStarted: false,
    activeMusic: null,
    retryChoiceSceneId: null,
    choiceStats: {
      dictator: 0,
      citizen: 0,
      neutral: 0
    }
  };

  const CREATOR_PASSWORD = "deercries";
  const CREATOR_SHORTCUT_ENABLED = true;

  const stage = document.getElementById("stage");
  const backgroundMusic = document.getElementById("backgroundMusic");
  const sceneAudio = document.getElementById("sceneAudio");
  const choicePanel = document.getElementById("choicePanel");
  const choiceHint = document.getElementById("choiceHint");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  const inputHint = document.getElementById("inputHint");
  const debugOverlay = document.getElementById("debugOverlay");
  const activationScreen = document.getElementById("activationScreen");
  const activationBackdropVideo = document.getElementById("activationBackdropVideo");
  const activationBtn = document.getElementById("activationBtn");
  const activationBtnLabel = document.getElementById("activationBtnLabel");
  const creatorGate = document.getElementById("creatorGate");
  const creatorPasswordInput = document.getElementById("creatorPasswordInput");
  const creatorGateError = document.getElementById("creatorGateError");
  const creatorSubmitBtn = document.getElementById("creatorSubmitBtn");
  const creatorCancelBtn = document.getElementById("creatorCancelBtn");

  const layerA = createLayerRef("A");
  const layerB = createLayerRef("B");

  if (backgroundMusic) {
    backgroundMusic.addEventListener("timeupdate", applyMusicEnvelope);
    backgroundMusic.addEventListener("ended", () => {
      const music = activeMusicConfig();
      if (music.loop === false) {
        state.musicStarted = false;
        return;
      }
      backgroundMusic.currentTime = Number(music.startAtSec || 0);
      applyMusicEnvelope();
      backgroundMusic.play().catch(() => {});
    });
  }

  function createLayerRef(key) {
    const root = stage.querySelector(`.layer[data-layer="${key}"]`);
    return {
      key,
      root,
      video: root.querySelector(".video"),
      missing: root.querySelector(".missing"),
      missingTitle: root.querySelector(".missing-title"),
      missingNote: root.querySelector(".missing-note"),
      revealHandled: false,
      endTimerId: 0,
      guardId: 0,
      sceneId: ""
    };
  }

  function activeLayer() {
    return state.activeLayerKey === "A" ? layerA : layerB;
  }

  function inactiveLayer() {
    return state.activeLayerKey === "A" ? layerB : layerA;
  }

  function settings() {
    return state.story?.settings || {};
  }

  function normalizedVideoBaseUrl() {
    const raw = String(settings().videoBaseUrl || "").trim();
    if (!raw) return "";
    return raw.endsWith("/") ? raw : `${raw}/`;
  }

  function sceneById(id) {
    return state.story?.scenes?.[id] || null;
  }

  function normalizeLabel(value) {
    return String(value || "").trim();
  }

  function musicSettings() {
    const raw = state.story?.settings?.music;
    return {
      file: "tragedyminimalism.mp3",
      startSceneId: "S2",
      startAtSec: 0,
      fadeInSec: 0,
      fadeOutStartSec: 0,
      fadeOutDurationSec: 0,
      volume: 1,
      cues: [],
      ...(raw && typeof raw === "object" ? raw : {})
    };
  }

  function normalizeMusicCue(rawCue, fallback = {}) {
    return {
      file: String(rawCue?.file || fallback.file || "tragedyminimalism.mp3").trim() || "tragedyminimalism.mp3",
      startSceneId: String(rawCue?.startSceneId || fallback.startSceneId || "").trim(),
      startAtSec: Number(rawCue?.startAtSec ?? fallback.startAtSec ?? 0) || 0,
      fadeInSec: Number(rawCue?.fadeInSec ?? fallback.fadeInSec ?? 0) || 0,
      fadeOutStartSec: Number(rawCue?.fadeOutStartSec ?? fallback.fadeOutStartSec ?? 0) || 0,
      fadeOutDurationSec: Number(rawCue?.fadeOutDurationSec ?? fallback.fadeOutDurationSec ?? 0) || 0,
      volume: Number(rawCue?.volume ?? fallback.volume ?? 1),
      loop: rawCue?.loop ?? fallback.loop ?? true
    };
  }

  function defaultMusicCue() {
    return normalizeMusicCue(musicSettings());
  }

  function musicCueForScene(sceneId) {
    const music = musicSettings();
    const fallback = defaultMusicCue();
    const cues = Array.isArray(music.cues) ? music.cues : [];
    const matched = cues.find((cue) => String(cue?.startSceneId || "").trim() === sceneId);
    return matched ? normalizeMusicCue(matched, fallback) : null;
  }

  function activeMusicConfig() {
    return state.activeMusic || defaultMusicCue();
  }

  function sceneAudioSettings() {
    const raw = state.story?.settings?.sceneAudio;
    const files = raw?.files && typeof raw.files === "object" ? raw.files : {};
    return {
      volume: Number(raw?.volume ?? 0.32),
      files
    };
  }

  function sceneAudioFileForScene(sceneId) {
    const files = sceneAudioSettings().files;
    return String(files?.[sceneId] || "").trim();
  }

  function ensureBackgroundMusicSource(file) {
    if (!backgroundMusic) return;
    const expectedFile = String(file || defaultMusicCue().file || "tragedyminimalism.mp3").trim() || "tragedyminimalism.mp3";
    const expected = new URL(`./audio/${expectedFile}`, window.location.href).href;
    if (backgroundMusic.src !== expected) {
      backgroundMusic.src = expected;
      backgroundMusic.load();
    }
  }

  function ensureSceneAudioSource(file) {
    if (!sceneAudio) return;
    const expectedFile = String(file || "").trim();
    if (!expectedFile) return;
    const expected = new URL(`./audio/${expectedFile}`, window.location.href).href;
    if (sceneAudio.src !== expected) {
      sceneAudio.src = expected;
      sceneAudio.load();
    }
  }

  function activationBackdropPath() {
    const file = String(settings().activationVideo || "zastavka.mp4").trim() || "zastavka.mp4";
    const baseUrl = normalizedVideoBaseUrl();
    return baseUrl ? `${baseUrl}${file}` : `videos/${file}`;
  }

  function ensureActivationBackdropSource() {
    if (!activationBackdropVideo) return;
    const expected = new URL(activationBackdropPath(), window.location.href).href;
    if (activationBackdropVideo.src !== expected) {
      activationBackdropVideo.src = expected;
      activationBackdropVideo.load();
    }
  }

  function effectiveSceneById(id) {
    const scene = sceneById(id);
    if (!scene) return null;
    return scene;
  }

  function classifySceneLine(sceneId) {
    if (!sceneId) return null;

    if (sceneId.startsWith("D")) return "dictator";
    if (sceneId.startsWith("C")) return "citizen";
    if (sceneId.startsWith("N")) return "neutral";

    const bridgeLineMap = {
      S_NEW_1: "dictator",
      S_NEW_2: "citizen",
      S_NEW_3: "citizen",
      S_NEW_4: "citizen",
      S_NEW_5: "citizen",
      S_NEW_6: "citizen",
      S_NEW_7: "dictator",
      S_NEW_8: "neutral",
      S_NEW_9: "neutral",
      S_NEW_10: "citizen",
      S_NEW_11: "dictator",
      S_NEW_12: "citizen",
      S_NEW_13: "dictator",
      S_NEW_14: "citizen",
      S_NEW_15: "neutral",
      S_NEW_16: "neutral",
      S_NEW_17: "citizen",
      S_NEW_18: "dictator",
      S_NEW_19: "citizen",
      S_NEW_20: "neutral",
      S_NEW_21: "citizen",
      S_NEW_22: "citizen",
      S_NEW_23: "dictator",
      S_NEW_24: "neutral",
      S_NEW_25: null,
      S_NEW_26: null,
      S_NEW_27: null,
      S_NEW_28: "neutral",
      S_NEW_29: "dictator",
      S_NEW_30: "neutral",
      S_NEW_31: "citizen",
      S_NEW_32: "neutral",
      S_NEW_33: "citizen",
      S_NEW_34: "neutral",
      S_NEW_35: "dictator",
      S_NEW_36: "neutral",
      S_NEW_37: "citizen"
    };

    return bridgeLineMap[sceneId] ?? null;
  }

  function trackChoiceTarget(targetId) {
    const line = classifySceneLine(targetId);
    if (!line) return;
    state.choiceStats[line] += 1;
    log("choice-line-tracked", {
      target: targetId,
      line,
      dictator: state.choiceStats.dictator,
      citizen: state.choiceStats.citizen,
      neutral: state.choiceStats.neutral
    });
  }

  function finalHubForChoiceBalance() {
    const dictator = Number(state.choiceStats.dictator || 0);
    const citizen = Number(state.choiceStats.citizen || 0);
    const neutral = Number(state.choiceStats.neutral || 0);
    const classifiedTotal = dictator + citizen + neutral;
    const polarityTotal = dictator + citizen;
    const dictatorPercent = polarityTotal > 0 ? (dictator / polarityTotal) * 100 : 50;
    const citizenPercent = polarityTotal > 0 ? (citizen / polarityTotal) * 100 : 50;
    const hub = citizenPercent > dictatorPercent ? "S_NEW_2" : "F0";

    log("final-hub-selected", {
      hub,
      dictator,
      citizen,
      neutral,
      classifiedTotal,
      dictatorPercent: Number(dictatorPercent.toFixed(2)),
      citizenPercent: Number(citizenPercent.toFixed(2))
    });

    return hub;
  }

  function resolveFinalHubTarget(targetId) {
    if (targetId !== "F0" && targetId !== "S_NEW_2") return targetId;
    return finalHubForChoiceBalance();
  }

  function resolveSpecialTarget(targetId) {
    if (targetId === "__RETRY_CHOICE__") {
      return state.retryChoiceSceneId || settings().start;
    }
    if (targetId === "__FINAL_LOOP_INSERT__") {
      return randomFinalLoopInsertionId() || "S1";
    }
    return targetId;
  }

  function randomChoiceTimeoutInsertionId() {
    const ids = Array.isArray(settings().choiceTimeoutInsertionIds) ? settings().choiceTimeoutInsertionIds : [];
    if (!ids.length) return null;
    return ids[Math.floor(Math.random() * ids.length)] || null;
  }

  function randomFinalLoopInsertionId() {
    const ids = Array.isArray(settings().finalLoopInsertionIds) ? settings().finalLoopInsertionIds : [];
    if (!ids.length) return null;
    return ids[Math.floor(Math.random() * ids.length)] || null;
  }

  function videoPathFor(sceneId) {
    const scene = sceneById(sceneId);
    const file = scene?.video || `${sceneId}.mp4`;
    const baseUrl = normalizedVideoBaseUrl();
    return baseUrl ? `${baseUrl}${file}` : `videos/${file}`;
  }

  function log(event, payload = {}) {
    const stamp = new Date().toISOString();
    const data = { t: stamp, event, ...payload };
    console.log("[TragedyInMinimalism]", data);
    updateDebugOverlay(data);
  }

  function updateDebugOverlay(entry) {
    if (!state.debugEnabled) return;
    const lines = [
      `scene: ${state.currentId || "-"}`,
      `activeLayer: ${state.activeLayerKey}`,
      `choiceEnabled: ${state.choiceEnabled}`,
      `pendingChoice: ${state.pendingChoice || "-"}`,
      `event: ${entry.event}`
    ];
    if (entry.from || entry.to) {
      lines.push(`transition: ${entry.from || "-"} -> ${entry.to || "-"}`);
    }
    if (entry.reason) lines.push(`reason: ${entry.reason}`);
    debugOverlay.textContent = lines.join("\n");
  }

  function showDebug(flag) {
    state.debugEnabled = flag;
    debugOverlay.hidden = !flag;
    log("debug-toggle", { reason: flag ? "on" : "off" });
  }

  function clearTimers(layer) {
    layer.video.ontimeupdate = null;
    layer.revealHandled = false;
    if (layer.endTimerId) {
      clearTimeout(layer.endTimerId);
      layer.endTimerId = 0;
    }
    if (layer.guardId) {
      clearTimeout(layer.guardId);
      layer.guardId = 0;
    }
  }

  function resetVideoElement(video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.currentTime = 0;
  }

  function setMissingMode(layer, enabled, sceneId, details = {}) {
    layer.root.classList.toggle("is-missing", enabled);
    if (!enabled) {
      layer.missingTitle.textContent = "";
      layer.missingNote.textContent = "";
      return;
    }

    const scene = sceneById(sceneId);
    const title = scene?.title ? `${sceneId} - ${scene.title}` : (sceneId || "Unknown scene");
    const lines = ["Video failed to load."];
    if (details.src) lines.push(`file: ${details.src}`);
    if (details.reason) lines.push(`reason: ${details.reason}`);

    layer.missingTitle.textContent = title;
    layer.missingNote.textContent = lines.join("\n");
  }

  function setChoiceState(enabled) {
    state.choiceEnabled = enabled;
    choicePanel.classList.toggle("is-active", enabled);
    choicePanel.setAttribute("aria-hidden", enabled ? "false" : "true");

    const scene = effectiveSceneById(state.currentId);
    const leftTarget = scene?.left || "";
    const rightTarget = scene?.right || "";
    const leftLabel = normalizeLabel(scene?.leftLabel);
    const rightLabel = normalizeLabel(scene?.rightLabel);
    leftBtn.disabled = !enabled || !leftTarget;
    rightBtn.disabled = !enabled || !rightTarget;
    leftBtn.hidden = !leftTarget;
    rightBtn.hidden = !rightTarget;

    leftBtn.classList.toggle("is-selected", state.pendingChoice === "left");
    rightBtn.classList.toggle("is-selected", state.pendingChoice === "right");

    if (enabled) {
      choiceHint.textContent = "";
      inputHint.textContent = "";
      leftBtn.textContent = leftLabel || (leftTarget ? `Left (${leftTarget})` : "Left");
      rightBtn.textContent = rightLabel || (rightTarget ? `Right (${rightTarget})` : "Right");
    } else {
      choiceHint.textContent = "";
      inputHint.textContent = "";
      leftBtn.textContent = "Left";
      rightBtn.textContent = "Right";
    }
  }

  function setActivationState(enabled, scene) {
    activationScreen.hidden = !enabled;
    if (activationBackdropVideo) {
      ensureActivationBackdropSource();
      if (enabled) {
        activationBackdropVideo.currentTime = 0;
        activationBackdropVideo.play().catch(() => {});
      } else {
        activationBackdropVideo.pause();
        activationBackdropVideo.currentTime = 0;
      }
    }
    if (!enabled) return;
    const activationLabel = normalizeLabel(scene?.leftLabel) || "ВКЛЮЧИТЬ ТРАНСЛЯЦИЮ";
    activationBtn.setAttribute("aria-label", activationLabel);
    activationBtn.title = activationLabel;
    if (activationBtnLabel) {
      activationBtnLabel.textContent = activationLabel;
    }
  }

  async function ensureBackgroundMusicPlaying() {
    if (!backgroundMusic) return;
    const music = activeMusicConfig();
    ensureBackgroundMusicSource(music.file);
    if (!backgroundMusic.currentSrc && !backgroundMusic.src) return;
    applyMusicEnvelope();
    if (!backgroundMusic.paused) return;
    try {
      await backgroundMusic.play();
      log("music-play", { track: music.file });
    } catch (err) {
      log("music-play-failed", { reason: String(err?.message || err) });
    }
  }

  function primeBackgroundMusicFromGesture(sceneId) {
    if (!backgroundMusic) return;
    const primedFromSceneId = state.currentId;
    state.musicUnlocked = true;
    const music = musicCueForScene(sceneId) || defaultMusicCue();
    ensureBackgroundMusicSource(music.file);
    if (!backgroundMusic.currentSrc && !backgroundMusic.src) return;
    backgroundMusic.currentTime = Number(music.startAtSec || 0);
    backgroundMusic.volume = 0;
    const playPromise = backgroundMusic.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise
        .then(() => {
          const stillOnActivationScene = state.currentId === primedFromSceneId && sceneById(state.currentId)?.uiMode === "activation";
          if (!stillOnActivationScene) {
            log("music-prime-keep-playing", { track: music.file, scene: state.currentId || "-" });
            return;
          }
          backgroundMusic.pause();
          backgroundMusic.currentTime = Number(music.startAtSec || 0);
          backgroundMusic.volume = 0;
          log("music-primed", { track: music.file });
        })
        .catch((err) => log("music-prime-failed", { reason: String(err?.message || err) }));
    }
  }

  function switchBackgroundMusic(music) {
    if (!backgroundMusic || !music) return;
    state.activeMusic = music;
    ensureBackgroundMusicSource(music.file);
    backgroundMusic.currentTime = Number(music.startAtSec || 0);
    applyMusicEnvelope();
  }

  function syncBackgroundMusic(scene) {
    if (!backgroundMusic) return;
    backgroundMusic.loop = false;
    if (scene?.uiMode === "activation") {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      state.musicStarted = false;
      state.activeMusic = null;
      return;
    }

    const triggeredCue = musicCueForScene(state.currentId);
    if (triggeredCue) {
      state.musicStarted = true;
      switchBackgroundMusic(triggeredCue);
    } else if (!state.musicStarted && state.currentId === (defaultMusicCue().startSceneId || "S2")) {
      state.musicStarted = true;
      switchBackgroundMusic(defaultMusicCue());
    }

    if (!state.musicStarted || !state.musicUnlocked) return;
    backgroundMusic.loop = Boolean(activeMusicConfig().loop);
    ensureBackgroundMusicPlaying();
  }

  function stopSceneAudio() {
    if (!sceneAudio) return;
    sceneAudio.pause();
    sceneAudio.removeAttribute("src");
    sceneAudio.load();
  }

  function syncSceneAudio(sceneId, scene) {
    if (!sceneAudio) return;
    if (scene?.uiMode === "activation") {
      stopSceneAudio();
      return;
    }

    const file = sceneAudioFileForScene(sceneId);
    if (!file) {
      stopSceneAudio();
      return;
    }

    ensureSceneAudioSource(file);
    sceneAudio.currentTime = 0;
    sceneAudio.volume = Math.max(0, Math.min(1, Number(sceneAudioSettings().volume ?? 0.32)));
    sceneAudio.play()
      .then(() => log("scene-audio-play", { scene: sceneId, track: file }))
      .catch((err) => log("scene-audio-failed", {
        scene: sceneId,
        track: file,
        reason: String(err?.message || err)
      }));
  }

  function applyMusicEnvelope() {
    if (!backgroundMusic) return;
    const music = activeMusicConfig();
    const currentTime = Number(backgroundMusic.currentTime || 0);
    const baseVolume = Math.max(0, Math.min(1, Number(music.volume ?? 1)));
    let volume = baseVolume;

    const fadeInSec = Math.max(0, Number(music.fadeInSec || 0));
    const startAtSec = Math.max(0, Number(music.startAtSec || 0));
    const fadeOutStartSec = Math.max(0, Number(music.fadeOutStartSec || 0));
    const fadeOutDurationSec = Math.max(0, Number(music.fadeOutDurationSec || 0));

    if (fadeInSec > 0 && currentTime < startAtSec + fadeInSec) {
      volume *= Math.max(0, (currentTime - startAtSec) / fadeInSec);
    }

    if (fadeOutDurationSec > 0 && fadeOutStartSec > 0 && currentTime >= fadeOutStartSec) {
      const fadeOutProgress = 1 - ((currentTime - fadeOutStartSec) / fadeOutDurationSec);
      volume *= Math.max(0, Math.min(1, fadeOutProgress));
    }

    backgroundMusic.volume = volume;
  }

  function chooseTarget(direction) {
    const scene = effectiveSceneById(state.currentId);
    if (!scene) return;
    const isActivationScene = scene.uiMode === "activation";
    if (!state.choiceEnabled && !isActivationScene) return;

    const target = direction === "left" ? scene.left : scene.right;
    const label = direction === "left"
      ? (normalizeLabel(scene.leftLabel) || scene.left || "left")
      : (normalizeLabel(scene.rightLabel) || scene.right || "right");
    if (!target) {
      log("choice-ignored", { reason: `no-${direction}-target` });
      return;
    }

    state.pendingChoice = direction;
    if (!isActivationScene) {
      setChoiceState(false);
    }
    trackChoiceTarget(target);
    log("choice-picked", { direction, label, from: state.currentId, to: target });

    // In regular scenes, a click only arms the branch. The actual transition
    // happens when the current fragment finishes.
    if (isActivationScene) {
      gotoScene(target, `choice-${direction}`);
      return;
    }

    // If the fragment has already finished by the time the choice is made,
    // transition immediately because there is nothing left to play.
    if (state.sceneEnded) {
      gotoScene(target, `choice-${direction}`);
    }
  }

  function randomChoiceDirection(scene) {
    const available = [];
    if (scene?.left) available.push("left");
    if (scene?.right) available.push("right");
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function activateLayer(layer, crossfadeMs) {
    const prev = activeLayer();

    prev.root.style.transitionDuration = `${crossfadeMs}ms`;
    layer.root.style.transitionDuration = `${crossfadeMs}ms`;

    layer.root.classList.add("is-active");
    prev.root.classList.remove("is-active");

    state.activeLayerKey = layer.key;

    window.setTimeout(() => {
      resetVideoElement(prev.video);
      setMissingMode(prev, false);
    }, Math.max(50, crossfadeMs + 20));
  }

  function handleSceneEnded(sceneId, reason) {
    if (state.currentId !== sceneId) return;

    const scene = effectiveSceneById(sceneId);
    if (!scene) return;
    state.sceneEnded = true;

    log("scene-ended", { scene: sceneId, reason });

    if (scene.left || scene.right) {
      if (state.pendingChoice) {
        const target = state.pendingChoice === "left" ? scene.left : scene.right;
        if (target) {
          gotoScene(target, `choice-${state.pendingChoice}`);
          return;
        }
      }

      const insertionSceneId = randomChoiceTimeoutInsertionId();
      if (insertionSceneId) {
        state.retryChoiceSceneId = sceneId;
        log("choice-timeout-retry", {
          from: sceneId,
          insertion: insertionSceneId,
          retryScene: sceneId
        });
        gotoScene(insertionSceneId, "choice-timeout-retry");
        return;
      }

      return;
    }

    if (scene.next) {
      gotoScene(scene.next, "auto-next");
      return;
    }

    log("story-idle", { scene: sceneId, reason: "terminal-scene" });
  }

  function revealChoicesForScene(sceneId, reason) {
    if (state.currentId !== sceneId || state.sceneEnded) return;
    const scene = effectiveSceneById(sceneId);
    if (!scene || scene.uiMode === "activation") return;
    if (!scene.left && !scene.right) return;
    if (state.choiceEnabled) return;
    setChoiceState(true);
    log("choice-revealed", { scene: sceneId, reason });
  }

  function armEndedHandlers(layer, sceneId, isMissing) {
    clearTimers(layer);

    const finish = (reason) => handleSceneEnded(sceneId, reason);

    layer.video.onended = () => finish("ended");
    layer.video.onerror = () => {
      if (state.currentId !== sceneId) return;
      setMissingMode(layer, true, sceneId, {
        src: videoPathFor(sceneId),
        reason: "video element error"
      });
      finish("video-error");
    };

    if (isMissing) {
      layer.endTimerId = window.setTimeout(
        () => finish("missing-timeout"),
        Math.max(0, Number(settings().missingHoldMs) || 0)
      );
      return;
    }

    layer.video.ontimeupdate = () => {
      if (state.currentId !== sceneId || layer.revealHandled) return;
      const duration = Number(layer.video.duration);
      const currentTime = Number(layer.video.currentTime);
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) return;
      if (duration - currentTime <= 3) {
        layer.revealHandled = true;
        revealChoicesForScene(sceneId, "three-seconds-before-end");
      }
    };

    layer.guardId = window.setTimeout(() => {
      if (state.currentId !== sceneId) return;
      if (layer.video.readyState === 0 || layer.video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        setMissingMode(layer, true, sceneId, {
          src: videoPathFor(sceneId),
          reason: "watchdog: no media source"
        });
        finish("watchdog-no-source");
      }
    }, 1600);
  }

  async function startSceneOnLayer(layer, sceneId) {
    const scene = sceneById(sceneId);
    if (!scene) {
      throw new Error(`Unknown scene id: ${sceneId}`);
    }

    if (scene.uiMode === "activation") {
      clearTimers(layer);
      setMissingMode(layer, false, sceneId);
      resetVideoElement(layer.video);
      layer.sceneId = sceneId;
      return { missing: false, src: "" };
    }

    const src = videoPathFor(sceneId);

    setMissingMode(layer, false, sceneId);
    resetVideoElement(layer.video);
    layer.sceneId = sceneId;
    layer.video.src = src;
    layer.video.load();

    let missing = false;

    try {
      await layer.video.play();
    } catch (err) {
      missing = true;
      setMissingMode(layer, true, sceneId, {
        src,
        reason: String(err?.message || err || "play() failed")
      });
    }

    armEndedHandlers(layer, sceneId, missing);
    return { missing, src };
  }

  async function gotoScene(targetId, reason) {
    if (state.transitionLock) return;
    state.transitionLock = true;

    try {
      const resolvedTargetId = resolveFinalHubTarget(resolveSpecialTarget(targetId));
      if (resolvedTargetId !== targetId) {
        log("final-hub-reroute", { requested: targetId, resolved: resolvedTargetId, reason });
      }

      const target = sceneById(resolvedTargetId);
      if (!target) {
        log("transition-error", { reason: "unknown-target", to: resolvedTargetId });
        return;
      }

      const fromId = state.currentId;
      state.previousId = fromId;
      state.currentId = resolvedTargetId;
      state.sceneEnded = false;
      state.pendingChoice = null;
      const effectiveTarget = effectiveSceneById(resolvedTargetId);
      const instantChoice = effectiveTarget?.uiMode === "activation";
      state.sceneEnded = Boolean(instantChoice);
      setChoiceState(false);
      setActivationState(Boolean(instantChoice), effectiveTarget);
      syncBackgroundMusic(effectiveTarget);
      syncSceneAudio(resolvedTargetId, effectiveTarget);

      const shouldRevealChoicesImmediately = !instantChoice && (effectiveTarget?.left || effectiveTarget?.right);
      if (shouldRevealChoicesImmediately) {
        setChoiceState(true);
        log("choice-revealed", { scene: resolvedTargetId, reason: "scene-start" });
      }

      const nextLayer = inactiveLayer();
      const { missing } = await startSceneOnLayer(nextLayer, resolvedTargetId);
      if (shouldRevealChoicesImmediately) {
        nextLayer.revealHandled = true;
      }

      const crossfadeMs = Math.max(0, Number(settings().crossfadeMs) || 0);
      activateLayer(nextLayer, crossfadeMs);

      log("transition", {
        from: fromId,
        to: resolvedTargetId,
        reason,
        missing
      });
    } finally {
      window.setTimeout(() => {
        state.transitionLock = false;
      }, Math.max(20, Number(settings().crossfadeMs) || 0));
    }
  }

  async function bootstrap() {
    const story = await loadStoryMap("./story.json");
    validateStory(story);
    state.story = story;
    ensureActivationBackdropSource();
    showDebug(false);
    closeCreatorGate();

    leftBtn.addEventListener("click", () => chooseTarget("left"));
    rightBtn.addEventListener("click", () => chooseTarget("right"));
    activationBtn.addEventListener("click", () => {
      primeBackgroundMusicFromGesture(sceneById(state.currentId)?.left);
      chooseTarget("left");
    });

    document.addEventListener(
      "click",
      (evt) => {
        if (!state.choiceEnabled) return;
        if (evt.target.closest("#rightBtn")) return;
        chooseTarget("left");
      },
      true
    );

    document.addEventListener(
      "contextmenu",
      (evt) => {
        if (!state.choiceEnabled) return;
        evt.preventDefault();
        chooseTarget("right");
      },
      true
    );

    creatorSubmitBtn.addEventListener("click", submitCreatorPassword);
    creatorCancelBtn.addEventListener("click", closeCreatorGate);
    creatorPasswordInput.addEventListener("keydown", (evt) => {
      if (evt.code === "Enter" || evt.code === "NumpadEnter") {
        evt.preventDefault();
        submitCreatorPassword();
      }
      if (evt.code === "Escape") {
        evt.preventDefault();
        closeCreatorGate();
      }
    });

    const handleCreatorShortcut = (evt) => {
      if (!isCreatorShortcut(evt) || evt.repeat) return;
      evt.preventDefault();
      evt.stopPropagation();
      openCreatorGate();
    };

    window.addEventListener("keydown", handleCreatorShortcut, true);
    document.addEventListener("keydown", handleCreatorShortcut, true);
    window.addEventListener("tragedy:open-creator-gate", () => {
      openCreatorGate();
    });

    await gotoScene(settings().start, "bootstrap");
  }

  function validateStory(story) {
    if (!story || typeof story !== "object") {
      throw new Error("story.json is empty or invalid.");
    }
    if (!story.scenes || typeof story.scenes !== "object") {
      throw new Error("story.json: scenes object is missing.");
    }
    if (!story.settings || typeof story.settings !== "object") {
      throw new Error("story.json: settings object is missing.");
    }
    if (!story.settings.start || !story.scenes[story.settings.start]) {
      throw new Error("story.json: settings.start must reference existing scene id.");
    }
  }

  function openCreatorGate() {
    creatorGate.hidden = false;
    creatorGateError.hidden = true;
    creatorPasswordInput.value = "";
    window.setTimeout(() => creatorPasswordInput.focus(), 0);
  }

  function closeCreatorGate() {
    creatorGate.hidden = true;
    creatorGateError.hidden = true;
    creatorPasswordInput.value = "";
  }

  function isCreatorShortcut(evt) {
    const shortcutPressed = evt.metaKey || evt.ctrlKey;
    if (!CREATOR_SHORTCUT_ENABLED || !shortcutPressed || !evt.shiftKey) return false;
    return evt.code === "KeyZ" || evt.key === "Z" || evt.key === "z" || evt.key === "Я" || evt.key === "я";
  }

  function submitCreatorPassword() {
    if (creatorPasswordInput.value === CREATOR_PASSWORD) {
      window.location.href = "./editor.html";
      return;
    }
    creatorGateError.hidden = false;
    creatorPasswordInput.select();
    log("creator-mode-denied", { reason: "bad-password" });
  }

  async function loadStoryMap(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (fetchErr) {
      log("story-fetch-failed", { reason: String(fetchErr.message || fetchErr) });
      return await loadStoryMapViaIframe(url);
    }
  }

  function loadStoryMapViaIframe(url) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.style.position = "absolute";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.opacity = "0";
      frame.style.pointerEvents = "none";
      frame.src = `${url}?_=${Date.now()}`;

      const cleanup = () => {
        frame.remove();
      };

      frame.onload = () => {
        try {
          const raw = frame.contentDocument?.body?.innerText?.trim();
          if (!raw) throw new Error("iframe returned empty story content");
          const parsed = JSON.parse(raw);
          cleanup();
          resolve(parsed);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      frame.onerror = () => {
        cleanup();
        reject(new Error("iframe story load failed"));
      };

      document.body.appendChild(frame);
    });
  }

  bootstrap().catch((err) => {
    console.error("[TragedyInMinimalism] bootstrap failed", err);
    choicePanel.classList.remove("is-active");
    debugOverlay.hidden = false;
    debugOverlay.textContent = `Bootstrap failed:\n${String(err.message || err)}`;
  });
})();
