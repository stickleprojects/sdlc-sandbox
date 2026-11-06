import type { Video } from "./catalogue.ts";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

export const formatDuration = (total: number): string => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

const layout = (title: string, body: string): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0 auto;max-width:1100px;padding:16px}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
@media (max-width:480px){.grid{grid-template-columns:1fr}}
.card{display:block;color:inherit;text-decoration:none;border:1px solid #ccc;border-radius:8px;overflow:hidden}
img{max-width:100%;display:block}
</style></head><body>${body}</body></html>`;

const details = (v: Video): string =>
  `<img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}">
<h2>${escapeHtml(v.title)}</h2><p class="duration">${formatDuration(v.durationSeconds)}</p>
<p>${escapeHtml(v.description)}</p>`;

export const renderHome = (videos: Video[]): string =>
  layout(
    "StreamLite",
    `<h1>StreamLite</h1><div class="grid">${videos
      .map((v) => `<a class="card" href="/videos/${escapeHtml(v.id)}">${details(v)}</a>`)
      .join("")}</div>`,
  );

export const renderDetail = (v: Video): string =>
  layout(v.title, `${details(v)}<p>Playback is coming soon.</p><p><a href="/">Back to the catalogue</a></p>`);
