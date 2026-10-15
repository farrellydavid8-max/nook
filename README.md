# Nook

Log, review and share everything you watch, play and read: films, TV, games, anime, books, manga and comics.

## What's here

- `app/page.tsx` — the feed
- `app/title/[slug]/page.tsx` — a title's page (reviews, photos, lists)
- `app/log/page.tsx` — logging and reviewing, with an optional Letterboxd link
- `app/post/page.tsx` — photo posts with filters
- `app/profile/page.tsx` — the customizable profile
- `lib/data.ts` — sample titles and posts
- `lib/store.tsx` — shared app state (in memory for now)
- `app/globals.css` — the whole look

Right now everything uses sample data and resets on reload. Next steps: accounts, a database and photo storage with Supabase, then real title search.

## Run it on your computer

Install [Node.js](https://nodejs.org) (the LTS version), then in this folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000.
