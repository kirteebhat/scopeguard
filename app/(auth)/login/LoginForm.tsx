"use client";

import React, { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { loginAction, resendVerificationAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

interface LoginFormProps {
  next?: string;
  initialError?: string;
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [resendState, resendAction, isResending] = useActionState(resendVerificationAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [, startTransition] = useTransition();

  const isUnconfirmed = Boolean(state?.data?.emailNotConfirmed && state?.data?.email);

  const errorMessage =
    !isUnconfirmed &&
    (state?.message ||
      (initialError === "auth_callback_failed"
        ? "Authentication link expired or invalid. Please log in with your credentials."
        : undefined));

  const handleResend = () => {
    if (!state?.data?.email) return;
    const formData = new FormData();
    formData.append("email", state.data.email);
    startTransition(() => {
      resendAction(formData);
    });
  };

  return (
    <form
      action={formAction}
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        if (isPending) e.preventDefault();
      }}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Enter your agency email and password to access your dashboard.
        </p>
      </div>

      {/* Hidden next URL parameter */}
      {next && <input type="hidden" name="next" value={next} />}

      {/* Unconfirmed Email Actionable Banner */}
      {isUnconfirmed && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5 animate-in fade-in-50"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">Email confirmation required</p>
              <p className="leading-relaxed text-amber-800">
                Your email address <strong className="font-medium text-amber-950">{state?.data?.email}</strong> has not been confirmed. Please check your inbox or click below to receive a new link.
              </p>
            </div>
          </div>

          <div className="pl-6.5 pt-0.5">
            {resendState?.success ? (
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verification link sent! Check your inbox.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  isLoading={isResending}
                  disabled={isResending}
                  className="bg-white hover:bg-amber-100/50 border-amber-300 text-amber-900 font-medium shadow-none h-7 px-2.5 text-xs"
                >
                  {isResending ? "Sending link..." : "Resend verification email"}
                </Button>
                {resendState?.message && (
                  <p className="text-rose-600 font-medium">{resendState.message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in-50"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
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

      {/* Password Field with Show/Hide toggle */}
      <FormField
        label="Password"
        htmlFor="password"
        required
        error={state?.fieldErrors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••••••"
          required
          disabled={isPending}
          prefixElement={<Lock className="w-4 h-4 text-slate-600" />}
          suffixElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-slate-500 hover:text-slate-700 transition-colors focus-visible:outline-indigo-600 p-0.5 rounded cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
          hasError={!!state?.fieldErrors?.password?.[0]}
        />
      </FormField>

      <div className="flex items-center justify-end">
        <Link
          href="/forgot-password"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors focus-visible:outline-hidden focus-visible:underline"
        >
          Forgot your password?
        </Link>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isLoading={isPending}
        disabled={isPending}
      >
        {isPending ? "Signing in..." : "Sign in"}
      </Button>

      {/* Footer link to Sign Up */}
      <div className="pt-2 text-center text-xs text-slate-600">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors focus-visible:outline-hidden focus-visible:underline"
        >
          Create one now
        </Link>
      </div>
    </form>
  );
}
