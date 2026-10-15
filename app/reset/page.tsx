"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

// The password-reset email links here. Opening the link signs you in, then you choose a new password.
export default function ResetPage() {
  const router = useRouter();
  const { user, loading, toast } = useStore();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    toast("Password changed");
    router.replace("/");
  }

  return (
    <section className="screen narrow" aria-label="Choose a new password">
      <header className="topbar">
        <h1 className="wordmark page-title" style={{ fontSize: 32 }}>
          New password
        </h1>
      </header>
      {loading ? (
        <div className="empty">Checking your reset link…</div>
      ) : !user ? (
        <div className="empty">
          This reset link has expired or was already used. Go to Log in and tap “Forgot password?” to get a fresh one.
        </div>
      ) : (
        <form onSubmit={save} noValidate>
          <label className="field" htmlFor="new-password" style={{ marginTop: 0 }}>
            New password
            <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && (
            <p className="err" role="alert" style={{ fontSize: 14 }}>
              {error}
            </p>
          )}
          <button className="btn primary" style={{ width: "100%", marginTop: 20 }} disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </section>
  );
}
