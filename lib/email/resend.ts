import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";
import { EmailProvider, SendEmailPayload, SendEmailResult } from "./provider";

let resendInstance: Resend | null = null;

function getResendClient(apiKey?: string): Resend | null {
  if (!apiKey) return null;
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export class ResendEmailProvider implements EmailProvider {
  isConfigured(): boolean {
    try {
      const { RESEND_API_KEY } = getServerEnv();
      return !!(
        RESEND_API_KEY &&
        RESEND_API_KEY.trim() !== "" &&
        !RESEND_API_KEY.startsWith("re_your_resend_api_key")
      );
    } catch {
      return false;
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const { RESEND_API_KEY, EMAIL_FROM } = getServerEnv();

      // Detect unconfigured or placeholder keys safely
      if (
        !RESEND_API_KEY ||
        RESEND_API_KEY.trim() === "" ||
        RESEND_API_KEY.startsWith("re_your_resend_api_key")
      ) {
        return {
          success: true,
          status: "not_configured",
        };
      }

      const client = getResendClient(RESEND_API_KEY);
      if (!client) {
        return {
          success: true,
          status: "not_configured",
        };
      }

      const defaultFrom = EMAIL_FROM || "ScopeGuard <notifications@scopeguard.agency>";
      let fromAddress = defaultFrom;
      if (payload.fromName) {
        const emailMatch = defaultFrom.match(/<([^>]+)>/);
        const bareEmail = emailMatch ? emailMatch[1] : defaultFrom;
        // Escape any quotes in fromName
        const cleanName = payload.fromName.replace(/["\r\n]/g, "");
        fromAddress = `"${cleanName}" <${bareEmail}>`;
      }

      const { data, error } = await client.emails.send({
        from: fromAddress,
        to: payload.to,
        replyTo: payload.replyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      if (error) {
        // Log safe server-side diagnostics only (never secrets, tokens, or raw emails)
        console.error("[Email Provider Error] Resend dispatch failed:", {
          name: error.name,
          message: error.message,
        });
        return {
          success: false,
          status: "failed",
          error: error.message,
        };
      }

      return {
        success: true,
        status: "sent",
        messageId: data?.id,
      };
    } catch (err) {
      console.error("[Email Provider Error] Unexpected exception during send:", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      return {
        success: false,
        status: "failed",
        error: "Internal error during email dispatch",
      };
    }
  }
}

export const emailProvider = new ResendEmailProvider();
