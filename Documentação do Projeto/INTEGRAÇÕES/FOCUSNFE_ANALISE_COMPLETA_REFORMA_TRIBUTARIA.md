# 📋 Análise Completa - FocusNFe + Reforma Tributária 2026

**Versão:** 2.0  
**Data:** 14/12/2025  
**Projeto:** Revalya Oficial  
**Objetivo:** Integração 100% NFe/NFSe + Preparação Reforma Tributária

---

## 📌 **SUMÁRIO EXECUTIVO**

Este documento apresenta uma análise minuciosa da API FocusNFe e das mudanças da Reforma Tributária brasileira, com foco em:

1. ✅ **Integração 100% NFe e NFSe** - Cobertura completa de emissão fiscal
2. ✅ **Campos de Configuração** - Detalhamento de todos os campos necessários
3. ✅ **Reforma Tributária 2026** - Novos campos CBS, IBS e IS
4. ✅ **Arquitetura com Edge Functions** - Fluxo de integração via Supabase

---

# 🎯 **1. INTEGRAÇÃO 100% NFE E NFSE**

## 1.1 Capacidades da API FocusNFe

| Documento | Suporte | Uso no Revalya |
|-----------|---------|----------------|
| **NFe** (Nota Fiscal Eletrônica) | ✅ 100% | Venda de produtos |
| **NFSe** (Nota Fiscal de Serviço) | ✅ 1.300+ prefeituras | Prestação de serviços |
| **NFSe Nacional** | ✅ Em expansão | Novo padrão federal |
| **NFCe** (Consumidor) | ✅ Síncrono | PDV/Varejo |
| **CTe** (Transporte) | ✅ Assíncrono | Transportadoras |
| **MDFe** (Manifesto) | ✅ Assíncrono | Logística |
| **NFCom** (Comunicação) | ✅ Telecom | Telecomunicações |

## 1.2 Ambientes Disponíveis

```typescript
// Configuração de ambientes
const FOCUSNFE_CONFIG = {
  homologacao: {
    baseUrl: 'https://homologacao.focusnfe.com.br/v2',
    description: 'Testes e validação - notas não têm valor fiscal'
  },
  producao: {
    baseUrl: 'https://api.focusnfe.com.br/v2',
    description: 'Produção - notas com valor fiscal'
  }
};
```

## 1.3 Endpoints Principais

### NFe (Produtos)
| Operação | Método | Endpoint |
|----------|--------|----------|
| Emitir | POST | `/v2/nfe?ref={REFERENCIA}` |
| Consultar | GET | `/v2/nfe/{REFERENCIA}` |
| Cancelar | DELETE | `/v2/nfe/{REFERENCIA}` |
| Carta de Correção | POST | `/v2/nfe/{REFERENCIA}/carta_correcao` |
| Inutilizar | POST | `/v2/nfe/inutilizacao` |
| DANFe Preview | POST | `/v2/nfe/danfe` |

### NFSe (Serviços)
| Operação | Método | Endpoint |
|----------|--------|----------|
| Emitir | POST | `/v2/nfsen?ref={REFERENCIA}` |
| Consultar | GET | `/v2/nfsen/{REFERENCIA}` |
| Cancelar | DELETE | `/v2/nfsen/{REFERENCIA}` |
| Reenviar Email | POST | `/v2/nfsen/{REFERENCIA}/email` |

### NFSe Nacional
| Operação | Método | Endpoint |
|----------|--------|----------|
| Emitir | POST | `/v2/nfse_nacional?ref={REFERENCIA}` |
| Consultar | GET | `/v2/nfse_nacional/{REFERENCIA}` |
| Cancelar | DELETE | `/v2/nfse_nacional/{REFERENCIA}` |

---

# 🔧 **2. CAMPOS DE CONFIGURAÇÃO**

## 2.1 Configurações Gerais da API

### 2.1.1 Credenciais e Autenticação

```typescript
interface FocusNFeCredentials {
  // Obrigatório: Token de autenticação
  token: string;
  
  // Ambiente de operação
  ambiente: 'homologacao' | 'producao';
  
  // Identificador único do tenant no Revalya
  tenant_id: string;
}

// Estrutura para armazenar no Supabase
interface PaymentGatewayFocusNFe {
  id: string;
  tenant_id: string;
  provider: 'focusnfe';
  is_active: boolean;
  
  // Credenciais criptografadas
  api_key: string;        // Token FocusNFe
  environment: string;    // 'homologacao' ou 'producao'
  
  // Configurações específicas
  settings: {
    // Configurações do emitente
    emitente: EmitenteConfig;
    
    // Webhooks
    webhook_url?: string;
    webhook_events?: string[];
    
    // Configurações fiscais padrão
    fiscal_defaults: FiscalDefaults;
  };
  
  created_at: string;
  updated_at: string;
}
```

### 2.1.2 Configuração do Emitente (Empresa)

```typescript
interface EmitenteConfig {
  // Dados básicos - OBRIGATÓRIOS
  cnpj: string;                    // 14 dígitos, sem formatação
  razao_social: string;            // Razão social completa
  nome_fantasia?: string;          // Nome fantasia (opcional)
  
  // Inscrições - OBRIGATÓRIOS por tipo
  inscricao_estadual: string;      // Para NFe - IE do estado
  inscricao_municipal?: string;    // Para NFSe - IM do município
  
  // Endereço - OBRIGATÓRIO
  endereco: {
    logradouro: string;            // Rua, Avenida, etc.
    numero: string;                // Número do estabelecimento
    complemento?: string;          // Sala, Bloco, etc.
    bairro: string;                // Bairro
    codigo_municipio: string;      // Código IBGE (7 dígitos)
    municipio: string;             // Nome do município
    uf: string;                    // Sigla do estado (2 letras)
    cep: string;                   // CEP (8 dígitos)
    codigo_pais?: string;          // Padrão: 1058 (Brasil)
    pais?: string;                 // Padrão: Brasil
    telefone?: string;             // Telefone com DDD
  };
  
  // Regime tributário - OBRIGATÓRIO
  regime_tributario: '1' | '2' | '3';
  // 1 = Simples Nacional
  // 2 = Simples Nacional - Excesso de sublimite
  // 3 = Regime Normal
  
  // Certificado digital - Gerenciado pela FocusNFe
  // (não precisa configurar no Revalya)
  
  // CNAE Principal
  cnae_principal?: string;         // 7 dígitos
  
  // Configuração de email
  email_emitente?: string;
}
```

