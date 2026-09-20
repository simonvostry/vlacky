"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { OperatorLogo } from "./operator-logo";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/soupravy", label: "Soupravy" },
  { href: "/lokomotivy", label: "Lokomotivy" },
  { href: "/vozy", label: "Vozy" },
  { href: "/katalog", label: "Katalog" },
  { href: "/dcc", label: "DCC" },
];

const addButtons: Record<string, { href: string; label: string }> = {
  "/lokomotivy": { href: "/lokomotivy/novy", label: "+ Přidat lokomotivu" },
  "/vozy": { href: "/vozy/novy", label: "+ Přidat vůz" },
  "/soupravy": { href: "/soupravy/novy", label: "+ Přidat soupravu" },
};

const catalogFilters = [
  { value: "", label: "Vše" },
  { value: "loco", label: "Lokomotivy" },
  { value: "wagon", label: "Vozy" },
];

const operatorFilters = [
  { value: "ČD" },
  { value: "ČSD" },
  { value: "ÖBB" },
  { value: "RJ" },
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

  const addButton = Object.entries(addButtons).find(([path]) =>
    path === "/" ? pathname === "/" : pathname === path
  )?.[1];

  const isKatalog = pathname === "/katalog";
  const currentTyp = searchParams.get("typ") || "";
  const currentOp = searchParams.get("op") || "";
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
        <Link href="/soupravy" className="order-1 mr-2 text-xl font-semibold tracking-tight">Vlacky</Link>
        <div className="order-4 flex w-full justify-between gap-3 sm:order-1 sm:w-auto sm:justify-start sm:gap-6">
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
        {(isKatalog || addButton) && <div className="order-4 flex w-full flex-wrap items-center gap-3 pb-3 xl:order-2 xl:ml-auto xl:w-auto xl:pb-0">
          {isKatalog && (
            <>
              <div className="flex gap-1">
                {catalogFilters.map((f) => (
                  <Link
                    key={f.value}
                    href={catalogHref({ typ: f.value || null })}
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
              <div className="flex gap-1 border-l border-divider pl-3">
                <Link
                  href={catalogHref({ op: null })}
                  className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                    !currentOp
                      ? "bg-primary text-white"
                      : "bg-muted text-secondary hover:bg-selected"
                  }`}
                >
                  Vše
                </Link>
                {operatorFilters.map((f) => (
                  <Link
                    key={f.value}
                    href={catalogHref({ op: currentOp === f.value ? null : f.value })}
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                      currentOp === f.value
                        ? "bg-primary text-white"
                        : "bg-muted text-secondary hover:bg-selected"
                    }`}
                  >
                    <OperatorLogo
                      operator={f.value}
                      height={12}
                      inverted={currentOp === f.value}
                    />
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
          {addButton && (
            <Link
              href={addButton.href}
              className="ui-button ui-button-primary"
            >
              {addButton.label}
            </Link>
          )}
        </div>}
        <div className="order-2 ml-auto flex items-center gap-2 py-2 xl:order-3"><ThemeToggle />{accountMenu}</div>
      </div>
    </nav>
  );
}
