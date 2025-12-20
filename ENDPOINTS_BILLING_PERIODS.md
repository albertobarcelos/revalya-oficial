# Endpoints REST - Sistema de Períodos de Faturamento

## Visão Geral

Este documento descreve os endpoints REST para o sistema de períodos de faturamento desacoplado de charges, implementado para o Kanban de Faturamento.

## Base URL
```
https://your-supabase-project.supabase.co/rest/v1
```

## Autenticação
Todos os endpoints requerem autenticação via Bearer Token (JWT) do Supabase:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📊 Endpoints de Consulta

### GET /billing_kanban
Busca dados do Kanban de faturamento usando a VIEW `billing_kanban`.

**Parâmetros de Query:**
- `tenant_id=eq.{uuid}` - Filtrar por tenant (obrigatório)
- `kanban_column=eq.{column}` - Filtrar por coluna específica (opcional)
- `period_status=eq.{status}` - Filtrar por status do período (opcional)

**Exemplo de Request:**
```bash
curl -X GET \
  "https://your-project.supabase.co/rest/v1/billing_kanban?tenant_id=eq.123e4567-e89b-12d3-a456-426614174000&select=*" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```

**Exemplo de Response:**
```json
[
  {
    "period_id": "550e8400-e29b-41d4-a716-446655440000",
    "contract_id": "123e4567-e89b-12d3-a456-426614174000",
    "customer_id": "789e0123-e89b-12d3-a456-426614174000",
    "contract_number": "CONT-2024-001",
    "customer_name": "João Silva",
    "customer_cpf_cnpj": "123.456.789-00",
    "total_amount": 1500.00,
    "contract_status": "ACTIVE",
    "contract_final_date": "2024-12-31",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31",
    "bill_date": "2024-01-15",
    "period_status": "DUE_TODAY",
    "billed_at": null,
    "charge_id": null,
    "manual_mark": false,
    "manual_reason": null,
    "amount_planned": 1500.00,
    "amount_billed": null,
    "kanban_column": "FATURAR_HOJE"
  }
]
```

---

## 🔧 Endpoints de Operação (RPC)

### POST /rpc/mark_period_billed
Marca um período como faturado manualmente.

**Payload:**
```json
{
  "p_billing_period_id": "550e8400-e29b-41d4-a716-446655440000",
  "p_actor": "123e4567-e89b-12d3-a456-426614174000",
  "p_reason": "Faturamento manual via Kanban"
}
```

**Exemplo de Request:**
```bash
curl -X POST \
  "https://your-project.supabase.co/rest/v1/rpc/mark_period_billed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_billing_period_id": "550e8400-e29b-41d4-a716-446655440000",
    "p_actor": "123e4567-e89b-12d3-a456-426614174000",
    "p_reason": "Faturamento manual via Kanban"
  }'
```

**Response de Sucesso:**
```json
{
  "success": true,
  "period_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "BILLED",
  "billed_at": "2024-01-15T10:30:00Z"
}
```

---

### POST /rpc/skip_period
Pula um período de faturamento.

**Payload:**
```json
{
  "p_billing_period_id": "550e8400-e29b-41d4-a716-446655440000",
  "p_actor": "123e4567-e89b-12d3-a456-426614174000",
  "p_reason": "Cliente solicitou suspensão temporária"
}
```

**Exemplo de Request:**
```bash
curl -X POST \
  "https://your-project.supabase.co/rest/v1/rpc/skip_period" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_billing_period_id": "550e8400-e29b-41d4-a716-446655440000",
    "p_actor": "123e4567-e89b-12d3-a456-426614174000",
    "p_reason": "Cliente solicitou suspensão temporária"
  }'
```

**Response de Sucesso:**
```json
{
  "success": true,
  "period_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SKIPPED",
  "reason": "Cliente solicitou suspensão temporária"
}
```

---

### POST /rpc/on_charge_created_link_period
Vincula uma charge criada ao período correspondente.

**Payload:**
```json
{
  "p_charge_id": "789e0123-e89b-12d3-a456-426614174000",
  "p_contract_id": "123e4567-e89b-12d3-a456-426614174000",
  "p_bill_date": "2024-01-15",
  "p_amount": 1500.00
}
```

**Exemplo de Request:**
```bash
curl -X POST \
  "https://your-project.supabase.co/rest/v1/rpc/on_charge_created_link_period" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_charge_id": "789e0123-e89b-12d3-a456-426614174000",
    "p_contract_id": "123e4567-e89b-12d3-a456-426614174000",
    "p_bill_date": "2024-01-15",
    "p_amount": 1500.00
  }'
```

**Response de Sucesso:**
```json
{
  "success": true,
  "period_id": "550e8400-e29b-41d4-a716-446655440000",
  "charge_id": "789e0123-e89b-12d3-a456-426614174000",
  "status": "BILLED",
  "linked_at": "2024-01-15T10:30:00Z"
}
```

---

## 📋 Endpoints de Gestão de Períodos

### GET /contract_billing_periods
Busca períodos de faturamento diretamente da tabela.

**Parâmetros de Query:**
- `tenant_id=eq.{uuid}` - Filtrar por tenant (obrigatório)
- `contract_id=eq.{uuid}` - Filtrar por contrato (opcional)
- `status=eq.{status}` - Filtrar por status (opcional)
- `bill_date=gte.{date}` - Períodos com data de faturamento >= data (opcional)

