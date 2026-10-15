"use client";

import React from "react";
import { FolderPlus, FileText, Send, CheckCircle2 } from "lucide-react";

export function LandingHowItWorks() {
  const steps = [
    {
      number: "01",
      icon: <FolderPlus className="w-5 h-5 text-indigo-600" />,
      title: "Set Contract Baseline",
      description:
        "Define your project budget in integer minor units, original delivery deadline, hourly billing rate, and core agreed deliverables.",
      highlight: "Guards your original scope boundaries.",
    },
    {
      number: "02",
      icon: <FileText className="w-5 h-5 text-indigo-600" />,
      title: "Draft Scope Changes in 60s",
      description:
        "Input estimated hours or a fixed fee when requirements drift. ScopeGuard instantly models the revised budget and deadline impact.",
      highlight: "Private internal notes are never shown to clients.",
    },
    {
      number: "03",
      icon: <Send className="w-5 h-5 text-indigo-600" />,
      title: "Generate Tokenized Link",
      description:
        "Publishing freezes an immutable snapshot and creates a 14-day cryptographic bearer token. Zero client logins or passwords required.",
      highlight: "Fast, friction-free delivery via Slack or email.",
    },
    {
      number: "04",
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-600" />,
      title: "Client Approves on Mobile",
      description:
        "The client opens the link, reviews the clear scope comparison, enters their name, and approves with atomic database locking.",
      highlight: "Project rollups and audit log update immediately.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <span>Simple 4-Step Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How ScopeGuard Protects Your Projects
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            A lightweight, transparent operating rhythm that turns ad-hoc scope drift into formal, client-approved milestones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative p-6 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                    {step.icon}
                  </div>
                  <span className="text-xl font-extrabold text-slate-500 tracking-tight font-mono">
                    {step.number}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200/60">
                <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md block">
                  {step.highlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
