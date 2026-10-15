// Server-side catalog search. Each medium uses a free public database:
//   Films  → TMDB (if TMDB_API_KEY is set) or Apple's iTunes catalog
//   TV     → TVmaze
//   Games  → RAWG (if RAWG_API_KEY is set) or the Steam store
//   Anime, Manga → AniList
//   Books  → Open Library
//   Comics → Comic Vine (if COMICVINE_API_KEY is set) or Open Library
// Results come back in one shared shape so the rest of the app doesn't care where they came from.

import type { Medium, TitleRef } from "./data";

const TMDB = process.env.TMDB_API_KEY;
const RAWG = process.env.RAWG_API_KEY;
const COMICVINE = process.env.COMICVINE_API_KEY;

const HOUR = 3600;
type Json = Record<string, unknown> & any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function getJson(url: string, init?: RequestInit): Promise<Json | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": "Nook (media diary)", Accept: "application/json", ...(init?.headers ?? {}) },
      next: { revalidate: HOUR },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const year = (s?: string | null) => {
  const m = s?.match(/\d{4}/);
  return m ? Number(m[0]) : undefined;
};

/* ---------- AniList (anime + manga) ---------- */
const ANILIST_FIELDS = `id format title { romaji english } startDate { year } coverImage { large }
  studios(isMain: true) { nodes { name } } staff(perPage: 1, sort: RELEVANCE) { nodes { name { full } } }`;

function anilistToRef(m: Json, medium: Medium): TitleRef {
  return {
    key: `anilist-${m.id}`,
    name: m.title?.english || m.title?.romaji,
    medium,
    year: m.startDate?.year ?? undefined,
    creator: medium === "Anime" ? m.studios?.nodes?.[0]?.name : m.staff?.nodes?.[0]?.name?.full,
    poster: m.coverImage?.large ?? undefined,
  };
}

async function anilist(query: string, variables: Record<string, unknown>) {
  return getJson("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
}

async function searchAnilist(q: string, medium: "Anime" | "Manga") {
  const data = await anilist(
    `query ($q: String, $type: MediaType) { Page(perPage: 12) { media(search: $q, type: $type, isAdult: false, sort: SEARCH_MATCH) { ${ANILIST_FIELDS} } } }`,
    { q, type: medium === "Anime" ? "ANIME" : "MANGA" }
  );
  return ((data?.data?.Page?.media ?? []) as Json[]).map((m) => anilistToRef(m, medium));
}

/* ---------- TVmaze (TV) ---------- */
function tvmazeToRef(s: Json): TitleRef {
  return {
    key: `tvmaze-${s.id}`,
    name: s.name,
    medium: "TV",
    year: year(s.premiered),
    creator: s.network?.name ?? s.webChannel?.name,
    poster: s.image?.medium ?? undefined,
  };
}
async function searchTV(q: string) {
  const data = await getJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
  return ((data ?? []) as Json[]).slice(0, 12).map((r) => tvmazeToRef(r.show));
}

/* ---------- Films ---------- */
const tmdbPoster = (p?: string | null) => (p ? `https://image.tmdb.org/t/p/w342${p}` : undefined);
function itunesToRef(r: Json): TitleRef {
  return {
    key: `itunes-${r.trackId}`,
    name: r.trackName,
    medium: "Film",
    year: year(r.releaseDate),
    creator: r.artistName,
    poster: r.artworkUrl100?.replace("100x100", "400x600") ?? undefined,
  };
}
async function searchFilms(q: string) {
  if (TMDB) {
    const data = await getJson(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB}&query=${encodeURIComponent(q)}&include_adult=false`);
    return ((data?.results ?? []) as Json[]).slice(0, 12).map(
      (m): TitleRef => ({ key: `tmdb-${m.id}`, name: m.title, medium: "Film", year: year(m.release_date), poster: tmdbPoster(m.poster_path) })
    );
  }
  const data = await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=12`);
  return ((data?.results ?? []) as Json[]).map(itunesToRef);
}

/* ---------- Games ---------- */
const steamPoster = (id: number | string) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_600x900.jpg`;
async function searchGames(q: string) {
  if (RAWG) {
    const data = await getJson(`https://api.rawg.io/api/games?key=${RAWG}&search=${encodeURIComponent(q)}&page_size=12`);
    return ((data?.results ?? []) as Json[]).map(
      (g): TitleRef => ({ key: `rawg-${g.id}`, name: g.name, medium: "Game", year: year(g.released), poster: g.background_image ?? undefined })
    );
  }
  const data = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&cc=us&l=english`);
  return ((data?.items ?? []) as Json[])
    .filter((i) => i.type === "app")
    .slice(0, 12)
    .map((g): TitleRef => ({ key: `steam-${g.id}`, name: g.name, medium: "Game", poster: steamPoster(g.id) }));
}

/* ---------- Books (and comics fallback) ---------- */
const olCover = (id?: number) => (id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : undefined);
function olToRef(d: Json, medium: Medium): TitleRef {
  return {
    key: `openlibrary-${String(d.key).replace("/works/", "")}`,
    name: d.title,
    medium,
    year: d.first_publish_year ?? undefined,
    creator: d.author_name?.[0],
    poster: olCover(d.cover_i),
  };
}
async function searchBooks(q: string, medium: Medium = "Book") {
  const data = await getJson(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i`
  );
  return ((data?.docs ?? []) as Json[]).map((d) => olToRef(d, medium));
}

