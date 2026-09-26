import { vehicleSection } from "@/lib/vehicle-kind";
import type { DecoderConfig } from "@/lib/decoder-config";
import Image from "@/components/vehicle-image";
import Link from "next/link";
import type { trains, vehicles } from "@/db/schema";
import { ClassBadge } from "./class-badge";
import { OperatorLogo } from "./operator-logo";

type Train = typeof trains.$inferSelect;
type Vehicle = Pick<typeof vehicles.$inferSelect,
  "wagonKind" | "id" | "designation" | "operator" | "type" | "classType" | "imagePath" |
  "imageWidth" | "imageHeight" | "manufacturer" | "catalogNumber" | "dccAddress">;

export function TrainDetailsPanel({ train, vehicles: composition, decoders = [], closeHref = "/soupravy" }: {
  decoders?: (DecoderConfig & { vehicleId: number })[];
  train: Train;
  closeHref?: string;
  vehicles: {
    position: number;
    notes: string | null;
    vehicle: Vehicle;
  }[];
}) {
  const locomotives = composition.filter(row => row.vehicle.type === "loco").length;
  const wagons = composition.length - locomotives;

  return (
    <section aria-label="Detail soupravy" className="overflow-hidden rounded-xl border border-divider bg-surface">
      <header className="border-b border-divider px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">
              {[train.category, train.number].filter(Boolean).join(" ") || "Souprava"}
              {train.name && <span className="ml-2 text-sm font-normal text-secondary">{train.name}</span>}
            </h2>
          </div>
          <Link href={closeHref} scroll={false} aria-label="Zavřít detail soupravy"
            className="-mr-1 -mt-1 rounded-md p-1.5 text-secondary hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </Link>
        </div>
        {train.route && <p className="mt-1 text-xs leading-4 text-secondary">{train.route}</p>}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-secondary">
          {train.era && <span>{train.era}</span>}
          <span>Lokomotivy <strong className="text-foreground">{locomotives}</strong></span>
          <span>Vozy <strong className="text-foreground">{wagons}</strong></span>
        </div>
        {train.notes && (
          <details className="mt-2 text-[11px] text-secondary">
            <summary className="w-fit cursor-pointer hover:text-foreground">Poznámka k soupravě</summary>
            <p className="mt-1 whitespace-pre-line leading-4">{train.notes}</p>
          </details>
        )}
      </header>

      <div className="px-4 pb-1 pt-2">
        <h3 className="text-[10px] font-medium uppercase tracking-wide text-secondary">Řazení od čela vlaku</h3>
      </div>
      {composition.length === 0 ? (
        <p className="px-5 py-8 text-sm text-secondary">Žádná vozidla v soupravě.</p>
      ) : (
        <ol className="divide-y divide-divider px-2">
          {composition.map(row => {
            const vehicle = row.vehicle;
            const dcc = vehicle.dccAddress;
            const vehicleDecoders = decoders.filter(d => d.vehicleId === vehicle.id);
            const imageWidth = vehicle.imageWidth || (vehicle.type === "loco" ? 169 : 264);
            const imageHeight = vehicle.imageHeight || (vehicle.type === "loco" ? 58 : 41);
            return (
              <li key={row.position}>
                <Link href={`/${vehicleSection(vehicle)}/${vehicle.id}`}
                  aria-label={`${vehicle.type === "loco" ? "Lokomotiva" : "Vůz"} ${[vehicle.operator, vehicle.designation].filter(Boolean).join(" ")}`}
                  className="group flex gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus">
                  <span className="flex h-5 w-4 shrink-0 items-center justify-center text-[10px] tabular-nums text-secondary">{row.position}</span>
                  <div className="min-w-0 flex-1">
                    <div data-vehicle-label-row className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span data-vehicle-label="operator" className="inline-flex"><OperatorLogo operator={vehicle.operator} height={12} /></span>
                      <span data-vehicle-label="type" className="text-xs font-semibold group-hover:text-accent">{vehicle.designation}</span>
                      <span data-vehicle-label="class" className="inline-flex"><ClassBadge classType={vehicle.classType} size="xs" short /></span>
                      {row.notes && /^Číslo vozu:/.test(row.notes) && (
                        <span data-vehicle-label="number" className="ml-auto text-[11px] text-secondary" title={row.notes}>
                          <span className="sr-only">Číslo vozu: </span>{row.notes.replace(/^Číslo vozu:\s*/, "")}
                        </span>
                      )}
                    </div>
                    <span className="sr-only">{vehicle.type === "loco" ? "Lokomotiva" : "Vůz"}</span>
                    {vehicle.imagePath && (
                      <div className="mt-1 overflow-x-auto">
                        <Image unoptimized src={vehicle.imagePath} alt={vehicle.designation}
                          width={imageWidth} height={imageHeight}
                          style={{ width: Math.round(imageWidth * 0.75), height: Math.round(imageHeight * 0.75), maxWidth: "none" }} />
                      </div>
                    )}
                    {row.notes && !/^Číslo vozu:/.test(row.notes) && (
                      <p className="mt-0.5 whitespace-pre-line text-[11px] leading-4 text-secondary">{row.notes}</p>
                    )}
                    {(vehicle.manufacturer || vehicle.catalogNumber || dcc != null) && (
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] leading-4 text-secondary">
                        {(vehicle.manufacturer || vehicle.catalogNumber) && <span>{[vehicle.manufacturer, vehicle.catalogNumber].filter(Boolean).join(" · ")}</span>}
                        {dcc != null && <span>DCC {dcc}</span>}

                      </div>
                    )}
                  </div>
                </Link>
                {!!vehicleDecoders.length && <details className="mb-1 ml-8 mr-2 text-[10px] text-secondary">
                  <summary className="cursor-pointer py-0.5 hover:text-accent">Dekodéry a funkce ({vehicleDecoders.reduce((n, d) => n + d.functions.length, 0)})</summary>
                  {vehicleDecoders.map(d => <div key={d.id} className="mb-1 rounded bg-subtle p-1.5">
                    <p className="font-medium text-foreground">{d.name} · DCC {d.address ?? dcc ?? "—"}</p>
                    {d.functions.map(f => <p key={f.functionNumber} title={f.description}><strong className="font-mono">F{f.functionNumber}</strong> {f.label}{f.behavior === "momentary" ? " (podržet)" : ""}</p>)}
                    {!d.functions.length && <p>Funkce nevyplněny</p>}
                  </div>)}
                </details>}
              </li>
            );
          })}
        </ol>
      )}
      <footer className="border-t border-divider p-2">
        <Link href={`/soupravy/${train.id}`} className="ui-button ui-button-secondary w-full">
          Otevřít soupravu
        </Link>
      </footer>
    </section>
  );
}
