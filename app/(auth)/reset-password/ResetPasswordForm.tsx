"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Lock, AlertCircle, ArrowLeft } from "lucide-react";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Set new password
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Choose a secure password for your ScopeGuard account.
        </p>
      </div>

      {/* Error Alert Banner */}
      {state?.message && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in-50"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{state.message}</span>
        </div>
      )}

      {/* New Password Field */}
      <FormField
        label="New password"
        htmlFor="password"
        required
        error={state?.fieldErrors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          required
          disabled={isPending}
          prefixElement={<Lock className="w-4 h-4 text-slate-600" />}
          hasError={!!state?.fieldErrors?.password?.[0]}
        />
        <p className="mt-1 text-[11px] text-slate-600">
          Must be at least 8 characters with 1 uppercase letter and 1 number.
        </p>
      </FormField>

      {/* Confirm Password Field */}
      <FormField
        label="Confirm new password"
        htmlFor="confirmPassword"
        required
        error={state?.fieldErrors?.confirmPassword?.[0]}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          required
          disabled={isPending}
          prefixElement={<Lock className="w-4 h-4 text-slate-600" />}
          hasError={!!state?.fieldErrors?.confirmPassword?.[0]}
        />
      </FormField>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isPending}
          disabled={isPending}
        >
          {isPending ? "Updating password..." : "Update password"}
        </Button>
      </div>

      {/* Back to sign in link */}
      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-hidden focus-visible:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}
