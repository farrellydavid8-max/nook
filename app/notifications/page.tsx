"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { Avatar } from "@/components/Media";
import * as api from "@/lib/api";
import { profileHref, type NotificationItem } from "@/lib/data";
import { useStore } from "@/lib/store";

function NotificationsList() {
  const { user, refreshUnread } = useStore();
  const [items, setItems] = useState<NotificationItem[] | null>(null);

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

  const describe = (n: NotificationItem) =>
    n.type === "follow" ? "started following you" : n.type === "like" ? `liked your post${n.postTitle ? ` about ${n.postTitle}` : ""}` : `commented on your post${n.postTitle ? ` about ${n.postTitle}` : ""}`;

  return (
    <section className="screen narrow" aria-label="Notifications">
      <header className="topbar">
        <h1 className="wordmark page-title" style={{ fontSize: 32 }}>
          Notifications
        </h1>
      </header>
      {items === null ? (
        <div className="empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">Nothing yet. When people follow you, like or comment on your posts, it shows up here.</div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => (
            <li key={n.id} className={n.read ? "" : "unread"}>
              <Link href={n.type === "follow" || !n.postId ? profileHref(n.actor) : `/p/${n.postId}`}>
                <Avatar name={n.actor} color={n.actorColor} size={36} />
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
