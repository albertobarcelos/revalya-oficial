# 🧪 Guia de Teste do Webhook ASAAS

Este documento fornece um guia completo para testar o webhook ASAAS e validar todo o fluxo de conciliação financeira.

## 📋 Pré-requisitos

### 1. Variáveis de Ambiente
Certifique-se de que as seguintes variáveis estão configuradas:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima

# ASAAS (Sandbox)
ASAAS_SANDBOX_API_KEY=sua-chave-sandbox
VITE_ASAAS_WEBHOOK_TOKEN=seu-token-webhook

# ASAAS (Produção) - Opcional para testes
ASAAS_PROD_API_KEY=sua-chave-producao
```

### 2. Dependências
```bash
npm install
```

### 3. Banco de Dados
Certifique-se de que a tabela `conciliation_staging` existe:
```bash
npm run db:migrate
```

## 🚀 Fluxo de Teste Completo

### Passo 1: Verificar Configuração Atual

Primeiro, verifique se o webhook já está configurado:

```bash
# Verificar configuração no banco
npm run validate:webhook-data -- --tenant-id=SEU_TENANT_ID
```

### Passo 2: Configurar Webhook (se necessário)

Se o webhook não estiver configurado, use o script de configuração:

```bash
# Configurar webhook no ambiente sandbox
npm run setup:asaas-webhook -- --env=sandbox --email=seu@email.com

# Configurar webhook no ambiente produção
npm run setup:asaas-webhook -- --env=production --email=seu@email.com
```

**IMPORTANTE:** Salve o `Auth Token` gerado, você precisará dele para os testes.

### Passo 3: Testar Webhook com Dados Simulados

Execute testes com diferentes cenários:

#### Teste Básico - Pagamento Confirmado
```bash
npm run test:webhook -- --tenant-id=SEU_TENANT_ID --event=PAYMENT_CONFIRMED
```

#### Teste - Pagamento Recebido
```bash
npm run test:webhook -- --tenant-id=SEU_TENANT_ID --event=PAYMENT_RECEIVED --value=150.00
```

#### Teste - Pagamento Vencido
```bash
npm run test:webhook -- --tenant-id=SEU_TENANT_ID --event=PAYMENT_OVERDUE --charge-id=cob_teste_123
```

#### Teste - Pagamento Estornado
```bash
npm run test:webhook -- --tenant-id=SEU_TENANT_ID --event=PAYMENT_REFUNDED --value=200.00
```

#### Teste com URL Customizada
```bash
npm run test:webhook -- --tenant-id=SEU_TENANT_ID --event=PAYMENT_CONFIRMED --webhook-url=https://seu-projeto.supabase.co/functions/v1/asaas-webhook-charges --webhook-token=SEU_TOKEN
```

### Passo 4: Validar Dados Inseridos

Após cada teste, valide se os dados foram inseridos corretamente:

```bash
# Verificar últimos 5 registros
npm run validate:webhook-data -- --tenant-id=SEU_TENANT_ID

# Verificar registro específico
npm run validate:webhook-data -- --tenant-id=SEU_TENANT_ID --charge-id=cob_teste_123

# Verificar últimos 10 registros com dados brutos
npm run validate:webhook-data -- --tenant-id=SEU_TENANT_ID --last=10 --show-raw-data
```

### Passo 5: Testar Modal de Conciliação

Teste o carregamento de dados no frontend:

```bash
# Teste básico do modal
npm run test:reconciliation -- --tenant-id=SEU_TENANT_ID

# Teste com filtros específicos
npm run test:reconciliation -- --tenant-id=SEU_TENANT_ID --status=CONFIRMED --test-filters

# Teste de performance
npm run test:reconciliation -- --tenant-id=SEU_TENANT_ID --limit=50 --test-filters
```

## 📊 Cenários de Teste Recomendados

### 1. Fluxo Completo de Pagamento
```bash
# 1. Cobrança criada
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_CREATED --charge-id=cob_fluxo_1

# 2. Pagamento recebido
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_RECEIVED --charge-id=cob_fluxo_1

# 3. Pagamento confirmado
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_CONFIRMED --charge-id=cob_fluxo_1

# Validar sequência
npm run validate:webhook-data -- --tenant-id=123 --charge-id=cob_fluxo_1
```

### 2. Teste de Volume
```bash
# Simular múltiplos pagamentos
for i in {1..10}; do
  npm run test:webhook -- --tenant-id=123 --event=PAYMENT_CONFIRMED --charge-id=cob_volume_$i --value=$((100 + i * 10))
