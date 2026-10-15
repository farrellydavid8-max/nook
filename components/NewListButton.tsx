"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as api from "@/lib/api";
import { useStore } from "@/lib/store";
import Modal from "./Modal";

// Opens a small form to name a new list, then goes to it.
export default function NewListButton({ className = "btn" }: { className?: string }) {
  const router = useRouter();
  const { user, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const id = await api.createList(user.id, name.trim(), description.trim());
      router.push(`/lists/${id}`);
    } catch {
      toast("Couldn't create the list");
      setBusy(false);
    }
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        New list
      </button>
      {open && (
        <Modal title="New list" onClose={() => setOpen(false)}>
          <form onSubmit={create}>
            <label className="field" htmlFor="list-name" style={{ marginTop: 0 }}>
              Name
              <input id="list-name" autoFocus maxLength={80} placeholder="e.g. Comfort games" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field" htmlFor="list-desc">
              Description (optional)
              <textarea id="list-desc" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy || !name.trim()}>
                Create list
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
