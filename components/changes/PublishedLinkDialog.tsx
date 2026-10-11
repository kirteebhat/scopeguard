"use client";

import React, { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Copy,
  Check,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";

export interface PublishedLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  expiresAt: string;
  versionNumber?: number;
  title?: string;
}

export function PublishedLinkDialog({
  isOpen,
  onClose,
  shareUrl,
  expiresAt,
  versionNumber,
  title = "Client Approval Link Generated",
}: PublishedLinkDialogProps) {
  const [copied, setCopied] = useState(false);

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
      // Fallback if clipboard API is restricted
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formattedExpiry = new Date(expiresAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
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
        {/* Important Notice: No email sent */}
        <div
          role="status"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold block text-amber-950 mb-0.5">
              No email has been sent
            </strong>
            ScopeGuard does not dispatch emails on your behalf. You must copy and
            share this link directly with your client via email, Slack, or your
            messaging channel.
          </div>
        </div>

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

      <DialogFooter>
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
  );
}
