import React from "react";
import { Metadata } from "next";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Create Workspace - ScopeGuard",
  description: "Create an agency workspace on ScopeGuard to protect your project scopes.",
};

interface SignUpPageProps {
  searchParams: Promise<{
    next?: string;
    email?: string;
  }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { next, email } = await searchParams;

  return <SignUpForm next={next} defaultEmail={email} />;
}

