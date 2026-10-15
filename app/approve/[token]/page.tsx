import { headers } from "next/headers";
import type { Metadata } from "next";
import { getProposalByToken } from "@/lib/data/approvals";
import { ClientProposalView } from "@/components/approvals/ClientProposalView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Scope Modification Approval | ScopeGuard",
  description: "Review and approve or reject project scope modification proposals.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  referrer: "no-referrer",
};

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ApproveTokenPage({ params }: PageProps) {
  const { token } = await params;

  // Extract client IP address safely for salted audit hashing and rate limiting
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "127.0.0.1";

  // Resolve proposal securely on the server
  const proposal = await getProposalByToken(token, clientIp);

  return (
    <>
      <meta name="referrer" content="no-referrer" />
      <meta name="robots" content="noindex, nofollow" />
      <ClientProposalView token={token} initialProposal={proposal} />
    </>
  );
}

