import { VehicleForm } from "@/components/vehicle-form";

export default async function NewWagonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const prefill = params.catalogId
    ? {
        designation: params.designation || "",
        operator: params.operator || "",
        type: params.type || "wagon",
        classType: params.classType || "",
        imagePath: params.imagePath || "",
        imageWidth: params.imageWidth ? parseInt(params.imageWidth) : null,
        imageHeight: params.imageHeight ? parseInt(params.imageHeight) : null,
        manufacturer: "",
        catalogNumber: "",
        dccAddress: null as number | null,
        notes: "",
        catalogId: parseInt(params.catalogId),
        catalogImageId: params.catalogImageId ? parseInt(params.catalogImageId) : null,
      }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nový vůz</h1>
      <VehicleForm vehicle={prefill} />
    </div>
  );
}
