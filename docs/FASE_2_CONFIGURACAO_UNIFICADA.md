# 📋 FASE 2: Configuração do Provider Unificado

## 🎯 Objetivo da FASE 2

Implementar o `UnifiedTenantProvider` que consolida todas as implementações de tenant existentes, mantendo compatibilidade total durante a migração gradual.

## ✅ Status Atual

- ✅ **UnifiedTenantProvider criado** (`src/core/tenant/UnifiedTenantProvider.tsx`)
- ✅ **Hook useSimpleTenantManager implementado** (`src/features/tenant/store/tenantManager.ts`)
- ✅ **APIs de compatibilidade criadas** (`useTenant`, `useTenantFeatures`, `useUnifiedTenant`)
- ✅ **Sistema de migração implementado** (`src/core/tenant/migration-utils.ts`)
- ✅ **Arquivo de teste criado** (`test-unified-provider.tsx`)

## 🔧 Configuração FASE 2

### **1. Estrutura do Provider Unificado**

```typescript
<UnifiedTenantProvider
  useCore={true}        // Habilita Core TenantProvider
  useFeatures={true}    // Habilita Features TenantProvider  
  useZustand={true}     // Habilita integração Zustand
  onTenantChange={(tenant) => {
    console.log('Tenant alterado:', tenant);
  }}
>
  {/* Sua aplicação */}
</UnifiedTenantProvider>
```

### **2. APIs Disponíveis**

#### **API Core (Compatibilidade)**
```typescript
const { currentTenant, switchTenant, initialized } = useTenant();
```

#### **API Features (Compatibilidade)**
```typescript
const { currentTenant, switchTenant } = useTenantFeatures();
```

#### **API Unificada (Nova)**
```typescript
const { 
  currentTenant, 
  switchTenant, 
  switchTenantBySlug,
  clearCurrentTenant,
  refreshTenantData,
  initialized
} = useUnifiedTenant();
```

### **3. Configurações de Migração**

#### **Configuração Conservadora (Padrão)**
```typescript
const migrationConfig: TenantMigrationConfig = {
  phase: 2,
  enableUnifiedProvider: true,
  enableCoreProvider: true,
  enableFeaturesProvider: true,
  enableZustandIntegration: true,
  performanceMetrics: true,
  debugMode: true
};
```

#### **Configuração Agressiva**
```typescript
const migrationConfig: TenantMigrationConfig = {
  phase: 2,
  enableUnifiedProvider: true,
  enableCoreProvider: false,     // Desabilita Core
  enableFeaturesProvider: false, // Desabilita Features
  enableZustandIntegration: true,
  performanceMetrics: true,
  debugMode: false
};
```

## 🚀 Plano de Migração Gradual

### **Etapa 1: Implementação Híbrida (Atual)**
- ✅ UnifiedTenantProvider rodando em paralelo
- ✅ Providers originais mantidos
- ✅ APIs de compatibilidade funcionando
- ✅ Logs e métricas ativas

### **Etapa 2: Migração Seletiva (Próxima)**
- 🔄 Migrar componentes críticos para `useUnifiedTenant`
- 🔄 Testar isoladamente cada migração
- 🔄 Validar performance e funcionalidade

### **Etapa 3: Consolidação**
- ⏳ Desabilitar providers legados gradualmente
- ⏳ Remover código duplicado
- ⏳ Otimizar performance final

## 📊 Monitoramento e Métricas

### **Logs Disponíveis**
```typescript
// Inicialização
[UnifiedTenantProvider] Inicializando provider unificado

// Troca de tenant
[UnifiedTenantProvider] Trocando tenant: { tenantId: "abc123" }

// Sincronização
[UnifiedTenantProvider] Sincronizando estado entre sistemas
```

### **Métricas de Performance**
- Tempo de inicialização do provider
- Tempo de troca de tenant
- Uso de memória dos caches
- Número de re-renders

## 🔍 Testes e Validação

### **Arquivo de Teste**
Execute o componente `TestUnifiedTenantProvider` para validar:
- ✅ Renderização do provider
- ✅ Funcionamento das 3 APIs
- ✅ Sincronização entre sistemas
- ✅ Eventos de mudança de tenant

### **Comandos de Teste**
```bash
# Verificar compilação
npm run type-check

# Executar testes
npm run test

# Verificar lint
npm run lint
```

## 🛠️ Troubleshooting

### **Problemas Comuns**

#### **1. "useSimpleTenantManager não encontrado"**
**Solução:** Verificar se o hook foi exportado em `tenantManager.ts`
```typescript
export function useSimpleTenantManager() {
  return simpleTenantManager;
}
```

#### **2. "Provider deve ser usado dentro de UnifiedTenantProvider"**
**Solução:** Garantir que componentes estão dentro do provider
```typescript
<UnifiedTenantProvider>
  <MeuComponente /> {/* ✅ Correto */}
</UnifiedTenantProvider>
```

#### **3. "Estado inconsistente entre providers"**
**Solução:** Verificar sincronização nos logs e ajustar configuração

## 📋 Checklist de Validação FASE 2

- [x] UnifiedTenantProvider compila sem erros
- [x] Hook useSimpleTenantManager exportado
- [x] APIs de compatibilidade funcionando
- [x] Sistema de logs implementado
- [x] Arquivo de teste criado
- [ ] Testes executados com sucesso
- [ ] Performance validada
- [ ] Documentação completa

## 🎯 Próximos Passos

1. **FASE 3:** Migrar componentes críticos para API unificada
2. **FASE 4:** Implementar SupabaseProvider singleton
3. **FASE 5:** Remover providers duplicados

---

**Data:** 2025-01-10  
**Status:** FASE 2 Implementada ✅  
**Próxima Fase:** Migração Gradual (FASE 3)
