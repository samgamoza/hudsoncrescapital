import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { Loader2, MessageSquarePlus, Send, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portal/investor/support")({
  head: () => ({
    meta: [{ title: "Help desk | Hudson Crest Capital" }, { name: "robots", content: "noindex" }],
  }),
  component: SupportPage,
});

type TicketRow = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_activity_at: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending_user: "Awaiting your reply",
  pending_staff: "Awaiting desk",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_TONE: Record<string, string> = {
  open: "text-brand",
  pending_user: "text-warn",
  pending_staff: "text-muted-foreground",
  resolved: "text-success",
  closed: "text-muted-foreground",
};

const label =
  "block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90";
const field = cn(
  "w-full rounded-lg border border-border/70 bg-surface/90 px-3 py-2 text-sm text-foreground shadow-sm",
  "transition-[border-color,box-shadow] placeholder:text-muted-foreground/65",
  "focus:border-brand/45 focus:outline-none focus:ring-2 focus:ring-brand/15",
);

function SupportPage() {
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/tickets");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setTickets(await res.json());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <>
      <PageHeader
        title="Help desk"
        subtitle="Account support — open a request and our service desk will respond."
      />

      {view === "list" && (
        <SectionCard
          className="shadow-md ring-1 ring-border/40"
          title="My tickets"
          description="Open requests, status updates, and history."
          right={
            <Button
              type="button"
              onClick={() => setView("new")}
              className="gap-2 bg-gradient-brand text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden />
              New request
            </Button>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
              Loading…
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              You haven&apos;t opened any tickets yet.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setView("new")}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Open your first request →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveId(t.id);
                    setView("detail");
                  }}
                  className="w-full rounded-lg border border-border/60 bg-surface/40 p-3 text-left transition-colors hover:border-brand/35 hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{t.subject}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{t.category}</span>
                        <span aria-hidden>•</span>
                        <span className="capitalize">{t.priority}</span>
                        <span aria-hidden>•</span>
                        <span>{new Date(t.last_activity_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-xs font-medium ${STATUS_TONE[t.status] ?? "text-muted-foreground"}`}
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {view === "new" && (
        <NewTicketForm
          onCancel={() => setView("list")}
          onCreated={(id) => {
            setActiveId(id);
            setView("detail");
            void refresh();
          }}
        />
      )}

      {view === "detail" && activeId && (
        <TicketDetail
          id={activeId}
          onBack={() => {
            setActiveId(null);
            setView("list");
            void refresh();
          }}
        />
      )}

      <Toaster />
    </>
  );
}

function NewTicketForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<
    "account" | "funding" | "trading" | "kyc" | "technical" | "other"
  >("account");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (subject.trim().length < 3) return toast.error("Subject too short");
    if (body.trim().length < 5) return toast.error("Message too short");
    setSubmitting(true);
    try {
      const r = await fetch("/api/portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          payload: { subject: subject.trim(), body: body.trim(), category, priority },
        }),
      });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const res = await r.json();
      toast.success("Request sent");
      onCreated(res.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      className="shadow-md ring-1 ring-border/40"
      title="Help desk account support"
      titleClassName="text-sm font-bold uppercase tracking-[0.14em] text-foreground border-b border-border/80 pb-3"
      right={
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
      }
    >
      <div className="mx-auto mt-2 max-w-xl space-y-3">
        <div className="grid gap-1.5 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
          <label className={cn(label, "sm:mb-0")} htmlFor="help-priority">
            Priority
          </label>
          <select
            id="help-priority"
            className={field}
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
          <label className={cn(label, "sm:mb-0")} htmlFor="help-to">
            To
          </label>
          <select
            id="help-to"
            className={field}
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as "account" | "funding" | "trading" | "kyc" | "technical" | "other")
            }
          >
            <option value="account">Account services</option>
            <option value="funding">Funding / treasury</option>
            <option value="trading">Trading desk</option>
            <option value="kyc">KYC / compliance</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-center sm:gap-4">
          <label className={cn(label, "sm:mb-0")} htmlFor="help-subject">
            Subject
          </label>
          <input
            id="help-subject"
            className={field}
            placeholder="Brief summary"
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5 sm:grid-cols-[minmax(0,140px)_1fr] sm:items-start sm:gap-4">
          <label className={cn(label, "pt-2 sm:mb-0 sm:pt-2.5")} htmlFor="help-message">
            Message
          </label>
          <textarea
            id="help-message"
            className={cn("min-h-[160px] resize-y", field)}
            placeholder="Describe your question or issue…"
            value={body}
            maxLength={5000}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="gap-2 bg-gradient-brand px-8 text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              "Send"
            )}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function TicketDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/tickets?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setData(await res.json());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function send() {
    if (reply.trim().length < 1) return;
    setSending(true);
    try {
      const res = await fetch("/api/portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          payload: { ticket_id: id, body: reply.trim(), is_internal: false },
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setReply("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  if (loading || !data) {
    return (
      <SectionCard className="shadow-md ring-1 ring-border/40" title="Loading…">
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading ticket…
        </div>
      </SectionCard>
    );
  }

  const t = data.ticket;
  const closed = t.status === "closed";

  return (
    <SectionCard
      className="shadow-md ring-1 ring-border/40"
      title={t.subject}
      description={
        <span className="capitalize">
          {t.category} • {t.priority} priority • Opened {new Date(t.created_at).toLocaleString()}
        </span>
      }
      right={
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
      }
    >
      <div className="space-y-4">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/25 px-2.5 py-1 text-xs font-medium ${
            STATUS_TONE[t.status] ?? "text-muted-foreground"
          }`}
        >
          {t.status === "resolved" || t.status === "closed" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Clock className="h-3.5 w-3.5" aria-hidden />
          )}
          {STATUS_LABEL[t.status] ?? t.status}
        </div>

        <div className="space-y-3">
          {data.messages.map((m: any) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg border p-3",
                m.author_role === "investor"
                  ? "border-border/60 bg-surface/50"
                  : "border-brand/25 bg-brand/[0.06]",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs font-medium capitalize text-foreground">
                  {m.author_role === "investor" ? "You" : "Help desk"}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              <div className="whitespace-pre-wrap text-sm text-foreground">{m.body}</div>
            </div>
          ))}
        </div>

        {closed ? (
          <div className="border-t border-border/60 py-3 text-center text-sm text-muted-foreground">
            This ticket is closed. Open a new request if you need further help.
          </div>
        ) : (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <textarea
              className={cn("min-h-24 resize-y", field)}
              placeholder="Type your reply…"
              value={reply}
              maxLength={5000}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={sending || reply.trim().length === 0}
                onClick={() => void send()}
                className="gap-2 bg-gradient-brand text-brand-foreground shadow-md shadow-brand/15 hover:opacity-95 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Send reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
