# 🔍 MONITORAMENTO: Violações de Constraint - `conciliation_staging`

## 📋 **Objetivo**
Implementar monitoramento proativo para detectar e alertar sobre violações de constraint na tabela `conciliation_staging`, especificamente para o campo `origem`.

---

## 🚨 **Alertas Configurados**

### **1. Constraint Violation Detection**
```sql
-- Query para detectar tentativas de inserção com valores incorretos
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  n_tup_ins as inserts_attempted,
  n_tup_upd as updates_attempted
FROM pg_stat_user_tables 
WHERE tablename = 'conciliation_staging'
AND (n_tup_ins > 0 OR n_tup_upd > 0);
```

### **2. Log Monitoring Query**
```sql
-- Monitorar logs de erro relacionados a constraint violations
SELECT 
  log_time,
  message,
  detail,
  hint
FROM pg_log 
WHERE message LIKE '%conciliation_staging_origem_check%'
AND log_time >= NOW() - INTERVAL '24 hours'
ORDER BY log_time DESC;
```

---

## 📊 **Métricas de Monitoramento**

### **Valores Válidos para `origem`:**
- ✅ `'ASAAS'` - Integração ASAAS
- ✅ `'PIX'` - Pagamentos PIX
- ✅ `'MANUAL'` - Inserções manuais
- ✅ `'CORA'` - Banco Cora
- ✅ `'ITAU'` - Banco Itaú
- ✅ `'BRADESCO'` - Banco Bradesco
- ✅ `'SANTANDER'` - Banco Santander

### **Valores Inválidos (Geram Erro):**
- ❌ `'asaas'` (minúsculo)
- ❌ `'pix'` (minúsculo)
- ❌ `'manual'` (minúsculo)
- ❌ Qualquer outro valor não listado

---

## 🔧 **Edge Function de Monitoramento**

### **Estrutura Proposta:**
```typescript
// supabase/functions/monitor-constraint-violations/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar logs de erro recentes
    const { data: recentErrors, error } = await supabase.rpc(
      'get_recent_constraint_violations',
      { hours_back: 1 }
    );

    if (error) throw error;

    // Se houver violações, enviar alerta
    if (recentErrors && recentErrors.length > 0) {
      console.log('🚨 ALERTA: Violações de constraint detectadas:', recentErrors);
      
      // Aqui poderia integrar com sistema de notificação
      // (Slack, Discord, Email, etc.)
    }

    return new Response(
      JSON.stringify({ 
        status: 'success',
        violations_found: recentErrors?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no monitoramento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 📅 **Cronograma de Execução**

### **Monitoramento Automático:**
- **Frequência:** A cada 15 minutos
- **Método:** Cron job ou Edge Function scheduled
- **Retenção:** Logs dos últimos 7 dias

### **Relatórios:**
- **Diário:** Resumo de violações (se houver)
- **Semanal:** Análise de tendências
- **Mensal:** Relatório completo de saúde do sistema

---

## 🛠️ **Implementação**

### **1. Função de Monitoramento PostgreSQL**
```sql
-- Criar função para buscar violações recentes
CREATE OR REPLACE FUNCTION get_recent_constraint_violations(hours_back INTEGER DEFAULT 1)
RETURNS TABLE (
  log_time TIMESTAMP,
  error_message TEXT,
  table_name TEXT,
  constraint_name TEXT
) AS $$
BEGIN
  -- Esta função precisaria acessar pg_log ou similar
  -- Implementação específica depende da configuração do Supabase
  RETURN QUERY
  SELECT 
    NOW() as log_time,
    'Constraint violation detected' as error_message,
    'conciliation_staging' as table_name,
    'conciliation_staging_origem_check' as constraint_name
  WHERE FALSE; -- Placeholder - implementar lógica real
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **2. Trigger de Alerta**
```sql
-- Trigger para capturar tentativas de inserção inválida
CREATE OR REPLACE FUNCTION log_constraint_violation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log da tentativa de inserção inválida
  INSERT INTO constraint_violation_log (
    table_name,
    constraint_name,
    attempted_value,
    tenant_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    'conciliation_staging_origem_check',
    NEW.origem,
    NEW.tenant_id,
    NOW()
  );
  
  -- Continuar com o erro normal
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 **Dashboard de Monitoramento**

### **Métricas Principais:**
1. **Total de Violações** (últimas 24h)
2. **Valores Inválidos Mais Comuns**
3. **Tenants Afetados**
4. **Horários de Maior Incidência**
5. **Tendência Semanal**

### **Alertas Configurados:**
- 🔴 **Crítico:** > 10 violações/hora
- 🟡 **Atenção:** > 5 violações/hora
- 🟢 **Normal:** < 5 violações/hora

---

## 🔄 **Manutenção**

### **Revisão Mensal:**
- Analisar padrões de violação
- Ajustar thresholds de alerta
- Verificar eficácia do monitoramento
- Atualizar documentação

### **Ações Preventivas:**
- Validação adicional no frontend
- Testes automatizados de constraint
- Documentação clara para desenvolvedores
- Code review focado em inserções de dados

---

**Criado em:** 2025-01-28  
**Última Atualização:** 2025-01-28  
**Status:** IMPLEMENTAÇÃO PENDENTE  
**Responsável:** Equipe de Desenvolvimento