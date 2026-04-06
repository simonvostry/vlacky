import { db, schema } from "@/db";
import { ClassBadge } from "@/components/class-badge";
import { OperatorLogo } from "@/components/operator-logo";
import Link from "next/link";

const SCALE = 0.75;

export const dynamic = "force-dynamic";

export default function VehiclesPage() {
  const allVehicles = db
    .select()
    .from(schema.vehicles)
    .orderBy(schema.vehicles.type, schema.vehicles.designation)
    .all();

  return (
    <div>
      {allVehicles.length === 0 ? (
        <p className="py-12 text-center text-gray-400">
          Zatím žádná vozidla. Přidejte první!
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {allVehicles.map((v) => (
            <Link
              key={v.id}
              href={`/vozidla/${v.id}`}
              className="group relative rounded border border-gray-100 px-2 py-2 transition-colors hover:bg-blue-50"
            >
              <span
                className={`absolute top-1 right-1 rounded px-1 py-0 text-[9px] font-medium uppercase ${
                  v.type === "loco"
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {v.type === "loco" ? "Lok" : "Vůz"}
              </span>
              {v.imagePath && (
                <div className="mb-1 flex h-10 items-end justify-center">
                  <img
                    src={v.imagePath}
                    alt={v.designation}
                    width={v.imageWidth || 264}
                    height={v.imageHeight || 41}
                    className="block"
                    style={{
                      width: Math.round((v.imageWidth || 264) * SCALE),
                      height: Math.round((v.imageHeight || 41) * SCALE),
                    }}
                  />
                </div>
              )}
              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                <OperatorLogo operator={v.operator} height={12} />
                <span className="text-[12px] font-bold">{v.designation}</span>
                {v.classType && (
                  <ClassBadge classType={v.classType} size="xs" short />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
