"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Layers,
  ShieldCheck,
  Building2,
  Info,
} from "lucide-react";
import { formatMinorToCurrency } from "@/lib/domain/money";
import type { ResolvedProposal, SubmitDecisionResult } from "@/lib/data/approvals";
import { submitClientDecisionAction } from "@/app/actions/approvals";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function AnimatedCheckmark({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  return (
    <div className="relative flex items-center justify-center">
      {!shouldReduceMotion && (
        <motion.div
          className="absolute -inset-2 rounded-full bg-emerald-100/60"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.25, 1.1], opacity: [0, 0.7, 0] }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
      <svg
        className="w-10 h-10 text-emerald-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
        <motion.path
          d="m9 12 2 2 4-4"
          initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.35,
            delay: shouldReduceMotion ? 0 : 0.25,
            ease: "easeOut",
          }}
        />
      </svg>
    </div>
  );
}

function CalmRejectionIcon({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center justify-center text-rose-600"
    >
      <XCircle className="w-10 h-10 stroke-[2.2]" />
    </motion.div>
  );
}

interface ClientProposalViewProps {
  token: string;
  initialProposal: ResolvedProposal;
}

export function ClientProposalView({
  token,
  initialProposal,
}: ClientProposalViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [proposal, setProposal] = useState<ResolvedProposal>(initialProposal);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [actorName, setActorName] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Friendly State 1: Invalid / Not Found
  if (proposal.status === "not_found") {
    return (
      <StateShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Invalid Proposal Link
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base max-w-md mx-auto">
            This approval link is invalid or does not exist. Please check the URL or
            contact your service provider for an updated link.
          </p>
        </div>
      </StateShell>
    );
  }

  // Friendly State 2: Expired
  if (proposal.status === "expired") {
    return (
      <StateShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Proposal Link Expired
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base max-w-md mx-auto">
            This proposal link expired after 14 days without a client decision. Please
            contact your agency to request a fresh approval link.
          </p>
        </div>
      </StateShell>
    );
  }

  // Friendly State 3: Revoked / Superseded
  if (proposal.status === "revoked" || proposal.status === "superseded") {
    return (
      <StateShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-4">
            <FileText className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Proposal Link Updated
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base max-w-md mx-auto">
            This proposal was updated; ask your agency for the new link.
          </p>
        </div>
      </StateShell>
    );
  }

  // Friendly State 4: Rate Limited
  if (proposal.status === "rate_limited") {
    return (
      <StateShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Too Many Requests
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base max-w-md mx-auto">
            Too many requests. Please wait a few moments before trying again.
          </p>
        </div>
      </StateShell>
    );
  }

  // Friendly State 5: Already Decided (or newly decided in this session)
  if (proposal.status === "already_decided" || proposal.decision) {
    const isApproved = proposal.decision === "approved";
    return (
      <StateShell agencyName={proposal.agencyName} projectName={proposal.projectName}>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
        >
          <div className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                isApproved ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              } mb-4`}
            >
              {isApproved ? (
                <AnimatedCheckmark shouldReduceMotion={shouldReduceMotion} />
              ) : (
                <CalmRejectionIcon shouldReduceMotion={shouldReduceMotion} />
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                isApproved
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-rose-100 text-rose-800 border border-rose-200"
              }`}
            >
              {isApproved ? "Proposal Approved" : "Proposal Declined"}
            </span>

            <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">
              Decision Already Recorded
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              A decision has already been recorded for this proposal. No further action
              is required.
            </p>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Recorded Decision</span>
              <span
                className={`font-semibold capitalize ${
                  isApproved ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {proposal.decision}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Signatory Name</span>
              <span className="font-semibold text-slate-900">
                {proposal.actorName || "Client Representative"}
              </span>
            </div>
            {proposal.decidedAt && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Timestamp</span>
                <span className="text-slate-700">
                  {new Date(proposal.decidedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}
            {proposal.snapshot && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Proposal Version</span>
                <span className="font-semibold text-slate-900">
                  Version {proposal.snapshot.version_number}
                </span>
              </div>
            )}
          </div>

          {proposal.snapshot && (
            <div className="mt-6 pt-6 border-t border-slate-100 text-left">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-2">
                Decided Proposal Summary
              </h2>
              <div className="text-sm text-slate-700 font-medium mb-1">
                {proposal.snapshot.title}
              </div>
              <p className="text-xs text-slate-500 line-clamp-3">
                {proposal.snapshot.description}
              </p>
            </div>
          )}
        </motion.div>
      </StateShell>
    );
  }

  // Friendly State 6: Valid Pending Proposal
  const snapshot = proposal.snapshot;
  if (!snapshot) {
    return (
      <StateShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Unable to load proposal details.</p>
        </div>
      </StateShell>
    );
  }

  const costFormatted = formatMinorToCurrency(
    snapshot.cost_minor,
    snapshot.currency || "USD"
  );
  const budgetFormatted = snapshot.original_contract?.budget_minor
    ? formatMinorToCurrency(
        snapshot.original_contract.budget_minor,
        snapshot.currency || "USD"
      )
    : null;

  const handleDecisionSubmit = async (decision: "approved" | "rejected") => {
    if (!actorName.trim() || actorName.trim().length < 2) {
      setNameError("Please enter your full name (at least 2 characters).");
      return;
    }
    setNameError("");
    setActionError(null);
    setIsSubmitting(true);

    try {
      const res: SubmitDecisionResult = await submitClientDecisionAction({
        token,
        decision,
        actorName: actorName.trim(),
        notes: decision === "rejected" ? rejectNotes : undefined,
      });

      if (res.success || res.status === "already_decided") {
        setIsApproveOpen(false);
        setIsRejectOpen(false);
        setProposal({
          ...proposal,
          status: "already_decided",
          decision: res.decision || decision,
          decidedAt: res.decidedAt || new Date().toISOString(),
          actorName: res.actorName || actorName.trim(),
        });
      } else {
        setActionError(
          res.message || "Failed to submit decision. Please check the link and try again."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected network error occurred.";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StateShell agencyName={proposal.agencyName} projectName={proposal.projectName}>
      <div className="space-y-6">
        {/* Header Banner Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
                Version {snapshot.version_number}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/60">
                <Clock className="w-3.5 h-3.5" />
                Awaiting Client Sign-off
              </span>
            </div>

            {proposal.expiresAt && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Expires on {new Date(proposal.expiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="mt-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              {snapshot.title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {snapshot.description}
            </p>
          </div>

          {snapshot.reason && (
            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 p-3.5 text-xs sm:text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Context / Reason: </span>
              <span className="text-slate-600 dark:text-slate-400">{snapshot.reason}</span>
            </div>
          )}

          {snapshot.affected_deliverable && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>Affects Deliverable: </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {snapshot.affected_deliverable.title}
              </span>
            </div>
          )}
        </div>

        {/* Financial & Schedule Impact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Financial Impact */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Financial Impact</span>
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Additional Estimated Cost</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {costFormatted}
                </div>
              </div>

              {snapshot.pricing_method === "hourly" &&
                snapshot.estimated_hours &&
                snapshot.hourly_rate_minor && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {snapshot.estimated_hours} hrs ×{" "}
                    {formatMinorToCurrency(
                      snapshot.hourly_rate_minor,
                      snapshot.currency
                    )}
                    /hr
                  </div>
                )}

              {/* MANDATORY DISCLAIMER LABEL */}
              <div className="mt-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 p-2.5 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-amber-900 dark:text-amber-300 leading-snug">
                  Estimate, not a contract or legally binding quote
                </p>
              </div>
            </div>

            {budgetFormatted && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Original Project Budget:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{budgetFormatted}</span>
              </div>
            )}
          </div>

          {/* Card 2: Schedule Impact */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Schedule Impact</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Original Deadline</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {snapshot.original_contract?.original_deadline || "Not specified"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Proposed Deadline</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {snapshot.proposed_deadline || "No date change requested"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>Timelines take effect immediately upon client sign-off.</span>
            </div>
          </div>
        </div>

        {/* Terms & Notes Card */}
        {(snapshot.terms_notes || snapshot.termsNotes || snapshot.disclaimer) && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Terms & Conditions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {snapshot.terms_notes || snapshot.termsNotes || snapshot.disclaimer}
            </p>
          </div>
        )}

        {/* Action Bar (Mobile-first, touch-friendly min 44px) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-md">
          <div className="text-center sm:text-left mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Client Sign-off Decision
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Please review the estimated scope, cost, and deadline adjustments above
              before recording your decision.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              id="openApproveModalButton"
              onClick={() => {
                setActionError(null);
                setNameError("");
                setIsApproveOpen(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Scope Modification</span>
            </button>

            <button
              type="button"
              id="openRejectModalButton"
              onClick={() => {
                setActionError(null);
                setNameError("");
                setIsRejectOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-900 dark:hover:text-white active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <XCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Decline / Reject</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: APPROVE */}
      <Dialog
        isOpen={isApproveOpen}
        onClose={() => !isSubmitting && setIsApproveOpen(false)}
        title="Approve Scope Modification"
        description="Please confirm your identity to sign off on this scope modification."
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Proposal Version:</span>
              <span className="font-semibold text-slate-800">
                Version {snapshot.version_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Additional Cost:</span>
              <span className="font-bold text-slate-900">{costFormatted}</span>
            </div>
            {snapshot.proposed_deadline && (
              <div className="flex justify-between">
                <span className="text-slate-500">Revised Deadline:</span>
                <span className="font-medium text-slate-800">
                  {snapshot.proposed_deadline}
                </span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="clientNameInput"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Your Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="clientNameInput"
              type="text"
              value={actorName}
              onChange={(e) => {
                setActorName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="e.g. Sarah Jenkins"
              disabled={isSubmitting}
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {nameError && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{nameError}</p>
            )}
          </div>

          {actionError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {actionError}
            </div>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">
            By confirming, you acknowledge that you are authorized on behalf of{" "}
            <strong>{proposal.clientName || "the client"}</strong> to approve this scope
            change and the associated financial/schedule adjustments.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setIsApproveOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            id="confirmApproveButton"
            disabled={isSubmitting}
            onClick={() => handleDecisionSubmit("approved")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                <span>Recording...</span>
              </span>
            ) : (
              "Confirm Approval"
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Confirmation Dialog: REJECT */}
      <Dialog
        isOpen={isRejectOpen}
        onClose={() => !isSubmitting && setIsRejectOpen(false)}
        title="Decline Scope Modification"
        description="Please provide your name to record this rejection."
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Proposal Version:</span>
              <span className="font-semibold text-slate-800">
                Version {snapshot.version_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Cost:</span>
              <span className="font-bold text-slate-900">{costFormatted}</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="clientRejectNameInput"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Your Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="clientRejectNameInput"
              type="text"
              value={actorName}
              onChange={(e) => {
                setActorName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="e.g. Sarah Jenkins"
              disabled={isSubmitting}
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            {nameError && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{nameError}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="clientRejectNotesInput"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Reason for declining (optional)
            </label>
            <textarea
              id="clientRejectNotesInput"
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Let the agency know why this proposal is declined..."
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {actionError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {actionError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setIsRejectOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            id="confirmRejectButton"
            disabled={isSubmitting}
            onClick={() => handleDecisionSubmit("rejected")}
            className="bg-rose-600 hover:bg-rose-700 text-white min-w-[130px]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                <span>Recording...</span>
              </span>
            ) : (
              "Confirm Rejection"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </StateShell>
  );
}

/**
 * Clean, mobile-first client portal wrapper shell.
 * Zero agency navigation, zero agency layout, zero sidebar.
 */
function StateShell({
  agencyName,
  projectName,
  children,
}: {
  agencyName?: string;
  projectName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased py-6 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="mx-auto max-w-2xl">
        {/* Portal Header */}
        <header className="mb-6 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Client Approval Portal
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                ScopeGuard
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {agencyName && (
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-400 dark:text-slate-500">Presented by</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-end gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>{agencyName}</span>
                </div>
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        {projectName && (
          <div className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            Project: <span className="font-semibold text-slate-700 dark:text-slate-200">{projectName}</span>
          </div>
        )}

        {/* Main Content */}
        <main>{children}</main>

        {/* Minimal Footer */}
        <footer className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800 pt-6">
          <p>
            Secure Client Sign-off powered by ScopeGuard. All decisions are
            cryptographically logged with immutable timestamps.
          </p>
        </footer>
      </div>
    </div>
  );
}
