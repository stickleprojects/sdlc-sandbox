// Seed catalogue shared by both spikes, so the comparison measures only the HTTP layer.
export type Video = {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  thumbnail: string;
};

export const SEED_VIDEOS: readonly Video[] = Object.freeze(
  [
    ["tidal-pools", "Tidal Pools at Dawn", "Rock pools filling as the tide turns.", 412],
    ["bread-basics", "Bread & <Butter> Basics", "A first loaf, step by step.", 1385],
    ["night-trains", "night trains across the plain", "Long exposures from a moving carriage.", 3721],
    ["moss-gardens", "Moss Gardens", "A slow look at a shaded garden.", 245],
    ["kite-making", "Kite Making for Beginners", "Paper, sticks and string.", 918],
    ["city-rooftops", "City Rooftops", "Time-lapse of a skyline from dusk to dawn.", 156],
  ].map(([id, title, description, durationSeconds]) => ({
    id: id as string,
    title: title as string,
    description: description as string,
    durationSeconds: durationSeconds as number,
    thumbnail: `/thumbnails/${id}.svg`,
  })),
);

const byId = new Map(SEED_VIDEOS.map((v) => [v.id, v]));
export const listVideos = (): Video[] =>
  [...SEED_VIDEOS].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
export const findVideo = (id: string): Video | undefined => byId.get(id);
