# 📋 RELATÓRIO DE MAPEAMENTO - VINCULAÇÃO DE SERVIÇOS

## 🎯 OBJETIVO
Analisar o mapeamento atual entre a planilha `contratos_prontos_with_ids.xlsx` e a tabela `contract_services` do Supabase, identificando problemas e propondo melhorias.

---

## 📊 ESTRUTURA DA PLANILHA

### Colunas da Planilha (Linha 1 - Headers)
| Coluna | Nome | Descrição | Uso Atual |
|--------|------|-----------|-----------|
| 1 | cnpj | CNPJ do cliente | Não usado |
| 2 | contract_id | ID do contrato no Supabase | ✅ Usado para vinculação |
| 3 | CodGE | Código do grupo econômico | Não usado |
| 4 | customer_id | ID do cliente no Supabase | Não usado |
| 5 | Grupoeconomico | Nome do grupo econômico | Não usado |
| 6 | loja | Nome da loja | Não usado |
| 7 | data_inicio | Data de início do contrato | Não usado |
| 8 | data_fim | Data de fim do contrato | Não usado |
| 9 | tipo_faturamento | Tipo de faturamento (Mensal) | Não usado |
| 10 | dia_faturamento | Dia do mês para faturamento | Não usado |
| 11 | Custo | Valor do contrato/serviço | ❌ Não está sendo usado |
| 12 | numequipamentos | Quantidade de equipamentos | ❌ Não está sendo usado |
| 13 | Gestao | Indica se tem gestão (SIM/NAO) | ✅ Usado para ativar HIPER GESTÃO |
| 14 | PDV/Comandas | Quantidade de PDVs ou "SIM" | ✅ Usado para ativar PDV Legal |
| 15 | NFCE | Indica se tem NFC-e (SIM/NAO) | ✅ Usado para ativar HIPER |
| 16 | Estoque | Indica se tem estoque (SIM/NAO) | ✅ Usado para ativar MÓDULO DE ESTOQUE |
| 17 | Financeiro | Indica se tem financeiro (SIM/NAO) | ✅ Usado para ativar MÓDULO FINANCEIRO |
| 18 | Delivery Legal | Indica se tem delivery (SIM/NAO) | ✅ Usado para ativar DELIVERY LEGAL |
| 19 | Delivery Legal + | Indica se tem delivery+ (SIM/NAO) | ✅ Usado para ativar DELIVERY LEGAL+ |
| 20 | Fidelidade legal | Indica se tem fidelidade (SIM/NAO) | ✅ Usado para ativar FIDELIDADE LEGAL |
| 21 | Totem Autoatendimento | Indica se tem totem (SIM/NAO) | ✅ Usado para ativar AUTO ATENDIMENTO BALANÇA |
| 22 | KDS | Indica se tem KDS (SIM/NAO) | ✅ Usado para ativar KDS |
| 23 | Balanca Auto Servico | Indica se tem balança (SIM/NAO) | ✅ Usado para ativar AUTO ATENDIMENTO BALANÇA |
| 24 | contract_id | Duplicado da coluna 2 | Não usado |

---

## 🔍 MAPEAMENTO ATUAL DOS SERVIÇOS

### Lógica de Ativação
```python
# Valores que ativam um serviço:
['SIM', '1', 'YES', 'TRUE'] ou valor numérico > 0
```

### Serviços Mapeados
| Coluna Planilha | Valor Ativador | Serviço Supabase | Service ID |
|------------------|----------------|------------------|------------|
| PDV/Comandas | "1" ou numérico > 0 | PDV Legal | b8be3fd6-82f9-467a-8673-6fd12e23ff9b |
| NFCE | "SIM" | HIPER | 1d27cd41-434a-4fe1-ada3-eee1e3caa16e |
| Estoque | "SIM" | MÓDULO DE ESTOQUE | 86f31600-69f9-4426-82f4-ff9f92c54021 |
| Financeiro | "SIM" | MÓDULO FINANCEIRO | 2c343d48-fea9-4002-9106-4a324b5a5189 |
| Delivery Legal | "SIM" | DELIVERY LEGAL - 25K TRANSASIONADO | 8b009d88-9219-4e97-90a2-8bb3677b8ec7 |
| Delivery Legal + | "SIM" | DELIVERY LEGAL - ACIMA 25K TRANSASIONADO | 6f215517-b962-4544-a6b9-111555809e14 |
| Fidelidade legal | "SIM" | FIDELIDADE LEGAL | 3e64cc33-9948-47d2-8d13-9cdb757c8bf1 |
| Totem Autoatendimento | "SIM" | AUTO ATENDIMENTO BALANÇA | f02b94b3-ce18-47d2-8d6c-9b989f7fb5a5 |
| KDS | "SIM" | KDS | c3e1864d-035b-4e12-8144-95ad7932c7da |
| Balanca Auto Servico | "SIM" | AUTO ATENDIMENTO BALANÇA | f02b94b3-ce18-47d2-8d6c-9b989f7fb5a5 |
| Gestao | "SIM" | HIPER GESTÃO | 16e7d726-27b1-4239-b82e-8209a634e2b4 |

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **Preço Unitário Sempre Zero**
- **Problema**: A coluna "Custo" (coluna 11) não está sendo usada
- **Impacto**: Todos os serviços têm `unit_price = 0`
- **Solução**: Usar o valor da coluna "Custo" quando disponível

