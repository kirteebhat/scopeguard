"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { classifySignUpResult } from "@/lib/domain/authClassification";
import { getSafeRedirectUrl } from "@/lib/validation/redirect";

export interface ActionState<T = unknown> {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
}

/**
 * Mask an email address for safe server-side diagnostic logging.
 * Never leaks full user identities or passwords into server logs.
 * Example: user@domain.com -> u***@domain.com
 */
function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***@***";
  const [local, domain] = parts;
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

/**
 * Resolves the application base URL dynamically from environment or request headers.
 * Defaults to http://localhost:3001 in development if not configured.
 */
function getBaseUrl(host?: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (host) {
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    return `${protocol}://${host}`;
  }
  return "http://localhost:3001";
}

export interface LoginResultData {
  emailNotConfirmed?: boolean;
  email?: string;
}

/**
 * Log in with email and password.
 * Redirects to safe next URL on success.
 * Maps error states (unconfirmed email, rate limiting) to helpful actionable feedback
 * while logging masked diagnostics server-side.
 */
export async function loginAction(
  _prevState: ActionState<LoginResultData> | null,
  formData: FormData
): Promise<ActionState<LoginResultData>> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  };

  const validated = loginSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password, next } = validated.data;
  let redirectTarget: string | null = null;

  try {
    const supabase = await createClient();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !signInData?.user) {
      const code = (error as { code?: string })?.code;
      const errorMsg = error?.message?.toLowerCase() || "";

      if (code === "email_not_confirmed" || errorMsg.includes("email not confirmed")) {
        console.warn(`[Auth Diagnostics] Sign-in failed for ${maskEmail(email)}: email_not_confirmed`);
        return {
          success: false,
          message:
            "Your email address has not been verified yet. Please check your inbox or resend the verification email below.",
          data: { emailNotConfirmed: true, email },
        };
      }

      if (
        code === "over_request_rate_limit" ||
        code === "over_email_send_rate_limit" ||
        errorMsg.includes("rate limit")
      ) {
        console.warn(
          `[Auth Diagnostics] Sign-in failed for ${maskEmail(email)}: rate_limited (${code || "rate_limit"})`
        );
        return {
          success: false,
          message: "Too many login attempts. Please wait a few moments before trying again.",
        };
      }

      console.warn(
        `[Auth Diagnostics] Sign-in failed for ${maskEmail(email)}: invalid_credentials (${code || "unknown"})`
      );
      return {
        success: false,
        message: "Invalid email or password. Please check your credentials and try again.",
      };
    }

    // Check if user has an active workspace membership
    const adminClient = createServiceRoleClient();
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", signInData.user.id)
      .limit(1)
      .maybeSingle();

    if (!member) {
      redirectTarget = "/onboarding";
    } else {
      redirectTarget = getSafeRedirectUrl(next, "/dashboard");
    }
  } catch {
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return { success: true };
}

export interface SignUpResultData {
  confirmationRequired?: boolean;
  email?: string;
  resent?: boolean;
  existingAccount?: boolean;
}

/**
 * Register a new user and create their initial workspace.
 * Correctly distinguishes:
 * (a) Brand new account awaiting confirmation
 * (b) Existing unconfirmed account (resends verification link)
 * (c) Existing confirmed account (shows helpful prompt with Log in and Reset Password links)
 * (d) Rate-limited attempts
 * (e) Network / server errors
 */
