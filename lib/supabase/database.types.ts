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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          client_name: string;
          client_contact_name: string | null;
          client_contact_email: string | null;
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
          client_contact_name?: string | null;
          client_contact_email?: string | null;
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
          client_contact_name?: string | null;
          client_contact_email?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      change_requests: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          reason: string | null;
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
          reason?: string | null;
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
          reason?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "change_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "change_requests_affected_deliverable_id_fkey";
            columns: ["affected_deliverable_id"];
            isOneToOne: false;
            referencedRelation: "deliverables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "change_requests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "change_request_versions_change_request_id_fkey";
            columns: ["change_request_id"];
            isOneToOne: false;
            referencedRelation: "change_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "change_request_versions_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "approval_tokens_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "change_request_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_tokens_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "approvals_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: true;
            referencedRelation: "change_request_versions";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "activity_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [];
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          status: "pending" | "accepted" | "revoked" | "expired";
          invited_by: string;
          expires_at: string;
          accepted_by: string | null;
          accepted_at: string | null;
          revoked_at: string | null;
          last_sent_at: string;
          send_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          status?: "pending" | "accepted" | "revoked" | "expired";
          invited_by: string;
          expires_at?: string;
          accepted_by?: string | null;
          accepted_at?: string | null;
          revoked_at?: string | null;
          last_sent_at?: string;
          send_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          role?: MemberRole;
          token_hash?: string;
          status?: "pending" | "accepted" | "revoked" | "expired";
          invited_by?: string;
          expires_at?: string;
          accepted_by?: string | null;
          accepted_at?: string | null;
          revoked_at?: string | null;
          last_sent_at?: string;
          send_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      proposal_emails: {
        Row: {
          id: string;
          workspace_id: string;
          change_request_id: string;
          version_id: string;
          recipient_email: string;
          recipient_name: string | null;
          status: "queued" | "sent" | "failed";
          provider: string;
          provider_message_id: string | null;
          error_code: string | null;
          sent_by: string | null;
          personal_note_present: boolean;
          send_attempt_key: string;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          change_request_id: string;
          version_id: string;
          recipient_email: string;
          recipient_name?: string | null;
          status?: "queued" | "sent" | "failed";
          provider?: string;
          provider_message_id?: string | null;
          error_code?: string | null;
          sent_by?: string | null;
          personal_note_present?: boolean;
          send_attempt_key: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          change_request_id?: string;
          version_id?: string;
          recipient_email?: string;
          recipient_name?: string | null;
          status?: "queued" | "sent" | "failed";
          provider?: string;
          provider_message_id?: string | null;
          error_code?: string | null;
          sent_by?: string | null;
          personal_note_present?: boolean;
          send_attempt_key?: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "proposal_emails_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_emails_change_request_id_fkey";
            columns: ["change_request_id"];
            isOneToOne: false;
            referencedRelation: "change_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_emails_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "change_request_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_emails_sent_by_fkey";
            columns: ["sent_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
      create_invitation: {
        Args: {
          p_workspace_id: string;
          p_email: string;
          p_role: string;
          p_token_hash: string;
        };
        Returns: string;
      };
      resend_invitation: {
        Args: {
          p_invitation_id: string;
          p_new_token_hash: string;
        };
        Returns: void;
      };
      revoke_invitation: {
        Args: {
          p_invitation_id: string;
        };
        Returns: void;
      };
      get_invitation_by_token: {
        Args: {
          p_token_hash: string;
        };
        Returns: {
          workspace_name: string;
          role: MemberRole;
          invited_email_masked: string;
          inviter_name: string;
          status: string;
          expires_at: string;
        }[];
      };
      accept_invitation: {
        Args: {
          p_token_hash: string;
        };
        Returns: Json;
      };
      begin_proposal_email: {
        Args: {
          p_change_request_id: string;
          p_recipient_email: string;
          p_recipient_name?: string | null;
          p_attempt_key: string;
          p_personal_note_present?: boolean;
        };
        Returns: string;
      };
      complete_proposal_email: {
        Args: {
          p_email_id: string;
          p_status: string;
          p_provider_message_id?: string | null;
          p_error_code?: string | null;
        };
        Returns: void;
      };
      set_project_client_contact: {
        Args: {
          p_project_id: string;
          p_contact_name?: string | null;
          p_contact_email?: string | null;
        };
        Returns: void;
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