### 2. **Quantidade Sempre adrão**
- **Problema**: A coluna "numequipamentos" (coluna 12) não está sendo usada
- **Impacto**: Todos os serviços têm `quantity = 1`
- **Solução**: Usar o valor da coluna "numequipamentos" como quantidade padrão

### 3. **Quantidade PDV Fixa**
- **Problema**: Só o serviço PDV Legal usa a quantidade específica da coluna PDV/Comandas
- **Impacto**: Outros serviços não respeitam quantidades específicas
- **Solução**: Estender a lógica de quantidade para outros serviços

### 4. **Tenant ID Hardcoded**
- **Problema**: `TENANT_ID = "8d2888f1-64a5-445f-84f5-2614d5160251"` está fixo
- **Impacto**: Todas as vinculações são criadas com um tenant específico
- **Solução**: Detectar o tenant_id correto ou aceitar como parâmetro

### 5. **Validação de Dados Limitada**
- **Problema**: Não valida se o contract_id existe antes de criar vinculações
- **Impacto**: Pode criar vinculações para contratos inexistentes
- **Solução**: Verificar existência do contrato antes de prosseguir

### 6. **Mapeamento de Colunas Manual**
- **Problema**: Procura colunas pelo nome em cada linha
- **Impacto**: Performance lenta e propenso a erros
- **Solução**: Criar mapeamento de colunas uma vez no início

---

## 📊 EXEMPLO DE PROCESSAMENTO

### Dados da Linha 3:
```
Contract ID: 2eade4a6-35f1-45ed-8289-8cbf75bda3c6
Custo: None (vazio)
Núm Equipamentos: 1
Gestão: SIM
PDV/Comandas: 1
NFCE: SIM
Estoque: NAO
Financeiro: NAO
Delivery Legal: NAO
Delivery Legal +: NAO
Fidelidade legal: NAO
Totem Autoatendimento: NAO
KDS: NAO
Balanca Auto Servico: NAO
```

### Resultado do Processamento:
```
Serviços Ativados: 3
- HIPER GESTÃO (porque Gestão = "SIM")
- PDV Legal (porque PDV/Comandas = "1")
- HIPER (porque NFCE = "SIM")

Valores Inseridos:
- quantity: 1 (padrão)
- unit_price: 0 (padrão)
- total_amount: 0 (calculado automaticamente)
```

---

## 💡 RECOMENDAÇÕES DE MELHORIA

### 1. **Usar Valores Reais da Planilha**
```python
# Atual (sempre padrão)
quantity = 1
unit_price = 0

# Proposto (usar valores da planilha)
quantity = row_data.get(12, 1)  # numequipamentos
unit_price = row_data.get(11, 0) or 0  # Custo (0 se None)
```

### 2. **Mapeamento de Colunas Otimizado**
```python
# Criar mapeamento uma vez no início
column_mapping = {}
for col_num in range(1, sheet.max_column + 1):
    header = sheet.cell(row=1, column=col_num).value
    if header:
        column_mapping[header] = col_num

# Depois usar diretamente
pdv_col = column_mapping.get('PDV/Comandas')
estoque_col = column_mapping.get('Estoque')
# etc...
```

### 3. **Validação de Contrato Existente**
```python
# Verificar se contrato existe antes de processar
contract_check = supabase.table('contracts').select('id').eq('id', contract_id).execute()
if not contract_check.data:
    print(f"Contrato {contract_id} não encontrado, ignorando...")
    continue
```

### 4. **Tenant ID Dinâmico**
```python
# Detectar tenant do contrato ou aceitar como parâmetro
contract_data = supabase.table('contracts').select('tenant_id').eq('id', contract_id).execute()
if contract_data.data:
    tenant_id = contract_data.data[0]['tenant_id']
else:
    tenant_id = input_tenant_id or default_tenant_id
```

### 5. **Logs Detalhados**
```python
# Adicionar logs de mapeamento para debugging
print(f"Linha {row_num}: Contract={contract_id}, Custo={custo}, Qtd={num_equip}")
print(f"  Serviços ativos: {active_services}")
print(f"  Valores: qtd={quantity}, preço={unit_price}, total={total_amount}")
```

---

## 🎯 CONCLUSÃO

O script está funcionando e criando as vinculações, mas com as seguintes limitações:

✅ **Funcionando:**
- Mapeamento correto de serviços ativos/inativos
- Criação/atualização de vínculos no Supabase
- Detecção de serviços duplicados

❌ **Problemas Críticos:**
- **Preço unitário sempre zero** (coluna "Custo" não usada)
- **Quantidade sempre 1** (coluna "numequipamentos" não usada)
- **Tenant ID fixo** (pode estar criando vinculações no tenant errado)

🔧 **Recomendações Imediatas:**
1. Usar o valor da coluna "Custo" para `unit_price`
2. Usar o valor da coluna "numequipamentos" para `quantity`
3. Detectar o `tenant_id` correto do contrato
4. Adicionar validação de contrato existente
5. Implementar logs detalhados para debugging