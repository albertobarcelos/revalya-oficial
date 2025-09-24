# 🔧 Guia de Manutenção - Sistema Canais/WhatsApp
## Manual Completo de Manutenção, Troubleshooting e Operações

> **AIDEV-NOTE**: Guia completo de manutenção do sistema de Canais/WhatsApp.
> Baseado na análise completa da implementação e fluxos identificados.

---

## 🎯 Visão Geral da Manutenção

### Responsabilidades da Manutenção
- **Monitoramento**: Verificar saúde das integrações
- **Troubleshooting**: Resolver problemas de conexão
- **Otimização**: Melhorar performance e estabilidade
- **Segurança**: Manter isolamento e validações
- **Atualizações**: Aplicar patches e melhorias

### Ferramentas Necessárias
- Acesso ao Supabase Dashboard
- Acesso à Evolution API
- Logs do sistema (console/arquivo)
- Ferramentas de monitoramento (opcional)

---

## 🔍 Monitoramento Preventivo

### 1. Verificações Diárias

#### 1.1 Status das Instâncias
```sql
-- Verificar instâncias ativas por tenant
SELECT 
  t.slug as tenant_slug,
  ti.config->>'instance_name' as instance_name,
  ti.is_active,
  ti.updated_at,
  CASE 
    WHEN ti.updated_at < NOW() - INTERVAL '24 hours' THEN 'Stale'
    WHEN ti.is_active = true THEN 'Active'
    ELSE 'Inactive'
  END as status
FROM tenant_integrations ti
JOIN tenants t ON t.id = ti.tenant_id
WHERE ti.integration_type = 'whatsapp'
ORDER BY ti.updated_at DESC;
```

#### 1.2 Verificar Nomenclatura
```typescript
// Script de verificação de nomenclatura
const verifyNamingConvention = async () => {
  const integrations = await supabase
    .from('tenant_integrations')
    .select(`
      config,
      tenants!inner(slug)
    `)
    .eq('integration_type', 'whatsapp');

  const violations = [];

  for (const integration of integrations.data || []) {
    const tenantSlug = integration.tenants.slug;
    const instanceName = integration.config.instance_name;
    const expectedName = `revalya-${tenantSlug}`;

    if (instanceName !== expectedName) {
      violations.push({
        tenant: tenantSlug,
        current: instanceName,
        expected: expectedName
      });
    }
  }

  if (violations.length > 0) {
    console.warn('Violações de nomenclatura encontradas:', violations);
  }

  return violations;
};
```

#### 1.3 Verificar Webhooks
```typescript
// Verificar URLs de webhook
const verifyWebhookURLs = async () => {
  const integrations = await supabase
    .from('tenant_integrations')
    .select(`
      config,
      tenants!inner(slug)
    `)
    .eq('integration_type', 'whatsapp');

  const issues = [];

  for (const integration of integrations.data || []) {
    const tenantSlug = integration.tenants.slug;
    const webhookUrl = integration.config.webhook_url;
    const expectedUrl = `${process.env.WEBHOOK_BASE_URL}/api/whatsapp/webhook/${tenantSlug}`;

    if (webhookUrl !== expectedUrl) {
      issues.push({
        tenant: tenantSlug,
        current: webhookUrl,
        expected: expectedUrl
      });
    }
  }

  return issues;
};
```

### 2. Verificações Semanais

#### 2.1 Análise de Performance
```typescript
// Analisar métricas de performance
const analyzePerformance = async () => {
  const metrics = {
    totalRequests: 0,
    successRate: 0,
    averageResponseTime: 0,
    errorsByType: {},
    slowestTenants: []
  };

  // Buscar logs da última semana
  const logs = await supabase
    .from('api_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .eq('service', 'whatsapp');

  if (logs.data) {
    metrics.totalRequests = logs.data.length;
    
    const successful = logs.data.filter(log => log.status === 'success');
    metrics.successRate = (successful.length / logs.data.length) * 100;

    const responseTimes = logs.data
      .filter(log => log.response_time)
      .map(log => log.response_time);
    
    if (responseTimes.length > 0) {
      metrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Agrupar erros por tipo
    const errors = logs.data.filter(log => log.status === 'error');
    for (const error of errors) {
      const type = error.error_type || 'unknown';
      metrics.errorsByType[type] = (metrics.errorsByType[type] || 0) + 1;
    }
  }

  return metrics;
};
```

