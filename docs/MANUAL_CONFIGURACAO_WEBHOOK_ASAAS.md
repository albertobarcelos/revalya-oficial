# Manual de Configuração - Webhook ASAAS

## 📋 Visão Geral

Este manual descreve como configurar o webhook ASAAS para integração com o sistema Revalya. O webhook permite receber notificações automáticas sobre eventos de cobrança, mantendo os dados sincronizados em tempo real.

## 🚀 Configuração Automática (Recomendada)

### Pré-requisitos

1. **Chave da API ASAAS** configurada nas variáveis de ambiente:
   - Sandbox: `ASAAS_SANDBOX_API_KEY`
   - Produção: `ASAAS_PROD_API_KEY`

2. **URL do Supabase** configurada:
   - `NEXT_PUBLIC_SUPABASE_URL`

3. **Edge Function** `asaas-webhook-charges` implantada no Supabase

### Executando a Configuração Automática

```bash
# Ambiente Sandbox (desenvolvimento)
npm run setup:asaas-webhook -- --env=sandbox --email=seu@email.com

# Ambiente Produção
npm run setup:asaas-webhook -- --env=production --email=seu@email.com
```

### Parâmetros Opcionais

```bash
# Com chave da API personalizada
npm run setup:asaas-webhook -- --env=sandbox --email=seu@email.com --api-key=sua_chave_api

# Com URL do webhook personalizada
npm run setup:asaas-webhook -- --env=sandbox --email=seu@email.com --webhook-url=https://custom.url/webhook

# Com token de autenticação personalizado
npm run setup:asaas-webhook -- --env=sandbox --email=seu@email.com --auth-token=seu_token_personalizado
```

### Resultado da Configuração Automática

O script irá:

1. ✅ Verificar se já existe um webhook para a URL
2. ✅ Criar novo webhook com todos os eventos de cobrança
3. ✅ Gerar token de autenticação seguro (UUID v4)
4. ✅ Configurar envio sequencial de eventos
5. ✅ Retornar ID do webhook e token para uso posterior

**Exemplo de saída:**
```
✅ Webhook configurado com sucesso!

📊 Detalhes do webhook:
   ID: whk_123456789
   Nome: Revalya - Webhook Cobranças
   URL: https://projeto.supabase.co/functions/v1/asaas-webhook-charges
   Ativo: Sim
   Eventos: 23 configurados

🔐 IMPORTANTE - Salve estas informações:
   Webhook ID: whk_123456789
   Auth Token: 550e8400-e29b-41d4-a716-446655440000
```

## 🔧 Configuração Manual (Alternativa)

### Caso a configuração automática não funcione, siga estes passos:

### 1. Acesse o Painel ASAAS

- **Sandbox:** https://sandbox.asaas.com
- **Produção:** https://www.asaas.com

### 2. Navegue para Integrações

1. Faça login na sua conta ASAAS
2. Acesse **Menu do Usuário** → **Integrações**
3. Clique na aba **Webhooks**

### 3. Criar Novo Webhook

1. Clique em **"Novo Webhook"**
2. Preencha os campos:

**Configurações Básicas:**
- **Nome:** `Revalya - Webhook Cobranças`
- **URL:** `https://SEU_PROJETO.supabase.co/functions/v1/asaas-webhook-charges`
- **Email:** Seu email para notificações
- **Ativo:** ✅ Marcado
- **Fila Parada:** ❌ Desmarcado

**Configurações Avançadas:**
- **Versão da API:** `v3` (padrão)
- **Token de Autenticação:** Gere um UUID v4 (ex: `550e8400-e29b-41d4-a716-446655440000`)
- **Tipo de Envio:** `Sequencial`

### 4. Selecionar Eventos

Marque **TODOS** os seguintes eventos de cobrança:

**Eventos Principais:**
- ✅ `PAYMENT_CREATED` - Cobrança criada
- ✅ `PAYMENT_UPDATED` - Cobrança atualizada
- ✅ `PAYMENT_CONFIRMED` - Cobrança confirmada
- ✅ `PAYMENT_RECEIVED` - Cobrança recebida
- ✅ `PAYMENT_OVERDUE` - Cobrança vencida
- ✅ `PAYMENT_DELETED` - Cobrança deletada
- ✅ `PAYMENT_RESTORED` - Cobrança restaurada

**Eventos de Estorno:**
- ✅ `PAYMENT_REFUNDED` - Cobrança estornada
- ✅ `PAYMENT_REFUND_IN_PROGRESS` - Estorno em andamento
- ✅ `PAYMENT_RECEIVED_IN_CASH_UNDONE` - Recebimento em dinheiro desfeito

**Eventos de Chargeback:**
- ✅ `PAYMENT_CHARGEBACK_REQUESTED` - Chargeback solicitado
- ✅ `PAYMENT_CHARGEBACK_DISPUTE` - Disputa de chargeback
- ✅ `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` - Aguardando reversão de chargeback

**Eventos de Cobrança:**
- ✅ `PAYMENT_DUNNING_REQUESTED` - Cobrança solicitada
- ✅ `PAYMENT_DUNNING_RECEIVED` - Cobrança recebida

**Eventos de Visualização:**
- ✅ `PAYMENT_BANK_SLIP_VIEWED` - Boleto visualizado
- ✅ `PAYMENT_CHECKOUT_VIEWED` - Checkout visualizado

