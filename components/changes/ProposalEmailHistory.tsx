"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Mail, Clock, RefreshCw, AlertCircle, MessageSquare } from "lucide-react";
import { fetchProposalEmailHistoryAction } from "@/app/actions/proposal-emails";
import type { ProposalEmailHistoryItem } from "@/lib/data/proposal-emails";

interface ProposalEmailHistoryProps {
  changeRequestId: string;
  userRole: "owner" | "manager" | "member";
  initialEmails?: ProposalEmailHistoryItem[];
}

export function ProposalEmailHistory({
  changeRequestId,
  userRole,
  initialEmails = [],
}: ProposalEmailHistoryProps) {
  const [emails, setEmails] = useState<ProposalEmailHistoryItem[]>(initialEmails);
  const [isPending, startTransition] = useTransition();
  const [hasLoaded, setHasLoaded] = useState(initialEmails.length > 0);

  const loadHistory = React.useCallback(() => {
    startTransition(async () => {
      const res = await fetchProposalEmailHistoryAction(changeRequestId);
      if (res.success && res.data) {
        setEmails(res.data);
      }
      setHasLoaded(true);
    });
  }, [changeRequestId]);

  useEffect(() => {
    if (userRole !== "member" && !hasLoaded) {
      loadHistory();
    }
  }, [userRole, hasLoaded, loadHistory]);

  // Members are not authorized to view delivery history per permissions matrix
  if (userRole === "member") {
    return null;
  }

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-indigo-600" />
          Proposal Email History
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={loadHistory}
          disabled={isPending}
          className="h-7 px-2 text-slate-500 hover:text-slate-800"
          title="Refresh delivery history"
        >
          <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin text-indigo-600" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {emails.length === 0 ? (
          <div className="text-center py-4 px-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Mail className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-700">No emails sent yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Use &ldquo;Send to client&rdquo; to dispatch a formal proposal email directly.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {emails.map((attempt) => {
              const formattedDate = new Date(attempt.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={attempt.id} className="py-2.5 space-y-1.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-800 font-medium truncate">
                        {attempt.recipientEmailMasked}
                      </span>
                      {attempt.recipientName && (
                        <span className="text-slate-500 text-[11px] truncate">
                          ({attempt.recipientName})
                        </span>
                      )}
                    </div>
                    <div>
                      {attempt.status === "sent" ? (
                        <Badge variant="success">Sent</Badge>
                      ) : attempt.status === "failed" ? (
                        <Badge variant="error">Failed</Badge>
                      ) : (
                        <Badge variant="warning">Queued</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formattedDate} • by {attempt.senderName || "Team"}
                    </span>

                    {attempt.personalNotePresent && (
                      <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                        <MessageSquare className="w-2.5 h-2.5" />
                        With Note
                      </span>
                    )}
                  </div>

                  {attempt.status === "failed" && attempt.errorCode && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 bg-rose-50 px-2 py-1 rounded">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Reason: {attempt.errorCode.replace(/_/g, " ")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
