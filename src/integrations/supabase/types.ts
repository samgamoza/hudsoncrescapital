export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string
          account_type: Database["public"]["Enums"]["account_type"]
          base_currency: string
          closed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          opened_at: string | null
          status: Database["public"]["Enums"]["account_status"]
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_type?: Database["public"]["Enums"]["account_type"]
          base_currency?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          base_currency?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          payload: Json | null
          target_id: string | null
          target_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      cash_ledger: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          created_at: string
          currency: string
          description: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          posted_at: string
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          created_at?: string
          currency: string
          description?: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          posted_at?: string
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          posted_at?: string
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_provider: string | null
          provider_payment_id: string | null
          provider_session_id: string | null
          reference: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          provider_session_id?: string | null
          reference?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          provider_session_id?: string | null
          reference?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instruments: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          created_at: string
          currency: string
          exchange: string | null
          id: string
          is_tradable: boolean
          lot_size: number
          metadata: Json | null
          name: string
          symbol: string
          tick_size: number
          updated_at: string
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          is_tradable?: boolean
          lot_size?: number
          metadata?: Json | null
          name: string
          symbol: string
          tick_size?: number
          updated_at?: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          is_tradable?: boolean
          lot_size?: number
          metadata?: Json | null
          name?: string
          symbol?: string
          tick_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      kyc_checks: {
        Row: {
          check_type: Database["public"]["Enums"]["kyc_check_type"]
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          provider: string
          raw_payload: Json | null
          risk_score: number | null
          status: Database["public"]["Enums"]["kyc_check_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          check_type: Database["public"]["Enums"]["kyc_check_type"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          provider: string
          raw_payload?: Json | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["kyc_check_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          check_type?: Database["public"]["Enums"]["kyc_check_type"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          provider?: string
          raw_payload?: Json | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["kyc_check_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["kyc_doc_type"]
          expires_at: string | null
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          storage_path: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["kyc_doc_type"]
          expires_at?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          storage_path: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["kyc_doc_type"]
          expires_at?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          storage_path?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      margin_snapshots: {
        Row: {
          account_id: string
          buying_power: number
          cash_balance: number
          created_at: string
          currency: string
          equity: number
          excess_liquidity: number
          id: string
          maintenance_margin: number
          margin_used: number
          snapshot_at: string
        }
        Insert: {
          account_id: string
          buying_power: number
          cash_balance: number
          created_at?: string
          currency?: string
          equity: number
          excess_liquidity?: number
          id?: string
          maintenance_margin?: number
          margin_used?: number
          snapshot_at?: string
        }
        Update: {
          account_id?: string
          buying_power?: number
          cash_balance?: number
          created_at?: string
          currency?: string
          equity?: number
          excess_liquidity?: number
          id?: string
          maintenance_margin?: number
          margin_used?: number
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "margin_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_id: string
          avg_fill_price: number | null
          broker_order_id: string | null
          cancelled_at: string | null
          client_order_id: string | null
          created_at: string
          filled_at: string | null
          filled_quantity: number
          id: string
          instrument_id: string
          limit_price: number | null
          order_type: Database["public"]["Enums"]["order_type"]
          parent_order_id: string | null
          placed_at: string
          placed_by: string
          quantity: number
          rejection_reason: string | null
          side: Database["public"]["Enums"]["order_side"]
          status: Database["public"]["Enums"]["order_status"]
          stop_price: number | null
          time_in_force: Database["public"]["Enums"]["time_in_force"]
          updated_at: string
        }
        Insert: {
          account_id: string
          avg_fill_price?: number | null
          broker_order_id?: string | null
          cancelled_at?: string | null
          client_order_id?: string | null
          created_at?: string
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          instrument_id: string
          limit_price?: number | null
          order_type: Database["public"]["Enums"]["order_type"]
          parent_order_id?: string | null
          placed_at?: string
          placed_by: string
          quantity: number
          rejection_reason?: string | null
          side: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          stop_price?: number | null
          time_in_force?: Database["public"]["Enums"]["time_in_force"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          avg_fill_price?: number | null
          broker_order_id?: string | null
          cancelled_at?: string | null
          client_order_id?: string | null
          created_at?: string
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          instrument_id?: string
          limit_price?: number | null
          order_type?: Database["public"]["Enums"]["order_type"]
          parent_order_id?: string | null
          placed_at?: string
          placed_by?: string
          quantity?: number
          rejection_reason?: string | null
          side?: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          stop_price?: number | null
          time_in_force?: Database["public"]["Enums"]["time_in_force"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          deposit_request_id: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          deposit_request_id?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
        }
        Update: {
          created_at?: string
          deposit_request_id?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          account_id: string
          avg_cost: number
          created_at: string
          currency: string
          id: string
          instrument_id: string
          last_trade_at: string | null
          opened_at: string | null
          quantity: number
          realized_pnl: number
          updated_at: string
        }
        Insert: {
          account_id: string
          avg_cost?: number
          created_at?: string
          currency?: string
          id?: string
          instrument_id: string
          last_trade_at?: string | null
          opened_at?: string | null
          quantity?: number
          realized_pnl?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          avg_cost?: number
          created_at?: string
          currency?: string
          id?: string
          instrument_id?: string
          last_trade_at?: string | null
          opened_at?: string | null
          quantity?: number
          realized_pnl?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country_of_residence: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          id: string
          legal_first_name: string | null
          legal_last_name: string | null
          metadata: Json
          nationality: string | null
          phone: string | null
          status: string
          tax_id_last4: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          country_of_residence?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          legal_first_name?: string | null
          legal_last_name?: string | null
          metadata?: Json
          nationality?: string | null
          phone?: string | null
          status?: string
          tax_id_last4?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          country_of_residence?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          legal_first_name?: string | null
          legal_last_name?: string | null
          metadata?: Json
          nationality?: string | null
          phone?: string | null
          status?: string
          tax_id_last4?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      sub_portfolio_holdings: {
        Row: {
          account_id: string
          avg_cost: number
          created_at: string
          currency: string
          details: Json | null
          display_name: string | null
          id: string
          mark_price: number | null
          opened_at: string | null
          quantity: number
          sub_portfolio_id: string
          symbol: string
          unit_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          avg_cost?: number
          created_at?: string
          currency?: string
          details?: Json | null
          display_name?: string | null
          id?: string
          mark_price?: number | null
          opened_at?: string | null
          quantity?: number
          sub_portfolio_id: string
          symbol: string
          unit_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          avg_cost?: number
          created_at?: string
          currency?: string
          details?: Json | null
          display_name?: string | null
          id?: string
          mark_price?: number | null
          opened_at?: string | null
          quantity?: number
          sub_portfolio_id?: string
          symbol?: string
          unit_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_portfolio_holdings_sub_portfolio_id_fkey"
            columns: ["sub_portfolio_id"]
            isOneToOne: false
            referencedRelation: "sub_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_portfolios: {
        Row: {
          account_id: string
          asset_class: Database["public"]["Enums"]["asset_class_kind"]
          base_currency: string
          created_at: string
          id: string
          metadata: Json | null
          name: string
          risk_band: string | null
          status: Database["public"]["Enums"]["sub_portfolio_status"]
          target_allocation_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          asset_class: Database["public"]["Enums"]["asset_class_kind"]
          base_currency?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          risk_band?: string | null
          status?: Database["public"]["Enums"]["sub_portfolio_status"]
          target_allocation_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          asset_class?: Database["public"]["Enums"]["asset_class_kind"]
          base_currency?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          risk_band?: string | null
          status?: Database["public"]["Enums"]["sub_portfolio_status"]
          target_allocation_pct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_id: string
          author_role: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          author_role: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          id: string
          last_activity_at: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          account_id: string
          broker_execution_id: string | null
          commission: number
          created_at: string
          currency: string
          executed_at: string
          fees: number
          gross_amount: number
          id: string
          instrument_id: string
          order_id: string
          price: number
          quantity: number
          side: Database["public"]["Enums"]["order_side"]
        }
        Insert: {
          account_id: string
          broker_execution_id?: string | null
          commission?: number
          created_at?: string
          currency: string
          executed_at?: string
          fees?: number
          gross_amount: number
          id?: string
          instrument_id: string
          order_id: string
          price: number
          quantity: number
          side: Database["public"]["Enums"]["order_side"]
        }
        Update: {
          account_id?: string
          broker_execution_id?: string | null
          commission?: number
          created_at?: string
          currency?: string
          executed_at?: string
          fees?: number
          gross_amount?: number
          id?: string
          instrument_id?: string
          order_id?: string
          price?: number
          quantity?: number
          side?: Database["public"]["Enums"]["order_side"]
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mfa: {
        Row: {
          created_at: string
          enabled: boolean
          enrolled_at: string | null
          recovery_codes: string[] | null
          secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          enrolled_at?: string | null
          recovery_codes?: string[] | null
          secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          enrolled_at?: string | null
          recovery_codes?: string[] | null
          secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          currency: string
          description: string | null
          id: string
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          txn_type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          txn_type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          txn_type?: Database["public"]["Enums"]["wallet_txn_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          account_id: string
          available_balance: number
          created_at: string
          currency: string
          id: string
          on_hold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          on_hold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          on_hold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          destination: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency?: string
          destination: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          destination?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_is_active: { Args: { _account_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_account: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "pending" | "active" | "restricted" | "closed"
      account_type: "cash" | "margin" | "retirement"
      app_role: "admin" | "investor" | "super_admin" | "support"
      asset_class:
        | "equity"
        | "etf"
        | "crypto"
        | "fx"
        | "commodity"
        | "bond"
        | "option"
        | "future"
      asset_class_kind:
        | "equities"
        | "crypto"
        | "commodities"
        | "managed_strategy"
      kyc_check_status: "pending" | "passed" | "failed" | "manual_review"
      kyc_check_type:
        | "identity"
        | "aml"
        | "pep"
        | "sanctions"
        | "adverse_media"
        | "accreditation"
      kyc_doc_type:
        | "passport"
        | "driver_license"
        | "national_id"
        | "utility_bill"
        | "bank_statement"
        | "tax_form_w8ben"
        | "tax_form_w9"
        | "proof_of_address"
        | "selfie"
      kyc_status: "pending" | "approved" | "rejected" | "expired"
      ledger_entry_type:
        | "deposit"
        | "withdrawal"
        | "trade_buy"
        | "trade_sell"
        | "fee"
        | "commission"
        | "dividend"
        | "interest"
        | "tax"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
      order_side: "buy" | "sell"
      order_status:
        | "pending"
        | "working"
        | "partially_filled"
        | "filled"
        | "cancelled"
        | "rejected"
        | "expired"
      order_type: "market" | "limit" | "stop" | "stop_limit"
      payment_method:
        | "bank_transfer"
        | "stripe"
        | "paypal"
        | "crypto"
        | "wire"
        | "other"
      request_status: "pending" | "approved" | "rejected" | "cancelled"
      sub_portfolio_status: "active" | "paused" | "closed"
      ticket_category:
        | "account"
        | "funding"
        | "trading"
        | "kyc"
        | "technical"
        | "other"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "open"
        | "pending_user"
        | "pending_staff"
        | "resolved"
        | "closed"
      time_in_force: "day" | "gtc" | "ioc" | "fok"
      wallet_txn_type:
        | "deposit"
        | "withdrawal"
        | "adjustment"
        | "fee"
        | "transfer_in"
        | "transfer_out"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "active", "restricted", "closed"],
      account_type: ["cash", "margin", "retirement"],
      app_role: ["admin", "investor", "super_admin", "support"],
      asset_class: [
        "equity",
        "etf",
        "crypto",
        "fx",
        "commodity",
        "bond",
        "option",
        "future",
      ],
      asset_class_kind: [
        "equities",
        "crypto",
        "commodities",
        "managed_strategy",
      ],
      kyc_check_status: ["pending", "passed", "failed", "manual_review"],
      kyc_check_type: [
        "identity",
        "aml",
        "pep",
        "sanctions",
        "adverse_media",
        "accreditation",
      ],
      kyc_doc_type: [
        "passport",
        "driver_license",
        "national_id",
        "utility_bill",
        "bank_statement",
        "tax_form_w8ben",
        "tax_form_w9",
        "proof_of_address",
        "selfie",
      ],
      kyc_status: ["pending", "approved", "rejected", "expired"],
      ledger_entry_type: [
        "deposit",
        "withdrawal",
        "trade_buy",
        "trade_sell",
        "fee",
        "commission",
        "dividend",
        "interest",
        "tax",
        "transfer_in",
        "transfer_out",
        "adjustment",
      ],
      order_side: ["buy", "sell"],
      order_status: [
        "pending",
        "working",
        "partially_filled",
        "filled",
        "cancelled",
        "rejected",
        "expired",
      ],
      order_type: ["market", "limit", "stop", "stop_limit"],
      payment_method: [
        "bank_transfer",
        "stripe",
        "paypal",
        "crypto",
        "wire",
        "other",
      ],
      request_status: ["pending", "approved", "rejected", "cancelled"],
      sub_portfolio_status: ["active", "paused", "closed"],
      ticket_category: [
        "account",
        "funding",
        "trading",
        "kyc",
        "technical",
        "other",
      ],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "open",
        "pending_user",
        "pending_staff",
        "resolved",
        "closed",
      ],
      time_in_force: ["day", "gtc", "ioc", "fok"],
      wallet_txn_type: [
        "deposit",
        "withdrawal",
        "adjustment",
        "fee",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
