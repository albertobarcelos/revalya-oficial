# Planejamento Módulo Fiscal V2 - Revalya

## 🎯 Visão Geral

**Mudança de Arquitetura:**
- ❌ Remover página "Fiscal" dedicada
- ✅ Emitir notas diretamente de: Faturamento, Cobranças, Recebimentos
- ✅ Criar "Portal do Contador" para centralização e gestão de notas
- ✅ Recibo automático (PDF) ao faturar

---

## ✅ Regras de Negócio Finais

### NF-e (Produto)

| Regra | Definição |
|-------|-----------|
| **Quando emitir** | Pode faturar sem emitir, e emitir depois (flexível) |
| **Automação** | Configurável por contrato + pode sobrescrever na O.S |
| **Falha na emissão** | Card fica vermelho, fluxo continua, usuário resolve manualmente |

### NFS-e (Serviço)

| Regra | Definição |
|-------|-----------|
| **Quando emitir** | No faturamento OU no recebimento (configurável) |
| **Valor no faturamento** | Valor TOTAL |
| **Valor no recebimento** | Proporcional ao valor recebido |
| **Automação** | Configurável por contrato |
| **Múltiplas parcelas** | Configurável: emitir por parcela OU acumular até completar |
| **Sem cobrança** | Pode emitir NFS-e mesmo sem gerar cobrança/financeiro |

### Recibo (antes da NF-e)

| Regra | Definição |
|-------|-----------|
| **Formato** | PDF gerado pelo sistema |
| **Conteúdo** | Todos os dados (como um orçamento) - Cliente, produtos, valores, data |
| **Ação** | Automático ao faturar |
| **Modelo** | Referência: Omie |

### Configurações (por Contrato)

| Configuração | Tipo | Descrição |
|--------------|------|-----------|
| `auto_emit_nfe` | boolean | Emitir NF-e automaticamente ao faturar |
| `auto_emit_nfse` | boolean | Emitir NFS-e automaticamente |
| `nfse_emit_moment` | enum | Quando emitir: `faturamento` ou `recebimento` |
| `nfse_valor_mode` | enum | Valor: `proporcional` ou `total` |
| `nfse_parcelas_mode` | enum | Múltiplas parcelas: `por_recebimento` ou `acumulado` |
| `auto_send_email` | boolean | Enviar email automaticamente após emissão |

**Observação:** Configurações podem ser alteradas a qualquer momento.

### Interface de Emissão

| Tela | Comportamento |
|------|---------------|
| **Faturamento** | Badge visual (Pendente/Emitida/Erro) + Menu ações "⋮" → "Emitir Nota Fiscal" |
| **Cobranças** | Badge visual + Ao selecionar: Botão "Ações" → "Emitir NFS-e" |
| **Recebimentos** | Número da NFS-e com link para a O.S |

### Portal do Contador

| Funcionalidade | Incluído |
|----------------|----------|
| Lista de notas (NF-e e NFS-e) | ✅ |
| Filtros (período, cliente, tipo, status) | ✅ |
| Busca (chave, número, cliente) | ✅ |
| Baixar XML | ✅ |
| Baixar PDF/DANFE | ✅ |
| Cancelar nota | ✅ |
| Reenviar por email | ✅ |
| Relatório de notas emitidas | ✅ |
| Relatório de notas canceladas | ✅ |
| Exportar Excel/CSV | ✅ |
| **Emitir notas** | ❌ (apenas visualizar) |

### Erros e Cancelamentos

| Situação | Comportamento |
|----------|---------------|
| **Emissão falha** | Badge de erro + Notificação. Usuário tenta manualmente. |
| **Cancelar faturamento** | Bloquear se NF-e emitida. Precisa cancelar a nota primeiro. |
| **Cancelar cobrança** | Bloquear se NFS-e emitida. Precisa cancelar a nota primeiro. |
| **Estorno de recebimento** | Apenas avisar que houve estorno (não cancela nota). |

### Permissões e Acessos

| Recurso | Acesso |
|---------|--------|
| Emitir notas | Configurável por tenant (roles específicas) |
| Portal do Contador | Qualquer usuário do tenant |

### Armazenamento

| Dado | Local |
|------|-------|
| XML, PDF/DANFE | Supabase Storage |
| Metadados | Tabela `fiscal_invoices` |
| Histórico | Data/hora, usuário, tentativas, alterações |

---

## 📊 Fluxo Final

