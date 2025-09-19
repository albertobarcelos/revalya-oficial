import type { CreateCustomerDTO } from '@/types/asaas';

class AsaasService {
  private proxyUrl: string;
  private cityCache: Map<string, string>;
  private requestTimeout: number = 15000; // 15 segundos

  constructor() {
    this.proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-proxy`;
    this.cityCache = new Map<string, string>();
    console.log('Asaas Service initialized with proxy URL:', this.proxyUrl);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      // Adicionar timeout para evitar requisições penduradas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      const response = await fetch(`${this.proxyUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify({
          endpoint,
          method: options.method || 'GET',
          data: options.body ? JSON.parse(options.body as string) : undefined
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

  async getAllCustomers(): Promise<any[]> {
    try {
      const response = await this.request<{ data: any[] }>('/customers');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar todos os clientes:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, data: Partial<CreateCustomerDTO>): Promise<any> {
    if (!id) {
      throw new Error('ID do cliente é obrigatório para atualização');
    }
    
    try {
      if (data.city) {
        try {
          const cityId = await this.findCityId(data.city);
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
      });
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${id}:`, error);
      throw error;
    }
  }

  async getCityInfo(cityId: string): Promise<{ id: string; name: string; state: string }> {
    if (!cityId) {
      throw new Error('ID da cidade é obrigatório');
    }
    
    try {
      return await this.request(`/cities/${cityId}`);
    } catch (error) {
      console.error(`Erro ao buscar informações da cidade ${cityId}:`, error);
      throw error;
    }
  }

  async findCityId(cityName: string): Promise<string | null> {
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
      const response = await this.request<any>(`/cities?name=${encodeURIComponent(normalizedCityName)}`);
      
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
  async cancelPayment(id: string): Promise<any> {
    if (!id) {
      throw new Error('ID do pagamento é obrigatório para cancelamento');
    }

    try {
      return this.request(`/payments/${id}/cancel`, {
        method: 'POST'
      });
    } catch (error) {
      console.error(`Erro ao cancelar pagamento ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cria um novo cliente no Asaas
   */
  async createCustomer(data: CreateCustomerDTO): Promise<any> {
    try {
      // Se tiver cidade, tenta encontrar o ID da cidade no Asaas
      if (data.city) {
        try {
          const cityId = await this.findCityId(data.city);
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
      });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  }
}

export const asaasService = new AsaasService();
