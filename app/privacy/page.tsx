import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy · Nook" };

export default function PrivacyPage() {
  return (
    <article className="screen narrow legal">
      <h1>Privacy Policy</h1>
      <p className="sub">Last updated {LEGAL_UPDATED}</p>

      <p>
        Nook is a place to log, review and share the films, shows, games, anime, books, manga and comics you get into. This page explains what we
        collect, why, and what you can do about it. The short version: we only keep what Nook needs to work, we don&apos;t sell your data, and we
        don&apos;t show ads.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Your account:</b> your email address and password (stored scrambled, so no one can read it), or your Google account&apos;s email if
          you sign in with Google.
        </li>
        <li>
          <b>Your profile:</b> your username, bio, colors, favorites and your Letterboxd link if you add one.
        </li>
        <li>
          <b>What you post:</b> logs, ratings, reviews, photos and captions, comments, likes, lists, your Want to list, and who you follow.
        </li>
        <li>
          <b>Steam, if you connect it:</b> your Steam ID and name, and the games you&apos;ve played with their hours and achievements.
        </li>
        <li>
          <b>Imports:</b> the diary entries, ratings and reviews in any Letterboxd files you choose to import.
        </li>
        <li>
          <b>Reports and blocks:</b> who you report or block, and the reason you give.
        </li>
      </ul>

      <h2>What&apos;s public</h2>
      <p>
        Your username, bio, profile, posts, photos, comments, lists, Want to list, followers and Steam games library can be seen by anyone, including
        people who aren&apos;t signed in. Your email address, password, blocks and reports are never shown to other people.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run Nook: show your profile and posts, build feeds, send notifications, and keep you signed in.</li>
        <li>To send account emails, like sign-up confirmations and password resets. We don&apos;t send marketing emails.</li>
        <li>To keep Nook safe: review reports and remove content or accounts that break the Terms.</li>
      </ul>

      <h2>Who else handles it</h2>
      <p>Nook uses a few services to run. They only get what they need to do their job:</p>
      <ul>
        <li>
          <b>Supabase</b> stores accounts, posts and photos.
        </li>
        <li>
          <b>Vercel</b> hosts the website.
        </li>
        <li>
          <b>Steam</b> confirms your sign-in and shares your games, only if you connect it.
        </li>
        <li>
          <b>Google</b> confirms your sign-in, only if you use Google sign-in.
        </li>
        <li>
          <b>Title databases</b> (TMDB, TVmaze, AniList, Open Library, Steam) receive the words you search for, but not who you are.
        </li>
      </ul>
      <p>We don&apos;t sell or rent your information to anyone.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit or delete any post, comment or list at any time.</li>
        <li>Disconnect Steam in Customize, which removes your synced games.</li>
        <li>
          Delete your account in Customize. That permanently removes your profile, posts, photos, comments, likes, lists and follows.
        </li>
        <li>
          Ask for a copy of your data, or ask any privacy question, by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </li>
      </ul>

      <h2>Age</h2>
      <p>Nook is for people 13 and older. If you&apos;re under 13, please don&apos;t create an account.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&apos;ll update the date above and let you know in Nook.</p>

      <p className="sub">
        See also the <Link href="/terms">Terms of Use</Link>.
      </p>
    </article>
  );
}
