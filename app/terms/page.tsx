import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Use · Nook" };

export default function TermsPage() {
  return (
    <article className="screen narrow legal">
      <h1>Terms of Use</h1>
      <p className="sub">Last updated {LEGAL_UPDATED}</p>

      <p>
        These terms are the rules for using Nook. By creating an account or using the site, you agree to them. If you don&apos;t agree, please
        don&apos;t use Nook.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13 years old.</li>
        <li>Keep your password to yourself. You&apos;re responsible for what happens on your account.</li>
        <li>Use one account per person, and don&apos;t pretend to be someone else.</li>
      </ul>

      <h2>What you post</h2>
      <ul>
        <li>
          You own your reviews, photos and everything else you post. By posting, you let Nook store and show it on the site so others can see it. That
          permission ends when you delete it.
        </li>
        <li>
          Only post photos you took yourself or have the right to share. Screenshots and photos of things you own are fine; don&apos;t upload other
          people&apos;s artwork, leaked material or full pages of books or comics.
        </li>
        <li>Mark spoilers with the spoiler option.</li>
      </ul>

      <h2>Don&apos;t</h2>
      <ul>
        <li>Harass, threaten or target anyone, or post hate speech.</li>
        <li>Post sexual content, graphic violence, or anything illegal.</li>
        <li>Post spam, scams or ads, or use bots to create accounts or posts.</li>
        <li>Try to break, overload or get around the security of Nook.</li>
      </ul>
      <p>
        Anyone can report a post or account. We may remove content or suspend accounts that break these rules, and we&apos;ll try to tell you why.
      </p>

      <h2>Other services</h2>
      <p>
        Title information and cover art come from TMDB, TVmaze, AniList, Open Library and Steam, and belong to their owners. Nook uses TMDB data but
        isn&apos;t endorsed or certified by TMDB. Nook isn&apos;t affiliated with Letterboxd, Steam or any studio or publisher.
      </p>

      <h2>No guarantees</h2>
      <p>
        Nook is a small project provided as it is. We work to keep it running and your data safe, but we can&apos;t promise it will always be
        available or free of mistakes. Keep your own copies of anything important. To the extent the law allows, Nook isn&apos;t liable for losses
        from using the site.
      </p>

      <h2>Leaving</h2>
      <p>You can delete your account at any time in Customize. We may close accounts that seriously or repeatedly break these terms.</p>

      <h2>Changes and contact</h2>
      <p>
        If these terms change in a way that matters, we&apos;ll update the date above and let you know in Nook. Questions? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <p className="sub">
        See also the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </article>
  );
}
