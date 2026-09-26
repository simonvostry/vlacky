import { WagonCollection } from "@/components/wagon-collection";
import type { CollectionSearch } from "@/lib/collection-filters";
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<CollectionSearch> }) {
  return <WagonCollection kind="passenger" searchParams={searchParams} />;
}