### 2.1.3 Configurações Fiscais Padrão

```typescript
interface FiscalDefaults {
  // NFe - Configurações padrão para produtos
  nfe: {
    // Série padrão (1-999)
    serie: string;
    
    // Natureza da operação padrão
    natureza_operacao: string;      // Ex: "Venda de mercadoria"
    
    // Tipo de documento
    tipo_documento: '0' | '1';      // 0=Entrada, 1=Saída
    
    // Indicador de presença
    indicador_presenca: '0' | '1' | '2' | '3' | '4' | '5' | '9';
    // 0=Não se aplica, 1=Presencial, 2=Internet, 3=Telemarketing
    // 4=NFCe entrega domicílio, 5=Presencial fora estabelecimento
    // 9=Outros
    
    // Finalidade da emissão
    finalidade_emissao: '1' | '2' | '3' | '4';
    // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
    
    // Indicador de consumidor final
    consumidor_final: '0' | '1';    // 0=Não, 1=Sim
    
    // Modalidade de frete
    modalidade_frete: '0' | '1' | '2' | '3' | '4' | '9';
    // 0=Contratação por conta remetente (CIF)
    // 1=Contratação por conta destinatário (FOB)
    // 2=Contratação por conta terceiros
    // 3=Transporte próprio remetente
    // 4=Transporte próprio destinatário
    // 9=Sem ocorrência de transporte
  };
  
  // NFSe - Configurações padrão para serviços
  nfse: {
    // Natureza da operação
    natureza_operacao: '1' | '2' | '3' | '4' | '5' | '6';
    // 1=Tributação no município
    // 2=Tributação fora do município
    // 3=Isenção
    // 4=Imune
    // 5=Exigibilidade suspensa por decisão judicial
    // 6=Exigibilidade suspensa por procedimento administrativo
    
    // Optante pelo Simples Nacional
    optante_simples_nacional: boolean;
    
    // Incentivador cultural
    incentivador_cultural: boolean;
    
    // Regime especial de tributação
    regime_especial_tributacao?: '1' | '2' | '3' | '4' | '5' | '6';
    // 1=Microempresa municipal
    // 2=Estimativa
    // 3=Sociedade de profissionais
    // 4=Cooperativa
    // 5=MEI
    // 6=ME/EPP Simples Nacional
  };
}
```

---

## 2.2 Campos para NFe (Produtos)

### 2.2.1 Estrutura Completa do Payload NFe

```typescript
interface NFePayload {
  // ========================================
  // DADOS GERAIS DA NOTA - OBRIGATÓRIOS
  // ========================================
  
  // Natureza da operação (ex: "Venda de mercadoria")
  natureza_operacao: string;
  
  // Data e hora de emissão (ISO 8601)
  data_emissao: string;               // Ex: "2026-01-15T10:30:00-03:00"
  
  // Data e hora de saída (opcional, usa data_emissao se omitido)
  data_entrada_saida?: string;
  
  // Tipo de documento: 0=Entrada, 1=Saída
  tipo_documento: '0' | '1';
  
  // Finalidade da emissão
  finalidade_emissao: '1' | '2' | '3' | '4';
  
  // Consumidor final: 0=Não, 1=Sim
  consumidor_final: '0' | '1';
  
  // Indicador de presença do comprador
  indicador_presenca: '0' | '1' | '2' | '3' | '4' | '5' | '9';
  
  // ========================================
  // DADOS DO EMITENTE - OBRIGATÓRIOS
  // ========================================
  
  cnpj_emitente: string;              // 14 dígitos
  
  // OU CPF para pessoa física (produtor rural)
  cpf_emitente?: string;              // 11 dígitos
  
  // ========================================
  // DADOS DO DESTINATÁRIO - OBRIGATÓRIOS
  // ========================================
  
  // CPF ou CNPJ do destinatário
  cpf_destinatario?: string;          // 11 dígitos
  cnpj_destinatario?: string;         // 14 dígitos
  
  // Identificação (nome/razão social)
  nome_destinatario: string;
  
  // Inscrição Estadual (quando PJ com IE)
  inscricao_estadual_destinatario?: string;
  
  // Indicador da IE: 1=Contribuinte, 2=Isento, 9=Não contribuinte
  indicador_inscricao_estadual_destinatario: '1' | '2' | '9';
  
  // Endereço do destinatário
  logradouro_destinatario: string;
  numero_destinatario: string;
  complemento_destinatario?: string;
  bairro_destinatario: string;
  codigo_municipio_destinatario: string;  // IBGE 7 dígitos
  municipio_destinatario: string;
  uf_destinatario: string;                // 2 letras
  cep_destinatario?: string;              // 8 dígitos
  codigo_pais_destinatario?: string;      // Padrão: 1058
  pais_destinatario?: string;             // Padrão: Brasil
  
  // Contato
  telefone_destinatario?: string;
  email_destinatario?: string;
  
  // ========================================
  // PRODUTOS - OBRIGATÓRIO (array)
  // ========================================
  
  itens: NFeItem[];
  
  // ========================================
  // TOTALIZADORES (calculados automaticamente se omitidos)
  // ========================================
  
  valor_produtos?: number;            // Soma dos valores dos produtos
  valor_desconto?: number;            // Total de descontos
  valor_frete?: number;               // Valor do frete
  valor_seguro?: number;              // Valor do seguro
  valor_outras_despesas?: number;     // Outras despesas acessórias
  valor_total?: number;               // Valor total da nota
  
  // ========================================
  // INFORMAÇÕES DE TRANSPORTE
  // ========================================
  
  modalidade_frete: '0' | '1' | '2' | '3' | '4' | '9';
  
  // Dados do transportador (quando aplicável)
  transportador?: {
    cnpj?: string;
    cpf?: string;
    nome?: string;
    inscricao_estadual?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
  };
  
  // Volumes (quando há transporte)
  volumes?: Array<{
    quantidade?: number;
    especie?: string;
    marca?: string;
    numero?: string;
    peso_liquido?: number;
    peso_bruto?: number;
  }>;
  
  // ========================================
  // FORMAS DE PAGAMENTO - OBRIGATÓRIO
  // ========================================
  
  formas_pagamento: FormaPagamento[];
  
  // ========================================
  // INFORMAÇÕES ADICIONAIS
  // ========================================
  
  informacoes_adicionais_contribuinte?: string;
  informacoes_adicionais_fisco?: string;
  
  // ========================================
  // CAMPOS DA REFORMA TRIBUTÁRIA (2026)
  // Detalhados na seção 3
  // ========================================
}
```

