import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScopeGuard - Eliminate Scope Creep",
  description:
    "Protect project budgets, track change orders, and capture client approvals seamlessly.",
};

const themeScript = `(function() {
  try {
    var stored = localStorage.getItem('scopeguard-theme');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}

