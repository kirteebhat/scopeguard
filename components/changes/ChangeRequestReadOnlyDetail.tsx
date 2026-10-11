"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ChangeRequestDetail } from "@/lib/data/change-requests";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { ProposalPreviewModal } from "./ProposalPreviewModal";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Lock,
  DollarSign,
  Eye,
  ArrowLeft,
  History,
} from "lucide-react";

interface ChangeRequestReadOnlyDetailProps {
  changeRequest: ChangeRequestDetail;
  userRole: "owner" | "manager" | "member";
}

export function ChangeRequestReadOnlyDetail({
  changeRequest,
  userRole: _userRole,
}: ChangeRequestReadOnlyDetailProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { project, versions } = changeRequest;

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
          text: "This proposal has been published and is currently awaiting client sign-off. To modify scope or pricing, it must be revised through the revision action (coming in Step 13), which revokes the active client token.",
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

  const banner = getBannerMessage();

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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope Details */}
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

          {/* Immutable Versions Snapshots */}
          {versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Version History & Immutable Snapshots
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Version {ver.versionNumber}</span>
                        <Badge variant="default" className="text-[10px]">
                          Snapshot
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Published on {new Date(ver.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">
                        {formatMinorToCurrency(ver.costMinor, ver.currency)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {ver.proposedDeadline ? `Due ${ver.proposedDeadline}` : "No deadline shift"}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Commercial & Project Overview */}
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
        </div>
      </div>

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
    </div>
  );
}
