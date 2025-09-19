/**
 * Componente de listagem de clientes
 * 
 * Este componente exemplifica o uso da nova arquitetura para um recurso específico.
 * 
 * @module CustomerList
 */

import { useState } from 'react';
import { useCustomerList, useDeleteCustomer } from '../hooks/useCustomers';
import { useTenant } from '../../../core/tenant/UnifiedTenantProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
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
import { Link } from 'react-router-dom';
import { Search, Plus, RefreshCcw, Trash, Edit, User } from 'lucide-react';

/**
 * Componente para listagem de clientes
 */
export function CustomerList() {
  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Hooks
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { mutate: deleteCustomer, loading: deleteLoading } = useDeleteCustomer();
  
  // Obter lista de clientes usando o hook useTenantData personalizado
  const { 
    data: customers, 
    loading, 
    error, 
    refresh,
    invalidateCache
  } = useCustomerList({
    searchTerm,
    orderBy: 'name',
    orderDirection: 'asc',
    useCache: true
  });
  
  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleRefresh = () => {
    invalidateCache();
    refresh();
    toast({
      title: 'Lista atualizada',
      description: 'A lista de clientes foi atualizada.'
    });
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteCustomer(deleteId);
      
      toast({
        title: 'Cliente excluído',
        description: 'O cliente foi excluído com sucesso.',
        variant: 'default'
      });
      
      setDeleteId(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir cliente',
        description: error.message || 'Ocorreu um erro ao excluir o cliente.',
        variant: 'destructive'
      });
    }
  };
  
  // Renders
  if (!tenant) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed p-8 text-center">
        <div>
          <h3 className="mb-2 text-lg font-medium">Nenhum tenant selecionado</h3>
          <p className="text-sm text-muted-foreground">
            Selecione um tenant para visualizar os clientes.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          
          <Button asChild variant="default" size="sm">
            <Link to="./novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar clientes..."
            className="pl-8"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      
      {/* Mostrar loading */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}
      
      {/* Mostrar erro */}
      {error && !loading && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          <p>Erro ao carregar clientes: {error.message}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refresh}
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </div>
      )}
      
      {/* Mostrar tabela */}
      {!loading && !error && customers && (
        customers.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        customer.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button 
                          asChild
                          variant="ghost" 
                          size="icon"
                        >
                          <Link to={`./visualizar/${customer.id}`}>
                            <User className="h-4 w-4" />
                            <span className="sr-only">Visualizar</span>
                          </Link>
                        </Button>
                        
                        <Button
                          asChild
                          variant="ghost" 
                          size="icon"
                        >
                          <Link to={`./editar/${customer.id}`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Link>
                        </Button>
                        
                        <Button
                          variant="ghost" 
                          size="icon"
                          onClick={() => setDeleteId(customer.id)}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed p-8 text-center">
            <div>
              <h3 className="mb-2 text-lg font-medium">Nenhum cliente encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm 
                  ? 'Tente outro termo de busca ou limpe o filtro.' 
                  : 'Comece adicionando seu primeiro cliente.'}
              </p>
              {!searchTerm && (
                <Button asChild variant="default" size="sm" className="mt-4">
                  <Link to="./novo">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Cliente
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )
      )}
      
      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
