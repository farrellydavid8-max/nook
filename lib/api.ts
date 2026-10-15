"use client";

// Every read and write to the database goes through these functions.

import {
  manualKey,
  timeAgo,
  type CommentItem,
  type FilterName,
  type ListItem,
  type Medium,
  type NotificationItem,
  type Post,
  type Profile,
  type TitleRef,
} from "./data";
import { getSupabase } from "./supabase";

const sb = () => getSupabase();

/* ---------- Titles ---------- */

export type TitleRow = {
  title: string;
  title_key: string | null;
  medium: string;
  year: number | null;
  creator: string | null;
  poster_url: string | null;
};

export const rowToTitle = (r: TitleRow): TitleRef => ({
  key: r.title_key ?? manualKey(r.title, r.medium as Medium),
  name: r.title,
  medium: r.medium as Medium,
  year: r.year ?? undefined,
  creator: r.creator ?? undefined,
  poster: r.poster_url ?? undefined,
});

export const titleToRow = (t: TitleRef): TitleRow => ({
  title: t.name,
  title_key: t.key,
  medium: t.medium,
  year: t.year ?? null,
  creator: t.creator ?? null,
  poster_url: t.poster ?? null,
});

/* ---------- Posts ---------- */

type PostRow = TitleRow & {
  id: number;
  user_id: string;
  type: "log" | "photo";
  status: string | null;
  progress: string | null;
  logged_on: string | null;
  rating: number | null;
  review: string | null;
  letterboxd_url: string | null;
  spoiler: boolean | null;
  rewatch: boolean | null;
  photos: string[] | null;
  filter: string | null;
  filter_strength: number | null;
  caption: string | null;
  created_at: string;
  author: { username: string; avatar_color: string } | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
};

const POST_SELECT =
  "id,user_id,type,title,title_key,medium,year,creator,poster_url,status,progress,logged_on,rating,review,letterboxd_url,spoiler,rewatch,photos,filter,filter_strength,caption,created_at,author:profiles(username,avatar_color),likes(user_id),comments(count)";

function toPost(r: PostRow, me?: string): Post {
  const base = {
    id: r.id,
    userId: r.user_id,
    user: r.author?.username ?? "someone",
    avatarColor: r.author?.avatar_color ?? "#4A4A52",
    title: rowToTitle(r),
    time: timeAgo(r.created_at),
    createdAt: r.created_at,
    likes: r.likes.length,
    liked: Boolean(me && r.likes.some((l) => l.user_id === me)),
    comments: r.comments?.[0]?.count ?? 0,
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
    loggedOn: r.logged_on ?? undefined,
    rewatch: r.rewatch ?? false,
  };
}

export type PostQuery = { userIds?: string[]; userId?: string; titleKey?: string; postId?: number; limit?: number; since?: string; until?: string };

export async function fetchPosts(q: PostQuery, me?: string): Promise<Post[]> {
  let query = sb().from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(q.limit ?? 60);
  if (q.userIds) query = query.in("user_id", q.userIds.length ? q.userIds : ["00000000-0000-0000-0000-000000000000"]);
  if (q.userId) query = query.eq("user_id", q.userId);
  if (q.titleKey) query = query.eq("title_key", q.titleKey);
  if (q.postId) query = query.eq("id", q.postId);
  if (q.since) query = query.gte("created_at", q.since);
  if (q.until) query = query.lt("created_at", q.until);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as PostRow[]).map((r) => toPost(r, me));
}

export async function setLike(postId: number, me: string, like: boolean) {
  const { error } = like
    ? await sb().from("likes").insert({ user_id: me, post_id: postId })
    : await sb().from("likes").delete().match({ user_id: me, post_id: postId });
  if (error) throw error;
}

export async function deletePost(post: Post) {
  const { error } = await sb().from("posts").delete().eq("id", post.id);
  if (error) throw error;
  if (post.type === "photo") {
    // Remove the uploaded image files too
    const paths = post.shots.map((u) => u.split("/object/public/photos/")[1]).filter(Boolean);
    if (paths.length) await sb().storage.from("photos").remove(paths);
  }
}

export async function updatePost(id: number, changes: Record<string, unknown>) {
  const { error } = await sb().from("posts").update(changes).eq("id", id);
  if (error) throw error;
}

/* ---------- Comments ---------- */

type CommentRow = { id: number; post_id: number; user_id: string; body: string; created_at: string; author: { username: string; avatar_color: string } | null };

export async function fetchComments(postId: number): Promise<CommentItem[]> {
  const { data, error } = await sb()
    .from("comments")
    .select("id,post_id,user_id,body,created_at,author:profiles(username,avatar_color)")
    .eq("post_id", postId)
    .order("created_at");
  if (error) throw error;
  return (data as unknown as CommentRow[]).map((c) => ({
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    user: c.author?.username ?? "someone",
    avatarColor: c.author?.avatar_color ?? "#4A4A52",
    body: c.body,
    time: timeAgo(c.created_at),
  }));
}

export async function addComment(postId: number, me: string, body: string) {
  const { error } = await sb().from("comments").insert({ post_id: postId, user_id: me, body });
  if (error) throw error;
}

export async function deleteComment(id: number) {
  const { error } = await sb().from("comments").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Profiles and following ---------- */

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data } = await sb().from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  return (data as Profile) ?? null;
}

export async function isUsernameTaken(username: string, exceptId?: string) {
  const { data } = await sb().from("profiles").select("id").eq("username", username).maybeSingle();
  return Boolean(data && data.id !== exceptId);
}

export async function fetchFollowingIds(me: string): Promise<string[]> {
  const { data } = await sb().from("follows").select("following_id").eq("follower_id", me);
  return (data ?? []).map((r) => r.following_id as string);
}

