import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { importQueueService } from '../../services/importQueueService'
import { ImportErrorHandler } from '../../utils/importErrorHandler'
import { BatchProcessor } from '../../utils/batchProcessor'

// AIDEV-NOTE: Configuração de teste isolada para evitar interferência com dados de produção
const testSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const testSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
const testClient = createClient(testSupabaseUrl, testSupabaseKey)

// AIDEV-NOTE: Dados de teste para diferentes cenários
const TEST_DATA = {
  validCSV: `nome,email,telefone,documento
João Silva,joao@test.com,11999999999,12345678901
Maria Santos,maria@test.com,11888888888,98765432100
Pedro Costa,pedro@test.com,11777777777,11122233344`,
  
  invalidCSV: `nome,email,telefone,documento
,joao@invalid,invalid-phone,invalid-doc
Valid Name,valid@test.com,11999999999,12345678901
Another Invalid,,11777777777,`,
  
  largeCSV: generateLargeCSV(1000), // 1000 registros para teste de performance
  
  excelData: [
    ['nome', 'email', 'telefone', 'documento'],
    ['João Excel', 'joao.excel@test.com', '11999999999', '12345678901'],
    ['Maria Excel', 'maria.excel@test.com', '11888888888', '98765432100']
  ]
}

// AIDEV-NOTE: Gerador de dados para testes de volume
function generateLargeCSV(count: number): string {
  const header = 'nome,email,telefone,documento\n'
  const rows = Array.from({ length: count }, (_, i) => 
    `Usuário ${i + 1},usuario${i + 1}@test.com,1199999${String(i).padStart(4, '0')},${String(i + 1).padStart(11, '0')}`
  ).join('\n')
  return header + rows
}

