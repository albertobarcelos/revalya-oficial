import { SupabaseClient } from '@supabase/supabase-js';
import { AgenteIA, AgenteIAInsert, AgenteIAUpdate, AgenteIAMensagemRegua, AgenteIAMensagemReguaInsert, AgenteIAMensagemReguaUpdate, EtapaReguaComAgente } from '@/types/models/agente-ia';

/**
 * Serviço para gerenciar o agente de IA de cobrança por tenant
 */
export const AgenteIAService = {
  /**
   * Busca a configuração do agente IA do tenant atual
   */
  async buscarAgenteTenant(supabase: SupabaseClient, tenantId: string): Promise<AgenteIA | null> {
    try {
      const { data, error } = await supabase
        .from('agente_ia_empresa')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 é "não encontrado"
        console.error('Erro ao buscar agente IA:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar agente IA:', error);
      return null;
    }
  },

  /**
   * Cria uma nova configuração de agente IA para o tenant
   */
  async criarAgente(
    supabase: SupabaseClient, 
    dadosAgente: AgenteIAInsert
  ): Promise<{ data: AgenteIA | null; error: any }> {
    try {
      // Verificar se já existe um agente para esse tenant
      const agenteExistente = await this.buscarAgenteTenant(supabase, dadosAgente.tenant_id);
      
      if (agenteExistente) {
        return {
          data: null,
          error: { message: 'Já existe um agente configurado para este tenant' }
        };
      }

      const { data, error } = await supabase
        .from('agente_ia_empresa')
        .insert(dadosAgente)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Erro ao criar agente IA:', error);
      return { data: null, error };
    }
  },

  /**
   * Atualiza a configuração do agente IA existente
   */
  async atualizarAgente(
    supabase: SupabaseClient,
    dadosAgente: AgenteIAUpdate
  ): Promise<{ data: AgenteIA | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agente_ia_empresa')
        .update({
          nome_agente: dadosAgente.nome_agente,
          tom_de_voz: dadosAgente.tom_de_voz,
          exemplos_de_mensagem: dadosAgente.exemplos_de_mensagem,
          usa_emojis: dadosAgente.usa_emojis,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', dadosAgente.id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Erro ao atualizar agente IA:', error);
      return { data: null, error };
    }
  },

  /**
   * Salva a configuração do agente (cria ou atualiza)
   */
  async salvarAgente(
    supabase: SupabaseClient,
    dadosAgente: AgenteIAInsert | AgenteIAUpdate
  ): Promise<{ data: AgenteIA | null; error: any }> {
    try {
      // Verificar se é uma atualização (tem ID) ou criação
      if ('id' in dadosAgente && dadosAgente.id) {
        return this.atualizarAgente(supabase, dadosAgente as AgenteIAUpdate);
      } else {
        return this.criarAgente(supabase, dadosAgente as AgenteIAInsert);
      }
    } catch (error) {
      console.error('Erro ao salvar agente IA:', error);
      return { data: null, error };
    }
  },

  /**
   * Gera uma mensagem personalizada com base no contexto do cliente e da cobrança
   */
  gerarMensagemPersonalizada(
    mensagem: string, 
    contexto: Record<string, any>,
    usaEmojis: boolean
  ): string {
    let mensagemProcessada = mensagem;
    
    // Substituir variáveis no formato {{variavel}}
    Object.entries(contexto).forEach(([chave, valor]) => {
      mensagemProcessada = mensagemProcessada.replace(
        new RegExp(`{{${chave}}}`, 'g'), 
        String(valor)
      );
    });
    
    return mensagemProcessada;
  },

  /**
   * Retorna uma prévia da configuração do agente para visualização
   */
  gerarPrevia(nome: string, estilo: string, mensagens: string[], usaEmojis: boolean): string {
    let previa = `<div class="bg-muted p-4 rounded-lg">
      <div class="font-semibold mb-2">Agente: ${nome}</div>
      <div class="mb-2">Estilo: ${estilo}</div>
      <div class="mb-2">Mensagens Exemplo:</div>
      <ul class="space-y-2">`;
    
    mensagens.forEach(msg => {
      if (msg.trim()) {
        previa += `\n        <li class="bg-background p-2 rounded">"${msg}"</li>`;
      }
    });
    
    previa += `\n      </ul>
      <div class="mt-2">Emojis: ${usaEmojis ? 'Permitidos' : 'Não permitidos'}</div>
    </div>`;
    
    return previa;
  },

  /**
   * Busca mensagens personalizadas do agente para etapas da régua
   */
  async buscarMensagensRegua(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<AgenteIAMensagemRegua[]> {
    try {
      const { data, error } = await supabase
        .from('agente_ia_mensagens_regua')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar mensagens da régua:', error);
      return [];
    }
  },
  
  /**
   * Busca mensagem personalizada para uma etapa específica
   */
  async buscarMensagemEtapa(
    supabase: SupabaseClient,
    tenantId: string,
    etapaId: string
  ): Promise<AgenteIAMensagemRegua | null> {
    try {
      const { data, error } = await supabase
        .from('agente_ia_mensagens_regua')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('etapa_regua_id', etapaId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar mensagem da etapa:', error);
      return null;
    }
  },
  
  /**
   * Salva uma mensagem personalizada para uma etapa da régua
   */
  async salvarMensagemEtapa(
    supabase: SupabaseClient,
    mensagem: AgenteIAMensagemReguaInsert | AgenteIAMensagemReguaUpdate
  ): Promise<{ data: AgenteIAMensagemRegua | null; error: any }> {
    try {
      // Verificar se é uma atualização (tem ID) ou criação
      if ('id' in mensagem && mensagem.id) {
        const { data, error } = await supabase
          .from('agente_ia_mensagens_regua')
          .update({
            mensagem: mensagem.mensagem,
            variaveis_contexto: mensagem.variaveis_contexto,
            personalizado: mensagem.personalizado,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', mensagem.id)
          .select()
          .single();
        
        return { data, error };
      } else {
        const { data, error } = await supabase
          .from('agente_ia_mensagens_regua')
          .insert(mensagem)
          .select()
          .single();
        
        return { data, error };
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem da etapa:', error);
      return { data: null, error };
    }
  },
  
  /**
   * Busca etapas da régua com mensagens personalizadas do agente (integrado)
   */
  async buscarEtapasComAgente(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<EtapaReguaComAgente[]> {
    try {
      // Primeiro buscamos todas as etapas da régua
      const { data: etapas, error: etapasError } = await supabase
        .from('regua_cobranca_etapas')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('posicao', { ascending: true });
        
      if (etapasError) throw etapasError;
      
      if (!etapas || etapas.length === 0) {
        return [];
      }
      
      // Em seguida, buscamos todas as mensagens personalizadas
      const { data: mensagens, error: mensagensError } = await supabase
        .from('agente_ia_mensagens_regua')
        .select('*')
        .eq('tenant_id', tenantId);
        
      if (mensagensError) throw mensagensError;
      
      // Mapeamos as etapas para o formato integrado
      return etapas.map(etapa => {
        // Buscamos a mensagem personalizada, se existir
        const mensagemPersonalizada = mensagens?.find(m => m.etapa_regua_id === etapa.id);
        
        return {
          etapa_id: etapa.id,
          posicao: etapa.posicao,
          gatilho: etapa.gatilho,
          dias: etapa.dias,
          canal: etapa.canal,
          mensagem_agente: mensagemPersonalizada?.mensagem || '',
          personalizado: !!mensagemPersonalizada?.personalizado,
          ativo: etapa.ativo
        };
      });
    } catch (error) {
      console.error('Erro ao buscar etapas com agente:', error);
      return [];
    }
  },
  
  /**
   * Retorna uma prévia da mensagem do agente para uma etapa da régua
   */
  gerarPreviaMensagemEtapa(
    etapa: EtapaReguaComAgente,
    nomeAgente: string,
    tomDeVoz: string,
    usaEmojis: boolean
  ): string {
    const mensagem = etapa.mensagem_agente || "Nenhuma mensagem configurada";
    const tipo = etapa.personalizado ? "personalizada" : "não configurada"; 
    const canalNome = this.getNomeCanalRegua(etapa.canal);
    const gatilhoNome = this.getNomeGatilhoRegua(etapa.gatilho, etapa.dias);
    
    return `<div class="bg-muted p-4 rounded-lg">
      <div class="font-semibold mb-2">Agente: ${nomeAgente}</div>
      <div class="text-sm mb-2">Etapa ${etapa.posicao}: ${gatilhoNome} | Canal: ${canalNome}</div>
      <div class="text-sm mb-2">Mensagem ${tipo}:</div>
      <div class="bg-background p-2 rounded">"${mensagem}"</div>
    </div>`;
  },
  
  /**
   * Retorna o nome formatado do canal
   */
  getNomeCanalRegua(canal: string): string {
    switch (canal) {
      case 'whatsapp': return 'WhatsApp';
      case 'email': return 'E-mail';
      case 'sms': return 'SMS';
      default: return canal;
    }
  },
  
  /**
   * Retorna o nome formatado do gatilho
   */
  getNomeGatilhoRegua(gatilho: string, dias: number): string {
    if (gatilho === 'antes_vencimento') {
      return `${dias} dia${dias > 1 ? 's' : ''} antes do vencimento`;
    } else if (gatilho === 'no_vencimento') {
      return 'No dia do vencimento';
    } else {
      return `${dias} dia${dias > 1 ? 's' : ''} após o vencimento`;
    }
  }
};

export default AgenteIAService;
