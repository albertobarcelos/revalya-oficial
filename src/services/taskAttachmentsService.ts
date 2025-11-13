import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export interface TaskAttachment {
  id: string
  task_id: string
  tenant_id: string
  file_name: string
  mime_type: string
  file_size: number
  file_url: string
  thumbnail_url?: string
  uploaded_by?: string
  created_at?: string
  signed_url?: string
  thumbnail_signed_url?: string
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function getSigned(path: string | undefined): Promise<string | undefined> {
  if (!path) return undefined
  const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(path, 3600)
  if (error) {
    console.error('[attachments] erro ao criar signed url', error)
    return undefined
  }
  return data?.signedUrl
}

export async function listAttachments(taskId: string, tenantId: string): Promise<TaskAttachment[]> {
  // garantir contexto de tenant para políticas
  await supabase.rpc('set_tenant_context_simple', { p_tenant_id: tenantId })
  const { data, error } = await supabase
    .from('tasks_attachments')
    .select('*')
    .eq('task_id', taskId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const withSigned = await Promise.all((data || []).map(async (att) => ({
    ...att,
    signed_url: await getSigned(att.file_url),
    thumbnail_signed_url: await getSigned(att.thumbnail_url)
  } as TaskAttachment)))

  return withSigned
}

export async function deleteAttachment(att: TaskAttachment) {
  // Delete storage objects first
  if (att.file_url) {
    await supabase.storage.from('task-attachments').remove([att.file_url])
  }
  if (att.thumbnail_url) {
    await supabase.storage.from('task-attachments').remove([att.thumbnail_url])
  }
  // Delete metadata
  const { error } = await supabase
    .from('tasks_attachments')
    .delete()
    .eq('id', att.id)
    .eq('tenant_id', att.tenant_id)
  if (error) throw error
}

export async function uploadAttachment(params: {
  taskId: string
  tenantId: string
  userId?: string
  file: File
  thumbnail?: Blob
}): Promise<TaskAttachment> {
  const { taskId, tenantId, userId, file, thumbnail } = params

  // Validate type and size
  const allowed = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowed.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Arquivo excede 10MB')
  }

  // Ensure tenant context for RLS
  await supabase.rpc('set_tenant_context_simple', { p_tenant_id: tenantId })

  const fileId = uuidv4()
  const safeName = sanitizeFileName(file.name)
  const ext = safeName.split('.').pop() || 'img'
  const basePath = `${tenantId}/${taskId}`
  const filePath = `${basePath}/${fileId}.${ext}`

  const uploadRes = await supabase
    .storage
    .from('task-attachments')
    .upload(filePath, file, { contentType: file.type })
  if (uploadRes.error) throw uploadRes.error

  let thumbPath: string | undefined
  if (thumbnail) {
    thumbPath = `${basePath}/thumb_${fileId}.jpg`
    const thumbRes = await supabase
      .storage
      .from('task-attachments')
      .upload(thumbPath, thumbnail, { contentType: 'image/jpeg' })
    if (thumbRes.error) throw thumbRes.error
  }

  const { data, error } = await supabase
    .from('tasks_attachments')
    .insert({
      task_id: taskId,
      tenant_id: tenantId,
      file_name: safeName,
      mime_type: file.type,
      file_size: file.size,
      file_url: filePath,
      thumbnail_url: thumbPath,
      uploaded_by: userId,
    })
    .select('*')
    .single()
  if (error) throw error

  const signedUrl = await getSigned(filePath)
  const thumbSignedUrl = await getSigned(thumbPath)

  return {
    ...data,
    signed_url: signedUrl,
    thumbnail_signed_url: thumbSignedUrl,
  } as TaskAttachment
}

export async function generateThumbnail(file: File, size = 200): Promise<Blob> {
  const img = document.createElement('img')
  const url = URL.createObjectURL(file)
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Erro ao carregar imagem'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  const scale = Math.min(size / img.width, size / img.height)
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
  if (!blob) throw new Error('Falha ao gerar miniatura')
  return blob
}
