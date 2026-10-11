import React from "react";
import { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password - ScopeGuard",
  description: "Request password recovery instructions for your ScopeGuard account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

