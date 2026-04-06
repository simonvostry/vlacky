import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { ClassBadge } from "@/components/class-badge";
import { OperatorLogo } from "@/components/operator-logo";
import Link from "next/link";

const SCALE = 0.75;

export const dynamic = "force-dynamic";

export default async function VozyPage() {
  const allVehicles = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.type, "wagon"))
    .orderBy(schema.vehicles.designation)
    .all() as any[];

  return (
    <div>
      {allVehicles.length === 0 ? (
        <p className="py-12 text-center text-gray-400">
          Zatím žádné vozy. Přidejte první!
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" style={{ overflow: "auto" }}>
          {allVehicles.map((v: any) => {
            const scaledW = Math.round((v.imageWidth || 264) * SCALE);
            const tileWidth = scaledW + 24;
            return (
              <Link
                key={v.id}
                href={`/vozy/${v.id}`}
                className="group flex shrink-0 flex-col justify-center rounded border border-gray-100 px-2 py-2 transition-colors hover:bg-blue-50"
                style={{ width: tileWidth }}
              >
                {v.imagePath && (
                  <div className="mb-1 flex items-end justify-center">
                    <img
                      src={v.imagePath}
                      alt={v.designation}
                      width={v.imageWidth || 264}
                      height={v.imageHeight || 41}
                      className="block shrink-0"
                      style={{
                        width: scaledW,
                        height: Math.round((v.imageHeight || 41) * SCALE),
                        maxWidth: "none",
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
                {v.dccAddress && (
                  <div className="text-center text-[10px] text-gray-400">
                    DCC: {v.dccAddress}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
