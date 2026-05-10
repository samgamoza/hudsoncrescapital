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
};

/** Staff console: executions with investor context. */
export type StaffTradeHistoryRow = TradeHistoryRow & {
  investor_user_id: string;
  client_email: string | null;
  account_number: string | null;
};
