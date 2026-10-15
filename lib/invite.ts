// Remembers whose invite link someone arrived from, until they've signed up.
const KEY = "nook_invite";

export function saveInvite(username: string) {
  try {
    localStorage.setItem(KEY, username.toLowerCase());
  } catch {}
}

export function readInvite(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearInvite() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export const inviteUrl = (username: string) => `${window.location.origin}/invite/${encodeURIComponent(username)}`;
