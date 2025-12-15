# 📋 Análise Completa - API FocusNFe

**Versão:** 1.0  
**Data:** 13/12/2025  
**Projeto:** Revalya Oficial  
**API:** FocusNFe v2.0

---

## 🎯 **VISÃO GERAL**

A **FocusNFe** é uma plataforma de emissão de documentos fiscais eletrônicos que oferece uma API REST simplificada para emissão de:
- **NFe** (Nota Fiscal Eletrônica) - Para produtos
- **NFSe** (Nota Fiscal de Serviço Eletrônica) - Para serviços
- **CTe/CTeOs** (Conhecimento de Transporte Eletrônico)
- **MDFe** (Manifesto de Documentos Fiscais Eletrônicos)
- **NFCom** (Nota Fiscal de Comunicação)

### **Características Principais**
- ✅ API REST v2.0 com padrão JSON
- ✅ Autenticação via Token (Bearer)
- ✅ Processamento assíncrono
- ✅ Suporte a webhooks
- ✅ Ambientes de homologação e produção
- ✅ Integração com mais de 1.300 prefeituras (NFSe)

---

## 🔐 **AUTENTICAÇÃO**

### **Método de Autenticação**
A FocusNFe utiliza autenticação via **Token Bearer** no cabeçalho HTTP.

```http
Authorization: Bearer SEU_TOKEN_AQUI
```

### **Onde Obter o Token**
1. Acesse o [Painel da API FocusNFe](https://app.focusnfe.com.br/)
2. Faça login na sua conta
3. Navegue até **Configurações** → **API**
4. Copie o **Token de Acesso**

### **Ambientes**
- **Produção:** `https://api.focusnfe.com.br/v2/`
- **Homologação:** `https://homologacao.focusnfe.com.br/v2/`

---

## 📦 **EMISSÃO DE NFE (NOTA FISCAL ELETRÔNICA)**

### **Endpoint de Envio**
```http
POST https://api.focusnfe.com.br/v2/nfe?ref={REFERENCIA}
```

**Parâmetros:**
- `ref` (query string, obrigatório): Identificador único da nota no seu sistema

### **Cabeçalhos HTTP**
```http
Content-Type: application/json
Authorization: Bearer SEU_TOKEN
```

### **Estrutura do Payload JSON**

```json
{
  "natureza_operacao": "Venda de mercadoria",
  "forma_pagamento": 0,
  "data_emissao": "2025-12-13T20:42:20-03:00",
  "tipo_documento": 1,
  "finalidade_emissao": 1,
  "cnpj_emitente": "12345678000199",
  "nome_destinatario": "Cliente Exemplo",
  "cnpj_destinatario": "98765432000188",
  "inscricao_estadual_destinatario": "ISENTO",
  "telefone_destinatario": "11987654321",
  "endereco_destinatario": {
    "logradouro": "Rua Exemplo",
    "numero": "100",
    "bairro": "Centro",
    "municipio": "São Paulo",
    "uf": "SP",
    "cep": "01001000"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Produto Exemplo",
      "ncm": "12345678",
      "cfop": "5102",
      "unidade": "UN",
      "quantidade": 1,
      "valor_unitario": 100.00,
      "icms_situacao_tributaria": "00",
      "icms_origem": 0,
      "pis_situacao_tributaria": "07",
      "cofins_situacao_tributaria": "07"
    }
  ],
  "valor_frete": 0.00,
  "valor_seguro": 0.00,
  "valor_desconto": 0.00,
  "valor_total": 100.00,
  "modalidade_frete": 0
}
```

### **Campos Obrigatórios NFe**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `natureza_operacao` | string | Descrição da operação |
| `data_emissao` | datetime | Data e hora de emissão (ISO 8601) |
| `cnpj_emitente` | string | CNPJ do emitente (14 dígitos) |
| `nome_destinatario` | string | Nome/razão social do destinatário |
| `cnpj_destinatario` | string | CNPJ do destinatário (14 dígitos) |
| `produtos` | array | Lista de produtos |
| `valor_total` | number | Valor total da nota |

### **Exemplo de Requisição (TypeScript)**

```typescript
interface NFePayload {
  natureza_operacao: string;
  data_emissao: string;
  cnpj_emitente: string;
  nome_destinatario: string;
  cnpj_destinatario: string;
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    icms_situacao_tributaria: string;
    icms_origem: number;
  }>;
  valor_total: number;
}

async function emitirNFe(
  referencia: string,
  payload: NFePayload,
  token: string
): Promise<any> {
  const response = await fetch(
    `https://api.focusnfe.com.br/v2/nfe?ref=${referencia}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }
  );

  return await response.json();
}
```

### **Resposta da API (NFe)**

**Sucesso (202 Accepted):**
```json
{
  "status": "processando",
  "referencia": "REF123456",
  "caminho": "/v2/nfe/REF123456"
}
```

**Erro (400 Bad Request):**
```json
{
  "codigo": "erro_validacao",
  "mensagem": "Campo obrigatório não preenchido",
  "erros": [
    {
      "campo": "cnpj_emitente",
      "mensagem": "CNPJ inválido"
    }
  ]
}
```

---

## 🧾 **EMISSÃO DE NFSE (NOTA FISCAL DE SERVIÇO ELETRÔNICA)**

### **Endpoint de Envio**
```http
POST https://api.focusnfe.com.br/v2/nfsen?ref={REFERENCIA}
```

**Parâmetros:**
- `ref` (query string, obrigatório): Identificador único da nota no seu sistema

### **Cabeçalhos HTTP**
```http
Content-Type: application/json
Authorization: Bearer SEU_TOKEN
```

### **Estrutura do Payload JSON**

```json
{
  "data_emissao": "2025-12-13T20:42:20-03:00",
  "incentivador_cultural": false,
  "natureza_operacao": 1,
  "optante_simples_nacional": true,
  "status": 1,
  "prestador": {
    "cnpj": "12345678000199",
    "inscricao_municipal": "123456",
    "codigo_municipio": "3550308"
  },
  "tomador": {
    "cpf": "12345678909",
    "razao_social": "Cliente Exemplo",
    "email": "cliente@example.com",
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
    "aliquota": 0.05,
    "discriminacao": "Consultoria em tecnologia",
    "iss_retido": false,
    "item_lista_servico": "101",
    "valor_servicos": 1000.00,
    "codigo_municipio": "3550308",
    "codigo_cnae": "6203100"
  }
}
```

### **Campos Obrigatórios NFSe**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data_emissao` | datetime | Data e hora de emissão (ISO 8601) |
| `prestador.cnpj` | string | CNPJ do prestador (14 dígitos) |
| `prestador.inscricao_municipal` | string | Inscrição municipal do prestador |
| `prestador.codigo_municipio` | string | Código IBGE do município |
| `tomador.cpf` ou `tomador.cnpj` | string | CPF ou CNPJ do tomador |
| `tomador.razao_social` | string | Razão social do tomador |
| `servico.discriminacao` | string | Descrição detalhada do serviço |
| `servico.item_lista_servico` | string | Código da lista de serviços (LC 116) |
| `servico.valor_servicos` | number | Valor total dos serviços |
| `servico.codigo_municipio` | string | Código IBGE do município de prestação |