**Exemplo de Request:**
```bash
curl -X GET \
  "https://your-project.supabase.co/rest/v1/contract_billing_periods?tenant_id=eq.123e4567-e89b-12d3-a456-426614174000&contract_id=eq.456e7890-e89b-12d3-a456-426614174000&select=*" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```

**Exemplo de Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
    "contract_id": "456e7890-e89b-12d3-a456-426614174000",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31",
    "bill_date": "2024-01-15",
    "status": "PENDING",
    "billed_at": null,
    "charge_id": null,
    "manual_mark": false,
    "manual_reason": null,
    "amount_planned": 1500.00,
    "amount_billed": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## 🔄 Integração com Frontend

### Exemplo de uso no React (TypeScript)

```typescript
// Hook personalizado para operações de período
export function useBillingPeriodOperations() {
  const { supabase } = useSupabase();
  
  const markPeriodBilled = async (periodId: string, reason: string) => {
    const { data, error } = await supabase.rpc('mark_period_billed', {
      p_billing_period_id: periodId,
      p_actor: getCurrentUserId(), // Implementar função para obter user ID
      p_reason: reason
    });
    
    if (error) throw error;
    return data;
  };
  
  const skipPeriod = async (periodId: string, reason: string) => {
    const { data, error } = await supabase.rpc('skip_period', {
      p_billing_period_id: periodId,
      p_actor: getCurrentUserId(),
      p_reason: reason
    });
    
    if (error) throw error;
    return data;
  };
  
  return { markPeriodBilled, skipPeriod };
}

// Exemplo de uso no componente Kanban
function KanbanCard({ contract }: { contract: KanbanContract }) {
  const { markPeriodBilled, skipPeriod } = useBillingPeriodOperations();
  
  const handleMarkBilled = async () => {
    if (contract.period_id) {
      await markPeriodBilled(contract.period_id, 'Marcado como faturado via Kanban');
    }
  };
  
  const handleSkip = async () => {
    if (contract.period_id) {
      await skipPeriod(contract.period_id, 'Período pulado pelo usuário');
    }
  };
  
  return (
    <div className="kanban-card">
      {/* Conteúdo do card */}
      <div className="actions">
        <Button onClick={handleMarkBilled}>Marcar como Faturado</Button>
        <Button onClick={handleSkip} variant="outline">Pular Período</Button>
      </div>
    </div>
  );
}
```

---

## 🚨 Códigos de Erro

### Erros Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| `23503` | Foreign key violation | Verificar se contract_id existe |
| `23505` | Unique constraint violation | Período já existe para este contrato |
| `42501` | Insufficient privilege | Verificar permissões RLS |
| `P0001` | Raised exception | Erro de negócio (ver mensagem) |

### Exemplo de Response de Erro:
```json
{
  "code": "23503",
  "details": "Key (contract_id)=(123e4567-e89b-12d3-a456-426614174000) is not present in table \"contracts\".",
  "hint": null,
  "message": "insert or update on table \"contract_billing_periods\" violates foreign key constraint \"contract_billing_periods_contract_id_fkey\""
}
```

---

## 🔐 Segurança e RLS

### Políticas de Segurança Implementadas

1. **Isolamento por Tenant**: Todos os dados são filtrados por `tenant_id`
2. **Contexto de Tenant**: Função `set_tenant_context_simple` deve ser chamada antes das operações
3. **Auditoria**: Todas as operações registram `actor_id` e `reason`

### Exemplo de Configuração de Contexto:
```sql
-- Sempre chamar antes de operações sensíveis
SELECT set_tenant_context_simple('123e4567-e89b-12d3-a456-426614174000');
```

---

## 📈 Performance e Otimização

### Índices Criados
- `(tenant_id, status)` - Para filtros por status
- `(tenant_id, bill_date)` - Para ordenação por data
- `(contract_id, period_start)` - Para busca por contrato e período

### Recomendações
1. Sempre incluir `tenant_id` nos filtros
2. Usar `select=*` apenas quando necessário
3. Implementar paginação para grandes volumes
4. Cache no frontend para dados frequentemente acessados

---

## 🧪 Testes

### Exemplo de Teste de Integração:
```javascript
describe('Billing Periods API', () => {
  test('should mark period as billed', async () => {
    const response = await supabase.rpc('mark_period_billed', {
      p_billing_period_id: 'test-period-id',
      p_actor: 'test-user-id',
      p_reason: 'Test billing'
    });
    
    expect(response.error).toBeNull();
    expect(response.data.success).toBe(true);
  });
});
```

---

## 📝 Changelog

### v1.0.0 (2024-01-15)
- ✅ Implementação inicial do sistema de períodos
- ✅ VIEW `billing_kanban` criada
- ✅ Funções RPC implementadas
- ✅ Edge Function para recálculo automático
- ✅ Documentação completa dos endpoints

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verificar logs do Supabase
2. Consultar políticas RLS ativas
3. Validar contexto de tenant
4. Revisar permissões do usuário

**Logs úteis:**
```sql
-- Ver períodos por status
SELECT status, COUNT(*) FROM contract_billing_periods 
WHERE tenant_id = 'your-tenant-id' 
GROUP BY status;

-- Ver últimas operações
SELECT * FROM contract_billing_periods 
WHERE tenant_id = 'your-tenant-id' 
ORDER BY updated_at DESC 
LIMIT 10;
```