#### 2.2 Limpeza de Dados
```sql
-- Limpar logs antigos (mais de 30 dias)
DELETE FROM api_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Limpar sessões expiradas
DELETE FROM tenant_sessions_audit 
WHERE expires_at < NOW();

-- Verificar integrações órfãs
SELECT ti.* 
FROM tenant_integrations ti
LEFT JOIN tenants t ON t.id = ti.tenant_id
WHERE t.id IS NULL;
```

---

## 🚨 Troubleshooting

### 1. Problemas de Conexão

#### 1.1 WhatsApp não conecta
**Sintomas:**
- QR Code não aparece
- QR Code expira constantemente
- Status permanece "connecting"

**Diagnóstico:**
```typescript
const diagnoseConnectionIssue = async (tenantSlug: string) => {
  const instanceName = `revalya-${tenantSlug}`;
  
  console.log(`Diagnosticando conexão para ${tenantSlug}...`);

  // 1. Verificar se instância existe
  try {
    const status = await whatsappService.getInstanceStatus(instanceName);
    console.log('Status da instância:', status);
  } catch (error) {
    console.error('Erro ao buscar status:', error.message);
    return 'instance_not_found';
  }

  // 2. Verificar configuração no banco
  const config = await supabase
    .from('tenant_integrations')
    .select('config')
    .eq('tenant_id', (
      await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
    ).data.id)
    .eq('integration_type', 'whatsapp')
    .single();

  if (!config.data) {
    console.error('Configuração não encontrada no banco');
    return 'config_missing';
  }

  // 3. Verificar API Key
  try {
    const testResponse = await fetch(`${process.env.EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { 'apikey': process.env.EVOLUTION_API_KEY }
    });
    
    if (!testResponse.ok) {
      console.error('API Key inválida');
      return 'invalid_api_key';
    }
  } catch (error) {
    console.error('Erro na Evolution API:', error.message);
    return 'api_unreachable';
  }

  return 'unknown';
};
```

**Soluções:**
```typescript
const fixConnectionIssue = async (tenantSlug: string, issue: string) => {
  switch (issue) {
    case 'instance_not_found':
      console.log('Recriando instância...');
      await whatsappService.createInstance(tenantSlug);
      break;

    case 'config_missing':
      console.log('Recriando configuração...');
      await whatsappService.saveInstanceConfig(tenantSlug, {
        instanceName: `revalya-${tenantSlug}`,
        webhook: `${process.env.WEBHOOK_BASE_URL}/api/whatsapp/webhook/${tenantSlug}`,
        environment: 'production'
      });
      break;

    case 'invalid_api_key':
      console.error('API Key precisa ser renovada manualmente');
      break;

    case 'api_unreachable':
      console.error('Evolution API está indisponível');
      break;

    default:
      console.log('Tentando reset completo...');
      await resetWhatsAppIntegration(tenantSlug);
  }
};
```

#### 1.2 Instância desconecta sozinha
**Sintomas:**
- WhatsApp conectado desconecta sem ação do usuário
- Status muda para "close" inesperadamente

**Diagnóstico:**
```typescript
const diagnoseDisconnection = async (tenantSlug: string) => {
  const instanceName = `revalya-${tenantSlug}`;
  
  // Verificar logs recentes
  const recentLogs = await supabase
    .from('api_logs')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('service', 'whatsapp')
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2 horas
    .order('created_at', { ascending: false });

  console.log('Logs recentes:', recentLogs.data);

  // Verificar se há padrão de desconexões
  const disconnections = recentLogs.data?.filter(log => 
    log.event === 'connection.update' && log.data?.state === 'close'
  ) || [];

  if (disconnections.length > 3) {
    return 'frequent_disconnections';
  }

  // Verificar se Evolution API está estável
  const healthCheck = await checkEvolutionAPIHealth();
  if (healthCheck.status !== 'healthy') {
    return 'api_unstable';
  }

  return 'unknown';
};
```

**Soluções:**
```typescript
const fixDisconnectionIssue = async (tenantSlug: string, issue: string) => {
  switch (issue) {
    case 'frequent_disconnections':
      console.log('Implementando reconexão automática...');
      await enableAutoReconnect(tenantSlug);
      break;

    case 'api_unstable':
      console.log('Evolution API instável, aguardando estabilização...');
      await waitForAPIStability();
      break;

    default:
      console.log('Forçando reconexão...');
      await whatsappService.manageInstance(tenantSlug, 'connect');
  }
};
```

### 2. Problemas de Isolamento

#### 2.1 Cross-tenant access detectado
**Sintomas:**
- Logs de tentativa de acesso cruzado
- Instâncias com nomes incorretos

**Diagnóstico:**
```typescript
const auditTenantIsolation = async () => {
  const violations = [];

  // Verificar todas as integrações
  const integrations = await supabase
    .from('tenant_integrations')
    .select(`
      id,
      config,
      tenants!inner(slug)
    `)
    .eq('integration_type', 'whatsapp');

  for (const integration of integrations.data || []) {
    const tenantSlug = integration.tenants.slug;
    const instanceName = integration.config.instance_name;
    
    // Verificar nomenclatura
    if (!instanceName.startsWith('revalya-')) {
      violations.push({
        type: 'invalid_prefix',
        tenant: tenantSlug,
        instance: instanceName
      });
    }

    const expectedSlug = instanceName.replace('revalya-', '');
    if (expectedSlug !== tenantSlug) {
      violations.push({
        type: 'slug_mismatch',
        tenant: tenantSlug,
        instance: instanceName,
        expected: `revalya-${tenantSlug}`
      });
    }
  }

  return violations;
};
```

**Correção:**
```typescript
const fixIsolationViolations = async (violations: any[]) => {
  for (const violation of violations) {
    console.log(`Corrigindo violação: ${violation.type} para ${violation.tenant}`);

    switch (violation.type) {
      case 'invalid_prefix':
      case 'slug_mismatch':
        // Deletar instância incorreta
        await whatsappService.deleteInstance(violation.instance);
        
        // Recriar com nome correto
        await whatsappService.createInstance(violation.tenant);
        
        console.log(`Instância recriada para ${violation.tenant}`);
        break;
    }
  }
};
```

### 3. Problemas de Performance

#### 3.1 Requests lentos
**Sintomas:**
- Timeout em operações
- Interface lenta para carregar status

**Diagnóstico:**
```typescript
const diagnosePerformance = async () => {
  const metrics = await analyzePerformance();
  
  console.log('Métricas de performance:', metrics);

  if (metrics.averageResponseTime > 5000) {
    return 'slow_api';
  }

  if (metrics.successRate < 95) {
    return 'high_error_rate';
  }

  return 'normal';
};
```

**Otimização:**
```typescript
const optimizePerformance = async (issue: string) => {
  switch (issue) {
    case 'slow_api':
      console.log('Implementando cache e retry...');
      await implementCaching();
      await configureRetryPolicy();
      break;

    case 'high_error_rate':
      console.log('Analisando erros frequentes...');
      const errorAnalysis = await analyzeFrequentErrors();
      await fixCommonErrors(errorAnalysis);
      break;
  }
};
```

---

## 🔄 Procedimentos de Manutenção

### 1. Reset Completo de Integração

```typescript
const resetWhatsAppIntegration = async (tenantSlug: string) => {
  console.log(`Iniciando reset completo para ${tenantSlug}...`);

  try {
    // 1. Desconectar instância atual
    try {
      await whatsappService.manageInstance(tenantSlug, 'disconnect');
    } catch (error) {
      console.warn('Erro ao desconectar (pode não existir):', error.message);
    }

    // 2. Deletar instância na Evolution API
    const instanceName = `revalya-${tenantSlug}`;
    try {
      await whatsappService.deleteInstance(instanceName);
    } catch (error) {
      console.warn('Erro ao deletar instância (pode não existir):', error.message);
    }

    // 3. Limpar configuração no banco
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single();

    if (tenant) {
      await supabase
        .from('tenant_integrations')
        .delete()
        .eq('tenant_id', tenant.id)
        .eq('integration_type', 'whatsapp');
    }

    // 4. Recriar integração do zero
    await whatsappService.createInstance(tenantSlug);

    console.log(`Reset completo concluído para ${tenantSlug}`);
    return true;
  } catch (error) {
    console.error(`Erro no reset para ${tenantSlug}:`, error);
    return false;
  }
};
```

### 2. Migração de Instância

```typescript
const migrateInstance = async (tenantSlug: string, newAPIUrl: string, newAPIKey: string) => {
  console.log(`Migrando instância para ${tenantSlug}...`);

  const oldInstanceName = `revalya-${tenantSlug}`;

  try {
    // 1. Backup da configuração atual
    const currentConfig = await supabase
      .from('tenant_integrations')
      .select('config')
      .eq('tenant_id', (
        await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
      ).data.id)
      .eq('integration_type', 'whatsapp')
      .single();

    // 2. Desconectar instância antiga
    await whatsappService.manageInstance(tenantSlug, 'disconnect');

    // 3. Atualizar configuração de API
    whatsappService.setCredentials(newAPIUrl, newAPIKey);

    // 4. Recriar instância na nova API
    await whatsappService.createInstance(tenantSlug);

    // 5. Atualizar configuração no banco
    await whatsappService.saveInstanceConfig(tenantSlug, {
      instanceName: oldInstanceName,
      webhook: `${process.env.WEBHOOK_BASE_URL}/api/whatsapp/webhook/${tenantSlug}`,
      environment: 'production'
    });

    console.log(`Migração concluída para ${tenantSlug}`);
    return true;
  } catch (error) {
    console.error(`Erro na migração para ${tenantSlug}:`, error);
    
    // Rollback: restaurar configuração antiga
    console.log('Iniciando rollback...');
    // Implementar rollback se necessário
    
    return false;
  }
};
```

### 3. Limpeza de Instâncias Órfãs

```typescript
const cleanupOrphanInstances = async () => {
  console.log('Iniciando limpeza de instâncias órfãs...');

  try {
    // 1. Buscar todas as instâncias na Evolution API
    const allInstances = await whatsappService.getAllInstances();
    
    // 2. Buscar todas as integrações no banco
    const dbIntegrations = await supabase
      .from('tenant_integrations')
      .select(`
        config,
        tenants!inner(slug)
      `)
      .eq('integration_type', 'whatsapp');

    const dbInstanceNames = new Set(
      dbIntegrations.data?.map(i => i.config.instance_name) || []
    );

    // 3. Identificar instâncias órfãs
    const orphanInstances = allInstances.filter(instance => 
      instance.instanceName.startsWith('revalya-') && 
      !dbInstanceNames.has(instance.instanceName)
    );

    console.log(`Encontradas ${orphanInstances.length} instâncias órfãs`);

    // 4. Deletar instâncias órfãs
    for (const orphan of orphanInstances) {
      console.log(`Deletando instância órfã: ${orphan.instanceName}`);
      await whatsappService.deleteInstance(orphan.instanceName);
    }

    console.log('Limpeza concluída');
    return orphanInstances.length;
  } catch (error) {
    console.error('Erro na limpeza:', error);
    return 0;
  }
};
```

---

## 📊 Scripts de Monitoramento

### 1. Health Check Completo

```typescript
const fullHealthCheck = async () => {
  const report = {
    timestamp: new Date().toISOString(),
    overall_status: 'healthy',
    services: {},
    tenants: {},
    issues: []
  };

  try {
    // 1. Verificar Evolution API
    const evolutionHealth = await checkEvolutionAPIHealth();
    report.services.evolution_api = evolutionHealth;

    // 2. Verificar Supabase
    const supabaseHealth = await checkSupabaseHealth();
    report.services.supabase = supabaseHealth;

    // 3. Verificar cada tenant
    const tenants = await supabase
      .from('tenants')
      .select('slug')
      .eq('is_active', true);

    for (const tenant of tenants.data || []) {
      const tenantHealth = await checkTenantHealth(tenant.slug);
      report.tenants[tenant.slug] = tenantHealth;

      if (tenantHealth.status !== 'healthy') {
        report.issues.push({
          tenant: tenant.slug,
          issue: tenantHealth.issue,
          severity: tenantHealth.severity
        });
      }
    }

    // 4. Determinar status geral
    const hasUnhealthyServices = Object.values(report.services)
      .some((service: any) => service.status === 'unhealthy');
    
    const hasCriticalIssues = report.issues
      .some(issue => issue.severity === 'critical');

    if (hasUnhealthyServices || hasCriticalIssues) {
      report.overall_status = 'unhealthy';
    } else if (report.issues.length > 0) {
      report.overall_status = 'degraded';
    }

    return report;
  } catch (error) {
    report.overall_status = 'error';
    report.error = error.message;
    return report;
  }
};

