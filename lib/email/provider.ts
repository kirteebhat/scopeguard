export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  fromName?: string;
}

export type EmailDeliveryStatus = "sent" | "not_configured" | "failed";

export interface SendEmailResult {
  success: boolean;
  status: EmailDeliveryStatus;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  isConfigured?(): boolean;
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
}
