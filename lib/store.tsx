"use client";

// App-wide state: who is signed in, their profile, who they follow and block,
// their watchlist, unread notifications, and the little "toast" messages.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import * as api from "./api";
import type { FilterName, Profile, TitleRef } from "./data";
import { clearInvite, readInvite } from "./invite";
import { DEFAULT_ACCENT, DEFAULT_BG, applyTheme } from "./theme";
import { getSupabase, isConfigured } from "./supabase";

export type NewLog = {
  title: TitleRef;
  status: string;
  progress: string;
  loggedOn: string;
  rating: number;
  review: string;
  letterboxd?: string;
  spoiler: boolean;
  rewatch: boolean;
  /** Photos already on the log (when editing) that should stay */
  keepShots?: string[];
  /** Photos that were on the log but were removed while editing */
  removedShots?: string[];
  /** New photos or clips to upload */
  files?: File[];
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
  following: Set<string>;
  /** Private accounts you've asked to follow that haven't approved yet */
  requested: Set<string>;
  blocked: Set<string>;
  wants: Map<string, TitleRef>;
  unread: number;
  refreshUnread: () => Promise<void>;
  addLog: (l: NewLog, editId?: number) => Promise<string | null>;
  addPhotoPost: (p: NewPhotoPost) => Promise<string | null>;
  toggleFollow: (userId: string) => Promise<void>;
  toggleWant: (t: TitleRef) => Promise<void>;
  toggleBlock: (userId: string) => Promise<void>;
  updateProfile: (changes: Partial<Profile>) => Promise<string | null>;
  signOut: () => Promise<void>;
  toast: (msg: string) => void;
  /** Bumps whenever posts change, so open lists know to reload */
  version: number;
  bump: () => void;
};

const Ctx = createContext<Store | null>(null);