### 2.2.2 Estrutura do Item NFe (Produto)

```typescript
interface NFeItem {
  // ========================================
  // IDENTIFICAÇÃO DO PRODUTO - OBRIGATÓRIOS
  // ========================================
  
  // Número sequencial do item (1, 2, 3...)
  numero_item: number;
  
  // Código do produto no sistema emissor
  codigo_produto: string;
  
  // Descrição completa do produto
  descricao: string;
  
  // NCM - Nomenclatura Comum do Mercosul (8 dígitos)
  ncm: string;
  
  // CEST - Código Especificador da Substituição Tributária (7 dígitos)
  cest?: string;
  
  // CFOP - Código Fiscal de Operações e Prestações (4 dígitos)
  cfop: string;
  
  // Unidade comercial
  unidade_comercial: string;           // Ex: "UN", "KG", "CX"
  
  // Quantidade comercial
  quantidade_comercial: number;
  
  // Valor unitário de comercialização
  valor_unitario_comercial: number;
  
  // Valor bruto do produto
  valor_bruto: number;
  
  // ========================================
  // UNIDADE TRIBUTÁVEL (quando diferente da comercial)
  // ========================================
  
  unidade_tributavel?: string;
  quantidade_tributavel?: number;
  valor_unitario_tributavel?: number;
  
  // ========================================
  // VALORES ADICIONAIS
  // ========================================
  
  valor_frete?: number;
  valor_seguro?: number;
  valor_desconto?: number;
  valor_outras_despesas?: number;
  
  // ========================================
  // CÓDIGO DE BARRAS
  // ========================================
  
  codigo_barras_comercial?: string;    // GTIN-8, GTIN-12, GTIN-13, GTIN-14
  codigo_barras_tributavel?: string;
  
  // ========================================
  // ICMS - Imposto sobre Circulação
  // ========================================
  
  // Origem da mercadoria
  icms_origem: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
  // 0=Nacional, 1=Estrangeira importação direta,
  // 2=Estrangeira adquirida mercado interno, 3=Nacional >40% conteúdo importado
  // 4=Nacional conforme processos produtivos, 5=Nacional <40% conteúdo importado
  // 6=Estrangeira importação direta sem similar nacional
  // 7=Estrangeira adquirida sem similar nacional, 8=Nacional >70% conteúdo importado
  
  // Situação tributária do ICMS
  icms_situacao_tributaria: string;
  // Regime Normal: 00, 10, 20, 30, 40, 41, 50, 51, 60, 70, 90
  // Simples Nacional: 101, 102, 103, 201, 202, 203, 300, 400, 500, 900
  
  // Valores do ICMS (quando tributado)
  icms_base_calculo?: number;
  icms_aliquota?: number;
  icms_valor?: number;
  
  // ICMS-ST (Substituição Tributária)
  icms_base_calculo_st?: number;
  icms_aliquota_st?: number;
  icms_valor_st?: number;
  
  // ========================================
  // PIS - Programa de Integração Social
  // ========================================
  
  pis_situacao_tributaria: string;
  // 01=Tributável alíquota normal, 02=Tributável alíquota diferenciada
  // 03=Tributável quantidade vendida, 04-09=Tributável monofásica/ST
  // 49=Outras operações de saída, 50-99=Operações de entrada
  
  pis_base_calculo?: number;
  pis_aliquota?: number;
  pis_valor?: number;
  
  // ========================================
  // COFINS - Contribuição para Financiamento
  // ========================================
  
  cofins_situacao_tributaria: string;
  cofins_base_calculo?: number;
  cofins_aliquota?: number;
  cofins_valor?: number;
  
  // ========================================
  // IPI - Imposto sobre Produtos Industrializados
  // ========================================
  
  ipi_situacao_tributaria?: string;
  ipi_base_calculo?: number;
  ipi_aliquota?: number;
  ipi_valor?: number;
  ipi_codigo_enquadramento?: string;
  
  // ========================================
  // FCP - Fundo de Combate à Pobreza
  // ========================================
  
  fcp_base_calculo?: number;
  fcp_percentual?: number;
  fcp_valor?: number;
  
  // ========================================
  // CAMPOS DA REFORMA TRIBUTÁRIA (2026)
  // Detalhados na seção 3
  // ========================================
}
```

### 2.2.3 Forma de Pagamento NFe

```typescript
interface FormaPagamento {
  // Forma de pagamento
  forma_pagamento: string;
  // 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito
  // 05=Crédito Loja, 10-13=Vales, 14=Duplicata, 15=Boleto
  // 16=Depósito, 17=PIX Dinâmico, 18=Transferência
  // 19=Cashback, 20=PIX Estático, 21=Crédito em Loja
  // 90=Sem pagamento, 99=Outros
  
  // Valor do pagamento
  valor_pagamento: number;
  
  // Dados do cartão (quando forma = 03 ou 04)
  tipo_integracao?: '1' | '2';       // 1=Integrado, 2=Não integrado
  cnpj_credenciadora?: string;        // CNPJ da operadora do cartão
  bandeira_operadora?: string;        // 01=Visa, 02=Mastercard, etc.
  numero_autorizacao?: string;        // Código de autorização
}
```

---

## 2.3 Campos para NFSe (Serviços)

### 2.3.1 Estrutura Completa do Payload NFSe

