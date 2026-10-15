"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { CloseIcon, PhotoIcon, PlusIcon } from "@/components/Icons";
import TitlePicker from "@/components/TitlePicker";
import { FILTERS, type FilterName, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";

const MAX_PHOTOS = 6;
const MAX_BYTES = 10 * 1024 * 1024;

type Picked = { file: File; preview: string };

function PhotoForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { addPhotoPost, toast } = useStore();
  const [picked, setPicked] = useState<Picked[]>([]);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<FilterName>("Dusk");
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
  const bg = current ? { backgroundImage: `url("${current.preview}")` } : {};

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - picked.length;
    const chosen = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const tooBig = chosen.filter((f) => f.size > MAX_BYTES);
    const ok = chosen.filter((f) => f.size <= MAX_BYTES).slice(0, room);
    if (tooBig.length) setError(`${tooBig.length} photo${tooBig.length > 1 ? "s were" : " was"} over 10 MB and skipped.`);
    if (chosen.length > room) toast(`You can post up to ${MAX_PHOTOS} photos at once`);
    if (!ok.length) return;
    setPicked((p) => [...p, ...ok.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    setSelected(picked.length + ok.length - 1);
  }

  function removeCurrent() {
    setPicked((p) => p.filter((_, i) => i !== selected));
    setSelected((s) => Math.max(0, s - 1));
  }

  async function post() {
    if (!title) return setError("Tag the title these photos are from.");
    setPosting(true);
    setError(null);
    const problem = await addPhotoPost({ title, files: picked.map((p) => p.file), filter, strength, caption: caption.trim() });
    setPosting(false);
    if (problem) return setError(problem);
    toast("Posted to the feed");
    router.push("/");
  }

  return (
    <section className="screen narrow" aria-label="New photo post">
      <header className="sheethead">
        <Link href="/" className="iconbtn" aria-label="Close">
          <CloseIcon />
        </Link>
        <h1>New photo post</h1>
        <button type="button" className="pill" onClick={post} disabled={posting || !picked.length || !title}>
          {posting ? "Posting…" : "Post"}
        </button>
      </header>

      {error && (
        <p className="err" role="alert" style={{ fontSize: 14 }}>
          {error}
        </p>
      )}

      {current ? (
        <div className="preview">
          <div className="layer" style={bg} />
          <div className="layer" style={{ ...bg, filter: FILTERS[filter], opacity: strength / 100 }} />
          <div className="cap">
            Photo {selected + 1} of {picked.length} · {filter}
          </div>
          <button className="btn remove" onClick={removeCurrent}>
            Remove
          </button>
        </div>
      ) : (
        <label className="preview dropzone" htmlFor="photo-upload">
          <PhotoIcon size={32} />
          <strong>Add screenshots or photos</strong>
          <span className="sub">Up to {MAX_PHOTOS} images, 10 MB each</span>
        </label>
      )}

      <div className="thumbs">
        {picked.map((p, i) => (
          <button
            key={p.preview}
            className="thumb"
            style={{ backgroundImage: `url("${p.preview}")` }}
            aria-pressed={i === selected}
            aria-label={`Select photo ${i + 1}`}
            onClick={() => setSelected(i)}
          />
        ))}
        {picked.length < MAX_PHOTOS && (
          <label className="thumb add" aria-label="Add photos">
            <PlusIcon size={20} />
            <input id="photo-upload" type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </label>
        )}
      </div>

      {current && (
        <>
          <div className="field">
            Filter
            <div className="filters" role="group" aria-label="Filter">
              {(Object.keys(FILTERS) as FilterName[]).map((f) => (
                <button key={f} className="filt" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  <span style={{ ...bg, filter: FILTERS[f] }} />
                  {f}
                </button>
              ))}
            </div>
          </div>
          <label className="field" htmlFor="photo-strength">
            Strength
            <input id="photo-strength" type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(+e.target.value)} />
          </label>
        </>
      )}

      <div className="field">
        Tag a title
        <TitlePicker value={title} onChange={setTitle} initialKey={params.get("title")} />
      </div>

      <label className="field" htmlFor="photo-caption">
        Caption
        <input id="photo-caption" maxLength={500} placeholder="Say something about it" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </label>
    </section>
  );
}

export default function PhotoPostPage() {
  return (
    <RequireAuth>
      <Suspense>
        <PhotoForm />
      </Suspense>
    </RequireAuth>
  );
}
