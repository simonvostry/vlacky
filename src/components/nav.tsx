"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Vozidla" },
  { href: "/vlaky", label: "Vlakové soupravy" },
  { href: "/dcc", label: "DCC" },
];

const addButtons: Record<string, { href: string; label: string }> = {
  "/": { href: "/vozidla/novy", label: "+ Přidat vozidlo" },
  "/vlaky": { href: "/vlaky/novy", label: "+ Přidat vlak" },
};

export function Nav() {
  const pathname = usePathname();

  const addButton = Object.entries(addButtons).find(([path]) =>
    path === "/" ? pathname === "/" : pathname === path
  )?.[1];

  return (
    <nav className="border-b border-gray-200">
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
        {addButton && (
          <Link
            href={addButton.href}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            {addButton.label}
          </Link>
        )}
      </div>
    </nav>
  );
}
