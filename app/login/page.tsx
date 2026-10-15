"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SetupNotice from "@/components/SetupNotice";
import { BackIcon } from "@/components/Icons";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { USERNAME } from "@/lib/data";


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

  async function google() {
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (error) setError(error.message.includes("not enabled") ? "Google sign-in isn't switched on yet." : error.message);
  }

  async function forgot() {
    setError(null);
    setInfo(null);
    if (!email.trim()) return setError("Type your email above first, then tap “Forgot password?” again.");
    setBusy(true);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset` });
    setBusy(false);
    if (error) return setError(error.message);
    setInfo(`If ${email.trim()} has a Nook account, a link to reset your password is on its way.`);
  }

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
        {mode === "login" && (
          <button type="button" className="linkbtn" style={{ marginTop: 8 }} onClick={forgot}>
            Forgot password?
          </button>
        )}
      </form>

      <div className="or">or</div>
      <button type="button" className="btn" style={{ width: "100%" }} onClick={google}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
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
