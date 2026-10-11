import React from "react";
import { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password - ScopeGuard",
  description: "Set a new password for your ScopeGuard account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}

