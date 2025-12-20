# 🔍 Análise Completa: Dessincronização de `order_number`

## 📊 Situação Atual

### Dados do Tenant Problemático (`8d2888f1-64a5-445f-84f5-2614d5160251`)

**Sequência:**
- `service_order_sequences.last_number`: **9852**
- Maior `order_number` real em `contract_billing_periods`: **999**
- Maior `order_number` real em `standalone_billing_periods`: **985**
- **Gap**: 9852 - 999 = **8853 números "perdidos"**

**Estatísticas:**
- Total de períodos: 981
- Períodos com `order_number`: 981 (100%)
- Períodos sem duplicatas: ✅ (constraint funcionando)
- Períodos com 4+ dígitos: 0 (todos são 3 dígitos)

**Padrão de Criação:**
- **2025-11-04**: 950 períodos criados (números 13-964) - **CRIAÇÃO EM MASSA**
- **2025-11-06**: 24 períodos criados (números desordenados: 202, 229, 969-996)
- **2025-12-06**: 3 períodos criados (números 997-999)

---

## 🔄 Fluxo Atual de Geração de `order_number`

### 1. **Trigger Automático**
```sql
CREATE TRIGGER trigger_generate_order_number_contract_period 
BEFORE INSERT ON contract_billing_periods 
FOR EACH ROW 
WHEN (new.order_number IS NULL) 
EXECUTE FUNCTION generate_order_number_on_insert_contract_period()
```

### 2. **Função do Trigger**
```sql
CREATE FUNCTION generate_order_number_on_insert_contract_period()
RETURNS trigger AS $$
DECLARE
  v_order_number TEXT;
BEGIN
  IF NEW.order_number IS NULL THEN
    v_order_number := generate_service_order_number(NEW.tenant_id);
    NEW.order_number := v_order_number;
  END IF;
  RETURN NEW;
END;
$$;
```

### 3. **Função de Geração (PROBLEMÁTICA)**
```sql
CREATE FUNCTION generate_service_order_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_next integer;
  v_formatted text;
BEGIN
  -- Lock por tenant para serializar tentativas simultâneas
  PERFORM pg_advisory_lock(hashtext(p_tenant_id::text));

  WITH up AS (
    INSERT INTO public.service_order_sequences(tenant_id, last_number)
    VALUES (p_tenant_id, 1)
    ON CONFLICT (tenant_id)
    DO UPDATE SET last_number = public.service_order_sequences.last_number + 1,
                  updated_at = timezone('America/Sao_Paulo'::text, now())
    RETURNING last_number
  )
  SELECT last_number INTO v_next FROM up;

  PERFORM pg_advisory_unlock(hashtext(p_tenant_id::text));

  v_formatted := LPAD(v_next::text, 3, '0');
  RETURN v_formatted;
END;
$$;
```

---

## 🐛 Problemas Identificados

### **Problema 1: Sequência Incrementa Antes do Commit**

**Cenário:**
1. Trigger chama `generate_service_order_number()`
2. Função incrementa `last_number` de 999 → 1000
3. Retorna "1000" (4 dígitos, mas `LPAD` formata como "1000")
4. **INSERÇÃO FALHA** (constraint, validação, etc.)
5. **ROLLBACK** da transação
6. **MAS** a sequência já foi incrementada! ❌

**Resultado:** Sequência avança sem criar período.

### **Problema 2: Inserções em Lote com Falhas Parciais**

**Cenário (2025-11-04 - 950 períodos):**
1. Sistema tenta criar 950 períodos retroativos
2. Cada período chama o trigger
3. Sequência incrementa 950 vezes: 13 → 963
4. **Algumas inserções falham** (validação, constraint, etc.)
5. Períodos criados: 950, mas sequência avançou mais
6. **Resultado:** Sequência dessincronizada

### **Problema 3: Race Condition em Inserções Simultâneas**

**Cenário:**
1. **Transação A**: Gera número 985, ainda não commitou
2. **Transação B**: Gera número 986 (sequência já incrementou)
3. **Transação A**: Tenta inserir com 985 → **CONFLITO** (número já existe)
4. **Transação B**: Insere com 986 → ✅ Sucesso
5. **Transação A**: Rollback, mas sequência já está em 987

