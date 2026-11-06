// Writes the fixtures both spikes serve: thumbnails, a fake MP4 and a fake HLS rendition.
import { mkdirSync, writeFileSync } from "node:fs";
import { SEED_VIDEOS } from "./catalogue.ts";

const pub = new URL("./public/", import.meta.url);
for (const d of ["thumbnails", "media", "hls"]) mkdirSync(new URL(d, pub), { recursive: true });
SEED_VIDEOS.forEach((v, i) => {
  const hue = (i * 60) % 360;
  writeFileSync(
    new URL(`thumbnails/${v.id}.svg`, pub),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="hsl(${hue} 60% 45%)"/></svg>\n`,
  );
});
// Deterministic bytes: byte n is n % 251, so range tests can check content.
const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => i % 251);
writeFileSync(new URL("media/sample.mp4", pub), bytes(65536));
writeFileSync(new URL("hls/seg0.ts", pub), bytes(1880));
writeFileSync(new URL("hls/seg1.ts", pub), bytes(1880));
writeFileSync(
  new URL("hls/index.m3u8", pub),
  "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXTINF:4.0,\nseg0.ts\n#EXTINF:4.0,\nseg1.ts\n#EXT-X-ENDLIST\n",
);