### **Exemplo de Requisição (TypeScript)**

```typescript
interface NFSePayload {
  data_emissao: string;
  natureza_operacao: number;
  optante_simples_nacional: boolean;
  prestador: {
    cnpj: string;
    inscricao_municipal: string;
    codigo_municipio: string;
  };
  tomador: {
    cpf?: string;
    cnpj?: string;
    razao_social: string;
    email: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      codigo_municipio: string;
      uf: string;
      cep: string;
    };
  };
  servico: {
    aliquota: number;
    discriminacao: string;
    iss_retido: boolean;
    item_lista_servico: string;
    valor_servicos: number;
    codigo_municipio: string;
    codigo_cnae: string;
  };
}

async function emitirNFSe(
  referencia: string,
  payload: NFSePayload,
  token: string
): Promise<any> {
  const response = await fetch(
    `https://api.focusnfe.com.br/v2/nfsen?ref=${referencia}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }
  );

  return await response.json();
}
```

### **Resposta da API (NFSe)**

**Sucesso (202 Accepted):**
```json
{
  "status": "processando",
  "referencia": "REF123456",
  "caminho": "/v2/nfsen/REF123456"
}
```

**Erro (400 Bad Request):**
```json
{
  "codigo": "erro_validacao",
  "mensagem": "Dados inválidos",
  "erros": [
    {
      "campo": "prestador.inscricao_municipal",
      "mensagem": "Inscrição municipal não encontrada"
    }
  ]
}
```

---

## 🔍 **CONSULTA DE STATUS**

### **Endpoint de Consulta**
```http
GET https://api.focusnfe.com.br/v2/nfe/{REFERENCIA}
GET https://api.focusnfe.com.br/v2/nfsen/{REFERENCIA}
```

### **Status Possíveis**

| Status | Descrição |
|--------|-----------|
| `processando` | Nota em processamento |
| `autorizado` | Nota autorizada e emitida |
| `cancelado` | Nota cancelada |
| `erro_autorizacao` | Erro na autorização |
| `denegado` | Nota denegada pela SEFAZ |

### **Exemplo de Consulta**

```typescript
async function consultarStatus(
  tipo: 'nfe' | 'nfsen',
  referencia: string,
  token: string
): Promise<any> {
  const response = await fetch(
    `https://api.focusnfe.com.br/v2/${tipo}/${referencia}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
}
```

### **Resposta de Consulta (Autorizada)**

```json
{
  "status": "autorizado",
  "referencia": "REF123456",
  "numero": "123",
  "serie": "1",
  "chave_nfe": "35200112345678000199550010000001231234567890",
  "data_emissao": "2025-12-13T20:42:20-03:00",
  "data_autorizacao": "2025-12-13T20:43:15-03:00",
  "caminho_xml_nota_fiscal": "https://api.focusnfe.com.br/v2/nfe/REF123456.xml",
  "caminho_danfe": "https://api.focusnfe.com.br/v2/nfe/REF123456.pdf"
}
```

---

## ❌ **CANCELAMENTO**

### **Endpoint de Cancelamento**
```http
DELETE https://api.focusnfe.com.br/v2/nfe/{REFERENCIA}
DELETE https://api.focusnfe.com.br/v2/nfsen/{REFERENCIA}
```

### **Payload de Cancelamento**

```json
{
  "justificativa": "Cancelamento solicitado pelo cliente"
}
```

### **Exemplo de Cancelamento**

```typescript
async function cancelarNota(
  tipo: 'nfe' | 'nfsen',
  referencia: string,
  justificativa: string,
  token: string
): Promise<any> {
  const response = await fetch(
    `https://api.focusnfe.com.br/v2/${tipo}/${referencia}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ justificativa })
    }
  );

  return await response.json();
}
```

---

## 🔔 **WEBHOOKS**

A FocusNFe suporta webhooks para notificações em tempo real sobre mudanças de status das notas.

### **Configuração de Webhook**
```http
POST https://api.focusnfe.com.br/v2/webhooks
```

**Payload:**
```json
{
  "url": "https://seu-dominio.com/webhook/focusnfe",
  "eventos": ["nfe.autorizado", "nfe.cancelado", "nfsen.autorizado", "nfsen.cancelado"]
}
```

### **Eventos Disponíveis**

- `nfe.autorizado` - NFe autorizada
- `nfe.cancelado` - NFe cancelada
- `nfe.erro_autorizacao` - Erro na autorização da NFe
- `nfsen.autorizado` - NFSe autorizada
- `nfsen.cancelado` - NFSe cancelada
- `nfsen.erro_autorizacao` - Erro na autorização da NFSe

### **Estrutura do Webhook**

```json
{
  "evento": "nfe.autorizado",
  "referencia": "REF123456",
  "status": "autorizado",
  "data": "2025-12-13T20:43:15-03:00"
}
```

---

## 🏗️ **ARQUITETURA DE INTEGRAÇÃO NO REVALYA**

### **1. Estrutura Proposta**

```
src/services/
  ├── focusNFe/
  │   ├── focusNFeService.ts      # Serviço principal
  │   ├── nfeService.ts            # Específico para NFe
  │   ├── nfseService.ts           # Específico para NFSe
  │   └── types.ts                 # Tipos TypeScript
