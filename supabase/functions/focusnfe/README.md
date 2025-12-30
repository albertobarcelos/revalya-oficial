# Edge Function: FocusNFe Integration

Edge Function para integração com a API FocusNFe, permitindo emissão de NFe (Nota Fiscal Eletrônica) e NFSe (Nota Fiscal de Serviços).

## 📋 Funcionalidades

- ✅ Emissão de NFe (Nota Fiscal Eletrônica)
- ✅ Emissão de NFSe (Nota Fiscal de Serviços)
- ✅ Consulta de status de notas
- ✅ Rate limiting (100 créditos/minuto)
- ✅ Suporte a ambientes de homologação e produção
- ✅ Integração multi-tenant segura

## 🔧 Configuração

### 1. Configurar Credenciais no Banco

A Edge Function busca as credenciais na tabela `payment_gateways`:

```sql
INSERT INTO payment_gateways (
  tenant_id,
  provider,
  is_active,
  api_key,
  environment,
  settings
) VALUES (
  'uuid-do-tenant',
  'focusnfe',
  true,
  'seu-token-focusnfe',
  'homologacao', -- ou 'producao'
  '{}'::jsonb
);
```

### 2. Obter Token FocusNFe

1. Acesse o [Painel da API FocusNFe](https://app.focusnfe.com.br/)
2. Faça login na sua conta
3. Navegue até **Configurações** → **API**
4. Copie o **Token de Acesso**

### 3. Ambientes

- **Homologação**: `https://homologacao.focusnfe.com.br/v2`
- **Produção**: `https://api.focusnfe.com.br/v2`

## 📡 Endpoints

### Emitir NFe

```http
POST /functions/v1/focusnfe/nfe/emit
Content-Type: application/json
x-tenant-id: {tenant_id}

{
  "referencia": "REF123456",
  "dados_nfe": {
    "natureza_operacao": "Venda de mercadoria",
    "data_emissao": "2025-01-15T10:30:00-03:00",
    "cnpj_emitente": "12345678000199",
    "nome_destinatario": "Cliente Exemplo",
    "cnpj_destinatario": "98765432000188",
    "produtos": [...]
  },
  "finance_entry_id": "uuid-do-lancamento",
  "environment": "producao"
}
```

### Emitir NFSe

```http
POST /functions/v1/focusnfe/nfse/emit
Content-Type: application/json
x-tenant-id: {tenant_id}

{
  "referencia": "REF123456",
  "dados_nfse": {
    "data_emissao": "2025-01-15T10:30:00-03:00",
    "prestador": {
      "cnpj": "12345678000199",
      "inscricao_municipal": "123456"
    },
    "tomador": {
      "cpf": "12345678909",
      "razao_social": "Cliente Exemplo"
    },
    "servico": {...}
  },
  "finance_entry_id": "uuid-do-lancamento",
  "environment": "producao"
}
```

### Consultar Status

```http
GET /functions/v1/focusnfe/nfe/{referencia}
x-tenant-id: {tenant_id}
```

```http
GET /functions/v1/focusnfe/nfse/{referencia}
x-tenant-id: {tenant_id}
```

## 🔐 Segurança

- ✅ Autenticação via JWT do Supabase
- ✅ Validação de tenant_id em todas as requisições
- ✅ Rate limiting por tenant (100 req/min)
- ✅ Credenciais isoladas por tenant
- ✅ Logs de auditoria

## 📊 Rate Limiting

A FocusNFe permite **100 créditos/minuto** por token. A Edge Function implementa rate limiting simples em memória. Para produção, recomenda-se usar Redis.

## 🐛 Tratamento de Erros

A Edge Function trata erros da API FocusNFe e atualiza automaticamente o status em `finance_entries.invoice_data`:

```json
{
  "provider": "focusnfe",
  "tipo": "nfe",
  "referencia": "REF123456",
  "status": "erro_autorizacao",
  "erro": "Mensagem de erro",
  "enviado_em": "2025-01-15T10:30:00Z"
}
```

## 📚 Documentação

- [Documentação Oficial FocusNFe](https://doc.focusnfe.com.br/reference/introducao)
- [Análise Completa](../../../docs/ANALISE_IMPLEMENTACAO_FOCUSNFE.md)
- [Análise API FocusNFe](../../../Documentação%20do%20Projeto/INTEGRAÇÕES/ANALISE_API_FOCUSNFE.md)

## 🚀 Próximos Passos

- [ ] Implementar cancelamento de notas
- [ ] Implementar handler de webhooks
- [ ] Adicionar suporte a carta de correção (NFe)
- [ ] Implementar consulta de status em lote
- [ ] Adicionar métricas e monitoramento

