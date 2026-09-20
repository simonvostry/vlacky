import { requireUser } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { getDecoders } from "@/lib/decoder-storage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DccPage() {
  await requireUser();
  const [vehicles, decoders] = await Promise.all([
    db.select().from(schema.vehicles).all(), getDecoders(),
  ]);
  const vehiclesWithDcc = vehicles.flatMap(v => {
    const installed = decoders.filter(d => d.vehicleId === v.id);
    const addresses = new Set([v.dccAddress, ...installed.map(d => d.address ?? v.dccAddress)]);
    return [...addresses].filter((a): a is number => a !== null).map(address => ({
      ...v, dccAddress: address,
      decoderNames: installed.filter(d => (d.address ?? v.dccAddress) === address).map(d => d.name).join(", "),
    }));
  }).sort((a, b) => a.dccAddress - b.dccAddress);

  // Check for address conflicts
  const addressMap = new Map<number, (typeof vehiclesWithDcc)>();
  for (const v of vehiclesWithDcc) {
    if (v.dccAddress === null) continue;
    const existing = addressMap.get(v.dccAddress) || [];
    existing.push(v);
    addressMap.set(v.dccAddress, existing);
  }
  const conflicts = [...addressMap.entries()].filter(
    ([, vehicles]) => vehicles.length > 1
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">DCC adresy</h1>

      {/* Conflicts warning */}
      {conflicts.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-danger-soft p-4">
          <h2 className="font-semibold text-danger">
            Sdílené adresy ({conflicts.length})
          </h2>
          <p className="mt-1 text-xs text-danger">Sdílená adresa může být záměrná, například u osvětlení vozů. Ověřte ji před jízdou.</p>
          <ul className="mt-2 space-y-1 text-sm text-danger">
            {conflicts.map(([address, vehicles]) => (
              <li key={address}>
                Adresa <span className="font-mono font-bold">{address}</span>:{" "}
                {vehicles
                  .map((v) => `${v.operator} ${v.designation}`)
                  .join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vehicle DCC addresses */}
      <div className="rounded-lg border border-divider">
        <h2 className="border-b border-divider px-4 py-3 font-semibold">
          Přehled DCC adres
        </h2>
        {vehiclesWithDcc.length === 0 ? (
          <p className="px-4 py-8 text-center text-secondary">
            Žádná vozidla nemají přiřazenou DCC adresu
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs uppercase text-secondary">
                <th className="px-4 py-2">Adresa</th>
                <th className="px-4 py-2">Označení</th>
                <th className="px-4 py-2">Dopravce</th>
                <th className="px-4 py-2">Typ</th>
              </tr>
            </thead>
            <tbody>
              {vehiclesWithDcc.map((v) => (
                <tr
                  key={`${v.id}:${v.dccAddress}`}
                  className="border-b border-divider hover:bg-subtle"
                >
                  <td className="px-4 py-2 font-mono font-bold">
                    {v.dccAddress}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/${v.type === "loco" ? "lokomotivy" : "vozy"}/${v.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {v.designation}
                    </Link>
                    {v.decoderNames && <p className="text-xs text-secondary">{v.decoderNames}</p>}
                  </td>
                  <td className="px-4 py-2 text-secondary">{v.operator}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                        v.type === "loco"
                          ? "bg-primary text-white"
                          : "bg-muted text-secondary"
                      }`}
                    >
                      {v.type === "loco" ? "Lok" : "Vůz"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
