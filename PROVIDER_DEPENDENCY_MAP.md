# 📊 FASE 1: Mapeamento Completo de Dependências dos Providers

## 🔍 **Análise Crítica dos Providers Duplicados**

### 📋 **1. TenantProvider - Duplicação Identificada**

#### **🎯 Provider Principal (CORE)**
- **Arquivo**: `src/core/tenant/TenantProvider.tsx`
- **Tipo**: Context API + TenantService completo
- **Usado em**: `src/App.tsx` (provider raiz)
- **Dependências diretas**: 6 arquivos

**Arquivos que dependem do CORE TenantProvider:**
```typescript
// Imports diretos do core/tenant/TenantProvider
src/hooks/useFinanceEntries.ts
src/features/tenant/hooks/useTenantQuery.ts  
src/core/tenant/useTenantData.ts
src/features/customers/components/CustomerList.tsx
src/components/contracts/AddServiceDialog.tsx
src/App.tsx (provider wrapper)
```

#### **⚠️ Provider Duplicado (FEATURES)**
- **Arquivo**: `src/features/tenant/store/TenantProvider.tsx`
- **Tipo**: Hook simples + useSimpleTenantManager
- **Usado em**: `src/app/layout.tsx` (Next.js layout)
- **Dependências diretas**: 2 arquivos

**Arquivos que dependem do FEATURES TenantProvider:**
```typescript
// Imports do features/tenant
src/app/layout.tsx (Next.js layout)
src/features/tenant/index.ts (re-export)
```

### 📋 **2. SupabaseProvider - Instância Múltipla**

#### **🎯 Provider Principal**
- **Arquivo**: `src/contexts/SupabaseProvider.tsx`
- **Singleton**: Implementado mas não respeitado
- **Warning detectado**: "Múltiplas instâncias detectadas"
- **Dependências diretas**: 56+ arquivos

**Categorias de uso do SupabaseProvider:**
```typescript
// 1. Páginas principais (25 arquivos)
src/pages/portal-selection.tsx
src/pages/login/index.tsx
src/pages/admin/*/
src/pages/tenant/*/

// 2. Hooks de dados (15 arquivos)  
src/hooks/useSupabaseAuth.tsx
src/hooks/useZustandTenant.ts
src/hooks/useLoginHandler.ts
src/hooks/usePortalManager.ts
// ... outros hooks

// 3. Componentes (16+ arquivos)
src/components/admin/*/
src/components/auth/*/
src/components/users/*/
// ... outros componentes
```

### 📋 **3. Hooks de Tenant - Fragmentação**

#### **🎯 useZustandTenant (Zustand Store)**
- **Arquivo**: `src/hooks/useZustandTenant.ts`
- **Função**: Store Zustand para estado de tenant
- **Dependências**: 5 arquivos

**Arquivos que usam useZustandTenant:**
```typescript
src/hooks/templates/useSecureTenantQuery.ts
src/hooks/useTenantAccessGuard.ts  
src/pages/portal-selection.tsx
src/components/examples/ZustandExample.tsx
src/hooks/useZustandTenant.ts (próprio arquivo)
```

#### **🎯 useTenantAccessGuard (Validação de Segurança)**
- **Arquivo**: `src/hooks/templates/useSecureTenantQuery.ts`
- **Função**: Validação de acesso e segurança
- **Dependências**: 10+ arquivos críticos

**Arquivos que usam useTenantAccessGuard:**
```typescript
src/pages/Dashboard.tsx
src/pages/portal-selection.tsx
src/pages/Recebimentos.tsx
src/pages/RequestUpdate.tsx
src/components/ui/searchable-select.tsx
// ... outros arquivos migrados
```

## 🚨 **Conflitos Críticos Identificados**

### **1. Duplicação de Context**
```typescript
// CONFLITO: Dois providers diferentes no mesmo app
// App.tsx usa: @/core/tenant/TenantProvider  
// layout.tsx usa: @/features/tenant (que re-exporta core)
```

### **2. SupabaseProvider Múltiplo**
```typescript
// WARNING DETECTADO:
console.warn('[SupabaseProvider] Múltiplas instâncias detectadas');
// Causa: Singleton não respeitado em 56+ arquivos
```

### **3. Inconsistência de Estado**
```typescript
// RISCO: Diferentes stores para mesmo tenant
useTenant() // Context API (core)
useZustandTenant() // Zustand Store  
useTenantAccessGuard() // Validação híbrida
```

## 📊 **Matriz de Dependências**

| Provider/Hook | Arquivos Dependentes | Tipo | Criticidade |
|---------------|---------------------|------|-------------|
| **TenantProvider (core)** | 6 arquivos | Context API | 🔴 ALTA |
| **TenantProvider (features)** | 2 arquivos | Hook simples | 🟡 MÉDIA |
| **SupabaseProvider** | 56+ arquivos | Singleton quebrado | 🔴 CRÍTICA |
| **useZustandTenant** | 5 arquivos | Zustand Store | 🟡 MÉDIA |
| **useTenantAccessGuard** | 10+ arquivos | Validação | 🔴 ALTA |

