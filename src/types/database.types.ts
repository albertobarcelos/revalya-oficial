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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      contract_services: {
        Row: {
          billing_type: string
          card_type: string | null
          contract_id: string
          created_at: string | null
          due_date_type: string
          due_day: number | null
          due_days: number | null
          due_next_month: boolean | null
          generate_billing: boolean
          id: string
          installments: number | null
          payment_method: string
          quantity: number
          recurrence_frequency: string | null
          service_id: string
          tenant_id: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          billing_type: string
          card_type?: string | null
          contract_id: string
          created_at?: string | null
          due_date_type: string
          due_day?: number | null
          due_days?: number | null
          due_next_month?: boolean | null
          generate_billing?: boolean
          id?: string
          installments?: number | null
          payment_method: string
          quantity: number
          recurrence_frequency?: string | null
          service_id: string
          tenant_id: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          billing_type?: string
          card_type?: string | null
          contract_id?: string
          created_at?: string | null
          due_date_type?: string
          due_day?: number | null
          due_days?: number | null
          due_next_month?: boolean | null
          generate_billing?: boolean
          id?: string
          installments?: number | null
          payment_method?: string
          quantity?: number
          recurrence_frequency?: string | null
          service_id?: string
          tenant_id?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_active_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_pending_billings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_billing_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      // Outras tabelas serão mantidas conforme necessário
    }
  }
}
