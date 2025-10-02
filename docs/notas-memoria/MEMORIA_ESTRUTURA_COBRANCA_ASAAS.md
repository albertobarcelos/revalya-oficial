# 🧠 MEMÓRIA PERSISTENTE - ESTRUTURA DE COBRANÇA ASAAS

**Data de Criação:** Janeiro 2025  
**Autor:** Barcelitos (AI Agent)  
**Status:** 🔴 ÁREA CRÍTICA - MEMÓRIA MASTER

---

## 📋 **REGISTRO DE DECISÕES ARQUITETURAIS**

### **1. Estrutura de Documentação Criada**
- ✅ **Arquivo Principal:** `ESTRUTURA_COBRANÇA_ASAAS.md`
- ✅ **Localização:** `/f:/NEXFINAN/revalya-oficial/Documentação do Projeto/INTEGRAÇÕES/INTEGRAÇÕES SISTEMAS/ASAAS/`
- ✅ **Tipo:** Documentação técnica completa (.md)
- ✅ **Escopo:** Arquitetura completa de cobrança ASAAS

### **2. Componentes Documentados**

#### **A. Mapeamento de Tabelas**
- `conciliation_staging` - Área de staging com constraints anti-duplicação
- `charges` - Tabela principal de cobranças processadas
- `customers` - Clientes sincronizados com ASAAS
- Constraints únicas por tenant para segurança multi-tenant

#### **B. Fluxos Implementados**
- **Push Flow:** ASAAS Webhooks → N8N → Staging → Reconciliação
- **Pull Flow:** Sistema → API ASAAS → Staging → Reconciliação
- **Validação:** HMAC SHA-256 para webhooks
- **Anti-Duplicação:** Constraints + UPSERT + verificação prévia

#### **C. Edge Functions**
- **Existentes:** `asaas-proxy`, `bulk-insert-helper`
- **Propostas:** `asaas-webhook-charges`, `asaas-reconciliation-processor`
- **Status:** Implementação em fases (Alta → Média → Baixa prioridade)

---

## 🔧 **REGRAS DE MANUTENÇÃO ESTABELECIDAS**

### **🔴 NUNCA ALTERAR (Crítico):**
1. Constraints de `tenant_id` - Segurança multi-tenant
2. Validação HMAC SHA-256 - Segurança webhooks  
3. Estrutura `id_externo` - Prevenção duplicação
4. Mapeamento status ASAAS → interno

### **🟡 ALTERAR COM CUIDADO:**
1. Estrutura de tabelas - Requer migração
2. Formato `raw_data` - Compatibilidade
3. Timeouts API - Performance
4. Rate limiting - Configurações

### **🟢 SEGURO ALTERAR:**
1. Logs e monitoramento
2. Mensagens de erro
3. Configurações UI
4. Documentação

---

## 📊 **MÉTRICAS DE MONITORAMENTO**

### **Webhooks:**
- Taxa de sucesso
- Tempo de processamento
- Erros de validação
- Volume por tenant

### **Importação:**
- Registros importados vs. duplicados
- Performance de consultas
- Erros de API
- Tempo por lote

### **Reconciliação:**
- Registros processados vs. erro
- Tempo médio
- Taxa criação customers
- Discrepâncias

---

## 🚀 **PLANO DE IMPLEMENTAÇÃO**

### **Fase 1 (ALTA PRIORIDADE):**
- Edge Function `asaas-webhook-charges`
- Validação HMAC SHA-256
- Constraints duplicação
- Testes webhook

### **Fase 2 (MÉDIA PRIORIDADE):**
- Edge Function `asaas-reconciliation-processor`
- Monitoramento e alertas
- Otimização consultas
- Documentação APIs

### **Fase 3 (BAIXA PRIORIDADE):**
- Retry automático
- Dashboard monitoramento
- Alertas proativos
- Métricas avançadas

---

## 📚 **ARQUIVOS DE REFERÊNCIA**

### **Código Principal:**
- `src/services/asaas.ts`
- `src/services/gatewayService.ts`
- `supabase/functions/asaas-proxy/index.ts`
- `src/n8n/workflows/`
- `src/types/asaas.ts`

### **Documentação:**
- `ESTRUTURA_COBRANÇA_ASAAS.md` (Principal)
- `MANUAL_INTEGRAÇÃO_ASAAS.md` (Existente)
- Esta memória persistente

---

## ⚠️ **ALERTAS E LEMBRETES**

### **Para Consultas Futuras:**
1. **SEMPRE** consultar `ESTRUTURA_COBRANÇA_ASAAS.md` antes de alterações
2. **VERIFICAR** constraints de segurança multi-tenant
3. **VALIDAR** impacto em anti-duplicação
4. **TESTAR** webhooks após mudanças
5. **ATUALIZAR** esta memória após modificações

### **Pontos de Atenção:**
- Sistema está em **ÁREA CRÍTICA**
- Documentação deve estar **SEMPRE ATUALIZADA**
- Mudanças requerem **VALIDAÇÃO COMPLETA**
- Multi-tenancy é **OBRIGATÓRIO**

---

## 🔄 **HISTÓRICO DE ATUALIZAÇÕES**

| Data | Alteração | Responsável | Status |
|------|-----------|-------------|---------|
| Jan 2025 | Criação documentação completa | Barcelitos | ✅ Concluído |
| Jan 2025 | Análise arquitetura atual | Barcelitos | ✅ Concluído |
| Jan 2025 | Mapeamento tabelas e fluxos | Barcelitos | ✅ Concluído |
| Jan 2025 | Estratégias anti-duplicação | Barcelitos | ✅ Concluído |
| Jan 2025 | Propostas Edge Functions | Barcelitos | ✅ Concluído |

---

**📝 NOTA FINAL:** Esta memória deve ser consultada e atualizada sempre que houver trabalho relacionado à estrutura de cobrança ASAAS. É o ponto central de referência para manutenção e evolução do sistema.

**🔗 Arquivo Principal:** `ESTRUTURA_COBRANÇA_ASAAS.md`  
**📍 Localização:** `/f:/NEXFINAN/revalya-oficial/Documentação do Projeto/INTEGRAÇÕES/INTEGRAÇÕES SISTEMAS/ASAAS/`