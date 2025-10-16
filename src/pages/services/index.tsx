/**
 * Página de Gerenciamento de Serviços
 * 
 * AIDEV-NOTE: Implementa interface moderna com Shadcn/UI + UIverse + Motion.dev
 * seguindo o padrão de segurança multi-tenant obrigatório.
 * Refatorada para usar PageLayout reutilizável.
 * 
 * @module ServicesPage
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  AlertCircle,
  Package
} from 'lucide-react';

// Shadcn/UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Hooks e Utilitários
import { useServices, Service } from '@/hooks/useServices';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { usePagination } from '@/hooks/usePagination';
import { Layout } from '@/components/layout/Layout';
import { PageLayout } from '@/components/layout/PageLayout';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Componente de Edição Reutilizável
import { EditModal } from '@/components/shared/EditModal';

// AIDEV-NOTE: Função para traduzir unidades do inglês para português
const translateUnit = (unit: string): string => {
  const unitTranslations: Record<string, string> = {
    'kilometer': 'quilômetro',
    'km': 'km',
    'meter': 'metro',
    'm': 'm',
    'day': 'dia',
    'hour': 'hora',
    'minute': 'minuto',
    'second': 'segundo',
    'week': 'semana',
    'month': 'mês',
    'year': 'ano',
    'piece': 'peça',
    'unit': 'unidade',
    'service': 'serviço',
    'project': 'projeto',
    'consultation': 'consulta',
    'session': 'sessão',
    'package': 'pacote',
    'license': 'licença'
  };
  
  return unitTranslations[unit.toLowerCase()] || unit;
};

/**
 * Componente principal da página de serviços
 * 
 * AIDEV-NOTE: Interface moderna com microinterações fluidas e design exclusivo
 * Refatorada para usar PageLayout padronizado
 */