describe('Sistema de Importação - Testes de Integração', () => {
  let testTenantId: string
  let testUserId: string
  let testJobIds: string[] = []

  beforeAll(async () => {
    // AIDEV-NOTE: Configuração de tenant e usuário de teste
    const { data: tenant, error: tenantError } = await testClient
      .from('tenants')
      .insert({
        name: 'Test Tenant Import',
        slug: 'test-tenant-import',
        status: 'active'
      })
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    const { data: user, error: userError } = await testClient
      .from('users')
      .insert({
        email: 'test-import@example.com',
        tenant_id: testTenantId,
        role: 'admin'
      })
      .select()
      .single()

    if (userError) throw userError
    testUserId = user.id

    // Inicializar serviços de teste
    await importQueueService.start()
  })

  afterAll(async () => {
    // AIDEV-NOTE: Limpeza completa dos dados de teste
    await importQueueService.stop()
    
    // Limpar jobs de teste
    if (testJobIds.length > 0) {
      await testClient
        .from('import_jobs')
        .delete()
        .in('id', testJobIds)
    }

    // Limpar dados de teste
    await testClient
      .from('users')
      .delete()
      .eq('tenant_id', testTenantId)

    await testClient
      .from('tenants')
      .delete()
      .eq('id', testTenantId)
  })

  beforeEach(async () => {
    // AIDEV-NOTE: Reset do estado da fila antes de cada teste
    await importQueueService.clearQueue()
  })

  afterEach(async () => {
    // AIDEV-NOTE: Limpeza de arquivos temporários após cada teste
    const tempFiles = await fs.readdir('./temp').catch(() => [])
    for (const file of tempFiles) {
      if (file.startsWith('test-')) {
        await fs.unlink(path.join('./temp', file)).catch(() => {})
      }
    }
  })

  describe('Processamento de Arquivos CSV', () => {
    it('deve processar arquivo CSV válido com sucesso', async () => {
      // AIDEV-NOTE: Teste básico de processamento CSV válido
      const filePath = await createTempFile('test-valid.csv', TEST_DATA.validCSV)
      
      const { data: job } = await testClient
        .from('import_jobs')
        .insert({
          tenant_id: testTenantId,
          user_id: testUserId,
          file_name: 'test-valid.csv',
          file_path: filePath,
          file_type: 'csv',
          status: 'pending'
        })
        .select()
        .single()

      testJobIds.push(job.id)

      // Processar job
      await importQueueService.addJob(job.id)
      
      // Aguardar processamento
      await waitForJobCompletion(job.id, 30000)

      // Verificar resultado
      const { data: completedJob } = await testClient
        .from('import_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      expect(completedJob.status).toBe('completed')
      expect(completedJob.total_records).toBe(3)
      expect(completedJob.processed_records).toBe(3)
      expect(completedJob.error_records).toBe(0)
    })

    it('deve lidar com arquivo CSV com erros de validação', async () => {
      // AIDEV-NOTE: Teste de tratamento de dados inválidos
      const filePath = await createTempFile('test-invalid.csv', TEST_DATA.invalidCSV)
      
      const { data: job } = await testClient
        .from('import_jobs')
        .insert({
          tenant_id: testTenantId,
          user_id: testUserId,
          file_name: 'test-invalid.csv',
          file_path: filePath,
          file_type: 'csv',
          status: 'pending'
        })
        .select()
        .single()

      testJobIds.push(job.id)

      await importQueueService.addJob(job.id)
      await waitForJobCompletion(job.id, 30000)

      const { data: completedJob } = await testClient
        .from('import_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      expect(completedJob.status).toBe('completed_with_errors')
      expect(completedJob.total_records).toBe(3)
      expect(completedJob.processed_records).toBe(1) // Apenas 1 registro válido
      expect(completedJob.error_records).toBe(2)
      expect(completedJob.error_details).toBeDefined()
    })

    it('deve processar arquivo CSV grande em lotes', async () => {
      // AIDEV-NOTE: Teste de processamento em lotes para grandes volumes
      const filePath = await createTempFile('test-large.csv', TEST_DATA.largeCSV)
      
      const { data: job } = await testClient
        .from('import_jobs')
        .insert({
          tenant_id: testTenantId,
          user_id: testUserId,
          file_name: 'test-large.csv',
          file_path: filePath,
          file_type: 'csv',
          status: 'pending'
        })
        .select()
        .single()

      testJobIds.push(job.id)

      const startTime = Date.now()
      await importQueueService.addJob(job.id)
      await waitForJobCompletion(job.id, 60000) // Timeout maior para arquivo grande

      const { data: completedJob } = await testClient
        .from('import_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      const processingTime = Date.now() - startTime

      expect(completedJob.status).toBe('completed')
      expect(completedJob.total_records).toBe(1000)
      expect(completedJob.processed_records).toBe(1000)
      expect(processingTime).toBeLessThan(60000) // Deve processar em menos de 1 minuto
    })
  })

  describe('Sistema de Filas', () => {
    it('deve processar múltiplos jobs em sequência', async () => {
      // AIDEV-NOTE: Teste de processamento sequencial de múltiplos jobs
      const jobs = []
      
      for (let i = 0; i < 3; i++) {
        const filePath = await createTempFile(`test-multi-${i}.csv`, TEST_DATA.validCSV)
        
        const { data: job } = await testClient
          .from('import_jobs')
          .insert({
            tenant_id: testTenantId,
            user_id: testUserId,
            file_name: `test-multi-${i}.csv`,
            file_path: filePath,
            file_type: 'csv',
            status: 'pending'
          })
          .select()
          .single()

        jobs.push(job)
        testJobIds.push(job.id)
        await importQueueService.addJob(job.id)
      }

      // Aguardar processamento de todos os jobs
      for (const job of jobs) {
        await waitForJobCompletion(job.id, 30000)
      }

      // Verificar que todos foram processados
      const { data: completedJobs } = await testClient
        .from('import_jobs')
        .select('*')
        .in('id', jobs.map(j => j.id))

      expect(completedJobs.every(job => job.status === 'completed')).toBe(true)
    })

    it('deve lidar com falhas e retry automático', async () => {
      // AIDEV-NOTE: Teste de sistema de retry em caso de falhas
      const filePath = await createTempFile('test-retry.csv', 'invalid,csv,format')
      
      const { data: job } = await testClient
        .from('import_jobs')
        .insert({
          tenant_id: testTenantId,
          user_id: testUserId,
          file_name: 'test-retry.csv',
          file_path: filePath,
          file_type: 'csv',
          status: 'pending'
        })
        .select()
        .single()

      testJobIds.push(job.id)

      await importQueueService.addJob(job.id)
      await waitForJobCompletion(job.id, 45000) // Tempo maior para permitir retries

      const { data: completedJob } = await testClient
        .from('import_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      // Job deve falhar após tentativas de retry
      expect(['failed', 'completed_with_errors']).toContain(completedJob.status)
      expect(completedJob.retry_count).toBeGreaterThan(0)
    })
  })

  describe('Monitoramento e Estatísticas', () => {
    it('deve fornecer estatísticas precisas da fila', async () => {
      // AIDEV-NOTE: Teste de precisão das estatísticas da fila
      const stats = await importQueueService.getStats()
      
      expect(stats).toHaveProperty('isRunning')
      expect(stats).toHaveProperty('queueSize')
      expect(stats).toHaveProperty('processingJob')
      expect(stats).toHaveProperty('totalProcessed')
      expect(stats).toHaveProperty('totalErrors')
      expect(typeof stats.isRunning).toBe('boolean')
      expect(typeof stats.queueSize).toBe('number')
    })

    it('deve rastrear progresso de jobs em tempo real', async () => {
      // AIDEV-NOTE: Teste de rastreamento de progresso em tempo real
      const filePath = await createTempFile('test-progress.csv', TEST_DATA.largeCSV)
      
      const { data: job } = await testClient
        .from('import_jobs')
        .insert({
          tenant_id: testTenantId,
          user_id: testUserId,
          file_name: 'test-progress.csv',
          file_path: filePath,
          file_type: 'csv',
          status: 'pending'
        })
        .select()
        .single()

      testJobIds.push(job.id)

      await importQueueService.addJob(job.id)

      // Verificar progresso durante processamento
      let progressChecks = 0
      const checkProgress = async () => {
        const { data: currentJob } = await testClient
          .from('import_jobs')
          .select('*')
          .eq('id', job.id)
          .single()

        if (currentJob.status === 'processing') {
          expect(currentJob.processed_records).toBeGreaterThanOrEqual(0)
          expect(currentJob.processed_records).toBeLessThanOrEqual(currentJob.total_records || 1000)
          progressChecks++
        }
      }

      // Verificar progresso a cada 500ms
      const progressInterval = setInterval(checkProgress, 500)
      
      await waitForJobCompletion(job.id, 60000)
      clearInterval(progressInterval)

      expect(progressChecks).toBeGreaterThan(0) // Deve ter capturado pelo menos um estado de progresso
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve classificar e tratar diferentes tipos de erro', async () => {
      // AIDEV-NOTE: Teste de classificação automática de erros
      const errorHandler = new ImportErrorHandler()
      
      // Teste de erro de validação
      const validationError = new Error('Invalid email format')
      const processedValidationError = errorHandler.handleError(validationError, {
        jobId: 'test-job',
        tenantId: testTenantId,
        operation: 'validation',
        recordIndex: 1
      })

      expect(processedValidationError.type).toBe('VALIDATION_ERROR')
      expect(processedValidationError.severity).toBe('medium')
      expect(processedValidationError.retryable).toBe(false)

      // Teste de erro de rede
      const networkError = new Error('Network timeout')
      const processedNetworkError = errorHandler.handleError(networkError, {
        jobId: 'test-job',
        tenantId: testTenantId,
        operation: 'database_insert',
        recordIndex: 1
      })

      expect(processedNetworkError.type).toBe('NETWORK_ERROR')
      expect(processedNetworkError.retryable).toBe(true)
    })

    it('deve implementar backoff exponencial para retries', async () => {
      // AIDEV-NOTE: Teste de estratégia de backoff exponencial
      const errorHandler = new ImportErrorHandler()
      
      const testError = new Error('Temporary database error')
      const context = {
        jobId: 'test-job',
        tenantId: testTenantId,
        operation: 'database_insert',
        recordIndex: 1
      }

      // Simular múltiplas tentativas
      const delays = []
      for (let attempt = 1; attempt <= 5; attempt++) {
        const processedError = errorHandler.handleError(testError, context)
        errorHandler.incrementRetry(processedError.id)
        
        const delay = errorHandler.calculateRetryDelay(processedError.type, attempt)
        delays.push(delay)
      }

      // Verificar que os delays aumentam exponencialmente
      expect(delays[1]).toBeGreaterThan(delays[0])
      expect(delays[2]).toBeGreaterThan(delays[1])
      expect(delays[3]).toBeGreaterThan(delays[2])
    })
  })
})

// AIDEV-NOTE: Funções utilitárias para os testes
async function createTempFile(fileName: string, content: string): Promise<string> {
  const tempDir = './temp'
  await fs.mkdir(tempDir, { recursive: true })
  
  const filePath = path.join(tempDir, fileName)
  await fs.writeFile(filePath, content, 'utf-8')
  
  return filePath
}

async function waitForJobCompletion(jobId: string, timeout: number = 30000): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const { data: job } = await testClient
      .from('import_jobs')
      .select('status')
      .eq('id', jobId)
      .single()

    if (['completed', 'failed', 'completed_with_errors'].includes(job.status)) {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error(`Job ${jobId} did not complete within ${timeout}ms`)
}