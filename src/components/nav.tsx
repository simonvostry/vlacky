"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const links = [
  { href: "/", label: "Vozidla" },
  { href: "/vlaky", label: "Vlakové soupravy" },
  { href: "/katalog", label: "Katalog" },
  { href: "/dcc", label: "DCC" },
];

const addButtons: Record<string, { href: string; label: string }> = {
  "/": { href: "/vozidla/novy", label: "+ Přidat vozidlo" },
  "/vlaky": { href: "/vlaky/novy", label: "+ Přidat vlak" },
};

const catalogFilters = [
  { value: "", label: "Vše" },
  { value: "loco", label: "Lokomotivy" },
  { value: "wagon", label: "Vozy" },
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
  const showColors = searchParams.get("barvy") === "1";

  function filterHref(typ: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (typ) {
      params.set("typ", typ);
    } else {
      params.delete("typ");
    }
    const qs = params.toString();
    return `/katalog${qs ? `?${qs}` : ""}`;
  }

  function colorsHref() {
    const params = new URLSearchParams(searchParams.toString());
    if (showColors) {
      params.delete("barvy");
    } else {
      params.set("barvy", "1");
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
              link.href === "/"
                ? pathname === "/" || pathname.startsWith("/vozidla")
                : pathname.startsWith(link.href);
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
                    href={filterHref(f.value)}
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
              <Link
                href={colorsHref()}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  showColors
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                Barvy
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
