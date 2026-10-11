import React from "react";
import { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Building, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings - ScopeGuard",
  description: "Manage agency workspace settings and team configuration.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        description="Configure your agency profile, team member permissions, and defaults."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Building className="w-4 h-4 text-indigo-600" />
              Agency Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Workspace Name" htmlFor="wsName">
              <Input
                id="wsName"
                defaultValue="Acme Agency"
                disabled
                className="bg-slate-50"
              />
            </FormField>
            <p className="text-xs text-slate-600">
              Workspace ownership is managed via database role enforcement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Security & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              Row-Level Security (RLS) is strictly enforced across all database queries.
            </p>
            <p>
              Approval tokens use SHA-256 cryptographic hashes and automatically expire after 14 days.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

