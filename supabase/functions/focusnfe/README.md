# 📋 Edge Function - FocusNFe Integration

## 📌 Visão Geral

Esta Edge Function fornece integração completa com a API FocusNFe para emissão de:
- **NFe** (Nota Fiscal Eletrônica) - Para produtos
- **NFSe** (Nota Fiscal de Serviço Eletrônica) - Para serviços

## 🔐 Autenticação

### Supabase JWT
Todas as rotas (exceto webhook) requerem autenticação JWT do Supabase no header:
```
Authorization: Bearer <JWT_TOKEN>
```

### Tenant ID
O tenant_id pode ser enviado de duas formas:
1. Header: `x-tenant-id: <TENANT_UUID>`
2. Body: `{ "tenant_id": "<TENANT_UUID>", ... }`

## 📡 Endpoints

### Health Check
```http
GET /focusnfe/
GET /focusnfe/health
```

### NFSe - Nota Fiscal de Serviço

#### Emitir NFSe
```http
POST /focusnfe/nfse/emitir
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "tenant_id": "uuid-do-tenant",
  "finance_entry_id": "uuid-do-lancamento-opcional",
  "dados_nfse": {
    "data_emissao": "2025-12-14T10:00:00-03:00",
    "natureza_operacao": "1",
    "optante_simples_nacional": true,
    "incentivador_cultural": false,
    "prestador": {
      "cnpj": "12345678000199",
      "inscricao_municipal": "12345",
      "codigo_municipio": "3550308"
    },
    "tomador": {
      "cpf": "12345678909",
      "razao_social": "Cliente Exemplo",
      "email": "cliente@email.com",
      "endereco": {
        "logradouro": "Rua Exemplo",
        "numero": "100",
        "bairro": "Centro",
        "codigo_municipio": "3550308",
        "uf": "SP",
        "cep": "01001000"
      }
    },
    "servico": {
      "aliquota": 5,
      "discriminacao": "Serviços de consultoria em tecnologia",
      "iss_retido": false,
      "item_lista_servico": "1.01",
      "valor_servicos": 1000.00,
      "codigo_municipio": "3550308",
      "codigo_cnae": "6203100"
    }
  }
}
```

#### Consultar NFSe
```http
GET /focusnfe/nfse/consultar/{referencia}
Authorization: Bearer <JWT>
x-tenant-id: uuid-do-tenant
```

#### Cancelar NFSe
```http
DELETE /focusnfe/nfse/cancelar
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "tenant_id": "uuid-do-tenant",
  "referencia": "nfse-abc12345-xyz",
  "justificativa": "Cancelamento solicitado pelo cliente devido a erro nos dados"
}
```

### NFe - Nota Fiscal Eletrônica

#### Emitir NFe
```http
POST /focusnfe/nfe/emitir
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "tenant_id": "uuid-do-tenant",
  "finance_entry_id": "uuid-do-lancamento-opcional",
  "dados_nfe": {
    "natureza_operacao": "Venda de mercadoria",
    "data_emissao": "2025-12-14T10:00:00-03:00",
    "tipo_documento": "1",
    "finalidade_emissao": "1",
    "consumidor_final": "1",
    "indicador_presenca": "9",
    "cnpj_emitente": "12345678000199",
    "cpf_destinatario": "12345678909",
    "nome_destinatario": "Cliente Exemplo",
    "indicador_inscricao_estadual_destinatario": "9",
    "logradouro_destinatario": "Rua Exemplo",
    "numero_destinatario": "100",
    "bairro_destinatario": "Centro",
    "codigo_municipio_destinatario": "3550308",
    "municipio_destinatario": "São Paulo",
    "uf_destinatario": "SP",
    "cep_destinatario": "01001000",
    "modalidade_frete": "9",
    "itens": [
      {
        "numero_item": 1,
        "codigo_produto": "001",
        "descricao": "Produto Exemplo",
        "ncm": "12345678",
        "cfop": "5102",
        "unidade_comercial": "UN",
        "quantidade_comercial": 1,
        "valor_unitario_comercial": 100.00,
        "valor_bruto": 100.00,
        "icms_origem": "0",
        "icms_situacao_tributaria": "102",
        "pis_situacao_tributaria": "07",
        "cofins_situacao_tributaria": "07"
      }
    ],
    "formas_pagamento": [
      {
        "forma_pagamento": "01",
        "valor_pagamento": 100.00
      }
    ]
  }
}
```

