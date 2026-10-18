"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicInvitationData } from "@/lib/data/invitations";
import { acceptInvitationAction } from "@/app/actions/invitations";
import { logoutAction } from "@/app/actions/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Shield,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogIn,
  UserPlus,
  ArrowRight,
  LogOut,
  Building,
  Mail,
  Calendar,
} from "lucide-react";

interface InviteAcceptViewProps {
  token: string;
  invitation: PublicInvitationData | null;
  currentUser: {
    id: string;
    email: string;
  } | null;
}

export function InviteAcceptView({
  token,
  invitation,
  currentUser,
}: InviteAcceptViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Invalid or Not Found Token State
  if (!invitation) {
    return (
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">
            Invalid Invitation Link
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            This invitation link is not valid or has been deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 text-center leading-relaxed">
            Please check the URL from your email or contact the administrator who invited you to request a fresh invitation link.
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/login">
              <Button variant="primary" size="sm" className="text-xs gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                Return to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. Expired State
  if (invitation.status === "expired") {
    return (
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">
            Invitation Expired
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            This invitation link has passed its 7-day expiration period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p>
              <strong>Workspace:</strong> {invitation.workspaceName}
            </p>
            <p>
              <strong>Expired On:</strong>{" "}
              {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <p className="text-xs text-slate-600 text-center leading-relaxed">
            Please reach out to <strong className="text-slate-900">{invitation.inviterName}</strong> or an administrator at{" "}
            <strong className="text-slate-900">{invitation.workspaceName}</strong> to request a new invitation link.
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs">
                Go to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Revoked State
  if (invitation.status === "revoked") {
    return (
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">
            Invitation Revoked
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            This invitation has been cancelled by a workspace administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 text-center leading-relaxed">
            This invitation to join <strong className="text-slate-900">{invitation.workspaceName}</strong> is no longer active. If you believe this is an error, please contact your team administrator.
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs">
                Go to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 4. Already Accepted State
  if (invitation.status === "accepted") {
    const isCurrentUserMatch =
      currentUser && currentUser.email.toLowerCase() === invitation.email.toLowerCase();

    return (
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">
            Invitation Already Accepted
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            This invitation has already been used to join {invitation.workspaceName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 text-center leading-relaxed">
            {isCurrentUserMatch
              ? `You are already a member of ${invitation.workspaceName}. You can access your workspace from the dashboard.`
              : "This invitation has already been accepted. If you already have an account with access, please log in."}
          </p>
          <div className="flex justify-center pt-2">
            <Link href={currentUser ? "/dashboard" : "/login"}>
              <Button variant="primary" size="sm" className="text-xs gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                {currentUser ? "Go to Dashboard" : "Sign In"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 5. Active Pending State
  const isEmailMatch =
    currentUser && currentUser.email.toLowerCase() === invitation.email.toLowerCase();

  const handleAccept = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await acceptInvitationAction(token);
      if (res.success) {
        setActionSuccess(res.message || `Welcome to ${invitation.workspaceName}!`);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1200);
      } else {
        setActionError(res.message || "Failed to accept invitation.");
      }
    });
  };

  const handleSwitchAccount = async () => {
    setIsLoggingOut(true);
    const loginTarget = `/login?email=${encodeURIComponent(invitation.email)}&next=${encodeURIComponent(
      `/invite/${token}`
    )}`;
    await logoutAction(loginTarget);
  };

  return (
    <Card className="shadow-lg border-slate-200 overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            SG
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Workspace Invitation
          </span>
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
          Join {invitation.workspaceName}
        </CardTitle>
        <CardDescription className="text-xs text-slate-600 leading-normal">
          <strong className="text-slate-900 font-semibold">{invitation.inviterName}</strong> invited you to collaborate in their ScopeGuard agency workspace.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Error / Success Notifications */}
        {actionError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{actionSuccess}</span>
          </div>
        )}

        {/* Invitation Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-start gap-2.5">
            <Building className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Workspace
              </span>
              <span className="font-semibold text-slate-900">{invitation.workspaceName}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            {invitation.role === "manager" ? (
              <Shield className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Assigned Role
              </span>
              <span className="font-semibold text-slate-900 capitalize">
                {invitation.role}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Invited Email
              </span>
              <span className="font-mono text-slate-800 truncate block">
                {invitation.invitedEmailMasked}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Expires
              </span>
              <span className="text-slate-600">
                {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Role Privileges Description */}
        <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 space-y-1">
          <p className="font-semibold">
            {invitation.role === "manager"
              ? "Manager Permissions:"
              : "Member Permissions:"}
          </p>
          <p className="text-indigo-800 text-[11px] leading-relaxed">
            {invitation.role === "manager"
              ? "You will have operational access to create and manage client projects, draft and approve change requests, and invite team members."
              : "You will have contributor access to view assigned projects, collaborate on deliverable scopes, and submit draft change requests."}
          </p>
        </div>

        {/* Section 5A: Unauthenticated user */}
        {!currentUser && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <p className="font-medium text-slate-800 mb-1">
                An account with the invited email is required to join.
              </p>
              <p className="text-[11px] text-slate-500">
                If you already have a ScopeGuard account, sign in. If you are new to ScopeGuard, create an account using your invited email.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={`/signup?email=${encodeURIComponent(invitation.email)}&next=${encodeURIComponent(
                  `/invite/${token}`
                )}`}
                className="w-full sm:flex-1"
              >
                <Button variant="primary" size="lg" className="w-full text-xs font-semibold gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  Create Account to Join
                </Button>
              </Link>
              <Link
                href={`/login?email=${encodeURIComponent(invitation.email)}&next=${encodeURIComponent(
                  `/invite/${token}`
                )}`}
                className="w-full sm:flex-1"
              >
                <Button variant="outline" size="lg" className="w-full text-xs font-semibold gap-1.5">
                  <LogIn className="w-4 h-4" />
                  Sign In to Join
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Section 5B: Authenticated with MATCHING email */}
        {currentUser && isEmailMatch && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold block">Signed in as verified recipient</span>
                  <span className="font-mono text-[11px] text-emerald-800">{currentUser.email}</span>
                </div>
              </div>
              <Badge variant="success" className="text-[10px]">
                Verified Match
              </Badge>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleAccept}
              isLoading={isPending}
              disabled={isPending || !!actionSuccess}
              className="w-full text-xs font-semibold gap-2 h-11"
            >
              <ArrowRight className="w-4 h-4" />
              {isPending
                ? "Joining Workspace..."
                : actionSuccess
                ? "Joined! Redirecting..."
                : `Accept Invitation & Join ${invitation.workspaceName}`}
            </Button>
          </div>
        )}

        {/* Section 5C: Authenticated with MISMATCHED email */}
        {currentUser && !isEmailMatch && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-950">Email Account Mismatch</p>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    You are currently signed in as <strong className="font-mono text-amber-950">{currentUser.email}</strong>,
                    but this invitation was issued exclusively for{" "}
                    <strong className="font-mono text-amber-950">{invitation.invitedEmailMasked}</strong>.
                  </p>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    To accept this invitation and join {invitation.workspaceName}, please sign out and sign in with the invited email address.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleSwitchAccount}
                isLoading={isLoggingOut}
                disabled={isLoggingOut}
                className="w-full sm:flex-1 text-xs gap-1.5 text-slate-700"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                Sign Out & Switch Account
              </Button>
              <Link href="/dashboard" className="w-full sm:flex-1">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-xs text-slate-600 hover:text-slate-900"
                >
                  Continue to My Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
