"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { timeAgo } from "@/lib/data";
import { useStore } from "@/lib/store";

// The Steam row in Customize: connect, sync now, or disconnect.
export default function SteamConnect() {
  const { toast, bump } = useStore();
  const [link, setLink] = useState<api.SteamLink | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = () => api.fetchSteamLink().then(setLink).catch(() => setLink(null));
  useEffect(() => {
    load();
  }, []);

  async function sync() {
    setBusy(true);
    try {
      const res = await fetch("/api/steam/sync", { method: "POST" });
      const data = await res.json();
      toast(data.ok ? `Synced ${data.games} games from Steam` : data.reason ?? "Sync didn't work. Try again later.");
      await load();
      bump();
    } catch {
      toast("Sync didn't work. Try again later.");
    }
    setBusy(false);
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/steam/disconnect", { method: "POST" }).catch(() => {});
    setConfirming(false);
    setBusy(false);
    toast("Steam disconnected");
    await load();
    bump();
  }

  return (
    <div className="connect-row">
      <div className="connect-head">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M12 2a10 10 0 00-9.96 9.2l5.35 2.2a2.8 2.8 0 011.6-.5h.16l2.38-3.45v-.05a3.77 3.77 0 113.77 3.77h-.09l-3.4 2.42v.13a2.83 2.83 0 01-5.6.55L2.4 14.7A10 10 0 1012 2zm-4.3 15.2l-1.23-.5a2.12 2.12 0 103.9-1.58 2.1 2.1 0 00-2.72-1.16l1.27.53a1.56 1.56 0 01-1.2 2.88zM15.3 12.4a2.51 2.51 0 10-2.5-2.5 2.51 2.51 0 002.5 2.5zm0-4.4a1.89 1.89 0 11-1.88 1.88A1.89 1.89 0 0115.3 8z" />
        </svg>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>Steam</strong>
          <div className="sub">
            {link === undefined
              ? "Checking…"
              : link
                ? `Connected as ${link.steam_name ?? "your Steam account"}${link.last_synced_at ? ` · synced ${timeAgo(link.last_synced_at)} ago`.replace("now ago", "just now") : ""}`
                : "Adds the games you play, with hours, to your profile. Nothing is posted to feeds."}
          </div>
        </div>
      </div>
      {link?.sync_error && <p className="err">{link.sync_error}</p>}
      <div className="connect-actions">
        {link ? (
          confirming ? (
            <>
              <span className="sub">Remove Steam and its games from your profile?</span>
              <button className="btn small" onClick={() => setConfirming(false)}>
                Keep
              </button>
              <button className="btn small danger" disabled={busy} onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <button className="btn small" disabled={busy} onClick={sync}>
                {busy ? "Syncing…" : "Sync now"}
              </button>
              <button className="btn small" onClick={() => setConfirming(true)}>
                Disconnect
              </button>
            </>
          )
        ) : (
          link === null && (
            <a className="btn small primary" href="/api/steam/connect">
              Connect Steam
            </a>
          )
        )}
      </div>
    </div>
  );
}
