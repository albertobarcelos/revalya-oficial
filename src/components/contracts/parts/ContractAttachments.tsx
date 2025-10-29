/**
 * 🔐 COMPONENTE DE ANEXOS DE CONTRATOS
 * 
 * Funcionalidades:
 * - Upload com drag-and-drop e seletor tradicional
 * - Validação de tipos e tamanhos de arquivo
 * - Listagem com busca e ordenação
 * - Download e remoção de arquivos
 * - Controle de acesso multi-tenant
 */

import React, { useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  Download, 
  Trash2, 
  Search, 
  SortAsc, 
  SortDesc,
  FileText,
  Image,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { useContractAttachments, type ContractAttachment } from '@/hooks/useContractAttachments';
import { formatFileSize, formatDate } from '@/lib/utils';

interface ContractAttachmentsProps {
  contractId: string;
  className?: string;
}

type SortField = 'name' | 'uploaded_at' | 'file_size' | 'file_type';
type SortDirection = 'asc' | 'desc';

// AIDEV-NOTE: Ícones por tipo de arquivo
const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('image')) return Image;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  return File;
};

// AIDEV-NOTE: Cores por tipo de arquivo
const getFileTypeColor = (fileType: string) => {
  if (fileType.includes('pdf')) return 'bg-red-100 text-red-700 border-red-200';
  if (fileType.includes('image')) return 'bg-green-100 text-green-700 border-green-200';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (fileType.includes('word')) return 'bg-purple-100 text-purple-700 border-purple-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

export function ContractAttachments({ contractId, className }: ContractAttachmentsProps) {
  const {
    attachments,
    attachmentStats,
    isLoading,
    hasAccess,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
    validateFile,
    isUploading,
    isDeleting,
    allowedTypes,
    maxFileSize
  } = useContractAttachments(contractId);

  // Estados locais
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('uploaded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteDialog, setDeleteDialog] = useState<ContractAttachment | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // AIDEV-NOTE: Filtrar e ordenar anexos
  const filteredAndSortedAttachments = useMemo(() => {
    let filtered = attachments.filter(attachment =>
      attachment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attachment.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'uploaded_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'file_size') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [attachments, searchTerm, sortField, sortDirection]);

  // AIDEV-NOTE: Handlers para drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, []);

  // AIDEV-NOTE: Handler para upload de arquivos
  const handleFileUpload = useCallback((files: File[]) => {
    files.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        // toast.error já é chamado no hook
        return;
      }

      uploadAttachment({
        contractId,
        file,
        description: uploadDescription || undefined
      });
    });

    setUploadDescription('');
    setShowUploadForm(false);
  }, [contractId, uploadAttachment, validateFile, uploadDescription]);

  // AIDEV-NOTE: Handler para seleção de arquivos
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
    e.target.value = ''; // Reset input
  }, [handleFileUpload]);

  // AIDEV-NOTE: Handler para ordenação
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // AIDEV-NOTE: Handler para deletar anexo
  const handleDelete = useCallback((attachment: ContractAttachment) => {
    deleteAttachment({
      attachmentId: attachment.id,
      filePath: attachment.file_path
    });
    setDeleteDialog(null);
  }, [deleteAttachment]);

  if (!hasAccess) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Acesso negado para visualizar anexos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Anexos do Contrato</h3>
          <p className="text-sm text-muted-foreground">
            {attachmentStats.total} arquivo(s) • {formatFileSize(attachmentStats.totalSize)}
          </p>
        </div>
        <Button
          onClick={() => setShowUploadForm(!showUploadForm)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Formulário de upload */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload de Anexos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Área de drag and drop */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                    ${isDragOver 
                      ? 'border-primary bg-primary/5 scale-[1.02]' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <Upload className={`h-8 w-8 mx-auto mb-3 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-sm font-medium mb-1">
                    {isDragOver ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    PDF, DOCX, XLSX, JPEG, PNG • Máximo {formatFileSize(maxFileSize)}
                  </p>
                  
                  <input
                    type="file"
                    multiple
                    accept={allowedTypes.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" disabled={isUploading} asChild>
                      <span className="cursor-pointer">
                        {isUploading ? 'Enviando...' : 'Selecionar Arquivos'}
                      </span>
                    </Button>
                  </label>
                </div>

                {/* Descrição opcional */}
                <div className="space-y-2">
                  <Label htmlFor="upload-description">Descrição (opcional)</Label>
                  <Textarea
                    id="upload-description"
                    placeholder="Adicione uma descrição para os arquivos..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="resize-none h-20"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowUploadForm(false);
                      setUploadDescription('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles de busca e ordenação */}
      {attachments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar anexos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort('name')}>
                Nome {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('uploaded_at')}>
                Data {sortField === 'uploaded_at' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('file_size')}>
                Tamanho {sortField === 'file_size' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('file_type')}>
                Tipo {sortField === 'file_type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Lista de anexos */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando anexos...</p>
          </div>
        ) : filteredAndSortedAttachments.length === 0 && !showUploadForm ? (
          <Card>
            <CardContent className="p-8 text-center">
              <File className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum anexo encontrado' : 'Nenhum anexo adicionado ainda'}
              </p>
              {searchTerm && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Limpar busca
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredAndSortedAttachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.file_type);
              
              return (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="group"
                >
                  <Card className="hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Ícone do arquivo */}
                        <div className={`p-2 rounded-lg border ${getFileTypeColor(attachment.file_type)}`}>
                          <FileIcon className="h-5 w-5" />
                        </div>

                        {/* Informações do arquivo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{attachment.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {attachment.file_type.split('/')[1]?.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatFileSize(attachment.file_size)}</span>
                            <span>•</span>
                            <span>{formatDate(attachment.uploaded_at)}</span>
                          </div>
                          
                          {attachment.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {attachment.description}
                            </p>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadAttachment(attachment)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog(attachment)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Anexo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o arquivo "{deleteDialog?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}