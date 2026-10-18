import { notFound } from "next/navigation";
import {
  renderProposalEmailHtml,
  renderProposalEmailText,
} from "@/lib/email/templates/proposal";

interface DevProposalPreviewProps {
  searchParams: Promise<{
    format?: "html" | "text";
    note?: string;
  }>;
}

export default async function DevProposalPreviewPage({ searchParams }: DevProposalPreviewProps) {
  // Strict environment guard: never render in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { format, note } = await searchParams;

  const sampleProps = {
    recipientName: "Jonathan Miller",
    senderName: "Sarah Chen",
    workspaceName: "Apex Design & Engineering",
    projectName: "Mobile Banking Suite",
    changeRequestTitle: "Add biometric login & passkey authentication",
    changeRequestDescription:
      "Implementation of WebAuthn and FaceID/Fingerprint biometric authentication on iOS and Android platforms, including hardware enclave key storage and server-side attestation verification.",
    additionalCostFormatted: "+$4,800.00",
    currency: "USD",
    originalDeadline: "Nov 30, 2026",
    proposedDeadline: "Dec 15, 2026",
    versionNumber: 2,
    personalNote:
      note === "none"
        ? null
        : "Jonathan, this covers the requested biometric authentication module discussed in our sync on Tuesday. Please let us know if the revised timeline aligns with your launch plan.",
    reviewUrl: "http://localhost:3001/approve/sample_token_32chars_secure_test",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  if (format === "text") {
    const textContent = renderProposalEmailText(sampleProps);

    return (
      <div className="p-8 max-w-2xl mx-auto font-mono text-xs whitespace-pre-wrap bg-slate-900 text-slate-100 rounded-xl">
        {textContent}
      </div>
    );
  }

  const htmlContent = renderProposalEmailHtml(sampleProps);

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-900">Proposal Email Previewer (Dev Only)</span>
            <p className="text-slate-500">
              Project: {sampleProps.projectName} | Cost: {sampleProps.additionalCostFormatted}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="?format=html"
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              With Note
            </a>
            <a
              href="?format=html&note=none"
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Without Note
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

