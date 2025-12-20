# Fluxo de Criação de Tenant - Atualizado

## ✅ Mudanças Implementadas

### 1. Remoção do Campo de Senha
- ✅ Campo `password` removido do formulário de criação de tenant
- ✅ Schema atualizado para não exigir senha
- ✅ Descrição do campo email atualizada

### 2. Novo Fluxo de Criação

**Antes:**
1. Admin preenchia dados + senha
2. Sistema criava usuário no Auth
3. Sistema criava tenant
4. Sistema associava usuário ao tenant
5. Sistema enviava email de boas-vindas com senha

**Agora:**
1. Admin preenche dados (sem senha)
2. Sistema cria tenant
3. Sistema cria convite em `tenant_invites` com role `TENANT_ADMIN`
4. Sistema envia email de convite para o administrador
5. Administrador recebe email e clica no link
6. Se não tem conta: cria conta com nome e senha
7. Se já tem conta: faz login
8. Após login/registro: vê convite pendente na página de seleção de portal
9. Aceita convite e ganha acesso ao tenant

### 3. Correções na Página de Registro
- ✅ Usa `tenant_invites` em vez de `invites`
- ✅ Valida status `PENDING` corretamente
- ✅ Associa usuário ao tenant automaticamente após registro
- ✅ Marca convite como `ACCEPTED`

### 4. Correções na Página de Seleção de Portal
- ✅ Carrega convites pendentes do store Zustand
- ✅ Filtra convites por email do usuário
- ✅ Exibe convites na aba "Convites"
- ✅ Permite aceitar/rejeitar convites
- ✅ Recarrega dados após aceitar/rejeitar

### 5. Correções no Store
- ✅ Filtra convites por email do usuário
- ✅ Usa status `PENDING` (maiúsculas) corretamente

## 🔄 Fluxo Completo

### Cenário 1: Usuário Novo
1. Admin cria tenant → convite criado
2. Email enviado com link `/register?token=xxx`
3. Usuário acessa link → valida convite
4. Usuário preenche nome e senha → cria conta
5. Sistema associa ao tenant automaticamente
6. Convite marcado como ACCEPTED
7. Usuário redirecionado para login
8. Após login → vê tenant na lista de portais

### Cenário 2: Usuário Existente
1. Admin cria tenant → convite criado
2. Email enviado com link `/register?token=xxx`
3. Usuário acessa link → valida convite
4. Sistema detecta que usuário já existe
5. Redireciona para `/login`
6. Usuário faz login
7. Após login → vê convite pendente na aba "Convites"
8. Aceita convite → ganha acesso ao tenant

## 📋 Arquivos Modificados

1. `src/pages/admin/tenants/new.tsx`
   - Removido campo de senha
   - Fluxo alterado para criar convite em vez de usuário
   - Envio de email de convite

2. `src/pages/auth/Register.tsx`
   - Corrigido para usar `tenant_invites`
   - Associação automática ao tenant

3. `src/pages/portal-selection.tsx`
   - Carrega convites do store
   - Exibe convites pendentes

4. `src/store/tenantStore.ts`
   - Filtra convites por email do usuário
   - Usa status correto (PENDING)

## ⚠️ Observações Importantes

1. **Status do Convite**: A tabela usa `PENDING`, `ACCEPTED`, `REJECTED` em maiúsculas
2. **Filtro por Email**: Convites são filtrados pelo email do usuário logado
3. **Associação Automática**: Após registro com token, usuário é associado automaticamente
4. **Email de Convite**: Usa a mesma edge function `send-invite-email` que já existia

## 🚀 Próximos Passos

1. Testar criação de tenant sem senha
2. Testar recebimento de email de convite
3. Testar registro com token de convite
4. Testar login de usuário existente e visualização de convite
5. Testar aceite de convite na página de seleção de portal

