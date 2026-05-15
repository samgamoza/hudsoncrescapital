import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TradeHistoryRow } from "@/lib/trade-history.types";
import {
  DESK_BUY_COLUMN_HEADERS,
  DESK_SELL_COLUMN_HEADERS,
  mapTradeToBuyDisplay,
  mapTradeToSellDisplay,
} from "@/lib/desk-trade-history-mappers";
import { SectionCard } from "@/lib/portalShared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (c: string | number) => {
    const s = String(c);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function D2MiniEmpty({ title }: { title: string }) {
  return (
    <p className="py-10 text-center text-sm font-medium text-destructive/90" role="status">
      {title}
    </p>
  );
}

const thBuy = cn(
  "whitespace-nowrap border-b border-border/80 bg-muted/35 px-2 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:px-2.5 sm:text-[10px]",
);
const td = "border-b border-border/40 px-2 py-2 text-xs sm:px-2.5 sm:text-sm";

export function DeskTradeHistoryTables({
  className,
  showSectionCards = true,
}: {
  className?: string;
  /** When false, render tables only (e.g. embedded in Portfolio page). */
  showSectionCards?: boolean;
}) {
  const [rows, setRows] = useState<TradeHistoryRow[] | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/trade-history");
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error("Failed to load");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const buys = useMemo(
    () => (rows ?? []).filter((x) => String(x.side).toLowerCase().includes("buy")),
    [rows],
  );
  const sells = useMemo(
    () => (rows ?? []).filter((x) => String(x.side).toLowerCase().includes("sell")),
    [rows],
  );

  const exportBuyCsv = () => {
    downloadCsv(
      "trading-record-buy.csv",
      [...DESK_BUY_COLUMN_HEADERS],
      buys.map((t) => {
        const r = mapTradeToBuyDisplay(t);
        return [
          r.tradeDate,
          r.tradeTime,
          r.tradeRefNo,
          r.subscription,
          r.index,
          r.assetClass,
          r.cusipOrSymbol,
          r.quantity,
          r.bidPrice,
          r.strikePrice,
          r.tradeAmount,
          r.tradeFees,
          r.tradeTotal,
          r.status,
        ];
      }),
    );
    toast.success("Buy records exported (CSV)");
  };

  const exportSellCsv = () => {
    downloadCsv(
      "trading-record-sell.csv",
      [...DESK_SELL_COLUMN_HEADERS],
      sells.map((t) => {
        const r = mapTradeToSellDisplay(t);
        return [
          r.sellTxnNo,
          r.sellDate,
          r.productSymbol,
          r.sellPricePerUnit,
          r.quantity,
          r.totalSellAmount,
          r.status,
        ];
      }),
    );
    toast.success("Sell records exported (CSV)");
  };

  const exportButtons = (which: "buy" | "sell") => (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 border-border/70 shadow-sm"
        onClick={which === "buy" ? exportBuyCsv : exportSellCsv}
      >
        <FileSpreadsheet className="h-4 w-4" /> Export EXCEL
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 border-border/70 shadow-sm"
        onClick={() => window.print()}
      >
        <Download className="h-4 w-4" /> Export PDF
      </Button>
    </div>
  );

  const buyTable = (
    <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
      <div className="overflow-x-auto text-sm">
        {rows === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
            Loading…
          </div>
        ) : buys.length === 0 ? (
          <D2MiniEmpty title="No available record" />
        ) : (
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                {DESK_BUY_COLUMN_HEADERS.map((h) => (
                  <th key={h} className={thBuy}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {buys.map((t) => {
                const r = mapTradeToBuyDisplay(t);
                return (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className={td}>{r.tradeDate}</td>
                    <td className={td}>{r.tradeTime}</td>
                    <td className={cn(td, "font-mono text-muted-foreground")}>{r.tradeRefNo}</td>
                    <td className={td}>{r.subscription}</td>
                    <td className={td}>{r.index}</td>
                    <td className={td}>{r.assetClass}</td>
                    <td className={cn(td, "font-mono")}>{r.cusipOrSymbol}</td>
                    <td className={cn(td, "tabular-nums")}>{r.quantity}</td>
                    <td className={cn(td, "tabular-nums")}>{r.bidPrice}</td>
                    <td className={cn(td, "tabular-nums")}>{r.strikePrice}</td>
                    <td className={cn(td, "tabular-nums")}>{r.tradeAmount}</td>
                    <td className={cn(td, "tabular-nums")}>{r.tradeFees}</td>
                    <td className={cn(td, "tabular-nums font-medium")}>{r.tradeTotal}</td>
                    <td className={cn(td, "text-xs font-semibold uppercase tracking-wide text-success")}>
                      {r.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
        Showing{" "}
        <span className="tabular-nums text-foreground">{rows === null ? 0 : buys.length}</span> to{" "}
        <span className="tabular-nums text-foreground">{rows === null ? 0 : buys.length}</span> of{" "}
        <span className="tabular-nums text-foreground">{rows === null ? 0 : buys.length}</span> entries
      </p>
      <p className="border-t border-border/50 px-3 py-2 text-xs font-medium text-destructive/90">
        Legend: Cross-listed and ADR line items follow the same fee and settlement rules as the live
        ticket. H-shares and RMB counters may carry additional currency and disclosure requirements.
      </p>
    </div>
  );

  const sellTable = (
    <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
      <div className="overflow-x-auto text-sm">
        {rows === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
            Loading…
          </div>
        ) : sells.length === 0 ? (
          <D2MiniEmpty title="No available record" />
        ) : (
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                {DESK_SELL_COLUMN_HEADERS.map((h) => (
                  <th key={h} className={thBuy}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sells.map((t) => {
                const r = mapTradeToSellDisplay(t);
                return (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className={cn(td, "font-mono text-muted-foreground")}>{r.sellTxnNo}</td>
                    <td className={td}>{r.sellDate}</td>
                    <td className={cn(td, "font-medium")}>{r.productSymbol}</td>
                    <td className={cn(td, "tabular-nums")}>{r.sellPricePerUnit}</td>
                    <td className={cn(td, "tabular-nums")}>{r.quantity}</td>
                    <td className={cn(td, "tabular-nums font-medium")}>{r.totalSellAmount}</td>
                    <td className={cn(td, "text-xs font-semibold uppercase tracking-wide text-success")}>
                      {r.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
        Showing{" "}
        <span className="tabular-nums text-foreground">{rows === null ? 0 : sells.length}</span> to{" "}
        <span className="tabular-nums text-foreground">{rows === null ? 0 : sells.length}</span> of{" "}
        <span className="tabular-nums text-foreground">{rows === null ? 0 : sells.length}</span> entries
      </p>
    </div>
  );

  const inner = (
    <div className={cn("space-y-10", className)}>
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
          <h3 className="text-base font-semibold text-foreground">Trading record — Buy</h3>
          {exportButtons("buy")}
        </div>
        {buyTable}
      </div>
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
          <h3 className="text-base font-semibold text-foreground">Trading record — Sell</h3>
          {exportButtons("sell")}
        </div>
        {sellTable}
      </div>
    </div>
  );

  if (showSectionCards) {
    return (
      <SectionCard
        className="shadow-md ring-1 ring-border/40"
        title="Trade history"
        description="Trading record — Buy and Trading record — Sell. Columns match Trade order (subscription, class, CUSIP/symbol, quantities, fees, totals) and portfolio line items."
      >
        {inner}
      </SectionCard>
    );
  }

  return inner;
}