```typescript
interface NFSePayload {
  // ========================================
  // DADOS GERAIS - OBRIGATÓRIOS
  // ========================================
  
  // Data de emissão (ISO 8601)
  data_emissao: string;
  
  // Natureza da operação
  natureza_operacao: '1' | '2' | '3' | '4' | '5' | '6';
  
  // Optante pelo Simples Nacional
  optante_simples_nacional: boolean;
  
  // Incentivador cultural (Lei Rouanet)
  incentivador_cultural: boolean;
  
  // Status: 1=Normal, 2=Cancelado
  status: '1' | '2';
  
  // ========================================
  // PRESTADOR (EMPRESA) - OBRIGATÓRIO
  // ========================================
  
  prestador: {
    cnpj: string;                     // 14 dígitos
    inscricao_municipal: string;      // Inscrição municipal do prestador
    codigo_municipio: string;         // Código IBGE (7 dígitos)
  };
  
  // ========================================
  // TOMADOR (CLIENTE) - OBRIGATÓRIO
  // ========================================
  
  tomador: {
    // CPF ou CNPJ
    cpf?: string;                     // 11 dígitos
    cnpj?: string;                    // 14 dígitos
    
    // Identificação
    razao_social: string;
    inscricao_municipal?: string;
    
    // Contato
    email: string;
    telefone?: string;
    
    // Endereço
    endereco: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      codigo_municipio: string;       // IBGE 7 dígitos
      uf: string;                     // 2 letras
      cep: string;                    // 8 dígitos
    };
  };
  
  // ========================================
  // SERVIÇO - OBRIGATÓRIO
  // ========================================
  
  servico: {
    // Alíquota do ISS
    aliquota: number;                 // Ex: 0.05 = 5%
    
    // Descrição detalhada do serviço
    discriminacao: string;
    
    // ISS retido pelo tomador
    iss_retido: boolean;
    
    // Código do item da lista de serviços (LC 116/2003)
    item_lista_servico: string;       // Ex: "01.01", "17.01"
    
    // Valores
    valor_servicos: number;           // Valor total dos serviços
    valor_deducoes?: number;          // Deduções legais
    valor_pis?: number;               // PIS retido
    valor_cofins?: number;            // COFINS retido
    valor_inss?: number;              // INSS retido
    valor_ir?: number;                // IR retido
    valor_csll?: number;              // CSLL retido
    desconto_incondicionado?: number; // Desconto incondicional
    desconto_condicionado?: number;   // Desconto condicional
    
    // Local da prestação
    codigo_municipio: string;         // Município de prestação (IBGE)
    
    // Código CNAE
    codigo_cnae?: string;             // 7 dígitos
    
    // Código tributação município (específico de cada cidade)
    codigo_tributacao_municipio?: string;
    
    // ========================================
    // CAMPOS DA REFORMA TRIBUTÁRIA (2026)
    // Detalhados na seção 3
    // ========================================
  };
  
  // ========================================
  // CONSTRUÇÃO CIVIL (quando aplicável)
  // ========================================
  
  construcao_civil?: {
    codigo_obra?: string;             // Código da obra
    art?: string;                     // ART
  };
  
  // ========================================
  // INTERMEDIÁRIO (quando houver)
  // ========================================
  
  intermediario?: {
    cpf?: string;
    cnpj?: string;
    razao_social?: string;
    inscricao_municipal?: string;
  };
}
```

### 2.3.2 NFSe Nacional (Padrão Federal)

```typescript
interface NFSeNacionalPayload {
  // ========================================
  // DPS - Declaração de Prestação de Serviços
  // ========================================
  
  // Identificação do DPS
  serie: string;                      // Série do documento
  numero: string;                     // Número do documento
  
  // Competência
  competencia: string;                // AAAA-MM (Ex: "2026-01")
  
  // Data e hora de emissão
  dh_emissao: string;                 // ISO 8601
  
  // ========================================
  // PRESTADOR
  // ========================================
  
  prestador: {
    cpf_cnpj: string;
    inscricao_municipal?: string;
    codigo_municipio: string;         // IBGE 7 dígitos
  };
  
  // ========================================
  // TOMADOR
  // ========================================
  
  tomador: {
    cpf_cnpj?: string;
    razao_social: string;
    email: string;
    endereco: {
      endereco_nacional?: {
        cep: string;
        numero: string;
        complemento?: string;
      };
    };
  };
  
  // ========================================
  // SERVIÇO
  // ========================================
  
  servico: {
    // Código NBS - Nomenclatura Brasileira de Serviços
    codigo_nbs?: string;
    
    // Código LC 116
    item_lista_servico: string;
    
    // Descrição
    descricao: string;
    
    // Valores
    valor_servico: number;
    valor_deducao?: number;
    
    // Local da prestação
    codigo_municipio_incidencia: string;
    
    // ========================================
    // CAMPOS DA REFORMA TRIBUTÁRIA (2026)
    // Detalhados na seção 3
    // ========================================
  };
  
  // ========================================
  // VALORES E TRIBUTOS
  // ========================================
  
  valores: {
    valor_servicos: number;
    valor_deducoes?: number;
    valor_pis?: number;
    valor_cofins?: number;
    valor_inss?: number;
    valor_ir?: number;
    valor_csll?: number;
    outras_retencoes?: number;
    valor_iss?: number;
    aliquota?: number;
    valor_liquido: number;
    desconto_incondicionado?: number;
    desconto_condicionado?: number;
  };
}
```

---

# ⚖️ **3. REFORMA TRIBUTÁRIA 2026 - NOVOS CAMPOS**

## 3.1 Visão Geral da Reforma

### Cronograma de Transição

| Período | CBS | IBS | Impostos Antigos |
|---------|-----|-----|------------------|
| **2026** | 0,9% | 0,1% | PIS, COFINS, IPI, ICMS, ISS mantidos |
| **2027-2028** | A definir | 0,05% estadual + 0,05% municipal | Redução gradual |
| **2029-2032** | Transição | Transição | Extinção gradual |
| **2033+** | Alíquota plena | Alíquota plena | Extintos |

### Novos Tributos

| Tributo | Descrição | Substitui |
|---------|-----------|-----------|
| **CBS** | Contribuição sobre Bens e Serviços | PIS, COFINS, IPI (federal) |
| **IBS** | Imposto sobre Bens e Serviços | ICMS, ISS (estadual/municipal) |
| **IS** | Imposto Seletivo | Tributo sobre produtos nocivos |

## 3.2 Novos Campos para NFe/NFCe (Reforma Tributária)

### 3.2.1 Campos no Nível da Nota

