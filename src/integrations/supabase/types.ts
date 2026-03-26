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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          tenant_id: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          tenant_id: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          tenant_id?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_menu_prices: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          is_available: boolean | null
          is_daily_special: boolean | null
          menu_item_id: string | null
          price_override: number | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_daily_special?: boolean | null
          menu_item_id?: string | null
          price_override?: number | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_daily_special?: boolean | null
          menu_item_id?: string | null
          price_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_menu_prices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_menu_prices_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          is_active: boolean
          name_en: string | null
          name_th: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th?: string
          sort_order?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_contacted: boolean | null
          message: string | null
          name: string
          phone: string | null
          restaurant_type: string | null
          source: string | null
          wants_trial: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_contacted?: boolean | null
          message?: string | null
          name: string
          phone?: string | null
          restaurant_type?: string | null
          source?: string | null
          wants_trial?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_contacted?: boolean | null
          message?: string | null
          name?: string
          phone?: string | null
          restaurant_type?: string | null
          source?: string | null
          wants_trial?: boolean | null
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          created_at: string | null
          id: string
          report_date: string
          top_items: Json | null
          total_covers: number | null
          total_orders: number | null
          total_revenue: number | null
          total_tips: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_date: string
          top_items?: Json | null
          total_covers?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          total_tips?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          report_date?: string
          top_items?: Json | null
          total_covers?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          total_tips?: number | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          branch_id: string | null
          cost_per_unit: number | null
          id: string
          low_stock_threshold: number | null
          name_en: string | null
          name_th: string
          stock_quantity: number | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          cost_per_unit?: number | null
          id?: string
          low_stock_threshold?: number | null
          name_en?: string | null
          name_th: string
          stock_quantity?: number | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          cost_per_unit?: number | null
          id?: string
          low_stock_threshold?: number | null
          name_en?: string | null
          name_th?: string
          stock_quantity?: number | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_devices: {
        Row: {
          branch_id: string | null
          created_at: string | null
          device_name: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          station_categories: Json | null
          tenant_id: string | null
          token: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          station_categories?: Json | null
          tenant_id?: string | null
          token?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          station_categories?: Json | null
          tenant_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          branch_id: string | null
          category_id: string | null
          cost: number
          created_at: string | null
          description_th: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_daily_special: boolean
          is_template: boolean | null
          name_en: string | null
          name_th: string
          prep_time_minutes: number
          price: number
          sort_order: number
        }
        Insert: {
          branch_id?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string | null
          description_th?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_daily_special?: boolean
          is_template?: boolean | null
          name_en?: string | null
          name_th: string
          prep_time_minutes?: number
          price?: number
          sort_order?: number
        }
        Update: {
          branch_id?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string | null
          description_th?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_daily_special?: boolean
          is_template?: boolean | null
          name_en?: string | null
          name_th?: string
          prep_time_minutes?: number
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          kitchen_done_at: string | null
          kitchen_received_at: string | null
          menu_item_id: string | null
          name_en: string | null
          name_th: string
          notes: string | null
          options: Json | null
          ordered_by: string
          ordered_by_guest: string | null
          price: number
          quantity: number
          session_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kitchen_done_at?: string | null
          kitchen_received_at?: string | null
          menu_item_id?: string | null
          name_en?: string | null
          name_th: string
          notes?: string | null
          options?: Json | null
          ordered_by?: string
          ordered_by_guest?: string | null
          price: number
          quantity?: number
          session_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kitchen_done_at?: string | null
          kitchen_received_at?: string | null
          menu_item_id?: string | null
          name_en?: string | null
          name_th?: string
          notes?: string | null
          options?: Json | null
          ordered_by?: string
          ordered_by_guest?: string | null
          price?: number
          quantity?: number
          session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          branch_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_name: string | null
          id: string
          method: string | null
          promptpay_ref: string | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          method?: string | null
          promptpay_ref?: string | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          method?: string | null
          promptpay_ref?: string | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          id: string
          ingredient_id: string | null
          menu_item_id: string | null
          quantity_per_serving: number
        }
        Insert: {
          id?: string
          ingredient_id?: string | null
          menu_item_id?: string | null
          quantity_per_serving: number
        }
        Update: {
          id?: string
          ingredient_id?: string | null
          menu_item_id?: string | null
          quantity_per_serving?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          branch_id: string | null
          closed_at: string | null
          created_at: string | null
          customer_name: string | null
          discount_amount: number
          id: string
          opened_at: string
          opened_by: string
          order_mode: string | null
          party_code: string | null
          party_countdown_ends_at: string | null
          party_link_active: boolean
          pax: number
          payment_method: string | null
          service_charge: number
          status: string
          subtotal: number
          table_id: string | null
          tax_amount: number
          tip_amount: number
          total_amount: number
        }
        Insert: {
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          discount_amount?: number
          id?: string
          opened_at?: string
          opened_by?: string
          order_mode?: string | null
          party_code?: string | null
          party_countdown_ends_at?: string | null
          party_link_active?: boolean
          pax?: number
          payment_method?: string | null
          service_charge?: number
          status?: string
          subtotal?: number
          table_id?: string | null
          tax_amount?: number
          tip_amount?: number
          total_amount?: number
        }
        Update: {
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          discount_amount?: number
          id?: string
          opened_at?: string
          opened_by?: string
          order_mode?: string | null
          party_code?: string | null
          party_countdown_ends_at?: string | null
          party_link_active?: boolean
          pax?: number
          payment_method?: string | null
          service_charge?: number
          status?: string
          subtotal?: number
          table_id?: string | null
          tax_amount?: number
          tip_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          is_active: boolean
          name_en: string | null
          name_th: string
          pin: string | null
          role: string
          tips_this_month: number | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th: string
          pin?: string | null
          role?: string
          tips_this_month?: number | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th?: string
          pin?: string | null
          role?: string
          tips_this_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_thb: number
          created_at: string | null
          ends_at: string | null
          id: string
          note: string | null
          paid_at: string | null
          payment_method: string | null
          plan: string
          starts_at: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          amount_thb?: number
          created_at?: string | null
          ends_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan: string
          starts_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount_thb?: number
          created_at?: string | null
          ends_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan?: string
          starts_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      table_qr_codes: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          qr_token: string
          table_id: string | null
          tenant_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_token?: string
          table_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_token?: string
          table_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_qr_codes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_qr_codes_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_qr_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          branch_id: string | null
          capacity: number
          created_at: string | null
          current_session_id: string | null
          id: string
          name: string | null
          number: number
          opened_at: string | null
          pax: number
          status: string
        }
        Insert: {
          branch_id?: string | null
          capacity?: number
          created_at?: string | null
          current_session_id?: string | null
          id?: string
          name?: string | null
          number: number
          opened_at?: string | null
          pax?: number
          status?: string
        }
        Update: {
          branch_id?: string | null
          capacity?: number
          created_at?: string | null
          current_session_id?: string | null
          id?: string
          name?: string | null
          number?: number
          opened_at?: string | null
          pax?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          role: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_email: string
          plan: string | null
          slug: string
          status: string | null
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_email: string
          plan?: string | null
          slug: string
          status?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_email?: string
          plan?: string | null
          slug?: string
          status?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          menu_item_id: string | null
          message: string | null
          paid_by_guest: string | null
          session_id: string | null
          staff_id: string | null
          tip_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          message?: string | null
          paid_by_guest?: string | null
          session_id?: string | null
          staff_id?: string | null
          tip_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          message?: string | null
          paid_by_guest?: string | null
          session_id?: string | null
          staff_id?: string | null
          tip_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_branch_id: { Args: never; Returns: string }
      get_my_tenant_id: { Args: never; Returns: string }
      is_tenant_owner_or_manager: { Args: never; Returns: boolean }
      is_tenant_super_admin: { Args: never; Returns: boolean }
      my_role: { Args: never; Returns: string }
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
