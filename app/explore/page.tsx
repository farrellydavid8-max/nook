"use client";

import { useRouter } from "next/navigation";
import TitleSearch from "@/components/TitleSearch";
import { titleHref } from "@/lib/data";

export default function ExplorePage() {
  const router = useRouter();
  return (
    <section className="screen narrow" aria-label="Explore">
      <header className="topbar">
        <h1 className="wordmark page-title" style={{ fontSize: 32 }}>
          Explore
        </h1>
      </header>
      <p className="sub" style={{ marginTop: -4, marginBottom: 16 }}>
        Find any film, show, game, anime, book, manga or comic to see what people think, or log it yourself.
      </p>
      <TitleSearch onPick={(t) => router.push(titleHref(t))} autoFocus />
    </section>
  );
}
