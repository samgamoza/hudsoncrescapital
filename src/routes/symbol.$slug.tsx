import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { SiteLayout, Section } from "@/components/site/SiteLayout";
import { getSymbolBySlug, SYMBOL_CATALOG } from "@/lib/symbols";
type SymbolDetail = {
  slug: string;
  sym: string;
  name: string;
  category: string;
  type: "stock" | "fx" | "crypto";
  current: number | null;
  change: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  prevClose: number | null;
  valFmt: string;
  chgFmt: string;
  up: boolean;
};

export const Route = createFileRoute("/symbol/$slug")({
  loader: ({ params }) => {
    const meta = getSymbolBySlug(params.slug);
    if (!meta) throw notFound();
    return { meta };
  },
  head: ({ params }) => {
    const meta = getSymbolBySlug(params.slug);
    const title = meta ? `${meta.sym} — Live Quote | Hudson Crest Capital` : "Symbol";
    const description = meta
      ? `Live price, change, and market data for ${meta.name}.`
      : "Live market symbol detail.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: SymbolPage,
  notFoundComponent: () => (
    <SiteLayout>
      <Section>
        <h1 className="text-3xl font-bold text-foreground">Symbol not found</h1>
        <p className="mt-3 text-muted-foreground">This ticker isn't tracked.</p>
        <Link to="/" className="mt-6 inline-flex text-brand">
          ← Back home
        </Link>
      </Section>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <Section>
        <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
        <p className="mt-3 text-muted-foreground">{error.message}</p>
      </Section>
    </SiteLayout>
  ),
});

function SymbolPage() {
  const { meta } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [detail, setDetail] = useState<SymbolDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/public/symbol-detail?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const r = (await res.json()) as { detail: SymbolDetail | null };
        if (alive) {
          setDetail(r.detail);
          setLoading(false);
        }
      } catch {
        if (alive) setLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [slug]);

  return (
    <SiteLayout>
      <Section>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to overview
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="eyebrow">{meta.category}</div>
            <h1 className="mt-2 text-4xl font-bold text-foreground sm:text-5xl">{meta.sym}</h1>
            <p className="mt-2 text-muted-foreground">{meta.name}</p>
          </div>
          <div className="text-right">
            {loading && !detail ? (
              <div className="h-10 w-32 animate-pulse rounded bg-muted" />
            ) : detail ? (
              <>
                <div className="font-mono text-4xl font-semibold text-foreground">
                  {detail.valFmt}
                </div>
                <div
                  className={`mt-1 inline-flex items-center gap-1 font-mono text-sm ${detail.up ? "text-success" : "text-danger"}`}
                >
                  {detail.up ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {detail.chgFmt}
                  {detail.change !== null && (
                    <span className="ml-2 text-muted-foreground">
                      ({detail.up ? "+" : ""}
                      {detail.change.toFixed(2)})
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Unavailable</div>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Open" value={detail?.open} type={meta.type} />
          <Stat label="Previous Close" value={detail?.prevClose} type={meta.type} />
          <Stat label="Day High" value={detail?.high} type={meta.type} />
          <Stat label="Day Low" value={detail?.low} type={meta.type} />
        </div>

        <div className="mt-10 surface-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">About</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {meta.name} is tracked in the Hudson Crest Capital live market overview as part of our{" "}
            {meta.category.toLowerCase()} coverage. Quotes refresh every 10 seconds from our market
            data provider and are intended for informational purposes only — not investment advice.
          </p>
        </div>

        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
            More symbols
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {SYMBOL_CATALOG.filter((s) => s.slug !== slug)
              .slice(0, 14)
              .map((s) => (
                <Link
                  key={s.slug}
                  to="/symbol/$slug"
                  params={{ slug: s.slug }}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand/40 hover:text-foreground"
                >
                  {s.sym}
                </Link>
              ))}
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}

function Stat({
  label,
  value,
  type,
}: {
  label: string;
  value: number | null | undefined;
  type: "stock" | "fx" | "crypto";
}) {
  const fmt = (v: number) =>
    type === "fx"
      ? v.toFixed(4)
      : v >= 1000
        ? v.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : v.toFixed(2);
  return (
    <div className="surface-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-foreground">
        {value === null || value === undefined ? "—" : fmt(value)}
      </div>
    </div>
  );
}