```
CONTRATO (com configurações fiscais)
  │
  ├─ auto_emit_nfe: boolean
  ├─ auto_emit_nfse: boolean
  ├─ nfse_emit_moment: 'faturamento' | 'recebimento'
  ├─ nfse_valor_mode: 'proporcional' | 'total'
  ├─ nfse_parcelas_mode: 'por_recebimento' | 'acumulado'
  └─ auto_send_email: boolean
  
  ↓
  
ORDEM DE FATURAMENTO (O.S)
  │
  ├─ Gera RECIBO (PDF automático, estilo Omie)
  ├─ Pode sobrescrever config do contrato (por O.S)
  │
  ├─→ [PRODUTO]
  │     │
  │     ├─ Se auto_emit_nfe = true → Emite NF-e automaticamente
  │     └─ Se auto_emit_nfe = false → Badge "Pendente", Menu ⋮ → "Emitir NF-e"
  │
  └─→ [SERVIÇO]
        │
        ├─ Se nfse_emit_moment = 'faturamento'
        │     └─ Emite NFS-e valor TOTAL
        │
        └─ Se nfse_emit_moment = 'recebimento'
              │
              └─→ COBRANÇA → RECEBIMENTO
                    │
                    ├─ Se nfse_parcelas_mode = 'por_recebimento'
                    │     └─ Emite NFS-e do valor recebido (cada parcela)
                    │
                    └─ Se nfse_parcelas_mode = 'acumulado'
                          └─ Aguarda completar e emite NFS-e total
```

---

## 🏗️ Plano de Implementação Técnico

### Fase 1: Banco de Dados e Infraestrutura
| Tarefa | Status |
|--------|--------|
| Tabela `fiscal_invoices` | ✅ Feito |
| Colunas fiscais em `billing_period_items` | ✅ Feito |
| Edge Function `fiscal-engine` | ✅ Feito |
| Tipos TypeScript `fiscal.ts` | ✅ Feito |
| Campos de config fiscal em `contracts` | 🔲 A fazer |
| Bucket Supabase Storage para notas | 🔲 A fazer |
| Gerador de Recibo (PDF) | 🔲 A fazer |

### Fase 2: Integração nas Telas Existentes
| Tarefa | Status |
|--------|--------|
| Remover página `Fiscal.tsx` | 🔲 A fazer |
| Remover rota `/fiscal` | 🔲 A fazer |
| Faturamento: Badge + Menu ações | 🔲 A fazer |
| Cobranças: Botão "Ações" ao selecionar | 🔲 A fazer |
| Recebimentos: Link para O.S | 🔲 A fazer |
| Configurações fiscais no formulário de Contrato | 🔲 A fazer |

### Fase 3: Portal do Contador
| Tarefa | Status |
|--------|--------|
| Nova rota `/{slug}/portal-contador` | 🔲 A fazer |
| Componente `PortalContador.tsx` | 🔲 A fazer |
| Lista com filtros e busca | 🔲 A fazer |
| Ações: download, cancelar, reenviar | 🔲 A fazer |
| Relatórios e exportação | 🔲 A fazer |
| Item no menu Sidebar | 🔲 A fazer |

### Fase 4: Automação
| Tarefa | Status |
|--------|--------|
| Trigger no faturamento (auto NF-e + Recibo) | 🔲 A fazer |
| Trigger no recebimento (auto NFS-e) | 🔲 A fazer |
| Notificações de erro | 🔲 A fazer |
| Envio automático de email | 🔲 A fazer |

---

## 📁 Arquivos a Criar/Modificar

### Banco de Dados
```
supabase/migrations/
├── XXXXXX_add_fiscal_config_to_contracts.sql    # Campos de config
└── XXXXXX_create_fiscal_storage_bucket.sql      # Storage para notas
```

### Frontend
```
src/
├── pages/
│   ├── Fiscal.tsx                    # REMOVER
│   └── PortalContador.tsx            # CRIAR
│
├── components/
│   ├── fiscal/
│   │   ├── FiscalBadge.tsx           # Badge de status (Pendente/Emitida/Erro)
│   │   ├── FiscalActionsMenu.tsx     # Menu ⋮ com opções fiscais
│   │   ├── EmitNFeDialog.tsx         # Modal para emitir NF-e
│   │   ├── EmitNFSeDialog.tsx        # Modal para emitir NFS-e
│   │   └── ReceiptViewer.tsx         # Visualizar/baixar recibo
│   │
│   └── portal-contador/
│       ├── NotasFiscaisList.tsx      # Lista com filtros
│       ├── NotasFiscaisFilters.tsx   # Filtros
│       ├── NotasFiscaisActions.tsx   # Ações em lote
│       └── NotasFiscaisExport.tsx    # Exportação
│
├── services/
│   └── receiptService.ts             # Gerador de recibo PDF
│
└── hooks/
    └── useFiscal.ts                  # ✅ Já existe (atualizar)
```

---

## 🎯 Priorização Sugerida

### Sprint 1: MVP Essencial
1. Campos de config fiscal em contratos
2. Gerador de Recibo (PDF automático)
3. Badge fiscal nas telas existentes
4. Menu ações com "Emitir NF-e" / "Emitir NFS-e"

### Sprint 2: Portal do Contador
1. Rota e página do Portal
2. Lista de notas com filtros
3. Download XML/PDF
4. Cancelamento de notas

### Sprint 3: Automação e Relatórios
1. Emissão automática (NF-e e NFS-e)
2. Notificações de erro
3. Relatórios e exportação
4. Envio de email

---

**Data:** 2025-01-29
**Versão:** 2.2 (Final)
**Status:** ✅ Pronto para implementação
