import React from "react";
import { Metadata } from "next";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Create Workspace - ScopeGuard",
  description: "Create an agency workspace on ScopeGuard to protect your project scopes.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}

