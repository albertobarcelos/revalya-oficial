import { useState, useEffect } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { usePaginationState } from "@/components/ui/pagination-controls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Contract } from "@/types/models/contract";
import { Plus, Search, Trash2, Building2, Calendar, FileText, AlertTriangle, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatCpfCnpj } from "@/lib/utils";
import { ContractStatusDropdown } from "./ContractStatusDropdown";
import { Skeleton } from '@/components/ui/skeleton';

interface ContractListProps {
  onCreateContract: () => void;
  onViewContract?: (contractId: string) => void;
  onEditContract?: (contractId: string) => void;
}

export function ContractList({ onCreateContract, onViewContract, onEditContract }: ContractListProps) {
  const { toast } = useToast();
  
  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  // AIDEV-NOTE: Implementando debounce para busca em tempo real
  // Delay de 300ms para otimizar consultas ao banco sem prejudicar UX
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // AIDEV-NOTE: Usando hook personalizado para gerenciar estado de paginação
  const pagination = usePaginationState(25);
  
  // Estados para exclusão
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // AIDEV-NOTE: Usando busca dinâmica com debounce para otimizar performance
  const { 
    contracts, 
    pagination: paginationData,
    isLoading, 
    error, 
    refetch,
    deleteContract,
  } = useContracts({
    ...(statusFilter !== "ALL" && { status: statusFilter }),
    limit: pagination.itemsPerPage,
    page: pagination.currentPage,
    ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
  });
  
  // AIDEV-NOTE: Calcular paginação baseada no totalCount (agora com paginação no servidor)
  const total = paginationData?.total || 0;
  const totalPages = Math.ceil(total / pagination.itemsPerPage);
  
  // AIDEV-NOTE: Reset da página quando searchTerm ou statusFilter mudar
  useEffect(() => {
    pagination.resetToFirstPage();
  }, [debouncedSearchTerm, statusFilter, pagination.resetToFirstPage]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    pagination.resetToFirstPage(); // Resetar para primeira página ao buscar
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    pagination.resetToFirstPage(); // Resetar para primeira página ao filtrar
  };

  const handleViewContract = (id: string) => {
    if (onViewContract) {
      onViewContract(id);
    }
  };

  const handleEditContract = (id: string) => {
    if (onEditContract) {
      onEditContract(id);
    } else if (onViewContract) {
      onViewContract(id);
    }
  };

  const handleDeleteClick = () => {
    if (selectedContracts.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum contrato selecionado.",
        variant: "default"
      });
      return;
    }

    const selectedContractData = contracts?.filter((contract: Contract) => 
      selectedContracts.includes(contract.id)
    ) || [];
    
    const nonDraftContracts = selectedContractData.filter((contract: Contract) => 
      contract.status !== 'DRAFT'
    );
    
    if (nonDraftContracts.length > 0) {
      toast({
        title: "Erro",
        description: "Apenas contratos em rascunho podem ser excluídos.",
        variant: "destructive"
      });
      return;
    }

    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedContracts.length === 0) return;

    setIsDeleting(true);
    try {
      // AIDEV-NOTE: deleteContract é um objeto de mutação, usar mutateAsync
      for (const contractId of selectedContracts) {
        await deleteContract.mutateAsync(contractId);
      }
      
      toast({
        title: "Sucesso",
        description: `${selectedContracts.length} contrato(s) excluído(s) com sucesso.`,
        variant: "default"
      });
      
      setSelectedContracts([]);
      setShowDeleteDialog(false);
      
      // AIDEV-NOTE: Forçar refresh da lista após exclusão
      await refetch();
    } catch (error) {
      console.error('Erro ao excluir contratos:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir contratos. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Função para renderizar o tipo de faturamento
  const getBillingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'MONTHLY': 'Mensal',
      'QUARTERLY': 'Trimestral',
      'SEMIANNUAL': 'Semestral',
      'ANNUAL': 'Anual',
      'CUSTOM': 'Personalizado',
      'Mensal': 'Mensal',
      'Trimestral': 'Trimestral',
      'Semestral': 'Semestral',
      'Anual': 'Anual',
      'Único': 'Único'
    };
    return labels[type] || type || "Único";
  };

  return (
    <div className="flex-1 flex flex-col h-full p-4 md:p-8 pt-6 pb-0">
      <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between mb-2 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Contratos</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="SUSPENDED">Suspenso</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
              <SelectItem value="EXPIRED">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          {selectedContracts.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir ({selectedContracts.length})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-small">Excluir contratos selecionados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onCreateContract}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Contrato
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-small">Adicionar novo contrato</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="h-10">
                    <TableHead className="py-2 text-table font-medium">Número</TableHead>
                    <TableHead className="hidden md:table-cell py-2 text-table font-medium">Cliente</TableHead>
                    <TableHead className="hidden lg:table-cell py-2 text-table font-medium">CNPJ</TableHead>
                    <TableHead className="hidden sm:table-cell py-2 text-table font-medium">Status</TableHead>
                    <TableHead className="hidden md:table-cell py-2 text-table font-medium">Valor</TableHead>
                    <TableHead className="hidden md:table-cell py-2 text-table font-medium">Faturamento</TableHead>
                    <TableHead className="hidden lg:table-cell py-2 text-table font-medium">Início</TableHead>
                    <TableHead className="hidden lg:table-cell py-2 text-table font-medium">Fim</TableHead>
                    <TableHead className="w-16 sm:w-20 py-2 text-table font-medium">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: pagination.itemsPerPage }).map((_, index) => (
                    <TableRow key={index} className="h-12">
                      <TableCell className="py-1">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Skeleton height={16} width={16} circle />
                            <Skeleton height={16} width={64} />
                          </div>
                          <div className="md:hidden space-y-1">
                            <Skeleton height={12} width={128} />
                            <Skeleton height={12} width={96} />
                            <Skeleton height={20} width={80} borderRadius={999} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-1">
                        <div className="flex items-center gap-1.5">
                          <Skeleton height={14} width={14} circle />
                          <Skeleton height={16} width={128} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-1">
                        <Skeleton height={16} width={112} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-1">
                        <Skeleton height={20} width={80} borderRadius={999} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-1">
                        <Skeleton height={16} width={80} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-1">
                        <Skeleton height={16} width={64} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-1">
                        <div className="flex items-center gap-1.5">
                          <Skeleton height={14} width={14} circle />
                          <Skeleton height={16} width={80} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-1">
                        <div className="flex items-center gap-1.5">
                          <Skeleton height={14} width={14} circle />
                          <Skeleton height={16} width={80} />
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <Skeleton height={28} width={28} circle />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 rounded-md border">
              <div className="text-center text-destructive">
                <p className="text-body">
                  Erro ao carregar contratos
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="mt-2"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : contracts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-md border">
              <img 
                src="/images/contract page/no_contracts.png" 
                alt="Nenhum contrato encontrado"
                className="max-w-md w-full h-auto mb-4"
              />
              <div className="text-center text-muted-foreground">
                <p className="text-body font-medium">
                  {searchTerm || statusFilter !== "ALL" 
                    ? 'Nenhum contrato encontrado para a busca' 
                    : 'Nenhum contrato cadastrado'}
                </p>
                {!searchTerm && statusFilter === "ALL" && (
                  <p className="text-sm mt-2 text-muted-foreground/80">
                    Clique em "Novo Contrato" para começar
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="h-10">
                      <TableHead className="py-2 text-table font-medium">Número</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Cliente</TableHead>
                      <TableHead className="hidden lg:table-cell py-2 text-table font-medium">CNPJ</TableHead>
                      <TableHead className="hidden sm:table-cell py-2 text-table font-medium">Status</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Valor</TableHead>
                      <TableHead className="hidden md:table-cell py-2 text-table font-medium">Faturamento</TableHead>
                      <TableHead className="hidden lg:table-cell py-2 text-table font-medium">Início</TableHead>
                      <TableHead className="hidden lg:table-cell py-2 text-table font-medium">Fim</TableHead>
                      <TableHead className="w-16 sm:w-20 py-2 text-table font-medium">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts?.map((contract: Contract) => (
                      <TableRow key={contract.id} className="hover:bg-muted/50 h-12">
                        <TableCell className="font-medium py-1">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-table">{contract.contract_number}</span>
                            </div>
                            <div className="md:hidden text-table mt-0.5 space-y-0.5">
                              {contract.customers?.name && (
                                <div className="flex items-center">
                                  <Building2 className="mr-1 h-3 w-3" />
                                  <span className="truncate text-table">{contract.customers.name}</span>
                                </div>
                              )}
                              {contract.customers?.cpf_cnpj && (
                                <div className="lg:hidden text-table">{formatCpfCnpj(contract.customers.cpf_cnpj)}</div>
                              )}
                              <div className="sm:hidden">
                                <ContractStatusDropdown 
                                  contractId={contract.id}
                                  currentStatus={contract.status}
                                  contractNumber={contract.contract_number}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-1">
                          <div className="flex items-center">
                            <Building2 className="mr-1.5 h-3.5 w-3.5" />
                            <span className="truncate text-table">{contract.customers?.name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-1">
                          <span className="text-table">
                            {contract.customers?.cpf_cnpj !== undefined ? formatCpfCnpj(contract.customers.cpf_cnpj) : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-1">
                          <ContractStatusDropdown 
                            contractId={contract.id}
                            currentStatus={contract.status}
                            contractNumber={contract.contract_number}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-1">
                          <span className="text-table font-medium">
                            {formatCurrency(contract.total_amount - (contract.total_discount || 0))}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-1">
                          <span className="text-table">{getBillingTypeLabel(contract.billing_type)}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-1">
                          <div className="flex items-center text-table">
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            {format(parseISO(contract.initial_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-1">
                          <div className="flex items-center text-table">
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            {format(parseISO(contract.final_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-1">
                            {onEditContract ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleEditContract(contract.id)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-small">Editar contrato</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : onViewContract ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleViewContract(contract.id)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-small">Visualizar contrato</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                          </div>
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
          <div className="flex-shrink-0 border-t">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedContracts.length} contrato(s)? 
              Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Excluindo..." : "Excluir Contratos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
