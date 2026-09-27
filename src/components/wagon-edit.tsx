import type { WagonEditMode } from "@/lib/vehicle-edit-fields";
import { modelManufacturerOptions } from "@/lib/manufacturer-storage";
import { vehicleSection } from "@/lib/vehicle-kind";
import { requireUser } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { VehicleForm } from "@/components/vehicle-form";
import Link from "next/link";


export default async function EditVehiclePage({
  params, kind, mode = "model",
}: {
  kind: "passenger" | "freight";
  mode?: WagonEditMode;
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

  if (!vehicle || vehicle.type !== "wagon") notFound();
  if (vehicle.wagonKind !== kind) redirect(`/${vehicleSection(vehicle)}/${vehicle.id}/${mode === "piece" ? "kus/" : ""}upravit`);

  const catalog = mode === 'model' ? await db.select({id: schema.vehicleCatalog.id, designation: schema.vehicleCatalog.fullDesignation, operator: schema.vehicleCatalog.operator}).from(schema.vehicleCatalog).orderBy(schema.vehicleCatalog.operator, schema.vehicleCatalog.fullDesignation).all() : [];
  const images = mode === 'model' ? await db.select({id: schema.catalogImages.id, catalogId: schema.catalogImages.catalogId, label: schema.catalogImages.label}).from(schema.catalogImages).orderBy(schema.catalogImages.sortOrder).all() : [];
  const imagesByCatalog = new Map<number, {id: number; label: string}[]>();
  for (const image of images) {
    const group = imagesByCatalog.get(image.catalogId) ?? [];
    group.push({id: image.id, label: image.label || `Varianta #${image.id}`});
    imagesByCatalog.set(image.catalogId, group);
  }
  const catalogReferences = catalog.map(c => ({ id: c.id, label: `${c.operator} · ${c.designation} (#${c.id})`,
    images: imagesByCatalog.get(c.id) ?? [] }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${vehicleSection(vehicle)}/${vehicle.id}`}
        className="mb-4 inline-block text-sm text-secondary hover:text-secondary"
      >
        &larr; Zpět
      </Link>
      <h1 className="mb-6 text-2xl font-bold">
        {mode === "model" ? `Upravit variantu: ${vehicle.designation}` : `Upravit kus #${vehicle.id} · ${vehicle.designation}`}
      </h1>
      <VehicleForm key={`${vehicle.id}-${mode}`} editMode={mode} catalogReferences={catalogReferences} manufacturers={mode === "model" ? await modelManufacturerOptions() : []}
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
          lengthOverBuffersMm: vehicle.lengthOverBuffersMm,
          epochs: vehicle.epochs, epochNotes: vehicle.epochNotes,
          dccAddress: vehicle.dccAddress,
          isTemplate: vehicle.isTemplate,
          notes: vehicle.notes || "",
        }}
      />
    </div>
  );
}
