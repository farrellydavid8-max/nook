"use client";

import { useEffect, useRef, useState } from "react";
import { cropImage, loadImage } from "@/lib/image";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal from "./Modal";

type Kind = "avatar" | "banner";
const SHAPE: Record<Kind, { aspect: number; out: number; label: string }> = {
  avatar: { aspect: 1, out: 480, label: "profile picture" },
  banner: { aspect: 3, out: 1500, label: "banner" },
};

// Path inside the "photos" bucket, from a public URL
const pathOf = (url?: string | null) => url?.split("/object/public/photos/")[1] ?? null;

// Upload, crop and save a profile picture or banner photo.
export default function ImageUpload({ kind }: { kind: Kind }) {
  const { user, profile, updateProfile, toast } = useStore();
  const shape = SHAPE[kind];
  const current = kind === "avatar" ? profile?.avatar_url : profile?.banner_url;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);

  // Draw the live crop preview whenever the sliders move
  useEffect(() => {
    if (!img || !preview.current) return;
    const c = preview.current;
    const w = c.width;
    const h = Math.round(w / shape.aspect);
    c.height = h;
    let cw = img.naturalWidth;
    let ch = cw / shape.aspect;
    if (ch > img.naturalHeight) {
      ch = img.naturalHeight;
      cw = ch * shape.aspect;
    }
    cw /= zoom;
    ch /= zoom;
    c.getContext("2d")!.drawImage(img, (img.naturalWidth - cw) * x, (img.naturalHeight - ch) * y, cw, ch, 0, 0, w, h);
  }, [img, zoom, x, y, shape.aspect]);

  async function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Choose an image file");
    if (file.size > 15 * 1024 * 1024) return toast("That image is over 15 MB. Try a smaller one.");
    try {
      setImg(await loadImage(file));
      setZoom(1);
      setX(0.5);
      setY(0.5);
    } catch {
      toast("Couldn't open that image. Try a JPG or PNG. iPhone HEIC photos may need converting first.");
    }
  }

  async function save() {
    if (!img || !user) return;
    setBusy(true);
    try {
      const blob = await cropImage(img, shape.aspect, zoom, x, y, shape.out);
      const path = `${user.id}/profile/${kind}-${crypto.randomUUID()}.jpg`;
      const bucket = getSupabase().storage.from("photos");
      const { error } = await bucket.upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const url = bucket.getPublicUrl(path).data.publicUrl;
      const problem = await updateProfile(kind === "avatar" ? { avatar_url: url } : { banner_url: url });
      if (problem) throw new Error(problem);
      const old = pathOf(current);
      if (old) await bucket.remove([old]);
      toast(kind === "avatar" ? "Profile picture updated" : "Banner updated");
      setImg(null);
    } catch {
      toast(`Couldn't save your ${shape.label}. The database update for profile photos may still need running.`);
    }
    setBusy(false);
  }

  async function remove() {
    const old = pathOf(current);
    const problem = await updateProfile(kind === "avatar" ? { avatar_url: null } : { banner_url: null });
    if (problem) return toast(problem);
    if (old) await getSupabase().storage.from("photos").remove([old]);
    toast(kind === "avatar" ? "Profile picture removed" : "Banner photo removed");
  }

  return (
    <div className="upload-row">
      <div className={`upload-thumb ${kind}`} style={current ? { backgroundImage: `url("${current}")` } : { background: kind === "avatar" ? profile?.avatar_color : profile?.banner }}>
        {!current && kind === "avatar" && <span>{profile?.username[0]?.toUpperCase()}</span>}
      </div>
      <div className="upload-actions">
        <button type="button" className="btn small" onClick={() => input.current?.click()}>
          {current ? "Change" : "Upload"} {kind === "avatar" ? "photo" : "banner"}
        </button>
        {current && (
          <button type="button" className="linkbtn small" onClick={remove}>
            Remove
          </button>
        )}
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
      </div>

      {img && (
        <Modal title={`Crop your ${shape.label}`} onClose={() => setImg(null)} wide>
          <div className={`crop-frame ${kind}`}>
            <canvas ref={preview} width={kind === "avatar" ? 320 : 600} />
          </div>
          <label className="field" htmlFor={`${kind}-zoom`}>
            Zoom
            <input id={`${kind}-zoom`} type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
          </label>
          <div className="row2">
            <label className="field" htmlFor={`${kind}-x`}>
              Left / right
              <input id={`${kind}-x`} type="range" min={0} max={1} step={0.01} value={x} onChange={(e) => setX(+e.target.value)} />
            </label>
            <label className="field" htmlFor={`${kind}-y`}>
              Up / down
              <input id={`${kind}-y`} type="range" min={0} max={1} step={0.01} value={y} onChange={(e) => setY(+e.target.value)} />
            </label>
          </div>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setImg(null)}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
