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
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          url?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          url?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_experiences: {
        Row: {
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
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
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
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
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
        Row: {
          id: string;
          user_id: string;
          title: string;
          date: string | null;
          url: string | null;
          description: string | null;
          tech_stack: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          date?: string | null;
          url?: string | null;
          description?: string | null;
          tech_stack?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          date?: string | null;
          url?: string | null;
          description?: string | null;
          tech_stack?: string | null;
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
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
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
