/**
 * Script de migração dos avatars para o novo padrão hierárquico no bucket "avatars".
 *
 * Objetivo:
 * - Mover arquivos antigos no bucket (ex.: "avatar_1234567890.jpg" na raiz) para
 *   o caminho seguro: "{tenant_id}/{user_id}/avatar_<timestamp>.<ext>".
 * - Atualizar public.users.avatar_url para refletir o novo caminho.
 *
 * Requisitos:
 * - Variáveis de ambiente:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (chave de serviço - necessária para operações administrativas de Storage)
 * - O usuário deve existir em public.tenant_users (multi-tenant) para inferir o tenant_id principal.
 *
 * Execução:
 * - npm run migrate:avatars
 * - Opcional: MIGRATE_DRY_RUN=true para apenas simular sem efetuar mudanças.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Configurações básicas
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const DRY_RUN = (process.env.MIGRATE_DRY_RUN ?? '').toLowerCase() === 'true';
const BUCKET = 'avatars';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[ERRO] Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Verifica se o caminho do avatar já utiliza o padrão hierárquico desejado.
 * Ex.: "{tenant_uuid}/{user_uuid}/avatar_1762473187733.jpg".
 */
function isHierarchicalAvatarPath(path?: string | null): boolean {
  if (!path) return false;
  const re = /^[0-9a-f-]+\/[0-9a-f-]+\/avatar_[0-9]{10,}\.(jpg|jpeg|png|webp)$/i;
  return re.test(path);
}

/**
 * Extrai a extensão de um arquivo a partir do caminho.
 */
function getExtension(path: string): string {
  const idx = path.lastIndexOf('.');
  if (idx === -1) return '';
  return path.slice(idx + 1).toLowerCase();
}

/**
 * Obtém o tenant_id principal de um usuário a partir da tabela public.tenant_users.
 * Preferimos o primeiro registro ativo (por created_at) como associação primária.
 */
async function getPrimaryTenantIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, active, created_at')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error(`[ERRO] Falha ao buscar tenant do usuário ${userId}:`, error.message);
    return null;
  }
  if (!data || data.length === 0) return null;
  return (data[0] as any).tenant_id ?? null;
}

/**
 * Atualiza o campo avatar_url do usuário após migração.
 */
async function updateUserAvatarUrl(userId: string, newPath: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ avatar_url: newPath, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    console.error(`[ERRO] Falha ao atualizar users.avatar_url (user_id=${userId}):`, error.message);
    return false;
  }
  return true;
}

/**
 * Move o objeto no Storage do caminho antigo para o novo caminho.
 * Caso o método move não esteja disponível, tenta copiar e remover.
 */
async function moveObject(oldPath: string, newPath: string): Promise<boolean> {
  // Tenta mover diretamente
  const { error: moveError } = await supabase.storage.from(BUCKET).move(oldPath, newPath);
  if (!moveError) return true;

  console.warn(`[AVISO] move() falhou para ${oldPath} -> ${newPath}: ${moveError.message}. Tentando copiar/remover...`);
  // Fallback: copiar e remover
  const { data: downloadUrl, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(oldPath, 60);
  if (signErr || !downloadUrl?.signedUrl) {
    console.error(`[ERRO] Não foi possível gerar URL assinada para copiar ${oldPath}:`, signErr?.message);
    return false;
  }

  // Baixa o arquivo e reenvia (preservando contentType pela extensão)
  try {
    const res = await fetch(downloadUrl.signedUrl);
    if (!res.ok) {
      console.error(`[ERRO] Download do objeto falhou (${oldPath}): HTTP ${res.status}`);
      return false;
    }
    const blob = await res.blob();
    const ext = getExtension(oldPath);
    const contentType =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
        ? 'image/webp'
        : 'application/octet-stream';

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, blob, { contentType, upsert: false, cacheControl: 'public, max-age=31536000' });
    if (uploadErr) {
      console.error(`[ERRO] Falha ao re-enviar para ${newPath}:`, uploadErr.message);
      return false;
    }
    // Remove antigo
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([oldPath]);
    if (rmErr) {
      console.error(`[ERRO] Falha ao remover ${oldPath} após cópia:`, rmErr.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[ERRO] Exceção ao copiar objeto ${oldPath}:`, e?.message ?? e);
    return false;
  }
}

/**
 * Migra um único usuário, se necessário.
 */
async function migrateUser(user: { id: string; avatar_url: string | null }): Promise<void> {
  const { id: userId, avatar_url } = user;
  if (!avatar_url) {
    console.log(`[INFO] Usuário ${userId} sem avatar. Nada a migrar.`);
    return;
  }
  if (isHierarchicalAvatarPath(avatar_url)) {
    console.log(`[INFO] Usuário ${userId} já usa caminho hierárquico: ${avatar_url}`);
    return;
  }

  const tenantId = await getPrimaryTenantIdForUser(userId);
  if (!tenantId) {
    console.warn(`[AVISO] Usuário ${userId} sem tenant ativo. Ignorando migração para este usuário.`);
    return;
  }

  // Mantém o mesmo nome base do arquivo (se já for avatar_<timestamp>.<ext>)
  const fileName = avatar_url.includes('/') ? avatar_url.split('/').pop()! : avatar_url;
  const newPath = `${tenantId}/${userId}/${fileName}`;

  console.log(`[PLAN] ${avatar_url} -> ${newPath} (user=${userId}, tenant=${tenantId})`);
  if (DRY_RUN) return;

  const moved = await moveObject(avatar_url, newPath);
  if (!moved) {
    console.error(`[ERRO] Não foi possível mover/copiar ${avatar_url} para ${newPath}.`);
    return;
  }

  const updated = await updateUserAvatarUrl(userId, newPath);
  if (updated) {
    console.log(`[OK] Migração concluída para usuário ${userId}: ${newPath}`);
  }
}

/**
 * Ponto de entrada principal do script de migração.
 */
async function main() {
  console.log(`[START] Migração de avatars para o padrão hierárquico. DRY_RUN=${DRY_RUN}`);
  // Busca usuários com avatar_url não nulo
  const { data, error } = await supabase
    .from('users')
    .select('id, avatar_url')
    .not('avatar_url', 'is', null);

  if (error) {
    console.error('[ERRO] Falha ao listar usuários com avatar_url:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('[INFO] Nenhum usuário com avatar_url para migrar.');
    return;
  }

  for (const row of data as any[]) {
    await migrateUser({ id: row.id as string, avatar_url: row.avatar_url as string | null });
  }

  console.log('[DONE] Migração finalizada.');
}

main().catch((e) => {
  console.error('[FATAL] Erro não tratado na migração:', e);
  process.exit(1);
});