"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { hasVehicleDisplayControls } from "@/lib/train-display";
import { hasGallerySizeControls } from "@/lib/gallery-size";
import { DisplaySettings } from "./display-settings";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = { name?: string | null; image?: string | null; children: ReactNode };

export function AccountMenu(props: Props) {
  const pathname = usePathname();
  return <AccountMenuPanel key={pathname} {...props} pathname={pathname} />;
}

function AccountMenuPanel({ name, image, children, pathname }: Props & { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const initials = name?.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("") || "?";

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
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
        aria-label={name ? `Nastavení a účet: ${name}` : "Nastavení a účet"}
        title="Nastavení a účet"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-secondary ring-1 ring-divider transition-shadow hover:ring-2 hover:ring-divider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {image && failedImage !== image ? (
          <Image src={image} alt="" width={36} height={36} unoptimized
            className="h-full w-full object-cover" onError={() => setFailedImage(image)} />
        ) : <span aria-hidden="true">{initials}</span>}
      </button>
      <div ref={panel} id={panelId} hidden={!open} role="dialog" aria-label="Nastavení a účet"
        className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-lg border border-divider bg-surface p-4 shadow-lg">
        <DisplaySettings vehicleLabels={hasVehicleDisplayControls(pathname)} gallery={hasGallerySizeControls(pathname)} />
        <div className="mt-4 border-t border-divider pt-2">{children}</div>
      </div>
    </div>
  );
}
