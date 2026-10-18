/**
 * Transactional email templates for client proposal approval dispatch.
 * Complies with ScopeGuard security rules:
 * - Pure template logic, escapes all dynamic content
 * - Strictly excludes internal notes or confidential workspace internals
 * - Accessible, responsive table layout with light/dark email client compatibility
 */

export interface ProposalEmailProps {
  recipientName?: string | null;
  senderName: string;
  workspaceName: string;
  projectName: string;
  changeRequestTitle: string;
  changeRequestDescription: string;
  additionalCostFormatted: string;
  currency: string;
  originalDeadline?: string | null;
  proposedDeadline?: string | null;
  versionNumber: number;
  personalNote?: string | null;
  reviewUrl: string;
  expiresAt: Date;
}

/**
 * Escapes dynamic string values to prevent HTML injection in emails.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderProposalEmailSubject(props: {
  workspaceName: string;
  projectName: string;
  changeRequestTitle?: string;
  versionNumber?: number;
}): string {
  const versionSuffix = props.versionNumber ? ` (v${props.versionNumber})` : "";
  return `Scope Change Proposal: ${props.projectName}${versionSuffix} · ${props.workspaceName}`;
}

export function renderProposalEmailText(props: ProposalEmailProps): string {
  const recipientGreeting = props.recipientName?.trim()
    ? `Hello ${props.recipientName.trim()},`
    : "Hello,";
  const formattedExpiry = props.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const scheduleLine = props.proposedDeadline
    ? `Schedule Impact: Proposed deadline is ${props.proposedDeadline}${
        props.originalDeadline ? ` (contract deadline: ${props.originalDeadline})` : ""
      }`
    : "Schedule Impact: No change to project deadline";

  const personalNoteBlock = props.personalNote?.trim()
    ? `Note from ${props.senderName}:\n"${props.personalNote.trim()}"\n\n`
    : "";

  return `
ScopeGuard - Scope Change Proposal

${recipientGreeting}

${props.senderName} from ${props.workspaceName} has submitted a scope change proposal for "${props.projectName}" (Version ${props.versionNumber}) for your review and approval.

Proposal Details:
----------------
Project: ${props.projectName}
Scope Change: ${props.changeRequestTitle}
Commercial Impact: ${props.additionalCostFormatted} (${props.currency})
${scheduleLine}

Summary of Proposed Scope:
${props.changeRequestDescription}

${personalNoteBlock}Review & Respond:
To inspect this proposal, verify financial terms, and approve or reject it, visit the secure link below:
${props.reviewUrl}

This secure review link is valid until ${formattedExpiry}.

What is ScopeGuard?
ScopeGuard provides structured scope change management, transparent commercial impacts, and verifiable client approvals for agency projects.

ScopeGuard Agency Operations
`.trim();
}

export function renderProposalEmailHtml(props: ProposalEmailProps): string {
  const safeRecipient = props.recipientName?.trim() ? escapeHtml(props.recipientName.trim()) : "";
  const safeSender = escapeHtml(props.senderName);
  const safeWorkspace = escapeHtml(props.workspaceName);
  const safeProject = escapeHtml(props.projectName);
  const safeTitle = escapeHtml(props.changeRequestTitle);
  const safeDescription = escapeHtml(props.changeRequestDescription).replace(/\n/g, "<br />");
  const safeCost = escapeHtml(props.additionalCostFormatted);
  const safeCurrency = escapeHtml(props.currency);
  const safeReviewUrl = escapeHtml(props.reviewUrl);
  const safePersonalNote = props.personalNote?.trim()
    ? escapeHtml(props.personalNote.trim()).replace(/\n/g, "<br />")
    : null;

  const formattedExpiry = props.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const greeting = safeRecipient ? `Hello ${safeRecipient},` : "Hello,";

  const scheduleHtml = props.proposedDeadline
    ? `<div style="font-size: 13px; color: #475569; margin-top: 6px;">
        <strong>Proposed Deadline:</strong> ${escapeHtml(props.proposedDeadline)}
        ${
          props.originalDeadline
            ? `<span style="color: #64748B;"> (Contract: ${escapeHtml(props.originalDeadline)})</span>`
            : ""
        }
      </div>`
    : `<div style="font-size: 13px; color: #64748B; margin-top: 6px;">
        <strong>Schedule:</strong> No change to project deadline
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Scope Change Proposal: ${safeProject} · ${safeWorkspace}</title>
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
      .context-box { background-color: #222736 !important; border-color: #2B3144 !important; }
      .url-box { background-color: #222736 !important; border-color: #2B3144 !important; }
      .note-box { background-color: #202636 !important; border-color: #4F55E0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F5F6FA;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    Scope change proposal for ${safeProject}: ${safeTitle} (${safeCost}). Review and respond.
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
                  <td style="padding-left: 12px;">
                    <div style="font-size: 18px; font-weight: 700; color: #1B2033; letter-spacing: -0.02em;" class="text-heading">
                      ScopeGuard
                    </div>
                    <div style="font-size: 12px; color: #737D98;" class="text-muted">
                      ${safeWorkspace}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 10px 36px 32px 36px;">
              <p class="text-body" style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #5E6780;">
                ${greeting}
              </p>

              <h1 class="text-heading" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1B2033; line-height: 1.35; letter-spacing: -0.01em;">
                Scope Change Proposal for <span style="color: #4F55E0;">${safeProject}</span>
              </h1>
              
              <p class="text-body" style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #5E6780;">
                <strong>${safeSender}</strong> has submitted a formal scope modification request for your review and approval.
              </p>

              <!-- Proposal Summary Box -->
              <table role="presentation" class="context-box" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0; background-color: #F8FAFD; border: 1px solid #E6EAF2; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4F55E0;">
                        Version ${props.versionNumber} Proposal
                      </span>
                    </div>

                    <div class="text-heading" style="font-size: 16px; font-weight: 700; color: #1B2033; margin-bottom: 8px;">
                      ${safeTitle}
                    </div>

                    <div style="padding: 12px 0; border-top: 1px solid #E6EAF2; border-bottom: 1px solid #E6EAF2; margin: 12px 0;">
                      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">
                        Commercial Impact
                      </div>
                      <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 4px;">
                        ${safeCost} <span style="font-size: 12px; font-weight: 600; color: #64748B;">${safeCurrency}</span>
                      </div>
                      ${scheduleHtml}
                    </div>

                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; margin-bottom: 4px;">
                      Scope Summary
                    </div>
                    <div class="text-body" style="font-size: 13px; line-height: 1.6; color: #475569;">
                      ${safeDescription}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Optional Personal Note -->
              ${
                safePersonalNote
                  ? `
              <table role="presentation" class="note-box" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0; background-color: #F3F4FD; border-left: 4px solid #4F55E0; border-radius: 0 8px 8px 0;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4F55E0; margin-bottom: 4px;">
                      Note from ${safeSender}
                    </div>
                    <div class="text-body" style="font-size: 13px; line-height: 1.5; color: #334155; font-style: italic;">
                      &ldquo;${safePersonalNote}&rdquo;
                    </div>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Primary CTA Button (Bulletproof) -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #4F55E0;">
                    <a href="${safeReviewUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 10px; border: 1px solid #4F55E0; background-color: #4F55E0;">
                      Review and respond &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Fallback Notice -->
              <p class="text-muted" style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #737D98;">
                This approval link is unique to this proposal and expires on <strong>${formattedExpiry}</strong>. No login or password is required.
              </p>

              <!-- Raw Link Box -->
              <table role="presentation" class="url-box" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0; background-color: #F8FAFC; border: 1px solid #EDF0F5; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 14px; font-family: monospace; font-size: 11px; line-height: 1.4; color: #4F55E0; word-break: break-all;">
                    <a href="${safeReviewUrl}" style="color: #4F55E0; text-decoration: underline;">${safeReviewUrl}</a>
                  </td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid #E3E6F0; margin: 24px 0;" />

              <!-- About ScopeGuard -->
              <p class="text-muted" style="margin: 0 0 8px 0; font-size: 11px; line-height: 1.5; color: #8C94A8;">
                <strong>What is ScopeGuard?</strong> ScopeGuard protects project profitability and alignment through transparent change requests, clear financial impacts, and verifiable client approvals.
              </p>

              <p class="text-muted" style="margin: 0; font-size: 11px; line-height: 1.5; color: #8C94A8;">
                If you have questions about this proposal, you can reply directly to this email to contact ${safeSender}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #FAFAFC; border-top: 1px solid #EDF0F5; text-align: center;" class="context-box">
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

