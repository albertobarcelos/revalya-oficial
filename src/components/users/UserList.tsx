import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditUserRoleDialog } from "@/components/users/EditUserRoleDialog";
import { UserFilters } from "@/components/users/UserFilters";
import { UserEmptyState } from "@/components/users/UserEmptyState";
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from "@/components/ui/use-toast";

interface UserListProps {
  tenantId: string;
  onInviteUser?: () => void;
}

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  created_at: string;
}

export function UserList({ tenantId, onInviteUser }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  // Buscar usuários do tenant do Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      if (!tenantId) return;
      
      try {
        setIsLoading(true);
        
        // Validar se o tenantId parece ser um UUID válido (formato básico)
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        
        if (!isValidUUID) {
          console.warn("TenantID não é um UUID válido:", tenantId);
          setIsLoading(false);
          return;
        }
        
        // Tentar usar a nova função RPC
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_tenant_users_v2', { tenant_id_param: tenantId });
          
        if (!rpcError && rpcData) {
          setUsers(rpcData);
          setFilteredUsers(rpcData);
          setIsLoading(false);
          return;
        }
        
        console.warn("Falha ao usar RPC get_tenant_users_v2:", rpcError);
        
        // Fallback para o método original
        const { data, error } = await supabase
          .from('tenant_users')
          .select(`
            id,
            role,
            created_at,
            user:user_id (
              id,
              email,
              name
            )
          `)
          .eq('tenant_id', tenantId);
          
        if (error) throw error;
        
        // Transformar os dados para o formato esperado
        const formattedUsers = (data || []).map((item) => ({
          id: item.user.id,
          email: item.user.email,
          name: item.user.name,
          role: item.role,
          created_at: item.created_at
        }));
        
        setUsers(formattedUsers);
        setFilteredUsers(formattedUsers);
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [tenantId, supabase, refreshTrigger]);
  
  // Filtrar usuários com base no termo de busca e filtro de papel
  useEffect(() => {
    let filtered = [...users];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        user => 
          user.email.toLowerCase().includes(term) || 
          (user.name && user.name.toLowerCase().includes(term))
      );
    }
    
    // Filtrar por papel
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };
  
  const handleRoleChangeSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };
  
  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este usuário?")) {
      return;
    }
    
    try {
      // Tentar usar a nova função RPC
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('remove_tenant_user_v2', { 
          tenant_id_param: tenantId,
          user_id_param: userId
        });
      
      if (rpcError) {
        console.warn("Erro na RPC remove_tenant_user_v2:", rpcError);
        throw rpcError;
      }
      
      if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.message || "Não foi possível remover o usuário");
      }
      
      // Se RPC funcionou
      if (rpcResult && rpcResult.success) {
        // Atualizar a lista removendo o usuário
        setUsers(users.filter(user => user.id !== userId));
        
        toast({
          title: "Usuário removido",
          description: "O usuário foi removido com sucesso do tenant.",
        });
        return;
      }
      
      // Fallback para o método original
      const { error } = await supabase
        .from('tenant_users')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      // Atualizar a lista removendo o usuário
      setUsers(users.filter(user => user.id !== userId));
      
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso do tenant.",
      });
    } catch (error: any) {
      console.error('Erro ao remover usuário:', error);
      toast({
        title: "Erro ao remover usuário",
        description: error.message || "Não foi possível remover o usuário. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };
  
  const handleRoleFilterChange = (value: string | null) => {
    setRoleFilter(value);
  };
  
  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter(null);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-md">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        <span className="text-muted-foreground">Carregando usuários...</span>
      </div>
    );
  }
  
  if (users.length === 0) {
    return (
      <UserEmptyState 
        isSearching={false}
        onInvite={onInviteUser}
      />
    );
  }
  
  const isFiltering = !!searchTerm || !!roleFilter;
  const showEmptyState = filteredUsers.length === 0 && isFiltering;
  
  return (
    <div className="space-y-4">
      <UserFilters 
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchChange={handleSearchChange}
        onRoleFilterChange={handleRoleFilterChange}
        onClearFilters={clearFilters}
      />
      
      {showEmptyState ? (
        <UserEmptyState 
          isSearching={true}
          searchTerm={searchTerm || (roleFilter ? `papel ${roleFilter}` : '')}
          onClear={clearFilters}
        />
      ) : (
        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted/10 grid grid-cols-4 gap-4 p-4 font-medium text-sm border-b">
            <div>Usuário</div>
            <div>Papel</div>
            <div>Data de Inclusão</div>
            <div className="text-right">Ações</div>
          </div>
          
          <div className="divide-y">
            {filteredUsers.map((user) => (
              <div key={user.id} className="grid grid-cols-4 gap-4 p-4 items-center text-sm hover:bg-muted/5 transition-colors">
                <div>
                  <div className="font-medium">{user.name || 'N/A'}</div>
                  <div className="text-muted-foreground text-xs">{user.email}</div>
                </div>
                <div>
                  <Badge variant="outline" className={`
                    ${user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : ''}
              ${user.role === 'MANAGER' ? 'bg-purple-500/10 text-purple-500' : ''}
              ${user.role === 'TENANT_USER' ? 'bg-success/10 text-success' : ''}
                  `}>
                    {user.role === 'ADMIN' ? 'Administrador' : 
                     user.role === 'TENANT_ADMIN' ? 'Admin do Tenant' : 
                     user.role === 'TENANT_USER' ? 'Usuário' : user.role}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    className="hover:text-primary transition-colors"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm" 
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleRemoveUser(user.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedUser && (
        <EditUserRoleDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          user={selectedUser}
          tenantId={tenantId}
          onSuccess={handleRoleChangeSuccess}
        />
      )}
    </div>
  );
}