```typescript
interface NFeReformaTributaria {
  // ========================================
  // GRUPO gIBSCBS - Informações do IBS e CBS
  // Obrigatório a partir de 01/01/2026
  // ========================================
  
  ibs_cbs?: {
    // Indicador de composição do valor total da nota
    // 0=Valor NF não compõe o total, 1=Valor NF compõe o total
    ind_total_ibs_cbs?: '0' | '1';
    
    // Valor total do IBS
    valor_ibs?: number;
    
    // Valor total da CBS
    valor_cbs?: number;
    
    // Valor total do IS (Imposto Seletivo)
    valor_is?: number;
  };
  
  // ========================================
  // Informações de crédito presumido
  // ========================================
  
  credito_presumido?: {
    // Código do crédito presumido
    codigo: string;
    
    // Valor do crédito
    valor: number;
    
    // Base de cálculo
    base_calculo: number;
  };
  
  // ========================================
  // NOVOS TIPOS DE FINALIDADE (finNFe)
  // ========================================
  
  // Valores existentes: 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  // NOVOS valores da Reforma:
  // 5 = NF-e de Crédito (para documentar créditos tributários)
  // 6 = NF-e de Débito (para documentar débitos tributários)
  finalidade_emissao: '1' | '2' | '3' | '4' | '5' | '6';
}
```

### 3.2.2 Campos no Nível do Item (Produto)

```typescript
interface NFeItemReformaTributaria {
  // ========================================
  // GRUPO gTribIBSCBS - Tributação IBS/CBS do item
  // ========================================
  
  trib_ibs_cbs?: {
    // CST do IBS/CBS (Código de Situação Tributária)
    cst_ibs_cbs: string;
    // 00=Tributação normal
    // 10=Tributação com alíquota zero
    // 20=Isenção
    // 30=Não incidência
    // 40=Suspensão
    // 50=Diferimento
    // 51=Diferimento parcial
    // 60=Crédito presumido
    // 70=Redução de base de cálculo
    // 90=Outros
    
    // Alíquota do IBS Estadual
    aliquota_ibs_uf?: number;
    
    // Alíquota do IBS Municipal
    aliquota_ibs_mun?: number;
    
    // Alíquota da CBS
    aliquota_cbs?: number;
    
    // Base de cálculo do IBS/CBS
    base_calculo_ibs_cbs?: number;
    
    // Valor do IBS Estadual
    valor_ibs_uf?: number;
    
    // Valor do IBS Municipal
    valor_ibs_mun?: number;
    
    // Valor da CBS
    valor_cbs?: number;
    
    // ========================================
    // CRÉDITO PRESUMIDO POR ITEM
    // ========================================
    
    // Indicador de crédito presumido
    ind_cred_presumido?: '0' | '1';   // 0=Não, 1=Sim
    
    // Código do crédito presumido (tabela específica)
    cod_cred_presumido?: string;
    
    // Percentual de crédito presumido
    perc_cred_presumido?: number;
    
    // Valor do crédito presumido IBS
    valor_cred_presumido_ibs?: number;
    
    // Valor do crédito presumido CBS
    valor_cred_presumido_cbs?: number;
    
    // ========================================
    // CLASSIFICAÇÃO TRIBUTÁRIA (substitui alguns CSTs)
    // ========================================
    
    // Código de classificação tributária do item
    cod_class_trib?: string;
    
    // ========================================
    // IMPOSTO SELETIVO (IS)
    // ========================================
    
    imposto_seletivo?: {
      // CST do Imposto Seletivo
      cst_is: string;
      
      // Alíquota do IS
      aliquota_is?: number;
      
      // Base de cálculo do IS
      base_calculo_is?: number;
      
      // Valor do IS
      valor_is?: number;
    };
  };
  
  // ========================================
  // CÓDIGO NBS (Nomenclatura Brasileira de Serviços)
  // Obrigatório para serviços incluídos em produtos
  // ========================================
  
  codigo_nbs?: string;                // 9 dígitos
}
```

## 3.3 Novos Campos para NFSe (Reforma Tributária)

### 3.3.1 Campos no Serviço

```typescript
interface NFSeServicoReformaTributaria {
  // ========================================
  // GRUPO DE TRIBUTAÇÃO IBS/CBS
  // Obrigatório a partir de 01/01/2026
  // ========================================
  
  trib_ibs_cbs?: {
    // CST do IBS/CBS para serviços
    cst_ibs_cbs: string;
    // Mesmos códigos da NFe
    
    // Alíquotas
    aliquota_ibs?: number;            // IBS total (UF + Mun)
    aliquota_cbs?: number;            // CBS federal
    
    // Base de cálculo
    base_calculo?: number;
    
    // Valores calculados
    valor_ibs?: number;
    valor_cbs?: number;
    
    // Indicador de retenção IBS/CBS
    ind_retencao_ibs_cbs?: '1' | '2';
    // 1=Retido pelo tomador
    // 2=Não retido
    
    // Valores retidos
    valor_ibs_retido?: number;
    valor_cbs_retido?: number;
  };
  
  // ========================================
  // CÓDIGO NBS (Obrigatório na Reforma)
  // ========================================
  
  codigo_nbs: string;                 // 9 dígitos
  
  // ========================================
  // CRÉDITO PRESUMIDO PARA SERVIÇOS
  // ========================================
  
  credito_presumido?: {
    ind_cred_presumido: '0' | '1';
    cod_cred_presumido?: string;
    perc_cred_presumido?: number;
    valor_cred_presumido_ibs?: number;
    valor_cred_presumido_cbs?: number;
  };
}
```

### 3.3.2 NFSe Nacional - Novos Campos DPS

```typescript
interface DPSReformaTributaria {
  // ========================================
  // GRUPO infTribIBSCBS (Novo na NT 005/2025)
  // ========================================
  
  info_trib_ibs_cbs?: {
    // Situação tributária
    sit_trib: string;
    
    // UF de destino da operação
    uf_destino?: string;
    
    // Município de destino
    cod_mun_destino?: string;
    
    // Valores
    valor_bc?: number;                // Base de cálculo
    aliq_ibs_mun?: number;            // Alíquota IBS municipal
    aliq_ibs_uf?: number;             // Alíquota IBS estadual
    aliq_cbs?: number;                // Alíquota CBS
    valor_ibs_mun?: number;           // Valor IBS municipal
    valor_ibs_uf?: number;            // Valor IBS estadual
    valor_cbs?: number;               // Valor CBS
    valor_ibs_mun_retido?: number;    // IBS municipal retido
    valor_ibs_uf_retido?: number;     // IBS estadual retido
    valor_cbs_retido?: number;        // CBS retido
    
    // Crédito presumido
    tipo_cred_presumido?: string;
    valor_cred_presumido?: number;
    valor_bc_cred_presumido?: number;
    aliq_cred_presumido?: number;
    
    // Benefícios fiscais
    cod_benef_fiscal?: string;
    valor_benef_fiscal?: number;
  };
}
```

