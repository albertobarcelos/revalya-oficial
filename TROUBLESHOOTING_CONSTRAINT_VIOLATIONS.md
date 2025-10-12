# 🔧 TROUBLESHOOTING: Violações de Constraint - Guia Completo

## 📋 **Visão Geral**

Este guia fornece um processo estruturado para diagnosticar e resolver problemas de violação de constraint, especificamente focado na tabela `conciliation_staging` e o erro `conciliation_staging_origem_check`.

**Data de Criação:** 2025-01-28  
**Última Atualização:** 2025-01-28  
**Versão:** 1.0  

---

## 🚨 **Sintomas Comuns**

### **Erro Principal:**
```
new row for relation "conciliation_staging" violates check constraint "conciliation_staging_origem_check"
```

### **Outros Indicadores:**
- Edge Functions falhando com status 500
- Logs do PostgreSQL mostrando constraint violations
- Dados não sendo inseridos na tabela `conciliation_staging`
- Webhooks ASAAS não processando corretamente

---

## 🔍 **Processo de Diagnóstico**

### **Passo 1: Verificar Logs do PostgreSQL**
```sql
-- Buscar erros recentes de constraint
SELECT 
  log_time,
  message,
  detail
FROM pg_log 
WHERE message LIKE '%conciliation_staging_origem_check%'
AND log_time >= NOW() - INTERVAL '24 hours'
ORDER BY log_time DESC;
```

### **Passo 2: Identificar Valores Inválidos**
```sql
-- Verificar tentativas de inserção registradas
SELECT 
  attempted_value,
  COUNT(*) as occurrences,
  MAX(created_at) as last_attempt
FROM constraint_violation_log
WHERE constraint_name = 'conciliation_staging_origem_check'
AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY attempted_value
ORDER BY occurrences DESC;
```

### **Passo 3: Verificar Constraint Atual**
```sql
-- Consultar definição da constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'conciliation_staging_origem_check';
```

### **Passo 4: Analisar Edge Functions**
```bash
# Verificar logs das Edge Functions
supabase functions logs asaas-import-charges
supabase functions logs asaas-webhook-charges
```

---

## 🛠️ **Soluções por Cenário**

### **Cenário 1: Valor 'asaas' (minúsculo) sendo inserido**

**Problema:** Código tentando inserir `'asaas'` em vez de `'ASAAS'`

**Solução:**
1. Localizar o código responsável:
   ```bash
   grep -r "origem.*'asaas'" supabase/functions/
   ```

2. Corrigir para maiúsculo:
   ```typescript
   // ❌ Incorreto
   origem: 'asaas'
   
   // ✅ Correto
   origem: 'ASAAS' // AIDEV-NOTE: Maiúsculo conforme constraint
   ```

### **Cenário 2: Novo valor não permitido pela constraint**

**Problema:** Tentativa de inserir valor não listado na constraint

**Solução:**
1. Verificar se o valor deve ser adicionado à constraint:
   ```sql
   -- Adicionar novo valor à constraint
   ALTER TABLE conciliation_staging 
   DROP CONSTRAINT conciliation_staging_origem_check;
   
   ALTER TABLE conciliation_staging 
   ADD CONSTRAINT conciliation_staging_origem_check 
   CHECK (origem = ANY (ARRAY[
     'ASAAS'::text,
     'PIX'::text,
     'MANUAL'::text,
     'CORA'::text,
     'ITAU'::text,
     'BRADESCO'::text,
     'SANTANDER'::text,
     'NOVO_VALOR'::text  -- Adicionar aqui
   ]));
   ```

### **Cenário 3: Dados corrompidos ou importação manual**

**Problema:** Dados sendo inseridos por processo externo

**Solução:**
1. Verificar scripts de importação:
   ```bash
   find . -name "*.js" -o -name "*.ts" | xargs grep -l "conciliation_staging"
   ```

2. Validar dados antes da inserção:
   ```typescript
   // Validação obrigatória
   const validOrigens = ['ASAAS', 'PIX', 'MANUAL', 'CORA', 'ITAU', 'BRADESCO', 'SANTANDER'];
   
   if (!validOrigens.includes(data.origem)) {
     throw new Error(`Origem inválida: ${data.origem}. Valores aceitos: ${validOrigens.join(', ')}`);
   }
   ```

---

## 🔧 **Ferramentas de Diagnóstico**

