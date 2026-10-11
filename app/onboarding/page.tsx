import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/data/auth-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { UnauthorizedError } from "@/lib/data/errors";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ShieldCheck } from "lucide-react";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = {
  title: "Create Workspace - ScopeGuard",
  description: "Set up your agency workspace on ScopeGuard.",
};

export default async function OnboardingPage() {
  let user;

  try {
    const authData = await requireAuthUser();
    user = authData.user;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login?next=/onboarding");
    }
    throw error;
  }

  // Check if user already belongs to a workspace
  const adminClient = createServiceRoleClient();
  const { data: member } = await adminClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (member) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            ScopeGuard
          </span>
        </div>

        <Card className="shadow-md border-slate-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold text-slate-900">
              Welcome to ScopeGuard
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 mt-1">
              Create your agency workspace to start managing client project scopes, change requests, and approval records.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <OnboardingForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Signed in as <span className="font-semibold text-slate-700">{user.email}</span>
        </p>
      </div>
    </div>
  );
}

