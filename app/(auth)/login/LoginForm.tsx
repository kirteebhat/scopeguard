"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Mail, Lock, AlertCircle } from "lucide-react";

interface LoginFormProps {
  next?: string;
  initialError?: string;
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  const errorMessage =
    state?.message ||
    (initialError === "auth_callback_failed"
      ? "Authentication link expired or invalid. Please log in with your credentials."
      : undefined);

  return (
    <form action={formAction} className="space-y-5" noValidate>
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

      {/* Password Field */}
      <FormField
        label="Password"
        htmlFor="password"
        required
        error={state?.fieldErrors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          required
          disabled={isPending}
          prefixElement={<Lock className="w-4 h-4 text-slate-600" />}
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