## 3.4 Eventos Fiscais da Reforma Tributária

```typescript
// Novos eventos disponíveis na NFe relacionados à Reforma
interface EventosReformaTributaria {
  // ========================================
  // EVENTO DE CONCILIAÇÃO TRIBUTÁRIA
  // ========================================
  
  conciliacao_tributaria?: {
    tipo_evento: 'conciliacao_ibs_cbs';
    
    // Período de apuração
    periodo_apuracao: string;         // AAAA-MM
    
    // Valores apurados
    valor_ibs_apurado: number;
    valor_cbs_apurado: number;
    
    // Valores já recolhidos
    valor_ibs_recolhido: number;
    valor_cbs_recolhido: number;
    
    // Saldo (crédito/débito)
    saldo_ibs: number;
    saldo_cbs: number;
  };
  
  // ========================================
  // EVENTO DE CRÉDITO PRESUMIDO
  // ========================================
  
  registro_credito_presumido?: {
    tipo_evento: 'registro_credito_presumido';
    
    // Código do crédito
    codigo_credito: string;
    
    // Valor do crédito
    valor_credito_ibs: number;
    valor_credito_cbs: number;
    
    // Fundamentação legal
    fundamentacao: string;
  };
}
```

## 3.5 Tabela de CST IBS/CBS

```typescript
// Código de Situação Tributária para IBS/CBS
const CST_IBS_CBS = {
  '00': 'Tributação normal',
  '10': 'Tributação com alíquota zero',
  '20': 'Isenção',
  '30': 'Não incidência',
  '40': 'Suspensão',
  '50': 'Diferimento total',
  '51': 'Diferimento parcial',
  '60': 'Cobrança do IBS/CBS por substituição tributária',
  '70': 'Redução da base de cálculo',
  '80': 'Tributação monofásica',
  '90': 'Outros',
  
  // Específicos para operações de entrada
  '100': 'Crédito presumido',
  '110': 'Crédito de aquisição',
  '120': 'Crédito vedado'
};
```

---

# 🔄 **4. FLUXO DE INTEGRAÇÃO COM EDGE FUNCTIONS**

## 4.1 Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                         REVALYA                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  React   │───▶│   TanStack   │───▶│    Edge Functions     │  │
│  │   UI     │    │    Query     │    │      (Supabase)       │  │
│  └──────────┘    └──────────────┘    └───────────┬───────────┘  │
│                                                   │              │
└───────────────────────────────────────────────────┼──────────────┘
                                                    │
                                                    ▼
                                      ┌─────────────────────────┐
                                      │      FocusNFe API       │
                                      │    (Homolog/Produção)   │
                                      └─────────────────────────┘
```

## 4.2 Edge Functions Necessárias

### 4.2.1 Estrutura de Pastas

```
supabase/
  └── functions/
      └── focusnfe/
          ├── index.ts              # Router principal
          ├── nfe/
          │   ├── emit.ts           # Emissão de NFe
          │   ├── consult.ts        # Consulta de NFe
          │   └── cancel.ts         # Cancelamento de NFe
          ├── nfse/
          │   ├── emit.ts           # Emissão de NFSe
          │   ├── consult.ts        # Consulta de NFSe
          │   └── cancel.ts         # Cancelamento de NFSe
          ├── webhook/
          │   └── handler.ts        # Handler de webhooks
          └── utils/
              ├── auth.ts           # Autenticação
              ├── validator.ts      # Validações
              └── types.ts          # Tipos TypeScript
```

### 4.2.2 Edge Function Principal (Router)

```typescript
// supabase/functions/focusnfe/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Importar handlers
import { emitirNFe, consultarNFe, cancelarNFe } from './nfe/index.ts';
import { emitirNFSe, consultarNFSe, cancelarNFSe } from './nfse/index.ts';
import { handleWebhook } from './webhook/handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/focusnfe', '');
    const method = req.method;

    // Validar autenticação (exceto webhooks)
    if (!path.startsWith('/webhook')) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Não autorizado');
      }
      // Validar JWT do Supabase
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw new Error('Não autorizado');
      }
    }

    let response;

    // Roteamento
    switch (true) {
      // NFe
      case path === '/nfe/emit' && method === 'POST':
        response = await emitirNFe(req);
        break;
      case path.match(/^\/nfe\/[^\/]+$/) && method === 'GET':
        response = await consultarNFe(req);
        break;
      case path.match(/^\/nfe\/[^\/]+$/) && method === 'DELETE':
        response = await cancelarNFe(req);
        break;

      // NFSe
      case path === '/nfse/emit' && method === 'POST':
        response = await emitirNFSe(req);
        break;
      case path.match(/^\/nfse\/[^\/]+$/) && method === 'GET':
        response = await consultarNFSe(req);
        break;
      case path.match(/^\/nfse\/[^\/]+$/) && method === 'DELETE':
        response = await cancelarNFSe(req);
        break;

      // Webhooks
      case path === '/webhook' && method === 'POST':
        response = await handleWebhook(req);
        break;

      default:
        response = { error: 'Rota não encontrada', status: 404 };
    }

    return new Response(
      JSON.stringify(response),
      {
        status: response.status || 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### 4.2.3 Emissão de NFe (Edge Function)

```typescript
// supabase/functions/focusnfe/nfe/emit.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmitirNFeRequest {
  tenant_id: string;
  finance_entry_id: string;
  dados_nfe: NFePayload;
}

export async function emitirNFe(req: Request): Promise<any> {
  const body: EmitirNFeRequest = await req.json();
  const { tenant_id, finance_entry_id, dados_nfe } = body;

  // Inicializar Supabase com service role para acessar secrets
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Buscar configurações do FocusNFe para o tenant
  const { data: config, error: configError } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('provider', 'focusnfe')
    .eq('is_active', true)
    .single();

  if (configError || !config) {
    return { 
      error: 'FocusNFe não configurado para este tenant',
      status: 400 
    };
  }

  // Determinar ambiente
  const baseUrl = config.environment === 'producao'
    ? 'https://api.focusnfe.com.br/v2'
    : 'https://homologacao.focusnfe.com.br/v2';

  // Gerar referência única
  const referencia = `${tenant_id}_${finance_entry_id}_${Date.now()}`;

  // Mesclar dados com configurações padrão do emitente
  const payload = {
    ...dados_nfe,
    cnpj_emitente: config.settings.emitente.cnpj,
    // Adicionar campos da Reforma Tributária se estiver em 2026+
    ...(new Date().getFullYear() >= 2026 && {
      ibs_cbs: calcularIBSCBS(dados_nfe)
    })
  };

  // Enviar para FocusNFe
  const response = await fetch(
    `${baseUrl}/nfe?ref=${referencia}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();

  if (!response.ok) {
    // Logar erro
    await supabase.from('audit_logs').insert({
      tenant_id,
      action: 'nfe_emit_error',
      entity_type: 'finance_entry',
      entity_id: finance_entry_id,
      details: { error: result, referencia }
    });

    return {
      success: false,
      error: result.mensagem || 'Erro ao emitir NFe',
      detalhes: result.erros,
      status: response.status
    };
  }

  // Salvar referência no lançamento financeiro
  await supabase
    .from('finance_entries')
    .update({
      invoice_data: {
        provider: 'focusnfe',
        tipo: 'nfe',
        referencia,
        status: result.status,
        enviado_em: new Date().toISOString()
      },
      invoice_status: 'processing',
      updated_at: new Date().toISOString()
    })
    .eq('id', finance_entry_id);

  // Logar sucesso
  await supabase.from('audit_logs').insert({
    tenant_id,
    action: 'nfe_emit_success',
    entity_type: 'finance_entry',
    entity_id: finance_entry_id,
    details: { referencia, status: result.status }
  });

  return {
    success: true,
    referencia,
    status: result.status,
    caminho: result.caminho
  };
}

// Função auxiliar para calcular IBS/CBS (2026+)
function calcularIBSCBS(dados: NFePayload) {
  // Alíquotas 2026: CBS 0.9%, IBS 0.1%
  const aliquota_cbs = 0.009;
  const aliquota_ibs = 0.001;
  
  let valor_cbs = 0;
  let valor_ibs = 0;
  
  dados.itens?.forEach(item => {
    const base = item.valor_bruto || 0;
    valor_cbs += base * aliquota_cbs;
    valor_ibs += base * aliquota_ibs;
  });
  
  return {
    valor_cbs: Math.round(valor_cbs * 100) / 100,
    valor_ibs: Math.round(valor_ibs * 100) / 100,
    ind_total_ibs_cbs: '1'
  };
}
```

### 4.2.4 Handler de Webhooks

```typescript
// supabase/functions/focusnfe/webhook/handler.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  evento: string;
  referencia: string;
  status: string;
  data: string;
  cnpj_emitente?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  mensagem_sefaz?: string;
}

