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
    };
    Enums: {
      member_role: MemberRole;
      project_status: ProjectStatus;
      deliverable_status: DeliverableStatus;
      pricing_method: PricingMethod;
    };
  };
}

