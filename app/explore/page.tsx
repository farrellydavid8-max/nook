"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PeopleSearch from "@/components/PeopleSearch";
import TitleSearch from "@/components/TitleSearch";
import { titleHref } from "@/lib/data";

type Tab = "titles" | "people";

export default function ExplorePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("titles");

  // /explore#people opens straight to people search
  useEffect(() => {
    if (window.location.hash === "#people") setTab("people");
  }, []);

  return (
    <section className="screen narrow" aria-label="Explore">
      <header className="topbar">
        <h1 className="wordmark page-title" style={{ fontSize: 32 }}>
          Explore
        </h1>
      </header>
      <div className="tabs" role="tablist" style={{ marginTop: 0, marginBottom: 16 }}>
        <button role="tab" aria-selected={tab === "titles"} onClick={() => setTab("titles")}>
          Titles
        </button>
        <button role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")}>
          People
        </button>
      </div>
      {tab === "titles" ? (
        <>
          <p className="sub" style={{ marginTop: 0, marginBottom: 14 }}>
            Find any film, show, game, anime, book, manga or comic to see what people think, or log it yourself.
          </p>
          <TitleSearch onPick={(t) => router.push(titleHref(t))} autoFocus />
        </>
      ) : (
        <PeopleSearch />
      )}
    </section>
  );
}
