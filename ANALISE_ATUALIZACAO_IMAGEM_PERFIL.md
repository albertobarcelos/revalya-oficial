# 📸 Análise Detalhada: Sistema de Atualização de Imagem de Perfil

## 🎯 Visão Geral

O sistema de atualização de imagem de perfil no Revalya utiliza uma arquitetura multi-tenant segura com armazenamento no Supabase Storage e referências na tabela `user_avatars`. Este documento detalha todo o fluxo de funcionamento.

---

## 📁 Estrutura de Arquivos

### Arquivos Principais

1. **`src/pages/Profile.tsx`** - Página principal do perfil
2. **`src/components/profile/ProfileAvatar.tsx`** - Componente de upload/exibição do avatar
3. **`src/components/profile/ProfileForm.tsx`** - Formulário de dados do perfil
4. **`src/types/models/profile.ts`** - Tipos TypeScript do perfil
5. **`src/lib/supabase.ts`** - Configuração do Supabase e utilitários de storage

---

## 🗄️ Estrutura do Banco de Dados

### Tabela `user_avatars`

```sql
CREATE TABLE user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  file_path TEXT NOT NULL,           -- Caminho no storage: {tenant_id}/{user_id}/avatar_{timestamp}.{ext}
  file_type TEXT NOT NULL,            -- MIME type: image/jpeg, image/png, etc.
  file_size INTEGER NOT NULL,        -- Tamanho em bytes
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);
```

**Características:**
- ✅ RLS desabilitado (tabela de metadados)
- ✅ Relacionamento com `users.avatar_url` (FK)
- ✅ Suporte multi-tenant via `tenant_id`
- ✅ Flag `is_active` para controle de versões

### Tabela `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  avatar_url UUID REFERENCES user_avatars(id),  -- Referência ao avatar ativo
  -- ... outros campos
);
```

**Observação:** O campo `avatar_url` armazena o **UUID do registro** em `user_avatars`, não o caminho do arquivo diretamente.

---

## 🔄 Fluxo Completo de Upload

### 1. **Inicialização do Componente** (`ProfileAvatar.tsx`)

```typescript
// Hook de segurança multi-tenant
const { currentTenant } = useTenantAccessGuard();

// Estado local para URL de exibição
const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);
```

### 2. **Seleção do Arquivo**

O usuário clica no avatar e seleciona uma imagem através de um `<input type="file">` oculto.

**Validações realizadas:**
- ✅ Extensões permitidas: `jpg`, `jpeg`, `png`, `gif`
- ✅ Tamanho máximo: **2MB**
- ✅ Verificação de tenant ativo

### 3. **Geração do Caminho do Arquivo**

```typescript
const tenantId = currentTenant?.id || 'default';
const timestamp = Date.now();
const fileName = `avatar_${timestamp}.${fileExt}`;
const filePath = `${tenantId}/${user.id}/${fileName}`;
```

**Padrão de caminho:** `{tenant_id}/{user_id}/avatar_{timestamp}.{ext}`

**Exemplo:** `550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/avatar_1704067200000.jpg`

### 4. **Upload para Supabase Storage**

```typescript
const { data: uploadData, error: uploadError } = await supabase.storage
  .from(STORAGE_BUCKETS.AVATARS)  // 'profile-avatars'
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,  // Não sobrescreve arquivos existentes
    contentType: file.type  // MIME type explícito
  });
```

**Bucket:** `profile-avatars` (definido em `src/lib/supabase.ts`)

### 5. **Criação/Atualização do Registro em `user_avatars`**

A função `upsertMapping` realiza um **upsert inteligente**:

```typescript
// 1. Busca avatar ativo existente
const { data: existingActive } = await client
  .from('user_avatars')
  .select('id, file_path')
  .eq('user_id', vars.userId)
  .eq('tenant_id', vars.tenantId)
  .eq('is_active', true)
  .maybeSingle();

// 2. Se existe, atualiza o registro existente
if (existingActive?.id) {
  await client
    .from('user_avatars')
    .update({
      file_path: vars.filePath,
      file_type: vars.fileType,
      file_size: vars.fileSize,
      uploaded_at: new Date().toISOString(),
      is_active: true,
    })
    .eq('id', existingActive.id);
  return { id: existingActive.id };
}

