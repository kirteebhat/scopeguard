import React from "react";
import { Metadata } from "next";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Building, CreditCard, ShieldCheck, Info } from "lucide-react";
import { SettingsNav } from "./SettingsNav";
import { WorkspaceNameForm } from "./WorkspaceNameForm";

export const metadata: Metadata = {
  title: "Settings - ScopeGuard",
  description: "Manage agency workspace settings and configuration.",
};

export default async function SettingsPage() {
  const { workspace, role } = await getWorkspaceContextOrRedirect();
  const isOwner = role === "owner";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        description="Configure your agency profile, team access, and subscription configuration."
      />

      <SettingsNav />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Building className="w-4 h-4 text-indigo-600" />
              Agency Details
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Identifier slug: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">{workspace.slug}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceNameForm
              initialName={workspace.name}
              isOwner={isOwner}
            />
          </CardContent>
        </Card>

        {/* Subscription / Plan - Display metadata only */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-900">
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Subscription Plan
              </span>
              <Badge variant="info">
                {workspace.plan.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Account billing and workspace tier metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-600">
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-950">Display metadata only</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
                  No payment gateway or billing connection is active in this release. All features are fully unlocked for demonstration.
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Tier</span>
                <span className="font-semibold text-slate-800 capitalize">{workspace.plan} Tier</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Payment Status</span>
                <span className="font-medium text-slate-700">Not Connected</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Workspace Created</span>
                <span className="text-slate-700">
                  {new Date(workspace.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Access */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Access Boundaries & Security
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Hardened permissions enforced by the database and server data layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <p className="font-semibold text-slate-900">Row-Level Security (RLS)</p>
              <p className="mt-1 text-slate-500 leading-relaxed">
                Default-deny policy enforced on all database tables. Authenticated users can only read or write within their workspace.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <p className="font-semibold text-slate-900">Role-Based Guarding</p>
              <p className="mt-1 text-slate-500 leading-relaxed">
                All server actions strictly verify caller roles (`owner`, `manager`, `member`) through server session cookies.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <p className="font-semibold text-slate-900">Cryptographic Tokens</p>
              <p className="mt-1 text-slate-500 leading-relaxed">
                Approval tokens use SHA-256 cryptographic hashes and automatically expire after 14 days with atomic decision locks.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
