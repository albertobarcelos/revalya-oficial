# 🔒 Análise de Segurança: Chave API Asaas

## ⚠️ STATUS ATUAL: VULNERABILIDADE CRÍTICA IDENTIFICADA

**Data da Análise:** 2025-12-13  
**Severidade:** 🔴 CRÍTICA  
**Prioridade:** ALTA

---

## 📋 Resumo Executivo

A chave API do Asaas está sendo armazenada em **texto plano** no banco de dados PostgreSQL, dentro do campo JSONB `config` da tabela `tenant_integrations`. Esta é uma **vulnerabilidade crítica de segurança** que precisa ser corrigida imediatamente.

---

## 🔍 Análise Detalhada

### 1. Armazenamento Atual

**Localização:** Tabela `tenant_integrations`, campo `config` (JSONB)

**Estrutura atual:**
```json
{
  "api_key": "$aact_YturanABCDEF...",  // ⚠️ TEXTO PLANO
  "api_url": "https://api.asaas.com/v3",
  "environment": "production",
  "instance_name": "ASAAS_CONSYSA"
}
```

**Problemas identificados:**

1. ❌ **Armazenamento em texto plano** - A chave API é salva sem criptografia
2. ❌ **Sem proteção em trânsito** - Embora use HTTPS, a chave é lida diretamente do banco
3. ❌ **Acesso via RLS** - Depende apenas de Row Level Security, sem camada adicional
4. ❌ **Logs podem expor** - Se logs forem comprometidos, a chave pode ser exposta
5. ❌ **Backups desprotegidos** - Backups do banco contêm chaves em texto plano

### 2. Fluxo de Dados Atual

```
Frontend (Input) 
  → Supabase Client 
  → tenant_integrations.config (JSONB - TEXTO PLANO)
  → Edge Function (asaas-proxy)
  → API Asaas
```

**Pontos de exposição:**
- ✅ Frontend → Supabase: HTTPS (protegido)
- ❌ Supabase → Banco: Texto plano no JSONB
- ✅ Edge Function → API Asaas: HTTPS (protegido)

### 3. Acesso à Chave

**Locais onde a chave é lida:**

1. **Frontend (`IntegrationServices.tsx`):**
   ```typescript
   apiKey: integration.config?.api_key || ''  // ⚠️ Lê texto plano
   ```

2. **Edge Function (`asaas-proxy/index.ts`):**
   ```typescript
   const config = data.config || {}
   apiKey: config.api_key  // ⚠️ Lê texto plano
   ```

3. **Shared Functions (`_shared/tenant.ts`):**
   ```typescript
   api_key: config.api_key || ''  // ⚠️ Lê texto plano
   ```

---

## 🛡️ Recomendações de Segurança

### 1. Criptografia no Banco de Dados (RECOMENDADO)

**Usar PostgreSQL `pgcrypto` para criptografia nativa:**

#### Opção A: Criptografia com chave mestra (Recomendado)

```sql
-- 1. Habilitar extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar função para criptografar
CREATE OR REPLACE FUNCTION encrypt_api_key(plain_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      plain_key,
      current_setting('app.encryption_key', true)
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função para descriptografar
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_key, 'base64'),
    current_setting('app.encryption_key', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Configurar chave mestra (fazer via variável de ambiente do Supabase)
-- ALTER DATABASE postgres SET app.encryption_key = 'chave-mestra-32-bytes';
```

#### Opção B: Criptografia com coluna separada (Alternativa)

```sql
-- Adicionar coluna específica para chave criptografada
ALTER TABLE tenant_integrations 
ADD COLUMN encrypted_api_key BYTEA;

-- Criar índice para busca (sem expor chave)
CREATE INDEX idx_tenant_integrations_encrypted_key 
ON tenant_integrations USING hash(encrypted_api_key);
```

### 2. Criptografia no Aplicativo (Alternativa)

**Usar biblioteca de criptografia no código:**

