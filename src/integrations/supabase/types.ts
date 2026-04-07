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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          message_type: string
          role: string
          session_code: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          message_type?: string
          role?: string
          session_code: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message_type?: string
          role?: string
          session_code?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          gift_type: string
          id: string
          message: string | null
          sender_name: string
          session_code: string
        }
        Insert: {
          created_at?: string
          gift_type?: string
          id?: string
          message?: string | null
          sender_name?: string
          session_code: string
        }
        Update: {
          created_at?: string
          gift_type?: string
          id?: string
          message?: string | null
          sender_name?: string
          session_code?: string
        }
        Relationships: []
      }
      kiosks: {
        Row: {
          allowed_payment_methods: Json
          camera_config: Json | null
          created_at: string
          dslr_settings: Json | null
          id: string
          kiosk_code: string
          last_ping: string | null
          location_name: string
          mac_address: string | null
          notes: string | null
          status: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          allowed_payment_methods?: Json
          camera_config?: Json | null
          created_at?: string
          dslr_settings?: Json | null
          id?: string
          kiosk_code: string
          last_ping?: string | null
          location_name: string
          mac_address?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          allowed_payment_methods?: Json
          camera_config?: Json | null
          created_at?: string
          dslr_settings?: Json | null
          id?: string
          kiosk_code?: string
          last_ping?: string | null
          location_name?: string
          mac_address?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_members: {
        Row: {
          created_at: string
          id: string
          phone: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          is_active: boolean
          name: string
          points_cost: number
          reward_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          name: string
          points_cost?: number
          reward_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          name?: string
          points_cost?: number
          reward_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          member_id: string
          points: number
          session_code: string | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          points: number
          session_code?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          points?: number
          session_code?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "loyalty_members"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_sessions: {
        Row: {
          ai_angles_urls: Json | null
          boomerang_url: string | null
          created_at: string
          filter_applied: string | null
          final_image_url: string | null
          gif_url: string | null
          id: string
          live_photo_url: string | null
          raw_image_urls: string[] | null
          short_code: string
          template_id: string | null
          transaction_id: string | null
          venue_id: string | null
        }
        Insert: {
          ai_angles_urls?: Json | null
          boomerang_url?: string | null
          created_at?: string
          filter_applied?: string | null
          final_image_url?: string | null
          gif_url?: string | null
          id?: string
          live_photo_url?: string | null
          raw_image_urls?: string[] | null
          short_code: string
          template_id?: string | null
          transaction_id?: string | null
          venue_id?: string | null
        }
        Update: {
          ai_angles_urls?: Json | null
          boomerang_url?: string | null
          created_at?: string
          filter_applied?: string | null
          final_image_url?: string | null
          gif_url?: string | null
          id?: string
          live_photo_url?: string | null
          raw_image_urls?: string[] | null
          short_code?: string
          template_id?: string | null
          transaction_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_sessions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_packages: {
        Row: {
          created_at: string
          grid_type: string
          id: string
          is_active: boolean
          name: string
          num_photos: number
          price: number
        }
        Insert: {
          created_at?: string
          grid_type: string
          id?: string
          is_active?: boolean
          name: string
          num_photos?: number
          price: number
        }
        Update: {
          created_at?: string
          grid_type?: string
          id?: string
          is_active?: boolean
          name?: string
          num_photos?: number
          price?: number
        }
        Relationships: []
      }
      promo_materials: {
        Row: {
          created_at: string
          display_mode: string
          duration_seconds: number
          id: string
          is_active: boolean
          kiosk_id: string | null
          media_type: string
          media_url: string
          schedule_end: string | null
          schedule_start: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_mode?: string
          duration_seconds?: number
          id?: string
          is_active?: boolean
          kiosk_id?: string | null
          media_type?: string
          media_url: string
          schedule_end?: string | null
          schedule_start?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_mode?: string
          duration_seconds?: number
          id?: string
          is_active?: boolean
          kiosk_id?: string | null
          media_type?: string
          media_url?: string
          schedule_end?: string | null
          schedule_start?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_materials_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_splits: {
        Row: {
          cooperation_type: string
          created_at: string
          id: string
          notes: string | null
          percentage: number
          ppn_mode: string
          role_name: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          cooperation_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          percentage?: number
          ppn_mode?: string
          role_name: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          cooperation_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          percentage?: number
          ppn_mode?: string
          role_name?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          asset_url: string | null
          canvas_height: number
          canvas_width: number
          created_at: string
          description: string | null
          event_name: string | null
          grid_cols: number
          grid_type: string
          id: string
          is_active: boolean
          name: string
          num_photos: number
          orientation: string
          price: number
          slot_config: Json | null
          updated_at: string
        }
        Insert: {
          asset_url?: string | null
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          description?: string | null
          event_name?: string | null
          grid_cols?: number
          grid_type: string
          id?: string
          is_active?: boolean
          name: string
          num_photos?: number
          orientation?: string
          price?: number
          slot_config?: Json | null
          updated_at?: string
        }
        Update: {
          asset_url?: string | null
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          description?: string | null
          event_name?: string | null
          grid_cols?: number
          grid_type?: string
          id?: string
          is_active?: boolean
          name?: string
          num_photos?: number
          orientation?: string
          price?: number
          slot_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kiosk_id: string | null
          package_id: string | null
          payment_method: string
          payment_status: string
          qris_invoice_id: string | null
          qris_reference_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kiosk_id?: string | null
          package_id?: string | null
          payment_method?: string
          payment_status?: string
          qris_invoice_id?: string | null
          qris_reference_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kiosk_id?: string | null
          package_id?: string | null
          payment_method?: string
          payment_status?: string
          qris_invoice_id?: string | null
          qris_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "pricing_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          venue_id: string | null
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          venue_id?: string | null
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_venue_access: {
        Args: { _user_id: string; _venue_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "venue" | "partner" | "superadmin"
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
      app_role: ["admin", "operator", "venue", "partner", "superadmin"],
    },
  },
} as const
