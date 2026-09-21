import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { AccountMenu } from "@/components/account-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { getAuthorizedSession } from "@/lib/auth-guards";
import { themeBootstrap } from "@/lib/theme";
import { trainDisplayBootstrap } from "@/lib/train-display";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Vlacky — Sbírka modelů",
  description: "Správa sbírky modelových vlaků a kolejiště",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthorizedSession();
  return (
    <html lang="cs" data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap + trainDisplayBootstrap }} /></head>
      <body className="bg-canvas text-foreground antialiased">
        {session && <Nav accountMenu={
          <AccountMenu name={session.user?.name} image={session.user?.image}>
            <SignOutButton />
          </AccountMenu>
        } />}
        {!session && <div className="absolute right-4 top-4"><ThemeToggle /></div>}
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
