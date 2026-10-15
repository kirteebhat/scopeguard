import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 sm:py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                ScopeGuard
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Protecting agency margins and delivery timelines by turning ad-hoc scope drift into client-approved change orders.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Product
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#workflow-example" className="hover:text-white transition-colors">
                  Approval Example
                </a>
              </li>
              <li>
                <a href="#benefits" className="hover:text-white transition-colors">
                  Core Benefits
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Account & App Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Create Workspace
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In to Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Agency Dashboard
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-white transition-colors">
                  Projects Overview
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Security & Privacy
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• Row-Level Security (RLS) Default Deny</li>
              <li>• Cryptographic 14-Day Bearer Tokens</li>
              <li>• Integer-Precision Financial Math</li>
              <li>• Zero Client Passwords Stored</li>
              <li>• Salted IP Hashes (No full IPs logged)</li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 space-y-2 sm:flex sm:items-center sm:justify-between sm:space-y-0">
          <p>
            © {new Date().getFullYear()} ScopeGuard. Built for software agencies, dev shops, and consulting studios.
          </p>
          <p className="text-[11px] text-slate-500">
            Launch Preview Notice: Payments are not connected. All features are free during initial release.
          </p>
        </div>
      </div>
    </footer>
  );
}
