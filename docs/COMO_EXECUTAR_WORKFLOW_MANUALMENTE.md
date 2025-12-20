# Como Executar Workflow Manualmente

## 🎯 Objetivo

Executar o workflow de deploy do Supabase sem precisar fazer commit/push, útil para testar migrations e Edge Functions.

## 📋 Passo a Passo

### 1. Acessar GitHub Actions

1. Vá para o repositório no GitHub
2. Clique na aba **"Actions"** no topo
3. No menu lateral, selecione **"Deploy Supabase - Development"**

### 2. Executar Workflow Manualmente

1. Clique no botão **"Run workflow"** (canto superior direito)
2. Selecione a branch desejada (ex: `develop`)
3. (Opcional) Marque **"Forçar aplicar todas as migrations pendentes"** se quiser ignorar a detecção de mudanças
4. Clique em **"Run workflow"**

### 3. Acompanhar Execução

- O workflow aparecerá na lista de execuções
- Clique na execução para ver os logs em tempo real
- Os passos serão executados:
  - ✅ Checkout do código
  - ✅ Configuração do Supabase CLI
  - ✅ Autenticação
  - ✅ Link com projeto Development
  - ✅ Detecção de migrations
  - ✅ Aplicação de migrations (se houver)
  - ✅ Deploy de Edge Functions (se houver)

## 🔧 Comportamento

### Execução Manual (`workflow_dispatch`)

- **Sempre verifica migrations pendentes**: Aplica todas as migrations que ainda não foram aplicadas no banco
- **Sempre verifica Edge Functions**: Faz deploy de todas as Edge Functions
- **Não depende de commits**: Usa o código mais recente da branch selecionada

### Execução Automática (`push`)

- **Detecta mudanças**: Só aplica migrations/functions que mudaram entre commits
- **Mais eficiente**: Evita reaplicar coisas que já estão atualizadas

## ⚙️ Opções Disponíveis

### Input: `force_apply_all`

- **Tipo**: Boolean
- **Padrão**: `false`
- **Descrição**: Quando `true`, força aplicar todas as migrations pendentes, ignorando a detecção de mudanças

## 📝 Exemplos de Uso

### Caso 1: Testar Migration Nova
1. Crie a migration localmente
2. Faça commit e push
3. Execute o workflow manualmente
4. A migration será aplicada automaticamente

### Caso 2: Aplicar Migrations Pendentes
1. Execute o workflow manualmente
2. Marque "Forçar aplicar todas as migrations pendentes"
3. Todas as migrations não aplicadas serão executadas

### Caso 3: Deploy de Edge Function
1. Modifique uma Edge Function
2. Faça commit e push
3. Execute o workflow manualmente
4. A Edge Function será deployada automaticamente

## ⚠️ Observações

- O workflow sempre usa o código mais recente da branch selecionada
- Não é necessário fazer commit apenas para testar o workflow
- O workflow detecta automaticamente o que precisa ser aplicado
- Use com cuidado em produção (sempre teste em development primeiro)

## 🔗 Links Úteis

- [GitHub Actions - workflow_dispatch](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch)
- [Supabase CLI - db push](https://supabase.com/docs/reference/cli/supabase-db-push)
- [Supabase CLI - functions deploy](https://supabase.com/docs/reference/cli/supabase-functions-deploy)

