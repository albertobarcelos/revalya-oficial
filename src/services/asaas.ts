import type { CreateCustomerDTO } from '@/types/asaas';
import { supabase } from '@/lib/supabase';

class AsaasService {
  private proxyUrl: string;
  private cityCache: Map<string, string>;
  private requestTimeout: number = 15000; // 15 segundos

  constructor() {
    this.proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-proxy`;
    this.cityCache = new Map<string, string>();
    console.log('Asaas Service initialized:', {
      proxyUrl: this.proxyUrl
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, tenantId?: string): Promise<T> {
    try {
      // Adicionar timeout para evitar requisições penduradas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      // Obter token de autenticação do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...options.headers,
      };
      
      // AIDEV-NOTE: Verificação via MCP Supabase confirmou que a integração ASAAS está ativa
      // para o tenant 8d2888f1-64a5-445f-84f5-2614d5160251 com credenciais válidas
      // Passando tenant_id no body conforme esperado pela Edge Function
      
      const response = await fetch(`${this.proxyUrl}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          path: endpoint, // ✅ Corrigido: usar 'path' em vez de 'endpoint'
          method: options.method || 'GET',
          data: options.body ? JSON.parse(options.body as string) : undefined,
          params: undefined, // ✅ Adicionado campo params esperado pela função Edge
          tenant_id: tenantId // ✅ Tenant ID verificado via MCP Supabase
        }),
        signal: controller.signal
      });
      
      // Limpar o timeout após a resposta
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na resposta do Asaas [${response.status}]:`, errorText);
        throw new Error(`Asaas API error: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Resposta não-JSON do Asaas:', text);
        throw new Error('Resposta inválida do Asaas');
      }

      return response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('Requisição ao Asaas abortada por timeout');
        throw new Error('Timeout na requisição ao Asaas');
      }
      
      console.error('Erro na requisição ao Asaas:', error);
      throw error;
    }
  }



  async getAllCustomers(tenantId?: string, offset: number = 0, limit: number = 20): Promise<{ data: any[], hasMore: boolean, totalCount: number }> {
    try {
      const response = await this.request<{ data: any[], hasMore: boolean, totalCount: number }>(`/customers?offset=${offset}&limit=${limit}`, {}, tenantId);
      
      // AIDEV-NOTE: Debug para verificar estrutura dos dados retornados pela API ASAAS
      if (response.data && response.data.length > 0) {
        const firstClient = response.data[0];
        console.log('🔍 [DEBUG][AsaasService] Primeiro cliente da API:', firstClient);
        console.log('🔍 [DEBUG][AsaasService] Campos disponíveis:', Object.keys(firstClient));
        
        // AIDEV-NOTE: Procurando pelo bairro "Morado dos ipes" em todos os campos
        console.log('🔍 [DEBUG][AsaasService] === BUSCA PELO BAIRRO "Morado dos ipes" ===');
        Object.keys(firstClient).forEach(key => {
          const value = firstClient[key];
          console.log(`🔍 [DEBUG][AsaasService] ${key}:`, value);
          if (typeof value === 'string' && value.toLowerCase().includes('morado')) {
            console.log(`🎯 [ENCONTRADO] Campo "${key}" contém "morado":`, value);
          }
        });
        console.log('🔍 [DEBUG][AsaasService] === FIM DA BUSCA ===');
      }
      
      return {
        data: response.data || [],
        hasMore: response.hasMore || false,
        totalCount: response.totalCount || 0
      };
    } catch (error) {
      console.error('Erro ao buscar todos os clientes:', error);
      throw error;
    }
  }

  async getAllCustomersWithPagination(tenantId?: string, limit: number = 20): Promise<any[]> {
    try {
      let allCustomers: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.getAllCustomers(tenantId, offset, limit);
        allCustomers = [...allCustomers, ...response.data];
        hasMore = response.hasMore;
        offset += limit;
        
        // Limite de segurança para evitar loops infinitos
        if (allCustomers.length > 10000) {
          console.warn('Limite de segurança atingido: mais de 10.000 clientes');
          break;
        }
      }

      return allCustomers;
    } catch (error) {
      console.error('Erro ao buscar todos os clientes com paginação:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, data: Partial<CreateCustomerDTO>, tenantId?: string): Promise<any> {
    if (!id) {
      throw new Error('ID do cliente é obrigatório para atualização');
    }
    
    try {
      if (data.city) {
        try {
          const cityId = await this.findCityId(data.city, tenantId);
          if (cityId) {
            data.city = cityId;
          }
        } catch (error) {
          console.error('Erro ao buscar código da cidade:', error);
          // Continua com a atualização mesmo se a cidade não for encontrada
        }
      }

      return this.request(`/customers/${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }, tenantId);
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${id}:`, error);
      throw error;
    }
  }

  async getCityInfo(cityId: string, tenantId?: string): Promise<{ id: string; name: string; state: string }> {
    if (!cityId) {
      throw new Error('ID da cidade é obrigatório');
    }
    
    try {
      return await this.request(`/cities/${cityId}`, {}, tenantId);
    } catch (error) {
      console.error(`Erro ao buscar informações da cidade ${cityId}:`, error);
      throw error;
    }
  }

  async findCityId(cityName: string, tenantId?: string): Promise<string | null> {
    if (!cityName) {
      return null;
    }
    
    // Normalizar o nome da cidade para busca no cache
    const normalizedCityName = cityName.toLowerCase().trim();
    
    // Verificar se já temos esta cidade em cache
    if (this.cityCache.has(normalizedCityName)) {
      return this.cityCache.get(normalizedCityName) || null;
    }
    
    try {
      const response = await this.request<any>(`/cities?name=${encodeURIComponent(normalizedCityName)}`, {}, tenantId);
      
      if (response && response.data && response.data.length > 0) {
        const cityId = response.data[0].id;
        
        // Armazenar no cache para futuras consultas
        this.cityCache.set(normalizedCityName, cityId);
        
        return cityId;
      }
      
      return null;
    } catch (error) {
      console.error(`Erro ao buscar cidade "${cityName}":`, error);
      return null;
    }
  }
  
  // Método para limpar o cache de cidades (útil para testes ou quando necessário)
  clearCityCache(): void {
    this.cityCache.clear();
  }

  /**
   * Cancela um pagamento no Asaas
   */
  async cancelPayment(id: string, tenantId?: string): Promise<any> {
    if (!id) {
      throw new Error('ID do pagamento é obrigatório para cancelamento');
    }

    try {
      return this.request(`/payments/${id}/cancel`, {
        method: 'POST'
      }, tenantId);
    } catch (error) {
      console.error(`Erro ao cancelar pagamento ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cria um novo cliente no Asaas
   */
  async createCustomer(data: CreateCustomerDTO, tenantId?: string): Promise<any> {
    try {
      // Se tiver cidade, tenta encontrar o ID da cidade no Asaas
      if (data.city) {
        try {
          const cityId = await this.findCityId(data.city, tenantId);
          if (cityId) {
            data.city = cityId;
          }
        } catch (error) {
          console.error('Erro ao buscar código da cidade:', error);
          // Continua com a criação mesmo se a cidade não for encontrada
        }
      }

      return this.request('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }, tenantId);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  }
}

export const asaasService = new AsaasService();
