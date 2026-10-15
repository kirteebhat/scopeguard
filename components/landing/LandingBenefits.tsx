"use client";

import React from "react";
import {
  ShieldCheck,
  Zap,
  Lock,
  Coins,
  FileCheck,
  Cpu,
} from "lucide-react";

export function LandingBenefits() {
  const benefits = [
    {
      icon: <Zap className="w-5 h-5 text-indigo-600" />,
      title: "Zero Client Friction",
      description:
        "Clients review and authorize change proposals on any mobile browser without creating an account, remembering a password, or downloading an app.",
    },
    {
      icon: <FileCheck className="w-5 h-5 text-indigo-600" />,
      title: "Immutable Audit Snapshots",
      description:
        "Approved proposals are permanently frozen into immutable database snapshots. Scope specifications, costs, and deadlines cannot be altered retroactively.",
    },
    {
      icon: <Cpu className="w-5 h-5 text-indigo-600" />,
      title: "Integer-Precision Financial Math",
      description:
        "Monetary values are stored exclusively as integer minor units (paise/cents) with deterministic half-up rounding, eliminating floating-point rounding errors.",
    },
    {
      icon: <Coins className="w-5 h-5 text-indigo-600" />,
      title: "Multi-Currency Segregation",
      description:
        "In accordance with sound accounting principles, amounts in USD, EUR, INR, and GBP are aggregated and displayed strictly grouped by currency, never summed across exchange rates.",
    },
    {
      icon: <Lock className="w-5 h-5 text-indigo-600" />,
      title: "Strict Boundary Isolation",
      description:
        "Private agency notes, margin calculations, and internal discussions are completely isolated and stripped before generating client-facing proposal payloads.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-indigo-600" />,
      title: "Atomic Concurrency Locking",
      description:
        "Database-level atomic row locking prevents race conditions and accidental duplicate decisions if a client double-clicks or opens multiple browser tabs.",
    },
  ];

  return (
    <section id="benefits" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <span>Engineering & Operational Integrity</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for Real Agency Workflows
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Engineered with strict security boundaries, financial precision, and zero fluff to keep your client relationships transparent and professional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all duration-200 space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                {b.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900">{b.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

