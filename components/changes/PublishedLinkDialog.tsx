"use client";

import React, { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Mail,
  Send,
  CheckCircle2,
} from "lucide-react";
import { SendProposalModal } from "./SendProposalModal";

export interface PublishedLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  expiresAt: string;
  versionNumber?: number;
  title?: string;
  changeRequestId?: string;
  rawToken?: string;
  projectName?: string;
  workspaceName?: string;
  changeRequestTitle?: string;
  changeRequestDescription?: string;
  additionalCostFormatted?: string;
  currency?: string;
  proposedDeadline?: string | null;
  clientContactEmail?: string | null;
  clientContactName?: string | null;
}

export function PublishedLinkDialog({
  isOpen,
  onClose,
  shareUrl,
  expiresAt,
  versionNumber,
  title = "Client Approval Link Generated",
  changeRequestId,
  rawToken,
  projectName = "Project",
  workspaceName = "Workspace",
  changeRequestTitle = "Scope Change",
  changeRequestDescription = "",
  additionalCostFormatted = "$0.00",
  currency = "USD",
  proposedDeadline,
  clientContactEmail,
  clientContactName,
}: PublishedLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);

  // Compute full URL on client
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${shareUrl}`
      : shareUrl;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formattedExpiry = new Date(expiresAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const canSendEmail = !!(changeRequestId && rawToken);

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        description={
          versionNumber
            ? `Version ${versionNumber} has been published and is ready for client review.`
            : "Your client approval link has been generated."
        }
        className="max-w-lg"
      >
        <div className="space-y-4">
          {/* Status banner */}
          {emailSentStatus === "sent" ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold block text-emerald-950 mb-0.5">
                  Proposal Email Sent
                </strong>
                The proposal summary and approval link were dispatched to your client. You can also
                copy the direct link below if needed.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold block text-indigo-950 mb-0.5">
                    Proposal Ready for Client Review
                  </strong>
                  Send the proposal directly to your client via email, or copy the secure link below to share via Slack or messaging.
                </div>
              </div>
              {canSendEmail && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSendModalOpen(true)}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  id="sendToClientFromPublishButton"
                  className="shrink-0"
                >
                  Send to Client
                </Button>
              )}
            </div>
          )}

          {/* Shareable Link Box */}
          <div>
            <label
              htmlFor="approvalLinkInput"
              className="text-xs font-semibold text-slate-700 block mb-1.5"
            >
              Client Approval Link
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="approvalLinkInput"
                readOnly
                value={fullUrl}
                className="text-xs font-mono bg-slate-50 border-slate-200 select-all"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant={copied ? "primary" : "secondary"}
                onClick={handleCopy}
                leftIcon={
                  copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )
                }
                id="copyApprovalLinkButton"
                className={copied ? "bg-emerald-700 hover:bg-emerald-800" : ""}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Expiry & Security Metadata */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                Expires on <strong>{formattedExpiry}</strong> (14 days from generation).
              </span>
            </div>

            <div className="flex items-start gap-2 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500 leading-normal">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                For security, only a cryptographic SHA-256 hash is stored in the
                database. This raw link cannot be retrieved once you close this dialog.
                If needed, you can revoke this link and generate a new one from the
                proposal details page.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
          {canSendEmail && emailSentStatus !== "sent" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSendModalOpen(true)}
              leftIcon={<Send className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Email to Client
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            id="closeApprovalDialogButton"
          >
            Done
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Embedded Send Proposal Modal */}
      {canSendEmail && (
        <SendProposalModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          changeRequestId={changeRequestId!}
          projectName={projectName}
          workspaceName={workspaceName}
          changeRequestTitle={changeRequestTitle}
          changeRequestDescription={changeRequestDescription}
          additionalCostFormatted={additionalCostFormatted}
          currency={currency}
          versionNumber={versionNumber || 1}
          proposedDeadline={proposedDeadline}
          defaultRecipientEmail={clientContactEmail}
          defaultRecipientName={clientContactName}
          mode="use_current_link_from_publish"
          rawToken={rawToken}
          onSuccess={(res) => {
            setEmailSentStatus(res.status);
          }}
        />
      )}
    </>
  );
}
