export const citiesService = {
  async searchCities(search: string): Promise<Array<{ id: string; name: string; state: string }>> {
    try {
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/cities?search=${encodeURIComponent(search)}`);
      if (!response.ok) throw new Error('Falha ao buscar cidades');
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar cidades:', error);
      return [];
    }
  },

  async getCepInfo(cep: string): Promise<{
    logradouro: string;
    cidade: string;
    estado: string;
  } | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/cep?cep=${cep}`);
      if (!response.ok) throw new Error('CEP não encontrado');
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return null;
    }
  }
}; 
