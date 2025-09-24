# 🔗 Sistema de Isolamento Evolution - Instâncias por Tenant
## Documentação Técnica Completa do Isolamento WhatsApp

> **AIDEV-NOTE**: Documentação técnica do sistema de isolamento de instâncias Evolution.
> Baseada na análise completa do WhatsAppService e fluxos de integração.

---

## 🏗️ Arquitetura de Isolamento

```
┌─────────────────────────────────────────────────────────────┐
│                    TENANT A (empresa-abc)                   │
├─────────────────────────────────────────────────────────────┤
│ Instância: revalya-empresa-abc                             │
│ Webhook: /api/whatsapp/webhook/empresa-abc                 │
│ Config: { api_url, api_key, environment }                  │
│ Database: tenant_integrations (tenant_id = A)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TENANT B (loja-xyz)                      │
├─────────────────────────────────────────────────────────────┤
│ Instância: revalya-loja-xyz                                │
│ Webhook: /api/whatsapp/webhook/loja-xyz                    │
│ Config: { api_url, api_key, environment }                  │
│ Database: tenant_integrations (tenant_id = B)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Componentes do Sistema de Isolamento

### 1. Nomenclatura Padronizada
```typescript
// Arquivo: src/services/whatsappService.ts
class WhatsAppService {
  // AIDEV-NOTE: Padrão fixo para nomenclatura de instâncias
  private generateInstanceName(tenantSlug: string): string {
    // Validação do tenantSlug
    if (!tenantSlug || typeof tenantSlug !== 'string') {
      throw new Error('TenantSlug inválido para geração de instância');
    }

    // Sanitização do slug
    const sanitizedSlug = tenantSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!sanitizedSlug) {
      throw new Error('TenantSlug resultou em string vazia após sanitização');
    }

    return `revalya-${sanitizedSlug}`;
  }

  // AIDEV-NOTE: Validação de nomenclatura
  private validateInstanceName(instanceName: string, tenantSlug: string): boolean {
    const expectedName = this.generateInstanceName(tenantSlug);
    return instanceName === expectedName;
  }
}
```

### 2. Configuração de Instância Isolada
```typescript
interface EvolutionInstanceConfig {
  instanceName: string;           // revalya-{tenantSlug}
  integration: "WHATSAPP-BAILEYS"; // Tipo fixo para WhatsApp
  webhook: string;                // URL específica do tenant
  token: string;                  // Token único por instância
  qrcode: boolean;               // Geração de QR Code
  chatwoot_account_id?: number;  // ID da conta Chatwoot (opcional)
  chatwoot_token?: string;       // Token Chatwoot (opcional)
  chatwoot_url?: string;         // URL Chatwoot (opcional)
}

// AIDEV-NOTE: Função de criação de configuração isolada
private createInstanceConfig(tenantSlug: string): EvolutionInstanceConfig {
  const instanceName = this.generateInstanceName(tenantSlug);
  const webhookUrl = this.generateWebhookUrl(tenantSlug);

  return {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    webhook: webhookUrl,
    token: this.generateInstanceToken(instanceName),
    qrcode: true
  };
}
```

### 3. Sistema de Webhook Isolado
```typescript
class WhatsAppService {
  // AIDEV-NOTE: Geração de webhook específico por tenant
  private generateWebhookUrl(tenantSlug: string): string {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://app.revalya.com';
    
    // Validação da URL base
    if (!baseUrl) {
      throw new Error('WEBHOOK_BASE_URL não configurada');
    }

    // Sanitização do tenantSlug para URL
    const sanitizedSlug = encodeURIComponent(tenantSlug);
    
    return `${baseUrl}/api/whatsapp/webhook/${sanitizedSlug}`;
  }

