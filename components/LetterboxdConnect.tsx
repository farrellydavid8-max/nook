"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { timeAgo } from "@/lib/data";
import { useStore } from "@/lib/store";

// The Letterboxd row in Customize: enter username → put a code in your bio → verify → syncs daily.
export default function LetterboxdConnect() {
  const { toast, bump } = useStore();
  const [link, setLink] = useState<api.LetterboxdLink | null | undefined>(undefined);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = () => api.fetchLetterboxdLink().then(setLink).catch(() => setLink(null));
  useEffect(() => {
    load();
  }, []);

  async function call(path: string, body?: object) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      return await res.json();
    } catch {
      return { ok: false, reason: "Couldn't reach Nook. Check your connection." };
    } finally {
      setBusy(false);
    }
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const data = await call("/api/letterboxd/start", { username });
    if (!data.ok) return setMessage(data.reason);
    await load();
  }

  async function verify() {
    const data = await call("/api/letterboxd/verify");
    if (!data.ok) return setMessage(data.reason);
    toast(data.added ? `Letterboxd connected. Added ${data.added} diary ${data.added === 1 ? "entry" : "entries"}.` : "Letterboxd connected. New diary entries will sync daily.");
    await load();
    bump();
  }

  async function sync() {
    const data = await call("/api/letterboxd/sync");
    toast(data.ok ? (data.added ? `Added ${data.added} new ${data.added === 1 ? "entry" : "entries"} from Letterboxd` : "You're up to date with Letterboxd") : data.reason ?? "Sync didn't work.");
    await load();
    bump();
  }

  async function disconnect() {
    await call("/api/letterboxd/disconnect");
    setConfirming(false);
    toast("Letterboxd disconnected. Your synced logs stay on Nook.");
    await load();
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Code copied");
    } catch {}
  };

  return (
    <div className="connect-row">
      <div className="connect-head">
        <span className="lb-dots" aria-hidden="true">
          <i style={{ background: "#FF8000" }} />
          <i style={{ background: "#00E054" }} />
          <i style={{ background: "#40BCF4" }} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>Letterboxd</strong>
          <div className="sub">
            {link === undefined
              ? "Checking…"
              : link?.verified
                ? `Connected as ${link.lb_username}${link.last_synced_at ? ` · synced ${timeAgo(link.last_synced_at) === "now" ? "just now" : timeAgo(link.last_synced_at) + " ago"}` : ""}`
                : "Brings your Letterboxd diary over as Nook logs: ratings, reviews, rewatches and dates. Checks for new entries daily."}
          </div>
        </div>
      </div>

      {link?.verified && link.sync_error && <p className="err">{link.sync_error}</p>}

      {link === null && (
        <form className="connect-actions" onSubmit={start}>
          <label className="sr-only" htmlFor="lb-username">
            Letterboxd username
          </label>
          <input id="lb-username" className="inline-input" placeholder="Your Letterboxd username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
          <button className="btn small primary" disabled={busy || !username.trim()}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      )}

      {link && !link.verified && (
        <div className="lb-steps">
          <p className="sub" style={{ margin: 0, lineHeight: 1.5 }}>
            To prove <b>{link.lb_username}</b> is yours, add this code anywhere in your Letterboxd bio (Settings → Profile → Bio), save, then tap Verify. You can remove it afterwards.
          </p>
          <div className="code-chip">
            <code>{link.code}</code>
            <button type="button" className="btn small" onClick={() => copy(link.code)}>
              Copy
            </button>
          </div>
          <div className="connect-actions">
            <a className="btn small" href="https://letterboxd.com/settings/" target="_blank" rel="noopener noreferrer">
              Open Letterboxd settings
            </a>
            <button className="btn small primary" disabled={busy} onClick={verify}>
              {busy ? "Checking…" : "Verify"}
            </button>
            <button className="linkbtn small" onClick={disconnect}>
              Use a different username
            </button>
          </div>
        </div>
      )}

      {link?.verified && (
        <div className="connect-actions">
          {confirming ? (
            <>
              <span className="sub">Stop syncing? Logs already brought over will stay.</span>
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
          )}
        </div>
      )}

      {message && <p className="err" role="alert">{message}</p>}
    </div>
  );
}
