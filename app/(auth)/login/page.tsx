import React from "react";
import { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In - ScopeGuard",
  description: "Sign in to manage client change requests and project budgets.",
};

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
    email?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error, email } = await searchParams;

  return <LoginForm next={next} initialError={error} defaultEmail={email} />;
}

