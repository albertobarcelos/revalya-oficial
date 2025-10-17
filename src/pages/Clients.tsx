import React, { useState, useEffect } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useDebounce } from "@/hooks/useDebounce";
import { Layout } from "@/components/layout/Layout";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { PaginationControls, usePaginationState } from "@/components/ui/pagination-controls";
import { UserPlus, Search, Mail, Phone, RefreshCw, Building2, Pencil, RotateCw, Download } from "lucide-react";
import { CreateClientForm } from "@/components/clients/CreateClientForm";
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
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Empresa</TableHead>
                      <TableHead className="hidden lg:table-cell">CPF/CNPJ</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Telefone</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="w-16 sm:w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <TableRowSkeleton key={index} columns={7} />
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
            <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
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
                  <p>Importar clientes do Asaas ou planilha</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="h-8 px-2 gap-1">
                          <UserPlus className="h-4 w-4" />
                          <span className="hidden sm:inline">Novo Cliente</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Novo Cliente</DialogTitle>
                          <DialogDescription>
                            Cadastre um novo cliente no sistema
                          </DialogDescription>
                        </DialogHeader>
                        <CreateClientForm onSuccess={(customerId) => {
                          // AIDEV-NOTE: Garantir fechamento imediato do modal após sucesso
                          setIsNewClientDialogOpen(false);
                          // Invalidar queries para atualizar lista de clientes
                          queryClient.invalidateQueries({ queryKey: ['customers'] });
                        }} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adicionar novo cliente</p>
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
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Empresa</TableHead>
                      <TableHead className="hidden lg:table-cell">CPF/CNPJ</TableHead>
                      <TableHead className="hidden sm:table-cell">Contato</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="w-16 sm:w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: pagination.itemsPerPage }).map((_, index) => (
                      <TableRowSkeleton key={index} columns={7} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : paginatedCustomers.length === 0 ? (
              <div className="flex items-center justify-center py-8 rounded-md border">
                <div className="text-center text-muted-foreground">
                  {searchTerm ? 'Nenhum cliente encontrado para a busca' : 'Nenhum cliente cadastrado'}
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="max-h-[calc(100vh-20rem)] overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden md:table-cell">Empresa</TableHead>
                        <TableHead className="hidden lg:table-cell">CPF/CNPJ</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Telefone</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="w-16 sm:w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <div className="md:hidden text-xs text-muted-foreground mt-1 space-y-1">
                                {customer.company && (
                                  <div className="flex items-center">
                                    <Building2 className="mr-1 h-3 w-3" />
                                    <span className="truncate">{customer.company}</span>
                                  </div>
                                )}
                                {customer.cpf_cnpj && (
                                  <div className="lg:hidden">{formatCpfCnpj(customer.cpf_cnpj)}</div>
                                )}
                                <div className="sm:hidden flex flex-col space-y-1">
                                  {customer.email && (
                                    <div className="flex items-center">
                                      <Mail className="mr-1 h-3 w-3" />
                                      <span className="truncate text-xs">{customer.email}</span>
                                    </div>
                                  )}
                                  {customer.phone && (
                                    <div className="flex items-center">
                                      <Phone className="mr-1 h-3 w-3" />
                                      <span className="text-xs">{customer.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center">
                              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{customer.company || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="font-mono text-sm">
                              {customer.cpf_cnpj !== undefined ? formatCpfCnpj(customer.cpf_cnpj) : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {customer.email ? (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Mail className="mr-2 h-4 w-4" />
                                <span className="truncate max-w-32">{customer.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {customer.phone ? (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="mr-2 h-4 w-4" />
                                <span>{customer.phone}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              customer.active !== false 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.active !== false ? 'Ativo' : 'Inativo'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingCustomer(customer)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar cliente</p>
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
            <CardFooter>
              <PaginationControls
                currentPage={pagination.currentPage}
                totalItems={total}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setCurrentPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
                statusTextTemplate={(start, end, total) => 
                  `Mostrando ${start} a ${end} de ${total} clientes`
                }
                showNavigationButtons={true}
                showItemsPerPageSelector={true}
                showStatusText={true}
                isLoading={isLoading}
              />
            </CardFooter>
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
