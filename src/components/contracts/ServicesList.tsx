import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Pencil } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { ContractService } from "@/types/models/contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ServiceRowEditor } from "./parts/ServiceRowEditor";
import { useToast } from "@/components/ui/use-toast";

interface ServicesListProps {
  services: ContractService[];
  contractId: string;
  onServiceUpdated: () => void;
}

export function ServicesList({ services, contractId, onServiceUpdated }: ServicesListProps) {
  const { 
    removeContractService, 
    updateContractService,
    removeContractServiceMutation,
    updateContractServiceMutation 
  } = useContracts();
  // Usar useRef para manter a referência do ID em edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = React.useRef<string | null>(null);
  
  // Sincroniza o ref com o estado
  React.useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);
  const { toast } = useToast();
  
  // AIDEV-NOTE: Função para lidar com clique na linha do serviço
  const handleRowClick = (serviceId: string, event: React.MouseEvent) => {
    console.log('🔍 ServicesList - Row clicked:', { serviceId, currentEditingId: editingId });
    
    // Previne clique se já está editando este serviço
    if (editingId === serviceId) {
      console.log('⚠️ ServicesList - Already editing this service, ignoring click');
      return;
    }
    
    // Verifica se o clique foi em um botão ou elemento interativo
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      console.log('⚠️ ServicesList - Click was on interactive element, ignoring');
      return;
    }
    
    console.log('✅ ServicesList - Setting editing ID to:', serviceId);
    setEditingId(serviceId);
  };

  // AIDEV-NOTE: Função para cancelar edição
  const handleCancelEdit = () => {
    console.log('❌ ServicesList - Canceling edit');
    setEditingId(null);
  };

  const handleRemoveService = async (serviceId: string) => {
    try {
      await removeContractService(serviceId);
      onServiceUpdated();
      toast({
        title: "Sucesso",
        description: "Serviço removido do contrato com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao remover serviço:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o serviço. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateService = async (updatedService: ContractService) => {
    try {
      await updateContractService({
        serviceId: updatedService.id,
        serviceData: {
          description: updatedService.description,
          quantity: updatedService.quantity,
          unit_price: updatedService.unit_price,
          discount_percentage: updatedService.discount_percentage || 0,
          tax_rate: updatedService.tax_rate || 0,
        }
      });
      onServiceUpdated();
      // Só limpa se ainda estiver editando o mesmo serviço
      if (editingIdRef.current === updatedService.id) {
        setEditingId(null);
      }
    } catch (error: any) {
      console.error("Erro ao atualizar serviço:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o serviço. Tente novamente.",
        variant: "destructive",
      });
      throw error; // Re-throw para que o ServiceRowEditor possa lidar com o erro
    }
  };
  
  if (!services || services.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-lg font-medium">Nenhum serviço adicionado</p>
        <p className="text-sm text-muted-foreground">
          Adicione serviços ao contrato para começar a faturar
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Serviço</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Preço Unitário</TableHead>
            <TableHead className="text-right">Desconto</TableHead>
            <TableHead className="text-right">Imposto</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <React.Fragment key={service.id}>
              <TableRow 
                className={`cursor-pointer transition-colors ${
                  editingId === service.id 
                    ? "bg-muted/20 border-l-4 border-l-primary" 
                    : "hover:bg-muted/10"
                }`}
                onClick={(e) => handleRowClick(service.id, e)}
              >
                <TableCell>
                  <div>
                    <span className="font-medium">{service.service?.name || service.description}</span>
                    {service.description && service.description !== service.service?.name && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {service.quantity}
                    {editingId !== service.id && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('✏️ ServicesList - Edit button clicked for:', service.id);
                          setEditingId(service.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(service.unit_price)}</TableCell>
                <TableCell className="text-right">
                  {service.discount_percentage > 0 && (
                    <div>
                      <Badge variant="outline">{(service.discount_percentage * 100).toFixed(2)}%</Badge>
                      {service.discount_amount > 0 && (
                        <div className="mt-1 text-sm">{formatCurrency(service.discount_amount)}</div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {service.tax_rate > 0 && (
                    <div>
                      <Badge variant="outline">{service.tax_rate.toFixed(2)}%</Badge>
                      <div className="mt-1 text-sm">{formatCurrency(service.tax_amount)}</div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(service.total_amount)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover serviço</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover este serviço do contrato?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveService(service.id).catch(() => {}); // Ignorar erros já tratados
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
              
              {editingId === service.id && (
                <ServiceRowEditor
                  key={`editor-${service.id}`}
                  service={service}
                  onSave={(updatedService) => {
                    console.log('💾 ServicesList - Saving service:', updatedService);
                    handleUpdateService(updatedService);
                  }}
                  onCancel={handleCancelEdit}
                />
              )}
            </React.Fragment>
          ))}
          <TableRow className="bg-muted/10">
            <TableCell colSpan={4}></TableCell>
            <TableCell className="text-right font-medium">Total:</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(
                services.reduce((sum, service) => sum + (service.total_amount || 0), 0)
              )}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
