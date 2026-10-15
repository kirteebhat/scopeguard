import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileQuestion, ArrowLeft, FolderKanban } from "lucide-react";

export default function AuthenticatedNotFound() {
  return (
    <div className="py-12 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md shadow-sm border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
            <FileQuestion className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">
            Resource Not Found
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-1">
            The project or change request you requested does not exist or has been removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-xs text-slate-500 leading-relaxed pt-2">
          Please check the URL or return to your projects list to locate your scope baselines.
        </CardContent>
        <CardFooter className="flex justify-center gap-3 pt-4 border-t border-slate-100">
          <Link href="/projects">
            <Button variant="secondary" size="sm" leftIcon={<FolderKanban className="w-4 h-4" />}>
              View All Projects
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

