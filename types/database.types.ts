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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          order_id: string
          quantity: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bar_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "bar_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_orders: {
        Row: {
          created_at: string
          created_by: string | null
          discount_amount: number
          id: string
          kitchen_status: Database["public"]["Enums"]["app_kitchen_status"]
          member_id: string | null
          notes: string | null
          order_number: string
          order_status: Database["public"]["Enums"]["app_order_status"]
          subtotal: number
          tab_id: string | null
          table_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          kitchen_status?: Database["public"]["Enums"]["app_kitchen_status"]
          member_id?: string | null
          notes?: string | null
          order_number: string
          order_status?: Database["public"]["Enums"]["app_order_status"]
          subtotal?: number
          tab_id?: string | null
          table_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          kitchen_status?: Database["public"]["Enums"]["app_kitchen_status"]
          member_id?: string | null
          notes?: string | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["app_order_status"]
          subtotal?: number
          tab_id?: string | null
          table_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_orders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_orders_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "customer_tabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "bar_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          status: Database["public"]["Enums"]["app_table_status"]
          table_number: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["app_table_status"]
          table_number: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["app_table_status"]
          table_number?: string
        }
        Relationships: []
      }
      booking_participants: {
        Row: {
          booking_id: string
          created_at: string
          guest_name: string | null
          id: string
          member_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          guest_name?: string | null
          id?: string
          member_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          guest_name?: string | null
          id?: string
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "court_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      court_bookings: {
        Row: {
          base_price: number
          booking_type: Database["public"]["Enums"]["app_booking_type"]
          cancellation_reason: string | null
          cancelled_at: string | null
          court_id: string
          created_at: string
          created_by: string | null
          discount_amount: number
          end_time: string
          final_price: number
          id: string
          member_id: string | null
          notes: string | null
          start_time: string
          status: Database["public"]["Enums"]["app_booking_status"]
          updated_at: string
        }
        Insert: {
          base_price?: number
          booking_type?: Database["public"]["Enums"]["app_booking_type"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          court_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          end_time: string
          final_price?: number
          id?: string
          member_id?: string | null
          notes?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["app_booking_status"]
          updated_at?: string
        }
        Update: {
          base_price?: number
          booking_type?: Database["public"]["Enums"]["app_booking_type"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          court_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          end_time?: string
          final_price?: number
          id?: string
          member_id?: string | null
          notes?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["app_booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          is_active: boolean
          is_indoor: boolean
          name: string
          sport_type: Database["public"]["Enums"]["app_sport_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          hourly_rate: number
          id?: string
          is_active?: boolean
          is_indoor?: boolean
          name: string
          sport_type: Database["public"]["Enums"]["app_sport_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          is_indoor?: boolean
          name?: string
          sport_type?: Database["public"]["Enums"]["app_sport_type"]
          updated_at?: string
        }
        Relationships: []
      }
      customer_tabs: {
        Row: {
          closed_at: string | null
          credit_limit: number
          guest_name: string | null
          id: string
          member_id: string | null
          notes: string | null
          opened_at: string
          opened_by: string | null
          status: Database["public"]["Enums"]["app_tab_status"]
          tab_number: string | null
          table_id: string | null
        }
        Insert: {
          closed_at?: string | null
          credit_limit?: number
          guest_name?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          status?: Database["public"]["Enums"]["app_tab_status"]
          tab_number?: string | null
          table_id?: string | null
        }
        Update: {
          closed_at?: string | null
          credit_limit?: number
          guest_name?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          status?: Database["public"]["Enums"]["app_tab_status"]
          tab_number?: string | null
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_tabs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tabs_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tabs_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "bar_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          interested_plan_id: string | null
          interested_sport: Database["public"]["Enums"]["app_sport_type"] | null
          message: string | null
          phone: string
          requested_trial_date: string | null
          status: Database["public"]["Enums"]["app_enquiry_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          interested_plan_id?: string | null
          interested_sport?:
            | Database["public"]["Enums"]["app_sport_type"]
            | null
          message?: string | null
          phone: string
          requested_trial_date?: string | null
          status?: Database["public"]["Enums"]["app_enquiry_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          interested_plan_id?: string | null
          interested_sport?:
            | Database["public"]["Enums"]["app_sport_type"]
            | null
          message?: string | null
          phone?: string
          requested_trial_date?: string | null
          status?: Database["public"]["Enums"]["app_enquiry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_interested_plan_id_fkey"
            columns: ["interested_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          product_id: string
          quantity_on_hand: number
          updated_at: string
        }
        Insert: {
          product_id: string
          quantity_on_hand?: number
          updated_at?: string
        }
        Update: {
          product_id?: string
          quantity_on_hand?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          change_quantity: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          reference_id: string | null
          transaction_type: Database["public"]["Enums"]["app_inventory_transaction_type"]
        }
        Insert: {
          change_quantity: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          reference_id?: string | null
          transaction_type: Database["public"]["Enums"]["app_inventory_transaction_type"]
        }
        Update: {
          change_quantity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          reference_id?: string | null
          transaction_type?: Database["public"]["Enums"]["app_inventory_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          invoice_number: string
          member_id: string | null
          notes: string | null
          paid_amount: number
          recipient_email: string | null
          recipient_name: string
          recipient_type: Database["public"]["Enums"]["app_recipient_type"]
          status: Database["public"]["Enums"]["app_invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          invoice_number: string
          member_id?: string | null
          notes?: string | null
          paid_amount?: number
          recipient_email?: string | null
          recipient_name: string
          recipient_type?: Database["public"]["Enums"]["app_recipient_type"]
          status?: Database["public"]["Enums"]["app_invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          member_id?: string | null
          notes?: string | null
          paid_amount?: number
          recipient_email?: string | null
          recipient_name?: string
          recipient_type?: Database["public"]["Enums"]["app_recipient_type"]
          status?: Database["public"]["Enums"]["app_invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["app_leave_type"]
          reason: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["app_leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["app_leave_type"]
          reason: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["app_leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["app_leave_type"]
          reason?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["app_leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          current_plan_id: string | null
          emergency_contact: string | null
          end_date: string
          id: string
          membership_number: string
          notes: string | null
          profile_id: string
          start_date: string
          status: Database["public"]["Enums"]["app_membership_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_plan_id?: string | null
          emergency_contact?: string | null
          end_date: string
          id?: string
          membership_number: string
          notes?: string | null
          profile_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["app_membership_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_plan_id?: string | null
          emergency_contact?: string | null
          end_date?: string
          id?: string
          membership_number?: string
          notes?: string | null
          profile_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["app_membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_history: {
        Row: {
          changed_by: string | null
          created_at: string
          end_date: string
          id: string
          member_id: string
          notes: string | null
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["app_membership_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          member_id: string
          notes?: string | null
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["app_membership_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          member_id?: string
          notes?: string | null
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["app_membership_status"]
        }
        Relationships: [
          {
            foreignKeyName: "membership_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          bar_discount_percent: number
          court_discount_percent: number
          created_at: string
          description: string | null
          duration_days: number
          free_court_hours_per_day: number
          id: string
          is_active: boolean
          max_daily_bookings: number
          name: string
          price: number
          shop_discount_percent: number
          tier: Database["public"]["Enums"]["app_membership_tier"]
          updated_at: string
        }
        Insert: {
          bar_discount_percent?: number
          court_discount_percent?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          free_court_hours_per_day?: number
          id?: string
          is_active?: boolean
          max_daily_bookings?: number
          name: string
          price: number
          shop_discount_percent?: number
          tier: Database["public"]["Enums"]["app_membership_tier"]
          updated_at?: string
        }
        Update: {
          bar_discount_percent?: number
          court_discount_percent?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          free_court_hours_per_day?: number
          id?: string
          is_active?: boolean
          max_daily_bookings?: number
          name?: string
          price?: number
          shop_discount_percent?: number
          tier?: Database["public"]["Enums"]["app_membership_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          name: string
          price: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name: string
          price: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name?: string
          price?: number
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
      payments: {
        Row: {
          amount: number
          bar_order_id: string | null
          booking_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          member_id: string | null
          payment_method: Database["public"]["Enums"]["app_payment_method"]
          payment_number: string
          recorded_by: string | null
          shop_order_id: string | null
          status: Database["public"]["Enums"]["app_payment_status"]
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bar_order_id?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          member_id?: string | null
          payment_method: Database["public"]["Enums"]["app_payment_method"]
          payment_number: string
          recorded_by?: string | null
          shop_order_id?: string | null
          status?: Database["public"]["Enums"]["app_payment_status"]
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bar_order_id?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          member_id?: string | null
          payment_method?: Database["public"]["Enums"]["app_payment_method"]
          payment_number?: string
          recorded_by?: string | null
          shop_order_id?: string | null
          status?: Database["public"]["Enums"]["app_payment_status"]
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bar_order_id_fkey"
            columns: ["bar_order_id"]
            isOneToOne: false
            referencedRelation: "bar_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "court_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shop_order_id_fkey"
            columns: ["shop_order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number
          name: string
          price: number
          sku: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          price: number
          sku: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          enquiry_id: string | null
          id: string
          membership_plan_id: string | null
          quote_number: string
          quoted_amount: number
          recipient_email: string
          recipient_name: string
          status: Database["public"]["Enums"]["app_quote_status"]
          updated_at: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enquiry_id?: string | null
          id?: string
          membership_plan_id?: string | null
          quote_number: string
          quoted_amount: number
          recipient_email: string
          recipient_name: string
          status?: Database["public"]["Enums"]["app_quote_status"]
          updated_at?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enquiry_id?: string | null
          id?: string
          membership_plan_id?: string | null
          quote_number?: string
          quoted_amount?: number
          recipient_email?: string
          recipient_name?: string
          status?: Database["public"]["Enums"]["app_quote_status"]
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          discount_amount: number
          fulfillment_type: string
          id: string
          member_id: string | null
          notes: string | null
          order_channel: Database["public"]["Enums"]["app_order_channel"]
          order_number: string
          status: Database["public"]["Enums"]["app_order_status"]
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          discount_amount?: number
          fulfillment_type?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          order_channel?: Database["public"]["Enums"]["app_order_channel"]
          order_number: string
          status?: Database["public"]["Enums"]["app_order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          discount_amount?: number
          fulfillment_type?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          order_channel?: Database["public"]["Enums"]["app_order_channel"]
          order_number?: string
          status?: Database["public"]["Enums"]["app_order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["app_department"]
          employee_code: string
          hire_date: string
          hourly_rate: number
          id: string
          is_active: boolean
          position: string
          profile_id: string
          salary_monthly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: Database["public"]["Enums"]["app_department"]
          employee_code: string
          hire_date?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          position: string
          profile_id: string
          salary_monthly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["app_department"]
          employee_code?: string
          hire_date?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          position?: string
          profile_id?: string
          salary_monthly?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          notes: string | null
          shift_date: string
          staff_id: string
          start_time: string
          status: Database["public"]["Enums"]["app_shift_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          shift_date: string
          staff_id: string
          start_time: string
          status?: Database["public"]["Enums"]["app_shift_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          shift_date?: string
          staff_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["app_shift_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
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
      create_court_booking: {
        Args: {
          p_base_price: number
          p_booking_type: Database["public"]["Enums"]["app_booking_type"]
          p_court_id: string
          p_discount_amount: number
          p_end_time: string
          p_final_price: number
          p_member_id: string | null
          p_notes?: string | null
          p_start_time: string
        }
        Returns: string
      }
      adjust_inventory: {
        Args: {
          p_notes?: string | null
          p_product_id: string
          p_quantity_change: number
          p_reference_id?: string | null
          p_tx_type: Database["public"]["Enums"]["app_inventory_transaction_type"]
        }
        Returns: number
      }
      cancel_shop_order: {
        Args: {
          p_order_id: string
          p_reason?: string | null
        }
        Returns: undefined
      }
      close_customer_tab: {
        Args: {
          p_tab_id: string
        }
        Returns: number
      }
      deduct_inventory: {
        Args: {
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reference_id: string
          p_tx_type: Database["public"]["Enums"]["app_inventory_transaction_type"]
        }
        Returns: undefined
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "CANCELLED"
        | "COMPLETED"
        | "NO_SHOW"
      app_booking_type: "STANDARD" | "SOCIAL_PLAY" | "COACHING" | "MAINTENANCE"
      app_department:
        | "MANAGEMENT"
        | "FRONT_DESK"
        | "COURTS"
        | "SHOP"
        | "BAR"
        | "MAINTENANCE"
      app_enquiry_status:
        | "NEW"
        | "CONTACTED"
        | "TRIAL_SCHEDULED"
        | "QUOTE_SENT"
        | "CONVERTED"
        | "CLOSED"
      app_inventory_transaction_type:
        | "PURCHASE_RECEIPT"
        | "SALE_COUNTER"
        | "SALE_ONLINE"
        | "ADJUSTMENT"
        | "RETURN"
      app_invoice_status:
        | "DRAFT"
        | "ISSUED"
        | "PARTIALLY_PAID"
        | "PAID"
        | "OVERDUE"
        | "VOID"
      app_kitchen_status:
        | "PENDING"
        | "PREPARING"
        | "READY"
        | "SERVED"
        | "CANCELLED"
      app_leave_status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
      app_leave_type: "CASUAL" | "SICK" | "ANNUAL" | "UNPAID"
      app_membership_status:
        | "ACTIVE"
        | "EXPIRED"
        | "SUSPENDED"
        | "CANCELLED"
        | "PENDING"
      app_membership_tier: "GOLD" | "SILVER" | "JUNIOR"
      app_order_channel: "COUNTER" | "ONLINE"
      app_order_status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED"
      app_payment_method: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER"
      app_payment_status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
      app_quote_status: "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | "REJECTED"
      app_recipient_type: "MEMBER" | "BUSINESS_CLIENT" | "WALK_IN"
      app_role:
        | "OWNER"
        | "ADMIN"
        | "FRONT_DESK"
        | "SHOP_STAFF"
        | "BAR_STAFF"
        | "MEMBER"
      app_shift_status:
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "MISSED"
        | "CANCELLED"
      app_sport_type: "TENNIS" | "CRICKET"
      app_tab_status: "OPEN" | "CLOSED" | "VOID"
      app_table_status: "AVAILABLE" | "OCCUPIED" | "RESERVED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_booking_status: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "COMPLETED",
        "NO_SHOW",
      ],
      app_booking_type: ["STANDARD", "SOCIAL_PLAY", "COACHING", "MAINTENANCE"],
      app_department: [
        "MANAGEMENT",
        "FRONT_DESK",
        "COURTS",
        "SHOP",
        "BAR",
        "MAINTENANCE",
      ],
      app_enquiry_status: [
        "NEW",
        "CONTACTED",
        "TRIAL_SCHEDULED",
        "QUOTE_SENT",
        "CONVERTED",
        "CLOSED",
      ],
      app_inventory_transaction_type: [
        "PURCHASE_RECEIPT",
        "SALE_COUNTER",
        "SALE_ONLINE",
        "ADJUSTMENT",
        "RETURN",
      ],
      app_invoice_status: [
        "DRAFT",
        "ISSUED",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "VOID",
      ],
      app_kitchen_status: [
        "PENDING",
        "PREPARING",
        "READY",
        "SERVED",
        "CANCELLED",
      ],
      app_leave_status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      app_leave_type: ["CASUAL", "SICK", "ANNUAL", "UNPAID"],
      app_membership_status: [
        "ACTIVE",
        "EXPIRED",
        "SUSPENDED",
        "CANCELLED",
        "PENDING",
      ],
      app_membership_tier: ["GOLD", "SILVER", "JUNIOR"],
      app_order_channel: ["COUNTER", "ONLINE"],
      app_order_status: ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"],
      app_payment_method: ["CASH", "CARD", "UPI", "BANK_TRANSFER"],
      app_payment_status: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
      app_quote_status: ["DRAFT", "SENT", "ACCEPTED", "EXPIRED", "REJECTED"],
      app_recipient_type: ["MEMBER", "BUSINESS_CLIENT", "WALK_IN"],
      app_role: [
        "OWNER",
        "ADMIN",
        "FRONT_DESK",
        "SHOP_STAFF",
        "BAR_STAFF",
        "MEMBER",
      ],
      app_shift_status: [
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "MISSED",
        "CANCELLED",
      ],
      app_sport_type: ["TENNIS", "CRICKET"],
      app_tab_status: ["OPEN", "CLOSED", "VOID"],
      app_table_status: ["AVAILABLE", "OCCUPIED", "RESERVED"],
    },
  },
} as const