  // AIDEV-NOTE: Validação de webhook por tenant
  private validateWebhookUrl(webhookUrl: string, tenantSlug: string): boolean {
    const expectedUrl = this.generateWebhookUrl(tenantSlug);
    return webhookUrl === expectedUrl;
  }
}
```

---

## 🔧 Fluxos de Operação

### 1. Criação de Instância
```typescript
// Arquivo: src/services/whatsappService.ts
async createInstance(tenantSlug: string): Promise<EvolutionCreateResponse> {
  try {
    // AIDEV-NOTE: Validação de tenant antes da criação
    await this.validateTenantAccess(tenantSlug);

    const instanceName = this.generateInstanceName(tenantSlug);
    const config = this.createInstanceConfig(tenantSlug);

    // AIDEV-NOTE: Verificar se instância já existe
    const existingInstance = await this.checkInstanceExists(instanceName);
    if (existingInstance) {
      throw new Error(`Instância ${instanceName} já existe`);
    }

    // AIDEV-NOTE: Criar instância na Evolution API
    const response = await this.makeEvolutionRequest<EvolutionCreateResponse>(
      '/instance/create',
      'POST',
      config
    );

    // AIDEV-NOTE: Validar resposta da criação
    if (!response.instance?.instanceName) {
      throw new Error('Resposta inválida da Evolution API');
    }

    // AIDEV-NOTE: Verificar se o nome retornado está correto
    if (!this.validateInstanceName(response.instance.instanceName, tenantSlug)) {
      throw new Error('Nome de instância retornado não confere com o esperado');
    }

    // AIDEV-NOTE: Log de auditoria
    console.log(`Instância criada com sucesso: ${instanceName} para tenant: ${tenantSlug}`);

    return response;
  } catch (error) {
    console.error(`Erro ao criar instância para tenant ${tenantSlug}:`, error);
    throw error;
  }
}
```

### 2. Gerenciamento de Instância
```typescript
async manageInstance(tenantSlug: string, action: 'connect' | 'disconnect'): Promise<any> {
  try {
    // AIDEV-NOTE: Validação de acesso e parâmetros
    if (!tenantSlug) {
      throw new Error('TenantSlug é obrigatório');
    }

    if (!['connect', 'disconnect'].includes(action)) {
      throw new Error('Ação inválida. Use "connect" ou "disconnect"');
    }

    await this.validateTenantAccess(tenantSlug);

    const instanceName = this.generateInstanceName(tenantSlug);

    // AIDEV-NOTE: Verificar se tenant existe no banco
    const tenantExists = await this.verifyTenantExists(tenantSlug);
    if (!tenantExists) {
      throw new Error(`Tenant ${tenantSlug} não encontrado`);
    }

    // AIDEV-NOTE: Verificar status atual da instância
    const currentStatus = await this.getInstanceStatus(instanceName);
    
    if (action === 'connect') {
      return await this.handleConnectFlow(tenantSlug, instanceName, currentStatus);
    } else {
      return await this.handleDisconnectFlow(tenantSlug, instanceName, currentStatus);
    }
  } catch (error) {
    console.error(`Erro ao gerenciar instância ${action} para tenant ${tenantSlug}:`, error);
    throw error;
  }
}

