"use client";

// Shared app state, backed by Supabase: who is signed in, their profile, and the feed.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { manualKey, timeAgo, type FilterName, type Medium, type Post, type Profile, type TitleRef } from "./data";
import { getSupabase, isConfigured } from "./supabase";

type Row = {
  id: number;
  user_id: string;
  type: "log" | "photo";
  title: string;
  title_key: string | null;
  medium: string;
  year: number | null;
  creator: string | null;
  poster_url: string | null;
  status: string | null;
  progress: string | null;
  rating: number | null;
  review: string | null;
  letterboxd_url: string | null;
  spoiler: boolean | null;
  photos: string[] | null;
  filter: string | null;
  filter_strength: number | null;
  caption: string | null;
  created_at: string;
  author: { username: string; avatar_color: string } | null;
  likes: { user_id: string }[];
};

const SELECT =
  "id,user_id,type,title,title_key,medium,year,creator,poster_url,status,progress,rating,review,letterboxd_url,spoiler,photos,filter,filter_strength,caption,created_at,author:profiles(username,avatar_color),likes(user_id)";

function toPost(r: Row, me?: string): Post {
  const base = {
    id: r.id,
    userId: r.user_id,
    user: r.author?.username ?? "someone",
    avatarColor: r.author?.avatar_color ?? "#4A4A52",
    title: {
      key: r.title_key ?? manualKey(r.title, r.medium as Medium),
      name: r.title,
      medium: r.medium as Medium,
      year: r.year ?? undefined,
      creator: r.creator ?? undefined,
      poster: r.poster_url ?? undefined,
    },
    time: timeAgo(r.created_at),
    likes: r.likes.length,
    liked: Boolean(me && r.likes.some((l) => l.user_id === me)),
  };
  if (r.type === "photo") {
    return {
      ...base,
      type: "photo",
      shots: r.photos ?? [],
      filter: (r.filter as FilterName) ?? "Raw",
      strength: r.filter_strength ?? 70,
      caption: r.caption ?? "",
    };
  }
  return {
    ...base,
    type: "log",
    rating: Number(r.rating ?? 0),
    text: r.review ?? "",
    letterboxd: r.letterboxd_url ?? undefined,
    spoiler: r.spoiler ?? false,
    status: r.status ?? undefined,
    progress: r.progress ?? undefined,
  };
}

export type NewLog = {
  title: TitleRef;
  status: string;
  progress: string;
  loggedOn: string;
  rating: number;
  review: string;
  letterboxd?: string;
  spoiler: boolean;
};

export type NewPhotoPost = {
  title: TitleRef;
  files: File[];
  filter: FilterName;
  strength: number;
  caption: string;
};

type Store = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  posts: Post[];
  postsLoaded: boolean;
  refresh: () => Promise<void>;
  addLog: (l: NewLog) => Promise<string | null>;
  addPhotoPost: (p: NewPhotoPost) => Promise<string | null>;
  toggleLike: (post: Post) => Promise<void>;
  updateProfile: (changes: Partial<Profile>) => Promise<string | null>;
  signOut: () => Promise<void>;
  wants: Set<string>;
  toggleWant: (title: string) => void;
  toast: (msg: string) => void;
};

// The title details stored with each post
const titleColumns = (t: TitleRef) => ({
  title: t.name,
  title_key: t.key,
  medium: t.medium,
  year: t.year ?? null,
  creator: t.creator ?? null,
  poster_url: t.poster ?? null,
});

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [wants, setWants] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage((m) => (m === msg ? null : m)), 2600);
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await getSupabase().from("profiles").select("*").eq("id", id).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    const sb = getSupabase();
    const { data: auth } = await sb.auth.getUser();
    const { data, error } = await sb.from("posts").select(SELECT).order("created_at", { ascending: false }).limit(100);
    if (!error && data) setPosts((data as unknown as Row[]).map((r) => toPost(r, auth.user?.id)));
    setPostsLoaded(true);
  }, []);

  // Follow sign-in and sign-out
  useEffect(() => {
    if (!isConfigured) return;
    const sb = getSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) await loadProfile(data.user.id);
      setLoading(false);
      refresh();
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else setProfile(null);
        refresh();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, refresh]);

  // Apply the signed-in person's colors to the whole app
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--accent", profile?.accent ?? "#E8A33D");
    root.setProperty("--banner", profile?.banner ?? "#3B3226");
  }, [profile?.accent, profile?.banner]);

  const addLog = useCallback(
    async (l: NewLog) => {
      if (!user) return "Log in to save your log.";
      const { error } = await getSupabase()
        .from("posts")
        .insert({
          user_id: user.id,
          type: "log",
          ...titleColumns(l.title),
          status: l.status,
          progress: l.progress,
          logged_on: l.loggedOn || null,
          rating: l.rating || null,
          review: l.review || null,
          letterboxd_url: l.letterboxd || null,
          spoiler: l.spoiler,
        });
      if (error) return "Couldn't save your log. Check your connection and try again.";
      await refresh();
      return null;
    },
    [user, refresh]
  );

  const addPhotoPost = useCallback(
    async (p: NewPhotoPost) => {
      if (!user) return "Log in to post photos.";
      if (!p.files.length) return "Add at least one photo first.";
      const sb = getSupabase();
      const urls: string[] = [];
      for (const file of p.files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from("photos").upload(path, file, { contentType: file.type, upsert: false });
        if (error) return `Couldn't upload ${file.name}. Photos must be images under 10 MB.`;
        urls.push(sb.storage.from("photos").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await sb.from("posts").insert({
        user_id: user.id,
        type: "photo",
        ...titleColumns(p.title),
        photos: urls,
        filter: p.filter,
        filter_strength: p.strength,
        caption: p.caption || null,
      });
      if (error) return "Your photos uploaded but the post didn't save. Try posting again.";
      await refresh();
      return null;
    },
    [user, refresh]
  );

  const toggleLike = useCallback(
    async (post: Post) => {
      if (!user) {
        toast("Log in to like posts");
        return;
      }
      // Update the screen right away, then save
      setPosts((all) => all.map((x) => (x.id === post.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x)));
      const sb = getSupabase();
      const { error } = post.liked
        ? await sb.from("likes").delete().match({ user_id: user.id, post_id: post.id })
        : await sb.from("likes").insert({ user_id: user.id, post_id: post.id });
      if (error) {
        toast("Couldn't save that like");
        refresh();
      }
    },
    [user, toast, refresh]
  );

  const updateProfile = useCallback(
    async (changes: Partial<Profile>) => {
      if (!user || !profile) return "Log in first.";
      setProfile({ ...profile, ...changes });
      const { error } = await getSupabase().from("profiles").update(changes).eq("id", user.id);
      if (error) {
        loadProfile(user.id);
        return "Couldn't save your profile changes.";
      }
      return null;
    },
    [user, profile, loadProfile]
  );

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<Store>(
    () => ({
      configured: isConfigured,
      loading,
      user,
      profile,
      posts,
      postsLoaded,
      refresh,
      addLog,
      addPhotoPost,
      toggleLike,
      updateProfile,
      signOut,
      wants,
      toggleWant: (t) =>
        setWants((s) => {
          const n = new Set(s);
          if (n.has(t)) n.delete(t);
          else n.add(t);
          return n;
        }),
      toast,
    }),
    [loading, user, profile, posts, postsLoaded, refresh, addLog, addPhotoPost, toggleLike, updateProfile, signOut, wants, toast]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