export default function ServicesPage() {
  // 🔐 GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, isLoading: accessLoading, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🔍 DEBUG: Log do estado de acesso
  console.log('🔍 [ServicesPage] Estado de acesso:', {
    hasAccess,
    accessLoading,
    accessError,
    currentTenant: currentTenant ? {
      id: currentTenant.id,
      name: currentTenant.name,
      slug: currentTenant.slug,
      active: currentTenant.active
    } : null
  });
  
  // Estados locais
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { toast } = useToast();
  
  // 🔍 FILTROS PARA O HOOK SEGURO (simplificados)
  const serviceFilters = useMemo(() => ({
    searchTerm: searchTerm.trim() || undefined,
    orderBy: 'name' as const,
    orderDirection: 'asc' as const,
    useCache: true
  }), [searchTerm]);
  
  // 🔐 HOOK SEGURO PARA DADOS
  const { 
    services, 
    isLoading, 
    error, 
    refresh,
    deleteService,
    updateServiceMutation,
    createServiceMutation 
  } = useServices(serviceFilters);

  // AIDEV-NOTE: Hook de paginação com comportamento responsivo
  const pagination = usePagination({
    totalItems: services?.length || 0,
    defaultItemsPerPage: 50,
    enableResponsive: true
  });

  // AIDEV-NOTE: Filtrar serviços para a página atual
  const paginatedServices = useMemo(() => {
    if (!services) return [];
    return services.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [services, pagination.startIndex, pagination.endIndex]);
  
  // 🛡️ VERIFICAÇÃO DE ACESSO
  if (accessLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Verificando permissões...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (hasAccess === false) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Acesso Negado</h3>
                  <p className="text-muted-foreground">
                    {accessError || 'Você não tem permissão para acessar esta página.'}
                  </p>
                  {currentTenant && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Tenant: {currentTenant.name} ({currentTenant.active ? 'ativo' : 'inativo'})
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  
  // 🗑️ HANDLER PARA EXCLUSÃO
  const handleDeleteService = async (service: Service) => {
    try {
      await deleteService(service.id);
      toast({
        title: "Serviço excluído",
        description: `O serviço "${service.name}" foi excluído com sucesso.`,
      });
      refresh();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o serviço. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // ✏️ HANDLER PARA EDIÇÃO
  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsEditModalOpen(true);
  };

  // AIDEV-NOTE: Função para validar código duplicado
  const handleCodeValidation = async (code: string, currentId?: string): Promise<boolean> => {
    try {
      console.log('🔍 Validando código:', { code, currentId, tenantId: currentTenant?.id });
      
      // AIDEV-NOTE: Verificar se temos tenant válido
      if (!currentTenant?.id) {
        console.log('❌ Tenant não disponível para validação');
        return false;
      }
      
      if (!code || code.length < 2) {
        console.log('❌ Código muito curto ou vazio');
        return false;
      }
      
      // AIDEV-NOTE: Usar os serviços já carregados pelo hook useServices
      console.log('📋 Serviços disponíveis no hook:', { services, count: services?.length });
      
      if (!services || services.length === 0) {
        console.log('⚠️ Nenhum serviço carregado ainda, fazendo consulta direta...');
        
        // Fallback: consulta direta ao Supabase
        let query = supabase
          .from('services')
          .select('id, code, name')
          .eq('code', code)
          .eq('tenant_id', currentTenant.id);
        
        if (currentId) {
          query = query.neq('id', currentId);
        }
        
        const { data, error } = await query;
        
        console.log('📊 Resultado da consulta direta:', { 
          code, 
          data, 
          error, 
          count: data?.length
        });
        
        if (error) {
          console.error('❌ Erro ao validar código:', error);
          return false;
        }
        
        const isDuplicate = data && data.length > 0;
        console.log('🎯 Código duplicado (consulta direta)?', isDuplicate);
        return isDuplicate;
      }
      
      // AIDEV-NOTE: Usar os dados já carregados (método preferido)
      const duplicateServices = services.filter(service => {
        // Filtrar por código igual
        const sameCode = service.code === code;
        // Se estamos editando, excluir o próprio registro
        const notSameId = currentId ? service.id !== currentId : true;
        
        return sameCode && notSameId;
      });
      
      console.log('📊 Validação usando dados carregados:', { 
        code, 
        totalServices: services.length,
        duplicateServices,
        count: duplicateServices.length,
        currentId
      });
      
      const isDuplicate = duplicateServices.length > 0;
      console.log('🎯 Código duplicado (dados carregados)?', isDuplicate);
      
      return isDuplicate;
    } catch (error) {
      console.error('❌ Erro na validação de código:', error);
      return false;
    }
  };

  // AIDEV-NOTE: Handler para abrir modal de criação de novo serviço
  const handleCreateService = () => {
    setSelectedService(null); // Garantir que não há serviço sendo editado
    setIsCreateModalOpen(true);
  };
  // AIDEV-NOTE: Handler unificado para salvar (criação e edição)
  const handleSaveService = async (serviceData: any) => {
    try {
      if (editingService) {
        // Edição: usar updateServiceMutation
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          ...serviceData
        });
        toast({
          title: "Sucesso",
          description: "Serviço atualizado com sucesso!",
        });
        setIsEditModalOpen(false);
        setEditingService(null);
      } else {
        // Criação: usar createServiceMutation
        await createServiceMutation.mutateAsync(serviceData);
        toast({
          title: "Sucesso",
          description: "Serviço criado com sucesso!",
        });
        setIsCreateModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar serviço. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // AIDEV-NOTE: Handler para cancelar edição/criação
  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
    setEditingService(null);
  };

  // AIDEV-NOTE: Renderizar conteúdo da tabela
  const renderTableContent = () => {
    if (isLoading) {
      return (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Taxa (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retenção</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8 rounded-md border">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>Erro ao carregar serviços</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      );
    }

    if (!services || services.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 rounded-md border">
          <div className="text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2" />
            <p>Nenhum serviço encontrado</p>
            {searchTerm ? (
              <p className="text-sm">Tente um termo de busca diferente.</p>
            ) : (
              <div className="mt-4">
                <Button onClick={() => console.log('Criar primeiro serviço')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Serviço
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <div className="max-h-[calc(100vh-15rem)] overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Taxa (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retenção</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              <AnimatePresence>
                {paginatedServices.map((service, index) => (
                  <motion.tr
                    key={service.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleEditService(service)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.code ? (
                        <Badge variant="outline">{service.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                        {formatCurrency(service.default_price)}
                      </TableCell>
                      <TableCell>
                        {service.unit_type ? (
                          <Badge variant="outline">{translateUnit(service.unit_type)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    <TableCell>
                      {service.tax_rate > 0 ? (
                        <Badge variant="secondary">
                          {service.tax_rate}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={service.is_active ? "default" : "secondary"}
                        className={service.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {service.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {service.withholding_tax ? (
                        <Badge variant="destructive">Sim</Badge>
                      ) : (
                        <Badge variant="outline">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que o clique na lixeira abra a edição
                          handleDeleteService(service);
                        }}
                      >
                        <span className="sr-only">Excluir serviço</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <PageLayout
        title="Serviços"
        searchPlaceholder="Buscar serviço..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={refresh}
        isRefreshing={isLoading}
        actionButtons={
          <Button onClick={handleCreateService}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Serviço
          </Button>
        }
        cardTitle="Lista de Serviços"
        pagination={pagination}
      >
        {renderTableContent()}
      </PageLayout>

      {/* AIDEV-NOTE: Modal de Edição Reutilizável com configuração para serviços */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={handleCancelEdit}
        onSave={handleSaveService}
        title="Editar Serviço"
        data={editingService}
        entityType="service"
        isLoading={updateServiceMutation.isLoading}
        onCodeValidation={handleCodeValidation}
      />

      {/* AIDEV-NOTE: Modal de Criação Reutilizando o mesmo componente EditModal */}
      <EditModal
        isOpen={isCreateModalOpen}
        onClose={handleCancelEdit}
        onSave={handleSaveService}
        title="Novo Serviço"
        data={null} // Sem dados para criação
        entityType="service"
        isLoading={createServiceMutation.isLoading}
        onCodeValidation={handleCodeValidation}
      />
    </Layout>
  );
}