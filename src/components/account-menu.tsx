"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function AccountMenu({ name, image, children }: {
  name?: string | null;
  image?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const initials = name?.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("") || "?";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative shrink-0" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        ref={trigger}
        type="button"
        aria-label={name ? `Účet: ${name}` : "Uživatelský účet"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-secondary ring-1 ring-divider transition-shadow hover:ring-2 hover:ring-divider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {image && failedImage !== image ? (
          <Image src={image} alt="" width={36} height={36} unoptimized
            className="h-full w-full object-cover" onError={() => setFailedImage(image)} />
        ) : <span aria-hidden="true">{initials}</span>}
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 top-full z-10 mt-2 w-40 rounded-lg border border-divider bg-surface p-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}