**Eventos de Cartão:**
- ✅ `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` - Captura de cartão recusada

**Eventos de Antecipação:**
- ✅ `PAYMENT_ANTICIPATED` - Cobrança antecipada

**Eventos de Autorização:**
- ✅ `PAYMENT_AUTHORIZED` - Cobrança autorizada

**Eventos de Análise de Risco:**
- ✅ `PAYMENT_AWAITING_RISK_ANALYSIS` - Aguardando análise de risco
- ✅ `PAYMENT_APPROVED_BY_RISK_ANALYSIS` - Aprovada pela análise de risco
- ✅ `PAYMENT_REPROVED_BY_RISK_ANALYSIS` - Reprovada pela análise de risco

### 5. Salvar Configuração

1. Clique em **"Salvar"**
2. **IMPORTANTE:** Anote o **ID do webhook** gerado
3. **IMPORTANTE:** Salve o **token de autenticação** usado

## 🔐 Configuração de Segurança

### Token de Autenticação

O token de autenticação é enviado no header `asaas-access-token` de todas as requisições do webhook. Configure este token na Edge Function para validar a origem das requisições.

### Validação de Assinatura HMAC

A Edge Function implementa validação HMAC SHA-256 para garantir a integridade dos dados. O ASAAS envia a assinatura no header `asaas-signature`.

### IPs Autorizados ASAAS

Para maior segurança, configure seu firewall para aceitar apenas requisições dos IPs oficiais do ASAAS:

- **Produção:** Consulte a documentação oficial do ASAAS
- **Sandbox:** Consulte a documentação oficial do ASAAS

## 📊 Monitoramento

### Logs do Webhook (Painel ASAAS)

1. Acesse **Menu do Usuário** → **Integrações** → **Logs de Webhook**
2. Visualize todas as requisições enviadas
3. Verifique status de resposta do seu servidor
4. Analise conteúdo enviado em caso de problemas

### Logs da Edge Function (Supabase)

1. Acesse o painel do Supabase
2. Vá para **Edge Functions** → **asaas-webhook-charges**
3. Visualize logs em tempo real
4. Monitore erros e performance

### Métricas Importantes

- **Taxa de Sucesso:** Deve ser próxima a 100%
- **Tempo de Resposta:** Deve ser < 5 segundos
- **Fila Interrompida:** Deve estar sempre ativa
- **Eventos Perdidos:** Deve ser zero

## 🚨 Troubleshooting

### Webhook Não Recebe Eventos

1. **Verifique a URL:** Deve estar acessível publicamente
2. **Teste a Edge Function:** Use `curl` para testar manualmente
3. **Verifique logs:** Analise erros na Edge Function
4. **Status HTTP:** Certifique-se de retornar status 200

### Fila de Eventos Interrompida

1. **Acesse o painel ASAAS:** Integrações → Webhooks
2. **Reative a fila:** Clique em "Reativar fila"
3. **Corrija erros:** Resolva problemas na Edge Function
4. **Monitore:** Acompanhe se a fila volta a funcionar

### Eventos Duplicados

A Edge Function implementa proteção contra duplicatas usando:
- Constraint única por `tenant_id` + `id_externo`
- Operação UPSERT no banco de dados
- Validação de eventos já processados

### Performance Lenta

1. **Otimize a Edge Function:** Reduza processamento desnecessário
2. **Verifique banco:** Analise performance das queries
3. **Monitore recursos:** CPU e memória da Edge Function
4. **Configure índices:** Otimize consultas no banco

## 📝 Checklist de Configuração

### Pré-Configuração
- [ ] Chave da API ASAAS configurada
- [ ] URL do Supabase configurada
- [ ] Edge Function implantada
- [ ] Tabela `conciliation_staging` criada

### Configuração do Webhook
- [ ] Webhook criado (automático ou manual)
- [ ] Todos os eventos de cobrança selecionados
- [ ] Token de autenticação configurado
- [ ] URL do webhook correta
- [ ] Webhook ativo

### Pós-Configuração
- [ ] Teste realizado com evento real
- [ ] Logs monitorados
- [ ] Dados aparecendo na tabela `conciliation_staging`
- [ ] Fila de eventos ativa
- [ ] Alertas configurados

## 🔄 Manutenção

### Verificações Regulares

1. **Diária:** Status da fila de eventos
2. **Semanal:** Análise de logs e métricas
3. **Mensal:** Revisão de eventos perdidos
4. **Trimestral:** Atualização de tokens de segurança

### Atualizações

- **Edge Function:** Deploy automático via CI/CD
- **Eventos:** Adicione novos eventos conforme necessário
- **Segurança:** Rotacione tokens periodicamente
- **Monitoramento:** Ajuste alertas conforme volume

## 📞 Suporte

### Documentação ASAAS
- **API:** https://docs.asaas.com/reference
- **Webhooks:** https://docs.asaas.com/docs/about-webhooks
- **Eventos:** https://docs.asaas.com/docs/webhook-events

### Logs e Debug
- **Painel ASAAS:** Menu → Integrações → Logs de Webhook
- **Supabase:** Edge Functions → Logs
- **Sistema:** Tabela `conciliation_staging` para dados recebidos

### Contato
- **Suporte ASAAS:** Através do painel ou documentação oficial
- **Suporte Técnico:** Equipe de desenvolvimento Revalya