"use client";

import React, { useState, useTransition } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Send,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { sendProposalToClientAction } from "@/app/actions/proposal-emails";
import { ProposalEmailPreviewModal } from "./ProposalEmailPreviewModal";

export interface SendProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  changeRequestId: string;
  projectName: string;
  workspaceName: string;
  changeRequestTitle: string;
  changeRequestDescription: string;
  additionalCostFormatted: string;
  currency: string;
  versionNumber: number;
  originalDeadline?: string | null;
  proposedDeadline?: string | null;
  senderName?: string;
  defaultRecipientEmail?: string | null;
  defaultRecipientName?: string | null;
  mode: "use_current_link_from_publish" | "regenerate_link";
  rawToken?: string;
  onSuccess?: (res: { shareUrl: string; rawToken?: string; status: string }) => void;
}

export function SendProposalModal({
  isOpen,
  onClose,
  changeRequestId,
  projectName,
  workspaceName,
  changeRequestTitle,
  changeRequestDescription,
  additionalCostFormatted,
  currency,
  versionNumber,
  originalDeadline,
  proposedDeadline,
  senderName = "Team Member",
  defaultRecipientEmail = "",
  defaultRecipientName = "",
  mode,
  rawToken,
  onSuccess,
}: SendProposalModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || "");
  const [recipientName, setRecipientName] = useState(defaultRecipientName || "");
  const [personalNote, setPersonalNote] = useState("");
  const [sendCopyToMe, setSendCopyToMe] = useState(true);
  const [saveAsProjectContact, setSaveAsProjectContact] = useState(true);

  const [attemptKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  const [isPending, startTransition] = useTransition();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: "sent" | "not_configured" | "failed";
    message: string;
    shareUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Remaining characters in note
  const maxNoteLength = 500;
  const charsRemaining = maxNoteLength - personalNote.length;

  const handleCopyLink = async () => {
    if (!result?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientEmail.trim() || !recipientEmail.includes("@")) {
      setErrorMessage("Please enter a valid recipient email address.");
      return;
    }

    if (personalNote.length > maxNoteLength) {
      setErrorMessage("Personal note exceeds maximum permitted length.");
      return;
    }

    if (/<[^>]*>/i.test(personalNote)) {
      setErrorMessage("HTML formatting is not permitted in personal notes.");
      return;
    }

    startTransition(async () => {
      const res = await sendProposalToClientAction({
        changeRequestId,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim() || undefined,
        personalNote: personalNote.trim() || undefined,
        sendCopyToMe,
        mode,
        rawToken,
        attemptKey,
        saveAsProjectContact,
      });

      if (!res.success && res.status !== "failed") {
        setErrorMessage(res.message || "Failed to send proposal email.");
        return;
      }

      const finalStatus = res.status || (res.success ? "sent" : "failed");
      setResult({
        status: finalStatus,
        message: res.message || "Proposal dispatched successfully.",
        shareUrl: res.shareUrl || "",
      });

      if (onSuccess && res.shareUrl) {
        onSuccess({
          shareUrl: res.shareUrl,
          rawToken: res.rawToken,
          status: finalStatus,
        });
      }
    });
  };

  const handleResetAndClose = () => {
    setResult(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={handleResetAndClose}
        title="Send Proposal to Client"
        description={`Send proposal Version ${versionNumber} for "${projectName}" directly to your client.`}
        className="max-w-xl"
      >
        {result ? (
          /* Result view after sending */
          <div className="space-y-5 pt-2 pb-2">
            {result.status === "sent" ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-sm font-semibold text-emerald-950 block">
                    Proposal Email Dispatched
                  </strong>
                  <p className="text-emerald-800 leading-relaxed">{result.message}</p>
                  <p className="text-[11px] text-emerald-700 pt-1">
                    Your client received an email with proposal summary details and a direct sign-off button.
                  </p>
                </div>
              </div>
            ) : result.status === "not_configured" ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-sm font-semibold text-amber-950 block">
                    Email Service Not Configured
                  </strong>
                  <p className="text-amber-800 leading-relaxed">{result.message}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-sm font-semibold text-rose-950 block">
                    Delivery Attempt Encountered an Issue
                  </strong>
                  <p className="text-rose-800 leading-relaxed">{result.message}</p>
                </div>
              </div>
            )}

            {/* Direct Approval Link */}
            {result.shareUrl && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Client Approval Link (Active)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={result.shareUrl}
                    className="text-xs font-mono bg-slate-50 select-all"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    type="button"
                    variant={copied ? "primary" : "secondary"}
                    onClick={handleCopyLink}
                    leftIcon={
                      copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )
                    }
                    className={copied ? "bg-emerald-700 hover:bg-emerald-800" : ""}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="primary" onClick={handleResetAndClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Sending Form */
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Warning if regenerating link */}
            {mode === "regenerate_link" && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold block text-amber-950 mb-0.5">
                    Revocation Warning
                  </strong>
                  Sending this proposal email generates a fresh approval link and immediately revokes
                  any previously issued client tokens for this version.
                </div>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Client Recipient Email" required>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="client@acme.com"
                  disabled={isPending}
                  required
                  id="proposalRecipientEmailInput"
                />
              </FormField>

              <FormField label="Client Contact Name" hint="Optional greeting">
                <Input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Jonathan Miller"
                  disabled={isPending}
                  id="proposalRecipientNameInput"
                />
              </FormField>
            </div>

            {/* Proposal Snapshot Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span className="truncate max-w-[280px]">{changeRequestTitle}</span>
                <span className="text-emerald-700 font-bold">{additionalCostFormatted} {currency}</span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {changeRequestDescription}
              </p>
              {proposedDeadline && (
                <div className="pt-1 text-[11px] text-slate-600 flex items-center gap-1.5 border-t border-slate-200/60">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Proposed deadline: {proposedDeadline}</span>
                </div>
              )}
            </div>

            {/* Personal Note */}
            <FormField
              label="Personal Note to Client"
              hint={`${charsRemaining} characters left`}
            >
              <Textarea
                rows={3}
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="e.g. Hi Jonathan, here is the scope modification we discussed for WebAuthn passkeys. Let us know if this works for your launch schedule."
                disabled={isPending}
                maxLength={maxNoteLength}
                id="proposalPersonalNoteInput"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This note will be prominently highlighted at the top of the client&apos;s email.
                Internal notes are never included.
              </p>
            </FormField>

            {/* Preferences */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <Checkbox
                  checked={sendCopyToMe}
                  onCheckedChange={(checked) => setSendCopyToMe(!!checked)}
                  disabled={isPending}
                />
                <span>Send a confirmation copy to my email</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <Checkbox
                  checked={saveAsProjectContact}
                  onCheckedChange={(checked) => setSaveAsProjectContact(!!checked)}
                  disabled={isPending}
                />
                <span>Save this recipient as primary client contact for the project</span>
              </label>
            </div>

            <DialogFooter className="mt-5 flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                disabled={isPending}
                leftIcon={<Eye className="w-3.5 h-3.5 text-indigo-600" />}
                id="previewProposalEmailButton"
              >
                Preview Email
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetAndClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isPending}
                  disabled={isPending || !recipientEmail.trim()}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  id="confirmSendProposalButton"
                >
                  Send Proposal
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Live Email Preview Modal */}
      <ProposalEmailPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        recipientName={recipientName}
        senderName={senderName}
        workspaceName={workspaceName}
        projectName={projectName}
        changeRequestTitle={changeRequestTitle}
        changeRequestDescription={changeRequestDescription}
        additionalCostFormatted={additionalCostFormatted}
        currency={currency}
        originalDeadline={originalDeadline}
        proposedDeadline={proposedDeadline}
        versionNumber={versionNumber}
        personalNote={personalNote}
        reviewUrl="https://scopeguard.agency/approve/example_approval_link"
      />
    </>
  );
}
