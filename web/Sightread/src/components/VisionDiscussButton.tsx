import { useEffect, useRef, useState } from "react";
import type { VisionDiscussMode } from "../lib/visionDiscuss";

interface VisionDiscussButtonProps {
  disabled?: boolean;
  onDiscuss: (mode: VisionDiscussMode) => void;
}

export function VisionDiscussButton({
  disabled = false,
  onDiscuss,
}: VisionDiscussButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="vision-discuss" ref={rootRef}>
      <button
        type="button"
        className="btn btn--secondary btn--compact vision-discuss__trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Discuss
      </button>
      {open && (
        <div className="vision-discuss__menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="vision-discuss__item"
            onClick={() => {
              setOpen(false);
              onDiscuss("new");
            }}
          >
            New chat
          </button>
          <button
            type="button"
            role="menuitem"
            className="vision-discuss__item"
            onClick={() => {
              setOpen(false);
              onDiscuss("continue");
            }}
          >
            Add to current conversation
          </button>
        </div>
      )}
    </div>
  );
}
