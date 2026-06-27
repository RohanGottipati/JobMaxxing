export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          headline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          headline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          headline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
