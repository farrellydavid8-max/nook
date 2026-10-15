// Shared types and small helpers.

export type Medium = "Film" | "TV" | "Game" | "Anime" | "Book" | "Manga" | "Comic";

// A title from any catalog (or added by hand). `key` is "<source>-<id>", e.g. "tvmaze-169".
export type TitleRef = {
  key: string;
  name: string;
  medium: Medium;
  year?: number;
  creator?: string;
  poster?: string;
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
  avatarUrl?: string;
  title: TitleRef;
  time: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  comments: number;
};

export type LogPost = PostBase & {
  type: "log";
  rating: number;
  text: string;
  letterboxd?: string;
  spoiler?: boolean;
  status?: string;
  progress?: string;
  loggedOn?: string;
  rewatch?: boolean;
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
  theme_bg: string | null;
  banner: string;
  avatar_url: string | null;
  banner_url: string | null;
  layout: "favorites" | "photos";
  show_stats: boolean;
  letterboxd_url: string | null;
  favorites: TitleRef[] | null;
};

export type CommentItem = {
  id: number;
  postId: number;
  userId: string;
  user: string;
  avatarColor: string;
  avatarUrl?: string;
  body: string;
  time: string;
};

export type NotificationItem = {
  id: number;
  type: "follow" | "like" | "comment";
  actor: string;
  actorColor: string;
  actorAvatar?: string;
  postId: number | null;
  postTitle?: string;
  read: boolean;
  time: string;
};

export type ListItem = {
  id: number;
  userId: string;
  owner: string;
  name: string;
  description: string;
  items: TitleRef[];
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
export const MEDIUMS = Object.keys(MEDIA) as Medium[];

export const PROGRESS: Record<Medium, { label: string; hint: string }> = {
  Film: { label: "Watched", hint: "e.g. First watch" },
  TV: { label: "Episode", hint: "e.g. S2 E5" },
  Game: { label: "Hours played", hint: "e.g. 40 hours" },
  Anime: { label: "Episode", hint: "e.g. Ep 12 / 24" },
  Book: { label: "Pages", hint: "e.g. 180 / 320" },
  Manga: { label: "Chapter", hint: "e.g. Ch. 45" },
  Comic: { label: "Issue", hint: "e.g. Issue 12" },
};

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

// Titles added by hand get a key from their name, so everyone who adds "My Zine" lands on the same page.
export const manualKey = (name: string, medium: Medium) => `manual-${medium.toLowerCase()}.${slugify(name)}`;

export const titleHref = (t: TitleRef) => `/title/${encodeURIComponent(t.key)}`;

// A steady color per title, used when there's no poster image
const SWATCHES = ["#2E4A52", "#6B5233", "#4A3F2A", "#3D4A5E", "#4F5B3E", "#6E3A35", "#4A3550", "#3E4A4A"];
export function colorFor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SWATCHES[h % SWATCHES.length];
}

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

export const describe = (t: TitleRef) => [t.medium, t.year, t.creator].filter(Boolean).join(" · ");

export const REWATCH_LABEL: Record<Medium, string> = {
  Film: "Rewatch",
  TV: "Rewatch",
  Anime: "Rewatch",
  Game: "Replay",
  Book: "Reread",
  Manga: "Reread",
  Comic: "Reread",
};

export const profileHref = (username: string) => `/u/${encodeURIComponent(username)}`;
export const USERNAME = /^[a-z0-9_]{3,20}$/;

export type LibraryGame = {
  title: TitleRef;
  minutes: number;
  lastPlayed?: string;
  achievementsDone?: number;
  achievementsTotal?: number;
};

export const hours = (minutes: number) => {
  const h = minutes / 60;
  return h < 1 ? `${minutes} min` : `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h).toLocaleString()} h`;
};

export const recentlyPlayed = (g: LibraryGame, days = 14) => Boolean(g.lastPlayed && Date.now() - new Date(g.lastPlayed).getTime() < days * 86400000);
