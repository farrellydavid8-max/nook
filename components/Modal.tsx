"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
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
    </>
  );
}
