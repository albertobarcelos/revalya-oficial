import { supabase } from '@/lib/supabase';

export const aplicarTemplate = async (tenantId: string, templateId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
  try {
    // 1. Verificar se o template existe
    const { data: template, error: templateError } = await supabase
      .from('regua_cobranca_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError || !template) {
      return { 
        sucesso: false, 
        mensagem: 'Template não encontrado' 
      };
    }
    
    // 2. Buscar etapas do template
    const { data: etapasTemplate, error: etapasError } = await supabase
      .from('regua_cobranca_template_etapas')
      .select('*')
      .eq('template_id', templateId)
      .order('posicao', { ascending: true });
    
    if (etapasError || !etapasTemplate || etapasTemplate.length === 0) {
      return { 
        sucesso: false, 
        mensagem: 'O template não possui etapas definidas' 
      };
    }
    
    // 3. Verificar se o tenant já tem configuração de régua
    const { data: configExistente, error: configError } = await supabase
      .from('regua_cobranca_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    
    // 4. Criar ou atualizar a configuração da régua
    if (!configExistente) {
      const { error: insertError } = await supabase
        .from('regua_cobranca_config')
        .insert({
          tenant_id: tenantId,
          ativo: true,
          canal_whatsapp: true,
          canal_email: true,
          canal_sms: false
        });
      
      if (insertError) {
        return { 
          sucesso: false, 
          mensagem: 'Erro ao criar configuração da régua: ' + insertError.message 
        };
      }
    } else {
      // Atualizar a configuração para garantir que os canais necessários estejam ativos
      const canaisNecessarios = new Set(etapasTemplate.map(etapa => etapa.canal));
      
      const atualizacao: Record<string, boolean> = {};
      if (canaisNecessarios.has('whatsapp')) atualizacao.canal_whatsapp = true;
      if (canaisNecessarios.has('email')) atualizacao.canal_email = true;
      if (canaisNecessarios.has('sms')) atualizacao.canal_sms = true;
      
      const { error: updateError } = await supabase
        .from('regua_cobranca_config')
        .update({
          ...atualizacao,
          ativo: true
        })
        .eq('tenant_id', tenantId);
      
      if (updateError) {
        return { 
          sucesso: false, 
          mensagem: 'Erro ao atualizar configuração da régua: ' + updateError.message 
        };
      }
    }
    
    // 5. Remover etapas existentes
    const { error: deleteError } = await supabase
      .from('regua_cobranca_etapas')
      .delete()
      .eq('tenant_id', tenantId);
    
    if (deleteError) {
      return { 
        sucesso: false, 
        mensagem: 'Erro ao remover etapas existentes: ' + deleteError.message 
      };
    }
    
    // 6. Inserir novas etapas baseadas no template
    const novasEtapas = etapasTemplate.map((etapa, index) => ({
      tenant_id: tenantId,
      posicao: index + 1,
      gatilho: etapa.gatilho,
      dias: etapa.dias,
      canal: etapa.canal,
      mensagem: etapa.mensagem,
      ativo: true
    }));
    
    const { error: insertEtapasError } = await supabase
      .from('regua_cobranca_etapas')
      .insert(novasEtapas);
    
    if (insertEtapasError) {
      return { 
        sucesso: false, 
        mensagem: 'Erro ao criar novas etapas: ' + insertEtapasError.message 
      };
    }
    
    // Tudo ocorreu bem
    return { 
      sucesso: true, 
      mensagem: `Template "${template.nome}" aplicado com sucesso` 
    };
  } catch (error) {
    console.error('Erro ao aplicar template:', error);
    return { 
      sucesso: false, 
      mensagem: 'Ocorreu um erro inesperado: ' + error.message 
    };
  }
};

export const salvarComoTemplate = async (
  tenantId: string, 
  nome: string, 
  descricao: string
): Promise<{ sucesso: boolean; mensagem: string; templateId?: string }> => {
  try {
    // 1. Buscar etapas atuais do tenant
    const { data: etapas, error: etapasError } = await supabase
      .from('regua_cobranca_etapas')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('posicao', { ascending: true });
    
    if (etapasError || !etapas || etapas.length === 0) {
      return { 
        sucesso: false, 
        mensagem: 'Não há etapas configuradas para salvar como template' 
      };
    }
    
    // 2. Criar novo template
    const { data: novoTemplate, error: templateError } = await supabase
      .from('regua_cobranca_templates')
      .insert({
        nome,
        descricao,
        escopo: 'TENANT',
        tenant_id: tenantId
      })
      .select()
      .single();
    
    if (templateError || !novoTemplate) {
      return { 
        sucesso: false, 
        mensagem: 'Erro ao criar template: ' + (templateError?.message || 'Desconhecido') 
      };
    }
    
    // 3. Criar etapas do template baseadas nas etapas atuais
    const etapasTemplate = etapas.map((etapa, index) => ({
      template_id: novoTemplate.id,
      posicao: index + 1,
      gatilho: etapa.gatilho,
      dias: etapa.dias,
      canal: etapa.canal,
      mensagem: etapa.mensagem
    }));
    
    const { error: etapasTemplateError } = await supabase
      .from('regua_cobranca_template_etapas')
      .insert(etapasTemplate);
    
    if (etapasTemplateError) {
      // Se falhar na criação das etapas, remover o template criado
      await supabase
        .from('regua_cobranca_templates')
        .delete()
        .eq('id', novoTemplate.id);
      
      return { 
        sucesso: false, 
        mensagem: 'Erro ao criar etapas do template: ' + etapasTemplateError.message 
      };
    }
    
    return { 
      sucesso: true, 
      mensagem: 'Template criado com sucesso',
      templateId: novoTemplate.id
    };
  } catch (error) {
    console.error('Erro ao salvar como template:', error);
    return { 
      sucesso: false, 
      mensagem: 'Ocorreu um erro inesperado: ' + error.message 
    };
  }
};
