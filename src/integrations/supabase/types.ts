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
      calendar_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          crop_name: string
          day_offset: number
          estimated_duration_days: number | null
          farm_id: string
          fertilizer_category: string | null
          id: string
          metadata: Json
          notes: string | null
          priority: string
          source: string
          stage: string
          stage_id: string | null
          status: string
          task_date: string
          task_name: string
          task_type: string
          template_hash: string
          updated_at: string
          user_id: string
          water_requirement: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          crop_name: string
          day_offset?: number
          estimated_duration_days?: number | null
          farm_id: string
          fertilizer_category?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          priority?: string
          source?: string
          stage: string
          stage_id?: string | null
          status?: string
          task_date: string
          task_name: string
          task_type: string
          template_hash: string
          updated_at?: string
          user_id: string
          water_requirement?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          crop_name?: string
          day_offset?: number
          estimated_duration_days?: number | null
          farm_id?: string
          fertilizer_category?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          priority?: string
          source?: string
          stage?: string
          stage_id?: string | null
          status?: string
          task_date?: string
          task_name?: string
          task_type?: string
          template_hash?: string
          updated_at?: string
          user_id?: string
          water_requirement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tasks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_images: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          image_type: string
          image_url: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          image_type?: string
          image_url: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          image_type?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_images_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_water_sources: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          water_source: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          water_source: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          water_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_water_sources_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          address: string | null
          area_unit: string
          country: string | null
          created_at: string
          current_crop: string | null
          deleted_at: string | null
          description: string | null
          district: string
          farm_name: string
          farm_type: string | null
          formatted_address: string | null
          google_place_id: string | null
          id: string
          irrigation_method: string | null
          latitude: number | null
          longitude: number | null
          map_zoom: number | null
          notes: string | null
          pincode: string | null
          soil_type: string | null
          sowing_date: string | null
          state: string
          total_area: number
          updated_at: string
          user_id: string
          village: string
        }
        Insert: {
          address?: string | null
          area_unit?: string
          country?: string | null
          created_at?: string
          current_crop?: string | null
          deleted_at?: string | null
          description?: string | null
          district: string
          farm_name: string
          farm_type?: string | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          irrigation_method?: string | null
          latitude?: number | null
          longitude?: number | null
          map_zoom?: number | null
          notes?: string | null
          pincode?: string | null
          soil_type?: string | null
          sowing_date?: string | null
          state: string
          total_area: number
          updated_at?: string
          user_id: string
          village: string
        }
        Update: {
          address?: string | null
          area_unit?: string
          country?: string | null
          created_at?: string
          current_crop?: string | null
          deleted_at?: string | null
          description?: string | null
          district?: string
          farm_name?: string
          farm_type?: string | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          irrigation_method?: string | null
          latitude?: number | null
          longitude?: number | null
          map_zoom?: number | null
          notes?: string | null
          pincode?: string | null
          soil_type?: string | null
          sowing_date?: string | null
          state?: string
          total_area?: number
          updated_at?: string
          user_id?: string
          village?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          char_count: number
          chunk_hash: string
          chunk_number: number
          chunk_text: string
          created_at: string
          deleted_at: string | null
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          page_number: number | null
          token_count: number
          user_id: string
        }
        Insert: {
          char_count?: number
          chunk_hash: string
          chunk_number: number
          chunk_text: string
          created_at?: string
          deleted_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
          token_count?: number
          user_id: string
        }
        Update: {
          char_count?: number
          chunk_hash?: string
          chunk_number?: number
          chunk_text?: string
          created_at?: string
          deleted_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
          token_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          created_at: string
          error_message: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          is_latest: boolean
          metadata: Json
          parent_document_id: string | null
          processing_status: Database["public"]["Enums"]["knowledge_processing_status"]
          storage_path: string
          total_characters: number
          total_chunks: number
          total_tokens: number
          updated_at: string
          upload_date: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          is_latest?: boolean
          metadata?: Json
          parent_document_id?: string | null
          processing_status?: Database["public"]["Enums"]["knowledge_processing_status"]
          storage_path: string
          total_characters?: number
          total_chunks?: number
          total_tokens?: number
          updated_at?: string
          upload_date?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          is_latest?: boolean
          metadata?: Json
          parent_document_id?: string | null
          processing_status?: Database["public"]["Enums"]["knowledge_processing_status"]
          storage_path?: string
          total_characters?: number
          total_chunks?: number
          total_tokens?: number
          updated_at?: string
          upload_date?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_new_user: boolean | null
          language: string | null
          location: string | null
          phone: string | null
          provider: string | null
          subscription_plan: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_new_user?: boolean | null
          language?: string | null
          location?: string | null
          phone?: string | null
          provider?: string | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_new_user?: boolean | null
          language?: string | null
          location?: string | null
          phone?: string | null
          provider?: string | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      retrieval_cache: {
        Row: {
          created_at: string
          embedding: string | null
          hit_count: number
          id: string
          query_hash: string
          query_text: string
          top_chunk_ids: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          hit_count?: number
          id?: string
          query_hash: string
          query_text: string
          top_chunk_ids?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          hit_count?: number
          id?: string
          query_hash?: string
          query_text?: string
          top_chunk_ids?: string[]
          user_id?: string
        }
        Relationships: []
      }
      voice_settings: {
        Row: {
          auto_play: boolean
          created_at: string
          enabled: boolean
          preferred_language: string
          speech_pitch: number
          speech_rate: number
          updated_at: string
          user_id: string
          voice_name: string | null
        }
        Insert: {
          auto_play?: boolean
          created_at?: string
          enabled?: boolean
          preferred_language?: string
          speech_pitch?: number
          speech_rate?: number
          updated_at?: string
          user_id: string
          voice_name?: string | null
        }
        Update: {
          auto_play?: boolean
          created_at?: string
          enabled?: boolean
          preferred_language?: string
          speech_pitch?: number
          speech_rate?: number
          updated_at?: string
          user_id?: string
          voice_name?: string | null
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          alerts: Json
          created_at: string
          current: Json
          daily: Json
          expires_at: string
          farm_id: string
          fetched_at: string
          hourly: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts?: Json
          created_at?: string
          current: Json
          daily?: Json
          expires_at: string
          farm_id: string
          fetched_at?: string
          hourly?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts?: Json
          created_at?: string
          current?: Json
          daily?: Json
          expires_at?: string
          farm_id?: string
          fetched_at?: string
          hourly?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_cache_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_knowledge_chunks: {
        Args: {
          match_count?: number
          metadata_filter?: Json
          query_embedding: string
          user_uuid: string
        }
        Returns: {
          chunk_number: number
          chunk_text: string
          document_id: string
          document_metadata: Json
          filename: string
          id: string
          metadata: Json
          page_number: number
          similarity: number
        }[]
      }
    }
    Enums: {
      knowledge_processing_status:
        | "uploading"
        | "queued"
        | "virus_check"
        | "extracting"
        | "normalizing"
        | "extracting_metadata"
        | "chunking"
        | "deduplicating"
        | "embedding"
        | "indexing"
        | "verifying"
        | "completed"
        | "failed"
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
      knowledge_processing_status: [
        "uploading",
        "queued",
        "virus_check",
        "extracting",
        "normalizing",
        "extracting_metadata",
        "chunking",
        "deduplicating",
        "embedding",
        "indexing",
        "verifying",
        "completed",
        "failed",
      ],
    },
  },
} as const
