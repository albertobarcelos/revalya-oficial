import React, { useState, useEffect } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useDebounce } from "@/hooks/useDebounce";
import { Layout } from "@/components/layout/Layout";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { usePaginationState } from "@/components/ui/pagination-controls";
import { UserPlus, Search, Mail, Phone, RefreshCw, Building2, Pencil, RotateCw, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { ImportModal } from "@/components/clients/ImportModal";
import { ImportSuccessModal } from "@/components/clients/import/ImportSuccessModal";
import { ImportWizard } from "@/components/clients/import/ImportWizard";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatCpfCnpj } from "@/lib/utils";
import type { Customer } from "@/types/database";
import { TableRowSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Clients() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // PROTEÇÃO CRÍTICA CONTRA VAZAMENTO DE DADOS ENTRE TENANTS
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  const [searchTerm, setSearchTerm] = useState("");
  // AIDEV-NOTE: Implementando debounce para busca em tempo real
  // Delay de 300ms para otimizar consultas ao banco sem prejudicar UX
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // AIDEV-NOTE: Usando hook personalizado para gerenciar estado de paginação
  const pagination = usePaginationState(10);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Estados para importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importWizardData, setImportWizardData] = useState<any[]>([]);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importType, setImportType] = useState<'asaas' | 'csv' | null>(null);
  
  // AIDEV-NOTE: Estados para controle da importação e UX
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    status: string;
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  
  const { toast } = useToast();

  // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL
  // AIDEV-NOTE: Usando busca dinâmica com debounce para otimizar performance
  // A busca agora é executada automaticamente conforme o usuário digita
  const { customers: allCustomers, isLoading, refetch, totalCount } = useCustomers({
    searchTerm: debouncedSearchTerm,
    page: pagination.currentPage,
    limit: pagination.itemsPerPage
  });

  // AIDEV-NOTE: Função para simular progresso da importação
  const simulateImportProgress = (total: number) => {
    return new Promise<void>((resolve) => {
      let current = 0;
      const interval = setInterval(() => {
        current++;
        setImportProgress({
          current,
          total,
          status: current === total ? 'Finalizando...' : `Processando cliente ${current}...`
        });
        
        if (current >= total) {
          clearInterval(interval);
          setTimeout(() => {
            resolve();
          }, 500); // Pequena pausa para mostrar "Finalizando..."
        }
      }, 200); // Atualiza a cada 200ms
    });
  };

  // AIDEV-NOTE: Calcular paginação baseada no totalCount (agora com paginação no servidor)
  const total = totalCount || 0;
  const totalPages = Math.ceil(total / pagination.itemsPerPage);
  
  // AIDEV-NOTE: Removendo paginação frontend já que agora é feita no servidor
  const paginatedCustomers = allCustomers || [];

  // AIDEV-NOTE: Reset da página quando searchTerm mudar (busca em tempo real)
  useEffect(() => {
    pagination.resetToFirstPage();
  }, [debouncedSearchTerm, pagination.resetToFirstPage]);

  // FORÇA LIMPEZA COMPLETA DO CACHE AO TROCAR TENANT
  useEffect(() => {
    if (currentTenant?.id) {
      console.log(` [CACHE] Limpando cache clientes para tenant: ${currentTenant.name} (${currentTenant.id})`);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.removeQueries({ queryKey: ['customers'] });
    }
  }, [currentTenant?.id, queryClient]);

  // DEBUG: Log do estado do tenant na página
  console.log(` [DEBUG] Clients Page - Tenant:`, {
    hasAccess,
    accessError,
    currentTenant,
    tenantId: currentTenant?.id,
    tenantName: currentTenant?.name,
    tenantSlug: currentTenant?.slug,
    urlSlug: slug,
    slugMatch: currentTenant?.slug === slug
  });

  // VALIDAÇÃO CRÍTICA: Verificar se o tenant corresponde ao slug da URL
  if (currentTenant && currentTenant.slug !== slug) {
    console.error(` [SECURITY BREACH] Tenant slug não corresponde à URL!`, {
      currentTenantSlug: currentTenant.slug,
      urlSlug: slug,
      currentTenantName: currentTenant.name,
      currentTenantId: currentTenant.id
    });
    
    // Forçar redirecionamento para o portal
    console.log(` [REDIRECT] Redirecionando para portal devido a incompatibilidade de tenant`);
    window.location.href = `/meus-aplicativos`;
    return null;
  }

  // GUARD CLAUSE CRÍTICO - IMPEDE RENDERIZAÇÃO SEM ACESSO VÁLIDO
  if (!hasAccess) {
    console.log(` [DEBUG] Acesso negado - hasAccess: ${hasAccess}, accessError: ${accessError}`);
    return (
      <Layout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-10 w-full md:w-80" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="py-2 text-table font-medium">Nome</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Empresa</TableHead>
                      <TableHead className="hidden lg:table-cell py-2 text-table font-medium">CPF/CNPJ</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell py-2 text-table font-medium">Email</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Telefone</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Status</TableHead>
                      <TableHead className="w-16 sm:w-20 py-2 text-table font-medium">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <TableRowSkeleton key={index} columns={8} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // AUDIT LOG: Página renderizada com sucesso
  console.log(` [AUDIT] Página Clientes renderizada para tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    pagination.resetToFirstPage(); // Resetar para primeira página ao buscar
  };



  return (
    <Layout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Clientes</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Importar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-small">Importar clientes do Asaas ou planilha</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CreateClientDialog 
                      trigger={
                        <Button>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Novo Cliente
                        </Button>
                      }
                      onClientCreated={() => {
                        queryClient.invalidateQueries({ queryKey: ['customers'] });
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-small">Adicionar novo cliente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="py-2 text-table font-medium">Nome</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Empresa</TableHead>
                      <TableHead className="hidden lg:table-cell py-2 text-table font-medium">CPF/CNPJ</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell py-2 text-table font-medium">Contato</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Status</TableHead>
                      <TableHead className="w-16 sm:w-20 py-2 text-table font-medium">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: pagination.itemsPerPage }).map((_, index) => (
                      <TableRowSkeleton key={index} columns={8} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : paginatedCustomers.length === 0 ? (
              <div className="flex items-center justify-center py-8 rounded-md border">
                <div className="text-center text-muted-foreground">
                  <p className="text-body">
                    {searchTerm ? 'Nenhum cliente encontrado para a busca' : 'Nenhum cliente cadastrado'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="max-h-[calc(100vh-16rem)] overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="h-10">
                        <TableHead className="py-2 text-table font-medium">Nome</TableHead>
                        <TableHead className="hidden md:table-cell py-2 text-table font-medium">Empresa</TableHead>
                        <TableHead className="hidden lg:table-cell py-2 text-table font-medium">CPF/CNPJ</TableHead>
                        <TableHead className="hidden md:table-cell py-2 text-table font-medium">Tipo</TableHead>
                        <TableHead className="hidden sm:table-cell py-2 text-table font-medium">Email</TableHead>
                        <TableHead className="hidden md:table-cell py-2 text-table font-medium">Telefone</TableHead>
                        <TableHead className="hidden md:table-cell py-2 text-table font-medium">Status</TableHead>
                        <TableHead className="w-16 sm:w-20 py-2 text-table font-medium">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-muted/50 h-12">
                          <TableCell className="font-medium py-1">
                            <div className="flex flex-col">
                              <span className="text-table">{customer.name}</span>
                              <div className="md:hidden text-table mt-0.5 space-y-0.5">
                                {customer.company && (
                                  <div className="flex items-center">
                                    <Building2 className="mr-1 h-3 w-3" />
                                    <span className="truncate text-table">{customer.company}</span>
                                  </div>
                                )}
                                {customer.cpf_cnpj && (
                                  <div className="lg:hidden text-table">{formatCpfCnpj(customer.cpf_cnpj)}</div>
                                )}
                                <div className="sm:hidden flex flex-col space-y-0.5">
                                  {customer.email && (
                                    <div className="flex items-center">
                                      <Mail className="mr-1 h-3 w-3" />
                                      <span className="truncate text-table">{customer.email}</span>
                                    </div>
                                  )}
                                  {customer.phone && (
                                    <div className="flex items-center">
                                      <Phone className="mr-1 h-3 w-3" />
                                      <span className="text-table">{customer.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-1">
                            <div className="flex items-center">
                              <Building2 className="mr-1.5 h-3.5 w-3.5" />
                              <span className="truncate text-table">{customer.company || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell py-1">
                            <span className="text-table">
                              {customer.cpf_cnpj !== undefined ? formatCpfCnpj(customer.cpf_cnpj) : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-1">
                            <div className="flex gap-1 flex-wrap">
                              {customer.is_supplier && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                  Fornecedor
                                </Badge>
                              )}
                              {customer.is_carrier && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
                                  Transportadora
                                </Badge>
                              )}
                              {!customer.is_supplier && !customer.is_carrier && (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell py-1">
                            {customer.email ? (
                              <div className="flex items-center text-table">
                                <Mail className="mr-1.5 h-3.5 w-3.5" />
                                <span className="truncate max-w-28">{customer.email}</span>
                              </div>
                            ) : (
                              <span className="text-table">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-1">
                            {customer.phone ? (
                              <div className="flex items-center text-table">
                                <Phone className="mr-1.5 h-3.5 w-3.5" />
                                <span className="text-table">{customer.phone}</span>
                              </div>
                            ) : (
                              <span className="text-table">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-1">
                            <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-table font-medium ${
                              customer.active !== false 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.active !== false ? 'Ativo' : 'Inativo'}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setEditingCustomer(customer)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-small">Editar cliente</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
          
          {!isLoading && total > 0 && (
            <div className="flex-shrink-0">
              <PaginationFooter
                currentPage={pagination.currentPage}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setCurrentPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
                isLoading={isLoading}
              />
            </div>
          )}
        </Card>

        {editingCustomer && (
          <EditClientDialog
            customer={editingCustomer}
            open={!!editingCustomer}
            onOpenChange={(open) => !open && setEditingCustomer(null)}
            onSuccess={() => {
              setEditingCustomer(null);
              refetch(searchTerm, pagination.itemsPerPage, pagination.currentPage);
            }}
          />
        )}

        {/* Modal de Importação */}
        <ImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onImportData={(data, type) => {
            setImportWizardData(data);
            setImportType(type);
            setShowImportWizard(true);
            setIsImportModalOpen(false);
          }}
        />

        {/* Wizard de Configuração da Importação */}
        <ImportWizard
          open={showImportWizard}
          onOpenChange={setShowImportWizard}
          data={importWizardData}
          sourceType={importType}
          onSuccess={(result) => {
            setImportResult(result);
            setShowSuccessModal(true);
            setShowImportWizard(false);
            refetch(searchTerm, pagination.itemsPerPage, pagination.currentPage);
          }}
        />

        {/* Modal de Sucesso da Importação */}
        <ImportSuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          result={importResult}
        />
      </div>
    </Layout>
  );
}
