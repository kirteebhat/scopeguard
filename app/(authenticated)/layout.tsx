import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShellClient } from "@/components/layout/AuthShellClient";

interface MemberRecord {
  workspace_id: string;
  role: string;
}

interface WorkspaceRecord {
  name: string;
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let workspaceName = "Acme Agency";
  let userRole = "owner";

  // Resolve user's workspace membership
  const memberQuery = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const member = memberQuery.data as MemberRecord | null;

  if (member) {
    userRole = member.role;
    const wsQuery = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", member.workspace_id)
      .maybeSingle();

    const ws = wsQuery.data as WorkspaceRecord | null;
    if (ws) {
      workspaceName = ws.name;
    }
  } else {
    // If user has no workspace yet, auto-provision from metadata or fallback
    const defaultName =
      (user.user_metadata?.default_workspace_name as string) || "My Agency";
    const rpcClient = supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>;
    };
    const { data: createdWs } = await rpcClient.rpc("create_workspace", {
      name: defaultName,
    });
    if (createdWs) {
      workspaceName = (createdWs as { name: string }).name || defaultName;
      userRole = "owner";
    }
  }

  return (
    <AuthShellClient
      workspaceName={workspaceName}
      userEmail={user.email || ""}
      userRole={userRole}
    >
      {children}
    </AuthShellClient>
  );
}
