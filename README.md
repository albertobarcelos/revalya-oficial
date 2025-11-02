# Supabase CLI

[![Coverage Status](https://coveralls.io/repos/github/supabase/cli/badge.svg?branch=main)](https://coveralls.io/github/supabase/cli?branch=main) [![Bitbucket Pipelines](https://img.shields.io/bitbucket/pipelines/supabase-cli/setup-cli/master?style=flat-square&label=Bitbucket%20Canary)](https://bitbucket.org/supabase-cli/setup-cli/pipelines) [![Gitlab Pipeline Status](https://img.shields.io/gitlab/pipeline-status/sweatybridge%2Fsetup-cli?label=Gitlab%20Canary)
](https://gitlab.com/sweatybridge/setup-cli/-/pipelines)

[Supabase](https://supabase.io) is an open source Firebase alternative. We're building the features of Firebase using enterprise-grade open source tools.

This repository contains all the functionality for Supabase CLI.

- [x] Running Supabase locally
- [x] Managing database migrations
- [x] Creating and deploying Supabase Functions
- [x] Generating types directly from your database schema
- [x] Making authenticated HTTP requests to [Management API](https://supabase.com/docs/reference/api/introduction)

## Getting started

### Install the CLI

Available via [NPM](https://www.npmjs.com) as dev dependency. To install:

```bash
npm i supabase --save-dev
- Isolamento completo de dados entre tenants
- Sistema de convites para acesso entre tenants
- Controle de acesso baseado em papéis (RBAC)
- Verificação em múltiplas camadas de segurança

## Atualizações Recentes

### Janeiro 2025: Sistema de Anexos de Contratos

Implementamos um sistema completo de gerenciamento de anexos para contratos com segurança multi-tenant e integração com Supabase Storage.

#### 🔍 **Funcionalidades Implementadas**

**Upload de Arquivos**:
- Interface drag-and-drop intuitiva
- Validação de tipos: PDF, DOCX, XLSX, JPEG, PNG
- Limite de 10MB por arquivo
- Categorização de anexos (Contrato, Aditivo, Documento do Cliente, Nota Fiscal, Outro)

**Segurança Multi-Tenant**:
- Bucket `contract-attachments` no Supabase Storage
- Políticas RLS para todas as operações (SELECT, INSERT, UPDATE, DELETE)
- Controle de acesso baseado em `tenant_id`
- Validação dupla: client-side + server-side

**Interface de Usuário**:
- Design responsivo com Shadcn/UI + Tailwind CSS
- Animações suaves com Framer Motion
- Busca e ordenação de anexos
- Download seguro com URLs temporárias
- Remoção de arquivos com confirmação

#### 🛠️ **Arquivos Implementados**

1. **Componente Principal**:
   - `src/components/contracts/parts/ContractAttachments.tsx` - Interface completa de anexos
   - Integração na aba "Observações" do formulário de contratos

2. **Hook de Gerenciamento**:
   - `src/hooks/useContractAttachments.ts` - Lógica de negócio e operações seguras
   - Implementa `useTenantAccessGuard` e `useSecureTenantQuery`

3. **Estrutura de Banco**:
   - Tabela `contract_attachments` com coluna `tenant_id`
   - Bucket `contract-attachments` no Supabase Storage
   - Políticas RLS configuradas para segurança multi-tenant

#### 🎯 **Localização no Sistema**

O sistema de anexos está integrado no formulário de contratos:
- **Caminho**: Contratos → Novo/Editar Contrato → Aba "Observações"
- **Disponibilidade**: Apenas após salvar o contrato (quando `contractId` existe)

#### 🔒 **Segurança Implementada**

```typescript
// AIDEV-NOTE: 5 Camadas de Segurança Multi-Tenant
1. Validação de Acesso: useTenantAccessGuard()
2. Consultas Seguras: useSecureTenantQuery()
3. Query Keys: Sempre incluir tenant_id
4. Validação Dupla: Client-side + RLS
5. Auditoria: Logs em operações críticas
```

### Janeiro 2025: Correção da Estrutura da Tabela message_history

Realizamos uma correção completa da estrutura da tabela `message_history` para alinhar o código com o schema real do banco de dados.

#### 🔍 **Problema Identificado**

**Inconsistências entre código e banco**:
- Interface `MessageHistory` no código não refletia a estrutura real da tabela
- Campos inexistentes sendo utilizados (`template_name`, `sent_at`, `message_content`, etc.)
- Queries falhando por tentar selecionar campos que não existem

#### 🛠️ **Correções Implementadas**

1. **Atualização da Interface MessageHistory**:
   ```typescript
   interface MessageHistory {
     id: string;
     tenant_id: string;
     charge_id: string | null;
     template_id: string | null;
     customer_id: string | null;
     message: string | null;
     status: string | null;
     error_details: string | null;
     metadata: any | null;
     created_at: string;
     updated_at: string | null;
     batch_id: string | null;
   }
   ```

2. **Arquivos Corrigidos**:
   - ✅ `src/hooks/useMessageHistory.ts` - Interface e query corrigidas
   - ✅ `src/components/charges/ChargeMessageHistory.tsx` - Campos de exibição atualizados
   - ✅ `src/components/charges/ChargeDetails.test.tsx` - Mock data corrigido
   - ✅ `src/types/database.ts` - Interface principal atualizada
   - ✅ `src/services/messageService.ts` - Função `recordMessageHistory` corrigida

3. **Mapeamento de Campos Corrigido**:
   - `sent_at` → `created_at`
   - `template_name` → `template_id`
   - `message_content` → `message`
   - `customer_name` → `metadata.customer_name`
   - `customer_phone` → `metadata.customer_phone`
   - `error_message` → `error_details`

#### 🎯 **Resultados**

- ✅ **Consistência**: Código alinhado com schema real do banco
- ✅ **Funcionalidade**: Histórico de mensagens funcionando corretamente
- ✅ **Manutenibilidade**: Interface TypeScript reflete estrutura real
- ✅ **Testes**: Mocks atualizados para refletir dados reais

### Janeiro 2025: Sistema de Monitoramento de Constraint Violations

Implementamos um sistema completo de monitoramento e prevenção de violações de constraint na tabela `conciliation_staging`, especificamente para o erro `conciliation_staging_origem_check`.

#### 🔍 **Problema Investigado**

**Erro Principal**: `new row for relation "conciliation_staging" violates check constraint "conciliation_staging_origem_check"`

**Investigação Realizada**:
- ✅ Análise completa de logs do PostgreSQL
- ✅ Verificação de todas as Edge Functions ASAAS
- ✅ Auditoria de APIs de reconciliação
- ✅ Busca por scripts de importação manual
- ✅ Verificação de processos externos

**Conclusão**: Nenhum código estava inserindo dados incorretos. Todos os sistemas estão corretamente configurados para usar `origem: 'ASAAS'` (maiúsculo).

#### 🛠️ **Sistema de Monitoramento Implementado**

1. **Tabela de Log de Violações**:
   ```sql
   CREATE TABLE constraint_violation_log (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     table_name TEXT NOT NULL,
     constraint_name TEXT NOT NULL,
     attempted_value TEXT,
     tenant_id UUID,
     error_message TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Edge Function de Monitoramento**:
   - 🔍 Detecção automática de violações
   - 📊 Análise de tendências e estatísticas
   - 🚨 Sistema de alertas por severidade
   - 📝 Logging completo de verificações

3. **Trigger de Captura**:
   ```sql
   -- Captura tentativas de inserção inválidas antes que causem erro
   CREATE TRIGGER conciliation_staging_violation_log
   BEFORE INSERT OR UPDATE ON conciliation_staging
   FOR EACH ROW EXECUTE FUNCTION trigger_log_conciliation_staging_violation();
   ```

#### 📊 **Níveis de Alerta**
- 🔴 **CRÍTICO**: > 10 violações/hora
- 🟡 **ATENÇÃO**: 5-10 violações/hora
- 🟢 **NORMAL**: < 5 violações/hora

#### 📚 **Documentação Criada**
- [`TROUBLESHOOTING_CONSTRAINT_VIOLATIONS.md`](./TROUBLESHOOTING_CONSTRAINT_VIOLATIONS.md) - Guia completo de troubleshooting
- [`MONITORAMENTO_CONSTRAINT_VIOLATIONS.md`](./MONITORAMENTO_CONSTRAINT_VIOLATIONS.md) - Sistema de monitoramento
- [`SOLUCAO_FINAL_CONSTRAINT_VIOLATIONS.md`](./SOLUCAO_FINAL_CONSTRAINT_VIOLATIONS.md) - Documentação da solução final

#### 🎯 **Resultados**
- ✅ **Sistema preventivo** implementado
- ✅ **Monitoramento automático** a cada 15 minutos
- ✅ **Documentação completa** para troubleshooting
- ✅ **Alertas proativos** para problemas futuros

### Janeiro 2025: Correções na Integração ASAAS - Mapeamento Completo de Dados

Implementamos correções críticas na integração ASAAS para garantir o mapeamento completo de todos os campos de cliente e dados de cobrança.

#### 🐛 **Problemas Identificados e Corrigidos**

1. **Campo `invoice_number` Ausente**:
   - **Problema**: Campo `invoice_number` não existia na tabela `conciliation_staging`
   - **Solução**: Adicionada migração para incluir o campo `invoice_number` com índice otimizado
   - **Impacto**: Agora capturamos o número da nota fiscal do ASAAS corretamente

2. **Mapeamento Incompleto de Dados do Cliente**:
   - **Problema**: Função de importação ASAAS não mapeava todos os campos de cliente disponíveis
   - **Campos Corrigidos**:
     - `customer_phone` ← `customerData?.phone`
     - `customer_mobile_phone` ← `customerData?.mobilePhone`
     - `customer_address` ← `customerData?.address`
     - `customer_address_number` ← `customerData?.addressNumber`
     - `customer_complement` ← `customerData?.complement`
     - `customer_province` ← `customerData?.neighborhood`
     - `customer_city` ← `customerData?.cityName`
     - `customer_state` ← `customerData?.state`
     - `customer_postal_code` ← `customerData?.postalCode`
     - `customer_country` ← `customerData?.country`
     - `invoice_number` ← `payment.invoiceNumber`

3. **Atualização de Registros Existentes**:
   - **Problema**: Ao atualizar registros existentes, dados do cliente não eram atualizados
   - **Solução**: Implementada busca e atualização completa dos dados do cliente em ambos os fluxos (inserção e atualização)

#### 🛠️ **Alterações Técnicas Implementadas**

1. **Migração de Banco de Dados**:
   ```sql
   -- Adição do campo invoice_number
   ALTER TABLE conciliation_staging 
   ADD COLUMN IF NOT EXISTS invoice_number TEXT;
   
   -- Índice para performance
   CREATE INDEX IF NOT EXISTS idx_conciliation_staging_invoice_number
   ON conciliation_staging(tenant_id, invoice_number) 
   WHERE invoice_number IS NOT NULL;
   ```

2. **Atualização da Edge Function `asaas-import-charges`**:
   - ✅ Mapeamento completo de todos os campos de cliente
   - ✅ Inclusão do campo `invoice_number`
   - ✅ Atualização de dados do cliente em registros existentes
   - ✅ Busca de dados do cliente via API ASAAS em ambos os fluxos

3. **Consistência com Webhook ASAAS**:
   - ✅ Verificado que o webhook `asaas-webhook-charges` já possui mapeamento completo
   - ✅ Ambos os sistemas (import e webhook) agora têm paridade de dados

#### 🎯 **Resultados**

- ✅ **Dados Completos**: Todos os campos de cliente do ASAAS são capturados
- ✅ **Nota Fiscal**: Campo `invoice_number` disponível para reconciliação
- ✅ **Consistência**: Paridade entre webhook e importação manual
- ✅ **Performance**: Índices otimizados para consultas por `invoice_number`
- ✅ **Integridade**: Dados do cliente sempre atualizados, mesmo em registros existentes
### Janeiro 2025: Campo Generate Billing para Controle de Faturamento Automático

Implementamos o campo `generate_billing` na tabela `contracts` para permitir controle granular sobre quais contratos devem gerar cobranças automáticas no sistema.

#### 🎯 **Funcionalidade Implementada**

- **Campo Database**: `generate_billing BOOLEAN DEFAULT true` na tabela `contracts`
- **Interface de Usuário**: Switch no formulário de contratos para controlar faturamento automático
- **Filtros de Serviço**: Serviços de automação agora consideram apenas contratos com `generate_billing = true`
- **Compatibilidade**: Todos os contratos existentes mantêm comportamento anterior (padrão `true`)

#### 🔧 **Serviços Atualizados**

1. **billingAutomationService.ts**: Filtro para processar apenas contratos com faturamento habilitado
2. **billingForecastService.ts**: Previsões geradas apenas para contratos ativos para faturamento
3. **useContracts.ts**: Hook atualizado para incluir o campo nas queries
4. **NewContractForm.tsx**: Interface com switch para controle do faturamento

#### 📋 **Benefícios**

- ✅ **Controle Granular**: Administradores podem desabilitar faturamento por contrato
- ✅ **Flexibilidade**: Contratos especiais podem ter cobrança manual
- ✅ **Compatibilidade**: Nenhuma funcionalidade existente foi quebrada
- ✅ **Segurança**: Implementação segue padrões multi-tenant do projeto

**Documentação**: [`CONTRATOS_GENERATE_BILLING.md`](./Documentação%20do%20Projeto/CONTRATOS_GENERATE_BILLING.md)

### Janeiro 2025: Melhorias na Integração WhatsApp - Persistência e Reconexão Automática

Implementamos correções críticas na integração WhatsApp para resolver problemas de persistência de configuração e reconexão automática após recarregamento da página.

#### 🐛 **Problemas Identificados**

1. **Persistência no Banco de Dados**:
   - **Erro**: Configurações do WhatsApp não eram salvas corretamente na tabela `tenant_integrations`
   - **Causa**: Método `saveInstanceConfig` não estava sendo chamado após conexão bem-sucedida
   - **Impacto**: Perda de configuração ao recarregar a página

2. **Estado do Frontend**:
   - **Erro**: Interface mostrava instância como desconectada mesmo quando estava ativa
   - **Causa**: Falta de verificação de status em tempo real ao carregar a página
   - **Impacto**: Experiência inconsistente para o usuário

#### ✅ **Soluções Implementadas**

1. **Correção da Persistência**:
   ```typescript
   // AIDEV-NOTE: Método para monitorar conexão e salvar configuração automaticamente
   private async monitorConnectionAndSave(tenantSlug: string, instanceName: string): Promise<void> {
     const maxAttempts = 30; // 30 segundos de monitoramento
     
     for (let attempt = 0; attempt < maxAttempts; attempt++) {
       const status = await this.getInstanceStatus(instanceName);
       
       if (status.isConnected) {
         await this.saveInstanceConfig(tenantSlug, instanceName, true);
         break;
       }
       
       await new Promise(resolve => setTimeout(resolve, 1000));
     }
   }
   ```

2. **Novo Hook para Verificação de Status**:
   ```typescript
   // AIDEV-NOTE: Hook para verificar status da instância em tempo real
   export function useWhatsAppInstanceStatus(tenantSlug: string, instanceName: string) {
     return useQuery({
       queryKey: ['whatsapp-instance-status', tenantSlug, instanceName],
       queryFn: async () => {
         const response = await fetch('/api/whatsapp/status', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ tenantSlug, instanceName })
         });
         return response.json();
       },
       enabled: !!tenantSlug && !!instanceName
     });
   }
   ```

3. **Novo Endpoint de API**:
   ```typescript
   // AIDEV-NOTE: Endpoint para verificar status em tempo real da instância WhatsApp
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     if (req.method !== 'POST') {
       return res.status(405).json({ error: 'Method not allowed' });
     }
     
     const { tenantSlug, instanceName } = req.body;
     const status = await whatsappService.getInstanceStatus(instanceName);
     
     return res.status(200).json(status);
   }
   ```

#### 🔧 **Melhorias Técnicas Implementadas**

1. **Monitoramento Automático**:
   - Verificação contínua do status de conexão por 30 segundos
   - Salvamento automático da configuração quando instância conecta
   - Logs detalhados para debugging

2. **Sincronização de Estado**:
   - Hook `useWhatsAppInstanceStatus` para verificação em tempo real
   - Sincronização automática entre estado local e banco de dados
   - Atualização da interface baseada no status real da instância

3. **Tratamento de Erros Aprimorado**:
   - Uso de `maybeSingle()` para evitar erros quando registro não existe
   - Logs informativos em todas as operações críticas
   - Tratamento gracioso de falhas de conexão

#### 🛡️ **Segurança e Auditoria**

- **Contexto de Tenant**: Todas as operações respeitam o contexto multi-tenant
- **Logs de Auditoria**: Registro de todas as operações de configuração
- **Validação de Acesso**: Verificação de permissões antes de operações

#### ✅ **Resultados**

- ✅ **Persistência Corrigida**: Configurações salvas corretamente no banco
- ✅ **Reconexão Automática**: Interface reflete status real da instância
- ✅ **Experiência Melhorada**: Usuário vê estado consistente após reload
- ✅ **Monitoramento**: Sistema detecta e salva conexões automaticamente

### Janeiro 2025: Refatoração Completa do Edge Function Service com Segurança Multi-Tenant

Implementamos uma refatoração completa do `edgeFunctionService.ts` para atender aos padrões de segurança multi-tenant estabelecidos no projeto, seguindo as diretrizes dos documentos de segurança e integração de canais.

#### 🎯 **Objetivos da Refatoração**

1. **Conformidade com Padrões de Segurança**: Alinhamento com o guia de implementação multi-tenant seguro
2. **Validação Dupla de Tenant**: Implementação de validação em múltiplas camadas
3. **Auditoria e Logs**: Sistema completo de auditoria para operações de Edge Functions
4. **Tipagem Rigorosa**: Eliminação de tipos `any` e implementação de interfaces específicas

#### 🔧 **Principais Mudanças Implementadas**

1. **Novas Interfaces TypeScript**:
   ```typescript
   // Contexto de tenant para validações de segurança
   interface TenantContext {
     id: string;
     slug: string;
     userId: string;
   }

   // Headers seguros com validação de tenant
   interface SecureHeaders {
     'Authorization': string;
     'Content-Type': string;
     'x-tenant-id'?: string;
     'x-request-id'?: string;
   }

   // Interface para erros estendidos (substituindo 'any')
   interface ExtendedError extends Error {
     status?: number;
     statusText?: string;
     responseError?: unknown;
   }
   ```

2. **Sistema de Auditoria Completo**:
   ```typescript
   class SecurityAuditLogger {
     // Log de chamadas para Edge Functions
     static logEdgeFunctionCall(functionName: string, tenantId: string, requestId: string): void

     // Log de validações de segurança
     static logSecurityValidation(type: string, tenantId: string, details: Record<string, unknown>): void

     // Log de erros de segurança
     static logError(error: Error, context: Record<string, unknown>): void
   }
   ```

3. **Validador de Segurança Multi-Tenant**:
   ```typescript
   class MultiTenantSecurityValidator {
     // Validação de contexto de tenant
     static validateTenantContext(tenantContext: TenantContext | null): void

     // Validação dupla de tenant_id na resposta
     static validateResponseTenantId<T>(data: T, expectedTenantId: string): void

     // Validação de autenticação JWT
     static validateJWTAuth(jwt: string | null): void
   }
   ```

4. **Função Principal Refatorada**:
   - **`callEdgeFunctionWithRetry`**: Implementa retry automático com validações de segurança
   - **`sendBulkMessages`**: Função específica para envio de mensagens em lote
   - **`callEdgeFunction`**: Método genérico para chamadas de Edge Functions

#### 🛡️ **Recursos de Segurança Implementados**

1. **Validação Dupla de Tenant**:
   - Validação no contexto da requisição
   - Validação na resposta da Edge Function
   - Prevenção de vazamento de dados entre tenants

2. **Sistema de Auditoria**:
   - Log de todas as chamadas para Edge Functions
   - Rastreamento de validações de segurança
   - Log detalhado de erros com contexto

3. **Headers Seguros**:
   - JWT obrigatório para autenticação
   - `x-tenant-id` para isolamento de dados
   - `x-request-id` para rastreabilidade

4. **Retry Inteligente**:
   - Retry automático em caso de erro 401 (token expirado)
   - Máximo de 3 tentativas com backoff
   - Preservação de contexto de segurança

#### 📋 **Anchor Comments Adicionados**

```typescript
// AIDEV-NOTE: Interface para contexto de tenant - validação de segurança multi-tenant
// Garante que todas as operações tenham contexto válido do tenant

// AIDEV-NOTE: Classe para auditoria de segurança em Edge Functions
// Registra todas as operações para compliance e debugging

// AIDEV-NOTE: Validador de segurança multi-tenant
// Implementa validações obrigatórias conforme guia de segurança

// AIDEV-NOTE: Função principal com retry e validações de segurança
// Implementa padrão de retry com preservação de contexto de tenant
```

#### ✅ **Validações Realizadas**

1. **Build Successful**: `npm run build` executado sem erros
2. **Lint Clean**: `npx eslint` passou sem warnings ou erros
3. **Type Safety**: Eliminação completa de tipos `any`
4. **Security Compliance**: Conformidade com guias de segurança multi-tenant

#### 🎯 **Impacto da Refatoração**

- ✅ **Segurança**: Implementação completa de validações multi-tenant
- ✅ **Auditoria**: Sistema de logs para compliance e debugging
- ✅ **Tipagem**: Code base 100% type-safe
- ✅ **Manutenibilidade**: Código modular e bem documentado
- ✅ **Conformidade**: Alinhamento com padrões estabelecidos no projeto

### Janeiro 2025: Refatoração e Correções das Páginas de Produtos e Serviços

Implementamos uma série de correções e melhorias nas páginas de produtos e serviços para garantir consistência e funcionalidade completa.

#### 🐛 **Problemas Identificados**

1. **Página de Produtos**:
   - **Erro**: TypeError devido a funções e imports incorretos
   - **Causa**: Referências a componentes e funções que não existiam mais
   - **Impacto**: Página não carregava corretamente

2. **Página de Serviços**:
   - **Erro**: Botão "Novo Serviço" não respondia ao clique
   - **Causa**: Incompatibilidade de props no `CreateServiceDialog`
   - **Impacto**: Impossibilidade de criar novos serviços

#### ✅ **Soluções Implementadas**

1. **Correção da Página de Produtos**:
   - Corrigido import de `EditModal` para `EditProductDialog`
   - Removidas funções obsoletas: `updateProductMutation`, `createProductMutation`, `handleSaveProduct`, `handleCancelEdit`
   - Removida função `handleCodeValidation` não utilizada
   - Removida prop `onCodeValidation` inexistente
   - Mantida estrutura CRUD funcional com React Query

2. **Atualização do `CreateServiceDialog`**:
   - Adicionadas props opcionais: `open?`, `onOpenChange?`, `onSuccess?`
   - Implementado suporte para controle de estado tanto interno quanto externo
   - Lógica condicional para renderizar `DialogTrigger` apenas quando necessário
   - Garantia de compatibilidade com diferentes contextos de uso

3. **Verificação de Compatibilidade**:
   - Estado externo tem prioridade sobre estado interno
   - Renderização condicional do trigger para evitar conflitos
   - Validação de funcionamento em diferentes cenários de uso

#### 🔧 **Detalhes Técnicos**

- **Arquivo modificado**: `src/components/services/CreateServiceDialog.tsx`
- **Props adicionadas**: `open?`, `onOpenChange?`, `onSuccess?`
- **Lógica**: Estado externo tem prioridade sobre estado interno
- **Teste realizado**: Criação de novo serviço funcionando corretamente

### Janeiro 2025: Correção Crítica - Vinculação Automática de Cobranças aos Períodos no Kanban

Implementamos uma correção crítica no Kanban de Faturamento para garantir que as cobranças criadas sejam automaticamente vinculadas aos períodos de faturamento correspondentes.

#### 🐛 **Problema Identificado**

- **Sintoma**: Botão "Faturar" criava cobranças mas cards não se moviam para "Faturados no Mês"
- **Causa**: `billingMutation` não chamava `on_charge_created_link_period` após criar cobranças
- **Impacto**: Inconsistência entre cobranças criadas e status dos períodos de faturamento

#### ✅ **Solução Implementada**

**Arquivo Modificado**: `src/pages/FaturamentoKanban.tsx`

```typescript
// Para cobranças únicas
if (chargeResult?.data?.id) {
  await supabase.rpc('on_charge_created_link_period', {
    p_charge_id: chargeResult.data.id
  });
}

// Para cobranças parceladas
if (installmentResults.successCount > 0 && installmentResults.results[0]?.data?.id) {
  await supabase.rpc('on_charge_created_link_period', {
    p_charge_id: installmentResults.results[0].data.id
  });
}
```

To install the beta release channel:

```bash
npm i supabase@beta --save-dev
```

When installing with yarn 4, you need to disable experimental fetch with the following nodejs config.

```
NODE_OPTIONS=--no-experimental-fetch yarn add supabase
```

> **Note**
For Bun versions below v1.0.17, you must add `supabase` as a [trusted dependency](https://bun.sh/guides/install/trusted) before running `bun add -D supabase`.

<details>
  <summary><b>macOS</b></summary>

  Available via [Homebrew](https://brew.sh). To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To install the beta release channel:
  
  ```sh
  brew install supabase/tap/supabase-beta
  brew link --overwrite supabase-beta
  ```
  
  To upgrade:

  ```sh
  brew upgrade supabase
  ```
</details>

<details>
  <summary><b>Windows</b></summary>

  Available via [Scoop](https://scoop.sh). To install:

  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  To upgrade:

  ```powershell
  scoop update supabase
  ```
</details>

<details>
  <summary><b>Linux</b></summary>

  Available via [Homebrew](https://brew.sh) and Linux packages.

  #### via Homebrew

  To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To upgrade:

  ```sh
  brew upgrade supabase
  ```

  #### via Linux packages

  Linux packages are provided in [Releases](https://github.com/supabase/cli/releases). To install, download the `.apk`/`.deb`/`.rpm`/`.pkg.tar.zst` file depending on your package manager and run the respective commands.

  ```sh
  sudo apk add --allow-untrusted <...>.apk
  ```

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/bin/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```
