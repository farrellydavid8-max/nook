"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { profileHref, type CommentItem } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Avatar } from "./Media";

// The comment thread under a post.
export default function Comments({ postId, postOwnerId, onCount }: { postId: number; postOwnerId: string; onCount: (n: number) => void }) {
  const { user, blocked, toast } = useStore();
  const [items, setItems] = useState<CommentItem[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const list = await api.fetchComments(postId);
      setItems(list);
      onCount(list.length);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!user || !text) return;
    setSending(true);
    try {
      await api.addComment(postId, user.id, text);
      setBody("");
      await load();
    } catch {
      toast("Couldn't post your comment");
    }
    setSending(false);
  }

  async function remove(id: number) {
    try {
      await api.deleteComment(id);
      await load();
    } catch {
      toast("Couldn't delete that comment");
    }
  }

  const visible = (items ?? []).filter((c) => !blocked.has(c.userId));

  return (
    <div className="comments">
      {items === null ? (
        <p className="sub">Loading comments…</p>
      ) : (
        visible.map((c) => (
          <div className="comment" key={c.id}>
            <Avatar name={c.user} color={c.avatarColor} url={c.avatarUrl} size={26} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Link href={profileHref(c.user)} className="inline-title">
                {c.user}
              </Link>{" "}
              <span className="meta">· {c.time}</span>
              <p className="review" style={{ marginTop: 2 }}>
                {c.body}
              </p>
            </div>
            {user && (user.id === c.userId || user.id === postOwnerId) && (
              <button className="linkbtn small" onClick={() => remove(c.id)} aria-label="Delete comment">
                Delete
              </button>
            )}
          </div>
        ))
      )}
      {user ? (
        <form className="comment-form" onSubmit={send}>
          <label className="sr-only" htmlFor={`c-${postId}`}>
            Write a comment
          </label>
          <input id={`c-${postId}`} placeholder="Add a comment" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="pill" disabled={sending || !body.trim()}>
            Post
          </button>
        </form>
      ) : (
        <p className="sub">
          <Link href="/login" style={{ color: "var(--accent)" }}>
            Log in
          </Link>{" "}
          to comment.
        </p>
      )}
    </div>
  );
}
