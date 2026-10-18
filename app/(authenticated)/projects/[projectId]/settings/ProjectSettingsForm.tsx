"use client";

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateProjectAction } from "@/app/actions/projects";
import { parseDecimalToMinor, minorToDecimalString, SUPPORTED_CURRENCIES } from "@/lib/domain/money";
import { ISO_DATE_REGEX, isValidDateString } from "@/lib/validation/project";
import type { ProjectDetail } from "@/lib/data/projects";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertCircle, CheckCircle2, Lock, Save, DollarSign, Sliders } from "lucide-react";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";

const projectSettingsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters")
      .max(100, "Project name cannot exceed 100 characters"),
    clientName: z
      .string()
      .trim()
      .min(2, "Client name must be at least 2 characters")
      .max(100, "Client name cannot exceed 100 characters"),
    clientContactName: z
      .string()
      .trim()
      .max(100, "Contact name cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    clientContactEmail: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(255, "Email cannot exceed 255 characters")
      .optional()
      .or(z.literal("")),
    status: z.enum(["active", "completed", "on_hold", "archived"]),
    description: z.string().trim().max(2000, "Description cannot exceed 2000 characters").optional(),
    currency: z.string().length(3, "Select a valid 3-letter currency code"),
    budget: z.string().trim().refine((val) => {
      try {
        const minor = parseDecimalToMinor(val);
        return minor >= 0;
      } catch {
        return false;
      }
    }, "Enter a non-negative amount (e.g. 50000 or 50000.00)"),
    hourlyRate: z.string().trim().refine((val) => {
      try {
        const minor = parseDecimalToMinor(val);
        return minor >= 0;
      } catch {
        return false;
      }
    }, "Enter a non-negative hourly rate (e.g. 150 or 150.00)"),
    startDate: z
      .string()
      .regex(ISO_DATE_REGEX, "Format must be YYYY-MM-DD")
      .refine(isValidDateString, "Invalid calendar date"),
    originalDeadline: z
      .string()
      .regex(ISO_DATE_REGEX, "Format must be YYYY-MM-DD")
      .refine(isValidDateString, "Invalid calendar date"),
  })
  .refine((data) => data.originalDeadline >= data.startDate, {
    message: "Original deadline must be on or after the project start date",
    path: ["originalDeadline"],
  });

type SettingsFormValues = z.infer<typeof projectSettingsSchema>;

interface ProjectSettingsFormProps {
  project: ProjectDetail;
  userRole: "owner" | "manager" | "member";
}

