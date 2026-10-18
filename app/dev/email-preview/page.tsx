import { notFound } from "next/navigation";
import {
  renderInvitationEmailHtml,
  renderInvitationEmailText,
} from "@/lib/email/templates/invitation";
import { MemberRole } from "@/lib/supabase/database.types";

interface DevEmailPreviewProps {
  searchParams: Promise<{
    format?: "html" | "text";
    role?: string;
    workspace?: string;
    inviter?: string;
  }>;
}

export default async function DevEmailPreviewPage({ searchParams }: DevEmailPreviewProps) {
  // Strict environment guard: never render in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { format, role, workspace, inviter } = await searchParams;

  const validRole: MemberRole = role === "manager" ? "manager" : "member";
  const workspaceName = workspace || "Apex Digital Studio";
  const inviterName = inviter || "Alex Morgan";
  const inviteUrl = "http://localhost:3000/invite/dev_sample_token_32chars_secure_test";
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (format === "text") {
    const textContent = renderInvitationEmailText({
      inviterName,
      workspaceName,
      role: validRole,
      inviteUrl,
      expiresAt,
    });

    return (
      <div className="p-8 max-w-2xl mx-auto font-mono text-xs whitespace-pre-wrap bg-slate-900 text-slate-100 rounded-xl">
        {textContent}
      </div>
    );
  }

  const htmlContent = renderInvitationEmailHtml({
    inviterName,
    workspaceName,
    role: validRole,
    inviteUrl,
    expiresAt,
  });

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-900">Email Template Previewer (Dev Only)</span>
            <p className="text-slate-500">
              Role: <span className="font-semibold">{validRole}</span> | Workspace: {workspaceName}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="?format=html&role=member"
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Member HTML
            </a>
            <a
              href="?format=html&role=manager"
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Manager HTML
            </a>
            <a
              href="?format=text"
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Plain Text
            </a>
          </div>
        </div>

        <div
          className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}
