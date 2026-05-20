// Generated Supabase types live here.
// Replace this file by running:
//   bunx supabase gen types typescript --project-id <project-id> > packages/db/src/types.ts
//
// The stub below keeps the workspace type-safe until the real schema is generated.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          starts_on: string;
          ends_on: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          starts_on: string;
          ends_on: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
        Relationships: [];
      };
      trip_items: {
        Row: {
          id: string;
          trip_id: string;
          day_index: number;
          position: number;
          place: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          day_index: number;
          position: number;
          place: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trip_items']['Insert']>;
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          trip_id: string;
          cron_expression: string;
          channel: 'email' | 'push' | 'webhook';
          payload: Json;
          enabled: boolean;
          last_run_at: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          cron_expression: string;
          channel: 'email' | 'push' | 'webhook';
          payload: Json;
          enabled?: boolean;
          last_run_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
