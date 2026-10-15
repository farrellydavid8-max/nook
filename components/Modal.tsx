"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./Icons";

// A dialog: a bottom sheet on phones, a centered window on computers.
export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className={`drawer${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheethead">
          <h1>{title}</h1>
          <button className="iconbtn" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body
  );
}
