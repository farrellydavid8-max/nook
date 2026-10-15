"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { Post } from "@/lib/data";
import { useStore } from "@/lib/store";
import Modal from "./Modal";

const REASONS = ["Spam", "Harassment or hate", "Nudity or sexual content", "Spoilers without a warning", "Something else"];

// The ⋯ menu on a post: edit and delete your own, report or block others.
export default function PostMenu({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const router = useRouter();
  const { user, toast, toggleBlock, bump } = useStore();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "delete" | "caption" | "report" | "block">(null);
  const [caption, setCaption] = useState(post.type === "photo" ? post.caption : "");
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!user) return null;
  const mine = user.id === post.userId;

  async function run(fn: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await fn();
      toast(done);
      setDialog(null);
      onChanged();
      bump();
    } catch {
      toast("That didn't work. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="iconbtn small" aria-label="Post options" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="menu" role="menu">
          {mine ? (
            <>
              {post.type === "log" ? (
                <button role="menuitem" onClick={() => router.push(`/log?edit=${post.id}`)}>
                  Edit log
                </button>
              ) : (
                <button role="menuitem" onClick={() => (setOpen(false), setDialog("caption"))}>
                  Edit caption
                </button>
              )}
              <button role="menuitem" className="danger" onClick={() => (setOpen(false), setDialog("delete"))}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button role="menuitem" onClick={() => (setOpen(false), setDialog("report"))}>
                Report post
              </button>
              <button role="menuitem" className="danger" onClick={() => (setOpen(false), setDialog("block"))}>
                Block {post.user}
              </button>
            </>
          )}
        </div>
      )}

      {dialog === "delete" && (
        <Modal title="Delete this post?" onClose={() => setDialog(null)}>
          <p className="review">
            This removes it from Nook for good{post.type === "photo" ? ", including the photos" : ""}, along with its likes and comments.
          </p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              Keep it
            </button>
            <button className="btn danger" disabled={busy} onClick={() => run(() => api.deletePost(post), "Post deleted")}>
              Delete post
            </button>
          </div>
        </Modal>
      )}

      {dialog === "caption" && (
        <Modal title="Edit caption" onClose={() => setDialog(null)}>
          <label className="field" htmlFor={`cap-${post.id}`} style={{ marginTop: 0 }}>
            Caption
            <input id={`cap-${post.id}`} maxLength={500} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy} onClick={() => run(() => api.updatePost(post.id, { caption: caption.trim() || null }), "Caption saved")}>
              Save
            </button>
          </div>
        </Modal>
      )}

      {dialog === "report" && (
        <Modal title="Report this post" onClose={() => setDialog(null)}>
          <div className="radio-list" role="radiogroup" aria-label="Reason">
            {REASONS.map((r) => (
              <label key={r} className="check">
                <input type="radio" name={`reason-${post.id}`} checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
          </div>
          <label className="field" htmlFor={`rep-${post.id}`}>
            Anything else we should know? (optional)
            <textarea id={`rep-${post.id}`} rows={2} maxLength={400} value={details} onChange={(e) => setDetails(e.target.value)} />
          </label>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                run(() => api.report(user.id, [reason, details.trim()].filter(Boolean).join(": "), { postId: post.id, userId: post.userId }), "Thanks. We've received your report.")
              }
            >
              Send report
            </button>
          </div>
        </Modal>
      )}

      {dialog === "block" && (
        <Modal title={`Block ${post.user}?`} onClose={() => setDialog(null)}>
          <p className="review">You won&apos;t see their posts or comments, and you&apos;ll stop following them. They won&apos;t be told.</p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await toggleBlock(post.userId);
                setBusy(false);
                setDialog(null);
              }}
            >
              Block
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