## 🎯 **Plano de Consolidação Baseado no Mapeamento**

### **Prioridade 1: SupabaseProvider Singleton**
- **Problema**: 56+ arquivos com instâncias múltiplas
- **Solução**: Implementar singleton robusto
- **Impacto**: Performance e consistência

### **Prioridade 2: TenantProvider Unificado**
- **Problema**: 2 implementações diferentes
- **Solução**: Provider híbrido compatível
- **Impacto**: Estado consistente

### **Prioridade 3: Hooks de Tenant Consolidados**
- **Problema**: Fragmentação de acesso
- **Solução**: API unificada
- **Impacto**: Manutenibilidade

## 📋 **Arquivos Críticos para Migração**

### **Não podem ser quebrados durante migração:**
```typescript
// Páginas principais do sistema
src/pages/Dashboard.tsx
src/pages/portal-selection.tsx  
src/pages/Recebimentos.tsx

// Hooks de segurança críticos
src/hooks/templates/useSecureTenantQuery.ts
src/hooks/useTenantAccessGuard.ts

// Providers raiz
src/App.tsx
src/app/layout.tsx
```

### **Podem ser migrados gradualmente:**
```typescript
// Componentes específicos
src/components/contracts/AddServiceDialog.tsx
src/features/customers/components/CustomerList.tsx

// Hooks auxiliares
src/hooks/useFinanceEntries.ts
src/core/tenant/useTenantData.ts
```

## ✅ **Conclusões da FASE 1**

1. **Duplicação confirmada**: 2 TenantProviders com APIs diferentes
2. **SupabaseProvider crítico**: 56+ dependências com singleton quebrado  
3. **Fragmentação de hooks**: 3 diferentes formas de acessar tenant
4. **Risco de estado inconsistente**: Múltiplos stores para mesmos dados
5. **Migração gradual possível**: Arquivos podem ser migrados em etapas

**Status**: ✅ FASE 1 CONCLUÍDA - Mapeamento completo realizado
**Status**: ✅ FASE 2 CONCLUÍDA - Provider unificado criado

## 🎯 **FASE 2 IMPLEMENTADA: Provider Unificado**

### **📁 Arquivos Criados:**

#### **1. UnifiedTenantProvider.tsx**
- **Localização**: `src/core/tenant/UnifiedTenantProvider.tsx`
- **Função**: Provider híbrido que consolida todas as implementações
- **Características**:
  - ✅ Compatibilidade com Core TenantProvider (Context API)
  - ✅ Compatibilidade com Features TenantProvider (Hook simples)
  - ✅ Integração com Zustand Store
  - ✅ Hooks de compatibilidade: `useTenant()`, `useTenantFeatures()`
  - ✅ Sincronização automática entre sistemas
  - ✅ Logs detalhados para debugging

#### **2. types.ts**
- **Localização**: `src/core/tenant/types.ts`
- **Função**: Tipos unificados e configurações de migração
- **Características**:
  - ✅ Configurações para diferentes fases (`MIGRATION_CONFIGS`)
  - ✅ Estado de migração (`MigrationState`)
  - ✅ Métricas de performance (`ProviderMetrics`)

#### **3. migration-utils.ts**
- **Localização**: `src/core/tenant/migration-utils.ts`
- **Função**: Utilitários para migração gradual
- **Características**:
  - ✅ `TenantMigrationManager` singleton
  - ✅ Tracking de arquivos migrados
  - ✅ Verificações de compatibilidade
  - ✅ Métricas de performance
  - ✅ Relatórios de migração

#### **4. index.ts**
- **Localização**: `src/core/tenant/index.ts`
- **Função**: Exportações unificadas
- **Características**:
  - ✅ API limpa para importação
  - ✅ Configuração padrão FASE 2
  - ✅ Hook `useTenantMigration()`

### **🔧 Funcionalidades do Provider Unificado:**

```typescript
// Uso básico - compatível com todas as APIs existentes
import { UnifiedTenantProvider, useTenant } from '@/core/tenant';

// Provider com configuração híbrida (FASE 2)
<UnifiedTenantProvider 
  useCore={true} 
  useFeatures={true} 
  useZustand={true}
>
  {children}
</UnifiedTenantProvider>

// Hook compatível com Core API
const { tenant, switchTenant } = useTenant();

// Hook compatível com Features API  
const { context, userTenants } = useTenantFeatures();

// Hook unificado com todas as funcionalidades
const { 
  tenant, 
  availableTenants, 
  refreshTenantData 
} = useUnifiedTenant();
```

### **🛡️ Recursos de Segurança Mantidos:**
- ✅ Validação de tenant ativo
- ✅ Isolamento por aba (sessionStorage)
- ✅ Logs de auditoria
- ✅ Sincronização entre sistemas
- ✅ Fallback para sistemas legados

**Próximo passo**: Iniciar FASE 3 - Migração gradual dos arquivos críticos
