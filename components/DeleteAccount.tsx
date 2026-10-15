"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

// The danger zone at the bottom of Customize.
export default function DeleteAccount() {
  const { toast } = useStore();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: typed }) });
    const data = await res.json().catch(() => ({ ok: false }));
    if (!data.ok) {
      setBusy(false);
      return toast(data.reason ?? "Couldn't delete the account.");
    }
    await getSupabase().auth.signOut();
    window.location.href = "/";
  }

  if (!open) {
    return (
      <button className="linkbtn small" style={{ color: "var(--danger)", marginTop: 18 }} onClick={() => setOpen(true)}>
        Delete my account
      </button>
    );
  }

  return (
    <div className="danger-zone">
      <strong>Delete your account?</strong>
      <p className="sub" style={{ lineHeight: 1.5 }}>
        This permanently removes your profile, posts, photos, comments, likes, lists and follows. It can&apos;t be undone.
      </p>
      <label className="field" htmlFor="delete-confirm" style={{ marginTop: 6 }}>
        Type DELETE to confirm
        <input id="delete-confirm" autoCapitalize="characters" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </label>
      <div className="dialog-actions">
        <button className="btn" onClick={() => setOpen(false)}>
          Keep my account
        </button>
        <button className="btn danger" disabled={busy || typed !== "DELETE"} onClick={remove}>
          {busy ? "Deleting…" : "Delete forever"}
        </button>
      </div>
    </div>
  );
}
