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
        href={`/lokomotivy/${vehicle.id}`}
        className="mb-4 inline-block text-sm text-gray-400 hover:text-gray-600"
      >
        &larr; Zpět
      </Link>
      <h1 className="mb-6 text-2xl font-bold">
        Upravit: {vehicle.designation}
      </h1>
      <VehicleForm
        vehicle={{
          id: vehicle.id,
          designation: vehicle.designation,
          operator: vehicle.operator || "",
          type: vehicle.type,
          classType: vehicle.classType || "",
          imagePath: vehicle.imagePath || "",
          imageWidth: vehicle.imageWidth,
          imageHeight: vehicle.imageHeight,
          manufacturer: vehicle.manufacturer || "",
          catalogNumber: vehicle.catalogNumber || "",
          dccAddress: vehicle.dccAddress,
          notes: vehicle.notes || "",
        }}
      />
    </div>
  );
}