// The title details stored with each post
const titleColumns = api.titleToRow;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [wants, setWants] = useState<Map<string, TitleRef>>(new Map());
  const [unread, setUnread] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage((m) => (m === msg ? null : m)), 2600);
  }, []);

  const loadMe = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) {
      setProfile(null);
      setFollowing(new Set());
      setRequested(new Set());
      setBlocked(new Set());
      setWants(new Map());
      setUnread(0);
      return;
    }
    const sb = getSupabase();
    const [{ data: p }, followState, blk, wl, un] = await Promise.all([
      sb.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      api.fetchFollowState(u.id).catch(() => ({ accepted: [] as string[], pending: [] as string[] })),
      api.fetchBlockedIds(u.id).catch(() => [] as string[]),
      api.fetchWatchlist(u.id).catch(() => []),
      api.unreadCount(u.id).catch(() => 0),
    ]);
    setProfile((p as Profile) ?? null);
    const fol = followState.accepted;
    setRequested(new Set(followState.pending));
    // Arrived from a friend's invite link? Follow them once you're in.
    const invitedBy = readInvite();
    if (invitedBy && p) {
      clearInvite();
      const inviter = await api.fetchProfileByUsername(invitedBy).catch(() => null);
      if (inviter && inviter.id !== u.id && !fol.includes(inviter.id)) {
        await api.setFollow(u.id, inviter.id, true).catch(() => {});
        fol.push(inviter.id);
      }
    }
    setFollowing(new Set(fol));
    setBlocked(new Set(blk));
    setWants(new Map(wl.map((t) => [t.key, t])));
    setUnread(un);
  }, []);

  // Follow sign-in and sign-out
  useEffect(() => {
    if (!isConfigured) return;
    const sb = getSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      await loadMe(data.user);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadMe(session?.user ?? null).then(bump);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadMe, bump]);

  // Check for new notifications every minute while the page is open
  const refreshUnread = useCallback(async () => {
    if (user) setUnread(await api.unreadCount(user.id).catch(() => 0));
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const t = window.setInterval(refreshUnread, 60000);
    return () => window.clearInterval(t);
  }, [user, refreshUnread]);

  // Apply the signed-in person's app colors (and the defaults once they sign out)
  useEffect(() => {
    if (loading) return;
    applyTheme(profile?.theme_bg ?? DEFAULT_BG, profile?.accent ?? DEFAULT_ACCENT);
    document.documentElement.style.setProperty("--banner", profile?.banner ?? "#3B3226");
  }, [loading, profile?.theme_bg, profile?.accent, profile?.banner]);

  // Upload photos and clips into your own folder; returns their public addresses, or an error message
  const uploadMedia = useCallback(
    async (files: File[]): Promise<string[] | string> => {
      if (!user) return "Log in first.";
      const bucket = getSupabase().storage.from("photos");
      const urls: string[] = [];
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
        if (error) return `Couldn't upload ${file.name}. Photos can be up to 10 MB and clips up to 50 MB (MP4, MOV or WebM).`;
        urls.push(bucket.getPublicUrl(path).data.publicUrl);
      }
      return urls;
    },
    [user]
  );

  const addLog = useCallback(
    async (l: NewLog, editId?: number) => {
      if (!user) return "Log in to save your log.";
      const uploaded = await uploadMedia(l.files ?? []);
      if (typeof uploaded === "string") return uploaded;
      const row = {
        type: "log",
        ...titleColumns(l.title),
        status: l.status,
        progress: l.progress || null,
        logged_on: l.loggedOn || null,
        rating: l.rating || null,
        review: l.review || null,
        letterboxd_url: l.letterboxd || null,
        spoiler: l.spoiler,
        rewatch: l.rewatch,
        photos: [...(l.keepShots ?? []), ...uploaded],
      };
      const { error } = editId
        ? await getSupabase().from("posts").update(row).eq("id", editId)
        : await getSupabase().from("posts").insert({ user_id: user.id, ...row });
      if (error) return "Couldn't save your log. Check your connection and try again.";
      // Clean up photos removed while editing
      const gone = (l.removedShots ?? []).map((u) => u.split("/object/public/photos/")[1]).filter(Boolean);
      if (gone.length) await getSupabase().storage.from("photos").remove(gone);
      bump();
      return null;
    },
    [user, bump, uploadMedia]
  );

  const addPhotoPost = useCallback(
    async (p: NewPhotoPost) => {
      if (!user) return "Log in to post photos.";
      if (!p.files.length && !p.caption) return "Add a photo, a clip or a few words.";
      const urls = await uploadMedia(p.files);
      if (typeof urls === "string") return urls;
      const { error } = await getSupabase().from("posts").insert({
        user_id: user.id,
        type: "photo",
        ...titleColumns(p.title),
        photos: urls,
        filter: p.filter,
        filter_strength: p.strength,
        caption: p.caption || null,
      });
      if (error) return "Your files uploaded but the update didn't save. Try posting again.";
      bump();
      return null;
    },
    [user, bump, uploadMedia]
  );

  // Follow, unfollow, or cancel a request (tapping "Requested" cancels it)
  const toggleFollow = useCallback(
    async (other: string) => {
      if (!user) return toast("Log in to follow people");
      const now = !following.has(other) && !requested.has(other);
      try {
        const result = await api.setFollow(user.id, other, now);
        const f = new Set(following);
        const r = new Set(requested);
        f.delete(other);
        r.delete(other);
        if (result === "accepted") f.add(other);
        if (result === "pending") {
          r.add(other);
          toast("Request sent. You'll see their posts once they approve it.");
        }
        setFollowing(f);
        setRequested(r);
        bump();
      } catch {
        toast("Couldn't update that follow");
        const state = await api.fetchFollowState(user.id);
        setFollowing(new Set(state.accepted));
        setRequested(new Set(state.pending));
      }
    },
    [user, following, requested, toast, bump]
  );

  const toggleWant = useCallback(
    async (t: TitleRef) => {
      if (!user) return toast("Log in to save titles for later");
      const now = !wants.has(t.key);
      setWants((m) => {
        const n = new Map(m);
        if (now) n.set(t.key, t);
        else n.delete(t.key);
        return n;
      });
      try {
        await api.setWant(user.id, t, now);
        toast(now ? `Saved ${t.name} for later` : `Removed ${t.name} from your list`);
      } catch {
        toast("Couldn't update your list");
      }
    },
    [user, wants, toast]
  );

  const toggleBlock = useCallback(
    async (other: string) => {
      if (!user) return;
      const now = !blocked.has(other);
      try {
        await api.setBlock(user.id, other, now);
        setBlocked((s) => {
          const n = new Set(s);
          if (now) n.add(other);
          else n.delete(other);
          return n;
        });
        if (now)
          setFollowing((s) => {
            const n = new Set(s);
            n.delete(other);
            return n;
          });
        toast(now ? "Blocked. You won't see their posts." : "Unblocked");
        bump();
      } catch {
        toast("Couldn't update that block");
      }
    },
    [user, blocked, toast, bump]
  );

  const updateProfile = useCallback(
    async (changes: Partial<Profile>) => {
      if (!user || !profile) return "Log in first.";
      const before = profile;
      setProfile({ ...profile, ...changes });
      const { error } = await getSupabase().from("profiles").update(changes).eq("id", user.id);
      if (error) {
        setProfile(before);
        return error.code === "23505" ? "That username is taken." : "Couldn't save your profile changes.";
      }
      bump();
      return null;
    },
    [user, profile, bump]
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
      following,
      requested,
      blocked,
      wants,
      unread,
      refreshUnread,
      addLog,
      addPhotoPost,
      toggleFollow,
      toggleWant,
      toggleBlock,
      updateProfile,
      signOut,
      toast,
      version,
      bump,
    }),
    [loading, user, profile, following, requested, blocked, wants, unread, refreshUnread, addLog, addPhotoPost, toggleFollow, toggleWant, toggleBlock, updateProfile, signOut, toast, version, bump]
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
