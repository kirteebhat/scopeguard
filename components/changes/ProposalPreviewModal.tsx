"use client";

import React from "react";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  FileText,
  DollarSign,
  Calendar,
  Layers,
  HelpCircle,
  Eye,
  CheckCircle,
} from "lucide-react";

interface ProposalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  clientName: string;
  currency: string;
  title: string;
  description: string;
  reason?: string | null;
  deliverableTitle?: string | null;
  pricingMethod: "hourly" | "fixed";
  hours: number;
  rateMinor: number;
  costMinor: number;
  originalBudgetMinor: number;
  originalDeadline: string;
  proposedDeadline?: string | null;
  deltaDays: number;
}

export function ProposalPreviewModal({
  isOpen,
  onClose,
  projectName,
  clientName,
  currency,
  title,
  description,
  reason,
  deliverableTitle,
  pricingMethod,
  hours,
  rateMinor,
  costMinor,
  originalBudgetMinor,
  originalDeadline,
  proposedDeadline,
  deltaDays,
}: ProposalPreviewModalProps) {
  const formattedCost = formatMinorToCurrency(costMinor, currency);
  const formattedRate = formatMinorToCurrency(rateMinor, currency);
  const formattedOriginalBudget = formatMinorToCurrency(originalBudgetMinor, currency);
  const formattedRevisedTotal = formatMinorToCurrency(
    originalBudgetMinor + costMinor,
    currency
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Client Proposal Preview"
      description="Exact presentation rendered to the client during approval review. Internal notes and confidential margins are excluded."
    >
      <div className="space-y-6 pt-2 pb-2" id="proposalPreviewContainer">
        {/* Verification banner */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
          <Eye className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Client-Facing Document:</strong> Internal notes and agency-only metadata are permanently excluded from this view and tokenized client links.
          </span>
        </div>

        {/* Proposal Header */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Project: <strong className="text-slate-800">{projectName}</strong></span>
            <span>Client: <strong className="text-slate-800">{clientName}</strong></span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900" id="previewTitleDisplay">
              {title || "Untitled Change Proposal"}
            </h3>
            <Badge variant="warning">Proposal Draft</Badge>
          </div>
        </div>

        {/* Scope Description */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Scope Modification Details
          </h4>
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed border border-slate-200/60" id="previewDescriptionDisplay">
            {description || "No description provided."}
          </p>
        </div>

        {/* Reason / Justification */}
        {reason && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              Reason for Adjustment
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60" id="previewReasonDisplay">
              {reason}
            </p>
          </div>
        )}

        {/* Affected Deliverable */}
        {deliverableTitle && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Target Deliverable
            </h4>
            <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 font-medium">
              {deliverableTitle}
            </div>
          </div>
        )}

        {/* Commercial & Schedule Impact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Financial Breakdown */}
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-3.5 space-y-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Commercial Terms
              </span>
              <div className="text-xs space-y-1">
                {pricingMethod === "hourly" ? (
                  <p className="text-slate-600 font-mono text-[11px]">
                    {hours} hours @ {formattedRate}/hr
                  </p>
                ) : (
                  <p className="text-slate-600 text-[11px]">Fixed Charge Scope</p>
                )}
                <p className="text-base font-bold text-slate-900" id="previewCostDisplay">
                  {formattedCost}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Contract Baseline:</span>
                  <span>{formattedOriginalBudget}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Revised Budget:</span>
                  <span>{formattedRevisedTotal}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Breakdown */}
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-3.5 space-y-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Milestone Schedule
              </span>
              <div className="text-xs space-y-1">
                <p className="text-slate-500 text-[11px]">Baseline: {originalDeadline}</p>
                <p className="text-sm font-bold text-slate-900" id="previewDeadlineDisplay">
                  {proposedDeadline || originalDeadline}
                </p>
                <p className="text-[11px] text-amber-700 font-medium">
                  {deltaDays > 0 ? `+${deltaDays} calendar days extension` : "Within original contract timeline"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Sign-off Notice */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <span>
            Upon receiving client sign-off via their secure approval link, this proposal will automatically adjust contractual budget caps and deadline milestones.
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} id="closePreviewModalButton">
          Close Preview
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

