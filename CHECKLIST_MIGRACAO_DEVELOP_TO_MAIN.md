# ✅ Checklist de Migração: Develop → Main

## 📋 Checklist Rápido

Use este checklist para garantir que todas as etapas foram seguidas antes e durante a migração.

---

## 🔄 FASE 1: Desenvolvimento na Develop

### Edge Functions
- [ ] Function criada/modificada localmente
- [ ] Código revisado e documentado
- [ ] Deploy realizado para develop
- [ ] Function testada e funcionando
- [ ] Logs verificados (sem erros críticos)
- [ ] Performance validada
- [ ] Configurações verificadas (`verify_jwt`, env vars)

### Migrations
- [ ] Migration criada com timestamp correto
- [ ] Migration testada localmente (se possível)
- [ ] Migration aplicada na develop
- [ ] Tabelas/funções/triggers criados corretamente
- [ ] Dados validados (se aplicável)
- [ ] Sem erros de constraint ou dependências
- [ ] Rollback plan documentado

### Configurações
- [ ] Variáveis de ambiente configuradas na develop
- [ ] Valores testados e funcionando
- [ ] Documentação atualizada

---

## ✅ FASE 2: Validação e Preparação

### Comparação de Ambientes
- [ ] Script `comparar_main_develop.ps1` executado
- [ ] Diferenças identificadas e documentadas
- [ ] Versões das functions verificadas
- [ ] Migrations pendentes identificadas
- [ ] Configurações comparadas

### Checklist de Segurança
- [ ] Código revisado por outra pessoa (se possível)
- [ ] Testes completos realizados na develop
- [ ] Plano de rollback preparado
- [ ] Backup do banco (se dados críticos)
- [ ] Janela de manutenção agendada (se necessário)
- [ ] Equipe notificada sobre a migração

---

## 🚀 FASE 3: Migração para Main

### Edge Functions
- [ ] Deploy seletivo ou completo decidido
- [ ] Functions identificadas para deploy
- [ ] Confirmação de deploy realizada
- [ ] Deploy executado com sucesso
- [ ] Versão verificada no Dashboard
- [ ] `verify_jwt` configurado corretamente

### Migrations
- [ ] Método escolhido (CLI ou Dashboard)
- [ ] Migration revisada linha por linha
- [ ] Backup realizado (se necessário)
- [ ] Migration aplicada com sucesso
- [ ] Tabelas/funções/triggers verificados
- [ ] Dados validados (se aplicável)

### Configurações
- [ ] Variáveis de ambiente configuradas em main
- [ ] Valores de produção diferentes de desenvolvimento
- [ ] Configurações de segurança validadas

---

## 🔍 FASE 4: Verificação Pós-Deploy

### Edge Functions
- [ ] Dashboard verificado (versão correta)
- [ ] Endpoint testado em produção
- [ ] Logs monitorados (sem erros)
- [ ] Performance verificada
- [ ] Comportamento validado

### Migrations
- [ ] Migration listada em `supabase_migrations.schema_migrations`
- [ ] Tabelas/funções/triggers existem
- [ ] Dados consistentes
- [ ] Performance não degradada
- [ ] Sem erros nos logs

### Comparação Final
- [ ] Script `comparar_main_develop.ps1` executado
- [ ] Nenhuma inconsistência encontrada
- [ ] Versões sincronizadas
- [ ] Ambientes alinhados

### Monitoramento
- [ ] Logs monitorados por período adequado (mín. 15 min)
- [ ] Sistema funcionando normalmente
- [ ] Sem alertas ou erros
- [ ] Usuários não reportaram problemas

---

## 📝 Documentação

- [ ] Mudanças documentadas
- [ ] Changelog atualizado (se aplicável)
- [ ] Comentários no código atualizados
- [ ] README/documentação técnica atualizada

---

## 🎯 Resumo da Migração

**Data da Migração**: _______________

**Responsável**: _______________

**O que foi migrado**:
- [ ] Edge Functions: _______________
- [ ] Migrations: _______________
- [ ] Configurações: _______________

**Problemas Encontrados**: _______________

**Soluções Aplicadas**: _______________

**Observações**: _______________

---

## 🚨 Rollback (se necessário)

- [ ] Problema identificado
- [ ] Rollback plan executado
- [ ] Sistema restaurado ao estado anterior
- [ ] Problema documentado
- [ ] Correção planejada para próxima migração

---

## ✅ Assinaturas

**Desenvolvedor**: _______________ Data: _______

**Revisor** (se aplicável): _______________ Data: _______

**Aprovado para Produção**: _______________ Data: _______

---

**Nota**: Este checklist deve ser preenchido antes, durante e após cada migração para garantir rastreabilidade e segurança.

