import React, { useState } from "react";
import { Pause, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useQueryClient } from '@tanstack/react-query';
import { useContracts, useContractStages } from '@/hooks/useContracts';

interface ContractSuspendButtonProps {
  contractId: string;
  contractNumber: string;
  onSuccess?: () => void;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function ContractSuspendButton({ 
  contractId, 
  contractNumber, 
  onSuccess, 
  className = "",
  isOpen: controlledOpen,
  onOpenChange,
  hideTrigger = false
}: ContractSuspendButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();
  const { suspendContractMutation } = useContracts();
  // const { stages, createStageAsync, isLoading: isLoadingStages } = useContractStages(); // AIDEV-NOTE: Removido pois não precisamos mais sincronizar o stage

  const handleSuspendContract = async () => {
    if (!suspensionReason.trim()) {
      toast.error("Por favor, informe o motivo da suspensão");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // AIDEV-NOTE: Simplificação radical - apenas muda o status, ignorando o stage (Kanban)
      // Isso alinha o comportamento com o botão de ativação (DRAFT -> ACTIVE) e elimina a latência
      await suspendContractMutation.mutateAsync({
        contractId,
        reason: suspensionReason,
        // stageId: undefined // Explicitamente não passamos stageId
      });
      
      setIsOpen(false);
      setSuspensionReason("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao suspender contrato:', error);
      toast.error('Erro ao suspender contrato. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {hideTrigger ? null : (
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title={className?.includes('flex-col') ? 'Suspender Contrato' : undefined}
            className={`gap-2 ${className}`}
          >
            <Pause className="h-4 w-4" />
            {className?.includes('flex-col') ? null : 'Suspender Contrato'}
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="max-w-md z-[9999]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <AlertDialogTitle>Suspender Contrato</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                Contrato: <strong>{contractNumber}</strong>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="space-y-4 relative z-10">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">Atenção!</p>
                <p>Esta ação irá suspender o contrato temporariamente. O contrato pode ser reativado posteriormente.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 relative">
            <Label htmlFor="suspension-reason" className="block text-sm font-medium">
              Motivo da suspensão *
            </Label>
            <textarea
              id="suspension-reason"
              name="suspension-reason"
              placeholder="Ex: Inadimplência temporária, revisão contratual, solicitação do cliente..."
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none relative z-20"
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
            onClick={(e) => {
              e.preventDefault();
              handleSuspendContract();
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            disabled={isSubmitting || !suspensionReason.trim()}
          >
            {isSubmitting ? "Suspendendo..." : "Confirmar Suspensão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 
