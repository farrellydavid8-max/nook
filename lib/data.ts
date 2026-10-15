// Shared types, the starter title catalog and small helpers.
// The catalog is a short built-in list for now; real search (TMDB, IGDB, AniList…) replaces it later.

export type Medium = "Film" | "TV" | "Game" | "Anime" | "Book" | "Manga" | "Comic";

export type Title = {
  name: string;
  medium: Medium;
  year: number;
  by: string;
  color: string; // stands in for the poster until real images are connected
  progress: string;
};

export const FILTERS = {
  Raw: "none",
  Dusk: "sepia(.4) saturate(1.4) hue-rotate(-12deg) brightness(.95)",
  Grain: "contrast(1.25) saturate(.8) brightness(.95)",
  Fade: "contrast(.78) brightness(1.12) saturate(.7)",
  Mono: "grayscale(1) contrast(1.1)",
} as const;
export type FilterName = keyof typeof FILTERS;

type PostBase = {
  id: number;
  userId: string;
  user: string;
  avatarColor: string;
  title: string;
  time: string;
  likes: number;
  liked: boolean;
};

export type LogPost = PostBase & {
  type: "log";
  rating: number;
  text: string;
  letterboxd?: string;
  spoiler?: boolean;
  status?: string;
  progress?: string;
};

export type PhotoPost = PostBase & {
  type: "photo";
  shots: string[]; // public image URLs
  filter: FilterName;
  strength: number;
  caption: string;
};

export type Post = LogPost | PhotoPost;

export type Profile = {
  id: string;
  username: string;
  bio: string;
  avatar_color: string;
  accent: string;
  banner: string;
  layout: "favorites" | "photos";
  show_stats: boolean;
  letterboxd_url: string | null;
};

export const MEDIA: Record<Medium, string> = {
  Film: "Films",
  TV: "TV",
  Game: "Games",
  Anime: "Anime",
  Book: "Books",
  Manga: "Manga",
  Comic: "Comics",
};

export const PROGRESS_LABEL: Record<Medium, string> = {
  Film: "Watched",
  TV: "Episode",
  Game: "Hours played",
  Anime: "Episode",
  Book: "Pages",
  Manga: "Chapter",
  Comic: "Issue",
};

export const TITLES: Title[] = [
  { name: "Perfect Days", medium: "Film", year: 2023, by: "Wim Wenders", color: "#2E4A52", progress: "Watched once" },
  { name: "Dune: Part Two", medium: "Film", year: 2024, by: "Denis Villeneuve", color: "#6B5233", progress: "Watched once" },
  { name: "Elden Ring", medium: "Game", year: 2022, by: "FromSoftware", color: "#4A3F2A", progress: "120 hours" },
  { name: "Frieren", medium: "Anime", year: 2023, by: "Madhouse", color: "#3D4A5E", progress: "Ep 28 / 28" },
  { name: "Piranesi", medium: "Book", year: 2020, by: "Susanna Clarke", color: "#4F5B3E", progress: "272 / 272" },
  { name: "Chainsaw Man", medium: "Manga", year: 2018, by: "Tatsuki Fujimoto", color: "#6E3A35", progress: "Ch. 97" },
  { name: "Saga", medium: "Comic", year: 2012, by: "Vaughan & Staples", color: "#4A3550", progress: "Issue 54" },
  { name: "The Bear", medium: "TV", year: 2022, by: "FX", color: "#3E4A4A", progress: "S3 E10" },
];

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const findTitle = (name: string) => TITLES.find((t) => t.name === name) ?? TITLES[0];
export const titleBySlug = (slug: string) => TITLES.find((t) => slugify(t.name) === slug);

export const stars = (r: number) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Accepts full Letterboxd links and their short boxd.it links
export const LETTERBOXD = /^(https?:\/\/)?(www\.)?(letterboxd\.com|boxd\.it)\//i;
export const normalizeUrl = (u: string) => (u.startsWith("http") ? u : `https://${u}`);
