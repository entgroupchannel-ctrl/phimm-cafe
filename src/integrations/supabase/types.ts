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
      account_categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          type: string
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          type: string
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          type?: string
        }
        Relationships: []
      }
      accounting_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          date: string
          description: string | null
          id: string
          ref_order_id: string | null
          staff_id: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          ref_order_id?: string | null
          staff_id?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          ref_order_id?: string | null
          staff_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transactions_ref_order_id_fkey"
            columns: ["ref_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          allergens: string[] | null
          birthday: string | null
          created_at: string | null
          email: string | null
          id: string
          last_visit_at: string | null
          line_id: string | null
          name: string
          note: string | null
          phone: string | null
          points: number | null
          tier: string | null
          total_spent: number | null
          visit_count: number | null
        }
        Insert: {
          allergens?: string[] | null
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_visit_at?: string | null
          line_id?: string | null
          name: string
          note?: string | null
          phone?: string | null
          points?: number | null
          tier?: string | null
          total_spent?: number | null
          visit_count?: number | null
        }
        Update: {
          allergens?: string[] | null
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_visit_at?: string | null
          line_id?: string | null
          name?: string
          note?: string | null
          phone?: string | null
          points?: number | null
          tier?: string | null
          total_spent?: number | null
          visit_count?: number | null
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          card_amount: number | null
          cash_amount: number | null
          created_at: string | null
          date: string
          delivery_amount: number | null
          id: string
          net_profit: number | null
          promptpay_amount: number | null
          total_expense: number | null
          total_income: number | null
          total_orders: number | null
          vat_collected: number | null
        }
        Insert: {
          card_amount?: number | null
          cash_amount?: number | null
          created_at?: string | null
          date: string
          delivery_amount?: number | null
          id?: string
          net_profit?: number | null
          promptpay_amount?: number | null
          total_expense?: number | null
          total_income?: number | null
          total_orders?: number | null
          vat_collected?: number | null
        }
        Update: {
          card_amount?: number | null
          cash_amount?: number | null
          created_at?: string | null
          date?: string
          delivery_amount?: number | null
          id?: string
          net_profit?: number | null
          promptpay_amount?: number | null
          total_expense?: number | null
          total_income?: number | null
          total_orders?: number | null
          vat_collected?: number | null
        }
        Relationships: []
      }
      delivery_platforms: {
        Row: {
          api_key: string | null
          commission_pct: number | null
          config: Json | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          webhook_secret: string | null
        }
        Insert: {
          api_key?: string | null
          commission_pct?: number | null
          config?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string | null
          commission_pct?: number | null
          config?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          calories: number | null
          category_id: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          diet_tags: string[] | null
          emoji: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_popular: boolean | null
          name: string
          price: number
          sort_order: number | null
          station: string | null
          updated_at: string | null
        }
        Insert: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          diet_tags?: string[] | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          station?: string | null
          updated_at?: string | null
        }
        Update: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          diet_tags?: string[] | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          station?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_option_groups: {
        Row: {
          id: string
          menu_item_id: string | null
          name: string
          required: boolean | null
          sort_order: number | null
          type: string | null
        }
        Insert: {
          id?: string
          menu_item_id?: string | null
          name: string
          required?: boolean | null
          sort_order?: number | null
          type?: string | null
        }
        Update: {
          id?: string
          menu_item_id?: string | null
          name?: string
          required?: boolean | null
          sort_order?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_option_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_options: {
        Row: {
          id: string
          is_default: boolean | null
          name: string
          option_group_id: string
          price_add: number | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          is_default?: boolean | null
          name: string
          option_group_id: string
          price_add?: number | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          is_default?: boolean | null
          name?: string
          option_group_id?: string
          price_add?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "menu_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cooking_seconds: number | null
          cooking_started_at: string | null
          created_at: string | null
          handed_at: string | null
          handed_to: string | null
          id: string
          menu_item_id: string
          name: string
          note: string | null
          options: Json | null
          options_text: string | null
          order_id: string
          price: number
          price_add: number | null
          qty: number
          ready_at: string | null
          sent_at: string | null
          served_at: string | null
          station: string | null
          status: Database["public"]["Enums"]["order_item_status"] | null
        }
        Insert: {
          cooking_seconds?: number | null
          cooking_started_at?: string | null
          created_at?: string | null
          handed_at?: string | null
          handed_to?: string | null
          id?: string
          menu_item_id: string
          name: string
          note?: string | null
          options?: Json | null
          options_text?: string | null
          order_id: string
          price: number
          price_add?: number | null
          qty?: number
          ready_at?: string | null
          sent_at?: string | null
          served_at?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["order_item_status"] | null
        }
        Update: {
          cooking_seconds?: number | null
          cooking_started_at?: string | null
          created_at?: string | null
          handed_at?: string | null
          handed_to?: string | null
          id?: string
          menu_item_id?: string
          name?: string
          note?: string | null
          options?: Json | null
          options_text?: string | null
          order_id?: string
          price?: number
          price_add?: number | null
          qty?: number
          ready_at?: string | null
          sent_at?: string | null
          served_at?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["order_item_status"] | null
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
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          change_amount: number | null
          channel: Database["public"]["Enums"]["order_channel"] | null
          created_at: string | null
          customer_id: string | null
          delivery_platform_id: string | null
          discount_amount: number | null
          discount_note: string | null
          driver_name: string | null
          guest_count: number | null
          id: string
          note: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"] | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          service_charge: number | null
          staff_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          table_id: string | null
          total: number | null
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          change_amount?: number | null
          channel?: Database["public"]["Enums"]["order_channel"] | null
          created_at?: string | null
          customer_id?: string | null
          delivery_platform_id?: string | null
          discount_amount?: number | null
          discount_note?: string | null
          driver_name?: string | null
          guest_count?: number | null
          id?: string
          note?: string | null
          order_number: string
          order_type?: Database["public"]["Enums"]["order_type"] | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          service_charge?: number | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          change_amount?: number | null
          channel?: Database["public"]["Enums"]["order_channel"] | null
          created_at?: string | null
          customer_id?: string | null
          delivery_platform_id?: string | null
          discount_amount?: number | null
          discount_note?: string | null
          driver_name?: string | null
          guest_count?: number | null
          id?: string
          note?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"] | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          service_charge?: number | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          key: string
          label: string
        }
        Insert: {
          category: string
          key: string
          label: string
        }
        Update: {
          category?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          po_id: string
          qty: number
          stock_item_id: string
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          id?: string
          po_id: string
          qty: number
          stock_item_id: string
          total_cost?: number | null
          unit_cost: number
        }
        Update: {
          id?: string
          po_id?: string
          qty?: number
          stock_item_id?: string
          total_cost?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          ordered_at: string | null
          po_number: string
          received_at: string | null
          staff_id: string | null
          status: string | null
          supplier: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          ordered_at?: string | null
          po_number?: string
          received_at?: string | null
          staff_id?: string | null
          status?: string | null
          supplier?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          ordered_at?: string | null
          po_number?: string
          received_at?: string | null
          staff_id?: string | null
          status?: string | null
          supplier?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean | null
          permission_key: string
          role_id: string
        }
        Insert: {
          allowed?: boolean | null
          permission_key: string
          role_id: string
        }
        Update: {
          allowed?: boolean | null
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          label: string
          name: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          label: string
          name: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          label?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          address: string | null
          created_at: string | null
          currency: string | null
          id: string
          logo_url: string | null
          phone: string | null
          receipt_footer: string | null
          receipt_header: string | null
          service_charge_pct: number | null
          shop_name: string
          tax_id: string | null
          timezone: string | null
          updated_at: string | null
          vat_mode: string | null
          vat_rate: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          service_charge_pct?: number | null
          shop_name?: string
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_mode?: string | null
          vat_rate?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          service_charge_pct?: number | null
          shop_name?: string
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_mode?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          auth_uid: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          nickname: string | null
          phone: string | null
          pin: string | null
          role_id: string
          updated_at: string | null
        }
        Insert: {
          auth_uid?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          nickname?: string | null
          phone?: string | null
          pin?: string | null
          role_id: string
          updated_at?: string | null
        }
        Update: {
          auth_uid?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          nickname?: string | null
          phone?: string | null
          pin?: string | null
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_sessions: {
        Row: {
          clock_in: string
          clock_out: string | null
          id: string
          note: string | null
          staff_id: string
          total_hours: number | null
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          note?: string | null
          staff_id: string
          total_hours?: number | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          note?: string | null
          staff_id?: string
          total_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          cost_per_unit: number | null
          id: string
          is_active: boolean | null
          min_threshold: number | null
          name: string
          qty: number
          supplier: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          id?: string
          is_active?: boolean | null
          min_threshold?: number | null
          name: string
          qty?: number
          supplier?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          id?: string
          is_active?: boolean | null
          min_threshold?: number | null
          name?: string
          qty?: number
          supplier?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_logs: {
        Row: {
          change_qty: number
          created_at: string | null
          id: string
          reason: string
          ref_order_id: string | null
          staff_id: string | null
          stock_item_id: string
        }
        Insert: {
          change_qty: number
          created_at?: string | null
          id?: string
          reason: string
          ref_order_id?: string | null
          staff_id?: string | null
          stock_item_id: string
        }
        Update: {
          change_qty?: number
          created_at?: string | null
          id?: string
          reason?: string
          ref_order_id?: string | null
          staff_id?: string | null
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_logs_ref_order_id_fkey"
            columns: ["ref_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_recipes: {
        Row: {
          id: string
          menu_item_id: string
          qty_used: number
          stock_item_id: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          qty_used: number
          stock_item_id: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          qty_used?: number
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_recipes_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          current_order_id: string | null
          id: string
          is_active: boolean | null
          label: string
          position_x: number | null
          position_y: number | null
          seats: number | null
          sort_order: number | null
          status: string | null
          zone: string | null
        }
        Insert: {
          current_order_id?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          position_x?: number | null
          position_y?: number | null
          seats?: number | null
          sort_order?: number | null
          status?: string | null
          zone?: string | null
        }
        Update: {
          current_order_id?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          position_x?: number | null
          position_y?: number | null
          seats?: number | null
          sort_order?: number | null
          status?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_table_current_order"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cooking_performance: {
        Row: {
          avg_minutes: number | null
          avg_seconds: number | null
          max_seconds: number | null
          menu_item_id: string | null
          menu_name: string | null
          min_seconds: number | null
          station: string | null
          total_cooked: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_role_permissions: { Args: { p_role_id: string }; Returns: string[] }
      receive_purchase_order: { Args: { p_po_id: string }; Returns: undefined }
      verify_pin: {
        Args: { input_pin: string }
        Returns: {
          role_id: string
          role_label: string
          role_name: string
          staff_id: string
          staff_name: string
          staff_nickname: string
        }[]
      }
    }
    Enums: {
      order_channel:
        | "walk_in"
        | "kiosk"
        | "qr_order"
        | "line_man"
        | "grab"
        | "robinhood"
        | "shopee"
        | "phone"
      order_item_status:
        | "pending"
        | "sent"
        | "cooking"
        | "ready"
        | "served"
        | "cancelled"
      order_status:
        | "open"
        | "sent"
        | "cooking"
        | "ready"
        | "served"
        | "paid"
        | "cancelled"
      order_type: "dine_in" | "takeaway" | "delivery"
      payment_method:
        | "cash"
        | "promptpay"
        | "credit_card"
        | "delivery_platform"
        | "other"
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
      order_channel: [
        "walk_in",
        "kiosk",
        "qr_order",
        "line_man",
        "grab",
        "robinhood",
        "shopee",
        "phone",
      ],
      order_item_status: [
        "pending",
        "sent",
        "cooking",
        "ready",
        "served",
        "cancelled",
      ],
      order_status: [
        "open",
        "sent",
        "cooking",
        "ready",
        "served",
        "paid",
        "cancelled",
      ],
      order_type: ["dine_in", "takeaway", "delivery"],
      payment_method: [
        "cash",
        "promptpay",
        "credit_card",
        "delivery_platform",
        "other",
      ],
    },
  },
} as const