const checkTenantHealth = async (tenantSlug: string) => {
  try {
    const instanceName = `revalya-${tenantSlug}`;
    
    // Verificar se configuração existe
    const config = await supabase
      .from('tenant_integrations')
      .select('config, is_active')
      .eq('tenant_id', (
        await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
      ).data.id)
      .eq('integration_type', 'whatsapp')
      .single();

    if (!config.data) {
      return {
        status: 'healthy', // Sem integração é normal
        message: 'No WhatsApp integration configured'
      };
    }

    if (!config.data.is_active) {
      return {
        status: 'healthy', // Inativo é normal
        message: 'WhatsApp integration disabled'
      };
    }

    // Verificar status na Evolution API
    const status = await whatsappService.getInstanceStatus(instanceName);
    
    if (!status) {
      return {
        status: 'unhealthy',
        issue: 'Instance not found in Evolution API',
        severity: 'high'
      };
    }

    if (status.instance.state === 'open') {
      return {
        status: 'healthy',
        message: 'WhatsApp connected and active'
      };
    } else {
      return {
        status: 'degraded',
        issue: `WhatsApp not connected (${status.instance.state})`,
        severity: 'medium'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      issue: error.message,
      severity: 'high'
    };
  }
};
```

### 2. Relatório de Uso

```typescript
const generateUsageReport = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const report = {
    period: `${days} days`,
    total_tenants: 0,
    active_integrations: 0,
    total_connections: 0,
    total_disconnections: 0,
    average_uptime: 0,
    top_active_tenants: [],
    error_summary: {}
  };

  try {
    // Total de tenants
    const { count: totalTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    report.total_tenants = totalTenants || 0;

    // Integrações ativas
    const { count: activeIntegrations } = await supabase
      .from('tenant_integrations')
      .select('*', { count: 'exact', head: true })
      .eq('integration_type', 'whatsapp')
      .eq('is_active', true);
    
    report.active_integrations = activeIntegrations || 0;

    // Logs de conexão/desconexão
    const connectionLogs = await supabase
      .from('api_logs')
      .select('event, tenant_slug, created_at')
      .eq('service', 'whatsapp')
      .in('event', ['connection.update'])
      .gte('created_at', since.toISOString());

    const connections = connectionLogs.data?.filter(log => 
      log.event === 'connection.update' && log.data?.state === 'open'
    ) || [];
    
    const disconnections = connectionLogs.data?.filter(log => 
      log.event === 'connection.update' && log.data?.state === 'close'
    ) || [];

    report.total_connections = connections.length;
    report.total_disconnections = disconnections.length;

    // Top tenants mais ativos
    const tenantActivity = {};
    for (const log of connectionLogs.data || []) {
      tenantActivity[log.tenant_slug] = (tenantActivity[log.tenant_slug] || 0) + 1;
    }

    report.top_active_tenants = Object.entries(tenantActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tenant, activity]) => ({ tenant, activity }));

    return report;
  } catch (error) {
    report.error = error.message;
    return report;
  }
};
```

---

## 🚀 Automação de Manutenção

### 1. Cron Jobs Recomendados

```bash
# Verificação de saúde a cada 5 minutos
*/5 * * * * /usr/local/bin/node /path/to/health-check.js

