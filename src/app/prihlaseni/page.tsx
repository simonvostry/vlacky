import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getAuthorizedSession } from "@/lib/auth-guards";
import { isGoogleLoginConfigured, safeReturnPath } from "@/lib/auth-policy";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.callbackUrl);
  if (await getAuthorizedSession()) redirect(returnTo);
  const configured = isGoogleLoginConfigured();

  async function login() {
    "use server";
    if (!isGoogleLoginConfigured()) redirect("/prihlaseni?error=Configuration");
    try {
      await signIn("google", { redirectTo: returnTo });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/prihlaseni?error=${error.type === "AccessDenied" ? "AccessDenied" : "Signin"}`);
      }
      throw error;
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-xl border border-divider bg-surface p-8 shadow-sm">
        <div className="mb-6 text-4xl" aria-hidden="true">🚂</div>
        <h1 className="text-2xl font-bold">Vlacky</h1>
        <p className="mt-2 text-sm text-secondary">Soukromá sbírka modelových vlaků.</p>
        <p className="mt-6 text-sm text-secondary">Pro pokračování se přihlaste svým povoleným Google účtem.</p>
        {params.error && configured && (
          <p role="alert" className="mt-4 rounded-md bg-danger-soft p-3 text-sm text-danger">
            {params.error === "AccessDenied"
              ? "Tento Google účet nemá přístup. Zkuste se přihlásit jiným účtem."
              : "Přihlášení se nepodařilo. Zkuste to prosím znovu."}
          </p>
        )}
        {configured ? (
          <form action={login} className="mt-6">
            <button type="submit" className="ui-button ui-button-primary w-full">
              Přihlásit se přes Google
            </button>
          </form>
        ) : (
          <p role="status" className="mt-6 rounded-md bg-subtle p-3 text-sm text-secondary">
            Přihlášení zatím není dostupné. Zkuste to prosím později.
          </p>
        )}
      </section>
    </div>
  );
}
