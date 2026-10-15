"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { PlusIcon } from "./Icons";
import { isVideo } from "./Media";

const MAX_ITEMS = 6;
const MAX_PHOTO = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

export type NewMedia = { file: File; preview: string; video: boolean };

// Optional photos and clips on a log: ones already saved (when editing) plus new ones.
export default function LogMedia({
  existing,
  onRemoveExisting,
  added,
  setAdded,
}: {
  existing: string[];
  onRemoveExisting: (url: string) => void;
  added: NewMedia[];
  setAdded: (m: NewMedia[]) => void;
}) {
  const { toast } = useStore();
  const urls = useRef<string[]>([]);
  useEffect(() => {
    urls.current = added.map((a) => a.preview);
  }, [added]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const count = existing.length + added.length;

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_ITEMS - count;
    const chosen = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    const tooBig = chosen.filter((f) => f.size > (f.type.startsWith("video/") ? MAX_VIDEO : MAX_PHOTO));
    const ok = chosen.filter((f) => !tooBig.includes(f)).slice(0, room);
    if (tooBig.length) toast(`Skipped ${tooBig.length}: photos can be up to 10 MB and clips up to 50 MB`);
    else if (chosen.length > room) toast(`You can add up to ${MAX_ITEMS} photos or clips`);
    setAdded([...added, ...ok.map((file) => ({ file, preview: URL.createObjectURL(file), video: file.type.startsWith("video/") }))]);
  }

  return (
    <div className="field">
      Photos or clips (optional)
      <div className="thumbs" style={{ marginTop: 2 }}>
        {existing.map((u) => (
          <div key={u} className="thumb-wrap">
            {isVideo(u) ? (
              <div className="thumb is-video">
                <video src={u} muted playsInline preload="metadata" aria-hidden="true" />
              </div>
            ) : (
              <div className="thumb" style={{ backgroundImage: `url("${u}")` }} />
            )}
            <button type="button" className="fav-remove" aria-label="Remove this photo" onClick={() => onRemoveExisting(u)}>
              ×
            </button>
          </div>
        ))}
        {added.map((m) => (
          <div key={m.preview} className="thumb-wrap">
            {m.video ? (
              <div className="thumb is-video">
                <video src={m.preview} muted playsInline preload="metadata" aria-hidden="true" />
              </div>
            ) : (
              <div className="thumb" style={{ backgroundImage: `url("${m.preview}")` }} />
            )}
            <button
              type="button"
              className="fav-remove"
              aria-label="Remove this photo"
              onClick={() => {
                URL.revokeObjectURL(m.preview);
                setAdded(added.filter((x) => x !== m));
              }}
            >
              ×
            </button>
          </div>
        ))}
        {count < MAX_ITEMS && (
          <label className="thumb add" aria-label="Add photos or clips">
            <PlusIcon size={20} />
            <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
          </label>
        )}
      </div>
    </div>
  );
}
