"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { NotificationPanel } from "./NotificationPanel";

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleCloseMobileNav = React.useCallback(() => setIsMobileNavOpen(false), []);
  const handleOpenMobileNav = React.useCallback(() => setIsMobileNavOpen(true), []);

  const handleOpenCommandPalette = React.useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const handleOpenNotifications = React.useCallback(() => {
    setIsNotificationsOpen(true);
    setUnreadCount(0);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
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
              onOpenCommandPalette={handleOpenCommandPalette}
              onOpenNotifications={handleOpenNotifications}
              unreadCount={unreadCount}
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

        {/* Global Modals & Drawers */}
        <CommandPalette
          open={isCommandPaletteOpen}
          onOpenChange={setIsCommandPaletteOpen}
        />
        <KeyboardShortcutsModal
          open={isShortcutsOpen}
          onOpenChange={setIsShortcutsOpen}
        />
        <NotificationPanel
          open={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onMarkAllAsRead={() => setUnreadCount(0)}
        />
      </div>
    </ToastProvider>
  );
}

