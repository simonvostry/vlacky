import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Vlacky — Sbírka modelů",
  description: "Správa sbírky modelových vlaků a kolejiště",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="bg-white text-gray-900 antialiased">
        <Nav />
        <main className="px-4 py-2 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
