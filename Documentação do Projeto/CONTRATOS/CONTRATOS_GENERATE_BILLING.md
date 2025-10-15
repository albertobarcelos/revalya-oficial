# Campo Generate Billing - Contratos

## 📋 Visão Geral

O campo `generate_billing` foi adicionado à tabela `contracts` para permitir controle granular sobre quais contratos devem gerar cobranças automáticas no sistema. Este campo oferece flexibilidade para desabilitar a geração automática de faturas para contratos específicos.

## 🎯 Objetivo

Permitir que administradores controlem individualmente quais contratos participam do processo de faturamento automático, oferecendo maior flexibilidade na gestão de cobranças.

## 🔧 Implementação Técnica

### Database Schema

```sql
-- AIDEV-NOTE: Campo adicionado à tabela contracts para controle de faturamento automático
ALTER TABLE contracts 
ADD COLUMN generate_billing BOOLEAN DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN contracts.generate_billing IS 'Controla se o contrato deve gerar cobranças automáticas. true = gera cobranças, false = não gera cobranças automáticas';
```

### Tipos TypeScript

```typescript
// AIDEV-NOTE: Interface atualizada para incluir o campo generate_billing
interface Contract {
  id: string;
  tenant_id: string;
  client_id: string;
  name: string;
  description?: string;
  value: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CANCELED';
  start_date: string;
  end_date?: string;
  billing_day: number;
  payment_method: 'CREDIT_CARD' | 'BANK_SLIP' | 'PIX' | 'BANK_TRANSFER';
  generate_billing: boolean; // ← Novo campo
  created_at: string;
  updated_at: string;
}
```

## 🖥️ Interface do Usuário

### Formulário de Criação/Edição de Contratos

O campo foi adicionado ao formulário de contratos como um switch/toggle:

```typescript
// AIDEV-NOTE: Campo generate_billing no formulário de contratos
<FormField
  control={form.control}
  name="generate_billing"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel className="text-base">
          Gerar Cobrança Automática
        </FormLabel>
        <FormDescription>
          Quando ativado, este contrato será incluído no processo de geração automática de cobranças mensais.
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

## 🔄 Serviços Afetados

### 1. billingAutomationService.ts

**Função**: `processAutomaticBilling`

```typescript
// AIDEV-NOTE: Filtro adicionado para considerar apenas contratos com generate_billing = true
const { data: contracts, error } = await supabase
  .from('contracts')
  .select(`
    id, tenant_id, client_id, name, value, billing_day, payment_method,
    clients!inner(id, name, email, document),
    contract_services!inner(id, service_id, quantity, unit_price, services!inner(id, name, price))
  `)
  .eq('status', 'ACTIVE')
  .eq('generate_billing', true) // ← Filtro adicionado
  .eq('tenant_id', tenantId);
```

### 2. billingForecastService.ts

**Função**: `generateBillingForecasts`

```typescript
// AIDEV-NOTE: Filtro adicionado para considerar apenas contratos com generate_billing = true
const { data: contracts, error } = await supabase
  .from('contracts')
  .select(`
    id, tenant_id, client_id, name, value, billing_day, payment_method,
    clients!inner(id, name, email),
    contract_services!inner(id, service_id, quantity, unit_price, services!inner(id, name, price))
  `)
  .eq('status', 'ACTIVE')
  .eq('generate_billing', true) // ← Filtro adicionado
  .eq('tenant_id', tenantId);
```

### 3. useContracts.ts

**Hook atualizado** para incluir o campo nas queries:

```typescript
// AIDEV-NOTE: Campo generate_billing incluído nas queries de contratos
const { data: contracts, error } = await supabase
  .from('contracts')
  .select(`
    id, tenant_id, client_id, name, description, value, status,
    start_date, end_date, billing_day, payment_method, generate_billing,
    created_at, updated_at,
    clients!inner(id, name, email, document)
  `)
  .eq('tenant_id', currentTenant.id);
```

## 🛡️ Segurança Multi-Tenant

Todas as implementações seguem os padrões de segurança multi-tenant estabelecidos:

- **Contexto de Tenant**: Sempre validado antes das operações
- **RLS (Row Level Security)**: Aplicado automaticamente
- **Validação Dupla**: Client-side e server-side
- **Auditoria**: Logs de todas as operações críticas

## 📊 Comportamento do Sistema

### Contratos com `generate_billing = true`
- ✅ Incluídos no processo de faturamento automático
- ✅ Geram previsões de cobrança
- ✅ Aparecem nos relatórios de faturamento
- ✅ Processados pelos serviços de automação

### Contratos com `generate_billing = false`
- ❌ Excluídos do faturamento automático
- ❌ Não geram previsões de cobrança
- ✅ Ainda podem ter cobranças manuais
- ✅ Mantêm histórico de cobranças anteriores

## 🔄 Migração e Compatibilidade

### Valor Padrão
- **Novos contratos**: `generate_billing = true` (padrão)
- **Contratos existentes**: `generate_billing = true` (aplicado via migration)

### Retrocompatibilidade
- Todos os contratos existentes continuam funcionando normalmente
- Nenhuma funcionalidade existente foi quebrada
- O comportamento padrão mantém a funcionalidade anterior

## 🧪 Testes e Validação

### Cenários Testados
1. ✅ Criação de contrato com `generate_billing = true`
2. ✅ Criação de contrato com `generate_billing = false`
3. ✅ Edição do campo em contratos existentes
4. ✅ Filtros nos serviços de faturamento
5. ✅ Geração de previsões de cobrança
6. ✅ Interface do usuário responsiva

### Validações de Segurança
- ✅ Contexto multi-tenant respeitado
- ✅ RLS aplicado corretamente
- ✅ Validação de tipos TypeScript
- ✅ Tratamento de erros implementado

## 📝 Notas de Desenvolvimento

### Padrões Seguidos
- **Clean Code**: Código legível e bem documentado
- **AIDEV-NOTE**: Comentários explicativos em pontos críticos
- **TypeScript**: Tipagem rigorosa sem uso de `any`
- **Multi-tenant**: Segurança e isolamento de dados

### Arquivos Modificados
1. `supabase/migrations/` - Schema do banco de dados
2. `src/components/contracts/types.ts` - Tipos TypeScript
3. `src/components/contracts/NewContractForm.tsx` - Interface do usuário
4. `src/hooks/useContracts.ts` - Hook de contratos
5. `src/services/billingAutomationService.ts` - Automação de cobrança
6. `src/services/billingForecastService.ts` - Previsões de cobrança

## 🚀 Próximos Passos

### Melhorias Futuras
- [ ] Dashboard para visualizar contratos por status de faturamento
- [ ] Relatórios específicos para contratos sem faturamento automático
- [ ] Notificações para administradores sobre contratos desabilitados
- [ ] Histórico de alterações do campo `generate_billing`

### Monitoramento
- [ ] Métricas de contratos com faturamento desabilitado
- [ ] Alertas para contratos importantes sem faturamento
- [ ] Análise de impacto financeiro

---

**Data de Implementação**: Janeiro 2025  
**Versão**: 2.0.0  
**Responsável**: Sistema Revalya  
**Status**: ✅ Implementado e Testado