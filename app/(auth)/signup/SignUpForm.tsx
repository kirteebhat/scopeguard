"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { signUpAction, resendVerificationAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import {
  User,
  Building,
  Mail,
  Lock,
  AlertCircle,
  MailCheck,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  KeyRound,
} from "lucide-react";

interface SignUpFormProps {
  defaultEmail?: string;
  next?: string;
}

export function SignUpForm({ defaultEmail, next }: SignUpFormProps = {}) {
  const shouldReduceMotion = useReducedMotion();
  const [state, formAction, isPending] = useActionState(signUpAction, null);
  const [resendState, setResendState] = useState<{
    loading: boolean;
    message?: string;
    isError?: boolean;
  }>({ loading: false });

  const handleResend = async (email: string) => {
    setResendState({ loading: true });
    const formData = new FormData();
    formData.append("email", email);
    try {
      const res = await resendVerificationAction(null, formData);
      if (res.success) {
        setResendState({
          loading: false,
          message: "A fresh verification link has been sent to your email.",
          isError: false,
        });
      } else {
        setResendState({
          loading: false,
          message: res.message || "Failed to resend verification email.",
          isError: true,
        });
      }
    } catch {
      setResendState({
        loading: false,
        message: "An unexpected error occurred while resending.",
        isError: true,
      });
    }
  };

  const isConfirmation = Boolean(state?.data?.confirmationRequired && state?.data?.email);
  const email = state?.data?.email || "";

  return (
    <AnimatePresence mode="wait">
      {isConfirmation ? (
        <motion.div
          key="confirmation-step"
          initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="text-center space-y-5"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <MailCheck className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Check your email
            </h1>
            <p className="mt-1.5 text-xs text-slate-600">
              We sent a verification link to{" "}
              <span className="font-semibold text-slate-900">{email}</span>. Please click the link to confirm your account.
            </p>
          </div>

          {/* Resend notification status */}
          {resendState.message && (
            <div
              role="status"
              className={`p-3 rounded-xl text-xs ${
                resendState.isError
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              {resendState.message}
            </div>
          )}

          {/* Resend Action */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleResend(email)}
              isLoading={resendState.loading}
              disabled={resendState.loading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Resend verification email
            </Button>
          </div>

          {/* Local Development Guidance Box */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span>Local Development Instructions</span>
            </div>
            <p className="leading-relaxed">
              In local development with Supabase, emails are captured locally. You can view the confirmation message in:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>
                <strong>Inbucket Web Mailbox:</strong>{" "}
                <a
                  href="http://127.0.0.1:54324"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  http://127.0.0.1:54324
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <strong>Supabase CLI:</strong> run{" "}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">
                  supabase status
                </code>{" "}
                to check the local mail server URL.
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="signup-form"
          initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, x: 20 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          action={formAction}
          className="space-y-4"
          noValidate
        >
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Create your agency workspace
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Get started with client-approved scope changes and budget protection.
            </p>
          </div>

          {next && <input type="hidden" name="next" value={next} />}

      {/* Helpful Existing Confirmed Account Notice with Action Links */}
      {state?.data?.existingAccount ? (
        <div
          role="alert"
          className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs space-y-3 animate-in fade-in-50"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-950">
                An account with this email already exists
              </p>
              <p className="text-indigo-700 mt-0.5">
                {state.data.email ? (
                  <span>
                    <strong>{state.data.email}</strong> is already registered.
                  </span>
                ) : (
                  "This email is already registered."
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link href="/login" className="flex-1">
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs font-semibold"
                leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Sign In to Account
              </Button>
            </Link>
            <Link href="/forgot-password" className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold border-indigo-200 text-indigo-800 hover:bg-indigo-100/60"
                leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              >
                Reset Password
              </Button>
            </Link>
          </div>
        </div>
      ) : state?.message ? (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in-50"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{state.message}</span>
        </div>
      ) : null}

      {/* Full Name Field */}
      <FormField
        label="Full name"
        htmlFor="fullName"
        required
        error={state?.fieldErrors?.fullName?.[0]}
      >
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          required
          disabled={isPending}
          prefixElement={<User className="w-4 h-4 text-slate-600" />}
          hasError={!!state?.fieldErrors?.fullName?.[0]}
        />
      </FormField>

      {/* Workspace Name Field */}
      <FormField
        label="Agency / Workspace name"
        htmlFor="workspaceName"
        required
        error={state?.fieldErrors?.workspaceName?.[0]}
      >
        <Input
          id="workspaceName"
          name="workspaceName"
          type="text"
          placeholder="Apex Design Studio"
          required
          disabled={isPending}
          prefixElement={<Building className="w-4 h-4 text-slate-600" />}
          hasError={!!state?.fieldErrors?.workspaceName?.[0]}
        />
      </FormField>

      {/* Email Field */}
      <FormField
        label="Work email address"
        htmlFor="email"
        required
        error={state?.fieldErrors?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jane@apexstudio.com"
          defaultValue={defaultEmail}
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

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isPending}
          disabled={isPending}
        >
          {isPending ? "Creating workspace..." : "Create workspace"}
        </Button>
      </div>

      {/* Footer link */}
      <div className="pt-2 text-center text-xs text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors focus-visible:outline-hidden focus-visible:underline"
        >
          Sign in
        </Link>
      </div>
    </motion.form>
    )}
    </AnimatePresence>
  );
}
