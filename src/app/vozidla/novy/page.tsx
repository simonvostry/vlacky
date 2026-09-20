import { requireUser } from "@/lib/auth-guards";
import { VehicleForm } from "@/components/vehicle-form";

export default async function NewVehiclePage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nové vozidlo</h1>
      <VehicleForm />
    </div>
  );
}
