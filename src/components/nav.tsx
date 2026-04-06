"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const links = [
  { href: "/katalog", label: "Katalog" },
  { href: "/soupravy", label: "Soupravy" },
  { href: "/lokomotivy", label: "Lokomotivy" },
  { href: "/vozy", label: "Vozy" },
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
  { value: "ČD", logo: "/img/logo-cd.svg", label: "ČD" },
  { value: "ČSD", logo: "/img/logo-csd.svg", label: "ČSD" },
  { value: "ÖBB", logo: "/img/logo-obb.svg", label: "ÖBB" },
  { value: "RJ", logo: "/img/logo-rj.svg", label: "RJ" },
];

export function Nav() {
  return (
    <Suspense>
      <NavInner />
    </Suspense>
  );
}

function NavInner() {
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
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {links.map((link) => {
            const isActive =
              pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {isKatalog && (
            <>
              <div className="flex gap-1">
                {catalogFilters.map((f) => (
                  <Link
                    key={f.value}
                    href={catalogHref({ typ: f.value || null })}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      currentTyp === f.value
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
              <div className="flex gap-1 border-l border-gray-200 pl-3">
                <Link
                  href={catalogHref({ op: null })}
                  className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                    !currentOp
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {f.logo ? (
                      <img
                        src={f.logo}
                        alt={f.label}
                        className="shrink-0"
                        style={{ height: 12, width: "auto", filter: currentOp === f.value ? "brightness(10)" : "none" }}
                      />
                    ) : (
                      f.label
                    )}
                  </Link>
                ))}
              </div>
              <Link
                href={catalogHref({ barvy: showColors ? null : "1" })}
                className="flex items-center gap-1.5 border-l border-gray-200 pl-3 text-xs text-gray-500 hover:text-gray-700"
              >
                <span
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded border ${
                    showColors
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300"
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
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
            >
              {addButton.label}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
