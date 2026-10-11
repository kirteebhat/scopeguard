export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole = "owner" | "manager" | "member";
export type ProjectStatus = "active" | "completed" | "on_hold" | "archived";
export type DeliverableStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type PricingMethod = "hourly" | "fixed";
export type ChangeRequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "withdrawn";
export type DecisionType = "approved" | "rejected";
export type ActorType = "user" | "client_link" | "system";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          client_name: string;
          status: ProjectStatus;
          currency: string;
          budget_minor: number;
          hourly_rate_minor: number;
          start_date: string;
          original_deadline: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          client_name: string;
          status?: ProjectStatus;
          currency: string;
          budget_minor?: number;
          hourly_rate_minor?: number;
          start_date?: string;
          original_deadline: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          client_name?: string;
          status?: ProjectStatus;
          currency?: string;
          budget_minor?: number;
          hourly_rate_minor?: number;
          start_date?: string;
          original_deadline?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      deliverables: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: DeliverableStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: DeliverableStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          status?: DeliverableStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      change_requests: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          affected_deliverable_id: string | null;
          pricing_method: PricingMethod;
          estimated_hours: number;
          hourly_rate_minor: number;
          cost_minor: number;
          proposed_deadline: string | null;
          internal_notes: string | null;
          status: ChangeRequestStatus;
          current_version: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description: string;
          affected_deliverable_id?: string | null;
          pricing_method?: PricingMethod;
          estimated_hours?: number;
          hourly_rate_minor?: number;
          cost_minor?: number;
          proposed_deadline?: string | null;
          internal_notes?: string | null;
          status?: ChangeRequestStatus;
          current_version?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string;
          affected_deliverable_id?: string | null;
          pricing_method?: PricingMethod;
          estimated_hours?: number;
          hourly_rate_minor?: number;
          cost_minor?: number;
          proposed_deadline?: string | null;
          internal_notes?: string | null;
          status?: ChangeRequestStatus;
          current_version?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      change_request_versions: {
        Row: {
          id: string;
          change_request_id: string;
          version_number: number;
          title: string;
          description: string;
          pricing_method: PricingMethod;
          cost_minor: number;
          currency: string;
          proposed_deadline: string | null;
          snapshot: Json;
          published_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          change_request_id: string;
          version_number: number;
          title: string;
          description: string;
          pricing_method: PricingMethod;
          cost_minor: number;
          currency: string;
          proposed_deadline?: string | null;
          snapshot: Json;
          published_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          change_request_id?: string;
          version_number?: number;
          title?: string;
          description?: string;
          pricing_method?: PricingMethod;
          cost_minor?: number;
          currency?: string;
          proposed_deadline?: string | null;
          snapshot?: Json;
          published_by?: string | null;
          created_at?: string;
        };
      };
      approval_tokens: {
        Row: {
          id: string;
          version_id: string;
          token_hash: string;
          expires_at: string;
          revoked_at: string | null;
          consumed_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          version_id: string;
          token_hash: string;
          expires_at: string;
          revoked_at?: string | null;
          consumed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          version_id?: string;
          token_hash?: string;
          expires_at?: string;
          revoked_at?: string | null;
          consumed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      approvals: {
        Row: {
          id: string;
          version_id: string;
          decision: DecisionType;
          decided_at: string;
          decision_actor_type: ActorType;
          actor_name: string;
          audit_metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          version_id: string;
          decision: DecisionType;
          decided_at?: string;
          decision_actor_type?: ActorType;
          actor_name: string;
          audit_metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          version_id?: string;
          decision?: DecisionType;
          decided_at?: string;
          decision_actor_type?: ActorType;
          actor_name?: string;
          audit_metadata?: Json;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          workspace_id: string;
          actor_type: ActorType;
          actor_id: string | null;
          actor_name: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_type: ActorType;
          actor_id?: string | null;
          actor_name?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          actor_type?: ActorType;
          actor_id?: string | null;
          actor_name?: string | null;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      approval_attempts: {
        Row: {
          id: string;
          ip_hash: string;
          token_prefix: string;
          attempted_at: string;
        };
        Insert: {
          id?: string;
          ip_hash: string;
          token_prefix: string;
          attempted_at?: string;
        };
        Update: {
          id?: string;
          ip_hash?: string;
          token_prefix?: string;
          attempted_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_workspace: {
        Args: {
          name: string;
        };
        Returns: Json;
      };
      publish_change_request: {
        Args: {
          p_request_id: string;
          p_token_hash: string;
          p_expires_at: string;
        };
        Returns: Json;
      };
      revise_change_request: {
        Args: {
          p_request_id: string;
        };
        Returns: Json;
      };
      withdraw_change_request: {
        Args: {
          p_request_id: string;
        };
        Returns: Json;
      };
      get_proposal_by_token: {
        Args: {
          p_token_hash: string;
        };
        Returns: Json;
      };
      submit_decision: {
        Args: {
          p_token_hash: string;
          p_decision: string;
          p_actor_name: string;
          p_audit_meta?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      member_role: MemberRole;
      project_status: ProjectStatus;
      deliverable_status: DeliverableStatus;
      pricing_method: PricingMethod;
      change_request_status: ChangeRequestStatus;
      decision_type: DecisionType;
      actor_type: ActorType;
    };
  };
}
