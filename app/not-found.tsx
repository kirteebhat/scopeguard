import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found - ScopeGuard",
  description: "The requested page could not be found.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-md border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
            <FileQuestion className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            404 — Page Not Found
          </CardTitle>
          <CardDescription className="text-xs text-slate-600 mt-1">
            The page you are looking for does not exist or has been relocated.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-xs text-slate-500 leading-relaxed pt-2">
          Please check the URL or return to your agency dashboard to continue managing your projects.
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
          <Link href="/dashboard">
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

