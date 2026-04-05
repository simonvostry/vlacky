import { db, schema } from "@/db";
import { eq, isNotNull } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DccPage() {
  // Vehicles with DCC addresses
  const vehiclesWithDcc = db
    .select()
    .from(schema.vehicles)
    .where(isNotNull(schema.vehicles.dccAddress))
    .orderBy(schema.vehicles.dccAddress)
    .all();

  // Check for address conflicts
  const addressMap = new Map<number, typeof vehiclesWithDcc>();
  for (const v of vehiclesWithDcc) {
    if (v.dccAddress === null) continue;
    const existing = addressMap.get(v.dccAddress) || [];
    existing.push(v);
    addressMap.set(v.dccAddress, existing);
  }
  const conflicts = [...addressMap.entries()].filter(
    ([, vehicles]) => vehicles.length > 1
  );

  // All lighting decoder addresses from train_vehicles
  const lightingAddresses = db
    .select({
      lightingDecoderAddress: schema.trainVehicles.lightingDecoderAddress,
      vehicleDesignation: schema.vehicles.designation,
      vehicleOperator: schema.vehicles.operator,
      trainNumber: schema.trains.number,
      trainName: schema.trains.name,
    })
    .from(schema.trainVehicles)
    .innerJoin(
      schema.vehicles,
      eq(schema.trainVehicles.vehicleId, schema.vehicles.id)
    )
    .innerJoin(
      schema.trains,
      eq(schema.trainVehicles.trainId, schema.trains.id)
    )
    .where(isNotNull(schema.trainVehicles.lightingDecoderAddress))
    .all();

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-6 text-2xl font-bold">DCC adresy</h1>

      {/* Conflicts warning */}
      {conflicts.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-800">
            Konflikty adres ({conflicts.length})
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
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
      <div className="rounded-lg border border-gray-200">
        <h2 className="border-b border-gray-200 px-4 py-3 font-semibold">
          Lokomotivy a vozidla s DCC
        </h2>
        {vehiclesWithDcc.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-400">
            Žádná vozidla nemají přiřazenou DCC adresu
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2">Adresa</th>
                <th className="px-4 py-2">Označení</th>
                <th className="px-4 py-2">Dopravce</th>
                <th className="px-4 py-2">Typ</th>
              </tr>
            </thead>
            <tbody>
              {vehiclesWithDcc.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-mono font-bold">
                    {v.dccAddress}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/vozidla/${v.id}`}
                      className="font-medium hover:text-blue-600"
                    >
                      {v.designation}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{v.operator}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                        v.type === "loco"
                          ? "bg-gray-800 text-white"
                          : "bg-gray-100 text-gray-600"
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

      {/* Lighting decoder addresses */}
      {lightingAddresses.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200">
          <h2 className="border-b border-gray-200 px-4 py-3 font-semibold">
            Osvětlovací dekodéry
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2">Adresa</th>
                <th className="px-4 py-2">Vozidlo</th>
                <th className="px-4 py-2">Vlak</th>
              </tr>
            </thead>
            <tbody>
              {lightingAddresses.map((la, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-mono font-bold">
                    {la.lightingDecoderAddress}
                  </td>
                  <td className="px-4 py-2">
                    {la.vehicleOperator} {la.vehicleDesignation}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {la.trainNumber} {la.trainName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
