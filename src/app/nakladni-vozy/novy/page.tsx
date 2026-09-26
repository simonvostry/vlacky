import NewWagon from "@/components/new-wagon";
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <NewWagon searchParams={searchParams} kind="freight" />;
}
