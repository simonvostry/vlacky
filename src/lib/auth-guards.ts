import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedEmail } from "./auth-policy";

export const getAuthorizedSession = cache(async () => {
  const session = await auth();
  return isAllowedEmail(session?.user?.email) ? session : null;
});

export async function requireUser() {
  const session = await getAuthorizedSession();
  if (!session) redirect("/prihlaseni");
  return session;
}

export async function authorizeApiRequest(): Promise<Response | null> {
  if (await getAuthorizedSession()) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
