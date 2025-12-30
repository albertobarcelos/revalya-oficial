# Próximos Passos - Módulo Fiscal Revalya

**Data:** 2025-01-29  
**Baseado em:** `modulo_fiscal_focusnfe_0e660796.plan.md` + `PLANEJAMENTO_MODULO_FISCAL_V2.md`

---

## ✅ O que já foi implementado

### Banco de Dados
- ✅ Tabela `fiscal_invoices` criada e aplicada
- ✅ Colunas fiscais em `billing_period_items` adicionadas
- ✅ Campo `fiscal_config` em `contracts` adicionado
- ✅ Bucket `fiscal-documents` criado
- ✅ Triggers de automação (`auto_emit_nfe_on_billing`, `auto_emit_nfse_on_receipt`) criados

### Edge Functions
- ✅ `fiscal-engine` deployada
- ✅ `focusnfe` deployada
- ✅ `receipt-pdf` deployada

### Frontend - Componentes Fiscais
- ✅ `FiscalBadge.tsx` - Badge de status
- ✅ `FiscalActionsMenu.tsx` - Menu de ações
- ✅ `EmitNFeDialog.tsx` - Dialog para emitir NF-e
- ✅ `EmitNFSeDialog.tsx` - Dialog para emitir NFS-e
- ✅ `ContractFiscalSettings.tsx` - Configurações fiscais no contrato

### Frontend - Integrações
- ✅ `KanbanCard.tsx` (Faturamento) - Integrado com `FiscalBadge` e `FiscalActionsMenu`
- ✅ `ChargesList.tsx` (Cobranças) - Integrado com `FiscalBadge` e `FiscalActionsMenu`
- ✅ `ContractForm.tsx` - Aba "Fiscal" com `ContractFiscalSettings`

### Frontend - Portal do Contador
- ✅ `PortalContador.tsx` - Página criada
- ✅ Rota `/{slug}/portal-contador` adicionada
- ✅ Item no Sidebar adicionado
- ✅ Lista de notas com filtros básicos
- ✅ Ações de download (PDF/XML) e reenvio de email

### Serviços e Hooks
- ✅ `FiscalEngine.ts` - Wrapper do Edge Function
- ✅ `useFiscal.ts` - Hooks TanStack Query
- ✅ `receiptService.ts` - Serviço para recibo

---

## 🔲 O que ainda falta implementar

### Fase 1: Completar Portal do Contador (PRIORIDADE ALTA)

#### 1.1 Funcionalidades faltantes no Portal
- [ ] **Cancelamento de notas fiscais**
  - Botão "Cancelar" na lista
  - Dialog de confirmação com motivo
  - Integração com `fiscal-engine` para cancelar via FocusNFe
  - Atualizar status para `CANCELADA`

- [ ] **Filtros avançados**
  - Filtro por período (data início/fim)
  - Filtro por cliente
  - Filtro por valor (mínimo/máximo)
  - Filtro por chave de acesso
  - Salvar filtros favoritos

- [ ] **Busca aprimorada**
  - Busca por número da nota
  - Busca por chave de acesso
  - Busca por nome do cliente
  - Busca por CPF/CNPJ do cliente

- [ ] **Exportação de dados**
  - Exportar para Excel/CSV
  - Exportar para PDF (relatório)
  - Incluir todas as colunas da tabela
  - Opção de incluir apenas notas emitidas

- [ ] **Relatórios**
  - Relatório de notas emitidas (período)
  - Relatório de notas canceladas
  - Relatório por cliente
  - Gráficos de emissão (mensal/anual)

#### 1.2 Melhorias de UX
- [ ] **Visualização inline de PDF/XML**
  - Modal para visualizar PDF sem baixar
  - Visualizador de XML formatado
  - Preview do DANFE

- [ ] **Ações em lote**
  - Seleção múltipla de notas
  - Download em lote (ZIP)
  - Reenvio de email em lote
  - Exportação em lote

- [ ] **Paginação e performance**
  - Paginação server-side
  - Virtualização de lista (para muitos registros)
  - Cache de queries

---

### Fase 2: Completar Integrações nas Telas Existentes (PRIORIDADE MÉDIA)

#### 2.1 Tela de Recebimentos
- [ ] **Link para O.S**
  - Exibir número da NFS-e emitida
  - Link clicável que leva para a O.S relacionada
  - Badge de status fiscal

#### 2.2 Melhorias no Faturamento
- [ ] **Recibo automático**
  - Gerar PDF do recibo automaticamente ao faturar
  - Salvar no Storage (`fiscal-documents`)
  - Link para visualizar/baixar recibo
  - Componente `ReceiptViewer.tsx`

