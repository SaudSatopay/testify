/**
 * Typed database definitions for the Testify Supabase project.
 * Mirrors supabase/migrations — regenerate with
 * `supabase gen types typescript` after schema changes if preferred.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          role: string;
          status: string;
          phone: string | null;
          bio: string | null;
          resume_url: string | null;
          skills: Json;
          experience_years: number | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          role?: string;
          status?: string;
          phone?: string | null;
          bio?: string | null;
          resume_url?: string | null;
          skills?: Json;
          experience_years?: number | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          role?: string;
          status?: string;
          phone?: string | null;
          bio?: string | null;
          resume_url?: string | null;
          skills?: Json;
          experience_years?: number | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interviews: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          created_by: string;
          candidate_id: string | null;
          type: string;
          status: string;
          difficulty: string;
          job_role: string | null;
          scheduled_at: string | null;
          duration_minutes: number;
          started_at: string | null;
          ended_at: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          created_by: string;
          candidate_id?: string | null;
          type: string;
          status?: string;
          difficulty?: string;
          job_role?: string | null;
          scheduled_at?: string | null;
          duration_minutes?: number;
          started_at?: string | null;
          ended_at?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          created_by?: string;
          candidate_id?: string | null;
          type?: string;
          status?: string;
          difficulty?: string;
          job_role?: string | null;
          scheduled_at?: string | null;
          duration_minutes?: number;
          started_at?: string | null;
          ended_at?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interviews_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          created_by: string | null;
          category: string;
          question: string;
          question_type: string;
          difficulty: string;
          expected_topics: Json;
          ideal_answer: string | null;
          time_limit_seconds: number;
          is_ai_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          category: string;
          question: string;
          question_type: string;
          difficulty?: string;
          expected_topics?: Json;
          ideal_answer?: string | null;
          time_limit_seconds?: number;
          is_ai_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          category?: string;
          question?: string;
          question_type?: string;
          difficulty?: string;
          expected_topics?: Json;
          ideal_answer?: string | null;
          time_limit_seconds?: number;
          is_ai_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_questions: {
        Row: {
          id: string;
          interview_id: string;
          question_id: string;
          order_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          question_id: string;
          order_number?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          question_id?: string;
          order_number?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_questions_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_questions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      responses: {
        Row: {
          id: string;
          interview_id: string;
          question_id: string | null;
          candidate_id: string;
          question_text: string | null;
          text_answer: string | null;
          audio_url: string | null;
          video_url: string | null;
          transcript: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          question_id?: string | null;
          candidate_id: string;
          question_text?: string | null;
          text_answer?: string | null;
          audio_url?: string | null;
          video_url?: string | null;
          transcript?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          question_id?: string | null;
          candidate_id?: string;
          question_text?: string | null;
          text_answer?: string | null;
          audio_url?: string | null;
          video_url?: string | null;
          transcript?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "responses_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      mcq_questions: {
        Row: {
          id: string;
          created_by: string | null;
          category: string;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: string;
          explanation: string | null;
          difficulty: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          category: string;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: string;
          explanation?: string | null;
          difficulty?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          category?: string;
          question?: string;
          option_a?: string;
          option_b?: string;
          option_c?: string;
          option_d?: string;
          correct_option?: string;
          explanation?: string | null;
          difficulty?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mcq_attempts: {
        Row: {
          id: string;
          interview_id: string | null;
          candidate_id: string;
          category: string | null;
          difficulty: string | null;
          question_ids: string[];
          started_at: string;
          completed_at: string | null;
          score: number | null;
          total_questions: number;
          correct_answers: number;
          time_taken_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id?: string | null;
          candidate_id: string;
          category?: string | null;
          difficulty?: string | null;
          question_ids?: string[];
          started_at?: string;
          completed_at?: string | null;
          score?: number | null;
          total_questions?: number;
          correct_answers?: number;
          time_taken_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string | null;
          candidate_id?: string;
          category?: string | null;
          difficulty?: string | null;
          question_ids?: string[];
          started_at?: string;
          completed_at?: string | null;
          score?: number | null;
          total_questions?: number;
          correct_answers?: number;
          time_taken_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcq_attempts_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      mcq_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option: string | null;
          is_correct: boolean;
          marked_for_review: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option?: string | null;
          is_correct?: boolean;
          marked_for_review?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          selected_option?: string | null;
          is_correct?: boolean;
          marked_for_review?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcq_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "mcq_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mcq_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "mcq_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_analysis: {
        Row: {
          id: string;
          interview_id: string;
          response_id: string | null;
          candidate_id: string;
          answer_relevance: number | null;
          technical_accuracy: number | null;
          communication_score: number | null;
          clarity_score: number | null;
          structure_score: number | null;
          confidence_indicator: number | null;
          speaking_pace: number | null;
          filler_word_count: number | null;
          eye_contact_indicator: number | null;
          facial_expression_summary: string | null;
          voice_analysis_summary: string | null;
          strengths: Json;
          weaknesses: Json;
          recommendations: Json;
          summary: string | null;
          overall_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          response_id?: string | null;
          candidate_id: string;
          answer_relevance?: number | null;
          technical_accuracy?: number | null;
          communication_score?: number | null;
          clarity_score?: number | null;
          structure_score?: number | null;
          confidence_indicator?: number | null;
          speaking_pace?: number | null;
          filler_word_count?: number | null;
          eye_contact_indicator?: number | null;
          facial_expression_summary?: string | null;
          voice_analysis_summary?: string | null;
          strengths?: Json;
          weaknesses?: Json;
          recommendations?: Json;
          summary?: string | null;
          overall_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          response_id?: string | null;
          candidate_id?: string;
          answer_relevance?: number | null;
          technical_accuracy?: number | null;
          communication_score?: number | null;
          clarity_score?: number | null;
          structure_score?: number | null;
          confidence_indicator?: number | null;
          speaking_pace?: number | null;
          filler_word_count?: number | null;
          eye_contact_indicator?: number | null;
          facial_expression_summary?: string | null;
          voice_analysis_summary?: string | null;
          strengths?: Json;
          weaknesses?: Json;
          recommendations?: Json;
          summary?: string | null;
          overall_score?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analysis_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_analysis_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "responses";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_results: {
        Row: {
          id: string;
          interview_id: string;
          candidate_id: string;
          technical_score: number | null;
          communication_score: number | null;
          confidence_score: number | null;
          problem_solving_score: number | null;
          behavioral_score: number | null;
          mcq_score: number | null;
          overall_score: number | null;
          recommendation: string | null;
          summary: string | null;
          strengths: Json;
          weaknesses: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          candidate_id: string;
          technical_score?: number | null;
          communication_score?: number | null;
          confidence_score?: number | null;
          problem_solving_score?: number | null;
          behavioral_score?: number | null;
          mcq_score?: number | null;
          overall_score?: number | null;
          recommendation?: string | null;
          summary?: string | null;
          strengths?: Json;
          weaknesses?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          candidate_id?: string;
          technical_score?: number | null;
          communication_score?: number | null;
          confidence_score?: number | null;
          problem_solving_score?: number | null;
          behavioral_score?: number | null;
          mcq_score?: number | null;
          overall_score?: number | null;
          recommendation?: string | null;
          summary?: string | null;
          strengths?: Json;
          weaknesses?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_results_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      interviewer_notes: {
        Row: {
          id: string;
          interview_id: string;
          interviewer_id: string;
          note: string;
          is_private: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          interviewer_id: string;
          note: string;
          is_private?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          interviewer_id?: string;
          note?: string;
          is_private?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interviewer_notes_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_invitations: {
        Row: {
          id: string;
          interview_id: string;
          candidate_email: string;
          candidate_id: string | null;
          status: string;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          candidate_email: string;
          candidate_id?: string | null;
          status?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          candidate_email?: string;
          candidate_id?: string | null;
          status?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_invitations_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      recordings: {
        Row: {
          id: string;
          interview_id: string;
          candidate_id: string | null;
          video_url: string | null;
          audio_url: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          candidate_id?: string | null;
          video_url?: string | null;
          audio_url?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          candidate_id?: string | null;
          video_url?: string | null;
          audio_url?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recordings_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_events: {
        Row: {
          id: string;
          interview_id: string;
          candidate_id: string;
          event_type: string;
          occurred_at: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          candidate_id: string;
          event_type: string;
          occurred_at?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          candidate_id?: string;
          event_type?: string;
          occurred_at?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_events_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: { p_user_id: string };
        Returns: string;
      };
      is_admin: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      log_audit: {
        Args: {
          p_action: string;
          p_resource_type?: string | null;
          p_resource_id?: string | null;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
      start_mcq_attempt: {
        Args: {
          p_category?: string | null;
          p_difficulty?: string | null;
          p_count?: number;
          p_interview_id?: string | null;
        };
        Returns: Json;
      };
      submit_mcq_attempt: {
        Args: { p_attempt_id: string; p_answers: Json };
        Returns: Json;
      };
      get_platform_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
