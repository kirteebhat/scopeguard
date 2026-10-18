"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  clientChangeRequestFormSchema,
} from "@/lib/validation/change-request";
import {
  createChangeRequestDraftAction,
  updateChangeRequestDraftAction,
  publishChangeRequestAction,
} from "@/app/actions/change-requests";
import { PublishedLinkDialog } from "./PublishedLinkDialog";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";
import type { ProjectDetail } from "@/lib/data/projects";
import type { DeliverableItem } from "@/lib/data/deliverables";
import type { ChangeRequestItem } from "@/lib/data/change-requests";
import {
  parseDecimalToMinor,
  minorToDecimalString,
  calculateHourlyCost,
  formatMinorToCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/domain/money";
import { calculateDeltaDays } from "@/lib/domain/impact";
import { LiveImpactPanel } from "./LiveImpactPanel";
import { ProposalPreviewModal } from "./ProposalPreviewModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import {
  FileText,
  DollarSign,
  Calendar,
  Lock,
  Eye,
  Send,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type FormValues = z.infer<typeof clientChangeRequestFormSchema>;

interface ChangeRequestFormProps {
  project: ProjectDetail;
  deliverables: DeliverableItem[];
  initialData?: ChangeRequestItem | null;
  isNew?: boolean;
}

/**
 * Calculates a new date by adding days to a YYYY-MM-DD baseline date string.
 */
function addDaysToDateString(baseDate: string, days: number): string {
  if (!baseDate || isNaN(days)) return baseDate;
  const [year, month, day] = baseDate.split("-").map(Number);
  const date = new Date(Date.now());
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

export function ChangeRequestForm({
  project,
  deliverables,
  initialData,
  isNew = false,
}: ChangeRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [publishedLink, setPublishedLink] = useState<{
    shareUrl: string;
    expiresAt: string;
    versionNumber: number;
  } | null>(null);

  const handleSubmitForApproval = async () => {
    if (!initialData?.id) return;
    setIsPublishing(true);
    setFeedback(null);

    try {
      const res = await publishChangeRequestAction(initialData.id);
      if (!res.success || !res.data) {
        setFeedback({ text: res.message || "Failed to publish proposal", isError: true });
        setIsPublishing(false);
        return;
      }

      setPublishedLink({
        shareUrl: res.data.shareUrl,
        expiresAt: res.data.expiresAt,
        versionNumber: res.data.versionNumber,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to publish proposal";
      setFeedback({ text: errorMsg, isError: true });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClosePublishedDialog = () => {
    setPublishedLink(null);
    router.refresh();
  };

  // Form initialization
  const defaultHours = initialData?.estimatedHours
    ? String(initialData.estimatedHours)
    : "10.0";

  const defaultHourlyRate = initialData?.hourlyRateMinor
    ? minorToDecimalString(initialData.hourlyRateMinor)
    : minorToDecimalString(project.hourlyRateMinor);

  const defaultFixedCost =
    initialData?.pricingMethod === "fixed" && initialData.costMinor
      ? minorToDecimalString(initialData.costMinor)
      : "1000.00";

  const defaultDeadline = initialData?.proposedDeadline || project.originalDeadline;
  const initialDelta = calculateDeltaDays(defaultDeadline, project.originalDeadline);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(clientChangeRequestFormSchema),
    defaultValues: {
      projectId: project.id,
      title: initialData?.title || "",
      description: initialData?.description || "",
      reason: initialData?.reason || "",
      deliverableId: initialData?.affectedDeliverableId || "",
      pricingMethod: initialData?.pricingMethod || "hourly",
      hours: defaultHours,
      hourlyRate: defaultHourlyRate,
      fixedCost: defaultFixedCost,
      proposedDeadline: defaultDeadline,
      additionalDays: initialDelta > 0 ? String(initialDelta) : "",
      internalNotes: initialData?.internalNotes || "",
    },
  });

  useUnsavedChangesWarning(isDirty);

  const watchedTitle = watch("title");
  const watchedDescription = watch("description");
  const watchedReason = watch("reason");
  const watchedPricingMethod = watch("pricingMethod") || "hourly";
  const watchedHours = watch("hours");
  const watchedHourlyRate = watch("hourlyRate");
  const watchedFixedCost = watch("fixedCost");
  const watchedDeadline = watch("proposedDeadline");
  const watchedDeliverableId = watch("deliverableId");

  const currencyConfig = SUPPORTED_CURRENCIES[project.currency] || {
    symbol: project.currency,
  };
  const currencySymbol = currencyConfig.symbol;

  // Reactively synchronize additional days with proposed deadline
  const handleAdditionalDaysChange = (daysStr: string) => {
    setValue("additionalDays", daysStr);
    const parsedDays = parseInt(daysStr, 10);
    if (!isNaN(parsedDays) && parsedDays >= 0) {
      const calculatedDate = addDaysToDateString(project.originalDeadline, parsedDays);
      setValue("proposedDeadline", calculatedDate);
    }
  };

  const handleProposedDeadlineChange = (dateStr: string) => {
    setValue("proposedDeadline", dateStr);
    const delta = calculateDeltaDays(dateStr, project.originalDeadline);
    setValue("additionalDays", delta > 0 ? String(delta) : "");
  };

  // Live calculation of cost_minor
  const { liveCostMinor, liveHours, liveRateMinor, liveFixedCostMinor } = useMemo(() => {
    let cost = 0;
    let hoursNum = 0;
    let rateNum = 0;
    let fixedNum = 0;

    try {
      if (watchedPricingMethod === "hourly") {
        hoursNum = parseFloat(watchedHours || "0") || 0;
        rateNum = watchedHourlyRate ? parseDecimalToMinor(watchedHourlyRate) : project.hourlyRateMinor;
        cost = calculateHourlyCost(hoursNum, rateNum);
      } else {
        fixedNum = watchedFixedCost ? parseDecimalToMinor(watchedFixedCost) : 0;
        cost = fixedNum;
      }
    } catch {
      cost = 0;
    }

    return {
      liveCostMinor: cost,
      liveHours: hoursNum,
      liveRateMinor: rateNum,
      liveFixedCostMinor: fixedNum,
    };
  }, [
    watchedPricingMethod,
    watchedHours,
    watchedHourlyRate,
    watchedFixedCost,
    project.hourlyRateMinor,
  ]);

  const liveDeltaDays = useMemo(() => {
    return calculateDeltaDays(watchedDeadline, project.originalDeadline);
  }, [watchedDeadline, project.originalDeadline]);

  const selectedDeliverable = useMemo(() => {
    return deliverables.find((d) => d.id === watchedDeliverableId);
  }, [deliverables, watchedDeliverableId]);

  const onSubmit = (data: FormValues) => {
    setFeedback(null);

    const formData = new FormData();
    formData.append("projectId", project.id);
    formData.append("title", data.title);
    formData.append("description", data.description);
    if (data.reason) formData.append("reason", data.reason);
    if (data.deliverableId) formData.append("deliverableId", data.deliverableId);
    formData.append("pricingMethod", data.pricingMethod);
    if (data.hours) formData.append("hours", data.hours);
    if (data.hourlyRate) formData.append("hourlyRate", data.hourlyRate);
    if (data.fixedCost) formData.append("fixedCost", data.fixedCost);
    if (data.proposedDeadline) formData.append("proposedDeadline", data.proposedDeadline);
    if (data.additionalDays) formData.append("additionalDays", data.additionalDays);
    if (data.internalNotes) formData.append("internalNotes", data.internalNotes);

    startTransition(async () => {
      if (isNew) {
        const result = await createChangeRequestDraftAction(null, formData);
        if (result.success && result.data?.id) {
          window.location.href = `/changes/${result.data.id}`;
        } else {
          setFeedback({
            text: result.message || "Failed to create change request draft.",
            isError: true,
          });
        }
      } else if (initialData) {
        const result = await updateChangeRequestDraftAction(
          initialData.id,
          null,
          formData
        );
        if (result.success) {
          setFeedback({
            text: "Draft saved successfully.",
            isError: false,
          });
        } else {
          setFeedback({
            text: result.message || "Failed to update draft.",
            isError: true,
          });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Project Baseline Header Card */}
      <Card className="bg-slate-50 border-slate-200/80">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Project Context</span>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">{project.name}</h2>
            <p className="text-slate-500">Client: {project.clientName}</p>
          </div>
          <div className="flex items-center gap-4 text-slate-600 sm:border-l sm:border-slate-200 sm:pl-4">
            <div>
              <span className="text-slate-400 block text-[11px]">Contract Budget</span>
              <span className="font-semibold text-slate-800">
                {formatMinorToCurrency(project.budgetMinor, project.currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Baseline Deadline</span>
              <span className="font-semibold text-slate-800">{project.originalDeadline}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Default Rate</span>
              <span className="font-semibold text-slate-800">
                {formatMinorToCurrency(project.hourlyRateMinor, project.currency)}/hr
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback banner */}
      {feedback && (
        <div
          role={feedback.isError ? "alert" : "status"}
          className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
            feedback.isError
              ? "bg-rose-50 border border-rose-200 text-rose-800"
              : "bg-emerald-50 border border-emerald-200 text-emerald-800"
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Scope Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Scope Details & Justification
                </CardTitle>
                <CardDescription className="text-xs">
                  Specify the requested deliverables adjustment and reason for commercial renegotiation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Proposal Title" htmlFor="titleInput" error={errors.title?.message} required>
                  <Input
                    id="titleInput"
                    placeholder="e.g. Additional Payment Gateway Integration (Stripe & PayPal)"
                    {...register("title")}
                    disabled={isPending}
                  />
                </FormField>

                <FormField
                  label="Detailed Description"
                  htmlFor="descriptionInput"
                  error={errors.description?.message}
                  required
                  hint="Clearly describe the exact specifications, technical commitments, and client-approved adjustments."
                >
                  <Textarea
                    id="descriptionInput"
                    rows={4}
                    placeholder="Describe what is being added, modified, or re-scoped in detail..."
                    {...register("description")}
                    disabled={isPending}
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Reason for Scope Adjustment"
                    htmlFor="reasonInput"
                    error={errors.reason?.message}
                    hint="Why is this change necessary? (e.g. Client requested feature addition)"
                  >
                    <Input
                      id="reasonInput"
                      placeholder="e.g. Client design pivot following user feedback"
                      {...register("reason")}
                      disabled={isPending}
                    />
                  </FormField>

                  <FormField
                    label="Affected Deliverable"
                    htmlFor="deliverableSelect"
                    error={errors.deliverableId?.message}
                    hint="Select the deliverable milestone impacted by this adjustment"
                  >
                    <Select id="deliverableSelect" {...register("deliverableId")} disabled={isPending}>
                      <option value="">General Project Scope (No specific deliverable)</option>
                      {deliverables.map((del) => (
                        <option key={del.id} value={del.id}>
                          {del.title} ({del.status})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Commercial Pricing Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  Commercial Pricing Method
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose between hourly estimate or a fixed-price scope charge. Currency is locked to {project.currency}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing Method Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <label
                    htmlFor="pricingMethodHourly"
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-xs ${
                      watchedPricingMethod === "hourly"
                        ? "border-indigo-600 bg-indigo-50/50 font-semibold text-indigo-950"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      id="pricingMethodHourly"
                      value="hourly"
                      {...register("pricingMethod")}
                      disabled={isPending}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block font-medium">Hourly Billing</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Calculated from hours × hourly rate
                      </span>
                    </div>
                  </label>

                  <label
                    htmlFor="pricingMethodFixed"
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-xs ${
                      watchedPricingMethod === "fixed"
                        ? "border-indigo-600 bg-indigo-50/50 font-semibold text-indigo-950"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      id="pricingMethodFixed"
                      value="fixed"
                      {...register("pricingMethod")}
                      disabled={isPending}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block font-medium">Fixed Fee Charge</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Pre-agreed lump sum for the change
                      </span>
                    </div>
                  </label>
                </div>

                {/* Hourly Pricing Inputs */}
                {watchedPricingMethod === "hourly" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <FormField
                      label="Estimated Hours"
                      htmlFor="estimatedHoursInput"
                      error={errors.hours?.message}
                      required
                      hint="Estimated effort (e.g. 12.5)"
                    >
                      <Input
                        id="estimatedHoursInput"
                        type="number"
                        step="0.25"
                        min="0"
                        placeholder="10.0"
                        {...register("hours")}
                        disabled={isPending}
                      />
                    </FormField>

                    <FormField
                      label={`Hourly Rate (${currencySymbol})`}
                      htmlFor="hourlyRateInput"
                      error={errors.hourlyRate?.message}
                      required
                      hint={`Inherited from project baseline (${project.currency})`}
                    >
                      <Input
                        id="hourlyRateInput"
                        type="text"
                        placeholder="150.00"
                        {...register("hourlyRate")}
                        disabled={isPending}
                      />
                    </FormField>
                  </div>
                ) : (
                  <div className="pt-2">
                    <FormField
                      label={`Fixed Charge Amount (${currencySymbol})`}
                      htmlFor="fixedCostInput"
                      error={errors.fixedCost?.message}
                      required
                      hint={`One-time commercial fee in ${project.currency}`}
                    >
                      <Input
                        id="fixedCostInput"
                        type="text"
                        placeholder="1500.00"
                        {...register("fixedCost")}
                        disabled={isPending}
                      />
                    </FormField>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Timeline & Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Proposed Milestone Deadline
                </CardTitle>
                <CardDescription className="text-xs">
                  Baseline deadline is {project.originalDeadline}. Set the revised delivery target or enter additional days.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Proposed Completion Date"
                    htmlFor="proposedDeadlineInput"
                    error={errors.proposedDeadline?.message}
                    hint="Target date for updated milestone"
                  >
                    <Input
                      id="proposedDeadlineInput"
                      type="date"
                      value={watchedDeadline || ""}
                      onChange={(e) => handleProposedDeadlineChange(e.target.value)}
                      disabled={isPending}
                    />
                  </FormField>

                  <FormField
                    label="Additional Calendar Days"
                    htmlFor="additionalDaysInput"
                    error={errors.additionalDays?.message}
                    hint="Extends deadline relative to contract baseline"
                  >
                    <Input
                      id="additionalDaysInput"
                      type="number"
                      min="0"
                      placeholder="e.g. 14"
                      {...register("additionalDays")}
                      onChange={(e) => handleAdditionalDaysChange(e.target.value)}
                      disabled={isPending}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Internal Agency Notes */}
            <Card className="border-amber-200/80 bg-amber-50/20">
              <CardHeader>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Internal Agency Notes
                </CardTitle>
                <CardDescription className="text-xs text-amber-800">
                  <strong>CONFIDENTIAL:</strong> These notes are stored exclusively for internal team review and are NEVER displayed on client proposals or approval pages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  label="Private Internal Notes"
                  htmlFor="internalNotesInput"
                  error={errors.internalNotes?.message}
                  hint="Log contractor margin notes, client negotiation history, or internal implementation details."
                >
                  <Textarea
                    id="internalNotesInput"
                    rows={3}
                    placeholder="e.g. Subcontractor cost is $80/hr; margin retained is $95/hr. Discussed with client on Zoom call on Tuesday."
                    {...register("internalNotes")}
                    disabled={isPending}
                  />
                </FormField>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Impact Panel & Actions */}
          <div className="space-y-6">
            <LiveImpactPanel
              pricingMethod={watchedPricingMethod}
              hours={liveHours}
              rateMinor={liveRateMinor}
              fixedCostMinor={liveFixedCostMinor}
              costMinor={liveCostMinor}
              currency={project.currency}
              originalBudgetMinor={project.budgetMinor}
              approvedExtraMinor={project.approvedExtraMinor}
              originalDeadline={project.originalDeadline}
              proposedDeadline={watchedDeadline || null}
              deltaDays={liveDeltaDays}
            />

            {/* Action Buttons Card */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isPending}
                  disabled={isPending}
                  leftIcon={<Save className="w-4 h-4" />}
                  id="saveDraftButton"
                >
                  {isNew ? "Save Draft Proposal" : "Save Draft Changes"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setIsPreviewOpen(true)}
                  leftIcon={<Eye className="w-4 h-4" />}
                  id="previewProposalButton"
                >
                  Preview Client Proposal
                </Button>

                {isNew ? (
                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full opacity-60 cursor-not-allowed"
                      disabled={true}
                      leftIcon={<Send className="w-4 h-4" />}
                      id="submitForApprovalButton"
                    >
                      Submit for Approval
                    </Button>
                    <p className="text-[11px] text-slate-400 mt-1.5 text-center leading-tight" id="submitForApprovalHelpText">
                      Client approval dispatch and signing links will be enabled once this draft is saved.
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleSubmitForApproval}
                      isLoading={isPublishing}
                      disabled={isPublishing || isPending}
                      leftIcon={<Send className="w-4 h-4" />}
                      id="submitForApprovalButton"
                    >
                      Submit for Approval
                    </Button>
                    <p className="text-[11px] text-slate-500 mt-1.5 text-center leading-tight" id="submitForApprovalHelpText">
                      Freezes draft into Version {((initialData?.currentVersion || 0) + 1)} and generates client sign-off link.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Client Preview Modal */}
      <ProposalPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        projectName={project.name}
        clientName={project.clientName}
        currency={project.currency}
        title={watchedTitle}
        description={watchedDescription}
        reason={watchedReason}
        deliverableTitle={selectedDeliverable?.title}
        pricingMethod={watchedPricingMethod}
        hours={liveHours}
        rateMinor={liveRateMinor}
        costMinor={liveCostMinor}
        originalBudgetMinor={project.budgetMinor}
        originalDeadline={project.originalDeadline}
        proposedDeadline={watchedDeadline || null}
        deltaDays={liveDeltaDays}
      />

      {/* Client Published Link Dialog */}
      {publishedLink && (
        <PublishedLinkDialog
          isOpen={true}
          onClose={handleClosePublishedDialog}
          shareUrl={publishedLink.shareUrl}
          expiresAt={publishedLink.expiresAt}
          versionNumber={publishedLink.versionNumber}
        />
      )}
    </div>
  );
}
