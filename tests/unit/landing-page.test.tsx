import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
import { metadata } from "@/app/page";

describe("Landing Page Components Unit Test Suite", () => {
  it("LandingHeader: renders branding, navigation links, and unauthenticated CTAs", () => {
    const html = renderToStaticMarkup(<LandingHeader isAuthenticated={false} />);

    expect(html).toContain("ScopeGuard");
    expect(html).toContain('href="#how-it-works"');
    expect(html).toContain('href="#workflow-example"');
    expect(html).toContain('href="#benefits"');
    expect(html).toContain('href="#pricing"');
    expect(html).toContain('href="#faq"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Start Free");
    expect(html).toContain("Sign in");
  });

  it("LandingHeader: renders Dashboard link when user is authenticated", () => {
    const html = renderToStaticMarkup(<LandingHeader isAuthenticated={true} />);

    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Go to Dashboard");
  });

  it("LandingHero: renders clear headline about unapproved scope creep and CTA to /signup", () => {
    const html = renderToStaticMarkup(<LandingHero />);

    // Clear headline about unapproved scope creep
    expect(html).toContain("Stop Eating the Cost of");
    expect(html).toContain("Unapproved");
    expect(html).toContain("Client Scope Creep");

    // Primary CTA to /signup
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Create Workspace — Free");

    // Secondary action to interactive demo
    expect(html).toContain('href="#workflow-example"');
    expect(html).toContain("See Interactive Approval Demo");

    // Supporting copy
    expect(html).toContain("When clients request “just one quick addition”");
    expect(html).toContain("ScopeGuard gives your team a frictionless way to draft change orders");
  });

  it("LandingHowItWorks: renders 4 structured steps without vague filler", () => {
    const html = renderToStaticMarkup(<LandingHowItWorks />);

    expect(html).toContain("Set Contract Baseline");
    expect(html).toContain("Draft Scope Changes in 60s");
    expect(html).toContain("Generate Tokenized Link");
    expect(html).toContain("Client Approves on Mobile");
    expect(html).toContain("01");
    expect(html).toContain("02");
    expect(html).toContain("03");
    expect(html).toContain("04");
  });

  it("LandingWorkflowExample: renders clearly labeled live components and private notes protection", () => {
    // Agency Proposal View
    const agencyHtml = renderToStaticMarkup(<LandingWorkflowExample defaultTab="agency" />);

    // Clearly labeled as an example, not a mock screenshot
    expect(agencyHtml).toContain("Clearly labeled illustrative example");
    expect(agencyHtml).toContain("Built with real ScopeGuard React components, not a static mockup or fake screenshot");

    // Shows real figures and breakdown in agency view
    expect(agencyHtml).toContain("Multi-Currency Stripe &amp; Adyen Payment Gateway");
    expect(agencyHtml).toContain("₹50,000.00");
    expect(agencyHtml).toContain("30 Nov 2026");
    expect(agencyHtml).toContain("+15 calendar days delivery shift");
    expect(agencyHtml).toContain("Private Agency Internal Notes (Strictly Protected)");

    // Client Approval View
    const clientHtml = renderToStaticMarkup(<LandingWorkflowExample defaultTab="client" />);
    expect(clientHtml).toContain("+15 days from original deadline");
    expect(clientHtml).toContain("Rachel Green (VP Product)");
    expect(clientHtml).toContain("Approve Proposal");
    expect(clientHtml).toContain("Decline Proposal");
  });

  it("LandingBenefits: renders 6 core grounded engineering benefits", () => {
    const html = renderToStaticMarkup(<LandingBenefits />);

    expect(html).toContain("Zero Client Friction");
    expect(html).toContain("Immutable Audit Snapshots");
    expect(html).toContain("Integer-Precision Financial Math");
    expect(html).toContain("Multi-Currency Segregation");
    expect(html).toContain("Strict Boundary Isolation");
    expect(html).toContain("Atomic Concurrency Locking");
  });

  it("LandingPricing: renders all 4 pricing hypotheses labeled with payment-not-connected disclaimer", () => {
    const html = renderToStaticMarkup(<LandingPricing />);

    // 4 pricing tiers
    expect(html).toContain("Free");
    expect(html).toContain("₹0");

    expect(html).toContain("Pro");
    expect(html).toContain("₹799");
    expect(html).toContain("Most Popular");

    expect(html).toContain("Agency");
    expect(html).toContain("₹1,999");

    expect(html).toContain("Custom");

    // Labeled as launch hypotheses and payment not connected disclaimer
    expect(html).toContain("Launch Hypotheses · Payments Not Yet Connected");
    expect(html).toContain("Payments are not yet connected, and all features are currently free during the launch preview period");

    // Every tier button works and has valid href
    expect(html).toContain('href="/signup"');
    expect(html).toContain('href="mailto:hello@scopeguard.app"');
  });

  it("LandingFAQ: renders comprehensive operational questions and answers", () => {
    const html = renderToStaticMarkup(<LandingFAQ />);

    expect(html).toContain("Do our clients need to create an account or log in to approve changes?");
    expect(html).toContain("How does ScopeGuard calculate financial impact and deadlines?");
    expect(html).toContain("What happens if a client wants adjustments to a pending proposal?");
    expect(html).toContain("Can clients ever see our internal agency notes or margin calculations?");
    expect(html).toContain("Does ScopeGuard replace Jira, Linear, or our invoicing software?");
    expect(html).toContain("How does ScopeGuard handle multi-currency projects in one workspace?");
  });

  it("LandingFooter: renders branding, platform links, and security boundaries", () => {
    const html = renderToStaticMarkup(<LandingFooter />);

    expect(html).toContain("ScopeGuard");
    expect(html).toContain('href="/signup"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/projects"');
    expect(html).toContain("Row-Level Security (RLS) Default Deny");
    expect(html).toContain("Cryptographic 14-Day Bearer Tokens");
    expect(html).toContain("Launch Preview Notice: Payments are not connected");
  });

  it("Metadata: defines proper title, description, and OpenGraph configuration", () => {
    expect(metadata.title).toContain("ScopeGuard");
    expect(metadata.description).toContain("Transform informal client change requests");
    expect(metadata.openGraph?.title).toContain("ScopeGuard");
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe("website");
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe("summary_large_image");
  });
});
