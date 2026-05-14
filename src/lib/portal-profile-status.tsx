import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* eslint-disable react-refresh/only-export-components */

/**
 * Snapshot of the user's onboarding state, used by the modal, banner, and
 * route gates to decide whether to show a reminder or block a feature.
 */
export type PortalProfileSummary = {
  status: string;
  modalSeenAt: string | null;
  hasAccount: boolean;
};

export type PortalProfileStatus = {
  summary: PortalProfileSummary | null;
  loading: boolean;
  error: string | null;
  /** `true` once profile-completion wizard has been submitted (or KYC verified). */
  isComplete: boolean;
  /** `true` while the user still has at least one step left in the wizard. */
  isIncomplete: boolean;
  /** `true` if the one-time completion reminder modal hasn't been dismissed yet. */
  shouldShowModal: boolean;
  /** Re-fetch the summary from the server. */
  refresh: () => Promise<void>;
  /** Optimistically flip `modalSeenAt` AND fire-and-forget a PATCH so the modal stays dismissed. */
  acknowledgeModal: () => Promise<void>;
};

const PortalProfileStatusContext = createContext<PortalProfileStatus | null>(null);

async function fetchSummary(signal?: AbortSignal): Promise<PortalProfileSummary> {
  const res = await fetch("/api/portal/profile-completion", {
    method: "GET",
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Profile summary failed (${res.status})`);
  return (await res.json()) as PortalProfileSummary;
}

export function PortalProfileStatusProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<PortalProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSummary();
      setSummary(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const next = await fetchSummary(controller.signal);
        if (!cancelled) setSummary(next);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const acknowledgeModal = useCallback(async () => {
    setSummary((prev) => (prev ? { ...prev, modalSeenAt: new Date().toISOString() } : prev));
    try {
      await fetch("/api/portal/profile-completion", { method: "PATCH" });
    } catch {
      /* best-effort; UI already updated optimistically */
    }
  }, []);

  const value = useMemo<PortalProfileStatus>(() => {
    const status = summary?.status ?? null;
    const isComplete = status === "submitted" || status === "verified" || status === "active";
    const isIncomplete = !loading && !!summary && !isComplete;
    return {
      summary,
      loading,
      error,
      isComplete,
      isIncomplete,
      shouldShowModal: isIncomplete && (summary?.modalSeenAt ?? null) === null,
      refresh,
      acknowledgeModal,
    };
  }, [summary, loading, error, refresh, acknowledgeModal]);

  return (
    <PortalProfileStatusContext.Provider value={value}>
      {children}
    </PortalProfileStatusContext.Provider>
  );
}

/**
 * Read the current profile status from the nearest provider. Falls back to a
 * permissive "loading" state when used outside the investor portal so we never
 * accidentally block public/admin pages.
 */
export function usePortalProfileStatus(): PortalProfileStatus {
  const ctx = useContext(PortalProfileStatusContext);
  if (ctx) return ctx;
  return {
    summary: null,
    loading: true,
    error: null,
    isComplete: false,
    isIncomplete: false,
    shouldShowModal: false,
    refresh: async () => {
      /* no-op when not under provider */
    },
    acknowledgeModal: async () => {
      /* no-op when not under provider */
    },
  };
}
