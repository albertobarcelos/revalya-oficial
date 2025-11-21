import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useContracts } from "@/hooks/useContracts";
import { useCustomers } from "@/hooks/useCustomers";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Contract } from "@/types/models/contract";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Trash2, Eye, Building2, Calendar, FileText, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { ContractStatusDropdown } from "./ContractStatusDropdown";

interface ContractListProps {
  onCreateContract: () => void;
  onViewContract?: (contractId: string) => void;
  onEditContract?: (contractId: string) => void;
}

export function ContractList({ onCreateContract, onViewContract, onEditContract }: ContractListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const queryClient = useQueryClient();
  const { customers } = useCustomers();
  
  const { 
    contracts, 
    pagination,
    isLoading, 
    error, 
    refetch,
    deleteContract,
    refreshContracts
  } = useContracts({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    limit: itemsPerPage,
    page: currentPage,
    search: searchTerm || undefined, // Passar searchTerm como filtro para o backend
  });

  // AIDEV-NOTE: Validação de página apenas quando pagination muda E não está carregando
  // CRÍTICO: Não corrigir página durante loading para evitar resetar página 2 para 1
  React.useEffect(() => {
    // AIDEV-NOTE: Não validar durante loading - aguardar dados chegarem
    if (isLoading) {
      return;
    }

    if (pagination && pagination.totalPages > 0) {
      // Apenas corrigir se a página atual for inválida E não estiver carregando
      if (currentPage > pagination.totalPages) {
        setCurrentPage(pagination.totalPages);
      } else if (currentPage < 1) {
        setCurrentPage(1);
      }
    } else if (pagination && pagination.totalPages === 0 && currentPage > 1) {
      // Se não houver páginas mas estiver em página > 1, resetar
      setCurrentPage(1);
    }
    // Removido currentPage das dependências para evitar loops
  }, [pagination, isLoading]);

  // AIDEV-NOTE: Invalidar cache quando página muda para garantir que nova query seja executada
  // Com staleTime: 0 e query key mudando, isso garante que dados sejam atualizados imediatamente
  React.useEffect(() => {
    if (currentPage > 0) {
      // Invalidar queries de contratos para forçar refetch com nova página
      queryClient.invalidateQueries({ 
        queryKey: ['contracts'],
        exact: false 
      });
    }
  }, [currentPage, queryClient]);

  // Força refresh quando o componente é montado
  // REMOVIDO: O useSecureTenantQuery já gerencia o ciclo de vida da query automaticamente
  // React.useEffect(() => {
  //   refreshContracts();
  // }, [refreshContracts]);

  const navigate = useNavigate();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContracts(contracts?.map(c => c.id) || []);
    } else {
      setSelectedContracts([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedContracts(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  // Função para renderizar o indicador de status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-success hover:bg-success/90 text-white">Ativo</Badge>;
      case "DRAFT":
        return <Badge variant="outline">Rascunho</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Suspenso</Badge>;
      case "CANCELED":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary">Expirado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Função para renderizar o status do estágio
  const renderStageBadge = (stage: any) => {
    if (!stage) return null;
    
    return (
      <Badge 
        style={{ 
          backgroundColor: stage.color || "#888", 
          color: "#fff"
        }}
      >
        {stage.name}
      </Badge>
    );
  };

  // Função para renderizar o tipo de faturamento
  const getBillingTypeLabel = (type: string) => {
    return type || "Único";
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

  const handleCreateContract = () => {
    onCreateContract();
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

    const selectedContractData = contracts?.filter(contract => 
      selectedContracts.includes(contract.id)
    ) || [];
    
    const nonDraftContracts = selectedContractData.filter(contract => 
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

  return (
    <div className="flex flex-col h-full space-y-4">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0 w-full flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar contratos..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 w-80"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
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
          <div className="flex items-center gap-2">
            {selectedContracts.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteClick}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir ({selectedContracts.length})
              </Button>
            )}
            <Button onClick={onCreateContract}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <span>Carregando...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center p-6 text-destructive">
              <span>Erro ao carregar contratos</span>
            </div>
          ) : contracts?.length === 0 ? (
            <div className="flex justify-center p-6 text-muted-foreground">
              <span>Nenhum contrato encontrado</span>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Checkbox checked={selectedContracts.length === contracts.length} onCheckedChange={handleSelectAll} /></TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Faturamento</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts?.map((contract: Contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedContracts.includes(contract.id)}
                          onCheckedChange={(checked) => handleSelect(contract.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {contract.contract_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          {contract.customers?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ContractStatusDropdown 
                          contractId={contract.id}
                          currentStatus={contract.status}
                        />
                      </TableCell>
                      <TableCell>{renderStageBadge(contract.stage)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(contract.total_amount - (contract.total_discount || 0))}
                      </TableCell>
                      <TableCell>{getBillingTypeLabel(contract.billing_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {format(parseISO(contract.initial_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {format(parseISO(contract.final_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewContract(contract.id);
                          }}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t px-6 py-4 flex-shrink-0 bg-muted/30">
          <PaginationControls
            currentPage={currentPage}
            totalItems={pagination?.total || 0}
            itemsPerPage={itemsPerPage}
            onPageChange={(newPage) => {
              // Validar que a nova página está dentro dos limites válidos
              if (pagination) {
                const validPage = Math.max(1, Math.min(newPage, pagination.totalPages || 1));
                setCurrentPage(validPage);
              } else {
                setCurrentPage(Math.max(1, newPage));
              }
            }}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
            statusTextTemplate={(start, end, total) => `${total} contratos encontrados`}
            showItemsPerPageSelector={true}
            showStatusText={true}
            showNavigation={true}
          />
        </CardFooter>
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
