// Customer type is already defined in this file, no need to import
export type { Cobranca } from './models/cobranca';
// Profile type is already defined in this file, no need to import
export type { Notification as NotificationModel } from './models/notification';
export type { MessageTemplate } from './models/message-template';
// DashboardMetrics is already defined in this file, no need to import
export type { AgenteIA, AgenteIAMensagemRegua } from './models/agente-ia';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      services: {
        Row: {
          code: string | null
          created_at: string
          default_price: number
          description: string | null
          id: string
          is_active: boolean | null
          lc_code: string | null
          municipality_code: string | null
          name: string
          tax_code: string | null
          tax_rate: number | null
          tenant_id: string
          updated_at: string
          withholding_tax: boolean | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          default_price: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          lc_code?: string | null
          municipality_code?: string | null
          name: string
          tax_code?: string | null
          tax_rate?: number | null
          tenant_id: string
          updated_at?: string
          withholding_tax?: boolean | null
        }
        Update: {
          code?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          lc_code?: string | null
          municipality_code?: string | null
          name?: string
          tax_code?: string | null
          tax_rate?: number | null
          tenant_id?: string
          updated_at?: string
          withholding_tax?: boolean | null
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
      agente_ia_empresa: {
        Row: {
          id: string
          tenant_id: string
          nome_agente: string
          tom_de_voz: string
          exemplos_de_mensagem: string[]
          usa_emojis: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome_agente: string
          tom_de_voz: string
          exemplos_de_mensagem?: string[]
          usa_emojis?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome_agente?: string
          tom_de_voz?: string
          exemplos_de_mensagem?: string[]
          usa_emojis?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      agente_ia_mensagens_regua: {
        Row: {
          id: string
          tenant_id: string
          etapa_regua_id: string
          mensagem: string
          variaveis_contexto: string[]
          personalizado: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          tenant_id: string
          etapa_regua_id: string
          mensagem: string
          variaveis_contexto?: string[]
          personalizado?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          etapa_regua_id?: string
          mensagem?: string
          variaveis_contexto?: string[]
          personalizado?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_etapa_regua"
            columns: ["etapa_regua_id"]
            isOneToOne: false
            referencedRelation: "regua_cobranca_etapas"
            referencedColumns: ["id"]
          }
        ]
      }
      charges: {
        Row: {
          // AIDEV-NOTE: Estrutura CORRIGIDA baseada na tabela real do banco
          id: string
          tenant_id: string
          customer_id: string
          asaas_id: string | null
          contract_id: string | null
          valor: number
          status: string | null
          tipo: string | null
          data_vencimento: string
          descricao: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          customer_id: string
          asaas_id?: string | null
          contract_id?: string | null
          valor: number
          status?: string | null
          tipo?: string | null
          data_vencimento: string
          descricao?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_id?: string
          asaas_id?: string | null
          contract_id?: string | null
          valor?: number
          status?: string | null
          tipo?: string | null
          data_vencimento?: string
          descricao?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean | null
          additional_info: Json | null
          address: string | null
          address_number: string | null
          celular_whatsapp: string | null
          city: string | null
          company: string | null
          complement: string | null
          country: string | null
          cpf_cnpj: number | null
          created_at: string
          customer_asaas_id: string | null
          email: string
          id: string
          name: string
          neighborhood: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          additional_info?: Json | null
          address?: string | null
          address_number?: string | null
          celular_whatsapp?: string | null
          city?: string | null
          company?: string | null
          complement?: string | null
          country?: string | null
          cpf_cnpj?: number | null
          created_at?: string
          customer_asaas_id?: string | null
          email: string
          id?: string
          name: string
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          additional_info?: Json | null
          address?: string | null
          address_number?: string | null
          celular_whatsapp?: string | null
          city?: string | null
          company?: string | null
          complement?: string | null
          country?: string | null
          cpf_cnpj?: number | null
          created_at?: string
          customer_asaas_id?: string | null
          email?: string
          id?: string
          name?: string
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
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
      invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          token: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          charge_id: string | null
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          message: string
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          charge_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message: string
          sent_at?: string | null
          status: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          charge_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean | null
          category: string
          created_at: string
          days_offset: number
          description: string | null
          id: string
          is_before_due: boolean | null
          message: string
          name: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string
          days_offset: number
          description?: string | null
          id?: string
          is_before_due?: boolean | null
          message: string
          name: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string
          days_offset?: number
          description?: string | null
          id?: string
          is_before_due?: boolean | null
          message?: string
          name?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          charge_id: string | null
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          message: string
          sent_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          charge_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message: string
          sent_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          charge_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message?: string
          sent_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    : never,
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

export interface DashboardMetrics {
  totalReceivable: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  newCustomers: number;
  newCustomersList: Customer[];
  chargesByStatus: Array<{
    status: string;
    count: number;
    charges: Array<{
      id: string;
      valor: number;
      status: string;
      data_vencimento: string;
      customer?: {
        name: string;
        company?: string;
      };
    }>;
  }>;
  chargesByPriority: Array<{
    priority: string;
    count: number;
  }>;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  cpf_cnpj?: string;
  email?: string;
  phone?: string;
  mrr?: number;
  mrc?: number;
  status?: string;
  asaas_id?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageHistory {
  id: string;
  tenant_id: string;
  charge_id: string | null;
  template_id: string | null;
  customer_id: string | null;
  message: string | null;
  status: string | null;
  error_details: string | null;
  metadata: any | null;
  created_at: string;
  updated_at: string;
  batch_id: string | null;
}
