"use client";

// Shared app state. For now it lives in memory, so it resets on reload.
// When we add Supabase, these functions will read and write the real database instead.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SAMPLE_POSTS, type LogPost, type PhotoPost, type Post } from "./data";

type Auto = "id" | "time" | "likes";
export type NewPost = Omit<LogPost, Auto> | Omit<PhotoPost, Auto>;

type Store = {
  posts: Post[];
  addPost: (p: NewPost) => void;
  liked: Set<number>;
  toggleLike: (id: number) => void;
  wants: Set<string>;
  toggleWant: (title: string) => void;
  accent: string;
  setAccent: (c: string) => void;
  banner: string;
  setBanner: (c: string) => void;
  layout: "favorites" | "photos";
  setLayout: (l: "favorites" | "photos") => void;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  toast: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(SAMPLE_POSTS);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [wants, setWants] = useState<Set<string>>(new Set());
  const [accent, setAccent] = useState("#E8A33D");
  const [banner, setBanner] = useState("#3B3226");
  const [layout, setLayout] = useState<"favorites" | "photos">("favorites");
  const [showStats, setShowStats] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--banner", banner);
  }, [accent, banner]);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage((m) => (m === msg ? null : m)), 2200);
  }, []);

  const value = useMemo<Store>(
    () => ({
      posts,
      addPost: (p) => setPosts((all) => [{ ...p, id: Date.now(), time: "now", likes: 0 } as Post, ...all]),
      liked,
      toggleLike: (id) =>
        setLiked((s) => {
          const n = new Set(s);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        }),
      wants,
      toggleWant: (t) =>
        setWants((s) => {
          const n = new Set(s);
          if (n.has(t)) n.delete(t);
          else n.add(t);
          return n;
        }),
      accent,
      setAccent,
      banner,
      setBanner,
      layout,
      setLayout,
      showStats,
      setShowStats,
      toast,
    }),
    [posts, liked, wants, accent, banner, layout, showStats, toast]
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
