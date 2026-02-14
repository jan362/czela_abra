import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Flexi Operations - ABRA Flexi",
  description: "Účetní operace s ABRA Flexi API",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="cs">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <div className="flex min-h-screen">
            {session && <Sidebar />}
            <main className={session ? "flex-1 p-8" : "flex-1"}>
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
