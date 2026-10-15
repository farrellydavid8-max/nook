# Nook

Log, review and share everything you watch, play and read: films, TV, games, anime, books, manga and comics.

## What's here

- `app/page.tsx` — the feed
- `app/title/[slug]/page.tsx` — a title's page (reviews, photos, lists)
- `app/log/page.tsx` — logging and reviewing, with an optional Letterboxd link
- `app/post/page.tsx` — photo posts with filters
- `app/profile/page.tsx` — the customizable profile
- `app/login/page.tsx` — sign up and log in
- `lib/data.ts` — types and the starter title list
- `lib/store.tsx` — app state, reading and writing Supabase
- `lib/supabase.ts` — the Supabase connection
- `supabase/schema.sql` — database tables, security rules and photo storage
- `app/globals.css` — the whole look

## Setup

1. In Supabase → SQL Editor, run `supabase/schema.sql`.
2. In Supabase → Authentication → URL Configuration, set the Site URL to your live site.
3. In Vercel → Settings → Environment Variables, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then redeploy.

Next up: real title search (TMDB, IGDB, AniList, Open Library), following friends, and public profiles.

## Run it on your computer

Install [Node.js](https://nodejs.org) (the LTS version), then in this folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000.
