import { requireUser } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { VehicleForm } from "@/components/vehicle-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const vehicleId = parseInt(id, 10);
  if (isNaN(vehicleId)) notFound();

  const vehicle = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, vehicleId))
    .get();

  if (!vehicle) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/vozidla/${vehicle.id}`}
        className="mb-4 inline-block text-sm text-secondary hover:text-secondary"
      >
        &larr; Zpět
      </Link>
      <h1 className="mb-6 text-2xl font-bold">
        Upravit: {vehicle.designation}
      </h1>
      <VehicleForm
        vehicle={{
          id: vehicle.id,
          magneticCouplerA: vehicle.magneticCouplerA,
          magneticCouplerB: vehicle.magneticCouplerB,
          hasTailLights: vehicle.hasTailLights,
          hasSoundDecoder: vehicle.hasSoundDecoder,
          hasSpeaker: vehicle.hasSpeaker,
          isWeathered: vehicle.isWeathered,

          wagonVariantId: vehicle.wagonVariantId,
          hasLights: vehicle.hasLights,
          runningNumber: vehicle.runningNumber || "",
          designation: vehicle.designation,
          operator: vehicle.operator || "",
          type: vehicle.type,
          wagonKind: vehicle.wagonKind,
          catalogId: vehicle.catalogId,
          catalogImageId: vehicle.catalogImageId,
          classType: vehicle.classType || "",
          imagePath: vehicle.imagePath || "",
          imageWidth: vehicle.imageWidth,
          imageHeight: vehicle.imageHeight,
          manufacturer: vehicle.manufacturer || "",
          catalogNumber: vehicle.catalogNumber || "",
          dccAddress: vehicle.dccAddress,
          isTemplate: vehicle.isTemplate,
          notes: vehicle.notes || "",
        }}
      />
    </div>
  );
}
