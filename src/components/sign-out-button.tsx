import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form action={async () => {
      "use server";
      await signOut({ redirectTo: "/prihlaseni" });
    }}>
      <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-focus">
        Odhlásit se
      </button>
    </form>
  );
}
