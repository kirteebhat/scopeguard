"use client";

import React, { useActionState } from "react";
import { createWorkspaceAction } from "@/app/actions/workspace";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Building2, AlertCircle } from "lucide-react";
import type { ActionState } from "@/app/actions/auth";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    createWorkspaceAction,
    null
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.message && !state.success && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{state.message}</span>
        </div>
      )}

      <FormField
        label="Agency or Workspace Name"
        htmlFor="workspaceName"
        required
        error={state?.fieldErrors?.name?.[0]}
        hint="You can update this name later in workspace settings."
      >
        <Input
          id="workspaceName"
          name="name"
          placeholder="e.g., Acme Studio, Apex Digital"
          required
          hasError={!!state?.fieldErrors?.name?.[0]}
          disabled={isPending}
          autoFocus
        />
      </FormField>

      <Button
        type="submit"
        variant="primary"
        className="w-full justify-center"
        isLoading={isPending}
        leftIcon={<Building2 className="w-4 h-4" />}
      >
        {isPending ? "Creating Workspace..." : "Create Workspace & Continue"}
      </Button>
    </form>
  );
}

