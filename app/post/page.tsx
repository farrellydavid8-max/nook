"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { CloseIcon, PhotoIcon, PlusIcon } from "@/components/Icons";
import TitlePicker from "@/components/TitlePicker";
import { FILTERS, type FilterName, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";

const MAX_ITEMS = 6;
const MAX_PHOTO = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

type Picked = { file: File; preview: string; video: boolean };

// An update: photos, gameplay clips or just a few words about a title. Nothing gets logged or rated.
function UpdateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { addPhotoPost, toast } = useStore();
  const [picked, setPicked] = useState<Picked[]>([]);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<FilterName>("Raw");
  const [strength, setStrength] = useState(70);
  const [title, setTitle] = useState<TitleRef | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free the temporary previews when leaving the page
  const previews = useRef<string[]>([]);
  useEffect(() => {
    previews.current = picked.map((p) => p.preview);
  }, [picked]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const current = picked[selected];
  const bg = current && !current.video ? { backgroundImage: `url("${current.preview}")` } : {};
  const anyPhoto = picked.some((p) => !p.video);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_ITEMS - picked.length;
    const chosen = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    const tooBig = chosen.filter((f) => f.size > (f.type.startsWith("video/") ? MAX_VIDEO : MAX_PHOTO));
    const ok = chosen.filter((f) => !tooBig.includes(f)).slice(0, room);
    if (tooBig.length) setError(`Skipped ${tooBig.length} file${tooBig.length > 1 ? "s" : ""}: photos can be up to 10 MB and clips up to 50 MB.`);
    if (chosen.length > room) toast(`You can add up to ${MAX_ITEMS} photos or clips per update`);
    if (!ok.length) return;
    setPicked((p) => [...p, ...ok.map((file) => ({ file, preview: URL.createObjectURL(file), video: file.type.startsWith("video/") }))]);
    setSelected(picked.length + ok.length - 1);
  }

  function removeCurrent() {
    setPicked((p) => p.filter((_, i) => i !== selected));
    setSelected((s) => Math.max(0, s - 1));
  }

  const ready = Boolean(title) && (picked.length > 0 || caption.trim().length > 0);

  async function post() {
    if (!title) return setError("Tag what this update is about.");
    if (!picked.length && !caption.trim()) return setError("Add a photo, a clip or a few words.");
    setPosting(true);
    setError(null);
    const problem = await addPhotoPost({ title, files: picked.map((p) => p.file), filter, strength, caption: caption.trim() });
    setPosting(false);
    if (problem) return setError(problem);
    toast("Update posted");
    router.push("/");
  }

  return (
    <section className="screen narrow" aria-label="New update">
      <header className="sheethead">
        <Link href="/" className="iconbtn" aria-label="Close">
          <CloseIcon />
        </Link>
        <h1>New update</h1>
        <button type="button" className="pill" onClick={post} disabled={posting || !ready}>
          {posting ? "Posting…" : "Post"}
        </button>
      </header>
      <p className="sub" style={{ marginTop: 0 }}>
        Share screenshots, clips or thoughts while you&apos;re playing, watching or reading. Updates don&apos;t log or rate anything.
      </p>

      {error && (
        <p className="err" role="alert" style={{ fontSize: 14 }}>
          {error}
        </p>
      )}

      <div className="field" style={{ marginTop: 8 }}>
        What&apos;s it about?
        <TitlePicker value={title} onChange={setTitle} initialKey={params.get("title")} />
      </div>

      <label className="field" htmlFor="update-text">
        What&apos;s happening?
        <textarea
          id="update-text"
          rows={3}
          maxLength={500}
          placeholder="e.g. Finally beat the first boss after 3 hours"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>

      <div className="field">
        Photos and clips (optional)
        {current ? (
          <div className="preview">
            {current.video ? (
              <video className="layer-video" src={current.preview} controls playsInline muted />
            ) : (
              <>
                <div className="layer" style={bg} />
                <div className="layer" style={{ ...bg, filter: FILTERS[filter], opacity: strength / 100 }} />
              </>
            )}
            <div className="cap">
              {current.video ? "Clip" : "Photo"} {selected + 1} of {picked.length}
              {current.video ? "" : ` · ${filter}`}
            </div>
            <button className="btn remove" onClick={removeCurrent}>
              Remove
            </button>
          </div>
        ) : (
          <label className="preview dropzone small-drop" htmlFor="media-upload">
            <PhotoIcon size={28} />
            <strong>Add screenshots, photos or gameplay clips</strong>
            <span className="sub">Up to {MAX_ITEMS} · photos 10 MB, clips 50 MB</span>
          </label>
        )}
      </div>

      <div className="thumbs">
        {picked.map((p, i) => (
          <button
            key={p.preview}
            className={`thumb${p.video ? " is-video" : ""}`}
            style={p.video ? undefined : { backgroundImage: `url("${p.preview}")` }}
            aria-pressed={i === selected}
            aria-label={`Select ${p.video ? "clip" : "photo"} ${i + 1}`}
            onClick={() => setSelected(i)}
          >
            {p.video && <video src={p.preview} muted playsInline preload="metadata" aria-hidden="true" />}
          </button>
        ))}
        {picked.length < MAX_ITEMS && (
          <label className="thumb add" aria-label="Add photos or clips">
            <PlusIcon size={20} />
            <input id="media-upload" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
          </label>
        )}
      </div>

      {anyPhoto && (
        <>
          <div className="field">
            Photo filter
            <div className="filters" role="group" aria-label="Filter">
              {(Object.keys(FILTERS) as FilterName[]).map((f) => (
                <button key={f} className="filt" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  <span style={current && !current.video ? { ...bg, filter: FILTERS[f] } : { background: "var(--surface-2)", filter: FILTERS[f] }} />
                  {f}
                </button>
              ))}
            </div>
          </div>
          {filter !== "Raw" && (
            <label className="field" htmlFor="photo-strength">
              Strength
              <input id="photo-strength" type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(+e.target.value)} />
            </label>
          )}
        </>
      )}
    </section>
  );
}

export default function UpdatePage() {
  return (
    <RequireAuth>
      <Suspense>
        <UpdateForm />
      </Suspense>
    </RequireAuth>
  );
}