#### Consultar NFe
```http
GET /focusnfe/nfe/consultar/{referencia}
Authorization: Bearer <JWT>
x-tenant-id: uuid-do-tenant
```

#### Cancelar NFe
```http
DELETE /focusnfe/nfe/cancelar
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "tenant_id": "uuid-do-tenant",
  "referencia": "nfe-abc12345-xyz",
  "justificativa": "Cancelamento devido a devolução da mercadoria"
}
```

### Webhook

Endpoint para receber callbacks do FocusNFe:
```http
POST /focusnfe/webhook/{tenant_id}
```

**Nota:** Este endpoint não requer autenticação JWT, pois é chamado diretamente pelo FocusNFe.

## ⚙️ Configuração

### 1. Aplicar Migration
```bash
supabase db push
# ou
supabase migration up
```

### 2. Configurar Payment Gateway
Insira a configuração do FocusNFe no banco de dados:

```sql
INSERT INTO public.payment_gateways (
    tenant_id,
    provider,
    api_key,
    environment,
    settings
) VALUES (
    'seu-tenant-id',
    'focusnfe',
    'seu-token-focusnfe',
    'homologacao',
    '{
        "emitente": {
            "cnpj": "12345678000199",
            "razao_social": "Sua Empresa LTDA",
            "inscricao_estadual": "123456789",
            "inscricao_municipal": "12345",
            "endereco": {
                "logradouro": "Rua Exemplo",
                "numero": "100",
                "bairro": "Centro",
                "codigo_municipio": "3550308",
                "municipio": "São Paulo",
                "uf": "SP",
                "cep": "01001000"
            },
            "regime_tributario": "1"
        },
        "fiscal_defaults": {
            "nfse": {
                "natureza_operacao": "1",
                "optante_simples_nacional": true
            }
        }
    }'::jsonb
);
```

### 3. Configurar Webhook no FocusNFe

Configure o webhook no painel do FocusNFe:
```
URL: https://seu-projeto.supabase.co/functions/v1/focusnfe/webhook/{tenant_id}
```

### 4. Deploy da Edge Function
```bash
supabase functions deploy focusnfe
```

## 📊 Status de Notas Fiscais

| Status FocusNFe | Status Interno | Descrição |
|-----------------|----------------|-----------|
| processando | processing | Nota em processamento na SEFAZ |
| autorizado | issued | Nota autorizada com sucesso |
| cancelado | cancelled | Nota cancelada |
| erro_autorizacao | error | Erro na autorização |
| denegado | denied | Nota denegada pela SEFAZ |

## 🔄 Reforma Tributária 2026

Esta integração está preparada para a Reforma Tributária com suporte a:
- **CBS** (Contribuição sobre Bens e Serviços)
- **IBS** (Imposto sobre Bens e Serviços)
- **IS** (Imposto Seletivo)

Os campos são automaticamente calculados quando a data de emissão é >= 2026.

## 📁 Estrutura de Arquivos

```
focusnfe/
├── index.ts              # Router principal
├── types.ts              # Tipos TypeScript
├── README.md             # Esta documentação
├── handlers/
│   ├── nfse.ts          # Handlers de NFSe
│   ├── nfe.ts           # Handlers de NFe
│   └── webhook.ts       # Handler de webhooks
└── utils/
    ├── auth.ts          # Utilitários de autenticação
    └── validator.ts     # Validadores de dados
```

## 🧪 Testes

### Teste de Health Check
```bash
curl -X GET https://seu-projeto.supabase.co/functions/v1/focusnfe/health
```

### Teste de Emissão (com JWT)
```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/focusnfe/nfse/emitir \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "...", "dados_nfse": {...}}'
```

## 📝 Logs

Os logs da Edge Function podem ser visualizados em:
```bash
supabase functions logs focusnfe
```

## ⚠️ Troubleshooting

### Erro: "Configuração do FocusNFe não encontrada"
- Verifique se existe um registro em `payment_gateways` com `provider = 'focusnfe'`
- Confirme que `is_active = true`
- Valide que o `tenant_id` está correto

### Erro: "Token inválido"
- Verifique o token no painel do FocusNFe
- Confirme que o ambiente (`homologacao` ou `producao`) está correto

### Webhook não recebe eventos
- Confirme que a URL do webhook está configurada corretamente no FocusNFe
- Verifique se o `tenant_id` na URL está correto

---

**Versão:** 1.0.0  
**Última atualização:** 2025-12-14  
**Autor:** Revalya AI Agent
