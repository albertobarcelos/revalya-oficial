# 🤖 GUIA COMPLETO DO AGENTE DE IA - SISTEMA REVALYA

## 📋 VISÃO GERAL

Este é o guia completo para o agente de IA desenvolver no sistema Revalya. Todos os documentos necessários foram criados e estão organizados aqui para facilitar o desenvolvimento eficiente e seguro.

## 📚 DOCUMENTOS DISPONÍVEIS

### 1. 📄 **PRD - Product Requirements Document**
**Arquivo**: `PRD_REVALYA_SISTEMA_COMPLETO.md`

**Conteúdo**:
- Objetivos de negócio e stakeholders
- Arquitetura técnica completa
- Funcionalidades principais
- Requisitos funcionais e não-funcionais
- Roadmap 2025
- Métricas e KPIs

**Quando usar**: Sempre consulte antes de iniciar qualquer desenvolvimento para entender o contexto completo do sistema.

---

### 2. 🎯 **Prompt Otimizado para IA**
**Arquivo**: `PROMPT_AI_AGENT_REVALYA_OTIMIZADO.md`

**Conteúdo**:
- Contexto específico do sistema Revalya
- Padrões de desenvolvimento obrigatórios
- Estrutura de componentes e nomenclatura
- Diretrizes de implementação (DOs e DON'Ts)
- Workflow de desenvolvimento recomendado
- Checklist de qualidade

**Quando usar**: Este é o prompt principal que deve ser usado para configurar qualquer agente de IA que vá trabalhar no projeto.

---

### 3. 🔒 **Diretrizes de Segurança Multi-Tenant**
**Arquivo**: `SECURITY_GUIDELINES_AI_DEVELOPMENT.md`

**Conteúdo**:
- Arquitetura de segurança de 5 camadas
- Regras críticas de isolamento de tenant
- Validação de contexto obrigatória
- Protocolos de autenticação e autorização
- Prevenção de vulnerabilidades (SQL Injection, XSS, CSRF)
- Auditoria e monitoramento
- Checklist de segurança obrigatório

**Quando usar**: SEMPRE antes de implementar qualquer funcionalidade que envolva dados, autenticação ou operações multi-tenant.

---

### 4. 🧪 **Protocolos de Teste e Validação**
**Arquivo**: `TESTING_PROTOCOLS_AI_DEVELOPMENT.md`

**Conteúdo**:
- Validações pré-implementação
- Templates de teste para componentes, hooks e serviços
- Testes de segurança obrigatórios
- Testes de performance e integração
- Checklist de validação pré-deploy
- Configuração de alertas automáticos
- Métricas de qualidade (KPIs)

**Quando usar**: Durante e após o desenvolvimento de qualquer funcionalidade para garantir qualidade e conformidade.

---

## 🚀 COMO USAR ESTE GUIA

### Para Configurar um Agente de IA:

1. **Leia o PRD completo** para entender o contexto
2. **Use o prompt otimizado** como base de configuração
3. **Implemente as diretrizes de segurança** como regras rígidas
4. **Siga os protocolos de teste** para validação

### Para Desenvolvimento Específico:

#### 🎨 **Frontend (React/TypeScript)**
```
Consulte:
- Prompt otimizado → Padrões de componentes
- Diretrizes de segurança → Validação de contexto
- Protocolos de teste → Templates de teste React
```

#### 🔧 **Backend (Supabase/Edge Functions)**
```
Consulte:
- PRD → Arquitetura de dados
- Diretrizes de segurança → RLS e isolamento
- Protocolos de teste → Testes de API e segurança
```

#### 🔐 **Funcionalidades de Segurança**
```
Consulte:
- Diretrizes de segurança → Arquitetura 5 camadas
- Protocolos de teste → Testes de isolamento
- PRD → Requisitos de conformidade
```

#### 📊 **Integrações (ASAAS, WhatsApp)**
```
Consulte:
- PRD → Especificações de integração
- Diretrizes de segurança → Validação de dados externos
- Protocolos de teste → Testes de integração
```

---

## ⚡ QUICK START PARA IA

### Configuração Rápida:
```markdown
1. Carregue o prompt: PROMPT_AI_AGENT_REVALYA_OTIMIZADO.md
2. Defina regras rígidas: SECURITY_GUIDELINES_AI_DEVELOPMENT.md
3. Configure validação: TESTING_PROTOCOLS_AI_DEVELOPMENT.md
4. Contextualize com: PRD_REVALYA_SISTEMA_COMPLETO.md
```

### Comandos Essenciais:
```bash
# Verificar estrutura do projeto
npm run dev

# Executar testes
npm run test

# Verificar tipos TypeScript
npm run type-check

# Executar diagnóstico Supabase
node diagnostico-supabase.cjs
```

---

## 🎯 PONTOS CRÍTICOS DE ATENÇÃO

### ❌ **NUNCA ALTERE SEM PERMISSÃO:**
- `supabase/migrations/` - Migrações de banco
- `src/hooks/templates/` - Templates de hooks
- Configurações de segurança RLS
- Estrutura de multi-tenancy

### ✅ **SEMPRE VALIDE:**
- Contexto de tenant ativo
- Permissões do usuário
- Tipos TypeScript
- Políticas RLS
- Isolamento de dados

### 🔍 **CONSULTE ANTES DE ALTERAR:**
- Schema do banco de dados
- Configurações de segurança
- Integrações externas (ASAAS, WhatsApp)
- Estrutura de autenticação

---

## 📈 MÉTRICAS DE SUCESSO

### Qualidade de Código:
- ✅ Cobertura de testes > 80%
- ✅ TypeScript sem erros
- ✅ ESLint sem warnings
- ✅ Performance < 2s carregamento

### Segurança:
- ✅ Isolamento de tenant 100%
- ✅ Validação de contexto em todas operações
- ✅ RLS policies ativas
- ✅ Inputs sanitizados

### Funcionalidade:
- ✅ Todos casos de uso testados
- ✅ Tratamento de erros implementado
- ✅ Logs de auditoria funcionando
- ✅ Integrações testadas

---

## 🆘 SUPORTE E RECURSOS

### Arquivos de Configuração Importantes:
- `src/lib/config.ts` - Configurações gerais
- `src/contexts/TenantContext.tsx` - Contexto multi-tenant
- `src/hooks/useAuth.ts` - Autenticação
- `supabase/config.toml` - Configuração Supabase

### Scripts Úteis:
- `diagnostico-supabase.cjs` - Diagnóstico do banco
- `aplicar-correcoes-supabase.cjs` - Correções automáticas

### Documentação Específica:
- `ESTRUTURA_COBRANÇA_ASAAS.md` - Integração ASAAS
- `SISTEMA_CANAIS_WHATSAPP_DOCUMENTACAO_COMPLETA.md` - WhatsApp

---

## 🎉 CONCLUSÃO

Este guia completo fornece tudo que um agente de IA precisa para desenvolver no sistema Revalya de forma:

- **Segura**: Seguindo a arquitetura multi-tenant de 5 camadas
- **Eficiente**: Com padrões e templates pré-definidos
- **Qualificada**: Com protocolos de teste rigorosos
- **Contextualizada**: Com conhecimento completo do sistema

**Lembre-se**: A segurança multi-tenant é não-negociável no Revalya. Sempre valide o contexto de tenant e siga as diretrizes de segurança!