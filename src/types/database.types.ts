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
      agente_ia_empresa: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          exemplos_de_mensagem: Json | null
          id: string
          nome_agente: string
          tenant_id: string
          tom_de_voz: string
          usa_emojis: boolean | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          exemplos_de_mensagem?: Json | null
          id?: string
          nome_agente: string
          tenant_id: string
          tom_de_voz: string
          usa_emojis?: boolean | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          exemplos_de_mensagem?: Json | null
          id?: string
          nome_agente?: string
          tenant_id?: string
          tom_de_voz?: string
          usa_emojis?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agente_ia_mensagens_regua: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          etapa_regua_id: string
          id: string
          mensagem: string
          personalizado: boolean | null
          tenant_id: string
          variaveis_contexto: Json | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          etapa_regua_id: string
          id?: string
          mensagem: string
          personalizado?: boolean | null
          tenant_id: string
          variaveis_contexto?: Json | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          etapa_regua_id?: string
          id?: string
          mensagem?: string
          personalizado?: boolean | null
          tenant_id?: string
          variaveis_contexto?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_etapa_regua"
            columns: ["etapa_regua_id"]
            isOneToOne: false
            referencedRelation: "regua_cobranca_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_data: Json | null
          new_values: Json | null
          old_data: Json | null
          old_values: Json | null
          performed_at: string | null
          performed_by: string | null
          resource_id: string | null
          resource_type: string | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_data?: Json | null
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_data?: Json | null
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing_processing_queue: {
        Row: {
          attempts: number | null
          billing_id: string
          created_at: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          processed_at: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          billing_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          processed_at?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          billing_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          processed_at?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_processing_queue_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "contract_billings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_processing_queue_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "v_contract_billings_with_complementary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_processing_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          asaas_bank_slip_url: string | null
          asaas_confirmed_date: string | null
          asaas_credit_date: string | null
          asaas_discount_value: number | null
          asaas_external_reference: string | null
          asaas_fine_value: number | null
          asaas_id: string | null
          asaas_installment_count: number | null
          asaas_installment_number: number | null
          asaas_interest_value: number | null
          asaas_invoice_url: string | null
          asaas_net_value: number | null
          asaas_original_value: number | null
          asaas_payment_date: string | null
          asaas_payment_method: string | null
          asaas_pix_copy_paste: string | null
          asaas_pix_qr_code: string | null
          billing_periods: string | null
          contract_id: string | null
          created_at: string
          customer_id: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          id: string
          last_sync_at: string | null
          link_pagamento: string | null
          metadata: Json | null
          reconciliation_date: string | null
          reconciliation_notes: string | null
          reconciliation_status: string | null
          status: string
          tenant_id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          asaas_bank_slip_url?: string | null
          asaas_confirmed_date?: string | null
          asaas_credit_date?: string | null
          asaas_discount_value?: number | null
          asaas_external_reference?: string | null
          asaas_fine_value?: number | null
          asaas_id?: string | null
          asaas_installment_count?: number | null
          asaas_installment_number?: number | null
          asaas_interest_value?: number | null
          asaas_invoice_url?: string | null
          asaas_net_value?: number | null
          asaas_original_value?: number | null
          asaas_payment_date?: string | null
          asaas_payment_method?: string | null
          asaas_pix_copy_paste?: string | null
          asaas_pix_qr_code?: string | null
          billing_periods?: string | null
          contract_id?: string | null
          created_at?: string
          customer_id: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          id?: string
          last_sync_at?: string | null
          link_pagamento?: string | null
          metadata?: Json | null
          reconciliation_date?: string | null
          reconciliation_notes?: string | null
          reconciliation_status?: string | null
          status: string
          tenant_id: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          asaas_bank_slip_url?: string | null
          asaas_confirmed_date?: string | null
          asaas_credit_date?: string | null
          asaas_discount_value?: number | null
          asaas_external_reference?: string | null
          asaas_fine_value?: number | null
          asaas_id?: string | null
          asaas_installment_count?: number | null
          asaas_installment_number?: number | null
          asaas_interest_value?: number | null
          asaas_invoice_url?: string | null
          asaas_net_value?: number | null
          asaas_original_value?: number | null
          asaas_payment_date?: string | null
          asaas_payment_method?: string | null
          asaas_pix_copy_paste?: string | null
          asaas_pix_qr_code?: string | null
          billing_periods?: string | null
          contract_id?: string | null
          created_at?: string
          customer_id?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          id?: string
          last_sync_at?: string | null
          link_pagamento?: string | null
          metadata?: Json | null
          reconciliation_date?: string | null
          reconciliation_notes?: string | null
          reconciliation_status?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "charges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_charges_billing_periods"
            columns: ["billing_periods"]
            isOneToOne: false
            referencedRelation: "billing_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_charges_billing_periods"
            columns: ["billing_periods"]
            isOneToOne: false
            referencedRelation: "contract_billing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_charges_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_active_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_charges_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_pending_billings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_charges_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_charges_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_billing_status"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliation_history: {
        Row: {
          action: string
          charge_id: string | null
          id: string
          metadata: Json | null
          movement_id: string | null
          new_status: string | null
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          previous_status: string | null
          rule_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          charge_id?: string | null
          id?: string
          metadata?: Json | null
          movement_id?: string | null
          new_status?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          previous_status?: string | null
          rule_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          charge_id?: string | null
          id?: string
          metadata?: Json | null
          movement_id?: string | null
          new_status?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          previous_status?: string | null
          rule_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_history_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "conciliation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliation_rules: {
        Row: {
          actions: Json
          auto_match: boolean | null
          conditions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          source: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actions?: Json
          auto_match?: boolean | null
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          source: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actions?: Json
          auto_match?: boolean | null
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          source?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliation_settings: {
        Row: {
          asaas_api_key: string | null
          asaas_environment: string | null
          auto_reconciliation_enabled: boolean | null
          created_at: string | null
          id: string
          last_sync_date: string | null
          notification_settings: Json | null
          sync_frequency_hours: number | null
          tenant_id: string
          tolerance_amount: number | null
          tolerance_days: number | null
          updated_at: string | null
        }
        Insert: {
          asaas_api_key?: string | null
          asaas_environment?: string | null
          auto_reconciliation_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_date?: string | null
          notification_settings?: Json | null
          sync_frequency_hours?: number | null
          tenant_id: string
          tolerance_amount?: number | null
          tolerance_days?: number | null
          updated_at?: string | null
        }
        Update: {
          asaas_api_key?: string | null
          asaas_environment?: string | null
          auto_reconciliation_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_date?: string | null
          notification_settings?: Json | null
          sync_frequency_hours?: number | null
          tenant_id?: string
          tolerance_amount?: number | null
          tolerance_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conciliation_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_billing_periods: {
        Row: {
          actor_id: string | null
          amount_billed: number | null
          amount_planned: number | null
          bill_date: string
          billed_at: string | null
          contract_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["billing_period_status"] | null
          id: string
          manual_mark: boolean
          manual_reason: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["billing_period_status"]
          tenant_id: string
          transition_reason: string | null
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          amount_billed?: number | null
          amount_planned?: number | null
          bill_date: string
          billed_at?: string | null
          contract_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["billing_period_status"] | null
          id?: string
          manual_mark?: boolean
          manual_reason?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["billing_period_status"]
          tenant_id: string
          transition_reason?: string | null
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          amount_billed?: number | null
          amount_planned?: number | null
          bill_date?: string
          billed_at?: string | null
          contract_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["billing_period_status"] | null
          id?: string
          manual_mark?: boolean
          manual_reason?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["billing_period_status"]
          tenant_id?: string
          transition_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_billing_periods_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_active_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_pending_billings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_billing_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_billings: {
        Row: {
          amount: number
          billing_date: string
          contract_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          metadata: Json | null
          payment_date: string | null
          payment_method: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_date: string
          contract_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_date?: string
          contract_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_active_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_pending_billings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_billing_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_services: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          price: number
          quantity: number
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          price: number
          quantity: number
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          price?: number
          quantity?: number
          service_id?: string
          tenant_id?: string
          updated_at?: string
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
      contracts: {
        Row: {
          billing_cycle: string
          billing_day: number
          created_at: string
          customer_id: string
          end_date: string | null
          id: string
          metadata: Json | null
          next_billing_date: string | null
          start_date: string
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          billing_day: number
          created_at?: string
          customer_id: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          next_billing_date?: string | null
          start_date: string
          status: string
          tenant_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          billing_day?: number
          created_at?: string
          customer_id?: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          next_billing_date?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          asaas_customer_id: string | null
          city: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          status: string
          street: string | null
          tenant_id: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          status: string
          street?: string | null
          tenant_id: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          status?: string
          street?: string | null
          tenant_id?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_movements: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          metadata: Json | null
          reconciliation_status: string | null
          source: string
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reconciliation_status?: string | null
          source: string
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reconciliation_status?: string | null
          source?: string
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      regua_cobranca: {
        Row: {
          ativa: boolean | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
          tenant_id: string
          tipo_cobranca: string | null
        }
        Insert: {
          ativa?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tenant_id: string
          tipo_cobranca?: string | null
        }
        Update: {
          ativa?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tenant_id?: string
          tipo_cobranca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      regua_cobranca_etapas: {
        Row: {
          acao: string | null
          ativa: boolean | null
          criado_em: string | null
          dias_apos_vencimento: number | null
          id: string
          ordem: number | null
          regua_id: string
          tenant_id: string
          tipo_acao: string | null
        }
        Insert: {
          acao?: string | null
          ativa?: boolean | null
          criado_em?: string | null
          dias_apos_vencimento?: number | null
          id?: string
          ordem?: number | null
          regua_id: string
          tenant_id: string
          tipo_acao?: string | null
        }
        Update: {
          acao?: string | null
          ativa?: boolean | null
          criado_em?: string | null
          dias_apos_vencimento?: number | null
          id?: string
          ordem?: number | null
          regua_id?: string
          tenant_id?: string
          tipo_acao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_regua"
            columns: ["regua_id"]
            isOneToOne: false
            referencedRelation: "regua_cobranca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string | null
          id: string
          role: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      billing_kanban: {
        Row: {
          amount_billed: number | null
          amount_planned: number | null
          bill_date: string | null
          billed_at: string | null
          contract_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string | null
          manual_mark: boolean | null
          manual_reason: string | null
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["billing_period_status"] | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_active_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_pending_billings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_billing_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billing_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_active_view: {
        Row: {
          billing_cycle: string | null
          billing_day: number | null
          created_at: string | null
          customer_id: string | null
          end_date: string | null
          id: string | null
          metadata: Json | null
          next_billing_date: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_pending_billings_view: {
        Row: {
          billing_cycle: string | null
          billing_day: number | null
          created_at: string | null
          customer_id: string | null
          end_date: string | null
          id: string | null
          metadata: Json | null
          next_billing_date: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts_billing_status: {
        Row: {
          billing_cycle: string | null
          billing_day: number | null
          created_at: string | null
          customer_id: string | null
          end_date: string | null
          id: string | null
          metadata: Json | null
          next_billing_date: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_contract_billings_with_complementary: {
        Row: {
          amount: number | null
          billing_date: string | null
          contract_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          metadata: Json | null
          payment_date: string | null
          payment_method: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_active_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_pending_billings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_billing_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_billings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_billing_periods: {
        Args: {
          p_contract_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Json
      }
      get_tenant_context: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      set_tenant_context_simple: {
        Args: {
          p_tenant_id: string
        }
        Returns: undefined
      }
      update_billing_periods_on_charge_payment: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_billing_periods_tenant: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      billing_period_status: "PENDING" | "BILLED" | "PAID" | "OVERDUE" | "CANCELLED" | "DUE_TODAY"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
