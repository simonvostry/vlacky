import Link from "next/link";
import { PlusIcon } from "@heroicons/react/20/solid";

export function CollectionActions({ href, label }: { href: string; label: string }) {
  return (
    <div className="mb-2 flex justify-end">
      <Link href={href} aria-label={label} title={label} className="ui-button text-accent hover:bg-muted">
        <PlusIcon className="size-4" aria-hidden="true" />
        Přidat
      </Link>
    </div>
  );
}