**Resultado:** Números "pulados" e sequência avançando.

### **Problema 4: Formatação com LPAD(3) para Números > 999**

**Cenário:**
- Sequência em 9852
- `LPAD(9852::text, 3, '0')` = `"9852"` (4 dígitos)
- Constraint espera números únicos, mas formato pode causar problemas

**Observação:** Atualmente não há períodos com 4 dígitos, mas a sequência está preparada para gerar.

---

## 🔍 Causa Raiz

### **Arquitetura Atual (Problemática)**

```
INSERT → TRIGGER → generate_service_order_number() → INCREMENTA SEQUÊNCIA
                                                              ↓
                                                    RETORNA NÚMERO
                                                              ↓
                                                    TENTA INSERIR
                                                              ↓
                                              ❌ FALHA? → ROLLBACK
                                              ✅ SUCESSO? → COMMIT
```

**Problema:** A sequência é incrementada **ANTES** da inserção ser confirmada.

### **Por que aconteceu?**

1. **Criação em massa (2025-11-04)**: 950 períodos criados de uma vez
   - Provavelmente via script Python ou importação em lote
   - Múltiplas transações simultâneas
   - Algumas falharam, mas sequência já havia incrementado

2. **Falhas de validação**: Períodos que falharam na inserção por:
   - Constraint violations
   - Validações de negócio
   - Erros de contexto de tenant

3. **Rollbacks de transação**: Transações que foram revertidas, mas sequência não foi revertida

---

## 📋 Planejamento de Solução

### **Fase 1: Correção Imediata (Sincronizar Sequência)**

**Objetivo:** Corrigir a sequência para o tenant problemático

**Ações:**
1. Identificar o maior `order_number` real (999)
2. Atualizar `service_order_sequences.last_number` para 999
3. Validar que não há conflitos

**SQL:**
```sql
-- 1. Encontrar maior número real
SELECT MAX(order_number::integer) 
FROM (
  SELECT order_number FROM contract_billing_periods 
  WHERE tenant_id = '8d2888f1-64a5-445f-84f5-2614d5160251' 
    AND order_number ~ '^[0-9]+$'
  UNION ALL
  SELECT order_number FROM standalone_billing_periods 
  WHERE tenant_id = '8d2888f1-64a5-445f-84f5-2614d5160251' 
    AND order_number ~ '^[0-9]+$'
) t;

-- 2. Atualizar sequência
UPDATE service_order_sequences
SET last_number = 999  -- ou o valor encontrado acima
WHERE tenant_id = '8d2888f1-64a5-445f-84f5-2614d5160251';
```

### **Fase 2: Melhorar Função de Geração (Prevenir Problemas Futuros)**

**Objetivo:** Tornar a função mais robusta e resiliente

**Melhorias:**
1. **Verificar se número já existe** antes de retornar
2. **Retry logic** em caso de conflito
3. **Validação de formato** (garantir 3 dígitos)
4. **Logging** para auditoria

**Nova Função:**
```sql
CREATE OR REPLACE FUNCTION generate_service_order_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_next integer;
  v_formatted text;
  v_max_attempts integer := 10;
  v_attempt integer := 0;
  v_exists boolean;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Não foi possível gerar número único após % tentativas', v_max_attempts;
    END IF;

    -- Lock por tenant para serializar tentativas simultâneas
    PERFORM pg_advisory_lock(hashtext(p_tenant_id::text));

    -- Incrementar sequência
    WITH up AS (
      INSERT INTO public.service_order_sequences(tenant_id, last_number)
      VALUES (p_tenant_id, 1)
      ON CONFLICT (tenant_id)
      DO UPDATE SET last_number = public.service_order_sequences.last_number + 1,
                    updated_at = timezone('America/Sao_Paulo'::text, now())
      RETURNING last_number
    )
    SELECT last_number INTO v_next FROM up;

    PERFORM pg_advisory_unlock(hashtext(p_tenant_id::text));

    -- Formatar com 3 dígitos (limitar a 999)
    IF v_next > 999 THEN
      -- Resetar sequência se passar de 999 (ou implementar lógica de reinício)
      RAISE WARNING 'Sequência excedeu 999 para tenant %', p_tenant_id;
      -- Opção: resetar para 1 ou continuar com 4 dígitos
      v_formatted := LPAD(v_next::text, 4, '0');
    ELSE
      v_formatted := LPAD(v_next::text, 3, '0');
    END IF;

    -- Verificar se número já existe (proteção contra race condition)
    SELECT EXISTS(
      SELECT 1 FROM contract_billing_periods 
      WHERE tenant_id = p_tenant_id AND order_number = v_formatted
      UNION ALL
      SELECT 1 FROM standalone_billing_periods 
      WHERE tenant_id = p_tenant_id AND order_number = v_formatted
    ) INTO v_exists;

    -- Se não existe, retornar
    IF NOT v_exists THEN
      RETURN v_formatted;
    END IF;

    -- Se existe, tentar novamente (loop)
    RAISE NOTICE 'Número % já existe para tenant %, tentando novamente...', v_formatted, p_tenant_id;
  END LOOP;
END;
$$;
```

