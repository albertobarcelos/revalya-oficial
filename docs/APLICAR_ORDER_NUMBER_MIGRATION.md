# 📋 Como Aplicar a Migration de Número Sequencial de Ordem de Serviço

## ✅ O que foi implementado

1. **Migration criada**: `supabase/migrations/20250117_add_order_number_to_billing_periods.sql`
2. **Coluna `order_number`** adicionada em:
   - `contract_billing_periods`
   - `standalone_billing_periods`
3. **Função RPC**: `generate_service_order_number(tenant_id)` - gera números sequenciais (001, 002, ...)
4. **Triggers automáticos**: Geram `order_number` automaticamente ao criar novos períodos
5. **Código atualizado**: Interfaces e componentes já estão prontos

## 🚀 Passos para Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard** → **SQL Editor**
2. Copie e cole o conteúdo do arquivo:
   ```
   supabase/migrations/20250117_add_order_number_to_billing_periods.sql
   ```
3. Execute o SQL
4. Verifique se as funções e triggers foram criados:
   ```sql
   -- Verificar função
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'generate_service_order_number';
   
   -- Verificar triggers
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_name LIKE '%order_number%';
   ```

### Opção 2: Via Supabase CLI (se tiver configurado)

```bash
# Se estiver usando Supabase local
supabase db push

# Ou se estiver conectado ao projeto remoto
supabase db push --linked
```

### Opção 3: Via Migration Up (se Supabase local estiver rodando)

```bash
npm run db:migrate
```

## 📝 Preencher Períodos Existentes (Opcional)

Se você já tem períodos criados antes desta migration, execute para preencher os números:

```sql
-- Para cada tenant, execute:
SELECT backfill_service_order_numbers('SEU_TENANT_ID_AQUI');

-- Exemplo: Preencher para todos os tenants
DO $$
DECLARE
  v_tenant RECORD;
  v_count INTEGER;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants WHERE active = true LOOP
    SELECT backfill_service_order_numbers(v_tenant.id) INTO v_count;
    RAISE NOTICE 'Tenant %: % períodos preenchidos', v_tenant.id, v_count;
  END LOOP;
END $$;
```

## ✅ Verificação

Após aplicar a migration, teste criando um novo período:

```sql
-- Testar criação de período (deve gerar order_number automaticamente)
INSERT INTO contract_billing_periods (
  tenant_id,
  contract_id,
  period_start,
  period_end,
  bill_date,
  status
) VALUES (
  'SEU_TENANT_ID',
  'SEU_CONTRACT_ID',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  CURRENT_DATE,
  'PENDING'
) RETURNING id, order_number;

-- Deve retornar order_number = '001' (ou próximo número disponível)
```

## 🎯 Resultado Esperado

- ✅ Novos períodos terão `order_number` gerado automaticamente (001, 002, 003, ...)
- ✅ Números são únicos por tenant
- ✅ Sequência funciona para contratos e avulsos
- ✅ Interface exibe "Ordem de Serviço N° 001" no título



