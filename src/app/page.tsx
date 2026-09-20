import { requireUser } from "@/lib/auth-guards";
import { redirect } from "next/navigation";

export default async function Home() {
  await requireUser();
  redirect("/soupravy");
}
