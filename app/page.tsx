import React from "react";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  LandingHeader,
  LandingHero,
  LandingHowItWorks,
  LandingWorkflowExample,
  LandingBenefits,
  LandingPricing,
  LandingFAQ,
  LandingFooter,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "ScopeGuard — Eliminate Unapproved Scope Creep for Software Agencies",
  description:
    "Transform informal client change requests into approved scope orders. Zero client login friction, live financial impact calculations, and immutable audit trails.",
  openGraph: {
    title: "ScopeGuard — Eliminate Unapproved Scope Creep for Software Agencies",
    description:
      "Transform informal client change requests into approved scope orders with frictionless 30-second mobile sign-off and immutable audit trails.",
    url: "https://scopeguard.app",
    siteName: "ScopeGuard",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScopeGuard — Eliminate Unapproved Scope Creep",
    description:
      "Fast mobile client sign-off, live impact math, and immutable audit trails for software consultancies.",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <LandingHeader isAuthenticated={!!user} />

      <main id="main-content" className="grow">
        <LandingHero />
        <LandingHowItWorks />
        <LandingWorkflowExample />
        <LandingBenefits />
        <LandingPricing />
        <LandingFAQ />
      </main>

      <LandingFooter />
    </div>
  );
}
