// Sample data for the first version of Nook.
// Later this is replaced by a real database (Supabase) and real catalog search.

export type Medium = "Film" | "TV" | "Game" | "Anime" | "Book" | "Manga" | "Comic";

export type Title = {
  name: string;
  medium: Medium;
  year: number;
  by: string;
  color: string; // stands in for the poster until real images are connected
  progress: string;
};

export type LogPost = {
  id: number;
  type: "log";
  user: string;
  title: string;
  rating: number;
  text: string;
  letterboxd?: string;
  spoiler?: boolean;
  time: string;
  likes: number;
};

export type PhotoPost = {
  id: number;
  type: "photo";
  user: string;
  title: string;
  shots: string[]; // scene class names (s0–s5) or uploaded image URLs
  filter: FilterName;
  caption: string;
  time: string;
  likes: number;
};

export type Post = LogPost | PhotoPost;

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

export const AVATAR_COLORS: Record<string, string> = {
  mira: "#5B4A6E",
  jun: "#3F5A3A",
  sol: "#6E4A4A",
  ade: "#4A5A6E",
  kai: "#6E5A3A",
  rue: "#5A3A5A",
};

export const FILTERS = {
  Raw: "none",
  Dusk: "sepia(.4) saturate(1.4) hue-rotate(-12deg) brightness(.95)",
  Grain: "contrast(1.25) saturate(.8) brightness(.95)",
  Fade: "contrast(.78) brightness(1.12) saturate(.7)",
  Mono: "grayscale(1) contrast(1.1)",
} as const;
export type FilterName = keyof typeof FILTERS;

export const CURRENT_USER = "mira";

export const SAMPLE_POSTS: Post[] = [
  { id: 1, type: "log", user: "mira", title: "Perfect Days", rating: 4.5, text: "Made me want to clean my bathroom and listen to cassettes. Quietly perfect.", letterboxd: "https://letterboxd.com", time: "2h", likes: 12 },
  { id: 2, type: "photo", user: "jun", title: "Elden Ring", shots: ["s0", "s1", "s2"], filter: "Dusk", caption: "Golden hour in Limgrave", time: "5h", likes: 31 },
  { id: 3, type: "log", user: "sol", title: "Frieren", rating: 5, text: "A show about noticing things too late. Cried at a flower field. Twice.", time: "8h", likes: 20 },
  { id: 4, type: "log", user: "ade", title: "Piranesi", rating: 4, text: "Read it in two sittings. The house is the best character.", time: "1d", likes: 7 },
  { id: 5, type: "photo", user: "kai", title: "Chainsaw Man", shots: ["s4", "s5", "s3"], filter: "Mono", caption: "Volume 11 haul", time: "1d", likes: 18 },
  { id: 6, type: "log", user: "rue", title: "The Bear", rating: 3.5, text: "Season three slowed down. Still the most stressful show I love.", time: "2d", likes: 5 },
  { id: 7, type: "log", user: "jun", title: "Dune: Part Two", rating: 3.5, text: "Stunning to look at. Read the book first and still want more of the quiet parts.", time: "3d", likes: 9 },
  { id: 8, type: "log", user: "mira", title: "Dune: Part Two", rating: 5, text: "The sound in the sandworm scene made the seats shake. See it as big as you can.", time: "4d", likes: 22 },
  { id: 9, type: "log", user: "rue", title: "Saga", rating: 4.5, text: "Picked it back up after the hiatus. Still hurts in the best way.", time: "5d", likes: 4 },
];

export const stars = (r: number) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");
