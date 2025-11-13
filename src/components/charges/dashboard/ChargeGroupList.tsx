import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bell, FileText, Building2, CreditCard, Search, Smartphone, Receipt, MessageSquare } from 'lucide-react';
import { formatPhone } from '@/lib/validation-utils';
import type { Cobranca } from '@/types/database';
import { findRelatedOverdueCharges } from '@/utils/chargeGrouping';
import { useMessageCount } from '@/hooks/useMessageCount';

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
  allCharges?: Cobranca[]; // AIDEV-NOTE: Todas as cobranças para buscar relacionadas
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

// AIDEV-NOTE: Função para formatar tipos de pagamento para exibição amigável
const formatPaymentType = (tipo: string | null | undefined): string => {
  if (!tipo) return 'Não definido';
  
  const typeMap: Record<string, string> = {
    'CREDIT_CARD': 'Cartão de Crédito',
    'CREDIT_CARD_RECURRING': 'Cartão Recorrente',
    'BOLETO': 'Boleto Bancário',
    'PIX': 'PIX',
    'CASH': 'Dinheiro',
    'TRANSFER': 'Transferência',
    'DEPOSIT': 'Depósito',
    'UNDEFINED': 'Não Definido',
    'BANK_SLIP': 'Boleto Bancário',
    'MONTHLY': 'Mensal',
    'INSTALLMENT': 'Parcela',
    // Fallbacks para formatos alternativos
    'Boleto': 'Boleto Bancário',
    'Pix': 'PIX'
  };

  return typeMap[tipo] || tipo;
};

// AIDEV-NOTE: Função para obter ícone contextual baseado no tipo de pagamento
const getPaymentIcon = (tipo: string | null | undefined) => {
  switch (tipo) {
    case 'CREDIT_CARD':
    case 'CREDIT_CARD_RECURRING':
      return <CreditCard className="h-3 w-3 text-blue-500" />;
    case 'PIX':
      return <Smartphone className="h-3 w-3 text-purple-500" />;
    case 'BOLETO':
    case 'BANK_SLIP':
      return <Receipt className="h-3 w-3 text-orange-500" />;
    case 'CASH':
    case 'TRANSFER':
    case 'DEPOSIT':
      return <FileText className="h-3 w-3 text-green-500" />;
    default:
      return <CreditCard className="h-3 w-3 text-gray-400" />;
  }
};

const WhatsappIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M17.472 12.382c-.297-.148-1.758-.867-2.032-.967-.274-.099-.474-.148-.673.149-.198.297-.771.967-.945 1.166-.173.198-.347.223-.644.074-.297-.148-1.257-.463-2.392-1.475-.885-.79-1.48-1.763-1.653-2.06-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.148-.174.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.673-1.62-.923-2.223-.242-.58-.487-.502-.673-.512-.173-.009-.372-.011-.571-.011-.198 0-.521.074-.795.372-.274.297-1.045 1.02-1.045 2.479s1.07 2.877 1.219 3.074c.148.198 2.106 3.22 5.105 4.515.714.308 1.27.491 1.705.628.716.228 1.366.196 1.88.119.573-.085 1.758-.719 2.006-1.414.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M20.52 3.48A10.49 10.49 0 0 0 12 0C5.373 0 0 5.373 0 12c0 2.113.553 4.121 1.602 5.906L.664 24l6.21-1.637A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12 0-2.809-1.091-5.451-3.083-7.52zM12 22a9.94 9.94 0 0 1-5.12-1.42l-.367-.217-3.63.957.971-3.53-.24-.372C2.984 15.7 2.5 13.9 2.5 12 2.5 6.753 6.753 2.5 12 2.5S21.5 6.753 21.5 12 17.247 21.5 12 21.5z"/>
  </svg>
);

const buildWhatsappLink = (phone?: string | null) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
};

const formatPhoneDisplay = (phone?: string | null) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  return formatPhone(local);
};

