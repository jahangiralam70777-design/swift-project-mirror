import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type VerifyAdminAccessResult = {
  isAdmin: boolean;
  userId: string;
  degraded?: boolean;
  reason?: string;
};

/**
 * H-1: Server-side admin verification.
 *
 * The /admin layout gate previously trusted only the client-side `user.role`
 * value from the local app store, which could be spoofed in browser devtools.
 * This server fn re-checks the role against the `user_roles` table using the
 * authenticated user's bearer token (RLS scoped to that user). Server-side
 * RLS on every admin write already enforced this, but the UI shell should
 * also refuse to mount for non-admins so privileged screens never render.
 */
export const verifyAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VerifyAdminAccessResult> => {
    const { supabase, userId } = context;
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return { isAdmin: !!data, userId };
    } catch (error) {
      console.warn("[verifyAdminAccess] role lookup degraded", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        isAdmin: false,
        userId,
        degraded: true,
        reason: error instanceof Error ? error.message : "role verification unavailable",
      };
    }
  });