// 3. Se não existe, cria novo registro
else {
  const { data: inserted } = await client
    .from('user_avatars')
    .insert({
      user_id: vars.userId,
      tenant_id: vars.tenantId,
      file_path: vars.filePath,
      file_type: vars.fileType,
      file_size: vars.fileSize,
      uploaded_at: new Date().toISOString(),
      is_active: true,
    })
    .select('id')
    .single();
  return { id: inserted.id };
}
```

**Características:**
- ✅ Mantém apenas **um avatar ativo** por usuário/tenant
- ✅ Reutiliza o mesmo registro UUID quando possível
- ✅ Preserva histórico (arquivos antigos permanecem no storage)

### 6. **Limpeza do Arquivo Anterior** (Opcional)

```typescript
if (previousPath && previousPath !== vars.filePath) {
  await client.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .remove([previousPath]);
}
```

**Nota:** Este código está presente mas **não é executado** devido ao `return` anterior. Pode ser um bug ou intencional para manter histórico.

### 7. **Atualização da Referência em `users`**

```typescript
// Em Profile.tsx - handleAvatarUpload
await updateAvatar.mutateAsync(avatarId);  // avatarId = UUID do user_avatars

// Mutation interna:
await client
  .from('users')
  .update({ 
    avatar_url: avatarId,  // UUID do registro em user_avatars
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id);
```

### 8. **Geração de URL Assinada para Exibição**

```typescript
const signedUrl = await getImageUrl(STORAGE_BUCKETS.AVATARS, filePath, 3600);
setAvatarUrl(signedUrl);
```

**Função `getImageUrl`** (em `src/lib/supabase.ts`):
```typescript
export async function getImageUrl(
  bucket: StorageBucket, 
  path: string, 
  expiresInSeconds: number = 3600
): Promise<string> {
  try {
    // Tenta gerar URL assinada (funciona para buckets privados e públicos)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      // Fallback para URL pública
      return getPublicUrl(bucket, path);
    }
    return data.signedUrl;
  } catch {
    // Fallback final
    return getPublicUrl(bucket, path);
  }
}
```

**Características:**
- ✅ Tenta URL assinada primeiro (segura para buckets privados)
- ✅ Fallback automático para URL pública se falhar
- ✅ Expiração de 1 hora (3600 segundos)

---

## 🔍 Fluxo de Exibição do Avatar

### 1. **Carregamento Inicial** (`Profile.tsx`)

```typescript
const profileQuery = useSecureTenantQuery(
  ["profile"],
  async (client, tenantId) => {
    const { data: { user } } = await client.auth.getUser();
    
    // Busca dados do usuário
    const { data } = await client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    // Resolve avatar_url (pode ser UUID ou caminho direto)
    let avatarDisplayPath: string | null = null;
    const rawAvatar = data?.avatar_url as string | null;
    
    if (rawAvatar) {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(rawAvatar);
      
      if (isUuid) {
        // Se for UUID, busca file_path na tabela user_avatars
        const { data: ua } = await client
          .from('user_avatars')
          .select('file_path')
          .eq('id', rawAvatar)
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        avatarDisplayPath = ua?.file_path || null;
      } else {
        // Se for caminho direto (legado), usa diretamente
        avatarDisplayPath = rawAvatar;
      }
    }
    
    return { user, profileData, avatarDisplayPath };
  }
);
```

### 2. **Resolução no Componente** (`ProfileAvatar.tsx`)

```typescript
useEffect(() => {
  if (url) {
    // Se já for URL completa (http/https), usa diretamente
    if (url.startsWith('http')) {
      setAvatarUrl(url);
    } 
    // Se for UUID, busca file_path
    else if (isUuid && currentTenant?.id) {
      const { data: ua } = await supabase
        .from('user_avatars')
        .select('file_path')
        .eq('id', url)
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();
      
      if (ua?.file_path) {
        await downloadImage(ua.file_path);
      }
    } 
    // Se for caminho direto, baixa diretamente
    else {
      downloadImage(url);
    }
  }
}, [url, currentTenant?.id]);
```

### 3. **Download da Imagem**

```typescript
async function downloadImage(path: string) {
  try {
    // Gera URL assinada válida por 1 hora
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .createSignedUrl(path, 3600);
    
    if (data?.signedUrl) {
      setAvatarUrl(data.signedUrl);
    }
  } catch (error) {
    logError('Erro ao obter URL da imagem', 'ProfileAvatar', error);
  }
}
```

---

## 🗑️ Fluxo de Remoção do Avatar

### 1. **Remoção do Arquivo do Storage**

```typescript
// Em Profile.tsx - removeAvatar mutation
const currentAvatarId = profile.avatar_url || null;

