import React, { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { generateThumbnail, listAttachments, uploadAttachment, deleteAttachment, type TaskAttachment } from '@/services/taskAttachmentsService'
import { supabase } from '@/lib/supabase'
import { useRef } from 'react'

interface Props {
  taskId: string
}

export default function TaskAttachments({ taskId }: Props) {
  const { toast } = useToast()
  const { currentTenant } = useTenantAccessGuard()
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const attemptedRef = useRef<Record<string, boolean>>({})

  const load = async () => {
    if (!currentTenant?.id || !taskId) return
    setIsLoading(true)
    try {
      const data = await listAttachments(taskId, currentTenant.id)
      setAttachments(data)
    } catch (e: any) {
      toast({ title: 'Erro ao carregar anexos', description: e.message, variant: 'destructive' })
    } finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [taskId, currentTenant?.id])

  const onDrop = async (accepted: File[]) => {
    if (!currentTenant?.id || !taskId) return
    for (const file of accepted) {
      try {
        const thumb = await generateThumbnail(file, 200)
        const att = await uploadAttachment({ taskId, tenantId: currentTenant.id, file, thumbnail: thumb })
        setAttachments(prev => [att, ...prev])
      } catch (e: any) {
        toast({ title: 'Upload inválido', description: e.message, variant: 'destructive' })
      }
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif'] },
    maxSize: 10 * 1024 * 1024,
    multiple: true
  })

  const resolveThumbSrc = async (att: TaskAttachment) => {
    if (att.thumbnail_signed_url) return att.thumbnail_signed_url
    if (!att.thumbnail_url) return att.signed_url
    const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(att.thumbnail_url, 3600)
    if (error) return att.signed_url
    return data?.signedUrl
  }

  const openPreview = async (att: TaskAttachment) => {
    let url = att.signed_url
    if (!url && att.file_url) {
      const { data } = await supabase.storage.from('task-attachments').createSignedUrl(att.file_url, 3600)
      url = data?.signedUrl
      if (url) setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, signed_url: url } : a))
    }
    setPreview(url || null)
  }

  return (
    <div className="space-y-3">
      <Label>Anexos</Label>
      <div
        {...getRootProps()}
        className={`border rounded-md p-3 text-sm cursor-pointer ${isDragActive ? 'border-primary' : 'border-input'} bg-muted/30`}
      >
        <input {...getInputProps()} />
        {isDragActive ? 'Solte aqui...' : 'Arraste imagens ou clique para selecionar (até 10MB por arquivo)'}
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Carregando anexos...</div>
      ) : attachments.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nenhum anexo</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map(att => (
            <div key={att.id} className="relative group">
              {(att.thumbnail_signed_url || att.signed_url) ? (
                <img
                  src={att.thumbnail_signed_url || att.signed_url}
                  alt={att.file_name}
                  className="w-full h-24 object-cover rounded-md cursor-pointer"
                  onClick={() => openPreview(att)}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    if (attemptedRef.current[att.id]) {
                      img.onerror = null
                      img.src = ''
                      return
                    }
                    attemptedRef.current[att.id] = true
                    resolveThumbSrc(att).then((src) => {
                      if (src && src !== img.src) {
                        img.onerror = null
                        img.src = src
                      } else {
                        img.onerror = null
                        img.src = ''
                      }
                    })
                  }}
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                  {att.file_name}
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-1 right-1 h-6 px-2 opacity-0 group-hover:opacity-100"
                onClick={async (e) => { e.stopPropagation(); await deleteAttachment(att); setAttachments(prev => prev.filter(a => a.id !== att.id)) }}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>Visualização</DialogTitle>
          </DialogHeader>
          {preview && (
            <img src={preview} alt="preview" className="w-full max-h-[70vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
