import PageContent from "@/components/wagon-detail";
export const dynamic = "force-dynamic";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PageContent params={params} kind="freight" />;
}
