"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { ToastProvider } from "@/components/ui/Toast";

export interface AppShellProps {
  children: React.ReactNode;
  workspaceName?: string;
  userEmail?: string;
  userRole?: string;
  pageTitle?: string;
  onLogout?: () => void;
}

export function AppShell({
  children,
  workspaceName = "Acme Agency",
  userEmail = "founder@acme.agency",
  userRole = "owner",
  pageTitle,
  onLogout,
}: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const handleCloseMobileNav = React.useCallback(() => setIsMobileNavOpen(false), []);
  const handleOpenMobileNav = React.useCallback(() => setIsMobileNavOpen(true), []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Skip to Content link for Keyboard Accessibility */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <div className="flex flex-1">
          {/* Desktop Sidebar (hidden on mobile) */}
          <div className="hidden lg:block lg:flex-shrink-0">
            <Sidebar
              workspaceName={workspaceName}
              userEmail={userEmail}
              userRole={userRole}
              onLogout={onLogout}
            />
          </div>

          {/* Mobile Drawer */}
          <MobileNav
            isOpen={isMobileNavOpen}
            onClose={handleCloseMobileNav}
            workspaceName={workspaceName}
            userEmail={userEmail}
            userRole={userRole}
            onLogout={onLogout}
          />

          {/* Main Layout Area */}
          <div className="flex flex-1 flex-col min-w-0">
            <Header
              onOpenMobileNav={handleOpenMobileNav}
              workspaceName={workspaceName}
              pageTitle={pageTitle}
            />

            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none"
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

