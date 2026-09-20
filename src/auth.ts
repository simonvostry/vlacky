import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedEmail, isAllowedGoogleAccount } from "@/lib/auth-policy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google({ authorization: { params: { prompt: "select_account" } } })],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/prihlaseni", error: "/prihlaseni" },
  callbacks: {
    signIn({ account, profile }) {
      return isAllowedGoogleAccount(account?.provider, profile?.email, profile?.email_verified);
    },
    jwt({ token, account, profile }) {
      if (account) {
        if (!isAllowedGoogleAccount(account.provider, profile?.email, profile?.email_verified)) return null;
        token.email = profile!.email;
        token.googleEmailVerified = true;
      }
      // Recheck on every session read so changing the allowlist revokes access.
      if (token.googleEmailVerified !== true || !isAllowedEmail(token.email)) return null;
      return token;
    },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      // These exact read-only endpoints enforce their own mandatory bearer token.
      if (path === "/api/mcp" || path === "/api/integrations/v1/snapshot" || /^\/api\/integrations\/v1\/images\/[1-9]\d*$/.test(path)) return true;
      if (request.nextUrl.pathname === "/prihlaseni") return true;
      if (isAllowedEmail(session?.user?.email)) return true;
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/prihlaseni", request.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
      return Response.redirect(loginUrl);
    },
  },
});
