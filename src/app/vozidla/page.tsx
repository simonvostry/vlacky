import { requireUser } from "@/lib/auth-guards";
import { redirect } from "next/navigation";

export default async function VozidlaRedirect() {
  await requireUser();
  redirect("/lokomotivy");
}
