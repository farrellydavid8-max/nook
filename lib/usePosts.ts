"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPosts, type PostQuery } from "./api";
import type { Post } from "./data";
import { useStore } from "./store";

// Loads posts for a feed, profile or title page, hides blocked people,
// and reloads whenever something is posted, edited or deleted.
export function usePosts(query: PostQuery | null) {
  const { user, blocked, version, configured, loading } = useStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const key = JSON.stringify(query);

  const reload = useCallback(async () => {
    if (!configured || loading || !query) return;
    try {
      const list = await fetchPosts(query, user?.id);
      setPosts(list);
      setError(false);
    } catch {
      setError(true);
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id, configured, loading]);

  useEffect(() => {
    reload();
  }, [reload, version]);

  return { posts: posts.filter((p) => !blocked.has(p.userId)), loaded, error, reload, setPosts };
}
