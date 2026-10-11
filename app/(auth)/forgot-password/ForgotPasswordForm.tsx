"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Mail, MailCheck, AlertCircle, ArrowLeft } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null);

  if (state?.success && state?.message) {
    return (
      <div className="text-center space-y-5 animate-in fade-in-50">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
          <MailCheck className="h-7 w-7" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Check your email
          </h1>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {state.message}
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Reset your password
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Enter your email address and we will send you instructions to reset your password.
        </p>
      </div>

      {/* Error Alert Banner */}
      {state?.message && !state?.success && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in-50"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{state.message}</span>
        </div>
      )}

      {/* Email Field */}
      <FormField
        label="Email address"
        htmlFor="email"
        required
        error={state?.fieldErrors?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="founder@agency.com"
          required
          disabled={isPending}
          prefixElement={<Mail className="w-4 h-4 text-slate-600" />}
          hasError={!!state?.fieldErrors?.email?.[0]}
        />
      </FormField>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isLoading={isPending}
        disabled={isPending}
      >
        {isPending ? "Sending instructions..." : "Send reset instructions"}
      </Button>

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
