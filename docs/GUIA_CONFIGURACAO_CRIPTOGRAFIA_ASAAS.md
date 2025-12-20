# 🔐 Guia de Configuração: Criptografia de Chaves API Asaas

## 📋 Visão Geral

Este guia explica como configurar a criptografia de chaves API do Asaas usando PostgreSQL `pgcrypto`. A implementação foi feita de forma **compatível**, permitindo que o sistema continue funcionando mesmo sem criptografia configurada.

---

## ✅ O Que Foi Implementado

### 1. Migration Criada
- **Arquivo:** `supabase/migrations/20251213_add_api_key_encryption.sql`
- **Funcionalidades:**
  - Habilita extensão `pgcrypto`
  - Adiciona coluna `encrypted_api_key` na tabela `tenant_integrations`
  - Cria função `encrypt_api_key()` para criptografar
  - Cria função `decrypt_api_key()` para descriptografar
  - Cria função helper `get_decrypted_api_key()` com fallback automático

### 2. Código Atualizado
- ✅ `IntegrationServices.tsx` - Criptografa ao salvar, descriptografa ao ler
- ✅ `asaas-proxy/index.ts` - Usa função helper com fallback
- ✅ `_shared/tenant.ts` - Usa função helper com fallback

### 3. Compatibilidade
- ✅ **Funciona sem criptografia** - Se chave mestra não estiver configurada, usa texto plano
- ✅ **Migração gradual** - Chaves antigas continuam funcionando
- ✅ **Fallback automático** - Tenta descriptografar, se falhar usa texto plano

---

## 🚀 Passo a Passo de Configuração

### Passo 1: Aplicar Migration

Execute a migration no banco de dados:

```bash
# Via Supabase CLI
supabase migration up

# OU via SQL direto no Supabase Dashboard
# Database > SQL Editor > Executar migration
```

### Passo 2: Gerar Chave Mestra de Criptografia

**IMPORTANTE:** A chave deve ter exatamente **32 bytes** (256 bits).

#### Opção A: Usando OpenSSL (Recomendado)
```bash
openssl rand -base64 32
```

#### Opção B: Usando Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Opção C: Usando Python
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Exemplo de saída:**
```
K8jL3mN9pQ2rT5vW8xY1zA4bC7dE0fG3hI6jK9lM2nO5pQ8rS1tU4vW7xY0zA=
```

### Passo 3: Configurar Chave Mestra no Supabase

#### Método 1: Via Dashboard (Recomendado)

1. Acesse **Supabase Dashboard** > **Project Settings** > **Database**
2. Vá em **Connection String** ou **Database Settings**
3. Adicione a chave como variável de ambiente do banco:
   - Nome: `ENCRYPTION_KEY`
   - Valor: `[chave gerada no passo 2]`

#### Método 2: Via SQL (Alternativa)

```sql
-- Configurar chave mestra diretamente no banco
ALTER DATABASE postgres SET app.encryption_key = 'K8jL3mN9pQ2rT5vW8xY1zA4bC7dE0fG3hI6jK9lM2nO5pQ8rS1tU4vW7xY0zA=';
```

**⚠️ ATENÇÃO:** Este método armazena a chave no banco. Prefira variável de ambiente.

#### Método 3: Via Supabase Secrets (Melhor Prática)

```bash
# Via Supabase CLI
supabase secrets set ENCRYPTION_KEY="K8jL3mN9pQ2rT5vW8xY1zA4bC7dE0fG3hI6jK9lM2nO5pQ8rS1tU4vW7xY0zA="
```

### Passo 4: Migrar Chaves Existentes (Opcional)

Após configurar a chave mestra, você pode migrar chaves existentes:

```sql
-- Migrar chaves existentes para formato criptografado
UPDATE tenant_integrations
SET encrypted_api_key = encrypt_api_key(config->>'api_key')
WHERE integration_type = 'asaas' 
  AND config->>'api_key' IS NOT NULL
  AND encrypted_api_key IS NULL;
```

**Verificar migração:**
```sql
-- Ver quantas chaves foram criptografadas
SELECT 
  COUNT(*) as total,
  COUNT(encrypted_api_key) as criptografadas,
  COUNT(CASE WHEN config->>'api_key' IS NOT NULL THEN 1 END) as texto_plano
FROM tenant_integrations
WHERE integration_type = 'asaas';
```

### Passo 5: Remover Chaves em Texto Plano (Opcional - Após Validação)

**⚠️ IMPORTANTE:** Só execute após validar que todas as chaves criptografadas estão funcionando!

```sql
-- Remover api_key do config após migração bem-sucedida
UPDATE tenant_integrations
SET config = config - 'api_key'
WHERE integration_type = 'asaas' 
  AND encrypted_api_key IS NOT NULL
  AND config->>'api_key' IS NOT NULL;
```

---

## 🔍 Como Funciona

### Fluxo de Salvamento

```
1. Usuário insere chave API no frontend
2. IntegrationServices.tsx chama encrypt_api_key() via RPC
3. Se criptografia disponível:
   → Chave é criptografada
   → Salva em encrypted_api_key
   → NÃO salva em config.api_key
4. Se criptografia NÃO disponível:
   → Salva em config.api_key (texto plano)
   → Compatibilidade mantida
```