export function ProjectSettingsForm({ project, userRole }: ProjectSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const isMember = userRole === "member";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: project.name,
      clientName: project.clientName,
      clientContactName: project.clientContactName || "",
      clientContactEmail: project.clientContactEmail || "",
      status: project.status,
      description: project.description || "",
      currency: project.currency,
      budget: minorToDecimalString(project.budgetMinor),
      hourlyRate: minorToDecimalString(project.hourlyRateMinor),
      startDate: project.startDate,
      originalDeadline: project.originalDeadline,
    },
  });

  useUnsavedChangesWarning(isDirty);

  const selectedCurrency = watch("currency") || project.currency;
  const currencySymbol = SUPPORTED_CURRENCIES[selectedCurrency]?.symbol || selectedCurrency;

  const onSubmit = (data: SettingsFormValues) => {
    setFeedback(null);
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("clientName", data.clientName);
    formData.append("clientContactName", data.clientContactName || "");
    formData.append("clientContactEmail", data.clientContactEmail || "");
    formData.append("status", data.status);
    formData.append("description", data.description || "");
    formData.append("startDate", data.startDate);
    formData.append("originalDeadline", data.originalDeadline);

    // If member, do not append financial fields (they are disabled)
    // If not member, append financial fields
    if (!isMember) {
      formData.append("currency", data.currency);
      formData.append("budget", data.budget);
      formData.append("hourlyRate", data.hourlyRate);
    }

    startTransition(async () => {
      const res = await updateProjectAction(project.id, null, formData);
      if (res.success) {
        setFeedback({
          text: res.message || "Project updated successfully.",
          isError: false,
        });
      } else {
        setFeedback({
          text: res.message || "Failed to update project settings.",
          isError: true,
        });
      }
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          General Settings & Commercial Terms
        </CardTitle>
        <CardDescription className="text-xs">
          Update project identity, operational status, timeline, and contractual baseline financials.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {feedback && (
            <div
              role={feedback.isError ? "alert" : "status"}
              className={`p-3.5 rounded-lg text-xs flex items-start gap-2.5 ${
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

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Project Name" error={errors.name?.message} required>
              <Input
                {...register("name")}
                placeholder="e.g. ScopeGuard SaaS MVP"
                disabled={isPending}
                id="projectNameInput"
              />
            </FormField>

            <FormField label="Client Name" error={errors.clientName?.message} required>
              <Input
                {...register("clientName")}
                placeholder="e.g. Acme Corporation"
                disabled={isPending}
                id="clientNameInput"
              />
            </FormField>
          </div>

          {/* Client Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <FormField
              label="Primary Client Contact Name"
              error={errors.clientContactName?.message}
              hint="Lead reviewer for proposal approvals (optional)"
            >
              <Input
                {...register("clientContactName")}
                placeholder="e.g. Jonathan Miller"
                disabled={isPending}
                id="clientContactNameInput"
              />
            </FormField>

            <FormField
              label="Primary Client Contact Email"
              error={errors.clientContactEmail?.message}
              hint="Pre-fills proposal delivery recipient"
            >
              <Input
                type="email"
                {...register("clientContactEmail")}
                placeholder="e.g. jonathan@acme.com"
                disabled={isPending}
                id="clientContactEmailInput"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Project Status" error={errors.status?.message} required>
              <Select {...register("status")} disabled={isPending} id="projectStatusSelect">
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            </FormField>

            <FormField
              label="Start Date"
              error={errors.startDate?.message}
              required
              hint="Contractual kickoff date"
            >
              <div className="relative">
                <Input
                  type="date"
                  {...register("startDate")}
                  disabled={isPending}
                  id="startDateInput"
                />
              </div>
            </FormField>

            <FormField
              label="Original Deadline"
              error={errors.originalDeadline?.message}
              required
              hint="Agreed delivery milestone"
            >
              <div className="relative">
                <Input
                  type="date"
                  {...register("originalDeadline")}
                  disabled={isPending}
                  id="originalDeadlineInput"
                />
              </div>
            </FormField>
          </div>

          <FormField
            label="Original Scope Description"
            error={errors.description?.message}
            hint="Summarize agreed scope, milestones, and deliverable boundaries"
          >
            <Textarea
              {...register("description")}
              rows={3}
              placeholder="Outline what was contracted in the original scope agreement..."
              disabled={isPending}
              id="projectDescriptionInput"
            />
          </FormField>

          {/* Financial Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                Contract Financial Baselines
              </span>
              {isMember && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3 h-3" />
                  Read-only for team members
                </span>
              )}
            </div>

            {isMember && (
              <div
                className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2"
                data-testid="member-money-warning"
              >
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Access restricted:</strong> Only project managers and owners can modify contractual budget baselines, hourly rates, or currency.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Currency"
                error={errors.currency?.message}
                required
                hint={isMember ? "Restricted" : "ISO 3-letter code"}
              >
                <Select
                  {...register("currency")}
                  disabled={isMember || isPending}
                  id="currencySelect"
                  aria-disabled={isMember}
                >
                  {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label={`Initial Budget (${currencySymbol})`}
                error={errors.budget?.message}
                required
                hint={isMember ? "Restricted" : "Agreed fixed contract price"}
              >
                <Input
                  {...register("budget")}
                  disabled={isMember || isPending}
                  id="budgetInput"
                  placeholder="0.00"
                  aria-disabled={isMember}
                />
              </FormField>

              <FormField
                label={`Hourly Rate (${currencySymbol})`}
                error={errors.hourlyRate?.message}
                required
                hint={isMember ? "Restricted" : "Base rate for billable changes"}
              >
                <Input
                  {...register("hourlyRate")}
                  disabled={isMember || isPending}
                  id="hourlyRateInput"
                  placeholder="0.00"
                  aria-disabled={isMember}
                />
              </FormField>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 bg-slate-50/50 border-t border-slate-100">
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            leftIcon={<Save className="w-4 h-4" />}
            id="saveProjectSettingsButton"
          >
            Save Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
