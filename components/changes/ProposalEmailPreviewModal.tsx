"use client";

import React from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { renderProposalEmailHtml } from "@/lib/email/templates/proposal";

interface ProposalEmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  senderName: string;
  workspaceName: string;
  projectName: string;
  changeRequestTitle: string;
  changeRequestDescription: string;
  additionalCostFormatted: string;
  currency: string;
  originalDeadline?: string | null;
  proposedDeadline?: string | null;
  versionNumber: number;
  personalNote?: string;
  reviewUrl: string;
}

export function ProposalEmailPreviewModal({
  isOpen,
  onClose,
  recipientName,
  senderName,
  workspaceName,
  projectName,
  changeRequestTitle,
  changeRequestDescription,
  additionalCostFormatted,
  currency,
  originalDeadline,
  proposedDeadline,
  versionNumber,
  personalNote,
  reviewUrl,
}: ProposalEmailPreviewModalProps) {
  const htmlContent = renderProposalEmailHtml({
    recipientName: recipientName || null,
    senderName,
    workspaceName,
    projectName,
    changeRequestTitle,
    changeRequestDescription,
    additionalCostFormatted,
    currency,
    originalDeadline: originalDeadline || null,
    proposedDeadline: proposedDeadline || null,
    versionNumber,
    personalNote: personalNote || null,
    reviewUrl,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Client Email Preview"
      description="Exact transactional email that will be delivered to your client's inbox."
      className="max-w-2xl"
    >
      <div className="space-y-4 pt-1 pb-2">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <p>
            <strong>Subject:</strong> Scope Change Proposal: {projectName} (v{versionNumber}) · {workspaceName}
          </p>
          <p className="mt-1 text-slate-500">
            <strong>Reply-To:</strong> Your verified email address
          </p>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-[500px] overflow-y-auto bg-slate-100 p-2">
          <div
            className="rounded-lg overflow-hidden bg-white shadow-xs"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close Preview
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

