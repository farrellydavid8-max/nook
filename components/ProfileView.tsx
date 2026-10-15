"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { MEDIA, stars, titleHref, type ListItem, type LogPost, type PhotoPost, type Profile, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";
import { usePosts } from "@/lib/usePosts";
import CustomizeProfile from "./CustomizeProfile";
import { LinkIcon, PaletteIcon } from "./Icons";
import { Avatar, Poster, PosterArt, Shot } from "./Media";
import Modal from "./Modal";
import NewListButton from "./NewListButton";
import PostCard from "./PostCard";

type Tab = "Diary" | "Reviews" | "Photos" | "Lists" | "Want to";

export default function ProfileView({ username }: { username: string }) {
  const { user, profile: me, following, blocked, toggleFollow, toggleBlock, signOut, version, toast } = useStore();
  const [loadedProfile, setLoadedProfile] = useState<Profile | null | undefined>(undefined);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [lists, setLists] = useState<ListItem[]>([]);
  const [watchlist, setWatchlist] = useState<TitleRef[]>([]);
  const [tab, setTab] = useState<Tab>("Diary");
  const [customizing, setCustomizing] = useState(false);
  const [menu, setMenu] = useState<null | "report" | "block">(null);
  const [reportText, setReportText] = useState("");

  const isMe = Boolean(me && me.username === username.toLowerCase());
  // Your own profile always shows your latest saved changes
  const profile = isMe ? me : loadedProfile;

  useEffect(() => {
    if (isMe) return;
    api.fetchProfileByUsername(username).then(setLoadedProfile);
  }, [username, isMe]);

  useEffect(() => {
    if (!profile) return;
    api.followCounts(profile.id).then(setCounts);
    api.fetchLists(profile.id).then(setLists);
    api.fetchWatchlist(profile.id).then(setWatchlist);
  }, [profile?.id, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const { posts, loaded } = usePosts(profile ? { userId: profile.id, limit: 1000 } : null);

  if (profile === undefined) return <div className="empty">Loading profile…</div>;
  if (profile === null) return <div className="empty">There&apos;s no one called @{username} on Nook.</div>;
  if (!isMe && blocked.has(profile.id)) {
    return (
      <div className="empty">
        You blocked @{profile.username}.{" "}
        <button className="linkbtn inline" onClick={() => toggleBlock(profile.id)}>
          Unblock
        </button>
      </div>
    );
  }

  const logs = posts.filter((p): p is LogPost => p.type === "log");
  const reviews = logs.filter((p) => p.text);
  const photoPosts = posts.filter((p): p is PhotoPost => p.type === "photo");
  const mediumCounts = Object.entries(MEDIA)
    .map(([m, label]) => [label, logs.filter((p) => p.title.medium === m && p.status !== "In progress").length] as const)
    .filter(([, n]) => n > 0);

  // Hand-picked favorites first; otherwise the highest-rated titles
  let favorites = profile.favorites?.length ? profile.favorites : [];
  if (!favorites.length) {
    const auto: TitleRef[] = [];
    [...logs]
      .sort((a, b) => b.rating - a.rating)
      .filter((p) => p.rating >= 4)
      .forEach((p) => auto.length < 4 && !auto.some((f) => f.key === p.title.key) && auto.push(p.title));
    favorites = auto;
  }
  const followsMe = following.has(profile.id);
  const year = new Date().getFullYear();

  const statsBlock = profile.show_stats && (
    <div className="stats" key="stats">
      {mediumCounts.length ? (
        mediumCounts.map(([k, v]) => (
          <div key={k}>
            <b>{v}</b>
            <span>{k}</span>
          </div>
        ))
      ) : (
        <p className="sub" style={{ gridColumn: "1 / -1" }}>
          {isMe ? "Your stats appear here as you log things." : "Nothing logged yet."}
        </p>
      )}
    </div>
  );

  const favBlock = (
    <div className="section" key="favs">
      <div className="label" style={{ marginBottom: 8 }}>
        Favorites
      </div>
      {favorites.length ? (
        <div className="favs">
          {favorites.map((t) => (
            <Poster key={t.key} title={t} width="auto" />
          ))}
        </div>
      ) : (
        <p className="sub">{isMe ? "Pick your top 4 in Customize, or rate things 4 stars and up." : "No favorites yet."}</p>
      )}
    </div>
  );

  const tabs: Tab[] = ["Diary", "Reviews", "Photos", "Lists", "Want to"];
  const tabBlock = (
    <div key="tabs">
      <div className="tabs scroll-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {!loaded && tab !== "Lists" && tab !== "Want to" && <div className="empty">Loading…</div>}

      {loaded && tab === "Diary" &&
        (logs.length ? (
          <div className="revlist">
            {logs.map((p) => (
              <div className="rev diary-row" key={p.id}>
                <Poster title={p.title} width={44} label={false} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link href={titleHref(p.title)} className="inline-title">
                    {p.title.name}
                  </Link>
                  <div className="sub">
                    {p.title.medium} · {p.loggedOn ? new Date(p.loggedOn + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : p.time}
                    {p.status && p.status !== "Finished" ? ` · ${p.status}` : ""}
                    {p.progress ? ` · ${p.progress}` : ""}
                    {p.rating > 0 && (
                      <>
                        {" · "}
                        <span style={{ color: "var(--accent)" }}>{stars(p.rating)}</span>
                      </>
                    )}
                    {p.rewatch ? " · ↻" : ""}
                  </div>
                </div>
                {isMe && p.status === "In progress" && (
                  <Link href={`/log?title=${encodeURIComponent(p.title.key)}&status=In%20progress`} className="btn small">
                    Update
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">{isMe ? <Link href="/log">Log your first title.</Link> : "Nothing logged yet."}</div>
        ))}

      {loaded && tab === "Reviews" &&
        (reviews.length ? (
          <div className="feed" style={{ paddingTop: 16 }}>
            {reviews.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <div className="empty">No written reviews yet.</div>
        ))}

      {loaded && tab === "Photos" &&
        (photoPosts.length ? (
          <div className="pgrid">
            {photoPosts.flatMap((p) => p.shots.map((s, i) => <Shot key={`${p.id}-${i}`} src={s} filter={p.filter} strength={p.strength} />))}
          </div>
        ) : (
          <div className="empty">{isMe ? <Link href="/post">Post your first photos.</Link> : "No photos yet."}</div>
        ))}

      {tab === "Lists" && (
        <div style={{ paddingTop: 16 }}>
          {isMe && <NewListButton className="btn primary" />}
          {lists.length ? (
            <div className="list-cards">
              {lists.map((l) => (
                <Link key={l.id} href={`/lists/${l.id}`} className="list-card">
                  <div className="list-stack" aria-hidden="true">
                    {l.items.slice(0, 4).map((t) => (
                      <PosterArt key={t.key} title={t} label={false} />
                    ))}
                  </div>
                  <strong>{l.name}</strong>
                  <span className="sub">
                    {l.items.length} {l.items.length === 1 ? "title" : "titles"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">{isMe ? "Make a list of anything: top 10s, comfort picks, things to try." : "No lists yet."}</div>
          )}
        </div>
      )}

      {tab === "Want to" &&
        (watchlist.length ? (
          <div className="poster-grid">
            {watchlist.map((t) => (
              <Poster key={t.key} title={t} width="auto" />
            ))}
          </div>
        ) : (
          <div className="empty">{isMe ? "Tap “Want to” on any title to save it here." : "Nothing saved yet."}</div>
        ))}
    </div>
  );

  const sections = profile.layout === "favorites" ? [statsBlock, favBlock, tabBlock] : [tabBlock, statsBlock, favBlock];

  return (
    <section aria-label={`${profile.username}'s profile`}>
      <div className="banner" style={{ background: profile.banner }}>
        {isMe && (
          <button className="btn" onClick={() => setCustomizing(true)}>
            <PaletteIcon size={16} />
            Customize
          </button>
        )}
      </div>
      <div className="inset wide">
        <div className="prow">
          <div style={{ border: "4px solid var(--bg)", borderRadius: "50%" }}>
            <Avatar name={profile.username} color={profile.avatar_color} size={80} />
          </div>
          <div className="prow-actions">
            {isMe ? (
              <>
                <Link href="/import" className="btn">
                  Import
                </Link>
                <button className="btn" onClick={signOut}>
                  Log out
                </button>
              </>
            ) : (
              <>
                {user && (
                  <button className="btn" aria-label="More options" onClick={() => setMenu("report")}>
                    Report
                  </button>
                )}
                {user && (
                  <button className="btn" onClick={() => setMenu("block")}>
                    Block
                  </button>
                )}
                <button className={`btn${followsMe ? "" : " primary"}`} aria-pressed={followsMe} onClick={() => toggleFollow(profile.id)}>
                  {followsMe ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
        </div>
        <h1 className="pname">{profile.username}</h1>
        <div className="follow-counts">
          <span>
            <b>{counts.followers}</b> {counts.followers === 1 ? "follower" : "followers"}
          </span>
          <span>
            <b>{counts.following}</b> following
          </span>
          <Link href={`/u/${profile.username}/year/${year}`} className="inline-title" style={{ color: "var(--accent)" }}>
            {year} in review
          </Link>
        </div>
        {isMe && profile.username.startsWith("user_") && (
          <button className="setup-hint" onClick={() => setCustomizing(true)}>
            Choose a username so friends can find you →
          </button>
        )}
        {profile.bio && (
          <p className="review" style={{ marginTop: 6 }}>
            {profile.bio}
          </p>
        )}
        {profile.letterboxd_url && (
          <a className="lb plain" href={profile.letterboxd_url} target="_blank" rel="noopener noreferrer">
            <LinkIcon size={16} />
            Letterboxd
          </a>
        )}
        {sections}
      </div>

      {customizing && <CustomizeProfile onClose={() => setCustomizing(false)} />}

      {menu === "report" && user && (
        <Modal title={`Report @${profile.username}`} onClose={() => setMenu(null)}>
          <label className="field" htmlFor="report-user" style={{ marginTop: 0 }}>
            What&apos;s wrong with this account?
            <textarea id="report-user" rows={3} maxLength={400} value={reportText} onChange={(e) => setReportText(e.target.value)} />
          </label>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setMenu(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!reportText.trim()}
              onClick={async () => {
                try {
                  await api.report(user.id, reportText.trim(), { userId: profile.id });
                  toast("Thanks. We've received your report.");
                  setMenu(null);
                } catch {
                  toast("Couldn't send the report");
                }
              }}
            >
              Send report
            </button>
          </div>
        </Modal>
      )}
      {menu === "block" && (
        <Modal title={`Block @${profile.username}?`} onClose={() => setMenu(null)}>
          <p className="review">You won&apos;t see their posts or comments, and you&apos;ll stop following them. They won&apos;t be told.</p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setMenu(null)}>
              Cancel
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                await toggleBlock(profile.id);
                setMenu(null);
              }}
            >
              Block
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