- [ ] **Indicadores visuais**
  - Card vermelho se houver erro fiscal
  - Tooltip com detalhes do erro
  - Notificação quando nota é emitida com sucesso

#### 2.3 Melhorias em Cobranças
- [ ] **Status visual aprimorado**
  - Badge mais informativo (valor emitido, saldo pendente)
  - Progress bar para NFS-e parcial
  - Indicador de múltiplas NFS-e para mesma cobrança

---

### Fase 3: Automação e Notificações (PRIORIDADE MÉDIA)

#### 3.1 Triggers de Automação (já criados, mas precisam ser testados)
- [ ] **Testar trigger de NF-e**
  - Verificar se cria `fiscal_invoices` quando `status = BILLED`
  - Verificar se respeita `fiscal_config.auto_emit_nfe`
  - Verificar se chama Edge Function corretamente

- [ ] **Testar trigger de NFS-e**
  - Verificar se cria `fiscal_invoices` quando `status LIKE 'RECEIVED%'`
  - Verificar se respeita `fiscal_config.auto_emit_nfse`
  - Verificar se respeita `nfse_emit_moment`

#### 3.2 Notificações
- [ ] **Notificações de erro**
  - Toast quando emissão falha
  - Email para administrador (opcional)
  - Log de erros em `fiscal_invoices.error_message`

- [ ] **Notificações de sucesso**
  - Toast quando nota é emitida
  - Email para cliente (se `auto_send_email = true`)
  - Atualização em tempo real na UI

#### 3.3 Webhook FocusNFe
- [ ] **Handler de webhook**
  - Edge Function para receber webhooks do FocusNFe
  - Atualizar status de `fiscal_invoices` automaticamente
  - Processar cancelamentos
  - Processar erros de validação

---

### Fase 4: Funcionalidades Avançadas (PRIORIDADE BAIXA)

#### 4.1 Recibo PDF
- [ ] **Geração completa do PDF**
  - Usar `react-pdf` ou `jspdf` no frontend
  - Layout estilo Omie
  - Incluir todos os dados do período
  - Opção de personalizar template

#### 4.2 Relatórios Avançados
- [ ] **Dashboard fiscal**
  - Métricas de emissão (hoje, mês, ano)
  - Gráfico de notas por tipo
  - Gráfico de notas por status
  - Top clientes por valor emitido

#### 4.3 Gestão de Erros
- [ ] **Retry automático**
  - Tentar reemitir automaticamente em caso de erro temporário
  - Configurar número máximo de tentativas
  - Log de tentativas em `metadata`

- [ ] **Diagnóstico de erros**
  - Página de diagnóstico de erros fiscais
  - Sugestões de correção
  - Link para documentação

---

## 🎯 Priorização Sugerida

### Sprint 1 (Imediato - 1-2 semanas)
1. ✅ **Cancelamento de notas** no Portal do Contador
2. ✅ **Filtros avançados** no Portal (período, cliente, valor)
3. ✅ **Exportação Excel/CSV** no Portal
4. ✅ **Testar triggers de automação** (NF-e e NFS-e)

### Sprint 2 (Curto prazo - 2-3 semanas)
1. ✅ **Recibo automático** ao faturar
2. ✅ **Visualização inline de PDF/XML** no Portal
3. ✅ **Notificações de erro e sucesso**
4. ✅ **Link para O.S** na tela de Recebimentos

### Sprint 3 (Médio prazo - 3-4 semanas)
1. ✅ **Webhook FocusNFe** para atualização automática
2. ✅ **Relatórios fiscais** (emissão, cancelamentos)
3. ✅ **Ações em lote** no Portal
4. ✅ **Dashboard fiscal** com métricas

---

## 📝 Observações Importantes

1. **Triggers já criados**: Os triggers de automação foram criados nas migrations, mas precisam ser testados em ambiente de desenvolvimento.

2. **Edge Functions deployadas**: Todas as Edge Functions necessárias estão deployadas e funcionais.

3. **Componentes fiscais prontos**: Os componentes `FiscalBadge` e `FiscalActionsMenu` já estão integrados nas telas de Faturamento e Cobranças.

4. **Portal do Contador básico**: O Portal está funcional, mas falta implementar funcionalidades avançadas (cancelamento, filtros, exportação).

5. **Configurações fiscais**: As configurações fiscais já estão no formulário de contratos, mas precisam ser testadas com os triggers.

---

## 🚀 Próximo Passo Imediato

**Recomendação:** Começar pela **Sprint 1**, priorizando:

1. **Cancelamento de notas** - Funcionalidade crítica que está faltando
2. **Testar triggers** - Garantir que a automação está funcionando
3. **Filtros avançados** - Melhorar UX do Portal do Contador

Posso começar implementando qualquer uma dessas funcionalidades. Qual você prefere que eu priorize?

