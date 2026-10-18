export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailDeliveryStatus = "sent" | "not_configured" | "failed";

export interface SendEmailResult {
  success: boolean;
  status: EmailDeliveryStatus;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
}
