import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type InvestorDashboardLayout = "v1" | "v2";

type Ctx = {
  investorDashboard: InvestorDashboardLayout;
  loading: boolean;
  refresh: () => Promise<void>;
};

const InvestorDashboardModeContext = createContext<Ctx | null>(null);

export function InvestorDashboardModeProvider({ children }: { children: ReactNode }) {
  const [investorDashboard, setInvestorDashboard] = useState<InvestorDashboardLayout>("v1");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/portal-settings");
      const j = (await res.json()) as { investorDashboard?: string };
      if (res.ok && (j.investorDashboard === "v1" || j.investorDashboard === "v2")) {
        setInvestorDashboard(j.investorDashboard);
      } else {
        setInvestorDashboard("v1");
      }
    } catch {
      setInvestorDashboard("v1");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ investorDashboard, loading, refresh }),
    [investorDashboard, loading, refresh],
  );

  return (
    <InvestorDashboardModeContext.Provider value={value}>{children}</InvestorDashboardModeContext.Provider>
  );
}

export function useInvestorDashboardMode(): Ctx {
  const v = useContext(InvestorDashboardModeContext);
  if (!v) {
    throw new Error("useInvestorDashboardMode must be used within InvestorDashboardModeProvider");
  }
  return v;
}

/** Safe variant when provider may be absent (e.g. tests). */
export function useInvestorDashboardModeSafe(): Ctx {
  const v = useContext(InvestorDashboardModeContext);
  return (
    v ?? {
      investorDashboard: "v1",
      loading: false,
      refresh: async () => {},
    }
  );
}
