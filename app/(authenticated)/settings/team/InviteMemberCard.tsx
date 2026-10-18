"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MemberRole } from "@/lib/supabase/database.types";
import { sendInvitationsAction, BulkInviteActionState } from "@/app/actions/invitations";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import {
  UserPlus,
  Eye,
  Send,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Shield,
  UserCheck,
} from "lucide-react";
import { renderInvitationEmailHtml } from "@/lib/email/templates/invitation";

interface InviteMemberCardProps {
  currentUserRole: MemberRole;
  currentUserName: string;
  workspaceName: string;
}

export function InviteMemberCard({
  currentUserRole,
  currentUserName,
  workspaceName,
}: InviteMemberCardProps) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"manager" | "member">("member");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<BulkInviteActionState | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";
  const router = useRouter();

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 3000);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("emails", emails);
    formData.append("role", role);

    startTransition(async () => {
      const res = await sendInvitationsAction(null, formData);
      setState(res);
      if (res.success || res.results?.some((r) => r.inviteUrl)) {
        if (res.success) {
          setEmails("");
        }
        router.refresh();
      }
    });
  };

  // Sample props for preview dialog
  const previewHtml = renderInvitationEmailHtml({
    inviterName: currentUserName,
    workspaceName,
    role,
    inviteUrl: "https://scopeguard.agency/invite/sample_preview_token_12345",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-900">
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Invite Team Members
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Email
            </Button>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Invite colleagues to collaborate in your workspace. Recipients receive a secure link to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* General Banner Result */}
            {state?.message && (
              <div
                role="status"
                aria-live="polite"
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  state.success
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                {state.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed font-medium">{state.message}</span>
              </div>
            )}

            {/* Email Input */}
            <FormField
              label="Email addresses"
              htmlFor="invite-emails"
              required
              hint="Enter one or multiple email addresses separated by commas, spaces, or new lines (up to 10 per batch)."
              error={state?.fieldErrors?.emails?.[0]}
            >
              <Textarea
                id="invite-emails"
                name="emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="colleague@agency.com, lead@agency.com"
                rows={3}
                disabled={isPending}
                required
                className="font-mono text-xs"
              />
            </FormField>

            {/* Role Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Workspace Role
              </label>

              {isOwner ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Member Role Option */}
                  <label
                    className={`relative flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                      role === "member"
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={role === "member"}
                      onChange={() => setRole("member")}
                      disabled={isPending}
                      className="sr-only"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-xs text-slate-900">
                        <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                        Member
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Can view assigned projects and draft change requests. Cannot publish proposals or view billing.
                      </p>
                    </div>
                  </label>

                  {/* Manager Role Option */}
                  <label
                    className={`relative flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                      role === "manager"
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="manager"
                      checked={role === "manager"}
                      onChange={() => setRole("manager")}
                      disabled={isPending}
                      className="sr-only"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-xs text-slate-900">
                        <Shield className="w-3.5 h-3.5 text-indigo-600" />
                        Manager
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Operational lead: can create projects, adjust budgets, and publish client proposals.
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                /* Manager View: Locked to Member only */
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-600" />
                    <div>
                      <span className="font-semibold text-slate-800">Member</span>
                      <p className="text-[11px] text-slate-500">
                        Technical contributors and designers drafting change requests.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded font-medium">
                    Owner required for Manager role
                  </span>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isPending}
                disabled={isPending || !emails.trim()}
                className="gap-2 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {isPending ? "Sending Invitations..." : "Send Invitations"}
              </Button>
            </div>

            {/* Per-Email Dispatch Results */}
            {state?.results && state.results.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Dispatch Details</p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {state.results.map((res, idx) => (
                    <div
                      key={idx}
                      className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-slate-800 truncate">{res.email}</span>
                        {res.status === "sent" && (
                          <Badge variant="success" className="text-[10px]">
                            Sent
                          </Badge>
                        )}
                        {res.status === "not_configured" && (
                          <Badge variant="warning" className="text-[10px]">
                            Email Not Configured
                          </Badge>
                        )}
                        {res.status === "already_member" && (
                          <Badge variant="default" className="text-[10px]">
                            Already Member
                          </Badge>
                        )}
                        {res.status === "already_invited" && (
                          <Badge variant="pending" className="text-[10px]">
                            Pending Invite Exists
                          </Badge>
                        )}
                        {res.status === "failed" && (
                          <Badge variant="error" className="text-[10px]">
                            Failed
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {res.message && (
                          <span className="text-[11px] text-slate-500">{res.message}</span>
                        )}
                        {res.inviteUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(res.inviteUrl!)}
                            className="text-[11px] h-7 gap-1 px-2 font-mono"
                          >
                            {copiedLink === res.inviteUrl ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Link
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Email Preview Modal */}
      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Invitation Email Preview"
        description={`This is the exact email that will be dispatched to invited team members from ${workspaceName}.`}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono border border-slate-200">
            <strong>Subject:</strong> {currentUserName} invited you to join {workspaceName} on ScopeGuard
          </div>
          <div
            className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 max-h-[500px] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
