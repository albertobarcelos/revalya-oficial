import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Calendar, FileText, Plus, Search, Eye, Trash2, AlertTriangle } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useCustomers } from "@/hooks/useCustomers";
import { formatCurrency } from "@/lib/utils";
import { ContractStatusDropdown } from "@/components/contracts/ContractStatusDropdown";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Badge } from "@/components/ui/badge";
import { Contract } from "@/types/models/contract";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "primereact/multiselect"; // Adicionar se necessário, verificar convenções

interface ContractListProps {
  onCreateContract: () => void;
  onViewContract?: (contractId: string) => void;
  onEditContract?: (contractId: string) => void;
}

export function ContractList({ onCreateContract, onViewContract, onEditContract }: ContractListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  const { customers } = useCustomers();
  
  const { 
    contracts, 
    isLoading, 
    error, 
    refetch,
    deleteContract,
    refreshContracts
  } = useContracts({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    customerId: customerFilter !== "ALL" ? customerFilter : undefined,
    limit: itemsPerPage,
    page: currentPage,
  });

  // Listener para mudanças de rota - força refresh dos contratos
  React.useEffect(() => {
    const handleRouteChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        setCurrentPath(newPath);
        // Se mudou para a página de contratos, força refresh
        if (newPath.includes('/contracts')) {
          refreshContracts();
        }
      }
    };

    // Listener para mudanças no histórico do navegador
    window.addEventListener('popstate', handleRouteChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [currentPath, refreshContracts]);

  // Força refresh quando o componente é montado
  React.useEffect(() => {
    refreshContracts();
  }, [refreshContracts]);

  const navigate = useNavigate();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContracts(filteredContracts?.map(c => c.id) || []);
    } else {
      setSelectedContracts([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedContracts(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    );
  };



  // Filtrar contratos por termo de busca
  const filteredContracts = contracts?.filter((contract: Contract) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      contract.contract_number?.toLowerCase().includes(term) ||
      contract.customers?.name?.toLowerCase().includes(term) ||
      contract?.description?.toLowerCase().includes(term)
    );
  });

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
    // Agora os valores já vêm em português do banco
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
      // Fallback caso onEditContract não esteja disponível
      onViewContract(id);
    }
  };

  const handleCreateContract = () => {
    onCreateContract();
  };

  // AIDEV-NOTE: Função para abrir o modal de confirmação de exclusão
  const handleDeleteClick = () => {
    if (selectedContracts.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum contrato selecionado.",
        variant: "default"
      });
      return;
    }

    // Verificar se todos os contratos selecionados estão em status DRAFT
    const selectedContractData = filteredContracts?.filter(contract => 
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

  // AIDEV-NOTE: Função para confirmar e executar a exclusão de contratos
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Excluir contratos um por um usando mutateAsync
      for (const contractId of selectedContracts) {
        await deleteContract.mutateAsync(contractId);
      }
      
      // Refetch para atualizar a lista
      await refetch();
      
      // Limpar seleção após exclusão
      setSelectedContracts([]);
      setShowDeleteDialog(false);
      
      toast({
        title: "Sucesso!",
        description: `${selectedContracts.length} contrato(s) excluído(s) com sucesso.`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('Erro ao excluir contratos:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir contratos.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Verificar se há contratos DRAFT selecionados para habilitar o botão
  const selectedDraftContracts = filteredContracts?.filter(contract => 
    selectedContracts.includes(contract.id) && contract.status === 'DRAFT'
  ) || [];
  
  const canDeleteSelected = selectedDraftContracts.length > 0;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex w-full max-w-2xl items-center space-x-2">
          <Input
            placeholder="Buscar contratos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
          <Button variant="outline" size="sm" className="h-9 px-3 flex-shrink-0">
            <Search className="h-4 w-4" />
          </Button>
          
          {/* Filtros simples */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ACTIVE">Ativos</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="SUSPENDED">Suspensos</SelectItem>
              <SelectItem value="CANCELED">Cancelados</SelectItem>
              <SelectItem value="EXPIRED">Expirados</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {selectedContracts.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteClick}
              disabled={!canDeleteSelected}
              className="mr-2"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir ({selectedContracts.length})
            </Button>
          )}
          <Button onClick={onCreateContract}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle>Contratos</CardTitle>
          <CardDescription>
            Gerencie todos os contratos de sua empresa
          </CardDescription>
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
          ) : filteredContracts?.length === 0 ? (
            <div className="flex justify-center p-6 text-muted-foreground">
              <span>Nenhum contrato encontrado</span>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Checkbox checked={selectedContracts.length === filteredContracts.length} onCheckedChange={handleSelectAll} /></TableHead>
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
                  {filteredContracts?.map((contract: Contract) => (
                    <TableRow 
                      key={contract.id}
                    >
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
                        {/* AIDEV-NOTE: Exibindo valor final considerando desconto aplicado */}
                        {formatCurrency(contract.total_amount - (contract.total_discount || 0))}
                      </TableCell>
                      <TableCell>{getBillingTypeLabel(contract.billing_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {/* AIDEV-NOTE: Corrigido timezone - usar parseISO */}
                          {format(parseISO(contract.initial_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {/* AIDEV-NOTE: Corrigido timezone - usar parseISO */}
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
        <CardFooter className="flex items-center justify-between border-t p-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {filteredContracts?.length || 0} contratos encontrados
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(3, Math.ceil((contracts?.length || 0) / itemsPerPage)) }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => 
                    setCurrentPage((prev) => 
                      Math.min(prev + 1, Math.ceil((contracts?.length || 0) / itemsPerPage))
                    )
                  }
                  disabled={
                    currentPage === Math.ceil((contracts?.length || 0) / itemsPerPage) ||
                    (contracts?.length || 0) <= itemsPerPage
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
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