if (currentAvatarId && /^[0-9a-fA-F-]{36}$/.test(currentAvatarId)) {
  // Busca file_path do avatar
  const { data: ua } = await client
    .from('user_avatars')
    .select('id, file_path')
    .eq('id', currentAvatarId)
    .eq('user_id', user.id)
    .maybeSingle();
  
  // Remove arquivo do storage
  if (ua?.file_path) {
    await client.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .remove([ua.file_path]);
  }
  
  // Remove registro da tabela
  if (ua?.id) {
    await client
      .from('user_avatars')
      .delete()
      .eq('id', ua.id);
  }
}
```

### 2. **Limpeza da Referência em `users`**

```typescript
await client
  .from('users')
  .update({ 
    avatar_url: null,
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id);
```

---

## 🔐 Segurança Multi-Tenant

### Validações Implementadas

1. **Hook de Segurança:**
   ```typescript
   const { currentTenant } = useTenantAccessGuard();
   ```

2. **Validação de Tenant:**
   ```typescript
   if (!currentTenant?.id) {
     throw new Error('Tenant não identificado');
   }
   ```

3. **Isolamento por Tenant:**
   - Caminho do arquivo inclui `tenant_id`
   - Queries sempre filtram por `tenant_id`
   - RLS policies garantem isolamento (onde aplicável)

4. **Mutations Seguras:**
   ```typescript
   const upsertMapping = useSecureTenantMutation(
     async (client, _tenantId, vars) => {
       // Contexto de tenant configurado automaticamente
     }
   );
   ```

---

## 📊 Diagrama de Fluxo

```
┌─────────────────┐
│  Usuário clica  │
│  no avatar      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Seleciona       │
│ arquivo (2MB)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Valida formato  │
│ e tamanho       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gera caminho:   │
│ {tenant}/{user} │
│ /avatar_*.ext   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upload para     │
│ Supabase Storage│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upsert em       │
│ user_avatars    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Atualiza        │
│ users.avatar_url│
│ (UUID)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gera URL        │
│ assinada        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Exibe avatar    │
│ atualizado      │
└─────────────────┘
```

---

## 🐛 Pontos de Atenção

### 1. **Código Não Executado na Limpeza**

No `ProfileAvatar.tsx`, linha 68-73:
```typescript
if (previousPath && previousPath !== vars.filePath) {
  await client.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .remove([previousPath]);
}
return { id: existingActive?.id || null };
```

**Problema:** O código de remoção nunca é executado porque há um `return` antes.

**Solução sugerida:** Mover a remoção para antes do return ou usar um `finally`.

### 2. **Reconciliação de Avatar Legado**

Em `Profile.tsx`, há um `useEffect` que tenta reconciliar avatares legados:

```typescript
useEffect(() => {
  const fp = profileQuery.data?.avatarDisplayPath;
  const userId = profileQuery.data?.user?.id;
  if (fp && !fp.startsWith('http') && currentTenant?.id && userId) {
    reconcileAvatarMapping.mutate({ userId, filePath: fp });
  }
}, [profileQuery.data, currentTenant?.id]);
```

**Objetivo:** Migrar avatares antigos que usam caminho direto para o novo formato com `user_avatars`.

### 3. **Bucket de Storage**

O bucket `profile-avatars` deve estar configurado no Supabase com:
- ✅ Políticas de acesso adequadas
- ✅ Suporte a URLs assinadas (se privado)
- ✅ Limite de tamanho de arquivo

---

## 🔧 Configurações Necessárias

### Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### Bucket no Supabase

1. Criar bucket `profile-avatars`
2. Configurar políticas RLS (se necessário)
3. Definir tamanho máximo de arquivo

### Políticas de Storage (Exemplo)

```sql
-- Permitir upload apenas para o próprio usuário
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Permitir leitura para usuários autenticados
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile-avatars' AND
  auth.role() = 'authenticated'
);
```

---

## 📝 Resumo Técnico

### Arquitetura

- **Frontend:** React 18 + TypeScript
- **Storage:** Supabase Storage (bucket `profile-avatars`)
- **Database:** PostgreSQL (tabelas `users` e `user_avatars`)
- **Segurança:** Multi-tenant com RLS e validações de contexto

### Padrões Utilizados

1. ✅ **Separação de Responsabilidades:** Storage vs. Metadados
2. ✅ **Upsert Inteligente:** Reutiliza registros existentes
3. ✅ **URLs Assinadas:** Segurança para buckets privados
4. ✅ **Fallback Automático:** URL pública se assinada falhar
5. ✅ **Validações Multi-Camada:** Frontend + Backend + RLS

### Melhorias Sugeridas

1. 🔄 Corrigir limpeza de arquivos antigos
2. 📊 Adicionar métricas de uso de storage
3. 🗑️ Implementar limpeza automática de avatares órfãos
4. 🔍 Adicionar compressão de imagens antes do upload
5. 📱 Suporte a crop/redimensionamento no frontend

---

## 📚 Referências

- **Arquivo Principal:** `src/pages/Profile.tsx`
- **Componente Avatar:** `src/components/profile/ProfileAvatar.tsx`
- **Configuração Supabase:** `src/lib/supabase.ts`
- **Hooks Seguros:** `src/hooks/templates/useSecureTenantQuery.ts`
- **Script de Migração:** `scripts/migrate-avatars.ts`

---

**Data da Análise:** 2025-01-27  
**Versão do Sistema:** Revalya Financial System  
**Autor:** Análise Automatizada via AI Agent

