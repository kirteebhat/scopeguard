import React from "react";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { AuthShellClient } from "@/components/layout/AuthShellClient";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolves user session, active workspace, and role via server data access layer.
  // Automatically redirects to /login if unauthenticated, or to /onboarding if no workspace exists.
  const { user, workspace, role } = await getWorkspaceContextOrRedirect();

  return (
    <AuthShellClient
      workspaceName={workspace.name}
      userEmail={user.email}
      userRole={role}
    >
      {children}
    </AuthShellClient>
  );
}