# Limpeza de logs diária às 2h
0 2 * * * /usr/local/bin/node /path/to/cleanup-logs.js

# Relatório semanal aos domingos às 8h
0 8 * * 0 /usr/local/bin/node /path/to/weekly-report.js

# Verificação de isolamento diária às 6h
0 6 * * * /usr/local/bin/node /path/to/isolation-audit.js
```

### 2. Scripts de Automação

#### health-check.js
```javascript
const { fullHealthCheck } = require('./maintenance-utils');

async function main() {
  const report = await fullHealthCheck();
  
  if (report.overall_status === 'unhealthy') {
    console.error('CRITICAL: Sistema com problemas críticos');
    console.error(JSON.stringify(report.issues, null, 2));
    
    // Enviar alerta (email, Slack, etc.)
    await sendAlert('critical', report);
  } else if (report.overall_status === 'degraded') {
    console.warn('WARNING: Sistema com problemas menores');
    console.warn(JSON.stringify(report.issues, null, 2));
    
    await sendAlert('warning', report);
  } else {
    console.log('OK: Sistema funcionando normalmente');
  }
}

main().catch(console.error);
```

#### cleanup-logs.js
```javascript
const { supabase } = require('./supabase-client');

async function main() {
  console.log('Iniciando limpeza de logs...');
  
  // Limpar logs antigos
  const { error } = await supabase
    .from('api_logs')
    .delete()
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  if (error) {
    console.error('Erro na limpeza:', error);
  } else {
    console.log('Limpeza concluída com sucesso');
  }
}

