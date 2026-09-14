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
      crop_scan_images: {
        Row: {
          bytes: number | null
          created_at: string
          height: number | null
          id: string
          media_kind: string
          plant_part: string
          scan_id: string
          sort_order: number
          storage_path: string
          user_id: string
          width: number | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          height?: number | null
          id?: string
          media_kind?: string
          plant_part?: string
          scan_id: string
          sort_order?: number
          storage_path: string
          user_id: string
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          height?: number | null
          id?: string
          media_kind?: string
          plant_part?: string
          scan_id?: string
          sort_order?: number
          storage_path?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_scan_images_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "crop_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_scan_questions: {
        Row: {
          answer: string | null
          category: string | null
          created_at: string
          help_text: string | null
          id: string
          input_type: string
          options: Json
          question: string
          scan_id: string
          sort_order: number
          targets: Json
          user_id: string
        }
        Insert: {
          answer?: string | null
          category?: string | null
          created_at?: string
          help_text?: string | null
          id?: string
          input_type?: string
          options?: Json
          question: string
          scan_id: string
          sort_order?: number
          targets?: Json
          user_id: string
        }
        Update: {
          answer?: string | null
          category?: string | null
          created_at?: string
          help_text?: string | null
          id?: string
          input_type?: string
          options?: Json
          question?: string
          scan_id?: string
          sort_order?: number
          targets?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_scan_questions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "crop_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_scans: {
        Row: {
          alerts: Json
          candidates: Json
          citations: Json
          confidence: number | null
          created_at: string
          crop_name: string | null
          diagnosis: Json | null
          differential: Json
          disease_type: string | null
          evidence: Json
          farm_id: string
          farm_snapshot: Json
          health_score: Json
          id: string
          image_analysis: Json
          missing_evidence: Json
          parent_scan_id: string | null
          plant_parts: string[]
          progression: Json
          reasoning: string | null
          recovery: Json
          severity: string | null
          status: string
          treatment_plan: Json
          treatment_status: string
          updated_at: string
          user_id: string
          weather_risk: Json
          weather_snapshot: Json
        }
        Insert: {
          alerts?: Json
          candidates?: Json
          citations?: Json
          confidence?: number | null
          created_at?: string
          crop_name?: string | null
          diagnosis?: Json | null
          differential?: Json
          disease_type?: string | null
          evidence?: Json
          farm_id: string
          farm_snapshot?: Json
          health_score?: Json
          id?: string
          image_analysis?: Json
          missing_evidence?: Json
          parent_scan_id?: string | null
          plant_parts?: string[]
          progression?: Json
          reasoning?: string | null
          recovery?: Json
          severity?: string | null
          status?: string
          treatment_plan?: Json
          treatment_status?: string
          updated_at?: string
          user_id: string
          weather_risk?: Json
          weather_snapshot?: Json
        }
        Update: {
          alerts?: Json
          candidates?: Json
          citations?: Json
          confidence?: number | null
          created_at?: string
          crop_name?: string | null
          diagnosis?: Json | null
          differential?: Json
          disease_type?: string | null
          evidence?: Json
          farm_id?: string
          farm_snapshot?: Json
          health_score?: Json
          id?: string
          image_analysis?: Json
          missing_evidence?: Json
          parent_scan_id?: string | null
          plant_parts?: string[]
          progression?: Json
          reasoning?: string | null
          recovery?: Json
          severity?: string | null
          status?: string
          treatment_plan?: Json
          treatment_status?: string
          updated_at?: string
          user_id?: string
          weather_risk?: Json
          weather_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crop_scans_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_scans_parent_scan_id_fkey"
            columns: ["parent_scan_id"]
            isOneToOne: false
            referencedRelation: "crop_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_case_images: {
        Row: {
          case_id: string
          created_at: string
          id: string
          image_order: number
          image_type: string
          quality_score: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          image_order?: number
          image_type?: string
          quality_score?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          image_order?: number
          image_type?: string
          quality_score?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_case_images_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "disease_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_case_outcomes: {
        Row: {
          case_id: string
          created_at: string
          days_after_treatment: number | null
          farmer_confirmed_disease: string | null
          farmer_notes: string | null
          followup_images: Json
          id: string
          outcome: string
          severity_after: string | null
          treatment_details: string | null
          treatment_followed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          days_after_treatment?: number | null
          farmer_confirmed_disease?: string | null
          farmer_notes?: string | null
          followup_images?: Json
          id?: string
          outcome?: string
          severity_after?: string | null
          treatment_details?: string | null
          treatment_followed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          days_after_treatment?: number | null
          farmer_confirmed_disease?: string | null
          farmer_notes?: string | null
          followup_images?: Json
          id?: string
          outcome?: string
          severity_after?: string | null
          treatment_details?: string | null
          treatment_followed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_case_outcomes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "disease_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_cases: {
        Row: {
          affected_part: string | null
          ai_diagnosis: Json
          case_status: string
          confidence_after_answers: number | null
          confidence_after_history: number | null
          confidence_final: number | null
          confidence_initial: number | null
          created_at: string
          crop_name: string
          crop_stage: string | null
          crop_variety: string | null
          days_after_sowing: number | null
          days_after_transplant: number | null
          diagnostic_schema_version: string | null
          farm_id: string | null
          followup_answers: Json
          followup_questions: Json
          id: string
          image_count: number
          irrigation_context: Json
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          model_name: string | null
          model_version: string | null
          promoted_at: string | null
          prompt_version: string | null
          recommended_treatment: Json
          scan_id: string | null
          soil_context: Json
          symptoms: string[]
          updated_at: string
          user_id: string
          validation_status: string
          weather_context: Json
        }
        Insert: {
          affected_part?: string | null
          ai_diagnosis?: Json
          case_status?: string
          confidence_after_answers?: number | null
          confidence_after_history?: number | null
          confidence_final?: number | null
          confidence_initial?: number | null
          created_at?: string
          crop_name?: string
          crop_stage?: string | null
          crop_variety?: string | null
          days_after_sowing?: number | null
          days_after_transplant?: number | null
          diagnostic_schema_version?: string | null
          farm_id?: string | null
          followup_answers?: Json
          followup_questions?: Json
          id?: string
          image_count?: number
          irrigation_context?: Json
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          model_name?: string | null
          model_version?: string | null
          promoted_at?: string | null
          prompt_version?: string | null
          recommended_treatment?: Json
          scan_id?: string | null
          soil_context?: Json
          symptoms?: string[]
          updated_at?: string
          user_id: string
          validation_status?: string
          weather_context?: Json
        }
        Update: {
          affected_part?: string | null
          ai_diagnosis?: Json
          case_status?: string
          confidence_after_answers?: number | null
          confidence_after_history?: number | null
          confidence_final?: number | null
          confidence_initial?: number | null
          created_at?: string
          crop_name?: string
          crop_stage?: string | null
          crop_variety?: string | null
          days_after_sowing?: number | null
          days_after_transplant?: number | null
          diagnostic_schema_version?: string | null
          farm_id?: string | null
          followup_answers?: Json
          followup_questions?: Json
          id?: string
          image_count?: number
          irrigation_context?: Json
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          model_name?: string | null
          model_version?: string | null
          promoted_at?: string | null
          prompt_version?: string | null
          recommended_treatment?: Json
          scan_id?: string | null
          soil_context?: Json
          symptoms?: string[]
          updated_at?: string
          user_id?: string
          validation_status?: string
          weather_context?: Json
        }
        Relationships: [
          {
            foreignKeyName: "disease_cases_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disease_cases_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: true
            referencedRelation: "crop_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_feedback: {
        Row: {
          case_id: string
          created_at: string
          diagnosis_rating: string
          farmer_notes: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          diagnosis_rating: string
          farmer_notes?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          diagnosis_rating?: string
          farmer_notes?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_feedback_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "disease_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_knowledge: {
        Row: {
          affected_parts: string[]
          confidence_score: number
          created_at: string
          crop_name: string
          crop_stage: string | null
          diagnostic_evidence: string
          disease_name: string
          embedding: string | null
          evidence_count: number
          id: string
          indexing_status: string
          knowledge_text: string
          knowledge_version: number
          last_validated_at: string | null
          model_version: string | null
          prevention_guidance: string
          regional_context: Json
          soil_conditions: Json
          source_case_count: number
          source_case_id: string | null
          symptoms: string[]
          treatment_guidance: string
          treatment_success_rate: number | null
          updated_at: string
          validation_status: string
          visual_features: string[]
          weather_conditions: Json
        }
        Insert: {
          affected_parts?: string[]
          confidence_score?: number
          created_at?: string
          crop_name: string
          crop_stage?: string | null
          diagnostic_evidence?: string
          disease_name: string
          embedding?: string | null
          evidence_count?: number
          id?: string
          indexing_status?: string
          knowledge_text: string
          knowledge_version?: number
          last_validated_at?: string | null
          model_version?: string | null
          prevention_guidance?: string
          regional_context?: Json
          soil_conditions?: Json
          source_case_count?: number
          source_case_id?: string | null
          symptoms?: string[]
          treatment_guidance?: string
          treatment_success_rate?: number | null
          updated_at?: string
          validation_status?: string
          visual_features?: string[]
          weather_conditions?: Json
        }
        Update: {
          affected_parts?: string[]
          confidence_score?: number
          created_at?: string
          crop_name?: string
          crop_stage?: string | null
          diagnostic_evidence?: string
          disease_name?: string
          embedding?: string | null
          evidence_count?: number
          id?: string
          indexing_status?: string
          knowledge_text?: string
          knowledge_version?: number
          last_validated_at?: string | null
          model_version?: string | null
          prevention_guidance?: string
          regional_context?: Json
          soil_conditions?: Json
          source_case_count?: number
          source_case_id?: string | null
          symptoms?: string[]
          treatment_guidance?: string
          treatment_success_rate?: number | null
          updated_at?: string
          validation_status?: string
          visual_features?: string[]
          weather_conditions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "disease_knowledge_source_case_id_fkey"
            columns: ["source_case_id"]
            isOneToOne: false
            referencedRelation: "disease_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_knowledge_sources: {
        Row: {
          case_id: string
          created_at: string
          id: string
          knowledge_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          knowledge_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          knowledge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_knowledge_sources_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "disease_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disease_knowledge_sources_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "disease_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_review: {
        Row: {
          case_id: string
          corrected_disease: string | null
          created_at: string
          decision: string
          id: string
          reviewer_id: string
          reviewer_notes: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          corrected_disease?: string | null
          created_at?: string
          decision: string
          id?: string
          reviewer_id: string
          reviewer_notes?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          corrected_disease?: string | null
          created_at?: string
          decision?: string
          id?: string
          reviewer_id?: string
          reviewer_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_review_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "disease_cases"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_reviewer: { Args: { _user_id: string }; Returns: boolean }
      match_disease_knowledge: {
        Args: {
          crop_filter?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          affected_parts: string[]
          confidence_score: number
          crop_name: string
          crop_stage: string
          disease_name: string
          id: string
          knowledge_text: string
          similarity: number
          source_case_count: number
          symptoms: string[]
          treatment_success_rate: number
          validation_status: string
        }[]
      }
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
      app_role: "admin" | "reviewer" | "user"
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
      app_role: ["admin", "reviewer", "user"],
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
