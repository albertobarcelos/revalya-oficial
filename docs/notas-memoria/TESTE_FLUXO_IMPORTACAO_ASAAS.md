# Teste do Fluxo Completo de Importação - Dados Asaas

## Objetivo
Validar todas as correções implementadas no sistema de importação, especialmente para dados provenientes do Asaas, verificando se há inconsistências entre o preview e o CSV final.

## Problemas Identificados e Corrigidos

### 1. Inconsistência no Mapeamento de Campos
- **Problema**: Campo `Cliente_ID` estava sendo mapeado incorretamente no `useImportWizard.ts`
- **Correção**: Alterado de `Cliente_ID` para `customer_asaas_id` para manter consistência
- **Status**: ✅ Corrigido

### 2. Logs de Debug Implementados
- **Localização**: `useImportWizard.ts`, `ImportingStep.tsx`, `importApiService.ts`
- **Funcionalidade**: Rastreamento completo do fluxo de dados desde o preview até a geração do CSV
- **Status**: ✅ Implementado

### 3. Verificação das Edge Functions
- **import-upload**: ✅ Recebe e armazena `field_mappings` corretamente
- **process-import-jobs**: ✅ Recupera e aplica `field_mappings` corretamente
- **Status**: ✅ Verificado

## Plano de Teste

### Dados de Teste
Arquivo: `test-asaas-data.csv`
- 3 registros de clientes do Asaas
- Campos específicos: `id`, `asaas_customer_id`, `province` (bairro), `mobilePhone`
- Estrutura completa de endereço

### Passos do Teste

1. **Acesso ao Sistema**
   - URL: http://localhost:8081/
   - Login com usuário válido
   - Navegar para Clientes > Importar

2. **Upload do Arquivo**
   - Selecionar `test-asaas-data.csv`
   - Verificar se o sistema detecta como dados do Asaas
   - Observar logs no console do navegador

3. **Verificação do Preview**
   - Confirmar se todos os campos estão sendo exibidos corretamente
   - Verificar se o mapeamento automático está funcionando
   - Especial atenção aos campos:
     - `id` → `customer_asaas_id`
     - `province` → `neighborhood`
     - `mobilePhone` → `celular_whatsapp`

4. **Mapeamento de Campos**
   - Verificar se os campos obrigatórios estão mapeados
   - Confirmar mapeamentos automáticos
   - Observar logs de debug no console

5. **Geração do CSV**
   - Prosseguir para a etapa de importação
   - Verificar logs de geração do CSV
   - Confirmar se os dados estão sendo transferidos corretamente

6. **Processamento**
   - Monitorar o job de importação
   - Verificar se os dados são inseridos corretamente no banco
   - Confirmar se não há perda de informações

## Logs Esperados

### Frontend (Console do Navegador)
```
🔍 [DEBUG][useImportWizard] initializeSourceData - sourceType: asaas
🔍 [DEBUG][useImportWizard] processRecords - Iniciando processamento
🔍 [DEBUG][ImportingStep] convertToCSVAndUpload - Dados de entrada
🔍 [DEBUG][importApiService] fieldMappings adicionados ao FormData
```

### Backend (Edge Functions)
```
[DEBUG] Field mappings parsed successfully
[DEBUG] Processing import file with field mappings
[DEBUG] Mapped data for row
```

## Critérios de Sucesso

- [ ] Dados do Asaas são detectados automaticamente
- [ ] Mapeamento automático funciona corretamente
- [ ] Preview exibe dados corretos
- [ ] CSV gerado contém os mesmos dados do preview
- [ ] Importação é concluída sem erros
- [ ] Dados são inseridos corretamente no banco
- [ ] Logs de debug são exibidos em todas as etapas

## Problemas Conhecidos Resolvidos

1. **Campo `Cliente_ID`**: Corrigido para `customer_asaas_id`
2. **Logs de debug ausentes**: Implementados em todo o fluxo
3. **Verificação das Edge Functions**: Confirmado funcionamento correto

## Próximos Passos

Após validação do teste:
1. Criar testes automatizados para reproduzir cenários
2. Documentar casos de uso específicos
3. Implementar validações adicionais se necessário