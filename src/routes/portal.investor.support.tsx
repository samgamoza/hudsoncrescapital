import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { Loader2, MessageSquarePlus, Send, ArrowLeft, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/portal/investor/support")({
  head: () => ({
    meta: [{ title: "Support — Hudson Crest Capital" }, { name: "robots", content: "noindex" }],
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
  pending_staff: "Awaiting support",
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load tickets");
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
        title="Support"
        subtitle="Get help from our team. Average response time: under 4 hours."
      />

      {view === "list" && (
        <SectionCard
          title="My Tickets"
          description="Open requests, status updates, and history."
          right={
            <button
              onClick={() => setView("new")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90"
            >
              <MessageSquarePlus className="h-4 w-4" /> New Ticket
            </button>
          }
        >
          {loading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              You haven't opened any tickets yet.
              <div className="mt-3">
                <button
                  onClick={() => setView("new")}
                  className="text-brand hover:underline text-sm"
                >
                  Open your first ticket →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveId(t.id);
                    setView("detail");
                  }}
                  className="w-full text-left p-3 rounded-lg bg-surface-elevated/40 border border-border hover:border-brand/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {t.subject}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="capitalize">{t.category}</span>
                        <span>•</span>
                        <span className="capitalize">{t.priority}</span>
                        <span>•</span>
                        <span>{new Date(t.last_activity_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium ${STATUS_TONE[t.status] ?? "text-muted-foreground"}`}
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
  >("other");
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
      toast.success("Ticket created");
      onCreated(res.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      title="New Ticket"
      description="Describe your issue and our team will respond shortly."
      right={
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Category</div>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            >
              <option value="account">Account</option>
              <option value="funding">Deposit / Withdrawal</option>
              <option value="trading">Trading</option>
              <option value="kyc">KYC / Verification</option>
              <option value="technical">Technical issue</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Priority</div>
            <select
              className={inputCls}
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="block">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Subject</div>
          <input
            className={inputCls}
            placeholder="Briefly describe the issue"
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Message</div>
          <textarea
            className={`${inputCls} min-h-32`}
            placeholder="Provide as much detail as possible…"
            value={body}
            maxLength={5000}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit
          </button>
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load ticket");
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  if (loading || !data) {
    return (
      <SectionCard title="Loading…">
        <div className="py-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading ticket…
        </div>
      </SectionCard>
    );
  }

  const t = data.ticket;
  const closed = t.status === "closed";

  return (
    <SectionCard
      title={t.subject}
      description={
        <span className="capitalize">
          {t.category} • {t.priority} priority • Opened {new Date(t.created_at).toLocaleString()}
        </span>
      }
      right={
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-4">
        <div
          className={`text-xs font-medium inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface-elevated/50 ${
            STATUS_TONE[t.status] ?? "text-muted-foreground"
          }`}
        >
          {t.status === "resolved" || t.status === "closed" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          {STATUS_LABEL[t.status] ?? t.status}
        </div>

        <div className="space-y-3">
          {data.messages.map((m: any) => (
            <div
              key={m.id}
              className={`p-3 rounded-lg border ${
                m.author_role === "investor"
                  ? "bg-surface-elevated/30 border-border"
                  : "bg-brand/5 border-brand/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs font-medium text-foreground capitalize">
                  {m.author_role === "investor" ? "You" : "Support"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap">{m.body}</div>
            </div>
          ))}
        </div>

        {closed ? (
          <div className="text-sm text-muted-foreground text-center py-3 border-t border-border">
            This ticket is closed. Open a new one if you need further help.
          </div>
        ) : (
          <div className="border-t border-border pt-4 space-y-3">
            <textarea
              className={`${inputCls} min-h-24`}
              placeholder="Type your reply…"
              value={reply}
              maxLength={5000}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                onClick={send}
                disabled={sending || reply.trim().length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Reply
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-foreground focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/40";
