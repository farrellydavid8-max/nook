"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { profileHref } from "@/lib/data";
import { useStore } from "@/lib/store";
import { SearchIcon } from "./Icons";
import FollowButton from "./FollowButton";
import { Avatar } from "./Media";

type Person = { id: string; username: string; avatar_color: string; avatar_url: string | null; bio: string };

// Find people by username and follow them right from the results.
export default function PeopleSearch() {
  const { user, blocked } = useStore();
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const latest = useRef(0);

  useEffect(() => {
    const query = q.trim().replace(/^@/, "").toLowerCase();
    if (query.length < 2) {
      setPeople([]);
      setState("idle");
      return;
    }
    const ticket = ++latest.current;
    setState("loading");
    const t = setTimeout(async () => {
      const found = await api.searchPeople(query).catch(() => []);
      if (ticket === latest.current) {
        setPeople(found.filter((p) => !blocked.has(p.id)));
        setState("done");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, blocked]);

  return (
    <div className="tsearch">
      <label className="searchbox">
        <SearchIcon size={20} />
        <span className="sr-only">Search people by username</span>
        <input type="search" autoFocus placeholder="Search by username" autoCapitalize="none" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {state === "loading" && <p className="sub tstatus">Searching…</p>}
      {state === "done" && !people.length && <p className="sub tstatus">No one called “{q.trim()}” yet. Invite them from your profile.</p>}
      {people.length > 0 && (
        <ul className="tresults people">
          {people.map((p) => {
            const me = user?.id === p.id;
            return (
              <li key={p.id}>
                <Link href={profileHref(p.username)} className="person">
                  <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} size={40} />
                  <span style={{ minWidth: 0 }}>
                    <strong>{p.username}</strong>
                    {p.bio && <span className="sub person-bio">{p.bio}</span>}
                  </span>
                </Link>
                {!me && user && <FollowButton userId={p.id} small />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
