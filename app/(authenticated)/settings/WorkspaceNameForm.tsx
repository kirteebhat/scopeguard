"use client";

import React, { useState, useTransition } from "react";
import { updateWorkspaceAction } from "@/app/actions/workspace";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/app/actions/auth";

interface WorkspaceNameFormProps {
  initialName: string;
  isOwner: boolean;
}

export function WorkspaceNameForm({ initialName, isOwner }: WorkspaceNameFormProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateWorkspaceAction(null, formData);
      setState(res);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {state?.message && !state.success && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{state.message}</span>
        </div>
      )}

      {state?.message && state.success && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <span>{state.message}</span>
        </div>
      )}

      <FormField
        label="Workspace Name"
        htmlFor="workspaceNameInput"
        error={state?.fieldErrors?.name?.[0]}
        hint={
          isOwner
            ? "Your agency name is displayed on client approval links and proposals."
            : "Only the workspace owner can rename the workspace."
        }
      >
        <Input
          id="workspaceNameInput"
          name="name"
          defaultValue={initialName}
          disabled={!isOwner || isPending}
          required
          hasError={!!state?.fieldErrors?.name?.[0]}
          className={!isOwner ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}
        />
      </FormField>

      {isOwner && (
        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
          >
            {isPending ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      )}
    </form>
  );
}

