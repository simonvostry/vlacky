import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TrainForm } from "@/components/train-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditTrainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainId = parseInt(id, 10);
  if (isNaN(trainId)) notFound();

  const train = await db
    .select()
    .from(schema.trains)
    .where(eq(schema.trains.id, trainId))
    .get();

  if (!train) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/soupravy/${train.id}`}
        className="mb-4 inline-block text-sm text-gray-400 hover:text-gray-600"
      >
        &larr; Zpět
      </Link>
      <h1 className="mb-6 text-2xl font-bold">
        Upravit: {train.category} {train.number} {train.name}
      </h1>
      <TrainForm
        train={{
          id: train.id,
          number: train.number || "",
          name: train.name || "",
          category: train.category || "",
          route: train.route || "",
          era: train.era || "",
          notes: train.notes || "",
        }}
      />
    </div>
  );
}