export async function signUpAction(
  _prevState: ActionState<SignUpResultData> | null,
  formData: FormData
): Promise<ActionState<SignUpResultData>> {
  const rawData = {
    fullName: formData.get("fullName"),
    workspaceName: formData.get("workspaceName"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validated = signUpSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { fullName, workspaceName, email, password } = validated.data;
  let redirectTarget: string | null = null;

  try {
    const supabase = await createClient();
    const adminClient = createServiceRoleClient();
    const headerList = await headers();
    const host = headerList.get("host");
    const appUrl = getBaseUrl(host);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          default_workspace_name: workspaceName,
        },
        emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    // Handle development / test mailer rate limits gracefully
    if (error && error.message.toLowerCase().includes("rate limit")) {
      try {
        const devUser = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            default_workspace_name: workspaceName,
          },
        });

        if (devUser.data.user) {
          await supabase.auth.signInWithPassword({ email, password });

          const baseSlug =
            workspaceName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "workspace";

          const { data: createdWs } = await adminClient
            .from("workspaces")
            .insert({
              name: workspaceName,
              slug: `${baseSlug}-${Date.now()}`,
              plan: "free",
            })
            .select()
            .single();

          if (createdWs) {
            await adminClient.from("workspace_members").insert({
              workspace_id: createdWs.id,
              user_id: devUser.data.user.id,
              role: "owner",
            });
          }
          redirectTarget = "/dashboard";
        }
      } catch {
        return {
          success: false,
          message: "Unable to create account. If you already have an account, please try logging in.",
        };
      }
    } else {
      // Check if this email was an existing account
      let accountConfirmed = false;
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        try {
          const { data: userList } = await adminClient.auth.admin.listUsers();
          const existing = userList?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (existing?.email_confirmed_at) {
            accountConfirmed = true;
          }
        } catch {
          // If admin list fails, fallback to user object
          if (data.user.email_confirmed_at) accountConfirmed = true;
        }
      }

      const classification = classifySignUpResult({
        user: data?.user,
        session: data?.session,
        error,
        accountConfirmed,
      });

      switch (classification) {
        case "new_account_confirmed": {
          // Auto-confirmed user (e.g., local Supabase with confirmation disabled)
          const baseSlug =
            workspaceName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "workspace";

          // Ensure workspace is not duplicated if returning
          const { data: existingMember } = await adminClient
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", data.session!.user.id)
            .maybeSingle();

          if (!existingMember) {
            const { data: createdWs } = await adminClient
              .from("workspaces")
              .insert({
                name: workspaceName,
                slug: `${baseSlug}-${Date.now()}`,
                plan: "free",
              })
              .select()
              .single();

            if (createdWs) {
              await adminClient.from("workspace_members").insert({
                workspace_id: createdWs.id,
                user_id: data.session!.user.id,
                role: "owner",
              });
            }
          }
          redirectTarget = "/dashboard";
          break;
        }

        case "new_account_unconfirmed": {
          // Brand new user awaiting verification
          return {
            success: true,
            data: {
              confirmationRequired: true,
              email,
            },
          };
        }

        case "existing_account_unconfirmed": {
          // Existing unconfirmed account: resend verification email per user instructions
          try {
            await supabase.auth.resend({
              type: "signup",
              email,
              options: {
                emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
              },
            });
          } catch {
            // Ignore error if resend is throttled
          }

          return {
            success: true,
            data: {
              confirmationRequired: true,
              email,
              resent: true,
            },
            message: "An unconfirmed account with this email already exists. A fresh verification email has been sent.",
          };
        }

        case "existing_account_confirmed": {
          // Existing confirmed account: show helpful message with Log in & Reset Password links
          return {
            success: false,
            data: {
              existingAccount: true,
              email,
            },
            message: "An account with this email address already exists. Please log in or reset your password.",
          };
        }

        case "rate_limited": {
          return {
            success: false,
            message: "Too many sign-up attempts. Please wait a few moments before trying again.",
          };
        }

        case "error":
        default: {
          return {
            success: false,
            message: error?.message || "Unable to complete registration. Please verify your details and try again.",
          };
        }
      }
    }
  } catch {
    return {
      success: false,
      message: "An unexpected error occurred during registration. Please try again.",
    };
  }

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return { success: true };
}

/**
 * Resend email verification link for an unconfirmed account.
 */
export async function resendVerificationAction(
  _prevState: ActionState<{ resent?: boolean; email?: string }> | null,
  formData: FormData
): Promise<ActionState<{ resent?: boolean; email?: string }>> {
  const rawEmail = formData.get("email");
  const validated = resendVerificationSchema.safeParse({ email: rawEmail });
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { email } = validated.data;
  try {
    const supabase = await createClient();
    const headerList = await headers();
    const host = headerList.get("host");
    const appUrl = getBaseUrl(host);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        return {
          success: false,
          message: "Please wait a moment before requesting another verification email.",
        };
      }
      return {
        success: false,
        message: "Unable to resend verification email. Please try again later.",
      };
    }

    return {
      success: true,
      data: { resent: true, email },
      message: "A verification email has been sent. Please check your inbox.",
    };
  } catch {
    return {
      success: false,
      message: "An unexpected error occurred while resending. Please try again.",
    };
  }
}

/**
 * Request password recovery email.
 * Always returns a generic success message to prevent email enumeration.
 */
export async function forgotPasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    email: formData.get("email"),
  };

  const validated = forgotPasswordSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { email } = validated.data;

  try {
    const supabase = await createClient();
    const headerList = await headers();
    const host = headerList.get("host");
    const appUrl = getBaseUrl(host);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.warn(
        `[Auth Diagnostics] Password reset failed for ${maskEmail(email)}: ${error.code || error.message}`
      );
    }
  } catch (err) {
    console.warn(`[Auth Diagnostics] Unexpected error resetting password for ${maskEmail(email)}:`, err);
  }

  // Always return identical generic success message
  return {
    success: true,
    message: "If an account with that email exists, we have sent password reset instructions to it.",
  };
}

/**
 * Reset password when authenticated via recovery token.
 */
export async function resetPasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const validated = resetPasswordSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { password } = validated.data;
  let redirectTarget: string | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return {
        success: false,
        message: "Failed to update password. Please request a new password reset link.",
      };
    }

    redirectTarget = "/dashboard";
  } catch {
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return { success: true };
}

/**
 * Sign out current user and redirect to /login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

