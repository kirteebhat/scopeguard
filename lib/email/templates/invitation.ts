import { MemberRole } from "@/lib/supabase/database.types";

export interface InvitationEmailProps {
  inviterName: string;
  workspaceName: string;
  role: MemberRole;
  inviteUrl: string;
  expiresAt: Date;
}

/**
 * Escapes dynamic string values to prevent HTML injection in emails.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRoleDescription(role: MemberRole): string {
  if (role === "manager") {
    return "Managers have operational authority to manage projects, edit budgets, and publish client proposals.";
  }
  return "Members can view authorized projects and draft scope change requests.";
}

export function renderInvitationEmailSubject(props: Pick<InvitationEmailProps, "inviterName" | "workspaceName">): string {
  return `${props.inviterName} invited you to join ${props.workspaceName} on ScopeGuard`;
}

export function renderInvitationEmailText(props: InvitationEmailProps): string {
  const roleName = props.role === "manager" ? "Manager" : "Member";
  const roleDesc = getRoleDescription(props.role);
  const formattedExpiry = props.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `
ScopeGuard - Team Invitation

Hello,

${props.inviterName} has invited you to join ${props.workspaceName} on ScopeGuard as a ${roleName}.

Role Details:
${roleDesc}

To accept your invitation and join the workspace, open the link below in your browser:
${props.inviteUrl}

This invitation link expires on ${formattedExpiry}.

What is ScopeGuard?
ScopeGuard protects agency profit margins by tracking scope changes, calculating commercial impact, and securing client approvals.

If you were not expecting this invitation, you can safely ignore this email.

ScopeGuard Agency Operations
`.trim();
}

export function renderInvitationEmailHtml(props: InvitationEmailProps): string {
  const safeInviter = escapeHtml(props.inviterName);
  const safeWorkspace = escapeHtml(props.workspaceName);
  const safeRoleName = props.role === "manager" ? "Manager" : "Member";
  const safeRoleDesc = escapeHtml(getRoleDescription(props.role));
  const safeInviteUrl = escapeHtml(props.inviteUrl);
  const formattedExpiry = props.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${safeInviter} invited you to join ${safeWorkspace}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0;
      padding: 0;
      word-spacing: normal;
      background-color: #F5F6FA;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #12151F !important; }
      .email-card { background-color: #1A1E2B !important; border-color: #2B3144 !important; }
      .text-heading { color: #E8EAF2 !important; }
      .text-body { color: #A3ABC2 !important; }
      .text-muted { color: #737D98 !important; }
      .role-box { background-color: #222736 !important; border-color: #2B3144 !important; }
      .url-box { background-color: #222736 !important; border-color: #2B3144 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F5F6FA;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    Accept your invitation to join ${safeWorkspace} as ${safeRoleName}.
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Email Container (Max 600px) -->
        <table role="presentation" class="email-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E3E6F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 36px 20px 36px; text-align: left;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 36px; height: 36px; background-color: #4F55E0; border-radius: 10px; text-align: center; vertical-align: middle; color: #FFFFFF; font-weight: bold; font-size: 18px;">
                    🛡️
                  </td>
                  <td style="padding-left: 12px; font-size: 18px; font-weight: 700; color: #1B2033; letter-spacing: -0.02em;" class="text-heading">
                    ScopeGuard
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 10px 36px 32px 36px;">
              <h1 class="text-heading" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1B2033; line-height: 1.35; letter-spacing: -0.01em;">
                You&apos;ve been invited to join <span style="color: #4F55E0;">${safeWorkspace}</span>
              </h1>
              
              <p class="text-body" style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #5E6780;">
                <strong>${safeInviter}</strong> has invited you to collaborate as a <strong>${safeRoleName}</strong> in their ScopeGuard workspace.
              </p>

              <!-- Role Context Box -->
              <table role="presentation" class="role-box" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0; background-color: #F8FAFD; border: 1px solid #E6EAF2; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4F55E0; margin-bottom: 4px;">
                      Your Role: ${safeRoleName}
                    </div>
                    <div class="text-body" style="font-size: 13px; line-height: 1.5; color: #475569;">
                      ${safeRoleDesc}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button (Bulletproof) -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #4F55E0;">
                    <a href="${safeInviteUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 10px; border: 1px solid #4F55E0; background-color: #4F55E0;">
                      Accept Invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Fallback Notice -->
              <p class="text-muted" style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #737D98;">
                This invitation will expire on <strong>${formattedExpiry}</strong> (7 days). If you don't already have an account, you can create one with this email address.
              </p>

              <!-- Raw Link Box -->
              <table role="presentation" class="url-box" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0; background-color: #F8FAFC; border: 1px solid #EDF0F5; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 14px; font-family: monospace; font-size: 11px; line-height: 1.4; color: #4F55E0; word-break: break-all;">
                    <a href="${safeInviteUrl}" style="color: #4F55E0; text-decoration: underline;">${safeInviteUrl}</a>
                  </td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid #E3E6F0; margin: 24px 0;" />

              <!-- About ScopeGuard -->
              <p class="text-muted" style="margin: 0 0 8px 0; font-size: 11px; line-height: 1.5; color: #8C94A8;">
                <strong>What is ScopeGuard?</strong> ScopeGuard protects agency profit margins by tracking scope changes, calculating commercial impact, and securing client approvals.
              </p>

              <p class="text-muted" style="margin: 0; font-size: 11px; line-height: 1.5; color: #8C94A8;">
                If you weren&apos;t expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #FAFAFC; border-top: 1px solid #EDF0F5; text-align: center;" class="role-box">
              <p class="text-muted" style="margin: 0; font-size: 11px; color: #8C94A8;">
                &copy; ${new Date().getFullYear()} ScopeGuard Agency Operations. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
