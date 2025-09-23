import { supabase } from '@/lib/supabase';
import type { Cobranca } from "@/types/database";
import type { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, isAfter, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTenantQuery } from "@/features/tenant/hooks/useTenantQuery";
import { auditService } from "./auditService";

interface GetChargesParams {
  page: number;
  limit: number;
  searchTerm?: string;
  status?: string;
  type?: string;
  dateRange?: DateRange;
  onlyOverdue?: boolean;
}

// Versão original do serviço que não tem contexto de tenant (para compatibilidade)
export const chargesService = {
  async getCharges({ 
    page = 1, 
    limit = 10, 
    searchTerm = "", 
    status = "all",
    type = "all",
    dateRange,
  }: GetChargesParams = {}) {
    try {
      // Otimização: Calcular a data atual uma única vez
      const today = format(new Date(), 'yyyy-MM-dd');
      
      let query = supabase
        .from('charges')
        .select(`
          *,
          customers (
            id,
            name,
            cpf_cnpj,
            email,
            phone,
            company
          ),
          contracts (
            id,
            contract_number,
            customer_id,
            status,
            services:contract_services(
              id,
              description,
              service:services(
                id,
                name,
                description
              )
            )
          ),
          tipo
        `, { count: 'exact' });

      // Aplicar filtros
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase().trim();
        
        // AIDEV-NOTE: Busca CORRIGIDA - usando customer_id (não asaas_id)
        const { data: customerIds, error: customerQueryError } = await supabase
          .from('customers')
          .select('id')
          .or(`name.ilike.%${searchTermLower}%,cpf_cnpj.ilike.%${searchTermLower}%,company.ilike.%${searchTermLower}%`);
          
        if (customerQueryError) {
          console.error("Erro na busca de clientes:", customerQueryError);
        } else if (customerIds && customerIds.length > 0) {
          query = query.in('customer_id', customerIds.map(c => c.id));
        } else if (searchTerm) {
          // Se não encontrou clientes mas tem termo de busca, buscar também na descrição da cobrança
          query = query.ilike('descricao', `%${searchTermLower}%`);
        }
      }

      // Aplicar filtros de status com lógica otimizada
      if (status && status !== 'all') {
        if (status === 'PENDING') {
          // Cobranças pendentes que não venceram
          query = query
            .eq('status', 'PENDING')
            .gte('data_vencimento', today);
        } else if (status === 'OVERDUE') {
          // Cobranças vencidas (pendentes com data de vencimento anterior a hoje)
          query = query
            .eq('status', 'PENDING')
            .lt('data_vencimento', today);
        } else {
          query = query.eq('status', status);
        }
      }
      
      // Aplicar lógica especial quando o filtro for por dinheiro (tipo=CASH)
      if (type === 'CASH') {
        // Se também houver filtro por status
        if (status && status !== 'all') {
          if (status === 'RECEIVED') {
            // Se filtrar por "recebidas" e "dinheiro", incluir RECEIVED_IN_CASH e tipo=CASH
            query = query.or('status.eq.RECEIVED,status.eq.RECEIVED_IN_CASH,tipo.eq.CASH');
          } else {
            // Para outros status, aplicar normalmente o filtro de tipo=CASH
            query = query.eq('tipo', type);
            // O filtro de status já foi aplicado acima
          }
        } else {
          // Se não houver filtro de status, mostrar cobranças com tipo=CASH ou status=RECEIVED_IN_CASH
          query = query.or('tipo.eq.CASH,status.eq.RECEIVED_IN_CASH');
        }
      }
      // Aplicar filtro normal para outros tipos
      else if (type && type !== 'all') {
        query = query.eq('tipo', type);
      }

      // Aplicar filtro de data de forma mais eficiente
      if (dateRange?.from && dateRange?.to) {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        query = query
          .gte('data_vencimento', fromDate)
          .lte('data_vencimento', toDate);
      } else if (dateRange?.from) {
        query = query.gte('data_vencimento', format(dateRange.from, 'yyyy-MM-dd'));
      } else if (dateRange?.to) {
        query = query.lte('data_vencimento', format(dateRange.to, 'yyyy-MM-dd'));
      }

      // Aplicar range de paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      // Primero aplicar ordenação, depois o range
      query = query.order('data_vencimento', { ascending: false });
      query = query.range(from, to);

      const { data, count, error } = await query;

      console.log("Consulta de cobranças:", { 
        params: { page, limit, searchTerm, status, type, dateRange },
        resultCount: count || 0
      });

      if (error) {
        console.error("Erro na query:", error);
        throw error;
      }

      // Processar os dados para atualizar status de cobranças vencidas
      const processedData = data?.map(charge => {
        if (charge.status === 'PENDING' && charge.data_vencimento < today) {
          return {
            ...charge,
            status: 'OVERDUE'
          };
        }
        return charge;
      });

      return {
        data: processedData || [],
        total: count || 0
      };
    } catch (error) {
      console.error("Erro ao buscar cobranças:", error);
      return {
        data: [],
        total: 0
      };
    }
  },

  async getChargeById(id: string): Promise<Cobranca> {
    const { data, error } = await supabase
      .from('charges')
      .select(`
        *,
        customers (
          id,
          name,
          cpf_cnpj,
          email,
          phone,
          company
        ),
        contracts (
          id,
          contract_number,
          customer_id,
          status,
          services:contract_services(
            id,
            description,
            service:services(
              id,
              name,
              description
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Cobranca;
  },

  async updateCharge(id: string, data: Partial<Cobranca>): Promise<Cobranca> {
    let formattedData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    // Se a cobrança for marcada como recebida em dinheiro, atualize o tipo para CASH
    if (data.status === 'RECEIVED_IN_CASH') {
      formattedData = {
        ...formattedData,
        tipo: 'CASH'
      };
    }

    console.log('Updating charge with formatted data:', formattedData);

    const { data: charge, error } = await supabase
      .from('charges')
      .update(formattedData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return charge as unknown as Cobranca;
  },

  async createCharge(data: Omit<Cobranca, 'id' | 'created_at' | 'updated_at'>): Promise<Cobranca> {
    const formattedData = {
      ...data,
      status: data.status || 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Creating charge with formatted data:', formattedData);

    const { data: charge, error } = await supabase
      .from('charges')
      .insert([formattedData])
      .select()
      .single();

    if (error) throw error;
    return charge as unknown as Cobranca;
  },

  async syncCharges(): Promise<boolean> {
    const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'syncCharges'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to sync charges');
    }

    return true;
  },

  async sendReminder(id: string): Promise<boolean> {
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select('*')
      .eq('id', id)
      .single();

    if (chargeError) throw chargeError;

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        charge_id: id,
        type: 'reminder',
        message: `Lembrete de pagamento para a cobrança de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.valor)}`,
        status: 'pending'
      }]);

    if (notificationError) throw notificationError;
    return true;
  },

  /**
   * Marca uma cobrança como recebida em dinheiro, atualizando o status para RECEIVED_IN_CASH
   * e o tipo para CASH automaticamente
   */
  async markAsReceivedInCash(id: string, paymentDate?: string): Promise<Cobranca> {
    return this.updateCharge(id, { 
      status: 'RECEIVED_IN_CASH',
      tipo: 'CASH',
      data_pagamento: paymentDate || new Date().toISOString() 
    });
  },

  async exportCharges(): Promise<Blob> {
    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .order('data_vencimento', { ascending: true });

    if (error) throw error;

    const charges = data;
    
    const headers = [
      "ID",
      "Valor",
      "Status",
      "Vencimento",
      "Data Pagamento",
      "Descrição",
      "Tentativas",
      // "Prioridade", // Column doesn't exist in database
      "Criado em",
      "Atualizado em"
    ];

    const rows = charges.map(charge => [
      charge.id,
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(charge.valor),
      charge.status,
      new Date(charge.data_vencimento).toLocaleDateString("pt-BR"),
      charge.data_pagamento ? new Date(charge.data_pagamento).toLocaleDateString("pt-BR") : "-",
      charge.descricao,
      "-", // tentativas field doesn't exist
      // charge.prioridade, // Column doesn't exist in database
      new Date(charge.created_at).toLocaleDateString("pt-BR"),
      new Date(charge.updated_at).toLocaleDateString("pt-BR")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  },

  async exportToCSV({ searchTerm = "", status = "all", type = "all", dateRange }: Omit<GetChargesParams, 'page' | 'limit'>) {
    const { data: charges } = await this.getCharges({ 
      searchTerm, 
      status,
      type,
      dateRange,
      limit: 1000 // Limite maior para exportação
    });

    const headers = [
      "Cliente",
      "Empresa",
      "CPF/CNPJ",
      "Valor",
      "Data de Vencimento",
      "Status",
      "Descrição"
    ];

    const rows = charges.map(charge => [
      charge.customer?.name || '',
      charge.customer?.company || '',
      charge.customer?.cpf_cnpj || '',
      charge.valor.toFixed(2).replace('.', ','),
      format(new Date(charge.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }),
      charge.status,
      charge.descricao || ''
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  },

  async cancelCharge(chargeId: string): Promise<boolean> {
    if (!chargeId) {
      throw new Error('ID da cobrança é obrigatório para cancelamento');
    }

    // Obter dados da cobrança antes de cancelar (para auditoria)
    const { data: charge } = await supabase
      .from('charges')
      .select('*')
      .eq('id', chargeId)
      .single();

    if (!charge) {
      throw new Error('Cobrança não encontrada');
    }

    // Atualizamos o status no banco de dados
    const { error: dbError } = await supabase
      .from('charges')
      .update({ 
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', chargeId);

    if (dbError) {
      console.error('Erro ao cancelar cobrança no banco de dados:', dbError);
      throw new Error(`Erro ao cancelar cobrança: ${dbError.message}`);
    }

    // Registrar evento de auditoria manualmente
    await auditService.logCustomAction(
      supabase,
      'charges',
      chargeId,
      'MANUAL_CANCEL',
      {
        valor: charge.valor,
        cliente: charge.cliente,
        motivo: 'Cancelado manualmente'
      },
      charge.tenant_id
    );

    // Como a integração com Asaas é feita pelo n8n, não precisamos chamar diretamente aqui
    // Caso seja necessário, você pode disparar um webhook para o n8n processar o cancelamento
    
    return true;
  },

  /**
   * Atualiza em massa todas as cobranças com status RECEIVED_IN_CASH para terem o tipo CASH
   * @returns Um objeto com a contagem de cobranças atualizadas
   */
  async updateReceivedInCashCharges(): Promise<{ count: number }> {
    // Primeiro, busca todas as cobranças com status RECEIVED_IN_CASH mas sem tipo CASH
    const { data, error: fetchError } = await supabase
      .from('charges')
      .select('id')
      .eq('status', 'RECEIVED_IN_CASH')
      .neq('tipo', 'CASH');
    
    if (fetchError) {
      console.error('Erro ao buscar cobranças para atualização:', fetchError);
      throw new Error(`Erro ao buscar cobranças: ${fetchError.message}`);
    }
    
    if (!data || data.length === 0) {
      console.log('Nenhuma cobrança precisa ser atualizada');
      return { count: 0 };
    }
    
    // Atualiza todas as cobranças encontradas
    const { error: updateError } = await supabase
      .from('charges')
      .update({ 
        tipo: 'CASH',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'RECEIVED_IN_CASH')
      .neq('tipo', 'CASH');
    
    if (updateError) {
      console.error('Erro ao atualizar cobranças:', updateError);
      throw new Error(`Erro ao atualizar cobranças: ${updateError.message}`);
    }
    
    console.log(`${data.length} cobranças foram atualizadas para o tipo CASH`);
    return { count: data.length };
  }
};

/**
 * Hook que retorna serviços de cobranças com isolamento por tenant
 * Este hook deve ser usado em componentes React para garantir
 * que todas as operações estejam vinculadas ao tenant correto
 */
export function useChargesService() {
  const { tenantId, createTenantQuery, isLoading, error } = useTenantQuery();
  
  const getCharges = async ({ 
    page = 1, 
    limit = 10, 
    searchTerm = "", 
    status = "all",
    type = "all",
    dateRange,
  }: GetChargesParams = {}) => {
    try {
      if (isLoading) {
        return { data: [], total: 0, isLoading: true };
      }
      
      if (error || !tenantId) {
        console.error("Erro no contexto de tenant:", error);
        return { data: [], total: 0, error };
      }
      
      // Otimização: Calcular a data atual uma única vez
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Iniciar query com filtro de tenant
      let query = supabase
        .from('charges')
        .select(`
          *,
          customers (
            id,
            name,
            cpf_cnpj,
            email,
            phone,
            company
          ),
          tipo
        `, { count: 'exact' })
        .eq('tenant_id', tenantId); // Filtro de tenant

      // Aplicar filtros
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase().trim();
        
        // Otimização: Usar subconsulta mais eficiente
        const { data: customerIds, error: customerQueryError } = await supabase
          .from('customers')
          .select('asaas_id')
          .eq('tenant_id', tenantId) // Filtro de tenant
          .or(`name.ilike.%${searchTermLower}%,cpf_cnpj.ilike.%${searchTermLower}%,company.ilike.%${searchTermLower}%`);
          
        if (customerQueryError) {
          console.error("Erro na busca de clientes:", customerQueryError);
        } else if (customerIds && customerIds.length > 0) {
          query = query.in('asaas_id', customerIds.map(c => c.asaas_id));
        } else if (searchTerm) {
          // Se não encontrou clientes mas tem termo de busca, buscar também na descrição da cobrança
          query = query.ilike('descricao', `%${searchTermLower}%`);
        }
      }

      // Aplicar os mesmos filtros da versão original
      // Filtros de status
      if (status && status !== 'all') {
        if (status === 'PENDING') {
          query = query
            .eq('status', 'PENDING')
            .gte('data_vencimento', today);
        } else if (status === 'OVERDUE') {
          query = query
            .eq('status', 'PENDING')
            .lt('data_vencimento', today);
        } else {
          query = query.eq('status', status);
        }
      }
      
      // Filtros de tipo
      if (type === 'CASH') {
        if (status && status !== 'all') {
          if (status === 'RECEIVED') {
            query = query.or('status.eq.RECEIVED,status.eq.RECEIVED_IN_CASH,tipo.eq.CASH');
          } else {
            query = query.eq('tipo', type);
          }
        } else {
          query = query.or('tipo.eq.CASH,status.eq.RECEIVED_IN_CASH');
        }
      } else if (type && type !== 'all') {
        query = query.eq('tipo', type);
      }

      // Filtros de data
      if (dateRange?.from && dateRange?.to) {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        query = query
          .gte('data_vencimento', fromDate)
          .lte('data_vencimento', toDate);
      } else if (dateRange?.from) {
        query = query.gte('data_vencimento', format(dateRange.from, 'yyyy-MM-dd'));
      } else if (dateRange?.to) {
        query = query.lte('data_vencimento', format(dateRange.to, 'yyyy-MM-dd'));
      }

      // Aplicar range de paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      // Primero aplicar ordenação, depois o range
      query = query.order('data_vencimento', { ascending: false });
      query = query.range(from, to);

      const { data, count, error: queryError } = await query;

      console.log("Consulta de cobranças com tenant:", { 
        tenantId,
        params: { page, limit, searchTerm, status, type, dateRange },
        resultCount: count || 0
      });

      if (queryError) {
        console.error("Erro na query:", queryError);
        throw queryError;
      }

      // Processar os dados para atualizar status de cobranças vencidas
      const processedData = data?.map(charge => {
        if (charge.status === 'PENDING' && charge.data_vencimento < today) {
          return {
            ...charge,
            status: 'OVERDUE'
          };
        }
        return charge;
      });

      return {
        data: processedData || [],
        total: count || 0
      };
    } catch (error) {
      console.error("Erro ao buscar cobranças:", error);
      return {
        data: [],
        total: 0,
        error
      };
    }
  };
  
  const getChargeById = async (id: string): Promise<Cobranca> => {
    if (!tenantId) throw new Error('Tenant ID não disponível');
    
    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;
    return data as unknown as Cobranca;
  };
  
  const updateCharge = async (id: string, data: Partial<Cobranca>): Promise<Cobranca> => {
    if (!tenantId) throw new Error('Tenant ID não disponível');
    
    let formattedData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    // Se a cobrança for marcada como recebida em dinheiro, atualize o tipo para CASH
    if (data.status === 'RECEIVED_IN_CASH') {
      formattedData = {
        ...formattedData,
        tipo: 'CASH'
      };
    }

    // Verificar se a cobrança pertence ao tenant
    const { data: existingCharge, error: getError } = await supabase
      .from('charges')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
      
    if (getError || !existingCharge) {
      throw new Error('Cobrança não encontrada ou não pertence ao tenant atual');
    }

    const { data: charge, error } = await supabase
      .from('charges')
      .update(formattedData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return charge as unknown as Cobranca;
  };
  
  const createCharge = async (data: Omit<Cobranca, 'id' | 'created_at' | 'updated_at'>): Promise<Cobranca> => {
    if (!tenantId) throw new Error('Tenant ID não disponível');
    
    const formattedData = {
      ...data,
      tenant_id: tenantId, // Adiciona tenant_id automaticamente
      status: data.status || 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Creating charge with formatted data:', formattedData);

    const { data: charge, error } = await supabase
      .from('charges')
      .insert([formattedData])
      .select()
      .single();

    if (error) throw error;
    return charge as unknown as Cobranca;
  };
  
  // Outros métodos podem ser adaptados da mesma forma
  
  // Retorna o serviço com os métodos adaptados
  return {
    getCharges,
    getChargeById,
    updateCharge,
    createCharge,
    // Adicione outros métodos conforme necessário
    isLoading,
    error
  };
}
