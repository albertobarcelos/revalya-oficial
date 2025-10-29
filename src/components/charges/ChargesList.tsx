import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { SearchIcon, Info, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useCharges } from "@/hooks/useCharges";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BulkMessageDialog } from "./BulkMessageDialog";
import { ChargeDetailDrawer } from "./ChargeDetailDrawer";
import { formatCpfCnpj, formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { messageService } from "@/services/messageService";
import { supabase } from '@/lib/supabase';
import type { Charge } from "@/hooks/useCharges";
import { format } from "date-fns";

import { processMessageTags } from '@/utils/messageUtils';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { formatInstallmentDisplay, getInstallmentBadgeVariant } from '@/utils/installmentUtils';

const formatChargeType = (type: string | null, status?: string | null): string => {
  if (status === "RECEIVED") {
    return "DINHEIRO";
  }
  
  if (!type) return "Regular";
  
  const typeMap: Record<string, string> = {
    'CREDIT_CARD': 'CARTÃO DE CRÉDITO',
    'BOLETO': 'BOLETO',
    'PIX': 'PIX',
    'UNDEFINED': 'NÃO DEFINIDO',
    'BANK_SLIP': 'BOLETO BANCÁRIO',
    'CREDIT_CARD_RECURRING': 'CARTÃO DE CRÉDITO RECORRENTE',
    'TRANSFER': 'TRANSFERÊNCIA',
    'DEPOSIT': 'DEPÓSITO',
    'CASH': 'DINHEIRO',
    'MONTHLY': 'MENSAL',
    'INSTALLMENT': 'PARCELA'
  };

  return typeMap[type] || type;
};

// AIDEV-NOTE: Função movida para utils/installmentUtils.ts para reutilização

export function ChargesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isSendingMessages, setIsSendingMessages] = useState(false);
  const { toast } = useToast();

  const { data: chargesData, total, isLoading, refetch, cancelCharge, exportToCSV } = useCharges({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    startDate: dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined,
    endDate: dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined,
  });

  // AIDEV-NOTE: Hook useCharges corrigido - agora retorna data diretamente

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range || {
      from: new Date(new Date().setDate(1)),
      to: new Date(),
    });
    setCurrentPage(1);
  };

  const handleViewCharge = (charge: Cobranca) => {
    // AIDEV-NOTE: Debug - Log da cobrança selecionada para abertura do drawer
    console.log('🔍 ChargesList - Cobrança selecionada para visualização:', {
      chargeId: charge.id,
      customerName: charge.customers?.name,
      amount: charge.valor,
      status: charge.status,
      dueDate: charge.data_vencimento,
      fullCharge: charge
    });
    
    // AIDEV-NOTE: Debug específico para dados do customer
    console.log('🔍 ChargesList - Dados do customer:', {
      hasCustomer: !!charge.customers,
      customerData: charge.customers,
      name: charge.customers?.name,
      company: charge.customers?.company,
      cpfCnpj: charge.customers?.cpf_cnpj
    });
    
    setSelectedCharge(charge);
    setIsDetailDrawerOpen(true);
  };

  const handleCancelCharge = async (chargeId: string) => {
    try {
      await cancelCharge(chargeId);
      toast({
        title: "Sucesso!",
        description: "Cobrança cancelada com sucesso!",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao cancelar cobrança:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a cobrança.",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await exportToCSV({
        searchTerm,
        status: selectedStatus,
        type: selectedType,
        dateRange,
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `charges-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportação concluída",
        description: "O arquivo CSV foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao exportar cobranças:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar as cobranças. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessages = async (templateId: string, customMessage?: string) => {
    setIsSendingMessages(true);
    try {
      const result = await messageService.sendBulkMessages(selectedCharges, templateId, customMessage);
      
      // Limpar seleção após o envio
      setSelectedCharges([]);
      setIsMessageDialogOpen(false);
      
      toast({
        title: "Mensagens enviadas com sucesso",
        description: `${result.count} mensagens foram enviadas.`,
        variant: "default",
      });
      
      return result.data;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagens:', error);
      
      toast({
        title: "Erro ao enviar mensagens",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao enviar as mensagens.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessages(false);
    }
  };

  // AIDEV-NOTE: Hook useCharges corrigido - agora retorna data e total separadamente
  // Processamento correto dos dados das cobranças com paginação
  const charges = chargesData || [];
  const totalPages = Math.ceil(total / 10);

  // AIDEV-NOTE: Dados processados corretamente do hook useCharges

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCharges(charges.map(charge => charge.id));
    } else {
      setSelectedCharges([]);
    }
  };

  const handleChargeSelect = (chargeId: string, checked: boolean) => {
    if (checked) {
      setSelectedCharges(prev => [...prev, chargeId]);
    } else {
      setSelectedCharges(prev => prev.filter(id => id !== chargeId));
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => setCurrentPage(1)}>
            <span className="sr-only">Ir para primeira página</span>
            1
          </PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationLink disabled>...</PaginationLink>
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
            aria-current={currentPage === i ? 'page' : undefined}
          >
            <span className="sr-only">Página {i}</span>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationLink disabled>...</PaginationLink>
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => setCurrentPage(totalPages)}>
            <span className="sr-only">Ir para última página</span>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  const renderFilters = () => (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1 max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, empresa, CNPJ, valor ou descrição..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar cobranças"
        />
      </div>
      <div className="flex items-center gap-3">
        {selectedCharges.length > 0 && (
          <Button 
            onClick={() => setIsMessageDialogOpen(true)}
            aria-label={`Enviar mensagem para ${selectedCharges.length} cobranças selecionadas`}
          >
            Enviar Mensagem ({selectedCharges.length})
          </Button>
        )}
        <Select defaultValue="all" onValueChange={(value) => handleTypeChange(value)}>
          <SelectTrigger className="w-full sm:w-40 md:w-44" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="PIX">PIX</SelectItem>
            <SelectItem value="BOLETO">Boleto</SelectItem>
            <SelectItem value="CREDIT_CARD">Cartão de crédito</SelectItem>
            <SelectItem value="CREDIT_CARD_RECURRING">Cartão de crédito recorrente</SelectItem>
            <SelectItem value="TRANSFER">Transferência</SelectItem>
            <SelectItem value="CASH">Dinheiro</SelectItem>
            <SelectItem value="UNDEFINED">Não definido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-40 md:w-44" aria-label="Filtrar por status">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="OVERDUE">Atrasadas</SelectItem>
            <SelectItem value="RECEIVED">Recebidas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          date={dateRange}
          onDateChange={handleDateRangeChange}
          className="w-full sm:w-72 md:w-80"
        />
      </div>
    </div>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200">Pendente</Badge>;
      case "RECEIVED":
      case "CONFIRMED":
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Paga</Badge>;
      case "RECEIVED_IN_CASH":
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Pago Dinheiro</Badge>;
      case "RECEIVED_PIX":
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Pago PIX</Badge>;
      case "RECEIVED_BOLETO":
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Pago Boleto</Badge>;
      case "OVERDUE":
        return <Badge variant="destructive">Atrasada</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Reorganizei a estrutura para resolver problema de múltiplos scrolls
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Filtros fixos no topo */}
        <div className="sticky top-0 bg-background z-10 pb-4">
          {renderFilters()}
        </div>
        
        {/* Conteúdo com skeleton loading */}
        <div className="flex-1 overflow-hidden rounded-md border">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox disabled />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>N° Contrato</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={10} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  if (!charges.length) {
    return (
      <div className="flex flex-col h-full">
        {/* Filtros fixos no topo */}
        <div className="sticky top-0 bg-background z-10 pb-4">
          {renderFilters()}
        </div>
        
        {/* Mensagem de nenhuma cobrança */}
        <div className="flex-1 rounded-md border p-8 text-center">
          <p className="text-muted-foreground">Nenhuma cobrança encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filtros fixos no topo */}
      <div className="sticky top-0 bg-background z-10 pb-4">
        {renderFilters()}
      </div>
      
      {/* Tabela com scroll interno */}
      <div className="flex-1 rounded-md border overflow-hidden min-h-0">
        <div className="h-full overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={selectedCharges.length === charges.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todas as cobranças"
                  />
                </TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>N° Contrato</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((charge) => (
                <TableRow 
                  key={charge.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewCharge(charge)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedCharges.includes(charge.id)}
                      onCheckedChange={(checked) => handleChargeSelect(charge.id, checked === true)}
                      aria-label={`Selecionar cobrança de ${charge.customers?.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{charge.customers?.name}</span>
                      {charge.descricao && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-gray-900 transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{charge.descricao}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{charge.customers?.company || "-"}</TableCell>
                  <TableCell>{formatCpfCnpj(charge.customers?.cpf_cnpj)}</TableCell>
                  <TableCell className="font-medium text-blue-600">
                    {charge.contracts?.contract_number || 'N/A'}
                  </TableCell>
                  <TableCell>{formatCurrency(charge.valor)}</TableCell>
                  <TableCell>{formatDate(charge.data_vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={getInstallmentBadgeVariant(charge.descricao)} className="text-xs">
                      {formatInstallmentDisplay(charge.descricao)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatChargeType(charge.tipo, charge.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(charge.status || '')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Paginação fixa na parte inferior */}
      {total > 0 && (
        <div className="mt-2 flex items-center justify-between pb-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {charges.length} de {total} cobranças
          </p>
          <Pagination aria-label="Navegação de páginas">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                />
              </PaginationItem>
              
              {renderPaginationItems()}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Próxima página"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <BulkMessageDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        selectedCharges={selectedCharges}
        onSendMessages={handleSendMessages}
        isLoading={isSendingMessages}
      />

      <ChargeDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        charge={selectedCharge}
        onRefresh={refetch}
      />
    </div>
  );
}