### Fluxo de Leitura

```
1. Código chama get_decrypted_api_key() via RPC
2. Função tenta descriptografar encrypted_api_key
3. Se sucesso:
   → Retorna chave descriptografada
4. Se falhar:
   → Fallback: retorna config.api_key (texto plano)
   → Compatibilidade mantida
```

---

## 🧪 Testes

### Teste 1: Verificar se Criptografia Está Funcionando

```sql
-- Testar função de criptografia
SELECT encrypt_api_key('teste-chave-api-123');

-- Se retornar NULL, criptografia não está configurada
-- Se retornar string base64, criptografia está funcionando
```

### Teste 2: Verificar Descriptografia

```sql
-- Criptografar uma chave de teste
SELECT encrypt_api_key('minha-chave-teste') as encrypted;

-- Descriptografar (usar resultado do passo anterior)
SELECT decrypt_api_key('resultado-do-encrypt-anterior');

-- Deve retornar: 'minha-chave-teste'
```

### Teste 3: Testar Função Helper

```sql
-- Testar função helper com tenant real
SELECT get_decrypted_api_key(
  'ff029370-5fd4-4fc3-8124-18559b89587f'::uuid,
  'asaas'
);

-- Deve retornar a chave API (criptografada ou texto plano)
```

### Teste 4: Verificar no Frontend

1. Acesse **Configurações > Integrações > Asaas**
2. Configure uma nova chave API
3. Verifique no banco:
   ```sql
   SELECT 
     id,
     tenant_id,
     encrypted_api_key IS NOT NULL as tem_criptografia,
     config->>'api_key' IS NOT NULL as tem_texto_plano
   FROM tenant_integrations
   WHERE integration_type = 'asaas'
   ORDER BY updated_at DESC
   LIMIT 1;
   ```

---

## 🔒 Segurança da Chave Mestra

### ⚠️ CRÍTICO: Proteção da Chave Mestra

1. **Nunca commitar no Git:**
   - Adicione `ENCRYPTION_KEY` ao `.gitignore`
   - Nunca coloque em código fonte

2. **Armazenamento Seguro:**
   - Use Supabase Secrets (recomendado)
   - OU variável de ambiente do servidor
   - OU serviço de gerenciamento de segredos (AWS Secrets Manager, HashiCorp Vault)

3. **Rotação de Chaves:**
   - Planeje rotação periódica (ex: a cada 6 meses)
   - Mantenha histórico de chaves antigas para descriptografar dados antigos

4. **Backup Seguro:**
   - Chave mestra deve ser armazenada separadamente dos backups
   - Backups do banco devem ser criptografados

---

## 🐛 Troubleshooting

### Problema: Função encrypt_api_key retorna NULL

**Causa:** Chave mestra não configurada

**Solução:**
1. Verificar se `ENCRYPTION_KEY` está configurada
2. Verificar se `app.encryption_key` está definida no banco
3. Sistema continuará funcionando com texto plano (compatibilidade)

### Problema: Erro "function encrypt_api_key does not exist"

**Causa:** Migration não foi aplicada

**Solução:**
```bash
supabase migration up
```

### Problema: Erro "extension pgcrypto does not exist"

**Causa:** Extensão não habilitada no Supabase

**Solução:**
1. Verificar se Supabase permite pgcrypto (geralmente sim)
2. Executar manualmente:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```

### Problema: Chave descriptografada retorna NULL

**Causa:** Chave criptografada corrompida ou chave mestra diferente

**Solução:**
1. Verificar se chave mestra é a mesma usada para criptografar
2. Se necessário, re-criptografar:
   ```sql
   UPDATE tenant_integrations
   SET encrypted_api_key = encrypt_api_key(config->>'api_key')
   WHERE id = 'id-da-integracao';
   ```

---

## 📊 Status de Migração

Para verificar o status da migração:

```sql
-- Ver estatísticas de criptografia
SELECT 
  integration_type,
  COUNT(*) as total,
  COUNT(encrypted_api_key) as criptografadas,
  COUNT(CASE WHEN config->>'api_key' IS NOT NULL THEN 1 END) as texto_plano,
  COUNT(CASE WHEN encrypted_api_key IS NULL AND config->>'api_key' IS NULL THEN 1 END) as sem_chave
FROM tenant_integrations
WHERE integration_type = 'asaas'
GROUP BY integration_type;
```

---

## ✅ Checklist de Implementação

- [x] Migration criada e testada
- [x] Código atualizado para usar criptografia
- [x] Fallback para texto plano implementado
- [ ] Chave mestra configurada no Supabase
- [ ] Migration aplicada no ambiente de desenvolvimento
- [ ] Testes realizados em desenvolvimento
- [ ] Chaves existentes migradas (opcional)
- [ ] Migration aplicada em staging
- [ ] Testes realizados em staging
- [ ] Migration aplicada em produção
- [ ] Monitoramento configurado
- [ ] Documentação atualizada

---

## 🔗 Referências

- [PostgreSQL pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [Supabase Database Extensions](https://supabase.com/docs/guides/database/extensions)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

**Última Atualização:** 2025-12-13
