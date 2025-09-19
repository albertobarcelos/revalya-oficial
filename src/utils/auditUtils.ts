import { SupabaseClient } from '@supabase/supabase-js';
import { auditService } from '@/services/auditService';

/**
 * Utilitário para testar a funcionalidade de auditoria
 */
export const auditTestUtils = {
  /**
   * Testa se o sistema de auditoria está funcionando corretamente
   * @param supabase Cliente Supabase
   * @returns Resultado do teste
   */
  async testAuditSystem(supabase: SupabaseClient): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Verificar se a tabela de auditoria existe
      const { count, error: countError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        return {
          success: false,
          message: 'Falha ao acessar a tabela de auditoria',
          details: countError
        };
      }

      // Criar um registro de teste na auditoria
      const testId = crypto.randomUUID();
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          entity_type: 'audit_test',
          entity_id: testId,
          action: 'CUSTOM',
          new_data: {
            test: true,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        return {
          success: false,
          message: 'Falha ao inserir log de teste',
          details: logError
        };
      }

      // Testar o método de API do serviço
      const { success, error } = await auditService.logCustomAction(
        supabase,
        'audit_test',
        testId,
        'API_TEST',
        { api_test: true },
        null
      );

      if (!success) {
        return {
          success: false,
          message: 'Falha ao testar API de auditoria',
          details: error
        };
      }

      // Verificar se conseguimos ler os logs
      const { data, error: readError } = await auditService.getLogs(
        supabase,
        { 
          entityType: 'audit_test',
          entityId: testId
        }
      );

      if (readError) {
        return {
          success: false,
          message: 'Falha ao ler logs de teste',
          details: readError
        };
      }

      const logsFound = data && data.length > 0;

      return {
        success: logsFound,
        message: logsFound 
          ? 'Sistema de auditoria funcionando corretamente' 
          : 'Logs não foram encontrados',
        details: { 
          logsFound,
          testId, 
          data 
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao testar sistema de auditoria',
        details: error
      };
    }
  }
};
