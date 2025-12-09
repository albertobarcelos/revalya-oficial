import React, { useState } from "react";
import { Trash2, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

interface ContractCancelButtonProps {
  contractId: string;
  contractNumber: string;
  onSuccess?: () => void;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function ContractCancelButton({ 
  contractId, 
  contractNumber, 
  onSuccess, 
  className = "",
  isOpen: controlledOpen,
  onOpenChange,
  hideTrigger = false
}: ContractCancelButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentTenant } = useTenantAccessGuard();

  /**
   * Cancela o contrato alterando o estágio para CANCELED
   * Faz lookup de estágio por tenant e cria caso não exista
   */
  const handleCancelContract = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Por favor, informe o motivo do cancelamento");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Buscar o estágio de "CANCELED" para este tenant
      const { data: canceledStage, error: stageError } = await supabase
        .from('contract_stages')
        .select('id')
        .eq('tenant_id', currentTenant?.id)
        .eq('code', 'CANCELED')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (stageError) {
        console.error('Erro ao buscar estágio:', stageError);
        throw new Error('Erro ao buscar estágio de cancelamento');
      }

      if (!canceledStage) {
        // Se não encontrar, tentar criar o estágio
        console.log('Estágio CANCELED não encontrado, tentando criar...');
        const { data: newStage, error: createError } = await supabase
          .from('contract_stages')
          .insert({
            tenant_id: currentTenant?.id,
            code: 'CANCELED',
            name: 'Cancelado',
            description: 'Contrato cancelado',
            is_active: true
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Erro ao criar estágio:', createError);
          throw new Error('Não foi possível criar o estágio de cancelamento');
        }

        // Usar o estágio recém-criado
        const stageId = newStage.id;
        
        const { data, error } = await supabase.rpc('change_contract_stage', {
          p_contract_id: contractId,
          p_stage_id: stageId,
          p_comments: `Contrato cancelado: ${cancellationReason}`
        });

        if (error) {
          throw error;
        }
      } else {
        // Usar o estágio existente
        const { data, error } = await supabase.rpc('change_contract_stage', {
          p_contract_id: contractId,
          p_stage_id: canceledStage.id,
          p_comments: `Contrato cancelado: ${cancellationReason}`
        });

        if (error) {
          throw error;
        }
      }

      toast.success('Contrato cancelado com sucesso!');
      setIsOpen(false);
      setCancellationReason("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao cancelar contrato:', error);
      toast.error('Erro ao cancelar contrato. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {hideTrigger ? null : (
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            title={className?.includes('flex-col') ? 'Cancelar Contrato' : undefined}
            className={`gap-2 ${className}`}
          >
            <Ban className="h-4 w-4" />
            {className?.includes('flex-col') ? null : 'Cancelar Contrato'}
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="max-w-md z-[9999]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-danger/10">
            <AlertTriangle className="h-5 w-5 text-danger" />
            </div>
            <div>
              <AlertDialogTitle>Cancelar Contrato</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                Contrato: <strong>{contractNumber}</strong>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="space-y-4 relative z-10">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Atenção!</p>
                <p>Esta ação irá cancelar o contrato permanentemente e pode afetar faturamentos futuros.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 relative">
            <Label htmlFor="cancellation-reason" className="block text-sm font-medium">
              Motivo do cancelamento *
            </Label>
            <textarea
              id="cancellation-reason"
              name="cancellation-reason"
              placeholder="Ex: Cliente solicitou cancelamento, inadimplência, mudança de escopo..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none relative z-20"
              rows={3}
              style={{ pointerEvents: 'auto' }}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsOpen(false)}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancelContract}
            disabled={isSubmitting || !cancellationReason.trim()}
            className="bg-danger hover:bg-danger/90"
          >
            {isSubmitting ? "Cancelando..." : "Confirmar Cancelamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
