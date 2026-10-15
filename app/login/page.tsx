"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SetupNotice from "@/components/SetupNotice";
import { BackIcon } from "@/components/Icons";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

const USERNAME = /^[a-z0-9_]{3,20}$/;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const { configured, user } = useStore();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  if (!configured) return <SetupNotice />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const sb = getSupabase();

    if (mode === "signup") {
      const name = username.trim().toLowerCase();
      if (!USERNAME.test(name)) return setError("Usernames are 3–20 characters: lowercase letters, numbers and underscores.");
      if (password.length < 8) return setError("Use a password with at least 8 characters.");
      setBusy(true);
      const { data: taken } = await sb.from("profiles").select("id").eq("username", name).maybeSingle();
      if (taken) {
        setBusy(false);
        return setError(`@${name} is taken. Try another username.`);
      }
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: name }, emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) setInfo(`Check ${email.trim()} for a confirmation link, then come back and log in.`);
      return;
    }

    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
  }

  return (
    <section className="screen narrow" aria-label={mode === "signup" ? "Create account" : "Log in"}>
      <header className="sheethead">
        <Link href="/" className="iconbtn" aria-label="Back to feed">
          <BackIcon />
        </Link>
      </header>
      <h1 className="wordmark" style={{ fontSize: 44 }}>
        Nook<span className="dot">.</span>
      </h1>
      <p className="review" style={{ marginTop: 8 }}>
        Everything you watch, play and read, in one place.
      </p>

      <div className="tabs" role="tablist" style={{ marginTop: 24 }}>
        <button role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>
          Create account
        </button>
        <button role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>
          Log in
        </button>
      </div>

      <form onSubmit={submit} noValidate>
        <label className="field" htmlFor="auth-email">
          Email
          <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === "signup" && (
          <label className="field" htmlFor="auth-username">
            Username
            <input
              id="auth-username"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="lowercase, numbers, _"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
          </label>
        )}
        <label className="field" htmlFor="auth-password">
          Password
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p className="err" role="alert" style={{ fontSize: 14, marginTop: 14 }}>
            {error}
          </p>
        )}
        {info && (
          <p className="review" role="status" style={{ marginTop: 14 }}>
            {info}
          </p>
        )}

        <button type="submit" className="btn primary" style={{ width: "100%", marginTop: 20 }} disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