### **1. Edge Function de Monitoramento**
```bash
# Deploy da função de monitoramento
supabase functions deploy monitor-constraint-violations

# Executar manualmente
curl -X POST "https://your-project.supabase.co/functions/v1/monitor-constraint-violations" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### **2. Queries de Diagnóstico Rápido**
```sql
-- Verificar últimas inserções na tabela
SELECT origem, COUNT(*), MAX(created_at)
FROM conciliation_staging 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY origem;

-- Verificar configuração de tenant
SELECT tenant_id, integration_type, is_active
FROM tenant_integrations 
WHERE integration_type = 'asaas';
```

### **3. Script de Validação**
```typescript
// Validar todos os valores de origem existentes
const { data, error } = await supabase
  .from('conciliation_staging')
  .select('origem, COUNT(*)')
  .group('origem');

console.log('Valores de origem encontrados:', data);
```

---

## 📊 **Monitoramento Preventivo**

### **Alertas Configurados:**
- 🔴 **Crítico:** > 10 violações/hora
- 🟡 **Atenção:** > 5 violações/hora  
- 🟢 **Normal:** < 5 violações/hora

### **Verificações Automáticas:**
1. **A cada 15 minutos:** Executar função de monitoramento
2. **Diariamente:** Relatório de violações
3. **Semanalmente:** Análise de tendências

### **Dashboard de Saúde:**
```sql
-- Query para dashboard
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as violations,
  COUNT(DISTINCT tenant_id) as affected_tenants
FROM constraint_violation_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

---

## 🚀 **Prevenção de Problemas**

### **1. Validação no Frontend**
```typescript
// Componente de validação
const VALID_ORIGENS = ['ASAAS', 'PIX', 'MANUAL', 'CORA', 'ITAU', 'BRADESCO', 'SANTANDER'] as const;

type ValidOrigem = typeof VALID_ORIGENS[number];

function validateOrigem(origem: string): origem is ValidOrigem {
  return VALID_ORIGENS.includes(origem as ValidOrigem);
}
```

### **2. Testes Automatizados**
```typescript
// Teste de constraint
describe('Conciliation Staging Constraints', () => {
  test('should reject invalid origem values', async () => {
    const invalidData = {
      tenant_id: 'test-tenant',
      origem: 'asaas', // minúsculo - deve falhar
      id_externo: 'test-123'
    };
    
    await expect(
      supabase.from('conciliation_staging').insert(invalidData)
    ).rejects.toThrow('conciliation_staging_origem_check');
  });
});
```

### **3. Code Review Checklist**
- [ ] Valores de `origem` estão em MAIÚSCULO?
- [ ] Validação de entrada implementada?
- [ ] Testes de constraint incluídos?
- [ ] Documentação atualizada?

---

## 📚 **Referências**

### **Arquivos Relacionados:**
- <mcfile name="SOLUCAO_INCONSISTENCIA_ORIGEM.md" path="F:\NEXFINAN\revalya-oficial\SOLUCAO_INCONSISTENCIA_ORIGEM.md"></mcfile>
- <mcfile name="MONITORAMENTO_CONSTRAINT_VIOLATIONS.md" path="F:\NEXFINAN\revalya-oficial\MONITORAMENTO_CONSTRAINT_VIOLATIONS.md"></mcfile>
- <mcfile name="20250128_create_constraint_monitoring.sql" path="F:\NEXFINAN\revalya-oficial\supabase\migrations\20250128_create_constraint_monitoring.sql"></mcfile>

### **Edge Functions:**
- <mcfile name="asaas-import-charges/index.ts" path="F:\NEXFINAN\revalya-oficial\supabase\functions\asaas-import-charges\index.ts"></mcfile>
- <mcfile name="asaas-webhook-charges/index.ts" path="F:\NEXFINAN\revalya-oficial\supabase\functions\asaas-webhook-charges\index.ts"></mcfile>
- <mcfile name="monitor-constraint-violations/index.ts" path="F:\NEXFINAN\revalya-oficial\supabase\functions\monitor-constraint-violations\index.ts"></mcfile>

### **Documentação Técnica:**
- <mcfile name="ESTRUTURA_COBRANÇA_ASAAS.md" path="F:\NEXFINAN\revalya-oficial\Documentação do Projeto\INTEGRAÇÕES\INTEGRAÇÕES SISTEMAS\ASAAS\ESTRUTURA_COBRANÇA_ASAAS.md"></mcfile>

---

## 🔄 **Histórico de Versões**

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2025-01-28 | Criação inicial do guia |

---

**Mantido por:** Equipe de Desenvolvimento  
**Próxima Revisão:** 2025-02-28