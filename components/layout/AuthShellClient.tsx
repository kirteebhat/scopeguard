"use client";

import React, { useTransition } from "react";
import { AppShell } from "./AppShell";
import { logoutAction } from "@/app/actions/auth";

interface AuthShellClientProps {
  children: React.ReactNode;
  workspaceName?: string;
  userEmail?: string;
  userRole?: string;
}

export function AuthShellClient({
  children,
  workspaceName,
  userEmail,
  userRole,
}: AuthShellClientProps) {
  const [, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <AppShell
      workspaceName={workspaceName}
      userEmail={userEmail}
      userRole={userRole}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}