done

# Validar performance
npm run test:reconciliation -- --tenant-id=123 --limit=20 --test-filters
```

### 3. Teste de Diferentes Status
```bash
# Pagamentos pendentes
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_AWAITING_PAYMENT --charge-id=cob_pending_1
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_AWAITING_PAYMENT --charge-id=cob_pending_2

# Pagamentos vencidos
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_OVERDUE --charge-id=cob_overdue_1
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_OVERDUE --charge-id=cob_overdue_2

# Pagamentos confirmados
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_CONFIRMED --charge-id=cob_confirmed_1
npm run test:webhook -- --tenant-id=123 --event=PAYMENT_CONFIRMED --charge-id=cob_confirmed_2

# Validar breakdown por status
npm run validate:webhook-data -- --tenant-id=123 --last=20
```

## 🔍 Validação e Debugging

### 1. Logs da Edge Function
Acesse os logs no Supabase Dashboard:
- Vá para `Functions` > `asaas-webhook-charges`
- Clique em `Logs` para ver execuções recentes
- Procure por erros ou warnings

### 2. Verificação Manual no Banco
```sql
-- Consultar registros recentes
SELECT 
  id_externo,
  status_asaas,
  valor,
  valor_pago,
  processado,
  conciliado,
  created_at
FROM conciliation_staging 
WHERE tenant_id = 'SEU_TENANT_ID'
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar estatísticas
SELECT 
  status_asaas,
  COUNT(*) as quantidade,
  SUM(valor) as valor_total,
  SUM(valor_pago) as valor_pago_total
FROM conciliation_staging 
WHERE tenant_id = 'SEU_TENANT_ID'
GROUP BY status_asaas;
```

### 3. Teste do Frontend
1. Acesse a aplicação
2. Vá para a seção de Cobranças
3. Abra o modal de conciliação
4. Verifique se os dados aparecem corretamente
5. Teste os filtros e ordenação

## ⚠️ Problemas Comuns

### 1. Webhook não recebe dados
- ✅ Verificar se a URL está correta
- ✅ Verificar se o token está configurado
- ✅ Verificar logs da Edge Function
- ✅ Verificar se o tenant_id existe

### 2. Dados não aparecem no modal
- ✅ Verificar se os dados foram inseridos na tabela
- ✅ Verificar filtros aplicados no frontend
- ✅ Verificar permissões RLS (Row Level Security)

### 3. Assinatura HMAC inválida
- ✅ Verificar se o webhook_token está correto
- ✅ Verificar se o payload está sendo enviado corretamente
- ✅ Verificar implementação da validação HMAC

### 4. Erro de tenant não encontrado
- ✅ Verificar se o tenant_id existe na tabela tenants
- ✅ Verificar se há credenciais ASAAS configuradas para o tenant

## 📈 Métricas de Sucesso

Um teste bem-sucedido deve apresentar:

1. **Webhook Response**: Status 200 OK
2. **Dados Inseridos**: Registro na tabela `conciliation_staging`
3. **Campos Preenchidos**: Todos os campos obrigatórios com dados
4. **Assinatura Válida**: HMAC validado corretamente
5. **Frontend Funcional**: Dados carregam no modal de conciliação

## 🔄 Automação de Testes

Para automatizar os testes, crie um script bash:

```bash
#!/bin/bash
# test-webhook-complete.sh

TENANT_ID="123"

echo "🚀 Iniciando testes completos do webhook ASAAS..."

# Teste básico
npm run test:webhook -- --tenant-id=$TENANT_ID --event=PAYMENT_CONFIRMED

# Aguardar processamento
sleep 2

# Validar dados
npm run validate:webhook-data -- --tenant-id=$TENANT_ID --last=1

# Testar modal
npm run test:reconciliation -- --tenant-id=$TENANT_ID --limit=5

echo "✅ Testes concluídos!"
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs da Edge Function
2. Consulte a documentação do ASAAS
3. Verifique as configurações de ambiente
4. Execute os scripts de validação

---

**AIDEV-NOTE:** Esta documentação cobre todos os aspectos do teste do webhook ASAAS, desde a configuração inicial até a validação completa do fluxo de conciliação.