import React, { useState, useEffect } from 'react';
import { Plus, Search, Tag, Trash2, Edit, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { templateService } from "@/services/templateService";
import type { MessageTemplate } from "@/types/settings";
import { AVAILABLE_TAGS } from "@/types/settings";
import Skeleton from 'react-loading-skeleton';

// Skeleton para card de integração/template
const IntegrationCardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton height={20} width="70%" />
          <Skeleton height={20} width={60} />
        </div>
        <Skeleton height={14} width="90%" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="space-y-1">
            <Skeleton height={14} width="100%" />
            <Skeleton height={14} width="80%" />
            <Skeleton height={14} width="60%" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Skeleton height={18} width={50} />
            <Skeleton height={18} width={70} />
            <Skeleton height={18} width={40} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Skeleton circle height={32} width={32} />
        <Skeleton circle height={32} width={32} />
        <Skeleton circle height={32} width={32} />
      </CardFooter>
    </Card>
  );
};

export default function Templates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    message: "",
    category: "cobranca",
    days_offset: 0,
    is_before_due: true,
    active: true,
    tags: [] as string[],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getTemplates();
      setTemplates(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar templates",
        description: "Não foi possível carregar os templates. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const newTemplate = await templateService.createTemplate({
        ...formData,
        tags: extractTags(formData.message),
      });
      setTemplates([...templates, newTemplate]);
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Template criado",
        description: "O template foi criado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar template",
        description: "Não foi possível criar o template. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      message: template.message,
      category: template.category,
      days_offset: template.days_offset,
      is_before_due: template.is_before_due,
      active: template.active,
      tags: template.tags || [],
    });
    setIsDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const updatedTemplate = await templateService.updateTemplate(selectedTemplate.id, {
        ...formData,
        tags: extractTags(formData.message),
      });
      if (updatedTemplate) {
        setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
        setIsDialogOpen(false);
        resetForm();
        toast({
          title: "Template atualizado",
          description: "O template foi atualizado com sucesso!",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar template",
        description: "Não foi possível atualizar o template. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await templateService.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir template",
        description: "Não foi possível excluir o template. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.message);
    toast({
      title: "Template copiado",
      description: "O conteúdo do template foi copiado para a área de transferência.",
    });
  };

  const extractTags = (message: string): string[] => {
    const tags = Object.values(AVAILABLE_TAGS);
    return tags.filter(tag => message.includes(tag));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      message: "",
      category: "cobranca",
      days_offset: 0,
      is_before_due: true,
      active: true,
      tags: [],
    });
    setSelectedTemplate(null);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Templates de Mensagem</h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedTemplate ? "Editar Template" : "Novo Template"}
                    </DialogTitle>
                    <DialogDescription>
                      Crie ou edite um template de mensagem. Use as tags disponíveis para inserir dados dinâmicos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Primeira Cobrança"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ex: Template padrão para primeira cobrança"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cobranca">Cobrança</SelectItem>
                          <SelectItem value="lembrete">Lembrete</SelectItem>
                          <SelectItem value="agradecimento">Agradecimento</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={8}
                        placeholder="Digite sua mensagem aqui. Use as tags disponíveis para dados dinâmicos."
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(AVAILABLE_TAGS).map(([key, value]) => (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => {
                              const textarea = document.getElementById("message") as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const newMessage = formData.message.substring(0, start) + value + formData.message.substring(end);
                                setFormData({ ...formData, message: newMessage });
                              }
                            }}
                          >
                            {key.toLowerCase().replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setIsDialogOpen(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={selectedTemplate ? handleUpdate : handleCreate}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {selectedTemplate ? "Salvar" : "Criar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <>
                  <IntegrationCardSkeleton />
                  <IntegrationCardSkeleton />
                  <IntegrationCardSkeleton />
                  <IntegrationCardSkeleton />
                  <IntegrationCardSkeleton />
                  <IntegrationCardSkeleton />
                </>
              ) : filteredTemplates.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Nenhum template encontrado.
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{template.name}</span>
                        <Badge variant="secondary">{template.category}</Badge>
                      </CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {template.message}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="mr-1 h-3 w-3" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