### **Fase 3: Adicionar Retry Logic no Frontend**

**Objetivo:** Tratar conflitos de forma elegante no código

**Implementação:**
- Capturar erro de constraint violation
- Tentar novamente automaticamente (até 3 tentativas)
- Exibir mensagem amigável ao usuário

### **Fase 4: Monitoramento e Prevenção**

**Objetivo:** Detectar problemas antes que causem impacto

**Ações:**
1. **Função de validação**: Verificar se sequência está sincronizada
2. **Job periódico**: Verificar e corrigir dessincronizações automaticamente
3. **Alertas**: Notificar quando gap > 100 números

---

## 🎯 Plano de Execução

### **Passo 1: Análise e Validação** ✅ (Concluído)
- [x] Identificar problema
- [x] Analisar causa raiz
- [x] Documentar fluxo atual

### **Passo 2: Correção Imediata** (Próximo)
- [ ] Sincronizar sequência do tenant problemático
- [ ] Validar que não há conflitos
- [ ] Testar criação de novo período

### **Passo 3: Melhoria da Função** (Prevenção)
- [ ] Implementar nova função com retry logic
- [ ] Adicionar validação de existência
- [ ] Testar em ambiente de desenvolvimento

### **Passo 4: Aplicar para Todos os Tenants** (Prevenção Global)
- [ ] Criar script de sincronização para todos os tenants
- [ ] Executar validação global
- [ ] Documentar processo

### **Passo 5: Monitoramento** (Longo Prazo)
- [ ] Criar função de validação periódica
- [ ] Implementar alertas
- [ ] Documentar procedimento de manutenção

---

## ⚠️ Riscos e Considerações

### **Riscos da Correção:**
1. **Conflito durante sincronização**: Se houver inserção simultânea
2. **Números duplicados**: Se resetar sequência muito baixo
3. **Impacto em produção**: Correção pode afetar criação de períodos

### **Mitigações:**
1. Executar correção em horário de baixo uso
2. Fazer backup da sequência antes de alterar
3. Testar em ambiente de desenvolvimento primeiro
4. Implementar lock durante sincronização

---

## 📝 Notas Técnicas

### **Por que a sequência não reverte em rollback?**
- `service_order_sequences` é atualizada **fora** da transação principal
- O lock `pg_advisory_lock` é liberado antes do commit
- Se a inserção falhar, a sequência já foi incrementada

### **Por que não usar SEQUENCE do PostgreSQL?**
- Sequências do PostgreSQL têm comportamento similar (não revertem em rollback)
- A implementação atual permite mais controle (formatação, validação)
- Mas precisa de melhorias para ser mais robusta

### **Alternativa: Usar SEQUENCE com validação**
- Criar sequence por tenant
- Validar antes de inserir
- Retry em caso de conflito

---

## ✅ Checklist de Validação

Antes de aplicar a correção, verificar:
- [ ] Backup da tabela `service_order_sequences`
- [ ] Backup da tabela `contract_billing_periods`
- [ ] Verificar se há inserções em andamento
- [ ] Testar em ambiente de desenvolvimento
- [ ] Documentar mudanças

---

## 🚀 Próximos Passos

1. **Aguardar aprovação** para aplicar correção
2. **Executar correção** da sequência
3. **Testar** criação de novo período
4. **Implementar** melhorias na função
5. **Monitorar** para prevenir recorrência

