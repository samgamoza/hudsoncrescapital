export type TradeHistoryRow = {
  id: string;
  side: string;
  quantity: number;
  price: number;
  gross_amount: number;
  fees: number;
  commission: number;
  currency: string;
  executed_at: string;
  account_id: string;
  order_id: string;
  instrument_id: string;
  symbol: string;
  instrument_name: string;
  /** Broker-facing execution id when present (preferred for Trade Ref.No.). */
  broker_execution_id: string | null;
  instrument_exchange: string | null;
  instrument_asset_class: string | null;
  instrument_metadata: Record<string, unknown> | null;
  /** Filled order status when joined (e.g. filled, partially_filled). */
  order_status: string | null;
  /**
   * `details` JSON from a matching `sub_portfolio_holdings` row (admin "+ Position"),
   * keyed the same as `ASSET_CLASSES[...].detailFields` (commodity, exchange, strike, etc.).
   */
  position_details: Record<string, unknown> | null;
  position_display_name: string | null;
  /** `sub_portfolios.asset_class` for the matched holding (admin pool / Add Position). */
  holding_pool_asset_class: string | null;
};

/** Staff console: executions with investor context. */
export type StaffTradeHistoryRow = TradeHistoryRow & {
  investor_user_id: string;
  client_email: string | null;
  account_number: string | null;
};
