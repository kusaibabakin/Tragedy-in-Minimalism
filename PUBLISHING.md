# Publishing Tragedy in Minimalism

## Local workflow

1. Edit the project locally in the project root.
2. If needed, use the local editor or desktop app to update `story.json`.
3. Set the public video base URL in `site.config.json`.
4. Export the public player site:

```bash
node ./tools/export-site.js
```

5. Preview the exported site locally:

```bash
cd site
python3 -m http.server 8080
```

6. Push the repository to GitHub.

## What gets published

The export script builds a public `site/` folder that contains only the player:

- `index.html`
- `app.js`
- `style.css`
- `story.json`
- `audio/`
- `fonts/`

The editor, desktop app, and local `videos/` folder are not included in the published site.
Published video files should be served from the external base URL configured in `site.config.json`.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`.

After pushing to `main`:

1. Open the repository on GitHub.
2. Go to `Settings -> Pages`.
3. Set the source to `GitHub Actions`.

Each push to `main` will:

1. Run `node ./tools/export-site.js`
2. Upload `site/`
3. Publish the player site to GitHub Pages

## Notes

- The public site is player-only.
- The browser editor is for local use only.
- Local desktop playback still uses `videos/` by default.
- The exported site uses `settings.videoBaseUrl` injected into `site/story.json`.
- If you update videos, audio, fonts, `story.json`, or `site.config.json`, rerun the export before pushing.
