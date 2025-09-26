/**
 * Microserviço de Importação de Clientes
 * Responsável pela inserção de dados na tabela customers do Supabase
 * 
 * @module ImportService
 */

import { supabase } from '@/lib/supabase';
import type { Customer } from '@/types/database';

// AIDEV-NOTE: Interface para dados do cliente na importação
interface CustomerImportData {
  name: string;
  email: string;
  phone: string;
  cpfCnpj?: string;
  cpf_cnpj?: string;
  postal_code?: string;
  address?: string;
  addressNumber?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  cityName?: string;
  state?: string;
  company?: string;
  country?: string;
  [key: string]: any;
}

// AIDEV-NOTE: Interface para resultado da importação
interface ImportResult {
  success: Customer[];
  errors: ImportError[];
  total: number;
}

// AIDEV-NOTE: Interface para erros de importação
interface ImportError {
  record: CustomerImportData;
  error: string;
  code?: string;
  details?: any;
}

// AIDEV-NOTE: Interface para callback de progresso
interface ImportProgress {
  current: number;
  status: string;
  currentRecord?: CustomerImportData;
  errors: ImportError[];
  success: Customer[];
}

type ProgressCallback = (progress: ImportProgress) => void;

class ImportService {
  private tenantId: string | null = null;
  private userId: string | null = null;

  /**
   * AIDEV-NOTE: Inicializar contexto de autenticação e tenant
   */
  private async initializeContext(): Promise<void> {
    // Verificar autenticação
    const authResponse = await supabase.auth.getUser();
    
    if (!authResponse.data.user || !authResponse.data.user.id) {
      throw new Error('Usuário não autenticado ou ID do usuário não disponível');
    }
    
    this.userId = authResponse.data.user.id;
    
    // Obter tenant do usuário
    const { data: userTenants, error: tenantsError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', this.userId)
      .limit(1);
      
    if (tenantsError) {
      throw new Error(`Erro ao obter tenant: ${tenantsError.message}`);
    }
    
    if (!userTenants || userTenants.length === 0) {
      throw new Error('Usuário não possui nenhum tenant associado');
    }
    
    this.tenantId = userTenants[0].tenant_id;
  }

  /**
   * AIDEV-NOTE: Formatar dados do cliente para inserção
   */
  private formatCustomerData(clientData: CustomerImportData): any {
    return {
      name: clientData.name?.trim(),
      cpf_cnpj: clientData.cpfCnpj || clientData.cpf_cnpj,
      email: clientData.email?.trim().toLowerCase(),
      phone: clientData.phone?.trim(),
      company: clientData.company?.trim(),
      active: true,
      tenant_id: this.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Dados de endereço com fallbacks
      address: clientData.address?.trim(),
      address_number: clientData.address_number || clientData.addressNumber,
      complement: clientData.complement?.trim(),
      neighborhood: clientData.neighborhood?.trim(),
      postal_code: clientData.postal_code?.trim(),
      city: clientData.city || clientData.cityName,
      state: clientData.state?.trim(),
      country: clientData.country?.trim() || 'Brasil',
    };
  }

  /**
   * AIDEV-NOTE: Validar dados obrigatórios
   */
  private validateCustomerData(clientData: CustomerImportData): string | null {
    if (!clientData.name?.trim()) {
      return 'Nome é obrigatório';
    }
    
    if (!clientData.email?.trim()) {
      return 'Email é obrigatório';
    }
    
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.email.trim())) {
      return 'Email inválido';
    }
    
