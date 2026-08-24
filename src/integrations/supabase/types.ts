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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          address: string
          city: string
          created_at: string
          customer_id: string
          id: string
          is_emergency: boolean
          lat: number | null
          lng: number | null
          notes: string | null
          price: number
          scheduled_at: string
          service_id: string
          status: string
          worker_id: string
        }
        Insert: {
          address?: string
          city?: string
          created_at?: string
          customer_id: string
          id?: string
          is_emergency?: boolean
          lat?: number | null
          lng?: number | null
          notes?: string | null
          price?: number
          scheduled_at?: string
          service_id: string
          status?: string
          worker_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_emergency?: boolean
          lat?: number | null
          lng?: number | null
          notes?: string | null
          price?: number
          scheduled_at?: string
          service_id?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_history: {
        Row: {
          city: string
          day: string
          id: string
          requests: number
          service_id: string
        }
        Insert: {
          city?: string
          day: string
          id?: string
          requests?: number
          service_id: string
        }
        Update: {
          city?: string
          day?: string
          id?: string
          requests?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string
          id: string
          lat: number | null
          lng: number | null
          phone: string | null
          role: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          role?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          review: string | null
          stars: number
          worker_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          review?: string | null
          stars: number
          worker_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          review?: string | null
          stars?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          description: string
          icon: string
          id: string
          name: string
          slug: string
          unit: string
        }
        Insert: {
          base_price?: number
          description?: string
          icon?: string
          id?: string
          name: string
          slug: string
          unit?: string
        }
        Update: {
          base_price?: number
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          unit?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          availability: boolean
          city: string
          created_at: string
          experience_years: number
          hourly_rate: number
          id: string
          insurance_active: boolean
          jobs_done: number
          languages: string[]
          lat: number
          lng: number
          name: string
          photo_seed: string
          rating: number
          service_id: string
          society: string
          user_id: string | null
          verification_status: string
        }
        Insert: {
          availability?: boolean
          city?: string
          created_at?: string
          experience_years?: number
          hourly_rate?: number
          id?: string
          insurance_active?: boolean
          jobs_done?: number
          languages?: string[]
          lat?: number
          lng?: number
          name: string
          photo_seed?: string
          rating?: number
          service_id: string
          society?: string
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          availability?: boolean
          city?: string
          created_at?: string
          experience_years?: number
          hourly_rate?: number
          id?: string
          insurance_active?: boolean
          jobs_done?: number
          languages?: string[]
          lat?: number
          lng?: number
          name?: string
          photo_seed?: string
          rating?: number
          service_id?: string
          society?: string
          user_id?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
