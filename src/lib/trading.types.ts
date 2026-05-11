/** Tradable instrument row for order entry UI. */
export type TradableInstrument = {
  id: string;
  symbol: string;
  name: string;
  asset_class: string;
  currency: string;
  exchange: string | null;
  tick_size: number;
  lot_size: number;
};

export type TradingAccount = {
  id: string;
  account_number: string;
  status: string;
  base_currency: string;
  account_type: string;
};

/** Order list row with display fields. */
export type InvestorOrderRow = {
  id: string;
  account_id: string;
  account_number: string | null;
  instrument_id: string;
  symbol: string;
  instrument_name: string;
  side: string;
  order_type: string;
  time_in_force: string;
  quantity: number;
  limit_price: number | null;
  stop_price: number | null;
  status: string;
  filled_quantity: number;
  avg_fill_price: number | null;
  rejection_reason: string | null;
  placed_at: string;
  cancelled_at: string | null;
  filled_at: string | null;
  client_order_id: string | null;
};

/** Per-account cash and position summary for workspace headers / P/L strip. */
export type AccountPortfolioSnapshot = {
  account_id: string;
  account_number: string;
  base_currency: string;
  cash_balance: number;
  open_position_count: number;
  realized_pnl: number;
};

export type InvestorTradingWorkspace = {
  instruments: TradableInstrument[];
  accounts: TradingAccount[];
  orders: InvestorOrderRow[];
  account_snapshots?: AccountPortfolioSnapshot[];
};
