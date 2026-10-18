"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceInvitationItem } from "@/lib/data/invitations";
import { resendInvitationAction, revokeInvitationAction } from "@/app/actions/invitations";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  Mail,
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  Copy,
  Clock,
} from "lucide-react";

interface PendingInvitationsListProps {
  initialInvitations: WorkspaceInvitationItem[];
  isOwnerOrManager: boolean;
}

export function PendingInvitationsList({
  initialInvitations,
  isOwnerOrManager,
}: PendingInvitationsListProps) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Synchronize state when page revalidates or passes updated initialInvitations
  useEffect(() => {
    setInvitations(initialInvitations);
  }, [initialInvitations]);

  // Modals state
  const [revokeTarget, setRevokeTarget] = useState<WorkspaceInvitationItem | null>(null);
  const [newLinkResult, setNewLinkResult] = useState<{ email: string; url: string } | null>(null);

  if (!isOwnerOrManager && invitations.length === 0) {
    return null;
  }

  const handleResend = (invitation: WorkspaceInvitationItem) => {
    setActionError(null);
    const formData = new FormData();
    formData.append("invitationId", invitation.id);

    startTransition(async () => {
      const res = await resendInvitationAction(null, formData);
      if (res.success) {
        if (res.inviteUrl) {
          setNewLinkResult({ email: invitation.email, url: res.inviteUrl });
        }
        router.refresh();
      } else {
        setActionError(res.message || "Failed to resend invitation.");
      }
    });
  };

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    setActionError(null);
    const formData = new FormData();
    formData.append("invitationId", revokeTarget.id);

    startTransition(async () => {
      const res = await revokeInvitationAction(null, formData);
      if (res.success) {
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.id === revokeTarget.id ? { ...inv, status: "revoked" } : inv
          )
        );
        setRevokeTarget(null);
        router.refresh();
      } else {
        setActionError(res.message || "Failed to revoke invitation.");
      }
    });
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 3000);
    } catch {
      // Fallback
    }
  };

  const activeInvitations = invitations.filter((inv) => inv.status === "pending");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-900">
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Pending Invitations ({activeInvitations.length})
            </span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Outstanding invites awaiting acceptance. Links are valid for 7 days from generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {actionError && (
            <div
              role="alert"
              className="m-4 sm:m-0 sm:mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {invitations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Clock className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No pending invitations</p>
              <p className="text-xs text-slate-400">
                New invites will appear here until accepted, expired, or revoked.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Sent / Attempts</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      {isOwnerOrManager && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => {
                      const isPendingState = inv.status === "pending";
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs text-slate-900 font-medium">
                            {inv.email}
                          </TableCell>
                          <TableCell>
                            <span className="text-[11px] font-semibold text-slate-700 capitalize">
                              {inv.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {inv.inviterName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            <span title={new Date(inv.lastSentAt).toLocaleString()}>
                              {new Date(inv.lastSentAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {inv.sendCount > 1 && (
                              <span className="ml-1 text-[10px] text-slate-400 font-mono">
                                ({inv.sendCount}x)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(inv.expiresAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {inv.status === "pending" && <Badge variant="pending">Pending</Badge>}
                            {inv.status === "accepted" && <Badge variant="success">Accepted</Badge>}
                            {inv.status === "revoked" && <Badge variant="withdrawn">Revoked</Badge>}
                            {inv.status === "expired" && <Badge variant="draft">Expired</Badge>}
                          </TableCell>
                          {isOwnerOrManager && (
                            <TableCell className="text-right">
                              {isPendingState ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResend(inv)}
                                    disabled={isPending}
                                    title="Resend email and generate a fresh link"
                                    className="text-[11px] h-7 px-2 gap-1"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
                                    Resend
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRevokeTarget(inv)}
                                    disabled={isPending}
                                    title="Revoke this invitation"
                                    className="text-[11px] h-7 px-2 text-rose-600 hover:text-rose-700 hover:border-rose-300"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Revoke
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No actions</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (Adaptable at 360px without horizontal overflow) */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {invitations.map((inv) => {
                  const isPendingState = inv.status === "pending";
                  return (
                    <div key={inv.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 truncate">
                          {inv.email}
                        </span>
                        {inv.status === "pending" && <Badge variant="pending">Pending</Badge>}
                        {inv.status === "accepted" && <Badge variant="success">Accepted</Badge>}
                        {inv.status === "revoked" && <Badge variant="withdrawn">Revoked</Badge>}
                        {inv.status === "expired" && <Badge variant="draft">Expired</Badge>}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Role</span>
                          <span className="capitalize font-medium">{inv.role}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Invited By</span>
                          <span className="truncate block">{inv.inviterName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Sent</span>
                          <span>
                            {new Date(inv.lastSentAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Expires</span>
                          <span>
                            {new Date(inv.expiresAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {isOwnerOrManager && isPendingState && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleResend(inv)}
                            disabled={isPending}
                            className="flex-1 text-xs h-8 gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Resend / New Link
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRevokeTarget(inv)}
                            disabled={isPending}
                            className="text-xs h-8 px-2.5 text-rose-600 hover:text-rose-700 hover:border-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke Workspace Invitation"
        description="Are you sure you want to revoke this invitation? Any existing link will be immediately invalidated and cannot be used to join."
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <p className="font-semibold text-slate-800">Target Recipient:</p>
            <p className="font-mono text-slate-600">{revokeTarget?.email}</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRevokeTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleRevokeConfirm}
              isLoading={isPending}
              disabled={isPending}
            >
              Revoke Invitation
            </Button>
          </div>
        </div>
      </Dialog>

      {/* New Link Generated Dialog */}
      <Dialog
        isOpen={!!newLinkResult}
        onClose={() => setNewLinkResult(null)}
        title="New Invitation Link Generated"
        description="A fresh invitation link has been generated. The previous link has been revoked."
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <p className="font-semibold text-slate-800">Recipient:</p>
            <p className="font-mono text-slate-600">{newLinkResult?.email}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs break-all text-indigo-700 flex items-center justify-between gap-2">
            <span className="truncate">{newLinkResult?.url}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy(newLinkResult!.url)}
              className="shrink-0 h-7 text-xs gap-1"
            >
              {copiedUrl === newLinkResult?.url ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setNewLinkResult(null)}
            >
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
