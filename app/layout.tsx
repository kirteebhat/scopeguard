import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScopeGuard - Eliminate Scope Creep",
  description:
    "Protect project budgets, track change orders, and capture client approvals seamlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

