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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      client_payments: {
        Row: {
          agreement_id: string
          amount: number
          block_number: number | null
          client_address: string
          created_at: string | null
          id: string
          transaction_hash: string | null
        }
        Insert: {
          agreement_id: string
          amount: number
          block_number?: number | null
          client_address: string
          created_at?: string | null
          id?: string
          transaction_hash?: string | null
        }
        Update: {
          agreement_id?: string
          amount?: number
          block_number?: number | null
          client_address?: string
          created_at?: string | null
          id?: string
          transaction_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "pledge_agreements"
            referencedColumns: ["agreement_id"]
          },
        ]
      }
      investor_purchases: {
        Row: {
          agreement_id: string
          block_number: number | null
          created_at: string | null
          id: string
          investor_address: string
          purchase_id: string
          token_amount: number
          transaction_hash: string | null
          usdt_paid: number
        }
        Insert: {
          agreement_id: string
          block_number?: number | null
          created_at?: string | null
          id?: string
          investor_address: string
          purchase_id: string
          token_amount: number
          transaction_hash?: string | null
          usdt_paid: number
        }
        Update: {
          agreement_id?: string
          block_number?: number | null
          created_at?: string | null
          id?: string
          investor_address?: string
          purchase_id?: string
          token_amount?: number
          transaction_hash?: string | null
          usdt_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "investor_purchases_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "pledge_agreements"
            referencedColumns: ["agreement_id"]
          },
        ]
      }
      platform_analytics: {
        Row: {
          active_pledges: number | null
          date: string
          id: string
          platform_revenue: number | null
          total_clients_paid: number | null
          total_pledges_created: number | null
          total_tokens_purchased: number | null
          total_usdt_invested: number | null
          total_value_pledged: number | null
          unique_clients: number | null
          unique_investors: number | null
          updated_at: string | null
        }
        Insert: {
          active_pledges?: number | null
          date?: string
          id?: string
          platform_revenue?: number | null
          total_clients_paid?: number | null
          total_pledges_created?: number | null
          total_tokens_purchased?: number | null
          total_usdt_invested?: number | null
          total_value_pledged?: number | null
          unique_clients?: number | null
          unique_investors?: number | null
          updated_at?: string | null
        }
        Update: {
          active_pledges?: number | null
          date?: string
          id?: string
          platform_revenue?: number | null
          total_clients_paid?: number | null
          total_pledges_created?: number | null
          total_tokens_purchased?: number | null
          total_usdt_invested?: number | null
          total_value_pledged?: number | null
          unique_clients?: number | null
          unique_investors?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pledge_agreements: {
        Row: {
          agreement_id: string
          asset_id: string
          asset_type: string
          block_number: number | null
          client_address: string
          client_payment: number
          created_at: string | null
          description: string | null
          discounted_value: number
          document_hash: string | null
          id: string
          original_value: number
          status: number | null
          tokens_issued: number
          transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          agreement_id: string
          asset_id: string
          asset_type: string
          block_number?: number | null
          client_address: string
          client_payment: number
          created_at?: string | null
          description?: string | null
          discounted_value: number
          document_hash?: string | null
          id?: string
          original_value: number
          status?: number | null
          tokens_issued: number
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          agreement_id?: string
          asset_id?: string
          asset_type?: string
          block_number?: number | null
          client_address?: string
          client_payment?: number
          created_at?: string | null
          description?: string | null
          discounted_value?: number
          document_hash?: string | null
          id?: string
          original_value?: number
          status?: number | null
          tokens_issued?: number
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transaction_log: {
        Row: {
          block_number: number | null
          block_timestamp: string | null
          contract_address: string | null
          created_at: string | null
          error_message: string | null
          from_address: string | null
          gas_price: number | null
          gas_used: number | null
          id: string
          method_name: string | null
          parameters: Json | null
          status: string | null
          to_address: string | null
          transaction_hash: string
          transaction_type: string
        }
        Insert: {
          block_number?: number | null
          block_timestamp?: string | null
          contract_address?: string | null
          created_at?: string | null
          error_message?: string | null
          from_address?: string | null
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          method_name?: string | null
          parameters?: Json | null
          status?: string | null
          to_address?: string | null
          transaction_hash: string
          transaction_type: string
        }
        Update: {
          block_number?: number | null
          block_timestamp?: string | null
          contract_address?: string | null
          created_at?: string | null
          error_message?: string | null
          from_address?: string | null
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          method_name?: string | null
          parameters?: Json | null
          status?: string | null
          to_address?: string | null
          transaction_hash?: string
          transaction_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
