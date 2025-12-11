import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2,
  Warehouse,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
// AIDEV-NOTE: Importando hooks de segurança multi-tenant obrigatórios
import { useStorageLocations, type StorageLocation } from '@/hooks/useStorageLocations';

interface CreateLocationFormData {
  name: string;
  description: string;
  address: string;
  is_active: boolean;
}

/**
 * Componente de formulário para edição de local de estoque
 */
function EditLocationForm({
  location,
  onSave,
  onCancel,
  isSaving
}: {
  location: StorageLocation;
  onSave: (formData: CreateLocationFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<CreateLocationFormData>({
    name: location.name,
    description: location.description || '',
    address: location.address || '',
    is_active: location.is_active
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Nome do Local *</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Armazém Principal"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="edit-description">Descrição</Label>
          <Textarea
            id="edit-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição do local"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="edit-address">Endereço</Label>
          <Input
            id="edit-address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Endereço completo do local"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving || !formData.name.trim()}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * AIDEV-NOTE: Componente de gerenciamento de locais de estoque
 * Permite criar, editar e gerenciar locais de armazenamento
 * Segue padrões de UI/UX com Shadcn + Motion.dev para microinterações
 * Implementa 5 camadas de segurança multi-tenant obrigatórias
 */
export function StorageLocationManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateLocationFormData>({
    name: '',
    description: '',
    address: '',
    is_active: true
  });

  // AIDEV-NOTE: Hook para gerenciamento de locais de estoque com segurança multi-tenant
  const { 
    locations, 
    isLoading, 
    hasAccess,
    createLocation, 
    updateLocation, 
    deleteLocation,
    refetch,
    isCreating,
    isUpdating,
    isDeleting
  } = useStorageLocations();

  // AIDEV-NOTE: Guard clause obrigatória - Early return para validação de acesso
  if (!hasAccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
      >
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Acesso Negado</h3>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar o gerenciamento de locais de estoque.
          </p>
        </div>
      </motion.div>
    );
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do local é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // AIDEV-NOTE: Usar createLocation com callbacks para atualizar lista automaticamente
    createLocation({
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      address: createForm.address.trim() || undefined,
      is_active: createForm.is_active
    }, {
      onSuccess: async () => {
        // AIDEV-NOTE: Resetar formulário e fechar diálogo após sucesso
        setCreateForm({
          name: '',
          description: '',
          address: '',
          is_active: true
        });
        setIsCreateDialogOpen(false);
        
        // AIDEV-NOTE: Forçar refetch para atualizar a lista imediatamente
        await refetch();
        
        toast({
          title: "Sucesso",
          description: "Local de estoque criado com sucesso",
        });
      },
      onError: (error) => {
        console.error('Erro ao criar local de estoque:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o local de estoque",
          variant: "destructive",
        });
      }
    });
  };

  const handleEdit = (location: StorageLocation) => {
    setEditingLocation(location);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (id: string, formData: CreateLocationFormData) => {
    // AIDEV-NOTE: Usar updateLocation com callbacks para atualizar lista automaticamente
    updateLocation(id, {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      address: formData.address.trim() || undefined,
      is_active: formData.is_active
    }, {
      onSuccess: async () => {
        // AIDEV-NOTE: Fechar diálogo e atualizar lista
        setIsEditDialogOpen(false);
        setEditingLocation(null);
        
        // AIDEV-NOTE: Forçar refetch para atualizar a lista imediatamente
        await refetch();
        
        toast({
          title: "Sucesso",
          description: "Local de estoque atualizado com sucesso",
        });
      },
      onError: (error) => {
        console.error('Erro ao atualizar local de estoque:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o local de estoque",
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = async (id: string) => {
    // AIDEV-NOTE: Usar deleteLocation com callbacks para atualizar lista automaticamente
    deleteLocation(id, {
      onSuccess: async () => {
        // AIDEV-NOTE: Forçar refetch para atualizar a lista imediatamente
        await refetch();
        
        toast({
          title: "Sucesso",
          description: "Local de estoque excluído com sucesso",
        });
      },
      onError: (error) => {
        console.error('Erro ao excluir local de estoque:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o local de estoque",
          variant: "destructive",
        });
      }
    });
  };

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
              <Warehouse className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Locais de Estoque</CardTitle>
                <CardDescription>
                  Gerencie os locais físicos onde seus produtos são armazenados
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
                    Novo Local
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Local de Estoque</DialogTitle>
                  <DialogDescription>
                    Adicione um novo local físico para armazenamento de produtos
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Local *</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Ex: Armazém Principal"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="Descrição do local"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={createForm.address}
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                      placeholder="Endereço completo do local"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Local'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Locais */}
      <Card>
        <CardHeader>
          <CardTitle>Locais Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os locais de estoque cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando locais...</span>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum local de estoque cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {location.name}
                      </div>
                    </TableCell>
                    <TableCell>{location.description || '-'}</TableCell>
                    <TableCell>{location.address || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? "default" : "secondary"}>
                        {location.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                  <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => location.id && handleDelete(location.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Local de Estoque</DialogTitle>
            <DialogDescription>
              Atualize as informações do local de estoque
            </DialogDescription>
          </DialogHeader>
          
          {editingLocation && (
            <EditLocationForm
              location={editingLocation}
              onSave={(formData) => editingLocation.id && handleUpdate(editingLocation.id, formData)}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingLocation(null);
              }}
              isSaving={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

