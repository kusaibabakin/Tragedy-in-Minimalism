# Cloudflare Pages + R2 Setup

## Goal

- Public website: Cloudflare Pages
- Public videos: Cloudflare R2
- Local editor and desktop app stay unchanged

## 1. Create an R2 bucket

1. Open Cloudflare dashboard.
2. Go to `R2`.
3. Create a bucket.
4. Use a simple bucket name, for example:
   `tragedy-in-minimalism-videos`

## 2. Make video files public

1. Open the bucket.
2. Enable public access for the bucket.
3. Upload all files from local `videos/`.

The final public base URL should look like:

```text
https://pub-xxxxxxxx.r2.dev
```

If you want a folder-style URL, use:

```text
https://pub-xxxxxxxx.r2.dev/videos
```

## 3. Set the site video base URL

Open `site.config.json` and set:

```json
{
  "videoBaseUrl": "https://pub-xxxxxxxx.r2.dev/videos"
}
```

The export script will inject this into `site/story.json`.

## 4. Export the public site

```bash
cd /Users/deercries/Desktop/Tragedy-in-Minimalism
node ./tools/export-site.js
```

## 5. Check the exported player locally

```bash
cd /Users/deercries/Desktop/Tragedy-in-Minimalism/site
python3 -m http.server 8080
```

Open:

- `http://localhost:8080/`

Then verify that the browser loads videos from the R2 URL.

## 6. Publish with Cloudflare Pages

1. Push the repository to GitHub.
2. In Cloudflare dashboard, go to `Workers & Pages`.
3. Create a new Pages project.
4. Connect the GitHub repository.
5. Set:
   - Production branch: `main`
   - Build command: `node ./tools/export-site.js`
   - Build output directory: `site`

## 7. Update flow

Whenever you change scenes or videos:

1. Update local project files.
2. Upload changed videos to R2.
3. Update `site.config.json` if the R2 base URL changed.
4. Run:

```bash
node ./tools/export-site.js
git add .
git commit -m "Update public player"
git push
```

## Notes

- Local root player and desktop app still use local `videos/` when `story.json` has no `videoBaseUrl`.
- Public `site/` uses the injected external `videoBaseUrl`.
- Do not put the large `videos/` folder into the public Pages build.
