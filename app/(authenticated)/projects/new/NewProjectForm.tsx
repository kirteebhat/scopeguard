"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProjectAction } from "@/app/actions/projects";
import { parseDecimalToMinor, SUPPORTED_CURRENCIES } from "@/lib/domain/money";
import { ISO_DATE_REGEX, isValidDateString } from "@/lib/validation/project";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertCircle, Plus, Trash2, Layers, DollarSign, Calendar } from "lucide-react";

const clientProjectFormSchema = z
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
    description: z.string().trim().max(2000, "Description cannot exceed 2000 characters").optional(),
  })
  .refine((data) => data.originalDeadline >= data.startDate, {
    message: "Original deadline must be on or after the project start date",
    path: ["originalDeadline"],
  });

type FormValues = z.infer<typeof clientProjectFormSchema>;

interface LocalDeliverable {
  id: string;
  title: string;
  description: string;
}

export function NewProjectForm() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Deliverables local state
  const [deliverables, setDeliverables] = useState<LocalDeliverable[]>([]);
  const [newDelTitle, setNewDelTitle] = useState("");
  const [newDelDesc, setNewDelDesc] = useState("");
  const [delError, setDelError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const defaultDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(clientProjectFormSchema),
    defaultValues: {
      name: "",
      clientName: "",
      currency: "USD",
      budget: "10000.00",
      hourlyRate: "150.00",
      startDate: todayStr,
      originalDeadline: defaultDeadline,
      description: "",
    },
  });

  const selectedCurrency = watch("currency") || "USD";
  const currencySymbol = SUPPORTED_CURRENCIES[selectedCurrency]?.symbol || selectedCurrency;

  const handleAddDeliverable = () => {
    if (newDelTitle.trim().length < 2) {
      setDelError("Deliverable title must be at least 2 characters.");
      return;
    }
    setDelError(null);
    setDeliverables((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: newDelTitle.trim(),
        description: newDelDesc.trim(),
      },
    ]);
    setNewDelTitle("");
    setNewDelDesc("");
  };

  const handleRemoveDeliverable = (id: string) => {
    setDeliverables((prev) => prev.filter((d) => d.id !== id));
  };

  const onSubmit = (data: FormValues) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("clientName", data.clientName);
    formData.append("currency", data.currency);
    formData.append("budget", data.budget);
    formData.append("hourlyRate", data.hourlyRate);
    formData.append("startDate", data.startDate);
    formData.append("originalDeadline", data.originalDeadline);
    if (data.description) formData.append("description", data.description);

    if (deliverables.length > 0) {
      formData.append(
        "deliverablesJson",
        JSON.stringify(
          deliverables.map((d) => ({
            title: d.title,
            description: d.description || null,
          }))
        )
      );
    }

    startTransition(async () => {
      const result = await createProjectAction(null, formData);
      if (result && result.success && (result.data as { id?: string })?.id) {
        window.location.href = `/projects/${(result.data as { id?: string }).id}`;
      } else if (result && !result.success) {
        setServerError(result.message || "Failed to create project. Please verify inputs.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Project Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Project Identity</CardTitle>
          <CardDescription className="text-xs">
            Client name and contractual project title as stated in the master services agreement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Project Name"
              htmlFor="nameInput"
              error={errors.name?.message}
              required
            >
              <Input
                id="nameInput"
                placeholder="e.g. Mobile App Redesign"
                {...register("name")}
                hasError={!!errors.name}
                disabled={isPending}
              />
            </FormField>

            <FormField
              label="Client Name"
              htmlFor="clientNameInput"
              error={errors.clientName?.message}
              required
            >
              <Input
                id="clientNameInput"
                placeholder="e.g. Acme Corporation"
                {...register("clientName")}
                hasError={!!errors.clientName}
                disabled={isPending}
              />
            </FormField>
          </div>

          <FormField
            label="Project Description (Optional)"
            htmlFor="descriptionInput"
            error={errors.description?.message}
            hint="Summarize the core objectives or deliverable commitments of this agreement."
          >
            <Textarea
              id="descriptionInput"
              placeholder="Provide a brief summary of the agreed project scope..."
              rows={3}
              {...register("description")}
              disabled={isPending}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Financial Baseline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            Financial Baseline
          </CardTitle>
          <CardDescription className="text-xs">
            Fixed budget cap, contractual billing currency, and default hourly rate for scope change calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Contract Currency"
              htmlFor="currencyInput"
              error={errors.currency?.message}
              required
              hint="All change requests strictly inherit this currency."
            >
              <Select id="currencyInput" {...register("currency")} disabled={isPending}>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </Select>
            </FormField>

            <FormField
              label={`Original Budget (${currencySymbol})`}
              htmlFor="budgetInput"
              error={errors.budget?.message}
              required
              hint="Original contract price in major units."
            >
              <Input
                id="budgetInput"
                type="text"
                placeholder="10000.00"
                {...register("budget")}
                hasError={!!errors.budget}
                disabled={isPending}
              />
            </FormField>

            <FormField
              label={`Hourly Rate (${currencySymbol}/hr)`}
              htmlFor="hourlyRateInput"
              error={errors.hourlyRate?.message}
              required
              hint="Used as default rate for hourly change requests."
            >
              <Input
                id="hourlyRateInput"
                type="text"
                placeholder="150.00"
                {...register("hourlyRate")}
                hasError={!!errors.hourlyRate}
                disabled={isPending}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Baseline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Timeline Baseline
          </CardTitle>
          <CardDescription className="text-xs">
            Start date and contractual delivery deadline. Scope extension days calculate against this baseline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Start Date"
              htmlFor="startDateInput"
              error={errors.startDate?.message}
              required
            >
              <Input
                id="startDateInput"
                type="date"
                {...register("startDate")}
                hasError={!!errors.startDate}
                disabled={isPending}
              />
            </FormField>

            <FormField
              label="Original Contract Deadline"
              htmlFor="originalDeadlineInput"
              error={errors.originalDeadline?.message}
              required
              hint="Must be on or after the start date."
            >
              <Input
                id="originalDeadlineInput"
                type="date"
                {...register("originalDeadline")}
                hasError={!!errors.originalDeadline}
                disabled={isPending}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Initial Deliverables (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Core Deliverables (Optional)
          </CardTitle>
          <CardDescription className="text-xs">
            Key milestones or features defined in the original statement of work. You can also add more later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add deliverable bar */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Deliverable title (e.g. Design System)"
                value={newDelTitle}
                onChange={(e) => setNewDelTitle(e.target.value)}
                disabled={isPending}
                id="newDeliverableTitle"
              />
              <Input
                placeholder="Description or notes (optional)"
                value={newDelDesc}
                onChange={(e) => setNewDelDesc(e.target.value)}
                disabled={isPending}
                id="newDeliverableDesc"
              />
            </div>
            {delError && <p className="text-xs text-rose-600 font-medium">{delError}</p>}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddDeliverable}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                disabled={isPending}
                id="addDeliverableButton"
              >
                Add Deliverable
              </Button>
            </div>
          </div>

          {/* List of deliverables added */}
          {deliverables.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Deliverables included ({deliverables.length}):
              </span>
              <div className="space-y-2">
                {deliverables.map((del) => (
                  <div
                    key={del.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{del.title}</p>
                      {del.description && (
                        <p className="text-slate-500 text-[11px] mt-0.5">{del.description}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDeliverable(del.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      aria-label={`Remove ${del.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
          <Link href="/projects">
            <Button type="button" variant="secondary" disabled={isPending}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            id="createProjectSubmitButton"
          >
            {isPending ? "Creating Project..." : "Create Project"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
