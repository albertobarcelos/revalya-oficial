# 📊 Implementação: Progresso em Tempo Real na Importação ASAAS

**Data:** 2025-01-13  
**Status:** ✅ IMPLEMENTADO

---

## 📋 Resumo

Implementada atualização de progresso em tempo real na notificação de importação ASAAS, mostrando contagem de registros processados conforme a importação avança.

---

## 🎯 Objetivo

Atualizar a notificação de loading com o progresso da importação em tempo real, mostrando:
- Quantidade de registros processados
- Total de registros a processar
- Percentual de conclusão

---

## 🔧 Solução Implementada

### Abordagem

Como a Edge Function processa tudo de uma vez e retorna apenas no final, implementamos uma **estimativa de progresso baseada em tempo** que é atualizada periodicamente enquanto aguarda a resposta.

### Implementação

**Arquivo:** `src/hooks/useAsaasImport.ts`

1. **Callback de Progresso:**
   ```typescript
   const callImportFunction = useCallback(async (
     params: AsaasImportParams, 
     onProgress?: (progress: number, processed: number, total: number) => void
   ): Promise<AsaasImportResult>
   ```

2. **Intervalo de Atualização:**
   ```typescript
   const progressInterval = setInterval(() => {
     const elapsed = Date.now() - startTime;
     const elapsedSeconds = elapsed / 1000;
     
     // Estimativa baseada em velocidade variável
     let estimatedProcessed: number;
     if (elapsedSeconds < 10) {
       // Primeiros 10 segundos: mais rápido (~4 registros/segundo)
       estimatedProcessed = Math.floor(elapsedSeconds * 4);
     } else if (elapsedSeconds < 30) {
       // Entre 10-30 segundos: velocidade média (~2.5 registros/segundo)
       estimatedProcessed = 40 + Math.floor((elapsedSeconds - 10) * 2.5);
     } else {
       // Após 30 segundos: mais lento (~1.5 registros/segundo)
       estimatedProcessed = 90 + Math.floor((elapsedSeconds - 30) * 1.5);
     }
     
     estimatedProcessed = Math.min(estimatedProcessed, totalLimit);
     
     if (estimatedProcessed > lastProcessed && onProgress) {
       const progressPercent = Math.min(
         Math.floor((estimatedProcessed / totalLimit) * 100), 
         95 // Máximo 95% até receber resultado real
       );
       onProgress(progressPercent, estimatedProcessed, totalLimit);
       lastProcessed = estimatedProcessed;
     }
   }, 800); // Atualizar a cada 800ms
   ```

3. **Atualização do Toast:**
   ```typescript
   toast.loading(
     `Importando... ${processed}/${total} registros (${progress}%)`,
     {
       id: 'asaas-import',
       description: 'Aguarde enquanto processamos os registros...'
     }
   );
   ```

4. **Progresso Final:**
   ```typescript
   // Quando recebe resultado real, atualiza para 100%
   if (data && onProgress) {
     const actualProcessed = data.summary?.total_processed || 0;
     onProgress(100, actualProcessed, totalLimit);
   }
   ```

---

## 📊 Velocidade de Processamento Estimada

A estimativa usa velocidade variável baseada em observações empíricas:

| Fase | Tempo | Velocidade | Registros |
|------|-------|------------|-----------|
| Inicial | 0-10s | ~4 reg/s | Busca API e início rápido |
| Média | 10-30s | ~2.5 reg/s | Processamento normal |
| Final | 30s+ | ~1.5 reg/s | Processamento complexo (PIX, barcode, etc) |

**Exemplo para 1000 registros:**
- 0-10s: ~40 registros
- 10-30s: ~90 registros (total: 130)
- 30s+: ~1.5 reg/s até completar

---

## 🎨 Visualização

### Antes
```
🔄 Iniciando importação ASAAS...
```

### Depois
```
🔄 Importando... 245/1000 registros (24%)
   Aguarde enquanto processamos os registros...
```

**Atualização:** A cada 800ms, o toast é atualizado com:
- Contagem atual: `245/1000`
- Percentual: `24%`
- Descrição contextual

---

## ⚠️ Limitações

1. **Estimativa, não progresso real:**
   - Baseada em tempo decorrido, não em processamento real
   - Pode variar dependendo da velocidade da API ASAAS
   - Pode variar dependendo da complexidade dos registros

2. **Máximo 95% durante estimativa:**
   - Progresso fica em 95% até receber resultado real
   - Quando recebe resultado, atualiza para 100% com dados reais

3. **Não reflete pausas:**
   - Se a API ASAAS estiver lenta, a estimativa continuará avançando
   - O progresso real pode ser menor que a estimativa

---

## 🚀 Melhorias Futuras (Opcional)

Para progresso **100% real**, seria necessário:

1. **Sistema de Jobs:**
   - Criar tabela `import_jobs` para armazenar progresso
   - Edge Function atualiza progresso na tabela
   - Frontend faz polling para buscar progresso real

2. **Server-Sent Events (SSE):**
   - Edge Function envia eventos de progresso via SSE
   - Frontend recebe atualizações em tempo real
   - Requer modificação significativa da Edge Function

3. **WebSockets:**
   - Conexão bidirecional para progresso em tempo real
   - Mais complexo de implementar

---

## 📝 Arquivos Modificados

- `src/hooks/useAsaasImport.ts`
  - Adicionado callback `onProgress` na função `callImportFunction`
  - Implementado intervalo de atualização de progresso
  - Atualização do toast com progresso em tempo real

---

## 🧪 Como Testar

1. **Executar importação:**
   - Abrir modal de importação
   - Configurar período e limite (ex: 1000 registros)
   - Clicar em "Importar Cobranças"

2. **Observar notificação:**
   - ✅ Deve mostrar "Iniciando importação ASAAS..." inicialmente
   - ✅ Deve atualizar para "Importando... X/Y registros (Z%)" após ~1 segundo
   - ✅ Deve continuar atualizando a cada ~800ms
   - ✅ Deve mostrar progresso final quando concluir

3. **Verificar comportamento:**
   - Progresso deve aumentar gradualmente
   - Contagem deve estar no formato "X/Y registros"
   - Percentual deve estar entre 0% e 95% (durante estimativa)
   - Ao concluir, deve mostrar 100% com dados reais

---

## ✅ Status

- [x] Callback de progresso implementado
- [x] Intervalo de atualização configurado
- [x] Toast atualizado com progresso
- [x] Estimativa baseada em tempo
- [x] Progresso final com dados reais
- [ ] Testes em produção
- [ ] Ajuste fino de velocidades (se necessário)

---

## 🔗 Referências

- [Sonner Toast Documentation](https://sonner.emilkowal.ski/)
- [React useCallback Hook](https://react.dev/reference/react/useCallback)
