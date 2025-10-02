# 🐛 Bug: Campo "Bairro" Mostra "Sem dados" na Importação Asaas

**Data:** 25/01/2025  
**Status:** ✅ RESOLVIDO  
**Prioridade:** CRÍTICA  

## 📋 Resumo do Problema

O campo "Bairro" aparecia como "Sem dados" durante o mapeamento de importação de clientes do Asaas, mesmo quando a API retornava dados válidos no campo `province`.

## 🔍 Diagnóstico

### Sintomas Observados
- Campo "Bairro" sempre exibia "Sem dados" no FieldMappingStep
- API Asaas retornava corretamente: `province: "Morado dos ipes"`
- Logs mostravam `province: undefined` no useImportWizard.ts

### Fluxo de Dados Identificado
```
AsaasService ✅ → ImportModal ❌ → useImportWizard → FieldMappingStep
```

### Causa Raiz
O campo `province` não estava sendo incluído na formatação dos dados no **ImportModal.tsx** (linha ~99).

## 🛠️ Solução Aplicada

### Arquivo Alterado
`src/components/clients/ImportModal.tsx`

### Mudança Específica
```typescript
// ANTES
neighborhood: customer.neighborhood || '',
city: customer.cityName || customer.city || '',

// DEPOIS  
neighborhood: customer.neighborhood || '',
province: customer.province || '', // AIDEV-NOTE: Campo province (bairro) do Asaas
city: customer.cityName || customer.city || '',
```

### Linha Exata
**Linha 100:** Adicionado `province: customer.province || '',`

## 🧪 Como Testar a Correção

1. **Abrir importação Asaas** → Menu Clientes > Importar > Asaas
2. **Verificar mapeamento** → Campo "Bairro" deve mostrar dados reais
3. **Confirmar dados** → Verificar se `province` aparece nas opções de mapeamento

## 🔧 Como Diagnosticar Problemas Similares

### 1. Verificar Logs da API
```bash
# Procurar por logs do AsaasService
grep "province" logs/debug.log
```

### 2. Verificar Formatação no ImportModal
```typescript
// Verificar se todos os campos da API estão sendo incluídos
const formattedData = customers.map(customer => ({
  // ... outros campos
  province: customer.province || '', // ← VERIFICAR SE EXISTE
}));
```

### 3. Verificar Processamento no useImportWizard
```typescript
// Verificar se o campo está sendo mapeado corretamente
province: item.province || '', // ← VERIFICAR MAPEAMENTO
```

### 4. Verificar getSampleData no FieldMappingStep
```typescript
// Adicionar logs temporários para debug
console.log('🔍 [DEBUG] Campo:', sourceFieldName, 'Valor:', value);
```

## 📝 Padrão de Resolução

### Para Campos Ausentes no Mapeamento:
1. **Verificar API** → Campo existe na resposta?
2. **Verificar ImportModal** → Campo incluído na formatação?
3. **Verificar useImportWizard** → Campo mapeado corretamente?
4. **Verificar FieldMappingStep** → Campo processado na exibição?

### Arquivos Críticos:
- `src/components/clients/ImportModal.tsx` (formatação inicial)
- `src/hooks/useImportWizard.ts` (processamento)
- `src/components/clients/import/FieldMappingStep.tsx` (exibição)

## ⚠️ Prevenção

### Checklist para Novos Campos:
- [ ] Campo incluído na formatação do ImportModal
- [ ] Campo mapeado no useImportWizard  
- [ ] Campo definido nos tipos TypeScript
- [ ] Campo testado no mapeamento

### Logs de Debug Recomendados:
```typescript
// No ImportModal.tsx
console.log('🔍 [DEBUG] Formatted data sample:', formattedData[0]);

// No useImportWizard.ts  
console.log('🔍 [DEBUG] Processed item:', processedItem);
```

## 🎯 Lições Aprendidas

1. **Sempre verificar a formatação inicial** no ImportModal.tsx
2. **Usar logs específicos** para rastrear o fluxo de dados
3. **Testar com dados reais** da API Asaas
4. **Documentar campos obrigatórios** para importação

---
**Autor:** Barcelitos AI  
**Revisão:** Necessária após próximas alterações na importação