export async function followCounts(userId: string) {
  const [a, b] = await Promise.all([
    sb().from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    sb().from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}

export async function setFollow(me: string, other: string, follow: boolean) {
  const { error } = follow
    ? await sb().from("follows").insert({ follower_id: me, following_id: other })
    : await sb().from("follows").delete().match({ follower_id: me, following_id: other });
  if (error) throw error;
}

export async function searchPeople(q: string) {
  const { data } = await sb()
    .from("profiles")
    .select("id,username,avatar_color,bio")
    .ilike("username", `%${q.replace(/[%_]/g, "")}%`)
    .limit(10);
  return (data ?? []) as { id: string; username: string; avatar_color: string; bio: string }[];
}

/* ---------- Watchlist ---------- */

export async function fetchWatchlist(userId: string): Promise<TitleRef[]> {
  const { data } = await sb().from("watchlist").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return ((data ?? []) as TitleRow[]).map(rowToTitle);
}

export async function setWant(me: string, t: TitleRef, want: boolean) {
  const { error } = want
    ? await sb().from("watchlist").upsert({ user_id: me, ...titleToRow(t) })
    : await sb().from("watchlist").delete().match({ user_id: me, title_key: t.key });
  if (error) throw error;
}

/* ---------- Lists ---------- */

type ListRow = { id: number; user_id: string; name: string; description: string | null; owner: { username: string } | null; list_items: (TitleRow & { added_at: string })[] };
const LIST_SELECT = "id,user_id,name,description,created_at,owner:profiles(username),list_items(title,title_key,medium,year,creator,poster_url,added_at)";

const toList = (r: ListRow): ListItem => ({
  id: r.id,
  userId: r.user_id,
  owner: r.owner?.username ?? "someone",
  name: r.name,
  description: r.description ?? "",
  items: [...r.list_items].sort((a, b) => a.added_at.localeCompare(b.added_at)).map(rowToTitle),
});

export async function fetchLists(userId: string): Promise<ListItem[]> {
  const { data } = await sb().from("lists").select(LIST_SELECT).eq("user_id", userId).order("created_at", { ascending: false });
  return ((data ?? []) as unknown as ListRow[]).map(toList);
}

export async function fetchListsWithTitle(titleKey: string): Promise<ListItem[]> {
  const { data } = await sb().from("list_items").select("list_id").eq("title_key", titleKey).limit(20);
  const ids = (data ?? []).map((r) => r.list_id as number);
  if (!ids.length) return [];
  const res = await sb().from("lists").select(LIST_SELECT).in("id", ids);
  return ((res.data ?? []) as unknown as ListRow[]).map(toList);
}

export async function fetchList(id: number): Promise<ListItem | null> {
  const { data } = await sb().from("lists").select(LIST_SELECT).eq("id", id).maybeSingle();
  return data ? toList(data as unknown as ListRow) : null;
}

export async function createList(me: string, name: string, description = ""): Promise<number> {
  const { data, error } = await sb().from("lists").insert({ user_id: me, name, description }).select("id").single();
  if (error) throw error;
  return data.id as number;
}

export async function updateList(id: number, changes: { name?: string; description?: string }) {
  const { error } = await sb().from("lists").update(changes).eq("id", id);
  if (error) throw error;
}

export async function deleteList(id: number) {
  const { error } = await sb().from("lists").delete().eq("id", id);
  if (error) throw error;
}

export async function addToList(listId: number, t: TitleRef) {
  const { error } = await sb().from("list_items").upsert({ list_id: listId, ...titleToRow(t) });
  if (error) throw error;
}

export async function removeFromList(listId: number, key: string) {
  const { error } = await sb().from("list_items").delete().match({ list_id: listId, title_key: key });
  if (error) throw error;
}

/* ---------- Notifications ---------- */

type NotifRow = { id: number; type: NotificationItem["type"]; post_id: number | null; read: boolean; created_at: string; actor: { username: string; avatar_color: string } | null; post: { title: string } | null };

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data } = await sb()
    .from("notifications")
    .select("id,type,post_id,read,created_at,actor:profiles!notifications_actor_id_fkey(username,avatar_color),post:posts(title)")
    .order("created_at", { ascending: false })
    .limit(60);
  return ((data ?? []) as unknown as NotifRow[]).map((n) => ({
    id: n.id,
    type: n.type,
    actor: n.actor?.username ?? "someone",
    actorColor: n.actor?.avatar_color ?? "#4A4A52",
    postId: n.post_id,
    postTitle: n.post?.title,
    read: n.read,
    time: timeAgo(n.created_at),
  }));
}

export async function unreadCount(me: string) {
  const { count } = await sb().from("notifications").select("*", { count: "exact", head: true }).eq("user_id", me).eq("read", false);
  return count ?? 0;
}

export async function markAllRead(me: string) {
  await sb().from("notifications").update({ read: true }).eq("user_id", me).eq("read", false);
}

/* ---------- Safety ---------- */

export async function report(me: string, reason: string, target: { postId?: number; userId?: string }) {
  const { error } = await sb()
    .from("reports")
    .insert({ reporter_id: me, reason, post_id: target.postId ?? null, reported_user_id: target.userId ?? null });
  if (error) throw error;
}

export async function fetchBlockedIds(me: string): Promise<string[]> {
  const { data } = await sb().from("blocks").select("blocked_id").eq("blocker_id", me);
  return (data ?? []).map((r) => r.blocked_id as string);
}

export async function setBlock(me: string, other: string, block: boolean) {
  const { error } = block
    ? await sb().from("blocks").insert({ blocker_id: me, blocked_id: other })
    : await sb().from("blocks").delete().match({ blocker_id: me, blocked_id: other });
  if (error) throw error;
  if (block) await sb().from("follows").delete().match({ follower_id: me, following_id: other });
}