/* ---------- Comics ---------- */
function comicvineToRef(v: Json): TitleRef {
  return {
    key: `comicvine-${v.id}`,
    name: v.name,
    medium: "Comic",
    year: v.start_year ? Number(v.start_year) : undefined,
    creator: v.publisher?.name,
    poster: v.image?.medium_url ?? v.image?.original_url ?? undefined,
  };
}
async function searchComics(q: string) {
  if (COMICVINE) {
    const data = await getJson(
      `https://comicvine.gamespot.com/api/search/?api_key=${COMICVINE}&format=json&resources=volume&limit=12&query=${encodeURIComponent(q)}`
    );
    return ((data?.results ?? []) as Json[]).map(comicvineToRef);
  }
  return searchBooks(`${q} comic`, "Comic");
}

export async function searchCatalog(q: string, medium: Medium): Promise<TitleRef[]> {
  const results = await (async () => {
    switch (medium) {
      case "Film":
        return searchFilms(q);
      case "TV":
        return searchTV(q);
      case "Game":
        return searchGames(q);
      case "Anime":
      case "Manga":
        return searchAnilist(q, medium);
      case "Book":
        return searchBooks(q);
      case "Comic":
        return searchComics(q);
    }
  })();
  return results.filter((r) => r.name);
}

/* ---------- Looking up one title by its key ---------- */
export async function getTitle(key: string): Promise<TitleRef | null> {
  const dash = key.indexOf("-");
  const source = key.slice(0, dash);
  const id = key.slice(dash + 1);
  if (!id) return null;

  switch (source) {
    case "anilist": {
      const data = await anilist(`query ($id: Int) { Media(id: $id) { type ${ANILIST_FIELDS} } }`, { id: Number(id) });
      const m = data?.data?.Media;
      return m ? anilistToRef(m, m.type === "ANIME" ? "Anime" : "Manga") : null;
    }
    case "tvmaze": {
      const s = await getJson(`https://api.tvmaze.com/shows/${encodeURIComponent(id)}`);
      return s ? tvmazeToRef(s) : null;
    }
    case "tmdb": {
      if (!TMDB) return null;
      const m = await getJson(`https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?api_key=${TMDB}&append_to_response=credits`);
      if (!m) return null;
      const director = (m.credits?.crew as Json[] | undefined)?.find((c) => c.job === "Director")?.name;
      return { key, name: m.title, medium: "Film", year: year(m.release_date), creator: director, poster: tmdbPoster(m.poster_path) };
    }
    case "itunes": {
      const data = await getJson(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`);
      const r = data?.results?.[0];
      return r ? itunesToRef(r) : null;
    }
    case "steam": {
      const data = await getJson(`https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(id)}&l=english`);
      const g = data?.[id]?.data;
      return g ? { key, name: g.name, medium: "Game", year: year(g.release_date?.date), creator: g.developers?.[0], poster: steamPoster(id) } : null;
    }
    case "rawg": {
      if (!RAWG) return null;
      const g = await getJson(`https://api.rawg.io/api/games/${encodeURIComponent(id)}?key=${RAWG}`);
      return g ? { key, name: g.name, medium: "Game", year: year(g.released), creator: g.developers?.[0]?.name, poster: g.background_image ?? undefined } : null;
    }
    case "openlibrary": {
      const data = await getJson(
        `https://openlibrary.org/search.json?q=key:/works/${encodeURIComponent(id)}&limit=1&fields=key,title,author_name,first_publish_year,cover_i,subject`
      );
      const d = data?.docs?.[0];
      if (!d) return null;
      const comic = (d.subject as string[] | undefined)?.some((s) => /comic|graphic novel/i.test(s));
      return olToRef(d, comic ? "Comic" : "Book");
    }
    case "comicvine": {
      if (!COMICVINE) return null;
      const data = await getJson(`https://comicvine.gamespot.com/api/volume/4050-${encodeURIComponent(id)}/?api_key=${COMICVINE}&format=json`);
      return data?.results ? comicvineToRef(data.results) : null;
    }
    default:
      return null; // manual entries live only in Nook's own posts
  }
}
