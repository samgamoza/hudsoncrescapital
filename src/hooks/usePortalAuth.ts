import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensurePortalRole, isStaffRole, type PortalRole } from "@/lib/portal-auth";

export type { PortalRole } from "@/lib/portal-auth";

export function usePortalAuth(required?: "admin" | "investor" | "staff") {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<PortalRole>(null);

  useEffect(() => {
    let active = true;

    const load = async (uid: string | null) => {
      if (active) setLoading(true);
      if (!uid) {
        if (!active) return;
        setUserId(null);
        setRole(null);
        setLoading(false);
        return;
      }
      try {
        const resolved = await ensurePortalRole(supabase as any, uid);
        if (!active) return;
        setUserId(uid);
        setRole(resolved);
      } catch {
        if (!active) return;
        setUserId(uid);
        setRole(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user?.id ?? null);
    });

    void supabase.auth.getSession().then(({ data }) => load(data.session?.user?.id ?? null));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  let authorized = false;
  if (required === "investor") authorized = role === "investor" || isStaffRole(role);
  else if (required === "admin") authorized = role === "super_admin" || role === "admin";
  else if (required === "staff") authorized = isStaffRole(role);
  else authorized = !!role;

  return { loading, userId, role, authorized };
}
