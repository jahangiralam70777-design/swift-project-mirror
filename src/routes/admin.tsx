import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAppStore, hasLocalAuthSession } from "@/stores/app-store";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminAccess } from "@/lib/admin-verify.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/admin")({
  // Admin session lives in localStorage (Supabase). SSR-skip + a
  // synchronous beforeLoad gate prevents admin chrome from being
  // streamed to anonymous visitors. Server-verified role check still
  // runs inside <AdminGate /> against `user_roles`.
  ssr: false,
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    if (location.pathname === "/admin/login") return; // public sub-route
    if (!hasLocalAuthSession()) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
  head: () => ({
    meta: [
      { title: "Admin Control Center · CA Aspire BD" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Manage students, exams, resources and platform analytics from the premium glassmorphism CA Aspire BD admin dashboard.",
      },
    ],
  }),
});

function AdminGate({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const sessionReady = useAppStore((s) => s.sessionReady);
  const refreshAuth = useAppStore((s) => s.refreshAuth);
  const navigate = useNavigate();
  const verifyAdmin = useServerFn(verifyAdminAccess);

  // Instant navigation: never block rendering on auth/role checks.
  // The synchronous beforeLoad gate already redirects unauthenticated
  // visitors via localStorage. Server-side admin role verification runs
  // silently in the background; if it fails we redirect without ever
  // rendering a loading or denied screen.
  useEffect(() => {
    if (!user && hasLocalAuthSession()) void refreshAuth({ force: true });
  }, [refreshAuth, user]);

  useEffect(() => {
    let cancelled = false;
    if (!sessionReady) return;
    (async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userErr || !userData.user) {
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      const hasToken = !!sess.session?.access_token;
      if (!hasToken) {
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      try {
        const result = await verifyAdmin();
        if (cancelled) return;
        if (result?.degraded) {
          console.warn("[admin-route] admin verification degraded; keeping UI mounted", {
            userId: userData.user.id,
            reason: result.reason,
          });
          return;
        }
        if (!result?.isAdmin) {
          // Don't bounce on a single failed check — the server fn can
          // return false transiently while the user-role row is still
          // propagating right after sign-in. Log and keep the UI mounted;
          // RLS will still block any forbidden read/write.
          console.warn("[admin-route] verifyAdmin returned non-admin; keeping UI mounted", {
            userId: userData.user.id,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.warn("[admin-route] admin verification request failed; keeping UI mounted", {
          userId: userData.user.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, user?.id, navigate, verifyAdmin]);

  return <>{children}</>;
}

function AdminLayout() {
  const path = useLocation({ select: (l) => l.pathname });

  // The admin login page lives at /admin/login but must be publicly reachable
  // (no sidebar, no gate) so unauthenticated admins can sign in.
  if (path === "/admin/login") {
    return (
      <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow opacity-60" />
        <Outlet />
      </div>
    );
  }

  // H-4: AdminSidebar must NOT render until `verifyAdminAccess` confirms.
  // Previously it was a sibling of <AdminGate/> and therefore visible to
  // anyone hitting /admin (revealing the admin nav structure). It now
  // lives inside the gate, so non-admins see only the gate's loading /
  // forbidden / demo card.
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow opacity-60" />
      <div className="pointer-events-none fixed left-10 top-20 -z-10 h-72 w-72 rounded-full bg-[var(--neon-purple)]/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none fixed right-10 bottom-10 -z-10 h-80 w-80 rounded-full bg-[var(--neon-blue)]/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse-glow" />

      <div className="mx-auto flex max-w-[1600px] gap-4 px-4 py-4 sm:px-6">
        <AdminGate>
          <AdminSidebar />
          <div className="pointer-events-auto min-w-0 flex-1 space-y-4">
            <Outlet />
          </div>
        </AdminGate>
      </div>
    </div>
  );
}