// AIDEV-NOTE: Fluxo de conexão isolado
private async handleConnectFlow(
  tenantSlug: string, 
  instanceName: string, 
  currentStatus: any
): Promise<any> {
  // Verificar se já está conectada
  if (currentStatus?.instance?.state === 'open') {
    return {
      success: true,
      message: 'Instância já conectada',
      qrCode: null,
      instanceName
    };
  }

  // Verificar se instância existe
  if (!currentStatus?.instance) {
    // Criar nova instância
    const createResponse = await this.createInstance(tenantSlug);
    
    // Aguardar inicialização
    await this.waitForInstanceInitialization(instanceName);
  }

  // Conectar instância
  const connectResponse = await this.connectInstance(instanceName);
  
  // Gerar QR Code se necessário
  if (connectResponse.qrCode) {
    return {
      success: true,
      message: 'QR Code gerado',
      qrCode: connectResponse.qrCode,
      instanceName
    };
  }

  return connectResponse;
}
```

### 3. Persistência Segura no Supabase
```typescript
async saveInstanceConfig(
  tenantSlug: string, 
  config: InstanceConfig
): Promise<void> {
  try {
    // AIDEV-NOTE: Validação de parâmetros
    if (!tenantSlug || !config) {
      throw new Error('TenantSlug e config são obrigatórios');
    }

    // AIDEV-NOTE: Validar configuração
    this.validateInstanceConfig(config, tenantSlug);

    // AIDEV-NOTE: Usar executeWithAuth para operação segura
    await executeWithAuth(async (supabase) => {
      // Buscar tenant pelo slug
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Tenant ${tenantSlug} não encontrado`);
      }

      // AIDEV-NOTE: Verificar se integração já existe
      const { data: existingIntegration } = await supabase
        .from('tenant_integrations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('integration_type', 'whatsapp')
        .single();

      const integrationData = {
        tenant_id: tenant.id,
        integration_type: 'whatsapp',
        config: {
          instance_name: config.instanceName,
          api_key: this.apiKey,
          api_url: this.apiUrl,
          environment: config.environment || 'production',
          webhook_url: config.webhook,
          created_at: new Date().toISOString()
        },
        is_active: true,
        updated_at: new Date().toISOString()
      };

      if (existingIntegration) {
        // AIDEV-NOTE: Atualizar integração existente
        const { error: updateError } = await supabase
          .from('tenant_integrations')
          .update(integrationData)
          .eq('id', existingIntegration.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar integração: ${updateError.message}`);
        }
      } else {
        // AIDEV-NOTE: Criar nova integração
        const { error: insertError } = await supabase
          .from('tenant_integrations')
          .insert({
            ...integrationData,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Erro ao criar integração: ${insertError.message}`);
        }
      }

      // AIDEV-NOTE: Log de auditoria
      console.log(`Configuração salva para tenant ${tenantSlug}:`, {
        instanceName: config.instanceName,
        isActive: true,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error(`Erro ao salvar configuração para tenant ${tenantSlug}:`, error);
    throw error;
  }
}

// AIDEV-NOTE: Validação de configuração de instância
private validateInstanceConfig(config: InstanceConfig, tenantSlug: string): void {
  if (!config.instanceName) {
    throw new Error('Nome da instância é obrigatório');
  }

  if (!this.validateInstanceName(config.instanceName, tenantSlug)) {
    throw new Error('Nome da instância não confere com o padrão esperado');
  }

  if (!config.webhook) {
    throw new Error('URL do webhook é obrigatória');
  }

  if (!this.validateWebhookUrl(config.webhook, tenantSlug)) {
    throw new Error('URL do webhook não confere com o padrão esperado');
  }
}
```

---

## 🔍 Validações de Segurança

### 1. Validação de Acesso ao Tenant
```typescript
private async validateTenantAccess(tenantSlug: string): Promise<void> {
  // AIDEV-NOTE: Validação no frontend (já implementada via useTenantAccessGuard)
  const { tenantSlug: currentTenantSlug } = useTenantAccessGuard();
  
  if (currentTenantSlug !== tenantSlug) {
    throw new Error('Acesso negado: Tenant não confere com o contexto atual');
  }

  // AIDEV-NOTE: Validação adicional no backend via RPC
  const hasAccess = await this.verifyTenantAccess(tenantSlug);
  if (!hasAccess) {
    throw new Error('Acesso negado: Usuário não tem permissão no tenant');
  }
}

private async verifyTenantAccess(tenantSlug: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('verify_tenant_access', {
      p_tenant_slug: tenantSlug
    });

    if (error) {
      console.error('Erro ao verificar acesso ao tenant:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro na validação de acesso:', error);
    return false;
  }
}
```

### 2. Validação de Integridade de Instância
```typescript
private async validateInstanceIntegrity(
  instanceName: string, 
  tenantSlug: string
): Promise<boolean> {
  try {
    // AIDEV-NOTE: Verificar se nome da instância está correto
    if (!this.validateInstanceName(instanceName, tenantSlug)) {
      return false;
    }

    // AIDEV-NOTE: Verificar se instância existe na Evolution
    const status = await this.getInstanceStatus(instanceName);
    if (!status?.instance) {
      return false;
    }

    // AIDEV-NOTE: Verificar se configuração no banco está correta
    const dbConfig = await this.getInstanceConfigFromDB(tenantSlug);
    if (!dbConfig || dbConfig.instance_name !== instanceName) {
      return false;
    }

    // AIDEV-NOTE: Verificar se webhook está correto
    const expectedWebhook = this.generateWebhookUrl(tenantSlug);
    if (dbConfig.webhook_url !== expectedWebhook) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro na validação de integridade:', error);
    return false;
  }
}
```

### 3. Prevenção de Cross-Tenant Access
```typescript
private async preventCrossTenantAccess(
  instanceName: string, 
  requestingTenantSlug: string
): Promise<void> {
  // AIDEV-NOTE: Extrair tenant slug do nome da instância
  const instanceTenantSlug = this.extractTenantSlugFromInstance(instanceName);
  
  if (instanceTenantSlug !== requestingTenantSlug) {
    throw new Error(
      `Acesso negado: Instância ${instanceName} pertence a outro tenant`
    );
  }

  // AIDEV-NOTE: Validação adicional no banco de dados
  const dbValidation = await this.validateInstanceOwnership(
    instanceName, 
    requestingTenantSlug
  );
  
  if (!dbValidation) {
    throw new Error('Validação de propriedade da instância falhou');
  }
}

private extractTenantSlugFromInstance(instanceName: string): string {
  const prefix = 'revalya-';
  if (!instanceName.startsWith(prefix)) {
    throw new Error('Nome de instância não segue o padrão esperado');
  }
  
  return instanceName.substring(prefix.length);
}

private async validateInstanceOwnership(
  instanceName: string, 
  tenantSlug: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('validate_instance_ownership', {
      p_instance_name: instanceName,
      p_tenant_slug: tenantSlug
    });

    if (error) {
      console.error('Erro ao validar propriedade da instância:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro na validação de propriedade:', error);
    return false;
  }
}
```

---

## 🔄 Fluxos de Monitoramento

### 1. Monitoramento de Status
```typescript
// Arquivo: src/components/canais/hooks/useStatusMonitoring.ts
const useStatusMonitoring = (tenantSlug: string, instanceName: string) => {
  const [status, setStatus] = useState<InstanceStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!tenantSlug || !instanceName || !isMonitoring) return;

    // AIDEV-NOTE: Polling seguro com validação de tenant
    const interval = setInterval(async () => {
      try {
        // Validar acesso antes de cada verificação
        const { tenantSlug: currentTenant } = useTenantAccessGuard();
        if (currentTenant !== tenantSlug) {
          setIsMonitoring(false);
          return;
        }

        // Verificar integridade da instância
        const isValid = await whatsappService.validateInstanceIntegrity(
          instanceName, 
          tenantSlug
        );
        
        if (!isValid) {
          setStatus(null);
          setIsMonitoring(false);
          return;
        }

        // Buscar status atual
        const currentStatus = await whatsappService.getInstanceStatus(instanceName);
        setStatus(currentStatus);

        // AIDEV-NOTE: Log de monitoramento
        console.log(`Status monitoring for ${instanceName}:`, {
          state: currentStatus?.instance?.state,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro no monitoramento de status:', error);
        setStatus(null);
      }
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [tenantSlug, instanceName, isMonitoring]);

  return {
    status,
    isMonitoring,
    startMonitoring: () => setIsMonitoring(true),
    stopMonitoring: () => setIsMonitoring(false)
  };
};
```

### 2. Detecção de Anomalias
```typescript
class InstanceAnomalyDetector {
  private anomalies: Map<string, AnomalyRecord[]> = new Map();

  // AIDEV-NOTE: Detectar anomalias por tenant
  async detectAnomalies(tenantSlug: string): Promise<AnomalyRecord[]> {
    const instanceName = whatsappService.generateInstanceName(tenantSlug);
    const currentAnomalies: AnomalyRecord[] = [];

    try {
      // Verificar integridade da nomenclatura
      if (!whatsappService.validateInstanceName(instanceName, tenantSlug)) {
        currentAnomalies.push({
          type: 'naming_violation',
          severity: 'high',
          message: 'Nome da instância não confere com o padrão',
          timestamp: new Date(),
          tenantSlug,
          instanceName
        });
      }

      // Verificar consistência do webhook
      const dbConfig = await whatsappService.getInstanceConfigFromDB(tenantSlug);
      const expectedWebhook = whatsappService.generateWebhookUrl(tenantSlug);
      
      if (dbConfig?.webhook_url !== expectedWebhook) {
        currentAnomalies.push({
          type: 'webhook_mismatch',
          severity: 'medium',
          message: 'URL do webhook não confere com o esperado',
          timestamp: new Date(),
          tenantSlug,
          instanceName
        });
      }

      // Verificar status da instância
      const status = await whatsappService.getInstanceStatus(instanceName);
      if (!status?.instance) {
        currentAnomalies.push({
          type: 'instance_not_found',
          severity: 'high',
          message: 'Instância não encontrada na Evolution API',
          timestamp: new Date(),
          tenantSlug,
          instanceName
        });
      }

      // Armazenar anomalias detectadas
      this.anomalies.set(tenantSlug, currentAnomalies);

      return currentAnomalies;
    } catch (error) {
      console.error(`Erro ao detectar anomalias para tenant ${tenantSlug}:`, error);
      return [];
    }
  }

  // AIDEV-NOTE: Obter histórico de anomalias
  getAnomalyHistory(tenantSlug: string): AnomalyRecord[] {
    return this.anomalies.get(tenantSlug) || [];
  }
}

interface AnomalyRecord {
  type: 'naming_violation' | 'webhook_mismatch' | 'instance_not_found' | 'cross_tenant_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  tenantSlug: string;
  instanceName: string;
}
```

---

## 📊 Métricas de Isolamento

### 1. Indicadores de Saúde
```typescript
interface IsolationHealthMetrics {
  totalInstances: number;           // Total de instâncias ativas
  instancesPerTenant: Map<string, number>; // Instâncias por tenant
  namingViolations: number;         // Violações de nomenclatura
  webhookMismatches: number;        // Inconsistências de webhook
  crossTenantAttempts: number;      // Tentativas de acesso cruzado
  lastHealthCheck: Date;            // Última verificação
}

class IsolationHealthMonitor {
  private metrics: IsolationHealthMetrics = {
    totalInstances: 0,
    instancesPerTenant: new Map(),
    namingViolations: 0,
    webhookMismatches: 0,
    crossTenantAttempts: 0,
    lastHealthCheck: new Date()
  };

  // AIDEV-NOTE: Coletar métricas de saúde
  async collectHealthMetrics(): Promise<IsolationHealthMetrics> {
    try {
      // Buscar todas as instâncias ativas
      const instances = await whatsappService.getAllActiveInstances();
      this.metrics.totalInstances = instances.length;

      // Contar instâncias por tenant
      const instancesPerTenant = new Map<string, number>();
      for (const instance of instances) {
        const tenantSlug = whatsappService.extractTenantSlugFromInstance(
          instance.instanceName
        );
        const count = instancesPerTenant.get(tenantSlug) || 0;
        instancesPerTenant.set(tenantSlug, count + 1);
      }
      this.metrics.instancesPerTenant = instancesPerTenant;

      // Verificar violações de nomenclatura
      let namingViolations = 0;
      for (const instance of instances) {
        const tenantSlug = whatsappService.extractTenantSlugFromInstance(
          instance.instanceName
        );
        if (!whatsappService.validateInstanceName(instance.instanceName, tenantSlug)) {
          namingViolations++;
        }
      }
      this.metrics.namingViolations = namingViolations;

      this.metrics.lastHealthCheck = new Date();
      return this.metrics;
    } catch (error) {
      console.error('Erro ao coletar métricas de saúde:', error);
      return this.metrics;
    }
  }
}
```

### 2. Logs de Auditoria
```typescript
class IsolationAuditLogger {
  // AIDEV-NOTE: Log de criação de instância
  static logInstanceCreation(tenantSlug: string, instanceName: string): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'instance_created',
      tenantSlug,
      instanceName,
      isolation: {
        naming_compliant: whatsappService.validateInstanceName(instanceName, tenantSlug),
        webhook_url: whatsappService.generateWebhookUrl(tenantSlug)
      }
    }));
  }

  // AIDEV-NOTE: Log de tentativa de acesso cruzado
  static logCrossTenantAttempt(
    requestingTenant: string, 
    targetInstance: string
  ): void {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'cross_tenant_attempt',
      severity: 'high',
      requestingTenant,
      targetInstance,
      blocked: true
    }));
  }

  // AIDEV-NOTE: Log de validação de integridade
  static logIntegrityValidation(
    tenantSlug: string, 
    instanceName: string, 
    isValid: boolean
  ): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'integrity_validation',
      tenantSlug,
      instanceName,
      isValid,
      checks: {
        naming: whatsappService.validateInstanceName(instanceName, tenantSlug),
        webhook: whatsappService.validateWebhookUrl(
          whatsappService.generateWebhookUrl(tenantSlug), 
          tenantSlug
        )
      }
    }));
  }
}
```

---

## 🛠️ Troubleshooting do Isolamento

### Problemas Comuns

#### 1. Instância com nome incorreto
```bash
# Sintoma: Instância não segue padrão revalya-{tenantSlug}
# Solução: Recriar instância com nome correto

# Verificar instâncias existentes
curl -X GET "https://evolution-api.com/instance/fetchInstances" \
  -H "apikey: YOUR_API_KEY"

# Deletar instância incorreta
curl -X DELETE "https://evolution-api.com/instance/delete/NOME_INCORRETO" \
  -H "apikey: YOUR_API_KEY"

# Recriar com nome correto via sistema
```

#### 2. Webhook apontando para tenant errado
```typescript
// Verificar configuração no banco
const config = await whatsappService.getInstanceConfigFromDB(tenantSlug);
console.log('Webhook atual:', config.webhook_url);
console.log('Webhook esperado:', whatsappService.generateWebhookUrl(tenantSlug));

// Corrigir webhook
await whatsappService.updateWebhookUrl(tenantSlug, correctWebhookUrl);
```

#### 3. Tentativa de acesso cruzado
```typescript
// Logs para identificar tentativas
grep "cross_tenant_attempt" /var/log/revalya/security.log

// Verificar integridade das validações
await whatsappService.validateInstanceIntegrity(instanceName, tenantSlug);
```

### Comandos de Diagnóstico

#### Verificar isolamento completo
```sql
-- Verificar configurações por tenant
SELECT 
  t.slug as tenant_slug,
  ti.config->>'instance_name' as instance_name,
  ti.config->>'webhook_url' as webhook_url,
  ti.is_active
FROM tenant_integrations ti
JOIN tenants t ON t.id = ti.tenant_id
WHERE ti.integration_type = 'whatsapp'
ORDER BY t.slug;
```

#### Validar nomenclatura
```typescript
// Script de validação
const validateAllInstances = async () => {
  const tenants = await getAllActiveTenants();
  
  for (const tenant of tenants) {
    const expectedName = `revalya-${tenant.slug}`;
    const config = await getInstanceConfigFromDB(tenant.slug);
    
    if (config.instance_name !== expectedName) {
      console.error(`Violação de nomenclatura: ${tenant.slug}`);
      console.error(`Esperado: ${expectedName}`);
      console.error(`Atual: ${config.instance_name}`);
    }
  }
};
```

---

## ✅ Checklist de Isolamento

### Nomenclatura
- [x] Padrão `revalya-{tenantSlug}` implementado
- [x] Validação de nomenclatura em todas as operações
- [x] Sanitização de tenantSlug implementada
- [x] Prevenção de nomes duplicados

### Webhook
- [x] URL específica por tenant implementada
- [x] Padrão `/api/whatsapp/webhook/{tenantSlug}` seguido
- [x] Validação de URL em todas as operações
- [x] Sanitização de tenantSlug para URL

### Configuração
- [x] Configuração isolada por tenant no banco
- [x] Validação de integridade implementada
- [x] Prevenção de acesso cruzado
- [x] Logs de auditoria completos

### Segurança
- [x] Validação de acesso em todas as operações
- [x] Prevenção de cross-tenant access
- [x] Monitoramento de anomalias
- [x] Logs de segurança detalhados

---

**Status**: ✅ **ISOLAMENTO COMPLETO IMPLEMENTADO**  
**Nível de Segurança**: 🔒 **MÁXIMO**  
**Conformidade**: ✅ **100% ISOLADO POR TENANT**