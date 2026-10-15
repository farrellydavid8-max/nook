"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { ListItem, TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";
import Modal from "./Modal";

// Choose which of your lists a title goes in (or start a new one).
export default function AddToList({ title, onClose }: { title: TitleRef; onClose: () => void }) {
  const { user, toast, bump } = useStore();
  const [lists, setLists] = useState<ListItem[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) api.fetchLists(user.id).then(setLists);
  }, [user]);

  async function toggle(l: ListItem) {
    const inList = l.items.some((t) => t.key === title.key);
    try {
      if (inList) await api.removeFromList(l.id, title.key);
      else await api.addToList(l.id, title);
      setLists((all) =>
        (all ?? []).map((x) => (x.id === l.id ? { ...x, items: inList ? x.items.filter((t) => t.key !== title.key) : [...x.items, title] } : x))
      );
      toast(inList ? `Removed from ${l.name}` : `Added to ${l.name}`);
      bump();
    } catch {
      toast("Couldn't update that list");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setBusy(true);
    try {
      const id = await api.createList(user.id, newName.trim());
      await api.addToList(id, title);
      toast(`Added to ${newName.trim()}`);
      bump();
      onClose();
    } catch {
      toast("Couldn't create the list");
    }
    setBusy(false);
  }

  return (
    <Modal title={`Add ${title.name} to a list`} onClose={onClose}>
      {lists === null ? (
        <p className="sub">Loading your lists…</p>
      ) : (
        lists.length > 0 && (
          <div className="radio-list">
            {lists.map((l) => (
              <label key={l.id} className="check">
                <input type="checkbox" checked={l.items.some((t) => t.key === title.key)} onChange={() => toggle(l)} />
                {l.name} <span className="sub">· {l.items.length}</span>
              </label>
            ))}
          </div>
        )
      )}
      <form onSubmit={create} style={{ marginTop: 12 }}>
        <label className="field" htmlFor="new-list" style={{ marginTop: 0 }}>
          {lists?.length ? "Or start a new list" : "Start your first list"}
          <input id="new-list" maxLength={80} placeholder="e.g. Rainy day games" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Done
          </button>
          <button className="btn primary" disabled={busy || !newName.trim()}>
            Create and add
          </button>
        </div>
      </form>
    </Modal>
  );
}
