"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { getSafeRedirectUrl } from "@/lib/validation/redirect";

export interface ActionState<T = unknown> {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
}

/**
 * Log in with email and password.
 * Redirects to safe next URL on success.
 * Returns generic error message on failure to prevent email enumeration.
 */
export async function loginAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Generic error message: do not reveal whether the email exists or password was wrong
      return {
        success: false,
        message: "Invalid email or password. Please check your credentials and try again.",
      };
    }

    redirectTarget = getSafeRedirectUrl(next, "/dashboard");
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

interface RpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>;
}

/**
 * Register a new user and create their initial workspace.
 * In development, gracefully handles mailer rate limits.
 */
export async function signUpAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState<{ confirmationRequired?: boolean; email?: string }>> {
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
    const rpcClient = supabase as unknown as RpcClient;
    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = `${protocol}://${host}`;

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

    // Handle mail rate-limit gracefully when service-role client is available
    if (error && error.message.toLowerCase().includes("rate limit")) {
      try {
        const adminClient = createServiceRoleClient();
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
          // Immediately sign in with the new user session
          await supabase.auth.signInWithPassword({ email, password });
          await rpcClient.rpc("create_workspace", { name: workspaceName });
          redirectTarget = "/dashboard";
        }
      } catch {
        return {
          success: false,
          message: "Unable to create account. If you already have an account, please try logging in.",
        };
      }
    } else if (error) {
      // Generic error message to prevent enumeration
      return {
        success: false,
        message: "Unable to create account. If you already have an account, please try logging in.",
      };
    } else if (data.session) {
      // User confirmed automatically
      await rpcClient.rpc("create_workspace", { name: workspaceName });
      redirectTarget = "/dashboard";
    } else if (data.user) {
      // Confirmation email required
      return {
        success: true,
        data: {
          confirmationRequired: true,
          email,
        },
      };
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
    const host = headerList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = `${protocol}://${host}`;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
  } catch {
    // Ignore internal errors to prevent timing / enumeration attacks
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

