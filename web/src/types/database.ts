export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "online_assessment"
  | "interview"
  | "final_round"
  | "offer"
  | "rejected"
  | "withdrawn";

export type ProfileExperienceKind = "work" | "volunteer";

export type AssistantMessageRole = "user" | "assistant" | "tool";

export type AssistantActionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "declined";

export type DocumentContentFormat = "plain_text" | "markdown" | "latex";

export type ResumeEditorMode = "legacy" | "structured";

type ProvenanceRow = {
  source_kind: "manual" | "resume_import" | "migration";
  verification_status: "unverified" | "user_confirmed" | "source_verified";
  confidence: number | null;
  is_locked: boolean;
};

type ProvenanceInsert = Partial<ProvenanceRow>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          headline: string | null;
          phone: string | null;
          location: string | null;
          summary: string | null;
          additional_info: string | null;
          career_stage: string | null;
          onboarding_status: "not_started" | "in_progress" | "deferred" | "completed";
          onboarding_step: number;
          onboarding_deferred_at: string | null;
          onboarding_completed_at: string | null;
          ai_processing_consent_at: string | null;
          profile_revision: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          headline?: string | null;
          phone?: string | null;
          location?: string | null;
          summary?: string | null;
          additional_info?: string | null;
          career_stage?: string | null;
          onboarding_status?: "not_started" | "in_progress" | "deferred" | "completed";
          onboarding_step?: number;
          onboarding_deferred_at?: string | null;
          onboarding_completed_at?: string | null;
          ai_processing_consent_at?: string | null;
          profile_revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          headline?: string | null;
          phone?: string | null;
          location?: string | null;
          summary?: string | null;
          additional_info?: string | null;
          career_stage?: string | null;
          onboarding_status?: "not_started" | "in_progress" | "deferred" | "completed";
          onboarding_step?: number;
          onboarding_deferred_at?: string | null;
          onboarding_completed_at?: string | null;
          ai_processing_consent_at?: string | null;
          profile_revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_links: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          url: string;
          kind: "linkedin" | "github" | "portfolio" | "website" | "other";
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          url?: string;
          kind?: "linkedin" | "github" | "portfolio" | "website" | "other";
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          url?: string;
          kind?: "linkedin" | "github" | "portfolio" | "website" | "other";
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_experiences: {
        Row: ProvenanceRow & {
          id: string;
          user_id: string;
          kind: ProfileExperienceKind;
          job_title: string;
          company: string;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
          responsibilities: string | null;
          original_text: string | null;
          approved_text: string | null;
          technologies: string[];
          demonstrated_skills: string[];
          metrics: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: ProvenanceInsert & {
          id?: string;
          user_id: string;
          kind?: ProfileExperienceKind;
          job_title?: string;
          company?: string;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          responsibilities?: string | null;
          original_text?: string | null;
          approved_text?: string | null;
          technologies?: string[];
          demonstrated_skills?: string[];
          metrics?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: ProvenanceInsert & {
          id?: string;
          user_id?: string;
          kind?: ProfileExperienceKind;
          job_title?: string;
          company?: string;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          responsibilities?: string | null;
          original_text?: string | null;
          approved_text?: string | null;
          technologies?: string[];
          demonstrated_skills?: string[];
          metrics?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_education: {
        Row: {
          id: string;
          user_id: string;
          school: string;
          degree: string | null;
          field: string | null;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
          details: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          school?: string;
          degree?: string | null;
          field?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          details?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          school?: string;
          degree?: string | null;
          field?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          details?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_projects: {
        Row: ProvenanceRow & {
          id: string;
          user_id: string;
          title: string;
          date: string | null;
          url: string | null;
          description: string | null;
          tech_stack: string | null;
          original_text: string | null;
          approved_text: string | null;
          technologies: string[];
          demonstrated_skills: string[];
          metrics: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: ProvenanceInsert & {
          id?: string;
          user_id: string;
          title?: string;
          date?: string | null;
          url?: string | null;
          description?: string | null;
          tech_stack?: string | null;
          original_text?: string | null;
          approved_text?: string | null;
          technologies?: string[];
          demonstrated_skills?: string[];
          metrics?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: ProvenanceInsert & {
          id?: string;
          user_id?: string;
          title?: string;
          date?: string | null;
          url?: string | null;
          description?: string | null;
          tech_stack?: string | null;
          original_text?: string | null;
          approved_text?: string | null;
          technologies?: string[];
          demonstrated_skills?: string[];
          metrics?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_skills: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_achievements: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          date: string | null;
          kind: "achievement" | "award";
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          description?: string | null;
          date?: string | null;
          kind?: "achievement" | "award";
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          date?: string | null;
          kind?: "achievement" | "award";
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      career_preferences: {
        Row: {
          user_id: string;
          target_roles: string[];
          preferred_locations: string[];
          work_arrangements: string[];
          salary_min: number | null;
          salary_currency: string | null;
          work_authorization_status: string | null;
          requires_sponsorship: boolean | null;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          target_roles?: string[];
          preferred_locations?: string[];
          work_arrangements?: string[];
          salary_min?: number | null;
          salary_currency?: string | null;
          work_authorization_status?: string | null;
          requires_sponsorship?: boolean | null;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["career_preferences"]["Insert"]>;
        Relationships: [];
      };
      profile_certifications: {
        Row: ProvenanceRow & {
          id: string; user_id: string; name: string; issuer: string | null;
          issued_on: string | null; expires_on: string | null; credential_id: string | null;
          credential_url: string | null; position: number; created_at: string; updated_at: string;
        };
        Insert: ProvenanceInsert & {
          id?: string; user_id: string; name: string; issuer?: string | null;
          issued_on?: string | null; expires_on?: string | null; credential_id?: string | null;
          credential_url?: string | null; position?: number; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_certifications"]["Insert"]>;
        Relationships: [];
      };
      profile_publications: {
        Row: ProvenanceRow & {
          id: string; user_id: string; title: string; publisher: string | null;
          published_on: string | null; url: string | null; description: string | null;
          position: number; created_at: string; updated_at: string;
        };
        Insert: ProvenanceInsert & {
          id?: string; user_id: string; title: string; publisher?: string | null;
          published_on?: string | null; url?: string | null; description?: string | null;
          position?: number; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_publications"]["Insert"]>;
        Relationships: [];
      };
      profile_languages: {
        Row: { id: string; user_id: string; name: string; proficiency: string | null; position: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; proficiency?: string | null; position?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["profile_languages"]["Insert"]>;
        Relationships: [];
      };
      profile_bullets: {
        Row: ProvenanceRow & {
          id: string; user_id: string; experience_id: string | null; project_id: string | null;
          original_text: string; approved_text: string; technologies: string[];
          demonstrated_skills: string[]; metrics: Json; position: number;
          created_at: string; updated_at: string;
        };
        Insert: ProvenanceInsert & {
          id?: string; user_id: string; experience_id?: string | null; project_id?: string | null;
          original_text: string; approved_text: string; technologies?: string[];
          demonstrated_skills?: string[]; metrics?: Json; position?: number;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_bullets"]["Insert"]>;
        Relationships: [];
      };
      career_profile_revisions: {
        Row: { id: string; user_id: string; revision: number; snapshot: Json; reason: string; created_at: string };
        Insert: { id?: string; user_id: string; revision: number; snapshot: Json; reason?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      resume_imports: {
        Row: {
          id: string; user_id: string; source_kind: "upload" | "paste" | "legacy";
          status: "uploaded" | "extracting" | "parsing" | "review_required" | "committed" | "failed";
          file_path: string | null; file_name: string | null; mime_type: string | null;
          size_bytes: number | null; source_text: string | null; page_metadata: Json;
          parsed_payload: Json | null; review_payload: Json | null; warnings: Json;
          parser_version: string | null; ai_requested: boolean; ai_used: boolean; ai_model: string | null;
          error_code: string | null; processing_started_at: string | null; processing_finished_at: string | null;
          reviewed_at: string | null; committed_at: string | null; committed_resume_id: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["resume_imports"]["Row"]> & { user_id: string; source_kind: "upload" | "paste" | "legacy" };
        Update: Partial<Database["public"]["Tables"]["resume_imports"]["Row"]>;
        Relationships: [];
      };
      resume_document_history: {
        Row: { id: string; user_id: string; resume_id: string | null; resume_version_id: string | null; row_version: number; title: string; template_id: string; structured_content: Json; resolved_snapshot: Json; reason: string; created_at: string };
        Insert: { id?: string; user_id: string; resume_id?: string | null; resume_version_id?: string | null; row_version: number; title: string; template_id: string; structured_content: Json; resolved_snapshot: Json; reason?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      document_exports: {
        Row: { id: string; user_id: string; resume_id: string | null; resume_version_id: string | null; format: "pdf" | "docx"; status: "processing" | "succeeded" | "failed"; row_version: number; file_name: string | null; size_bytes: number | null; duration_ms: number | null; error_code: string | null; created_at: string; completed_at: string | null };
        Insert: { id?: string; user_id: string; resume_id?: string | null; resume_version_id?: string | null; format: "pdf" | "docx"; status?: "processing" | "succeeded" | "failed"; row_version: number; file_name?: string | null; size_bytes?: number | null; duration_ms?: number | null; error_code?: string | null; created_at?: string; completed_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["document_exports"]["Insert"]>;
        Relationships: [];
      };
      assistant_threads: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assistant_messages: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          role: AssistantMessageRole;
          content: string;
          metadata: Json;
          client_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          user_id: string;
          role: AssistantMessageRole;
          content?: string;
          metadata?: Json;
          client_message_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          user_id?: string;
          role?: AssistantMessageRole;
          content?: string;
          metadata?: Json;
          client_message_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      assistant_attachments: {
        Row: {
          id: string;
          thread_id: string;
          message_id: string | null;
          user_id: string;
          file_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          extracted_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          message_id?: string | null;
          user_id: string;
          file_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          extracted_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          message_id?: string | null;
          user_id?: string;
          file_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          extracted_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      assistant_actions: {
        Row: {
          id: string;
          thread_id: string;
          message_id: string | null;
          user_id: string;
          tool_name: string;
          arguments: Json;
          status: AssistantActionStatus;
          requires_confirmation: boolean;
          authorization_evidence: string | null;
          result: Json | null;
          error: string | null;
          idempotency_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          message_id?: string | null;
          user_id: string;
          tool_name: string;
          arguments?: Json;
          status?: AssistantActionStatus;
          requires_confirmation?: boolean;
          authorization_evidence?: string | null;
          result?: Json | null;
          error?: string | null;
          idempotency_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          message_id?: string | null;
          user_id?: string;
          tool_name?: string;
          arguments?: Json;
          status?: AssistantActionStatus;
          requires_confirmation?: boolean;
          authorization_evidence?: string | null;
          result?: Json | null;
          error?: string | null;
          idempotency_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_events: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_audit_events: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          outcome: string;
          resource_type: string | null;
          resource_id: string | null;
          model: string | null;
          duration_ms: number | null;
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          outcome: string;
          resource_type?: string | null;
          resource_id?: string | null;
          model?: string | null;
          duration_ms?: number | null;
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          outcome?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          model?: string | null;
          duration_ms?: number | null;
          error_code?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          resume_id: string | null;
          resume_version_id: string | null;
          document_row_version: number;
          analysis_kind: string;
          overall_score: number;
          category_scores: Json;
          deductions: Json;
          strengths: Json;
          reviewer_perspectives: Json;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resume_id?: string | null;
          resume_version_id?: string | null;
          document_row_version?: number;
          analysis_kind?: string;
          overall_score: number;
          category_scores?: Json;
          deductions?: Json;
          strengths?: Json;
          reviewer_perspectives?: Json;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          resume_id?: string | null;
          resume_version_id?: string | null;
          document_row_version?: number;
          analysis_kind?: string;
          overall_score?: number;
          category_scores?: Json;
          deductions?: Json;
          strengths?: Json;
          reviewer_perspectives?: Json;
          model?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_bullet_suggestions: {
        Row: {
          id: string;
          user_id: string;
          profile_bullet_id: string;
          resume_id: string | null;
          resume_version_id: string | null;
          application_id: string | null;
          mode: string;
          original_text: string;
          suggested_text: string;
          explanation: string;
          facts_used: Json;
          unsupported_claims: Json;
          skills_added: string[];
          metrics_added: string[];
          confidence: number;
          status: string;
          model: string | null;
          created_at: string;
          decided_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_bullet_id: string;
          resume_id?: string | null;
          resume_version_id?: string | null;
          application_id?: string | null;
          mode: string;
          original_text: string;
          suggested_text: string;
          explanation: string;
          facts_used?: Json;
          unsupported_claims?: Json;
          skills_added?: string[];
          metrics_added?: string[];
          confidence: number;
          status?: string;
          model?: string | null;
          created_at?: string;
          decided_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_bullet_id?: string;
          resume_id?: string | null;
          resume_version_id?: string | null;
          application_id?: string | null;
          mode?: string;
          original_text?: string;
          suggested_text?: string;
          explanation?: string;
          facts_used?: Json;
          unsupported_claims?: Json;
          skills_added?: string[];
          metrics_added?: string[];
          confidence?: number;
          status?: string;
          model?: string | null;
          created_at?: string;
          decided_at?: string | null;
        };
        Relationships: [];
      };
      job_analyses: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          source_text_snapshot: string;
          structured_data: Json;
          field_confidence: Json;
          warnings: Json;
          parser: string;
          model: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          source_text_snapshot: string;
          structured_data?: Json;
          field_confidence?: Json;
          warnings?: Json;
          parser?: string;
          model?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          source_text_snapshot?: string;
          structured_data?: Json;
          field_confidence?: Json;
          warnings?: Json;
          parser?: string;
          model?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [];
      };
      job_match_analyses: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          job_analysis_id: string;
          resume_id: string | null;
          resume_version_id: string | null;
          resume_row_version: number;
          profile_revision: number;
          job_analysis_updated_at: string;
          overall_score: number;
          category_scores: Json;
          strong_matches: Json;
          partial_matches: Json;
          missing_requirements: Json;
          concerns: Json;
          evidence_matrix: Json;
          recommended_changes: Json;
          apply_reasonable: boolean;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          job_analysis_id: string;
          resume_id?: string | null;
          resume_version_id?: string | null;
          resume_row_version?: number;
          profile_revision?: number;
          job_analysis_updated_at: string;
          overall_score: number;
          category_scores?: Json;
          strong_matches?: Json;
          partial_matches?: Json;
          missing_requirements?: Json;
          concerns?: Json;
          evidence_matrix?: Json;
          recommended_changes?: Json;
          apply_reasonable?: boolean;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          job_analysis_id?: string;
          resume_id?: string | null;
          resume_version_id?: string | null;
          resume_row_version?: number;
          profile_revision?: number;
          job_analysis_updated_at?: string;
          overall_score?: number;
          category_scores?: Json;
          strong_matches?: Json;
          partial_matches?: Json;
          missing_requirements?: Json;
          concerns?: Json;
          evidence_matrix?: Json;
          recommended_changes?: Json;
          apply_reasonable?: boolean;
          model?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tailoring_runs: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          source_resume_id: string;
          source_resume_row_version: number;
          job_match_analysis_id: string;
          proposed_document: Json;
          changes: Json;
          evidence_matrix: Json;
          accepted_change_ids: string[];
          output_resume_version_id: string | null;
          status: string;
          model: string | null;
          created_at: string;
          updated_at: string;
          applied_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          source_resume_id: string;
          source_resume_row_version?: number;
          job_match_analysis_id: string;
          proposed_document: Json;
          changes?: Json;
          evidence_matrix?: Json;
          accepted_change_ids?: string[];
          output_resume_version_id?: string | null;
          status?: string;
          model?: string | null;
          created_at?: string;
          updated_at?: string;
          applied_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          source_resume_id?: string;
          source_resume_row_version?: number;
          job_match_analysis_id?: string;
          proposed_document?: Json;
          changes?: Json;
          evidence_matrix?: Json;
          accepted_change_ids?: string[];
          output_resume_version_id?: string | null;
          status?: string;
          model?: string | null;
          created_at?: string;
          updated_at?: string;
          applied_at?: string | null;
        };
        Relationships: [];
      };
      // Legacy v1 table kept for backwards compatibility. New work uses `applications`.
      job_applications: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          role_title: string;
          job_url: string | null;
          location: string | null;
          status: ApplicationStatus;
          applied_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          role_title: string;
          job_url?: string | null;
          location?: string | null;
          status?: ApplicationStatus;
          applied_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role_title?: string;
          job_url?: string | null;
          location?: string | null;
          status?: ApplicationStatus;
          applied_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          content: string | null;
          content_format: DocumentContentFormat;
          file_path: string | null;
          generation_metadata: Json;
          is_default: boolean;
          editor_mode: ResumeEditorMode;
          document_schema_version: number | null;
          structured_content: Json | null;
          template_id: string | null;
          row_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          content?: string | null;
          content_format?: DocumentContentFormat;
          file_path?: string | null;
          generation_metadata?: Json;
          is_default?: boolean;
          editor_mode?: ResumeEditorMode;
          document_schema_version?: number | null;
          structured_content?: Json | null;
          template_id?: string | null;
          row_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          content?: string | null;
          content_format?: DocumentContentFormat;
          file_path?: string | null;
          generation_metadata?: Json;
          is_default?: boolean;
          editor_mode?: ResumeEditorMode;
          document_schema_version?: number | null;
          structured_content?: Json | null;
          template_id?: string | null;
          row_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          role_title: string;
          job_url: string | null;
          job_description: string | null;
          location: string | null;
          status: ApplicationStatus;
          deadline: string | null;
          date_applied: string | null;
          notes: string | null;
          referral_contact: string | null;
          next_action: string | null;
          position: number;
          submitted_resume_version_id: string | null;
          submitted_cover_letter_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          role_title: string;
          job_url?: string | null;
          job_description?: string | null;
          location?: string | null;
          status?: ApplicationStatus;
          deadline?: string | null;
          date_applied?: string | null;
          notes?: string | null;
          referral_contact?: string | null;
          next_action?: string | null;
          position?: number;
          submitted_resume_version_id?: string | null;
          submitted_cover_letter_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role_title?: string;
          job_url?: string | null;
          job_description?: string | null;
          location?: string | null;
          status?: ApplicationStatus;
          deadline?: string | null;
          date_applied?: string | null;
          notes?: string | null;
          referral_contact?: string | null;
          next_action?: string | null;
          position?: number;
          submitted_resume_version_id?: string | null;
          submitted_cover_letter_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resume_versions: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          base_resume_id: string | null;
          version_number: number;
          title: string | null;
          content: string | null;
          content_format: DocumentContentFormat;
          file_path: string | null;
          generation_metadata: Json;
          rules_used: Json | null;
          job_description_snapshot: string | null;
          is_submitted: boolean;
          submitted_at: string | null;
          editor_mode: ResumeEditorMode;
          document_schema_version: number | null;
          structured_content: Json | null;
          template_id: string | null;
          row_version: number;
          created_at: string;
          updated_at: string;
        };
        // version_number is auto-assigned by a trigger when omitted.
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          base_resume_id?: string | null;
          version_number?: number;
          title?: string | null;
          content?: string | null;
          content_format?: DocumentContentFormat;
          file_path?: string | null;
          generation_metadata?: Json;
          rules_used?: Json | null;
          job_description_snapshot?: string | null;
          is_submitted?: boolean;
          submitted_at?: string | null;
          editor_mode?: ResumeEditorMode;
          document_schema_version?: number | null;
          structured_content?: Json | null;
          template_id?: string | null;
          row_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          base_resume_id?: string | null;
          version_number?: number;
          title?: string | null;
          content?: string | null;
          content_format?: DocumentContentFormat;
          file_path?: string | null;
          generation_metadata?: Json;
          rules_used?: Json | null;
          job_description_snapshot?: string | null;
          is_submitted?: boolean;
          submitted_at?: string | null;
          editor_mode?: ResumeEditorMode;
          document_schema_version?: number | null;
          structured_content?: Json | null;
          template_id?: string | null;
          row_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cover_letters: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          version_number: number;
          title: string | null;
          content: string | null;
          content_format: DocumentContentFormat;
          file_path: string | null;
          generation_metadata: Json;
          template_used: string | null;
          job_description_snapshot: string | null;
          is_submitted: boolean;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        // version_number is auto-assigned by a trigger when omitted.
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          version_number?: number;
          title?: string | null;
          content?: string | null;
          content_format?: DocumentContentFormat;
          file_path?: string | null;
          generation_metadata?: Json;
          template_used?: string | null;
          job_description_snapshot?: string | null;
          is_submitted?: boolean;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          version_number?: number;
          title?: string | null;
          content?: string | null;
          content_format?: DocumentContentFormat;
          file_path?: string | null;
          generation_metadata?: Json;
          template_used?: string | null;
          job_description_snapshot?: string | null;
          is_submitted?: boolean;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      application_packages: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          role_title: string;
          job_url: string | null;
          job_description: string | null;
          location: string | null;
          status: ApplicationStatus;
          deadline: string | null;
          date_applied: string | null;
          notes: string | null;
          referral_contact: string | null;
          next_action: string | null;
          position: number;
          submitted_resume_version_id: string | null;
          submitted_cover_letter_id: string | null;
          created_at: string;
          updated_at: string;
          submitted_resume_version: Database["public"]["Tables"]["resume_versions"]["Row"] | null;
          submitted_cover_letter: Database["public"]["Tables"]["cover_letters"]["Row"] | null;
          package_status:
            | "package_complete"
            | "resume_missing"
            | "cover_letter_missing"
            | "package_incomplete";
        };
        Relationships: [];
      };
    };
    Functions: {
      submit_resume_version: {
        Args: { p_version_id: string };
        Returns: Database["public"]["Tables"]["resume_versions"]["Row"];
      };
      submit_cover_letter: {
        Args: { p_cover_letter_id: string };
        Returns: Database["public"]["Tables"]["cover_letters"]["Row"];
      };
      reorder_applications: {
        Args: { p_updates: Json };
        Returns: undefined;
      };
      set_default_resume: {
        Args: { p_resume_id: string };
        Returns: Database["public"]["Tables"]["resumes"]["Row"];
      };
      create_application_package: {
        Args: { p_package: Json };
        Returns: Json;
      };
      save_structured_resume_document: {
        Args: { p_kind: string; p_document_id: string; p_expected_version: number; p_title: string; p_template_id: string; p_document: Json };
        Returns: number;
      };
      checkpoint_structured_resume_document: {
        Args: { p_kind: string; p_document_id: string; p_expected_version: number; p_resolved_snapshot: Json; p_reason?: string };
        Returns: string;
      };
      save_career_profile: {
        Args: { p_payload: Json; p_expected_revision: number };
        Returns: number;
      };
      commit_resume_import: {
        Args: { p_import_id: string; p_profile_payload: Json; p_expected_profile_revision: number; p_resume_name: string; p_template_id: string; p_resume_document: Json; p_onboarding?: boolean };
        Returns: Json;
      };
      claim_resume_import: {
        Args: { p_import_id: string; p_use_ai?: boolean };
        Returns: boolean;
      };
      claim_ai_usage: {
        Args: {
          p_action: string;
          p_resource_type?: string | null;
          p_resource_id?: string | null;
        };
        Returns: Array<{
          remaining: number;
          limit_value: number;
          reset_at: string;
        }>;
      };
      confirm_job_analysis: {
        Args: { p_analysis_id: string; p_structured_data: Json };
        Returns: Database["public"]["Tables"]["job_analyses"]["Row"];
      };
      apply_tailoring_run: {
        Args: {
          p_run_id: string;
          p_selected_change_ids: string[];
          p_title: string;
          p_document: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      application_status: ApplicationStatus;
      profile_experience_kind: ProfileExperienceKind;
      assistant_message_role: AssistantMessageRole;
      assistant_action_status: AssistantActionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
