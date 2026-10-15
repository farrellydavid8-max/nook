"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackIcon } from "@/components/Icons";
import { Poster } from "@/components/Media";
import Modal from "@/components/Modal";
import TitleSearch from "@/components/TitleSearch";
import * as api from "@/lib/api";
import { profileHref, type ListItem } from "@/lib/data";
import { useStore } from "@/lib/store";

export default function ListPage() {
  const router = useRouter();
  const id = Number(useParams<{ id: string }>().id);
  const { user, configured, toast, bump } = useStore();
  const [list, setList] = useState<ListItem | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = () => api.fetchList(id).then(setList);
  useEffect(() => {
    if (configured && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, configured]);

  if (list === undefined) return <div className="empty">Loading list…</div>;
  if (list === null) return <div className="empty">This list was deleted or doesn&apos;t exist.</div>;
  const mine = user?.id === list.userId;

  async function act(fn: () => Promise<void>, msg: string) {
    try {
      await fn();
      toast(msg);
      await load();
      bump();
    } catch {
      toast("That didn't work. Try again.");
    }
  }

  return (
    <section className="screen narrow" aria-label={list.name}>
      <header className="sheethead">
        <button className="iconbtn" aria-label="Back" onClick={() => router.back()}>
          <BackIcon />
        </button>
        {mine && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              onClick={() => {
                setName(list.name);
                setDescription(list.description);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button className="btn primary" onClick={() => setAdding(true)}>
              Add titles
            </button>
          </div>
        )}
      </header>
      <h1 className="page-title list-title">{list.name}</h1>
      <p className="sub">
        A list by{" "}
        <Link href={profileHref(list.owner)} className="inline-title">
          {list.owner}
        </Link>{" "}
        · {list.items.length} {list.items.length === 1 ? "title" : "titles"}
      </p>
      {list.description && <p className="review">{list.description}</p>}

      {list.items.length ? (
        <ol className="list-grid">
          {list.items.map((t, i) => (
            <li key={t.key}>
              <span className="list-num">{i + 1}</span>
              <Poster title={t} width="100%" />
              <span className="list-name">{t.name}</span>
              {mine && (
                <button className="linkbtn small" onClick={() => act(() => api.removeFromList(list.id, t.key), `Removed ${t.name}`)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty">{mine ? "Add films, games, books, anything. Mix them however you like." : "This list is empty."}</div>
      )}

      {adding && (
        <Modal title="Add to this list" onClose={() => setAdding(false)} wide>
          <TitleSearch autoFocus onPick={(t) => act(() => api.addToList(list.id, t), `Added ${t.name}`)} />
          <p className="sub" style={{ marginTop: 12 }}>
            Keep adding, then close this window when you&apos;re done.
          </p>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit list" onClose={() => setEditing(false)}>
          <label className="field" htmlFor="el-name" style={{ marginTop: 0 }}>
            Name
            <input id="el-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field" htmlFor="el-desc">
            Description
            <textarea id="el-desc" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="dialog-actions">
            <button className="btn danger" onClick={() => setConfirmDelete(true)}>
              Delete list
            </button>
            <button
              className="btn primary"
              disabled={!name.trim()}
              onClick={() => act(() => api.updateList(list.id, { name: name.trim(), description: description.trim() }), "List saved").then(() => setEditing(false))}
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete this list?" onClose={() => setConfirmDelete(false)}>
          <p className="review">The list goes away for good. Your logs and the titles themselves aren&apos;t affected.</p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                try {
                  await api.deleteList(list.id);
                  toast("List deleted");
                  bump();
                  router.replace(user ? "/profile" : "/");
                } catch {
                  toast("Couldn't delete the list");
                }
              }}
            >
              Delete list
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