main().catch(console.error);
```

### 3. Alertas Automáticos

```typescript
const sendAlert = async (severity: 'info' | 'warning' | 'critical', data: any) => {
  const message = {
    severity,
    timestamp: new Date().toISOString(),
    service: 'whatsapp-integration',
    data
  };

  // Slack
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ${severity.toUpperCase()}: WhatsApp Integration Alert`,
        attachments: [{
          color: severity === 'critical' ? 'danger' : 'warning',
          fields: [{
            title: 'Details',
            value: JSON.stringify(data, null, 2),
            short: false
          }]
        }]
      })
    });
  }

  // Email (usando SendGrid, SES, etc.)
  if (process.env.ALERT_EMAIL) {
    // Implementar envio de email
  }

  // Log local
  console.log(`ALERT [${severity}]:`, message);
};
```

---

## 📋 Checklist de Manutenção

### Diário
- [ ] Verificar status das instâncias ativas
- [ ] Revisar logs de erro das últimas 24h
- [ ] Confirmar que webhooks estão funcionando
- [ ] Verificar métricas de performance

### Semanal
- [ ] Executar auditoria de isolamento
- [ ] Analisar relatório de uso
- [ ] Limpar logs antigos
- [ ] Verificar integridade dos dados
- [ ] Testar procedimentos de backup

### Mensal
- [ ] Revisar e atualizar documentação
- [ ] Analisar tendências de performance
- [ ] Planejar otimizações
- [ ] Revisar políticas de segurança
- [ ] Atualizar dependências

### Trimestral
- [ ] Auditoria completa de segurança
- [ ] Revisão da arquitetura
- [ ] Planejamento de melhorias
- [ ] Treinamento da equipe
- [ ] Teste de disaster recovery

---

## 🆘 Contatos de Emergência

### Escalação de Problemas
1. **Nível 1**: Desenvolvedor responsável
2. **Nível 2**: Tech Lead
3. **Nível 3**: CTO/Arquiteto

### Informações de Contato
- **Evolution API Support**: [contato da Evolution]
- **Supabase Support**: [contato do Supabase]
- **Equipe DevOps**: [contato interno]

### Procedimentos de Emergência
1. Identificar severidade do problema
2. Executar troubleshooting básico
3. Documentar tentativas de correção
4. Escalar conforme necessário
5. Comunicar status aos stakeholders

---

**Status**: ✅ **GUIA DE MANUTENÇÃO COMPLETO**  
**Cobertura**: 🔧 **TODOS OS CENÁRIOS DOCUMENTADOS**  
**Automação**: ⚙️ **SCRIPTS E MONITORAMENTO INCLUÍDOS**