const path = require('path');

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
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function sceneType(scene) {
  if (!scene) return 'scene';
  if (scene.uiMode === 'activation') return 'activation';
  if (scene.left || scene.right) return 'choice';
  if (scene.next) return 'linear';
  return 'ending';
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

    const variants = scene.variants && typeof scene.variants === 'object' ? Object.values(scene.variants) : [];
    for (const variant of variants) {
      if (!variant || typeof variant !== 'object') continue;
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
      title: scene.title || ''
    }));
}

function collectBranchSummary(story) {
  const scenes = story?.scenes || {};
  return collectReachableSceneIds(story).map((sceneId) => {
    const scene = scenes[sceneId];
    const parts = [];
    if (scene.left) {
      parts.push(formatChoice(scene.leftLabel, scene.left));
    }
    if (scene.right) {
      parts.push(formatChoice(scene.rightLabel, scene.right));
    }
    if (scene.next) {
      parts.push(`AUTO -> ${scene.next}`);
    }
    return {
      sceneId,
      title: scene?.title || '',
      parts
    };
  }).filter((entry) => entry.parts.length);
}

function buildScenarioOutline(story) {
  const title = story?.settings?.title || 'Untitled Project';
  const start = story?.settings?.start || '-';
  const music = story?.settings?.music || {};
  const sceneIds = collectReachableSceneIds(story);
  const endings = collectEndingScenes(story);
  const branches = collectBranchSummary(story);

  const lines = [
    `# ${title} — Scenario Outline`,
    '',
    '## Project',
    `- Start scene: ${start}`,
    `- Total scenes: ${Object.keys(story?.scenes || {}).length}`,
    `- Crossfade: ${Number(story?.settings?.crossfadeMs || 0)} ms`,
    ''
  ];

  if (music.file) {
    lines.push('## Music');
    lines.push(`- File: ${music.file}`);
    lines.push(`- Start scene: ${music.startSceneId || '-'}`);
    lines.push(`- Start at: ${Number(music.startAtSec || 0)} sec`);
    lines.push(`- Fade in: ${Number(music.fadeInSec || 0)} sec`);
    lines.push(`- Fade out start: ${Number(music.fadeOutStartSec || 0)} sec`);
    lines.push(`- Fade out duration: ${Number(music.fadeOutDurationSec || 0)} sec`);
    lines.push(`- Volume: ${Math.round(Number(music.volume || 0) * 100)}%`);
    lines.push('');
  }

  lines.push('## Scene Breakdown');
  lines.push('');

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
    if (notes.length) {
      lines.push(`- Notes: ${notes.join(' | ')}`);
    }

    if (scene.variants && typeof scene.variants === 'object') {
      for (const [variantId, variant] of Object.entries(scene.variants)) {
        const variantParts = [];
        if (variant.left) {
          variantParts.push(`left: ${formatChoice(variant.leftLabel, variant.left)}`);
        }
        if (variant.right) {
          variantParts.push(`right: ${formatChoice(variant.rightLabel, variant.right)}`);
        }
        if (variant.next) {
          variantParts.push(`next: ${variant.next}`);
        }
        if (variantParts.length) {
          lines.push(`- Variant ${variantId}: ${variantParts.join(' | ')}`);
        }
      }
    }

    lines.push('');
  }

  lines.push('## Branch Summary');
  lines.push('');

  if (!branches.length) {
    lines.push('- No branches found.');
  } else {
    for (const branch of branches) {
      const label = branch.title ? `${branch.sceneId} (${branch.title})` : branch.sceneId;
      lines.push(`- ${label}: ${branch.parts.join(' | ')}`);
    }
  }

  lines.push('');
  lines.push('## Endings');
  lines.push('');

  if (!endings.length) {
    lines.push('- No terminal scenes found.');
  } else {
    for (const ending of endings) {
      lines.push(`- ${sceneTitle(ending.sceneId, { title: ending.title })}`);
    }
  }

  lines.push('');
  lines.push('## Writing Notes');
  lines.push('');
  lines.push('- Use each scene block as a prose beat.');
  lines.push('- Expand scene notes into action, image, and dialogue.');
  lines.push('- Use the branch summary to separate alternative scene versions.');
  lines.push('- Use the endings list as targets for full linear screenplay drafts.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function outlineFilename() {
  return 'scenario-outline.md';
}

function outlinePathForStory(storyPath) {
  return path.join(path.dirname(storyPath), outlineFilename());
}

module.exports = {
  buildScenarioOutline,
  outlineFilename,
  outlinePathForStory
};
