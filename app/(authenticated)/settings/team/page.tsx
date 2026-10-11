import React from "react";
import { Metadata } from "next";
import { getWorkspaceMembers } from "@/lib/data/members";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Users, MailQuestion } from "lucide-react";
import { SettingsNav } from "../SettingsNav";
import { MemberRoleSelector } from "./MemberRoleSelector";

export const metadata: Metadata = {
  title: "Team Members - ScopeGuard",
  description: "Manage team member roles and permissions in your workspace.",
};

export default async function TeamSettingsPage() {
  const { members, currentUserRole, currentUserId } = await getWorkspaceMembers();
  const isOwner = currentUserRole === "owner";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        description="Configure your agency profile, team access, and subscription configuration."
      />

      <SettingsNav />

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-900">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Team Members ({members.length})
            </span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {isOwner
              ? "As workspace owner, you can adjust member roles between Manager and Member."
              : "View active members and assigned operational roles within your agency workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isTargetOwner = member.role === "owner";
                const isSelf = member.userId === currentUserId;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                          {(member.profile.fullName || member.profile.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-900">
                            {member.profile.fullName || "Team Member"}
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-normal">
                                You
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-mono">
                      {member.profile.email}
                    </TableCell>
                    <TableCell>
                      <MemberRoleSelector
                        targetUserId={member.userId}
                        currentRole={member.role}
                        isCurrentUserOwner={isOwner}
                        isTargetOwner={isTargetOwner}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(member.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invitations Section (Plain honest text per AGENTS.md rules - no fake button) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
            <MailQuestion className="w-4 h-4 text-slate-400" />
            Invite Team Members
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Team expansion and user onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed space-y-1">
            <p className="font-semibold text-slate-800">
              Team invitations are coming in a future release
            </p>
            <p className="text-slate-500">
              Direct email invitations and self-service invite links are not yet enabled for this MVP release.
              In the current version, additional team members are provisioned by your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

