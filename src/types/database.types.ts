export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          resource: string
          tenant_id: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          resource: string
          tenant_id?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          resource?: string
          tenant_id?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_access_logs_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
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
          }
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
          }
        ]
      }
      // ... (rest of the types) ...
    }
  }
}
