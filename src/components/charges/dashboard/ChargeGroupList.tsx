import { useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bell, FileText, Building2, CreditCard, Search } from 'lucide-react';
import type { Cobranca } from '@/types/database';

// AIDEV-NOTE: Interface para props do componente de lista de cobranças do grupo
interface ChargeGroupListProps {
  selectedGroup: string | null;
  groupedCharges: {
    [key: string]: {
      charges: Cobranca[];
      color: string;
      label: string;
      daysUntilDue: number;
    };
  };
  selectedCharges: string[];
  overdueFilter: string;
  onClose: () => void;
  onChargeSelect: (chargeId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onViewCharge: (charge: Cobranca) => void;
  onSendMessages: () => void;
  onOverdueFilterChange: (filter: string) => void;
}

// AIDEV-NOTE: Função para traduzir status para português
const getStatusLabel = (status: string | null | undefined): string => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'Pago';
    case 'OVERDUE':
      return 'Vencido';
    case 'PENDING':
      return 'Pendente';
    case 'CANCELLED':
      return 'Cancelado';
    case 'PROCESSING':
      return 'Processando';
    default:
      return status || 'Indefinido';
  }
};

// AIDEV-NOTE: Função para obter cor do status
const getStatusColor = (status: string | null | undefined): string => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

// AIDEV-NOTE: Função para formatar documento CPF/CNPJ
const formatDocument = (document: string | number | null | undefined): string => {
  if (!document) return 'N/A';
  const cleanDoc = String(document).replace(/\D/g, '');
  if (cleanDoc.length === 11) {
    // CPF: 000.000.000-00
    return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleanDoc.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return String(document);
};

// AIDEV-NOTE: Componente separado para lista de cobranças do grupo selecionado
export function ChargeGroupList({
  selectedGroup,
  groupedCharges,
  selectedCharges,
  overdueFilter,
  onClose,
  onChargeSelect,
  onSelectAll,
  onViewCharge,
  onSendMessages,
  onOverdueFilterChange
}: ChargeGroupListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!selectedGroup) return null;

  const currentGroup = groupedCharges[selectedGroup];
  if (!currentGroup) return null;

  // AIDEV-NOTE: Filtrar cobranças baseado no termo de pesquisa
  const filteredCharges = currentGroup.charges.filter(charge => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const customerName = charge.customers?.name?.toLowerCase() || '';
    const customerCompany = charge.customers?.company?.toLowerCase() || '';
    const cpfCnpj = charge.customers?.cpf_cnpj?.toString() || '';
    const valor = charge.valor?.toString() || '';
    const contractId = charge.contract_id?.toLowerCase() || '';
    const status = getStatusLabel(charge.status).toLowerCase();
    const tipo = charge.tipo?.toLowerCase() || '';
    
    return customerName.includes(searchLower) ||
           customerCompany.includes(searchLower) ||
           cpfCnpj.includes(searchLower) ||
           valor.includes(searchLower) ||
           contractId.includes(searchLower) ||
           status.includes(searchLower) ||
           tipo.includes(searchLower);
  });

  return (
    <Sheet open={!!selectedGroup} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span>{currentGroup.label}</span>
            <div className="flex items-center space-x-2">
              {/* AIDEV-NOTE: Campo de pesquisa para filtrar registros */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar registros..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[200px]"
                />
              </div>
              {selectedGroup === 'overdue' && (
                <Select value={overdueFilter} onValueChange={onOverdueFilterChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous">Mês Anterior</SelectItem>
                    <SelectItem value="current">Mês Atual</SelectItem>
                    <SelectItem value="90days">Últimos 90 Dias</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>
        
        {/* AIDEV-NOTE: Container principal com flex para ocupar altura total */}
        <div className="flex flex-col flex-1 min-h-0 mt-6">
          {/* AIDEV-NOTE: Cabeçalho de seleção */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedCharges.length === filteredCharges.length && filteredCharges.length > 0}
                onCheckedChange={onSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Selecionar todas ({filteredCharges.length}{searchTerm ? ` de ${currentGroup.charges.length}` : ''})
              </span>
            </div>
          </div>
          
          {/* AIDEV-NOTE: Lista de cobranças com altura flexível */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {filteredCharges.map((charge) => (
              <div
                key={charge.id}
                className="group relative flex items-start space-x-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer bg-white"
                onClick={() => onViewCharge(charge)}
              >
                <Checkbox
                  checked={selectedCharges.includes(charge.id)}
                  onCheckedChange={(checked: any) => onChargeSelect(charge.id, checked as boolean)}
                  onClick={(e: any) => e.stopPropagation()}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0 space-y-3">
                  {/* AIDEV-NOTE: Cabeçalho com nome/empresa e valor */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {charge.customers?.name || charge.customers?.company || 'Cliente não informado'}
                        </h4>
                        {charge.customers?.company && charge.customers?.name && (
                          <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      {charge.customers?.company && charge.customers?.name && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {charge.customers.company}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-lg font-bold text-emerald-600">
                        R$ {charge.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </p>
                    </div>
                  </div>

                  {/* AIDEV-NOTE: Informações do documento */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-4">
                      {charge.customers?.cpf_cnpj && (
                        <div className="flex items-center space-x-1 text-gray-600">
                          <FileText className="h-3 w-3" />
                          <span>{formatDocument(charge.customers.cpf_cnpj)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* AIDEV-NOTE: Tipo de cobrança e vencimento agrupados */}
                      <div className="flex items-center space-x-3">
                        {charge.tipo && (
                          <div className="flex items-center space-x-1">
                            <CreditCard className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 uppercase font-medium">
                              {charge.tipo === 'BOLETO' ? 'Boleto' : charge.tipo}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 text-gray-600">
                          <span>Venc:</span>
                          <span className="font-medium">
                            {charge.data_vencimento ? format(new Date(charge.data_vencimento), 'dd/MM/yyyy') : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      {/* AIDEV-NOTE: Status traduzido com cores melhoradas */}
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-medium border ${getStatusColor(charge.status)}`}
                      >
                        {getStatusLabel(charge.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* AIDEV-NOTE: Informações adicionais - Licença PDV e Contrato */}
                  {(charge.contract_id || charge.tipo === 'BOLETO') && (
                    <div className="flex items-center space-x-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
                      {charge.contract_id && (
                        <span className="flex items-center space-x-1">
                          <span>Contrato:</span>
                          <span className="font-medium text-gray-700">{charge.contract_id.slice(-8)}</span>
                        </span>
                      )}
                      {charge.tipo === 'BOLETO' && (
                        <span className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>Licença PDV Legal</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* AIDEV-NOTE: Botão fixo na parte inferior */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
            <Button
              onClick={onSendMessages}
              disabled={selectedCharges.length === 0}
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Enviar Mensagens ({selectedCharges.length})
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}