```typescript
// src/lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptApiKey(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 3. Proteções Adicionais Recomendadas

#### A. Rotação de Chaves
- Implementar rotação automática de chaves de criptografia
- Manter histórico de chaves antigas para descriptografia

#### B. Auditoria
- Logar TODOS os acessos à chave API
- Alertar em caso de múltiplas tentativas de acesso
- Rastrear quem acessou e quando

#### C. Validação de Acesso
- Verificar permissões antes de descriptografar
- Implementar rate limiting para tentativas de descriptografia
- Bloquear acesso após múltiplas falhas

#### D. Segregação de Dados
- Armazenar chave de criptografia em serviço separado (ex: AWS KMS, HashiCorp Vault)
- Nunca armazenar chave mestra no mesmo banco de dados

---

## 🔧 Implementação Recomendada

### Fase 1: Migração Imediata (Crítica)

1. **Criar migration para adicionar criptografia:**
   ```sql
   -- Migration: encrypt_existing_api_keys.sql
   BEGIN;
   
   -- 1. Adicionar coluna para chave criptografada
   ALTER TABLE tenant_integrations 
   ADD COLUMN encrypted_api_key TEXT;
   
   -- 2. Criptografar chaves existentes
   UPDATE tenant_integrations
   SET encrypted_api_key = encrypt_api_key((config->>'api_key'))
   WHERE integration_type = 'asaas' 
     AND config->>'api_key' IS NOT NULL;
   
   -- 3. Remover chave em texto plano do config
   UPDATE tenant_integrations
   SET config = config - 'api_key'
   WHERE integration_type = 'asaas';
   
   COMMIT;
   ```

2. **Atualizar código para usar criptografia:**
   - Modificar `IntegrationServices.tsx` para criptografar antes de salvar
   - Modificar `asaas-proxy` para descriptografar ao ler
   - Atualizar todas as funções que acessam a chave

### Fase 2: Melhorias de Segurança (Alta Prioridade)

1. Implementar rotação de chaves
2. Adicionar auditoria completa
3. Implementar validação de acesso
4. Configurar alertas de segurança

### Fase 3: Hardening (Média Prioridade)

1. Integrar com serviço de gerenciamento de segredos (AWS KMS, Vault)
2. Implementar segregação de dados
3. Adicionar monitoramento de anomalias

---

## 📊 Comparação de Soluções

| Solução | Segurança | Performance | Complexidade | Recomendação |
|---------|-----------|-------------|--------------|--------------|
| **pgcrypto (PostgreSQL)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ **RECOMENDADO** |
| **Criptografia no App** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ✅ Alternativa |
| **Serviço Externo (KMS/Vault)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ Futuro |
| **Texto Plano (Atual)** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ❌ **CRÍTICO** |

---

## ⚠️ Riscos da Situação Atual

### Risco de Exposição

1. **Acesso não autorizado ao banco:**
   - Se alguém conseguir acesso ao banco, todas as chaves são expostas
   - Backups comprometidos expõem todas as chaves

2. **Logs comprometidos:**
   - Se logs forem capturados, chaves podem ser extraídas
   - Console.log em produção pode expor chaves

3. **Ataques internos:**
   - Funcionários com acesso ao banco podem ver todas as chaves
   - Sem auditoria adequada, difícil rastrear acessos

4. **Compliance:**
   - Não atende requisitos de LGPD/GDPR para dados sensíveis
   - Pode resultar em multas e problemas legais

---

## ✅ Checklist de Implementação

- [ ] Criar migration para adicionar criptografia
- [ ] Implementar funções de encrypt/decrypt
- [ ] Atualizar código de salvamento (criptografar antes de salvar)
- [ ] Atualizar código de leitura (descriptografar ao ler)
- [ ] Migrar chaves existentes
- [ ] Remover chaves em texto plano
- [ ] Implementar auditoria de acesso
- [ ] Configurar alertas de segurança
- [ ] Testar em ambiente de desenvolvimento
- [ ] Testar em ambiente de staging
- [ ] Deploy em produção com rollback plan
- [ ] Documentar processo de rotação de chaves
- [ ] Treinar equipe sobre segurança

---

## 📝 Notas Importantes

1. **Chave Mestra:** A chave de criptografia deve ser armazenada em variável de ambiente segura, nunca no código
2. **Backup:** Backups devem ser criptografados separadamente
3. **Performance:** Criptografia adiciona latência mínima (< 10ms por operação)
4. **Compatibilidade:** Verificar compatibilidade com Supabase antes de implementar pgcrypto

---

## 🔗 Referências

- [PostgreSQL pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)

---

**Próximos Passos:** Implementar Fase 1 (Migração Imediata) o mais rápido possível.