```

### **2. Provider Pattern (Similar ao InvoiceService)**

```typescript
interface FocusNFeProvider {
  name: string;
  emitirNFe(data: NFeData): Promise<NFeResponse>;
  emitirNFSe(data: NFSeData): Promise<NFSeResponse>;
  consultarStatus(referencia: string, tipo: 'nfe' | 'nfse'): Promise<StatusResponse>;
  cancelar(referencia: string, tipo: 'nfe' | 'nfse', justificativa: string): Promise<CancelResponse>;
}
```

### **3. Integração com InvoiceService**

O `FocusNFeProvider` pode ser adicionado ao `InvoiceService` existente como mais uma opção de provider, permitindo:
- Emissão de NFSe (compatível com interface atual)
- Emissão de NFe (nova funcionalidade)
- Seleção automática baseada no tipo de documento

---

## 📝 **FLUXO DE EMISSÃO RECOMENDADO**

### **Fluxo para NFSe (Serviços)**

1. **Preparar Dados**
   - Buscar dados do lançamento financeiro
   - Validar dados do cliente (tomador)
   - Validar dados do prestador (empresa)
   - Preparar dados do serviço

2. **Emitir NFSe**
   - Gerar referência única
   - Enviar requisição POST para `/v2/nfsen?ref={REFERENCIA}`
   - Receber resposta com status "processando"

3. **Consultar Status**
   - Polling periódico ou aguardar webhook
   - Consultar GET `/v2/nfsen/{REFERENCIA}`
   - Aguardar status "autorizado"

4. **Salvar Resultado**
   - Salvar dados da nota no `finance_entries.invoice_data`
   - Atualizar `invoice_status` para "issued"
   - Armazenar URLs do XML e PDF

### **Fluxo para NFe (Produtos)**

1. **Preparar Dados**
   - Buscar dados do lançamento financeiro
   - Validar dados do cliente (destinatário)
   - Validar dados do emitente (empresa)
   - Preparar lista de produtos

2. **Emitir NFe**
   - Gerar referência única
   - Enviar requisição POST para `/v2/nfe?ref={REFERENCIA}`
   - Receber resposta com status "processando"

3. **Consultar Status**
   - Polling periódico ou aguardar webhook
   - Consultar GET `/v2/nfe/{REFERENCIA}`
   - Aguardar status "autorizado"

4. **Salvar Resultado**
   - Salvar dados da nota no `finance_entries.invoice_data`
   - Atualizar `invoice_status` para "issued"
   - Armazenar URLs do XML e DANFe

---

## 🔒 **SEGURANÇA E BOAS PRÁTICAS**

### **1. Armazenamento de Credenciais**
- ✅ Armazenar token em variáveis de ambiente
- ✅ Usar Supabase Secrets para produção
- ✅ Nunca commitar tokens no código

### **2. Validação de Dados**
- ✅ Validar CNPJ/CPF antes do envio
- ✅ Validar códigos municipais (IBGE)
- ✅ Validar valores monetários
- ✅ Validar datas e formatos

### **3. Tratamento de Erros**
- ✅ Implementar retry com backoff exponencial
- ✅ Logar erros para auditoria
- ✅ Notificar usuário sobre falhas
- ✅ Implementar circuit breaker

### **4. Rate Limiting**
- ✅ Respeitar limites da API FocusNFe
- ✅ Implementar fila de processamento
- ✅ Evitar requisições simultâneas excessivas

### **5. Multi-Tenant**
- ✅ Isolar credenciais por tenant
- ✅ Validar acesso com `useTenantAccessGuard()`
- ✅ Incluir `tenant_id` em todas as operações

---

## 📊 **COMPARAÇÃO COM PROVIDERS EXISTENTES**

| Recurso | Omie | NFSe.io | FocusNFe |
|---------|------|---------|----------|
| NFSe | ✅ | ✅ | ✅ |
| NFe | ❌ | ❌ | ✅ |
| CTe | ❌ | ❌ | ✅ |
| Webhooks | ✅ | ✅ | ✅ |
| API REST | ❌ (SOAP) | ✅ | ✅ |
| Multi-prefeituras | ✅ | ✅ | ✅ (1.300+) |

---

## 🚀 **PRÓXIMOS PASSOS PARA IMPLEMENTAÇÃO**

### **Fase 1: Configuração Base**
1. Criar tabela `payment_gateways` com provider `focusnfe`
2. Criar serviço base `FocusNFeService`
3. Implementar autenticação e requisições básicas

### **Fase 2: Emissão de NFSe**
1. Implementar `emitirNFSe()` no provider
2. Integrar com `InvoiceService`
3. Adicionar suporte a webhooks

### **Fase 3: Emissão de NFe**
1. Implementar `emitirNFe()` no provider
2. Criar interface para produtos
3. Adicionar validações específicas de NFe

### **Fase 4: Funcionalidades Avançadas**
1. Implementar consulta de status
2. Implementar cancelamento
3. Adicionar suporte a CTe e outros documentos

### **Fase 5: UI/UX**
1. Criar componente de configuração
2. Adicionar seleção de provider na emissão
3. Exibir status e documentos emitidos

---

## 📚 **REFERÊNCIAS**

- [Documentação Oficial FocusNFe](https://doc.focusnfe.com.br/reference/introducao)
- [Documentação Completa (v1)](https://focusnfe.com.br/doc/)
- [Exemplos de Código (JavaScript)](https://github.com/FocusNFe/javascript)
- [Postman Collection](https://www.postman.com/focusnfe/focus-nfe)
- [Guia de Preparação](https://guides.focusnfe.com.br/base-de-conhecimento/preparando-seu-sistema-para-emitir-documentos-fiscais/)

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

- [ ] Configurar credenciais no Supabase Secrets
- [ ] Criar tipos TypeScript para NFe e NFSe
- [ ] Implementar `FocusNFeProvider` class
- [ ] Integrar com `InvoiceService`
- [ ] Adicionar suporte a webhooks
- [ ] Implementar consulta de status
- [ ] Implementar cancelamento
- [ ] Criar testes unitários
- [ ] Documentar uso no código
- [ ] Adicionar validações de dados
- [ ] Implementar tratamento de erros
- [ ] Adicionar logs de auditoria
- [ ] Criar interface de configuração
- [ ] Testar em ambiente de homologação

---

**Documento criado em:** 13/12/2025  
**Última atualização:** 13/12/2025  
**Versão da API:** 2.0
