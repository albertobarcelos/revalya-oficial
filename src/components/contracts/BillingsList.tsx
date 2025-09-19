import React, { useState } from "react";
import { useBillings } from "@/hooks/useBillingsContract";
import { formatCurrency, formatDate } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, CalendarDays, CreditCard, FileSearch, PlusCircle, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GenerateBillingsDialog } from "./GenerateBillingsDialog";

interface BillingsListProps {
  contractId: string;
}

export function BillingsList({ contractId }: BillingsListProps) {
  const { billings, isLoading, cancelBillingMutation, regenerateBillingsMutation } = useBillings(contractId);
  const [billingToCancel, setBillingToCancel] = useState<string | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  
  const handleCancelBilling = () => {
    if (!billingToCancel) return;
    
    cancelBillingMutation.mutate(billingToCancel);
    setBillingToCancel(null);
  };
  
  const handleRegenerateBillings = () => {
    regenerateBillingsMutation.mutate(contractId);
  };
  
  const getBillingStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'PAID':
        return 'Pago';
      case 'PARTIALLY_PAID':
        return 'Pago Parcialmente';
      case 'OVERDUE':
        return 'Vencido';
      case 'CANCELED':
        return 'Cancelado';
      default:
        return status;
    }
  };
  
  const getBillingStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-warning';
      case 'PAID':
        return 'bg-green-500';
      case 'PARTIALLY_PAID':
        return 'bg-blue-500';
      case 'OVERDUE':
        return 'bg-red-500';
      case 'CANCELED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Faturamentos</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRegenerateBillings}
            disabled={regenerateBillingsMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerar Todos
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setIsGenerateDialogOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Gerar Faturamento
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">Carregando faturamentos...</div>
      ) : !billings || billings.length === 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Nenhum faturamento encontrado</CardTitle>
            <CardDescription>
              Não há faturamentos gerados para este contrato
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <CalendarClock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Clique no botão abaixo para gerar o primeiro faturamento para este contrato.
            </p>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Gerar Faturamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Histórico de Faturamentos</CardTitle>
            <CardDescription>
              Faturamentos gerados para este contrato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.map((billing) => (
                  <TableRow key={billing.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{billing.reference_period}</span>
                        <span className="text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3 inline mr-1" />
                          {formatDate(billing.reference_start_date)} - {formatDate(billing.reference_end_date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {billing.billing_number}
                      <div className="text-xs text-muted-foreground">
                        Parc. {billing.installment_number}/{billing.total_installments}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(billing.issue_date)}</TableCell>
                    <TableCell>{formatDate(billing.due_date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(billing.amount)}</TableCell>
                    <TableCell>
                      <Badge className={getBillingStatusColor(billing.status)}>
                        {getBillingStatusLabel(billing.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalhes"
                        >
                          <FileSearch className="h-4 w-4" />
                        </Button>
                        {billing.status !== 'CANCELED' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancelar faturamento"
                                onClick={() => setBillingToCancel(billing.id)}
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 15 15"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                >
                                  <path
                                    d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar Faturamento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja cancelar este faturamento? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setBillingToCancel(null)}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelBilling}>
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      <GenerateBillingsDialog
        contractId={contractId}
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onGenerateSuccess={() => {}}
      />
    </div>
  );
}
