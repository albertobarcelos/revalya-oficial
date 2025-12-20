# 📝 Resumo Executivo: Workflow Develop → Main

## 🎯 Objetivo

Desenvolver na **develop**, testar completamente e migrar para **main** (produção) de forma segura e controlada.

---

## 🚀 Workflow em 4 Fases

### 1️⃣ DESENVOLVIMENTO (Develop)
- Criar/modificar código localmente
- Deploy para develop
- Testar completamente

### 2️⃣ VALIDAÇÃO
- Comparar develop vs main
- Verificar configurações
- Validar que tudo funciona

### 3️⃣ MIGRAÇÃO (Main)
- Deploy seletivo de functions
- Aplicar migrations
- Configurar variáveis de ambiente

### 4️⃣ VERIFICAÇÃO
- Testar em produção
- Monitorar logs
- Comparar ambientes

---

## 🛠️ Scripts Principais

### Comparar Ambientes
```powershell
.\comparar_main_develop.ps1
```

### Deploy para Develop
```powershell
.\deploy_functions_to_develop.ps1
```

### Deploy para Main (Produção)
```powershell
# Seletivo (recomendado)
.\deploy_functions_to_main.ps1 -Functions "function1,function2"

# Todas (com confirmação)
.\deploy_functions_to_main.ps1
```

### Migração Interativa (Recomendado)
```powershell
.\migrar_develop_to_main.ps1
```

---

## 📋 Checklist Rápido

### Antes de Migrar
- [ ] Testado na develop
- [ ] Comparação executada
- [ ] Plano de rollback preparado

### Durante a Migração
- [ ] Functions deployadas
- [ ] Migrations aplicadas
- [ ] Configurações atualizadas

### Após a Migração
- [ ] Testado em produção
- [ ] Logs monitorados
- [ ] Comparação final executada

---

## ⚠️ Regras Críticas

### ✅ SEMPRE
1. Testar na develop primeiro
2. Fazer deploy seletivo
3. Verificar logs após deploy
4. Comparar ambientes

### ❌ NUNCA
1. Deploy direto para main sem testar
2. Deploy de tudo sem verificar
3. Ignorar diferenças de versão
4. Usar valores de dev em produção

---

## 🔗 Documentação Completa

- **Guia Completo**: `WORKFLOW_COMPLETO_DEVELOP_TO_MAIN.md`
- **Checklist Detalhado**: `CHECKLIST_MIGRACAO_DEVELOP_TO_MAIN.md`
- **Script Interativo**: `migrar_develop_to_main.ps1`

---

## 🎯 Quick Start

```powershell
# 1. Desenvolver e testar na develop
.\deploy_functions_to_develop.ps1

# 2. Comparar ambientes
.\comparar_main_develop.ps1

# 3. Migrar para main (interativo)
.\migrar_develop_to_main.ps1

# 4. Verificar
.\comparar_main_develop.ps1
```

---

**Última atualização**: 2025-01-XX

