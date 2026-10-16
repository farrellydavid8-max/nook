"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { Avatar } from "@/components/Media";
import * as api from "@/lib/api";
import { profileHref, type NotificationItem } from "@/lib/data";
import { useStore } from "@/lib/store";

function NotificationsList() {
  const { user, refreshUnread, toast, bump } = useStore();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [requests, setRequests] = useState<api.FollowRequest[]>([]);

  useEffect(() => {
    if (user) api.fetchFollowRequests(user.id).then(setRequests);
  }, [user]);

  async function answer(r: api.FollowRequest, accept: boolean) {
    if (!user) return;
    try {
      await api.answerFollowRequest(user.id, r.id, accept);
      setRequests((list) => list.filter((x) => x.id !== r.id));
      setItems((list) => (list ?? []).filter((n) => !(n.type === "follow_request" && n.actor === r.username)));
      toast(accept ? `${r.username} can now see your posts` : "Request declined");
      bump();
    } catch {
      toast("Couldn't answer that request. The database update for private accounts may still need running.");
    }
  }

  useEffect(() => {
    if (!user) return;
    api.fetchNotifications().then(async (list) => {
      setItems(list);
      if (list.some((n) => !n.read)) {
        await api.markAllRead(user.id);
        refreshUnread();
      }
    });
  }, [user, refreshUnread]);

  const about = (n: NotificationItem) => (n.postTitle ? ` about ${n.postTitle}` : "");
  const describe = (n: NotificationItem) =>
    ({
      follow: "started following you",
      follow_request: "asked to follow you",
      follow_accepted: "accepted your follow request",
      like: `liked your post${about(n)}`,
      comment: `commented on your post${about(n)}`,
    })[n.type];

  return (
    <section className="screen narrow" aria-label="Notifications">
      <header className="topbar">
        <h1 className="wordmark page-title" style={{ fontSize: 32 }}>
          Notifications
        </h1>
      </header>
      {requests.length > 0 && (
        <div className="requests" aria-label="Follow requests">
          <div className="label">Follow requests</div>
          {requests.map((r) => (
            <div className="request" key={r.id}>
              <Link href={profileHref(r.username)}>
                <Avatar name={r.username} color={r.avatar_color} url={r.avatar_url} size={36} />
                <strong>{r.username}</strong>
              </Link>
              <button className="btn small primary" onClick={() => answer(r, true)}>
                Accept
              </button>
              <button className="btn small" onClick={() => answer(r, false)}>
                Decline
              </button>
            </div>
          ))}
        </div>
      )}
      {items === null ? (
        <div className="empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">Nothing yet. When people follow you, like or comment on your posts, it shows up here.</div>
      ) : (
        <ul className="notif-list">
          {items.filter((n) => n.type !== "follow_request").map((n) => (
            <li key={n.id} className={n.read ? "" : "unread"}>
              <Link href={n.type.startsWith("follow") || !n.postId ? profileHref(n.actor) : `/p/${n.postId}`}>
                <Avatar name={n.actor} color={n.actorColor} url={n.actorAvatar} size={36} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong>{n.actor}</strong> {describe(n)}
                  <span className="sub" style={{ display: "block" }}>
                    {n.time}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsList />
    </RequireAuth>
  );
}
