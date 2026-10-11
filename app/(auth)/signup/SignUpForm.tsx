"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
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
} from "lucide-react";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  // If email verification is required, display confirmation guide
  if (state?.data?.confirmationRequired) {
    return (
      <div className="text-center space-y-5 animate-in fade-in-50">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
          <MailCheck className="h-7 w-7" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Check your email
          </h1>
          <p className="mt-1.5 text-xs text-slate-600">
            We sent a verification link to{" "}
            <span className="font-semibold text-slate-900">
              {state.data.email}
            </span>
            . Please click the link to confirm your account.
          </p>
        </div>

        {/* Local Development Guidance Box */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-xs text-slate-600 space-y-2">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <span>Local Development Instructions</span>
          </div>
          <p className="leading-relaxed">
            In local development with Supabase, emails are captured locally. You
            can view the confirmation message in:
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
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Create your agency workspace
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Get started with client-approved scope changes and budget protection.
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
    </form>
  );
}
