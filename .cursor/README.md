# 📁 Configuração do Cursor para Revalya

Esta pasta contém arquivos de configuração específicos para melhorar a assertividade do Cursor IDE no projeto Revalya.

## 📋 Arquivos Disponíveis

### 1. `BUGBOT.md`
**Uso:** Diretrizes de revisão de código para o Bugbot do Cursor

**Como usar:**
- O Bugbot automaticamente lê este arquivo ao revisar Pull Requests
- Contém regras críticas de segurança multi-tenant
- Checklist de validação antes de aprovar PRs

**Quando atualizar:**
- Quando novos padrões de segurança forem implementados
- Quando novas convenções de código forem estabelecidas
- Quando problemas recorrentes forem identificados

### 2. `CONTEXT.md`
**Uso:** Contexto completo do projeto para Notepads do Cursor

**Como usar:**
- Copie o conteúdo para um Notepad no Cursor
- Compartilhe com a equipe para manter contexto consistente
- Use como referência rápida durante desenvolvimento

**Quando atualizar:**
- Quando a arquitetura mudar significativamente
- Quando novos módulos principais forem adicionados
- Quando padrões de código forem atualizados

### 3. `.cursorrules` (na raiz do projeto)
**Uso:** Regras gerais que o Cursor segue automaticamente

**Como usar:**
- O Cursor lê este arquivo automaticamente
- Não requer configuração adicional
- Aplica regras em todas as interações com a IA

**Quando atualizar:**
- Quando regras fundamentais mudarem
- Quando novos padrões obrigatórios forem estabelecidos

## 🚀 Como Configurar

### Passo 1: Verificar Arquivos
Certifique-se de que todos os arquivos estão presentes:
```bash
ls -la .cursor/
# Deve mostrar: BUGBOT.md, CONTEXT.md, README.md
```

### Passo 2: Configurar Bugbot
1. Abra o Cursor
2. Vá em Settings → Features → Bugbot
3. O Cursor automaticamente detecta `.cursor/BUGBOT.md`

### Passo 3: Criar Notepad
1. Abra o Cursor
2. Use `Ctrl+Shift+P` → "Cursor: Create Notepad"
3. Cole o conteúdo de `.cursor/CONTEXT.md`
4. Salve como "Revalya Project Context"

### Passo 4: Verificar .cursorrules
O arquivo `.cursorrules` na raiz é lido automaticamente. Não requer configuração adicional.

## 📚 Documentação Relacionada

- `Contexto.md` - Especificidades técnicas completas
- `PRD_REVALYA_SISTEMA_COMPLETO.md` - Documentação do produto
- `SECURITY_GUIDELINES_AI_DEVELOPMENT.md` - Diretrizes de segurança

## 🔄 Manutenção

### Frequência de Atualização
- **BUGBOT.md**: Semanal ou quando padrões mudarem
- **CONTEXT.md**: Mensal ou quando arquitetura mudar
- **.cursorrules**: Quando regras fundamentais mudarem

### Processo de Atualização
1. Identificar necessidade de atualização
2. Atualizar arquivo relevante
3. Testar com Cursor
4. Documentar mudanças
5. Notificar equipe

## 🎯 Benefícios Esperados

Com esses arquivos configurados, você deve observar:

1. **Maior Assertividade**: Cursor entende melhor o contexto do projeto
2. **Código Mais Seguro**: Validações automáticas de segurança multi-tenant
3. **Consistência**: Padrões aplicados automaticamente
4. **Produtividade**: Menos retrabalho e correções
5. **Qualidade**: Código gerado alinhado com padrões do projeto

## ❓ Dúvidas Frequentes

### O Cursor não está seguindo as regras
- Verifique se `.cursorrules` está na raiz do projeto
- Reinicie o Cursor após criar/atualizar arquivos
- Verifique se não há erros de sintaxe nos arquivos

### Como saber se está funcionando?
- Teste gerando código novo e verifique se segue os padrões
- Use o Bugbot em um PR e veja se detecta problemas
- Verifique se autocompletar sugere padrões corretos

### Posso personalizar para meu time?
- Sim! Todos os arquivos podem ser customizados
- Mantenha a estrutura básica para consistência
- Documente mudanças para o time

---

**Última atualização:** Janeiro 2025  
**Mantenedor:** Equipe Revalya

