import React, { useState } from 'react';
import { FileText, Paperclip, X, Download, Trash2, Plus, Upload, File } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { useContractAttachments } from '@/hooks/useContractAttachmentsHook';
import { ContractAttachment } from '@/types/models/contract';
import { formatFileSize } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ContractAttachmentsProps {
  contractId: string;
}

interface AddAttachmentFormData {
  file: File | null;
  name: string;
  description: string;
  category: string;
}

export function ContractAttachments({ contractId }: ContractAttachmentsProps) {
  const { toast } = useToast();
  const { 
    attachments, 
    isLoading, 
    addAttachmentMutation, 
    deleteAttachmentMutation,
    downloadAttachment
  } = useContractAttachments(contractId);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<ContractAttachment | null>(null);
  const [formData, setFormData] = useState<AddAttachmentFormData>({
    file: null,
    name: '',
    description: '',
    category: '',
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({
        ...formData,
        file,
        name: formData.name || file.name,
      });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      category: value,
    });
  };
  
  const handleAddAttachment = async () => {
    if (!formData.file) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para anexar",
        variant: "destructive",
      });
      return;
    }
    
    const attachmentData = new FormData();
    attachmentData.append('file', formData.file);
    attachmentData.append('contractId', contractId);
    attachmentData.append('name', formData.name);
    attachmentData.append('description', formData.description);
    attachmentData.append('category', formData.category);
    
    addAttachmentMutation.mutate(attachmentData, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setFormData({
          file: null,
          name: '',
          description: '',
          category: '',
        });
        toast({
          title: "Sucesso",
          description: "Anexo adicionado com sucesso",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao adicionar anexo",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeleteAttachment = () => {
    if (!attachmentToDelete) return;
    
    deleteAttachmentMutation.mutate(attachmentToDelete.id, {
      onSuccess: () => {
        setAttachmentToDelete(null);
        toast({
          title: "Sucesso",
          description: "Anexo removido com sucesso",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao remover anexo",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDownload = (attachmentId: string) => {
    downloadAttachment(attachmentId);
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-10 w-10 text-red-500" />;
    if (fileType.includes('image')) return <File className="h-10 w-10 text-green-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-10 w-10 text-blue-500" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileText className="h-10 w-10 text-green-600" />;
    return <Paperclip className="h-10 w-10 text-gray-500" />;
  };
  
  const attachmentCategories = [
    { label: "Contrato", value: "contract" },
    { label: "Aditivo", value: "addendum" },
    { label: "Documento do Cliente", value: "customer_document" },
    { label: "Nota Fiscal", value: "invoice" },
    { label: "Outro", value: "other" },
  ];
  
  const getCategoryLabel = (value: string) => {
    const category = attachmentCategories.find(cat => cat.value === value);
    return category ? category.label : value;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Anexos</h3>
        <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Anexo
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center p-4">Carregando anexos...</div>
      ) : attachments && attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 truncate">
                    <CardTitle className="text-base">{attachment.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {attachment.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                          {getCategoryLabel(attachment.category)}
                        </span>
                      )}
                      {attachment.uploaded_at && (
                        <span className="text-xs text-muted-foreground">
                          Adicionado em {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy', { locale: pt })}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAttachmentToDelete(attachment)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O anexo será removido permanentemente do contrato.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAttachmentToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAttachment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {attachment.description && (
                  <p className="text-sm text-muted-foreground mb-2">{attachment.description}</p>
                )}
                <div className="flex items-center pt-2">
                  {getFileIcon(attachment.file_type)}
                  <div className="ml-3">
                    <p className="text-xs text-muted-foreground">{attachment.file_type.split('/')[1]?.toUpperCase() || attachment.file_type}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-0">
                <Button variant="secondary" size="sm" onClick={() => handleDownload(attachment.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-md">
          <Paperclip className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Nenhum anexo encontrado</h3>
          <p className="text-muted-foreground mb-4">Adicione documentos, contratos ou outros arquivos relevantes a este contrato.</p>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Anexo
          </Button>
        </div>
      )}
      
      {/* Dialog para adicionar anexo */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Anexo</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo para anexar ao contrato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <Input 
                type="file" 
                id="file" 
                className="hidden"
                onChange={handleFileChange}
              />
              <Label htmlFor="file" className="cursor-pointer w-full h-full flex flex-col items-center">
                {formData.file ? (
                  <>
                    <div className="mb-4 flex items-center">
                      {getFileIcon(formData.file.type)}
                      <X
                        className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-destructive ml-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData({ ...formData, file: null });
                        }}
                      />
                    </div>
                    <p className="text-sm font-medium">{formData.file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatFileSize(formData.file.size)}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, imagens ou outros arquivos</p>
                  </>
                )}
              </Label>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Nome do Anexo</Label>
                <Input 
                  id="name" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nome descritivo para o anexo"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {attachmentCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea 
                  id="description" 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva o conteúdo ou finalidade deste anexo"
                  className="resize-none min-h-[80px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFormData({
                  file: null,
                  name: '',
                  description: '',
                  category: '',
                });
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleAddAttachment}
              disabled={!formData.file || !formData.name || addAttachmentMutation.isPending}
            >
              {addAttachmentMutation.isPending ? "Enviando..." : "Adicionar Anexo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
