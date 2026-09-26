import { requireUser } from "@/lib/auth-guards";
import { TrainForm } from "@/components/train-form";

export default async function NewTrainPage({ searchParams }: { searchParams: Promise<{ druh?: string }> }) {
  await requireUser();
  const kind = (await searchParams).druh === "freight" ? "freight" : "passenger";
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nový vlak</h1>
      <TrainForm kind={kind} />
    </div>
  );
}