    return null;
  }

  /**
   * AIDEV-NOTE: Inserir um único cliente
   */
  private async insertSingleCustomer(clientData: CustomerImportData): Promise<Customer> {
    // Validar dados
    const validationError = this.validateCustomerData(clientData);
    if (validationError) {
      throw new Error(validationError);
    }

    // Formatar dados
    const formattedData = this.formatCustomerData(clientData);

    // Inserir no Supabase
    const { data: newClient, error } = await supabase
      .from('customers')
      .insert(formattedData)
      .select()
      .single();

    if (error) {
      // AIDEV-NOTE: Tratar erros específicos do Supabase
      if (error.code === '23505') {
        throw new Error('Cliente já existe (email duplicado)');
      }
      throw new Error(`Erro na inserção: ${error.message}`);
    }

    return newClient;
  }

  /**
   * AIDEV-NOTE: Importar múltiplos clientes com callback de progresso
   */
  async importCustomers(
    customersData: CustomerImportData[], 
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    console.log('🔍 [ImportService] Iniciando importação de', customersData.length, 'clientes');
    
    // Inicializar contexto
    await this.initializeContext();
    
    const result: ImportResult = {
      success: [],
      errors: [],
      total: customersData.length
    };

    // AIDEV-NOTE: Processar cada cliente individualmente
    for (let i = 0; i < customersData.length; i++) {
      const clientData = customersData[i];
      
      try {
        // Callback de progresso
        if (onProgress) {
          onProgress({
            current: i + 1,
            status: `Processando cliente ${i + 1} de ${customersData.length}`,
            currentRecord: clientData,
            errors: result.errors,
            success: result.success
          });
        }

        // Inserir cliente
        const newClient = await this.insertSingleCustomer(clientData);
        result.success.push(newClient);
        
        console.log('✅ [ImportService] Cliente inserido:', newClient.name);
        
        // AIDEV-NOTE: Pequeno delay para não sobrecarregar o banco
        if (i < customersData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        const importError: ImportError = {
          record: clientData,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          details: error
        };
        
        result.errors.push(importError);
        console.error('❌ [ImportService] Erro ao inserir cliente:', clientData.name, error);
      }
    }

    // Callback final
    if (onProgress) {
      onProgress({
        current: customersData.length,
        status: `Importação concluída: ${result.success.length} sucessos, ${result.errors.length} erros`,
        errors: result.errors,
        success: result.success
      });
    }

    console.log('🔍 [ImportService] Importação finalizada:', {
      total: result.total,
      sucessos: result.success.length,
      erros: result.errors.length
    });

    return result;
  }

  /**
   * AIDEV-NOTE: Importar em lotes (batch) para melhor performance
   */
  async importCustomersBatch(
    customersData: CustomerImportData[], 
    batchSize: number = 10,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    console.log('🔍 [ImportService] Iniciando importação em lotes de', batchSize);
    
    // Inicializar contexto
    await this.initializeContext();
    
    const result: ImportResult = {
      success: [],
      errors: [],
      total: customersData.length
    };

    // AIDEV-NOTE: Dividir em lotes
    const batches = [];
    for (let i = 0; i < customersData.length; i += batchSize) {
      batches.push(customersData.slice(i, i + batchSize));
    }

    // AIDEV-NOTE: Processar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        // Callback de progresso
        if (onProgress) {
          onProgress({
            current: batchIndex * batchSize,
            status: `Processando lote ${batchIndex + 1} de ${batches.length}`,
            errors: result.errors,
            success: result.success
          });
        }

        // Formatar dados do lote
        const formattedBatch = batch.map(clientData => {
          const validationError = this.validateCustomerData(clientData);
          if (validationError) {
            result.errors.push({
              record: clientData,
              error: validationError
            });
            return null;
          }
          return this.formatCustomerData(clientData);
        }).filter(Boolean);

        if (formattedBatch.length === 0) continue;

        // Inserir lote
        const { data: newClients, error } = await supabase
          .from('customers')
          .insert(formattedBatch)
          .select();

        if (error) {
          // AIDEV-NOTE: Em caso de erro no lote, processar individualmente
          console.warn('⚠️ [ImportService] Erro no lote, processando individualmente:', error.message);
          
          for (const clientData of batch) {
            try {
              const newClient = await this.insertSingleCustomer(clientData);
              result.success.push(newClient);
            } catch (individualError) {
              result.errors.push({
                record: clientData,
                error: individualError instanceof Error ? individualError.message : 'Erro desconhecido'
              });
            }
          }
        } else {
          result.success.push(...(newClients || []));
        }
        
      } catch (error) {
        console.error('❌ [ImportService] Erro no lote:', error);
        
        // AIDEV-NOTE: Processar individualmente em caso de erro no lote
        for (const clientData of batch) {
          try {
            const newClient = await this.insertSingleCustomer(clientData);
            result.success.push(newClient);
          } catch (individualError) {
            result.errors.push({
              record: clientData,
              error: individualError instanceof Error ? individualError.message : 'Erro desconhecido'
            });
          }
        }
      }
    }

    // Callback final
    if (onProgress) {
      onProgress({
        current: customersData.length,
        status: `Importação em lotes concluída: ${result.success.length} sucessos, ${result.errors.length} erros`,
        errors: result.errors,
        success: result.success
      });
    }

    console.log('🔍 [ImportService] Importação em lotes finalizada:', {
      total: result.total,
      sucessos: result.success.length,
      erros: result.errors.length
    });

    return result;
  }

  /**
   * AIDEV-NOTE: Verificar duplicatas antes da importação
   */
  async checkDuplicates(customersData: CustomerImportData[]): Promise<{
    duplicates: string[];
    unique: CustomerImportData[];
  }> {
    await this.initializeContext();
    
    const emails = customersData.map(c => c.email?.trim().toLowerCase()).filter(Boolean);
    
    if (emails.length === 0) {
      return { duplicates: [], unique: customersData };
    }

    // Verificar emails existentes
    const { data: existingCustomers, error } = await supabase
      .from('customers')
      .select('email')
      .eq('tenant_id', this.tenantId)
      .in('email', emails);

    if (error) {
      console.warn('⚠️ [ImportService] Erro ao verificar duplicatas:', error.message);
      return { duplicates: [], unique: customersData };
    }

    const existingEmails = new Set(
      (existingCustomers || []).map(c => c.email?.toLowerCase())
    );

    const duplicates: string[] = [];
    const unique: CustomerImportData[] = [];

    customersData.forEach(customer => {
      const email = customer.email?.trim().toLowerCase();
      if (email && existingEmails.has(email)) {
        duplicates.push(email);
      } else {
        unique.push(customer);
      }
    });

    return { duplicates, unique };
  }
}

// AIDEV-NOTE: Exportar instância singleton
export const importService = new ImportService();

// AIDEV-NOTE: Exportar tipos para uso em outros módulos
export type { 
  CustomerImportData, 
  ImportResult, 
  ImportError, 
  ImportProgress, 
  ProgressCallback 
};