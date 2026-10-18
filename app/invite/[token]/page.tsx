import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getInvitationByToken } from "@/lib/data/invitations";
import { InviteAcceptView } from "./InviteAcceptView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Workspace Invitation - ScopeGuard",
  description: "Accept your invitation to collaborate on ScopeGuard.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  referrer: "no-referrer",
};

interface InviteTokenPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InviteTokenPage({ params }: InviteTokenPageProps) {
  const { token } = await params;

  // Check authenticated session if available
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve invitation details securely on server
  const invitation = await getInvitationByToken(token);

  const currentUser = user && user.email ? { id: user.id, email: user.email } : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <InviteAcceptView
          token={token}
          invitation={invitation}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
