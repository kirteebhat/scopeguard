import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Access Denied - ScopeGuard",
  description: "You do not have permissions to access this resource.",
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-md border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            403 — Access Denied
          </CardTitle>
          <CardDescription className="text-xs text-slate-600 mt-1">
            You do not have permission to view or modify this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-xs text-slate-500 leading-relaxed pt-2">
          Your current workspace role does not permit this action. If you believe this is an error,
          contact your agency workspace owner to update your permissions.
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
          <Link href="/dashboard">
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

