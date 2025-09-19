import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCpfCnpj, formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, X, Send, Printer, Download, AlertTriangle, MessageSquare, Phone, ExternalLink, Receipt, Calendar, CreditCard, DollarSign, FileText, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MessageHistory } from "./MessageHistory";
import { PaymentHistory } from "./PaymentHistory";
import type { Cobranca } from "@/types/models/cobranca";
import { useCurrentTenant } from '@/hooks/useZustandTenant';
// AIDEV-NOTE: Hook obrigatório para segurança multi-tenant

import { useChargeActions } from "@/hooks/useChargeActions";
import { useCharges } from "@/hooks/useCharges";
import { useChargeDetails } from "@/hooks/useChargeDetails";
import { format } from "date-fns";
import { supabase } from '@/lib/supabase';
import { messageService } from "@/services/messageService";
import { BulkMessageDialog } from "./BulkMessageDialog";
import { formatInstallmentDisplay, getInstallmentBadgeVariant } from '@/utils/installmentUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChargeDetails } from './ChargeDetails';

// AIDEV-NOTE: Função movida para utils/installmentUtils.ts para reutilização

interface ChargeDetailDrawerProps {
  charge: Cobranca | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function ChargeDetailDrawer({ charge, isOpen, onClose, onRefresh }: ChargeDetailDrawerProps) {
  // AIDEV-NOTE: Estados para controle do drawer e históricos
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // AIDEV-NOTE: Hooks necessários
  const { toast } = useToast();
  const { currentTenant } = useCurrentTenant();
  const { markAsReceivedCash, markAsReceivedPix, markAsReceivedBoleto, isUpdating } = useCharges();
  const { chargeDetails, isLoading: isLoadingCharge } = useChargeDetails(charge?.id || null);
  
  // AIDEV-NOTE: Log de debug - Correções estruturais aplicadas
  console.log('✅ CORREÇÕES ESTRUTURAIS APLICADAS:', {
    // Correções realizadas na estrutura da tabela charges
    corrigoesAplicadas: [
      '✓ Interface Cobranca atualizada com campos reais do banco',
      '✓ database.ts corrigido com estrutura real da tabela charges',
      '✓ ChargesCompanyList.tsx corrigido - removidos campos inexistentes',
      '✓ ChargeForm.tsx corrigido - removidos campos inexistentes',
      '✓ chargesService.ts corrigido - busca usando customer_id',
      '✓ n8n workflow corrigido - estrutura real da tabela'
    ],
    // Campos corretos agora em uso
    camposCorretos: [
      'id', 'tenant_id', 'customer_id', 'asaas_id', 'contract_id',
      'valor (number)', 'status', 'tipo', 'data_vencimento',
      'descricao', 'created_at', 'updated_at'
    ],
    // Campos removidos (não existem no banco)
    camposRemovidos: [
      'id_asaas', 'data_criacao', 'data_atualizacao', 'data_pagamento',
      'link_pagamento', 'codigo_barras', 'tentativas', 'metadata'
    ],
    // Estrutura do objeto charge atual
    chargeAtual: charge
  });
  
  if (!charge) return null;

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Indefinido</Badge>;
    
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

  const handleCancelCharge = async () => {
    if (!charge || !currentTenant?.id) return;
    
    if (!window.confirm("Tem certeza que deseja cancelar esta cobrança?")) {
      return;
    }
    
    setIsCancelling(true);
    
    try {
      const { error } = await supabase
        .from('charges')
        .update({ status: 'CANCELLED' })
        .eq('tenant_id', currentTenant.id)
        .eq('id', charge.id);

      if (error) throw error;
      
      toast({
        title: "Cobrança cancelada",
        description: "A cobrança foi cancelada com sucesso."
      });
      
      onRefresh();
      onClose();
    } catch (error) {
      console.error("Erro ao cancelar cobrança:", error);
      toast({
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar a cobrança.",
        variant: "destructive"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrintBoleto = async () => {
    if (!charge || !currentTenant?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('charges')
        .select('link_pagamento')
        .eq('tenant_id', currentTenant.id)
        .eq('id', charge.id)
        .single();
        
      if (error) throw error;
      
      if (!data?.link_pagamento) {
        toast({
          title: "Link não disponível",
          description: "Esta cobrança não possui um link de pagamento disponível.",
          variant: "destructive",
        });
        return;
      }
      
      window.open(data.link_pagamento, "_blank");
    } catch (error) {
      console.error("Erro ao buscar link do boleto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o link do boleto.",
        variant: "destructive"
      });
    }
  };

  const handleCopyPixCode = async () => {
    // if (!charge.codigo_pix) { // Column doesn't exist in database
    //   toast({
    //     title: "Código PIX não disponível",
    //     description: "Esta cobrança não possui um código PIX disponível.",
    //     variant: "destructive",
    //   });
    //   return;
    // }
    
    // try {
    //   await navigator.clipboard.writeText(charge.codigo_pix);
    //   toast({
    //     title: "Código PIX copiado",
    //     description: "O código PIX foi copiado para a área de transferência.",
    //   });
    // } catch (error) {
    //   console.error("Erro ao copiar código PIX:", error);
    //   toast({
    //     title: "Erro ao copiar código PIX",
    //     description: "Não foi possível copiar o código PIX. Tente novamente.",
    //     variant: "destructive",
    //   });
    // }
    
    toast({
      title: "Código PIX não disponível",
      description: "Esta funcionalidade não está disponível.",
      variant: "destructive",
    });
  };

  const fetchMessageHistory = async () => {
    if (!charge || !currentTenant?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'message_history');
      
      if (tableError || !tables || tables.length === 0) {
        console.log('Tabela message_history não existe. Usando dados vazios.');
        setMessageHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from('message_history')
        .select(`
          id,
          charge_id,
          tenant_id,
          message,
          template_name,
          status,
          sent_at
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('charge_id', charge.id)
        .order('sent_at', { ascending: false });
        
      if (error) throw error;
      
      setMessageHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de mensagens:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de mensagens.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!charge || !currentTenant?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'payment_history');
      
      if (tableError || !tables || tables.length === 0) {
        console.log('Tabela payment_history não existe. Usando dados vazios.');
        setPaymentHistory([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          id,
          charge_id,
          tenant_id,
          amount,
          payment_method,
          transaction_id,
          paid_at,
          status
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('charge_id', charge.id)
        .order('paid_at', { ascending: false });
        
      if (error) throw error;
      
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de pagamentos:', error);
      setPaymentHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openWhatsApp = (phone: string | undefined | null) => {
    if (!phone) return;
    
    const numericOnly = phone.replace(/\D/g, '');
    
    const formattedPhone = numericOnly.startsWith('55') ? numericOnly : `55${numericOnly}`;
    
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const formatPhoneNumber = (phone: string | undefined | null): string => {
    if (!phone) return '';
    
    const numericOnly = phone.replace(/\D/g, '');
    
    if (numericOnly.length === 11) {
      return `(${numericOnly.substring(0, 2)}) ${numericOnly.substring(2, 7)}-${numericOnly.substring(7, 11)}`;
    } else if (numericOnly.length === 10) {
      return `(${numericOnly.substring(0, 2)}) ${numericOnly.substring(2, 6)}-${numericOnly.substring(6, 10)}`;
    }
    
    return numericOnly;
  };

  const handleSendSingleMessage = async (templateId: string, customMessage?: string) => {
    if (!charge || !currentTenant?.id) return;
    
    if (!charge.customers?.phone) {
      toast({
        title: "Telefone não cadastrado",
        description: "O cliente não possui telefone cadastrado para envio de mensagem.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    try {
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'message_history');
      
      if (tableError || !tables || tables.length === 0) {
        throw new Error('Sistema não configurado para envio de mensagens.');
      }

      await messageService.sendBulkMessages([charge.id], templateId, customMessage);
      
      toast({
        title: "Mensagem enviada com sucesso",
        description: "A mensagem foi enviada para o cliente.",
      });
      
      fetchMessageHistory();
    } catch (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Detalhes da Cobrança</DrawerTitle>
          <DrawerDescription>
            Informações detalhadas da cobrança selecionada
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-6">
          <ChargeDetails charge={charge} onRefresh={onRefresh} />
        </div>
        <div className="px-4 py-2 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
              <p className="text-lg font-semibold">{charge.customers?.name || "Cliente não identificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Empresa</h3>
              <p className="text-lg font-semibold">{charge.customers?.company || "-"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">CPF/CNPJ</h3>
              <p>{formatCpfCnpj(charge.customers?.cpf_cnpj)}</p>
            </div>
            <div className="flex items-center">
              <div className="font-medium">{formatPhoneNumber(charge.customers?.phone)}</div>
              {charge.customers?.phone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 hover:bg-green-50 hover:scale-110 transition-all duration-200"
                  onClick={() => openWhatsApp(charge.customers?.phone)}
                >
                  <Phone className="h-4 w-4 text-green-600" />
                </Button>
              )}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {isLoadingCharge ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Valor</h3>
                  <p className="text-xl font-bold">{formatCurrency(parseFloat(charge?.valor) || 0)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Vencimento</h3>
                  <p className="text-lg">{formatDate(charge?.data_vencimento)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className="mt-1">{getStatusBadge(charge?.status)}</div>
                </div>
              </div>
              
              {charge?.descricao && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Descrição</h3>
                  <p className="p-2 bg-muted rounded-md mt-1">{charge.descricao}</p>
                </div>
              )}
              
              {charge?.status === "OVERDUE" && (
                <div className="mb-4 p-3 bg-destructive/10 rounded-md flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <p className="text-sm text-destructive">
                    Esta cobrança está vencida desde {formatDate(charge.data_vencimento)}
                  </p>
                </div>
              )}
              
              <Separator className="my-4" />
              
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={`
                  ${charge?.tipo === 'BOLETO' ? 'bg-blue-100 text-blue-800' : 
                    charge?.tipo === 'PIX' ? 'bg-green-100 text-green-800' : 
                    charge?.tipo === 'CREDIT_CARD' ? 'bg-purple-100 text-purple-800' : 
                    'bg-gray-100 text-gray-800'}
                `}>
                  {charge?.tipo === 'BOLETO' ? (
                    <Receipt className="h-3 w-3 mr-1" />
                  ) : charge?.tipo === 'PIX' ? (
                    <FileText className="h-3 w-3 mr-1" />
                  ) : charge?.tipo === 'CREDIT_CARD' ? (
                    <CreditCard className="h-3 w-3 mr-1" />
                  ) : (
                    <Calendar className="h-3 w-3 mr-1" />
                  )}
                  {charge?.tipo}
                </Badge>
              </div>
            </>
          )}
          
          <Tabs defaultValue="messages">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="messages">
                Histórico de Mensagens
              </TabsTrigger>
              <TabsTrigger value="payments">
                Histórico de Pagamentos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages" className="border rounded-md p-4">
              {isLoadingHistory ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-l-2 border-primary/20 pl-4 py-2">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                  ))}
                </div>
              ) : messageHistory.length > 0 ? (
                <div className="space-y-3">
                  {messageHistory.map((msg) => (
                    <div key={msg.id} className="border-l-2 border-primary pl-4 py-2 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(msg.sent_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {msg.template_name || 'Mensagem Enviada'}
                          </p>
                        </div>
                        <Badge variant={msg.status === 'delivered' ? 'default' : 'outline'}>
                          {msg.status === 'delivered' ? 'Entregue' : 
                           msg.status === 'read' ? 'Lida' : 'Enviada'}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2">{msg.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhuma mensagem enviada ainda.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="payments" className="border rounded-md p-4">
              {isLoadingHistory ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="bg-card border rounded-lg p-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">
                            {format(new Date(payment.paid_at), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.payment_method}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.transaction_id}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum pagamento registrado.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <DrawerFooter>
          <div className="flex flex-col gap-4">
            {isLoadingCharge ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {charge.status !== "PAID" && charge.status !== "CANCELLED" && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelCharge}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Cancelar Cobrança
                  </Button>
                )}
                
                {charge.status !== "PAID" && charge.status !== "CANCELLED" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => markAsReceivedInCash(charge.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <DollarSign className="h-4 w-4 mr-2" />
                      )}
                      Dinheiro
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => markAsReceivedPix(charge.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      PIX
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => markAsReceivedBoleto(charge.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Receipt className="h-4 w-4 mr-2" />
                      )}
                      Boleto
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {charge.link_pagamento && (
                    <Button
                      variant="outline"
                      onClick={handlePrintBoleto}
                      className="flex-1"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir Boleto
                    </Button>
                  )}
                  <Button 
                    onClick={() => setIsMessageDialogOpen(true)}
                    className="flex-1"
                    disabled={!charge.customers?.phone}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensagem
                  </Button>
                </div>
              </>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
      <BulkMessageDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        selectedCharges={charge ? [charge.id] : []}
        onSendMessages={handleSendSingleMessage}
        isLoading={isSending}
      />
    </Drawer>
  );
}
