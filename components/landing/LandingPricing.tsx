"use client";

import React from "react";
import Link from "next/link";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LandingPricing() {
  const tiers = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "For solo developers and freelance technical consultants.",
      features: [
        "Up to 2 active projects",
        "Unlimited change request drafts",
        "14-day client approval links",
        "Live budget & deadline impact math",
        "Basic project activity history",
      ],
      ctaText: "Start Free",
      ctaHref: "/signup",
      popular: false,
      variant: "outline" as const,
    },
    {
      name: "Pro",
      price: "₹799",
      period: "per month",
      description: "For boutique studios and growing engineering teams.",
      features: [
        "Up to 10 active projects",
        "Multi-currency financial rollups",
        "Up to 5 team members",
        "Role-based access (Owner, Manager, Member)",
        "Immutable version snapshots",
        "Workspace audit activity trail",
      ],
      ctaText: "Start Pro Trial",
      ctaHref: "/signup",
      popular: true,
      variant: "primary" as const,
    },
    {
      name: "Agency",
      price: "₹1,999",
      period: "per month",
      description: "For scaling agencies managing high-volume client retainers.",
      features: [
        "Unlimited active projects",
        "Unlimited team members",
        "Granular deliverable hierarchies",
        "Cross-project financial rollups",
        "Revision & version diffing",
        "Priority product support",
      ],
      ctaText: "Choose Agency",
      ctaHref: "/signup",
      popular: false,
      variant: "outline" as const,
    },
    {
      name: "Custom",
      price: "Custom",
      period: "tailored billing",
      description: "For multi-entity consultancies with bespoke compliance requirements.",
      features: [
        "Custom active project volume",
        "Dedicated onboarding review",
        "Enterprise SLA & security verification",
        "Custom contract baseline templates",
        "Multi-workspace administration",
      ],
      ctaText: "Contact Us",
      ctaHref: "mailto:hello@scopeguard.app",
      popular: false,
      variant: "outline" as const,
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-600" />
            <span>Launch Hypotheses · Payments Not Yet Connected</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Transparent, Predictable Pricing
          </h2>

          <p className="text-base sm:text-lg text-slate-600">
            Pricing plans designed to scale with your active client project volume.
          </p>

          {/* Explicit Notice (Per Section 10 & Rule 2.4) */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 max-w-xl mx-auto shadow-2xs">
            <span className="font-semibold text-slate-900">Note: </span>
            These pricing tiers represent our planned commercial structure. Payments are not yet connected, and all features are currently free during the launch preview period. No credit card is required.
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative p-6 sm:p-7 rounded-2xl bg-white border transition-all duration-200 flex flex-col justify-between ${
                tier.popular
                  ? "border-indigo-600 shadow-md ring-1 ring-indigo-600"
                  : "border-slate-200 shadow-xs hover:border-slate-300"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                  Most Popular
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{tier.description}</p>
                </div>

                <div className="pt-2 pb-3 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                      {tier.price}
                    </span>
                    {tier.price !== "Custom" && (
                      <span className="text-xs text-slate-500 font-medium">/{tier.period.split(" ")[1] || "mo"}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5 capitalize">{tier.period}</span>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 text-xs text-slate-600">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link href={tier.ctaHref} className="block w-full">
                  <Button
                    variant={tier.variant}
                    size="md"
                    className="w-full justify-center text-xs font-semibold"
                  >
                    {tier.ctaText}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
