import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2,
  Package
} from 'lucide-react';
import { useProductCategories, useActiveProductCategories } from '@/hooks/useProductCategories';
import { motion } from 'framer-motion';

interface CreateCategoryFormData {
  name: string;
  description: string;
  is_active: boolean;
}

interface EditCategoryFormData extends CreateCategoryFormData {
  id: string;
}

/**
 * AIDEV-NOTE: Componente de gerenciamento de categorias de produtos
 * Permite criar, editar, ativar/desativar e excluir categorias
 * Segue padrões de UI/UX com Shadcn + Motion.dev para microinterações
 */
export function ProductCategoriesManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditCategoryFormData | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateCategoryFormData>({
    name: '',
    description: '',
    is_active: true
  });

  // Hooks para gerenciamento de categorias
  const { 
    categories, 
    isLoading, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    toggleCategoryStatus 
  } = useProductCategories();

  // AIDEV-NOTE: Função para criar nova categoria
  const handleCreateCategory = async () => {
    if (!createForm.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      await createCategory.mutateAsync(createForm);
      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso!"
      });
      setCreateForm({ name: '', description: '', is_active: true });
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar categoria",
        variant: "destructive"
      });
    }
  };

  // AIDEV-NOTE: Função para editar categoria existente
  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        data: {
          name: editingCategory.name,
          description: editingCategory.description,
          is_active: editingCategory.is_active
        }
      });
      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso!"
      });
      setEditingCategory(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar categoria",
        variant: "destructive"
      });
    }
  };

  // AIDEV-NOTE: Função para alternar status da categoria
  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      await toggleCategoryStatus.mutateAsync({ 
        id: categoryId, 
        is_active: !currentStatus 
      });
      toast({
        title: "Sucesso",
        description: `Categoria ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status da categoria",
        variant: "destructive"
      });
    }
  };

  // AIDEV-NOTE: Função para excluir categoria
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory.mutateAsync(categoryId);
      toast({
        title: "Sucesso",
        description: "Categoria excluída com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Carregando categorias...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Categorias de Produtos</CardTitle>
                <CardDescription>
                  Gerencie as categorias disponíveis para classificar seus produtos
                </CardDescription>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Categoria
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Categoria</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova categoria para classificar seus produtos
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Categoria *</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Eletrônicos, Roupas, Livros..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional da categoria"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={createForm.is_active}
                      onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Categoria ativa</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateCategory}
                    disabled={createCategory.isPending}
                  >
                    {createCategory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar Categoria
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Categorias */}
      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma categoria encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira categoria para começar a organizar seus produtos
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Categoria
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <motion.tr
                    key={category.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                  >
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || 'Sem descrição'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? 'default' : 'secondary'}>
                        {category.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(category.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Toggle Status */}
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(category.id, category.is_active)}
                            disabled={toggleCategoryStatus.isPending}
                          >
                            {category.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>

                        {/* Edit */}
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCategory({
                                id: category.id,
                                name: category.name,
                                description: category.description || '',
                                is_active: category.is_active
                              });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </motion.div>

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a categoria "{category.name}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCategory(category.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Modifique as informações da categoria
            </DialogDescription>
          </DialogHeader>
          
          {editingCategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome da Categoria *</Label>
                <Input
                  id="edit-name"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory(prev => 
                    prev ? { ...prev, name: e.target.value } : null
                  )}
                  placeholder="Ex: Eletrônicos, Roupas, Livros..."
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  placeholder="Descrição opcional da categoria"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={editingCategory.is_active}
                  onCheckedChange={(checked) => setEditingCategory(prev => 
                    prev ? { ...prev, is_active: checked } : null
                  )}
                />
                <Label htmlFor="edit-is_active">Categoria ativa</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingCategory(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditCategory}
              disabled={updateCategory.isPending}
            >
              {updateCategory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}