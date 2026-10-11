import React from "react";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs">
          <Shield className="w-3.5 h-3.5" />
          ScopeGuard Platform
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Eliminate Unbilled Scope Creep
        </h1>
        <p className="text-base text-slate-600 sm:text-lg max-w-xl mx-auto">
          Transform informal scope adjustments into formal, client-approved change orders with transparent impact modeling.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          {user ? (
            <Link href="/dashboard">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="secondary">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create Workspace
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