export async function handleWebhook(req: Request): Promise<any> {
  const payload: WebhookPayload = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Extrair tenant_id e finance_entry_id da referência
  // Formato: {tenant_id}_{finance_entry_id}_{timestamp}
  const [tenant_id, finance_entry_id] = payload.referencia.split('_');

  // Determinar tipo de documento
  const tipo_documento = payload.evento.startsWith('nfe') ? 'nfe' : 'nfse';

  // Mapear status do FocusNFe para status do Revalya
  const statusMap: Record<string, string> = {
    'autorizado': 'issued',
    'cancelado': 'cancelled',
    'erro_autorizacao': 'error',
    'denegado': 'denied',
    'processando': 'processing'
  };

  const invoice_status = statusMap[payload.status] || 'unknown';

  // Preparar dados da nota fiscal
  const invoice_data = {
    provider: 'focusnfe',
    tipo: tipo_documento,
    referencia: payload.referencia,
    status: payload.status,
    
    // Dados da autorização
    chave: payload.chave_nfe,
    numero: payload.numero,
    serie: payload.serie,
    
    // URLs dos documentos
    xml_url: payload.caminho_xml_nota_fiscal,
    pdf_url: payload.caminho_danfe,
    
    // Timestamps
    atualizado_em: new Date().toISOString(),
    ...(payload.status === 'autorizado' && {
      autorizado_em: payload.data
    }),
    ...(payload.status === 'cancelado' && {
      cancelado_em: payload.data
    }),
    
    // Mensagens de erro
    ...(payload.mensagem_sefaz && {
      mensagem_sefaz: payload.mensagem_sefaz
    })
  };

  // Atualizar lançamento financeiro
  const { error: updateError } = await supabase
    .from('finance_entries')
    .update({
      invoice_data,
      invoice_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', finance_entry_id)
    .eq('tenant_id', tenant_id);

  if (updateError) {
    console.error('Erro ao atualizar lançamento:', updateError);
    return { error: 'Erro ao processar webhook', status: 500 };
  }

  // Registrar evento no audit log
  await supabase.from('audit_logs').insert({
    tenant_id,
    action: `webhook_${payload.evento}`,
    entity_type: 'finance_entry',
    entity_id: finance_entry_id,
    details: payload
  });

  // Se autorizado, pode disparar notificações
  if (payload.status === 'autorizado') {
    // TODO: Enviar email/notificação para o usuário
    // TODO: Atualizar dashboard em tempo real via Realtime
  }

  return { success: true, processed: true };
}
```

## 4.3 Fluxo Completo de Emissão

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE EMISSÃO NFe/NFSe                       │
└──────────────────────────────────────────────────────────────────────────┘

   USUÁRIO                FRONTEND               EDGE FUNCTION            FOCUSNFE
      │                      │                        │                      │
      │  1. Clica "Emitir"   │                        │                      │
      │─────────────────────▶│                        │                      │
      │                      │                        │                      │
      │                      │  2. POST /focusnfe/    │                      │
      │                      │     nfe/emit           │                      │
      │                      │───────────────────────▶│                      │
      │                      │                        │                      │
      │                      │                        │  3. Busca config     │
      │                      │                        │     do tenant        │
      │                      │                        │───────┐              │
      │                      │                        │       │              │
      │                      │                        │◀──────┘              │
      │                      │                        │                      │
      │                      │                        │  4. POST /v2/nfe     │
      │                      │                        │───────────────────▶  │
      │                      │                        │                      │
      │                      │                        │  5. {status:         │
      │                      │                        │      processando}    │
      │                      │                        │◀─────────────────────│
      │                      │                        │                      │
      │                      │                        │  6. Salva no DB      │
      │                      │                        │     (processing)     │
      │                      │                        │                      │
      │                      │  7. {success: true,    │                      │
      │                      │      referencia}       │                      │
      │                      │◀───────────────────────│                      │
      │                      │                        │                      │
      │  8. Exibe "Processando"                       │                      │
      │◀─────────────────────│                        │                      │
      │                      │                        │                      │
      │                      │                        │      (ASSÍNCRONO)    │
      │                      │                        │                      │
      │                      │                        │  9. Webhook:         │
      │                      │                        │     autorizado       │
      │                      │                        │◀─────────────────────│
      │                      │                        │                      │
      │                      │                        │ 10. Atualiza DB      │
      │                      │                        │     (issued)         │
      │                      │                        │                      │
      │                      │ 11. Realtime update    │                      │
      │                      │◀───────────────────────│                      │
      │                      │                        │                      │
      │ 12. Exibe "Autorizado"                        │                      │
      │◀─────────────────────│                        │                      │
      │                      │                        │                      │
```

## 4.4 Configuração do Webhook no FocusNFe

```typescript
// Script para configurar webhook no painel FocusNFe
async function configurarWebhook(token: string, ambiente: 'homologacao' | 'producao') {
  const baseUrl = ambiente === 'producao'
    ? 'https://api.focusnfe.com.br/v2'
    : 'https://homologacao.focusnfe.com.br/v2';

  const webhookUrl = `https://${Deno.env.get('SUPABASE_PROJECT_REF')}.supabase.co/functions/v1/focusnfe/webhook`;

  const response = await fetch(`${baseUrl}/hooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      url: webhookUrl,
      eventos: [
        'nfe.autorizado',
        'nfe.cancelado',
        'nfe.erro_autorizacao',
        'nfsen.autorizado',
        'nfsen.cancelado',
        'nfsen.erro_autorizacao'
      ]
    })
  });

  return await response.json();
}
```

---

# 📊 **5. ESTRUTURA DE DADOS NO SUPABASE**

## 5.1 Tabela payment_gateways (Atualizada)

```sql
-- Adicionar configurações para FocusNFe
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
  'token-focusnfe-aqui',
  'homologacao',
  '{
    "emitente": {
      "cnpj": "12345678000199",
      "razao_social": "Empresa Exemplo LTDA",
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
      "nfe": {
        "serie": "1",
        "natureza_operacao": "Venda de mercadoria",
        "tipo_documento": "1",
        "modalidade_frete": "9"
      },
      "nfse": {
        "natureza_operacao": "1",
        "optante_simples_nacional": true,
        "incentivador_cultural": false
      }
    }
  }'::jsonb
);
```

## 5.2 Campos no finance_entries

```sql
-- A coluna invoice_data já existe como JSONB
-- Estrutura esperada após emissão:

{
  "provider": "focusnfe",
  "tipo": "nfe" | "nfse",
  "referencia": "tenant_entry_timestamp",
  "status": "autorizado" | "cancelado" | "erro_autorizacao",
  "chave": "35260112345678000199550010000001231234567890",
  "numero": "123",
  "serie": "1",
  "xml_url": "https://api.focusnfe.com.br/...",
  "pdf_url": "https://api.focusnfe.com.br/...",
  "enviado_em": "2026-01-15T10:30:00Z",
  "autorizado_em": "2026-01-15T10:31:00Z",
  
  -- Campos da Reforma Tributária
  "ibs_cbs": {
    "valor_ibs": 10.00,
    "valor_cbs": 90.00,
    "aliquota_ibs": 0.001,
    "aliquota_cbs": 0.009
  }
}
```

---

# ✅ **6. CHECKLIST DE IMPLEMENTAÇÃO**

## 6.1 Fase 1: Infraestrutura Base

- [ ] Criar Edge Function `focusnfe` no Supabase
- [ ] Implementar router principal com autenticação
- [ ] Configurar secrets no Supabase (tokens)
- [ ] Criar handler de webhooks
- [ ] Atualizar schema `payment_gateways` para FocusNFe

## 6.2 Fase 2: NFSe (Serviços)

- [ ] Implementar `emitirNFSe()` na Edge Function
- [ ] Implementar `consultarNFSe()`
- [ ] Implementar `cancelarNFSe()`
- [ ] Criar tipos TypeScript completos
- [ ] Integrar com InvoiceService existente
- [ ] Testar em homologação

## 6.3 Fase 3: NFe (Produtos)

- [ ] Implementar `emitirNFe()` na Edge Function
- [ ] Implementar `consultarNFe()`
- [ ] Implementar `cancelarNFe()`
- [ ] Implementar carta de correção
- [ ] Implementar inutilização
- [ ] Criar interface de produtos
- [ ] Testar em homologação

## 6.4 Fase 4: Reforma Tributária 2026

- [ ] Adicionar campos IBS/CBS nos payloads
- [ ] Implementar cálculo automático de alíquotas
- [ ] Criar validações específicas para 2026
- [ ] Implementar suporte a crédito presumido
- [ ] Adicionar novos CSTs (IBS/CBS)
- [ ] Testar com validador da Receita

## 6.5 Fase 5: UI/UX

- [ ] Criar página de configuração FocusNFe
- [ ] Criar formulário de dados do emitente
- [ ] Criar seletor de provider na emissão
- [ ] Exibir status em tempo real
- [ ] Criar visualizador de XML/PDF
- [ ] Adicionar relatórios fiscais

## 6.6 Fase 6: Testes e Deploy

- [ ] Testes unitários das Edge Functions
- [ ] Testes de integração com FocusNFe (homologação)
- [ ] Validar todos os cenários de erro
- [ ] Documentar uso da API
- [ ] Deploy em produção

---

# 📚 **7. REFERÊNCIAS**

## Documentação Oficial

- [FocusNFe - Documentação API v2](https://focusnfe.com.br/doc/)
- [FocusNFe - Guia Reforma Tributária](https://focusnfe.com.br/guides/reforma-tributaria/)
- [NT 2025.002 - NFe/NFCe Reforma](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=tW+YMyk/50s=)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Legislação

- [Emenda Constitucional 132/2023](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm)
- [Lei Complementar 214/2025 (IBS/CBS)](https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp214.htm)

---

**Documento criado em:** 14/12/2025  
**Última atualização:** 14/12/2025  
**Versão:** 2.0  
**Autor:** Claude AI (Análise para Revalya)