// AIDEV-NOTE: Componente separado para lista de cobranças do grupo selecionado
export function ChargeGroupList({
  selectedGroup,
  groupedCharges,
  selectedCharges,
  overdueFilter,
  allCharges,
  onClose,
  onChargeSelect,
  onSelectAll,
  onViewCharge,
  onSendMessages,
  onOverdueFilterChange
}: ChargeGroupListProps) {
  // AIDEV-NOTE: TODOS os hooks devem ser chamados ANTES de qualquer early return
  const [searchTerm, setSearchTerm] = useState('');
  
  // AIDEV-NOTE: Calcular cobranças vencidas relacionadas usando useMemo para performance
  // IMPORTANTE: useMemo deve ser chamado antes de qualquer early return
  const relatedOverdueGroups = useMemo(() => {
    if (!selectedGroup || !allCharges || allCharges.length === 0) return [];
    
    const currentGroup = groupedCharges[selectedGroup];
    if (!currentGroup || currentGroup.charges.length === 0) return [];
    
    // Não mostrar se já estiver no grupo "Vencidos"
    if (selectedGroup === 'overdue') return [];
    
    return findRelatedOverdueCharges(currentGroup.charges, allCharges).slice(0, 5); // Limitar a 5 clientes
  }, [selectedGroup, groupedCharges, allCharges]);

  // AIDEV-NOTE: Preparar dados para o hook de contagem de mensagens
  const { chargeIds, chargeDates } = useMemo(() => {
    if (!selectedGroup) return { chargeIds: [], chargeDates: {} };
    
    const currentGroup = groupedCharges[selectedGroup];
    if (!currentGroup) return { chargeIds: [], chargeDates: {} };

    const ids: string[] = [];
    const dates: { [key: string]: string } = {};

    // Adicionar cobranças principais
    currentGroup.charges.forEach((charge) => {
      ids.push(charge.id);
      if (charge.created_at) {
        dates[charge.id] = charge.created_at;
      }
    });

    // Adicionar cobranças vencidas relacionadas
    relatedOverdueGroups.forEach((group) => {
      group.overdueCharges.forEach((charge) => {
        if (!ids.includes(charge.id)) {
          ids.push(charge.id);
          if (charge.created_at) {
            dates[charge.id] = charge.created_at;
          }
        }
      });
    });

    return { chargeIds: ids, chargeDates: dates };
  }, [selectedGroup, groupedCharges, relatedOverdueGroups]);

  // AIDEV-NOTE: Hook para buscar contagem de mensagens
  const { messageCounts } = useMessageCount({
    chargeIds,
    chargeDates,
  });
  
  // AIDEV-NOTE: Early returns APÓS todos os hooks
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
          
          {/* AIDEV-NOTE: Container scrollável para lista principal e cobranças vencidas */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {filteredCharges.map((charge) => {
              // AIDEV-NOTE: Verificar se este cliente tem cobranças vencidas relacionadas
              const hasRelatedOverdue = relatedOverdueGroups.some(
                g => g.customerId === charge.customer_id
              );
              const relatedGroup = relatedOverdueGroups.find(
                g => g.customerId === charge.customer_id
              );
              const mainPhone = charge.customers?.celular_whatsapp || charge.customers?.phone;
              const mainWaLink = buildWhatsappLink(mainPhone);
              
              return (
                <div key={charge.id} className="space-y-2">
                  {/* AIDEV-NOTE: Cobrança principal */}
                  <div
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
                            {mainWaLink && (
                              <a
                                href={mainWaLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Abrir WhatsApp"
                                title="Abrir WhatsApp"
                                className="text-green-600 hover:text-green-700"
                              >
                                <WhatsappIcon className="h-4 w-4" />
                              </a>
                            )}
                            {hasRelatedOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                {relatedGroup?.overdueCharges.length} vencida(s)
                              </Badge>
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
                        <div className="flex flex-col space-y-1">
                          {charge.customers?.cpf_cnpj && (
                            <div className="flex items-center space-x-1 text-gray-600">
                              <FileText className="h-3 w-3" />
                              <span>{formatDocument(charge.customers.cpf_cnpj)}</span>
                            </div>
                          )}
                          {formatPhoneDisplay(mainPhone) && (
                            <div className="flex items-center space-x-1 text-gray-600">
                              <Smartphone className="h-3 w-3" />
                              <span>{formatPhoneDisplay(mainPhone)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* AIDEV-NOTE: Tipo de cobrança e vencimento agrupados */}
                          <div className="flex items-center space-x-3">
                            {charge.tipo && (
                              <div className="flex items-center space-x-1">
                                {getPaymentIcon(charge.tipo)}
                                <span className="text-xs text-gray-500 font-medium">
                                  {formatPaymentType(charge.tipo)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 text-gray-600">
                              <span>Venc:</span>
                              <span className="font-medium">
                                {charge.data_vencimento ? format(parseISO(charge.data_vencimento), 'dd/MM/yyyy') : 'N/A'}
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
                          
                          {/* AIDEV-NOTE: Ícone de contagem de mensagens */}
                          {(messageCounts.get(charge.id) || 0) > 0 && (
                            <div className="flex items-center space-x-1 text-blue-600">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {messageCounts.get(charge.id) || 0}
                              </span>
                            </div>
                          )}
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
                              {/* AIDEV-NOTE: Exibindo o nome correto do serviço/produto da cobrança */}
                              <span>
                                {charge.contract?.services?.[0]?.service?.name || 
                                 charge.contract?.services?.[0]?.description ||
                                 charge.descricao || 
                                 'Serviço não especificado'}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* AIDEV-NOTE: Cobranças vencidas relacionadas - linhas abaixo da principal */}
                  {hasRelatedOverdue && relatedGroup && (
                    <div className="ml-4 space-y-2 border-l-2 border-red-200 pl-4">
                      {relatedGroup.overdueCharges.map((overdueCharge) => (
                        <div
                          key={overdueCharge.id}
                          className="group relative flex items-start space-x-4 p-3 border border-red-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all duration-200 cursor-pointer bg-red-50"
                          onClick={() => onViewCharge(overdueCharge)}
                        >
                          <Checkbox
                            checked={selectedCharges.includes(overdueCharge.id)}
                            onCheckedChange={(checked: any) => onChargeSelect(overdueCharge.id, checked as boolean)}
                            onClick={(e: any) => e.stopPropagation()}
                            className="mt-1"
                          />
                          
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* AIDEV-NOTE: Cabeçalho com nome/empresa e valor */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-semibold text-red-900 truncate">
                                    {overdueCharge.customers?.name || overdueCharge.customers?.company || 'Cliente não informado'}
                                  </h4>
                                  {overdueCharge.customers?.company && overdueCharge.customers?.name && (
                                    <Building2 className="h-3 w-3 text-red-400 flex-shrink-0" />
                                  )}
                                  {(() => {
                                    const phone = overdueCharge.customers?.celular_whatsapp || overdueCharge.customers?.phone;
                                    const wa = buildWhatsappLink(phone);
                                    return wa ? (
                                      <a
                                        href={wa}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label="Abrir WhatsApp"
                                        title="Abrir WhatsApp"
                                        className="text-green-700 hover:text-green-800"
                                      >
                                        <WhatsappIcon className="h-4 w-4" />
                                      </a>
                                    ) : null;
                                  })()}
                                  <Badge variant="destructive" className="text-xs">
                                    Vencida
                                  </Badge>
                                </div>
                                {overdueCharge.customers?.company && overdueCharge.customers?.name && (
                                  <p className="text-xs text-red-500 mt-0.5 truncate">
                                    {overdueCharge.customers.company}
                                  </p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-lg font-bold text-red-600">
                                  R$ {overdueCharge.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </p>
                              </div>
                            </div>

                            {/* AIDEV-NOTE: Informações do documento */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex flex-col space-y-1">
                                {overdueCharge.customers?.cpf_cnpj && (
                                  <div className="flex items-center space-x-1 text-red-600">
                                    <FileText className="h-3 w-3" />
                                    <span>{formatDocument(overdueCharge.customers.cpf_cnpj)}</span>
                                  </div>
                                )}
                                {(() => {
                                  const phone = overdueCharge.customers?.celular_whatsapp || overdueCharge.customers?.phone;
                                  const formatted = formatPhoneDisplay(phone);
                                  return formatted ? (
                                    <div className="flex items-center space-x-1 text-red-600">
                                      <Smartphone className="h-3 w-3" />
                                      <span>{formatted}</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                {/* AIDEV-NOTE: Tipo de cobrança e vencimento agrupados */}
                                <div className="flex items-center space-x-3">
                                  {overdueCharge.tipo && (
                                    <div className="flex items-center space-x-1">
                                      {getPaymentIcon(overdueCharge.tipo)}
                                      <span className="text-xs text-red-500 font-medium">
                                        {formatPaymentType(overdueCharge.tipo)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-1 text-red-600">
                                    <span>Venc:</span>
                                    <span className="font-medium">
                                      {overdueCharge.data_vencimento ? format(parseISO(overdueCharge.data_vencimento), 'dd/MM/yyyy') : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* AIDEV-NOTE: Status traduzido com cores melhoradas */}
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-medium border ${getStatusColor(overdueCharge.status)}`}
                                >
                                  {getStatusLabel(overdueCharge.status)}
                                </Badge>
                                
                                {/* AIDEV-NOTE: Ícone de contagem de mensagens para cobranças vencidas */}
                                {(messageCounts.get(overdueCharge.id) || 0) > 0 && (
                                  <div className="flex items-center space-x-1 text-blue-600">
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="text-xs font-medium">
                                      {messageCounts.get(overdueCharge.id) || 0}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* AIDEV-NOTE: Informações adicionais - Licença PDV e Contrato */}
                            {(overdueCharge.contract_id || overdueCharge.tipo === 'BOLETO') && (
                              <div className="flex items-center space-x-4 text-xs text-red-500 pt-1 border-t border-red-200">
                                {overdueCharge.contract_id && (
                                  <span className="flex items-center space-x-1">
                                    <span>Contrato:</span>
                                    <span className="font-medium text-red-700">{overdueCharge.contract_id.slice(-8)}</span>
                                  </span>
                                )}
                                {overdueCharge.tipo === 'BOLETO' && (
                                  <span className="flex items-center space-x-1">
                                    <FileText className="h-3 w-3" />
                                    {/* AIDEV-NOTE: Exibindo o nome correto do serviço/produto da cobrança */}
                                    <span>
                                      {overdueCharge.contract?.services?.[0]?.service?.name || 
                                       overdueCharge.contract?.services?.[0]?.description ||
                                       overdueCharge.descricao || 
                                       'Serviço não especificado'}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
