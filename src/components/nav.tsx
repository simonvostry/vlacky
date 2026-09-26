"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import appIcon from "@/app/icon.png";
import { hasVehicleDisplayControls } from "@/lib/train-display";
import { CollectionActions } from "./collection-actions";
import { TrainDisplayControls } from "./train-display-controls";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/soupravy", label: "Soupravy" },
  { href: "/lokomotivy", label: "Lokomotivy" },
  { href: "/vozy", label: "Osobní vozy" },
  { href: "/nakladni-vozy", label: "Nákladní vozy" },
  { href: "/katalog", label: "Katalog" },
  { href: "/dcc", label: "DCC" },
];

const collectionActions: Record<string, { href: string; label: string }> = {
  "/soupravy": { href: "/soupravy/novy", label: "Přidat soupravu" },
  "/lokomotivy": { href: "/lokomotivy/novy", label: "Přidat lokomotivu" },
  "/nakladni-vozy": { href: "/nakladni-vozy/novy", label: "Přidat nákladní vůz" },
  "/vozy": { href: "/vozy/novy", label: "Přidat vůz" },
};

const catalogFilters = [
  { value: "", label: "Vše" },
  { value: "loco", label: "Lokomotivy" },
  { value: "wagon", label: "Osobní vozy" },
  { value: "freight", label: "Nákladní vozy" },
];

export function Nav({ accountMenu }: { accountMenu: ReactNode }) {
  return (
    <Suspense>
      <NavInner accountMenu={accountMenu} />
    </Suspense>
  );
}

function NavInner({ accountMenu }: { accountMenu: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const addAction = pathname === "/soupravy" && searchParams.get("druh") === "freight"
    ? { href: "/soupravy/novy?druh=freight", label: "Přidat nákladní soupravu" }
    : collectionActions[pathname];
  const showDisplayControls = hasVehicleDisplayControls(pathname);
  const isKatalog = pathname === "/katalog";
  const currentTyp = searchParams.get("typ") || "";
  const showColors = searchParams.get("barvy") === "1";

  function catalogHref(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    }
    const qs = params.toString();
    return `/katalog${qs ? `?${qs}` : ""}`;
  }

  return (
    <nav className="app-nav sticky top-0 z-50 border-b border-divider">
      <div className="flex flex-wrap items-center gap-x-6 px-4 sm:px-6 lg:px-8">
        <Link href="/soupravy" aria-label="Vláčky — Soupravy" title="Vláčky — Soupravy"
          className="order-1 mr-2 flex h-12 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <Image src={appIcon} alt="" width={44} height={44} sizes="44px" className="size-11" />
        </Link>
        <div className="order-4 flex w-full flex-wrap gap-x-4 gap-y-0 sm:order-1 sm:w-auto sm:justify-start sm:gap-6">
          {links.map((link) => {
            const isActive =
              pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className="nav-link"
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        {isKatalog && <div className="order-6 flex w-full flex-wrap items-center gap-3 pb-3">
          {isKatalog && (
            <>
              <div className="flex flex-wrap gap-1">
                {catalogFilters.map((f) => (
                  <Link
                    key={f.value}
                    href={catalogHref({ typ: f.value || null, pohon: null, skupina: null, rada: null })}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      currentTyp === f.value
                        ? "bg-primary text-white"
                        : "bg-muted text-secondary hover:bg-selected"
                    }`}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
              <Link
                href={catalogHref({ barvy: showColors ? null : "1" })}
                className="flex items-center gap-1.5 border-l border-divider pl-3 text-xs text-secondary hover:text-foreground"
              >
                <span
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded border ${
                    showColors
                      ? "border-accent bg-primary text-white"
                      : "border-control"
                  }`}
                >
                  {showColors && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                Barevné varianty
              </Link>
            </>
          )}
        </div>}
        <div className={showDisplayControls ? "order-5 flex w-full justify-end pb-2 xl:order-2 xl:ml-auto xl:w-auto xl:py-2" : "contents"}>
          <TrainDisplayControls visible={showDisplayControls} />
        </div>
        <div className={`order-2 ml-auto flex items-center gap-2 py-2 xl:order-3 ${showDisplayControls ? "xl:ml-0" : ""}`}>
          {addAction && <CollectionActions {...addAction} />}
          <ThemeToggle />{accountMenu}
        </div>
      </div>
    </nav>
  );
}
