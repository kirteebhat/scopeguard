"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { ChangeRequestDetail } from "@/lib/data/change-requests";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { ProposalPreviewModal } from "./ProposalPreviewModal";
import { PublishedLinkDialog } from "./PublishedLinkDialog";
import { ChangeRequestStatusStepper } from "./ChangeRequestStatusStepper";
import {
  regenerateApprovalTokenAction,
  reviseChangeRequestAction,
  withdrawChangeRequestAction,
} from "@/app/actions/change-requests";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import {
  Lock,
  DollarSign,
  Eye,
  ArrowLeft,
  History,
  Link2,
  Edit3,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Compass,
  Send,
} from "lucide-react";

import { ActivityFeed } from "@/components/activity/ActivityFeed";
import type { ActivityLogItem } from "@/lib/data/activity";
import { SendProposalModal } from "./SendProposalModal";
import { ProposalEmailHistory } from "./ProposalEmailHistory";

interface ChangeRequestReadOnlyDetailProps {
  changeRequest: ChangeRequestDetail;
  userRole: "owner" | "manager" | "member";
  activities?: ActivityLogItem[];
}

export function ChangeRequestReadOnlyDetail({
  changeRequest,
  userRole,
  activities,
}: ChangeRequestReadOnlyDetailProps) {
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [showReviseConfirm, setShowReviseConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [publishedLink, setPublishedLink] = useState<{
    shareUrl: string;
    expiresAt: string;
  } | null>(null);

  const { project, versions } = changeRequest;
  const shouldReduceMotion = useReducedMotion();

  const formattedCost = formatMinorToCurrency(changeRequest.costMinor, project.currency);
  const formattedRate = changeRequest.hourlyRateMinor
    ? formatMinorToCurrency(changeRequest.hourlyRateMinor, project.currency)
    : "—";

  const getStatusBadge = () => {
    switch (changeRequest.status) {
      case "pending_approval":
        return <Badge variant="pending">Pending Approval</Badge>;
      case "approved":
        return <Badge variant="approved">Approved</Badge>;
      case "rejected":
        return <Badge variant="rejected">Rejected</Badge>;
      case "withdrawn":
        return <Badge variant="withdrawn">Withdrawn</Badge>;
      default:
        return <Badge variant="default">{changeRequest.status}</Badge>;
    }
  };

  const getBannerMessage = () => {
    switch (changeRequest.status) {
      case "pending_approval":
        return {
          title: "Proposal Locked for Approval",
          text: "This proposal has been published and is currently awaiting client sign-off. To modify scope or pricing, use Revise Proposal to return it to draft and revoke the active client token.",
        };
      case "approved":
        return {
          title: "Approved Contractual Scope",
          text: "This change request was approved by the client and is now permanently immutable. Project budget and timeline parameters reflect this addition.",
        };
      case "rejected":
        return {
          title: "Proposal Rejected",
          text: "The client declined this proposal. It remains permanently archived in project history.",
        };
      case "withdrawn":
        return {
          title: "Proposal Withdrawn",
          text: "This proposal was withdrawn by the agency prior to client decision.",
        };
      default:
        return null;
    }
  };

  const getNextActionPrompt = () => {
    switch (changeRequest.status) {
      case "pending_approval":
        return {
          badge: "Awaiting Client Sign-Off",
          title: "Share Link & Await Decision",
          text: "Share the active approval link with your client. If scope changed before approval, click 'Revise Proposal' to return to draft without breaking version history.",
        };
      case "approved":
        return {
          badge: "Scope Incorporated",
          title: "Proceed with Approved Work",
          text: "Client sign-off secured! This addition is now part of the active contract baseline. You can safely execute the requested deliverables.",
        };
      case "rejected":
        return {
          badge: "Proposal Declined",
          title: "Scope Request Closed",
          text: "The client declined this proposal. Do not proceed with unapproved deliverables unless a new proposal is negotiated.",
        };
      case "withdrawn":
        return {
          badge: "Proposal Cancelled",
          title: "Withdrawn by Agency",
          text: "This proposal was cancelled by your agency. You may create a fresh proposal if scope requirements resurface.",
        };
      default:
        return null;
    }
  };

  const banner = getBannerMessage();
  const nextAction = getNextActionPrompt();

  const handleRegenerateLink = async () => {
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const res = await regenerateApprovalTokenAction(changeRequest.id);
      if (!res.success || !res.data) {
        setErrorMessage(res.message || "Failed to regenerate approval link");
        setIsRegenerating(false);
        return;
      }
      setPublishedLink({
        shareUrl: res.data.shareUrl,
        expiresAt: res.data.expiresAt,
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to regenerate approval link";
      setErrorMessage(errorMsg);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleReviseConfirm = async () => {
    setIsRevising(true);
    setErrorMessage(null);
    try {
      const res = await reviseChangeRequestAction(changeRequest.id);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to revise proposal");
        setIsRevising(false);
        return;
      }
      setShowReviseConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to revise proposal";
      setErrorMessage(errorMsg);
    } finally {
      setIsRevising(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    setIsWithdrawing(true);
    setErrorMessage(null);
    try {
      const res = await withdrawChangeRequestAction(changeRequest.id);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to withdraw proposal");
        setIsWithdrawing(false);
        return;
      }
      setShowWithdrawConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to withdraw proposal";
      setErrorMessage(errorMsg);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link href={`/projects/${project.id}/changes`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Change Requests
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => setIsPreviewOpen(true)}
            id="viewClientProposalButton"
          >
            Preview Client View
          </Button>
        </div>
      </div>

      {/* Workflow Status Stepper */}
      <ChangeRequestStatusStepper
        status={changeRequest.status}
        currentVersion={changeRequest.currentVersion}
        decidedAt={versions[0]?.decidedAt}
        decidedByActor={versions[0]?.decidedByActor}
      />

      {/* Error alert if any */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Contextual Next Action Callout */}
      {nextAction && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  {nextAction.badge}
                </span>
                <h3 className="text-xs font-bold text-slate-900">{nextAction.title}</h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {nextAction.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* State banner */}
      {banner && (
        <div
          role="status"
          className="p-4 rounded-xl bg-slate-900 text-white flex items-start gap-3 shadow-xs"
        >
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="text-amber-300 block font-semibold mb-0.5">{banner.title}</strong>
            <p className="text-slate-300 leading-relaxed">{banner.text}</p>
          </div>
        </div>
      )}

      {/* Workflow Action Bar (governed by state machine) */}
      {changeRequest.status === "pending_approval" && (
        <div
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          id="pendingWorkflowBar"
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-slate-900">
                Proposal Decision Pending (Version {changeRequest.currentVersion || 1})
              </h3>
              <Badge variant="pending">Active Client Token</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Client approval link is active. If needed, you can revoke and generate a new link or revise back to draft.
            </p>
          </div>

          {userRole === "member" ? (
            <span className="text-xs text-slate-400 italic">
              Only workspace owners and managers can revise, withdraw, or regenerate links.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsSendModalOpen(true)}
                disabled={isRegenerating || isRevising || isWithdrawing}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                id="sendProposalToClientButton"
              >
                Send to Client
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerateLink}
                isLoading={isRegenerating}
                disabled={isRegenerating || isRevising || isWithdrawing}
                leftIcon={<Link2 className="w-3.5 h-3.5 text-indigo-600" />}
                id="regenerateApprovalLinkButton"
              >
                Revoke & Generate New Link
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReviseConfirm(true)}
                disabled={isRegenerating || isRevising || isWithdrawing}
                leftIcon={<Edit3 className="w-3.5 h-3.5 text-amber-600" />}
                id="reviseProposalButton"
              >
                Revise Proposal
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowWithdrawConfirm(true)}
                disabled={isRegenerating || isRevising || isWithdrawing}
                leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
                className="hover:text-rose-700 hover:border-rose-300"
                id="withdrawProposalButton"
              >
                Withdraw Proposal
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope Details & Version History */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">
                {changeRequest.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Scope Description
                </span>
                <p className="p-3 rounded-lg bg-slate-50 text-slate-700 whitespace-pre-wrap border border-slate-200/60 leading-relaxed">
                  {changeRequest.description}
                </p>
              </div>

              {changeRequest.reason && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Reason for Adjustment
                  </span>
                  <p className="p-3 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/60">
                    {changeRequest.reason}
                  </p>
                </div>
              )}

              {changeRequest.deliverableTitle && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Affected Milestone Deliverable
                  </span>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium">
                    {changeRequest.deliverableTitle}
                  </div>
                </div>
              )}

              {changeRequest.internalNotes && (
                <div className="pt-2">
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/60">
                    <div className="flex items-center gap-1.5 text-amber-900 font-semibold mb-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Internal Agency Notes</span>
                      <span className="text-[10px] text-amber-700 font-normal">
                        (Never visible to client)
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{changeRequest.internalNotes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Immutable Versions Snapshots & History Timeline */}
          {versions.length > 0 && (
            <Card id="versionHistoryCard">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Version History Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {versions.map((ver, idx) => {
                  const isCurrent = ver.versionNumber === changeRequest.currentVersion;
                  const isPendingVer =
                    changeRequest.status === "pending_approval" && isCurrent;

                  return (
                    <motion.div
                      key={ver.id}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04, ease: "easeOut" }}
                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            Version {ver.versionNumber}
                          </span>

                          {ver.decision === "approved" && (
                            <Badge variant="approved">
                              Approved {ver.decidedByActor ? `by ${ver.decidedByActor}` : ""}
                            </Badge>
                          )}
                          {ver.decision === "rejected" && (
                            <Badge variant="rejected">
                              Rejected {ver.decidedByActor ? `by ${ver.decidedByActor}` : ""}
                            </Badge>
                          )}
                          {!ver.decision && isPendingVer && (
                            <Badge variant="pending">Awaiting Client Sign-off</Badge>
                          )}
                          {!ver.decision && !isPendingVer && (
                            <Badge variant="default" className="text-slate-500 bg-slate-200">
                              Superseded / Revoked
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Published {new Date(ver.createdAt).toLocaleDateString()}
                          </span>
                          {ver.publisherName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              By {ver.publisherName}
                            </span>
                          )}
                          {ver.decidedAt && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Decided {new Date(ver.decidedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="font-bold text-slate-900 block text-sm">
                          {formatMinorToCurrency(ver.costMinor, ver.currency)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {ver.proposedDeadline ? `Due ${ver.proposedDeadline}` : "No deadline shift"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Agreed Terms Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Agreed Terms Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Pricing Method:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {changeRequest.pricingMethod}
                </span>
              </div>

              {changeRequest.pricingMethod === "hourly" && (
                <>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Estimated Effort:</span>
                    <span className="font-semibold text-slate-800">
                      {changeRequest.estimatedHours} hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Hourly Rate:</span>
                    <span className="font-semibold text-slate-800">{formattedRate}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Additional Cost:</span>
                <span className="text-base font-bold text-indigo-950">{formattedCost}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Target Deadline:</span>
                <span className="font-semibold text-slate-800">
                  {changeRequest.proposedDeadline || project.originalDeadline}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Proposal Email Delivery History */}
          <ProposalEmailHistory
            changeRequestId={changeRequest.id}
            userRole={userRole}
          />
        </div>
      </div>

      {/* Change Request Audit Trail Feed */}
      <ActivityFeed activities={activities || []} title="Proposal Audit & Activity Trail" />

      {/* Proposal Preview Modal */}
      <ProposalPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        projectName={project.name}
        clientName={project.clientName}
        currency={project.currency}
        title={changeRequest.title}
        description={changeRequest.description}
        reason={changeRequest.reason}
        deliverableTitle={changeRequest.deliverableTitle}
        pricingMethod={changeRequest.pricingMethod}
        hours={changeRequest.estimatedHours || 0}
        rateMinor={changeRequest.hourlyRateMinor || 0}
        costMinor={changeRequest.costMinor}
        originalBudgetMinor={project.budgetMinor}
        originalDeadline={project.originalDeadline}
        proposedDeadline={changeRequest.proposedDeadline}
        deltaDays={0}
      />

      {/* Regenerated / Fresh Approval Link Dialog */}
      {publishedLink && (
        <PublishedLinkDialog
          isOpen={true}
          onClose={() => setPublishedLink(null)}
          shareUrl={publishedLink.shareUrl}
          expiresAt={publishedLink.expiresAt}
          versionNumber={changeRequest.currentVersion || undefined}
          title="New Approval Link Generated"
        />
      )}

      {/* Revise Confirmation Dialog */}
      <Dialog
        isOpen={showReviseConfirm}
        onClose={() => setShowReviseConfirm(false)}
        title="Revise Proposal?"
        description="Reverting this proposal to draft will revoke the active client approval link."
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p>
            Any client attempting to access the existing sign-off link will see that it has
            been revoked.
          </p>
          <p>
            When you complete your edits and publish again, ScopeGuard will increment the
            version counter to <strong>Version {(changeRequest.currentVersion || 1) + 1}</strong> and
            generate a fresh approval link.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowReviseConfirm(false)}
            disabled={isRevising}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleReviseConfirm}
            isLoading={isRevising}
            id="confirmReviseButton"
          >
            Confirm Revision
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Withdraw Confirmation Dialog */}
      <Dialog
        isOpen={showWithdrawConfirm}
        onClose={() => setShowWithdrawConfirm(false)}
        title="Withdraw Proposal?"
        description="Withdrawing is a terminal action and cannot be reversed."
      >
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              All active client links will be permanently revoked immediately. This proposal
              will be marked as withdrawn and cannot be reopened.
            </span>
          </div>
          <p>Are you sure you want to withdraw this change proposal?</p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowWithdrawConfirm(false)}
            disabled={isWithdrawing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleWithdrawConfirm}
            isLoading={isWithdrawing}
            id="confirmWithdrawButton"
          >
            Withdraw Proposal
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Send Proposal to Client Modal */}
      <SendProposalModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        changeRequestId={changeRequest.id}
        projectName={project.name}
        workspaceName=""
        changeRequestTitle={changeRequest.title}
        changeRequestDescription={changeRequest.description}
        additionalCostFormatted={formattedCost}
        currency={project.currency}
        versionNumber={changeRequest.currentVersion || 1}
        originalDeadline={project.originalDeadline}
        proposedDeadline={changeRequest.proposedDeadline}
        defaultRecipientEmail={project.clientContactEmail}
        defaultRecipientName={project.clientContactName}
        mode="regenerate_link"
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
