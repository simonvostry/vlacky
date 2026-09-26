import { requireUser } from "@/lib/auth-guards";
import { VehicleForm } from "@/components/vehicle-form";

export default async function NewWagonPage({
  searchParams, kind,
}: {
  kind: "passenger" | "freight";
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const params = await searchParams;

  const prefill = {
    designation: params.designation || "",
    operator: params.operator || "",
    type: "wagon",
    wagonKind: kind,
    classType: params.classType || "",
    imagePath: params.imagePath || "",
    imageWidth: params.imageWidth ? parseInt(params.imageWidth) : null,
    imageHeight: params.imageHeight ? parseInt(params.imageHeight) : null,
    manufacturer: "",
    catalogNumber: "",
    dccAddress: null as number | null,
    notes: "",
    catalogId: params.catalogId ? parseInt(params.catalogId) : null,
    catalogImageId: params.catalogImageId ? parseInt(params.catalogImageId) : null,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{prefill.wagonKind === "freight" ? "Nový nákladní vůz" : "Nový osobní vůz"}</h1>
      <VehicleForm vehicle={prefill} />
    </div>
  );
}
