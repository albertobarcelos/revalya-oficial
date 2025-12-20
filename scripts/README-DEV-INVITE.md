# 🛠️ Script de Convite para Desenvolvimento

Este script facilita a criação de convites válidos para testar a página de registro em desenvolvimento local.

## 📋 Opções de Acesso

### Opção 1: Acesso Direto (Modo Dev - Sem Token)

Em modo de desenvolvimento, você pode acessar a página de registro **sem token**:

```
http://localhost:5173/register
```

O sistema permitirá que você preencha o email manualmente e crie uma conta básica (sem associação a tenant).

⚠️ **Nota**: Esta funcionalidade só funciona em modo desenvolvimento (`MODE=development`).

### Opção 2: Criar Convite com Token (Recomendado)

Para testar o fluxo completo de registro com convite:

#### 1. Execute o script:

```bash
npm run dev:create-invite
```

Ou com opções personalizadas:

```bash
# Com email customizado
npm run dev:create-invite -- --email=seu-email@teste.com

# Com tenant específico
npm run dev:create-invite -- --tenant=UUID_DO_TENANT

# Com role específico
npm run dev:create-invite -- --role=TENANT_USER
```

#### 2. O script exibirá:

```
========================================
✅ Convite de desenvolvimento criado!
========================================
📧 Email: dev@teste.com
🔑 Token: abc123-def456-...
🔗 URL Local: http://localhost:5173/register?token=abc123-def456-...
========================================
```

#### 3. Copie a URL e acesse no navegador

### Opção 3: Usar SQL Diretamente

Execute o script SQL em `scripts/create-dev-invite.sql` no Supabase SQL Editor:

```sql
-- O script criará um convite e exibirá o token
-- Use o token na URL: http://localhost:5173/register?token=TOKEN_AQUI
```

## 🔧 Configuração Necessária

Certifique-se de ter as seguintes variáveis de ambiente configuradas:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Ou no arquivo `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

## 📝 Notas Importantes

1. **Modo Desenvolvimento**: O acesso sem token só funciona quando `MODE=development`
2. **Token Válido**: Convites criados pelo script são válidos por 30 dias
3. **Limpeza Automática**: O script remove convites antigos pendentes para o mesmo email
4. **Service Role Key**: O script usa a service role key para bypass RLS (apenas para dev)

## 🚀 Fluxo Completo de Teste

1. Execute `npm run dev:create-invite`
2. Copie a URL exibida
3. Acesse a URL no navegador
4. Preencha o formulário de registro
5. Verifique se o usuário foi criado e associado ao tenant

## ❓ Problemas Comuns

### "Nenhum tenant encontrado"
- Crie um tenant primeiro através da interface admin ou SQL

### "Variáveis de ambiente não configuradas"
- Verifique se `.env.local` ou `.env` contém as variáveis necessárias

### "Token inválido"
- Verifique se o token foi copiado corretamente
- Verifique se o convite não expirou (30 dias)
- Verifique se o convite não foi aceito anteriormente

