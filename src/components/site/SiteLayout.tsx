import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { TickerTape } from "./TickerTape";

/** Set `VITE_SITE_TICKER_ENABLED=false` in Vercel (and redeploy) to hide the strip entirely. */
const siteTickerEnabled = import.meta.env.VITE_SITE_TICKER_ENABLED !== "false";

export function SiteLayout({ children }: { children: ReactNode }) {
  // NOTE: `overflow-x-clip` (not `overflow-x-hidden`) is intentional. Setting
  // any non-`visible` overflow on this ancestor would make it the scroll
  // container for `position: sticky` and break the sticky header below.
  // `clip` blocks horizontal bleed without creating a scroll container.
  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-clip">
      <div className="sticky top-0 z-50 flex flex-col shadow-sm shadow-black/20">
        {siteTickerEnabled ? <TickerTape /> : null}
        <Header />
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_oklch(0.65_0.22_255_/_0.18),_transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {title} {highlight && <span className="text-gradient-brand">{highlight}</span>}
        </h1>
        {description && (
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-7xl px-6 py-16 lg:py-24 ${className}`}>
      {children}
    </section>
  );
}

export function SplitHero({
  eyebrow,
  title,
  highlight,
  description,
  image,
  imageAlt,
  side,
  cta,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  side?: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {title}
            {highlight && (
              <>
                {" "}
                <span className="text-gradient-brand">{highlight}</span>
              </>
            )}
          </h1>
          {description && (
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              {description}
            </p>
          )}
          {cta && <div className="mt-8">{cta}</div>}
        </div>
        <div className="flex flex-col justify-center gap-6">
          {image && (
            <div className="relative overflow-hidden rounded-2xl border border-border">
              <img
                src={image}
                alt={imageAlt ?? ""}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background/60 via-transparent to-transparent" />
            </div>
          )}
          {side}
        </div>
      </div>
    </section>
  );
}

export function StatRow({
  items,
}: {
  items: { icon?: React.ComponentType<{ className?: string }>; value: string; label: string }[];
}) {
  return (
    <div className="surface-card divide-y divide-border/60">
      {items.map((s) => (
        <div key={s.label} className="flex items-center gap-4 px-5 py-4">
          {s.icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand ring-1 ring-brand/20">
              <s.icon className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1">
            <div className="text-xl font-semibold text-foreground">{s.value}</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CtaBanner({
  title,
  description,
  actionLabel,
  onAction,
  to,
  icon: Icon,
}: {
  title: string;
  description?: string;
  actionLabel: string;
  onAction?: () => void;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const btnClass =
    "inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow";
  return (
    <Section>
      <div className="surface-card flex flex-col items-start justify-between gap-5 border-brand/30 bg-brand/5 p-8 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          {Icon && <Icon className="h-9 w-9 text-brand" />}
          <div>
            <h3 className="text-2xl font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {to ? (
          <a href={to} className={btnClass}>
            {actionLabel}
          </a>
        ) : (
          <button onClick={onAction} className={btnClass}>
            {actionLabel}
          </button>
        )}
      </div>
    </Section>
  );
}

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="surface-card p-5">
      <div className="text-2xl font-semibold text-gradient-brand sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-card p-6 transition-all hover:border-brand/40 hover:shadow-glow">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/20">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
