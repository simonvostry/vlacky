import { TrainForm } from "@/components/train-form";

export default function NewTrainPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nový vlak</h1>
      <TrainForm />
    </div>
  );
}
