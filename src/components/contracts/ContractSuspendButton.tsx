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

interface ContractSuspendButtonProps {
  contractId: string;
  contractNumber: string;
  onSuccess?: () => void;
  className?: string;
}

export function ContractSuspendButton({ 
  contractId, 
  contractNumber, 
  onSuccess, 
  className = "" 
}: ContractSuspendButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuspendContract = async () => {
    if (!suspensionReason.trim()) {
      toast.error("Por favor, informe o motivo da suspensão");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Buscar o estágio de "SUSPENDED" para este tenant
      const { data: suspendedStage, error: stageError } = await supabase
        .from('contract_stages')
        .select('id')
        .eq('code', 'SUSPENDED')
        .maybeSingle();

      if (stageError) {
        console.error('Erro ao buscar estágio:', stageError);
        throw new Error('Erro ao buscar estágio de suspensão');
      }

      if (!suspendedStage) {
        // Se não encontrar, tentar criar o estágio
        console.log('Estágio SUSPENDED não encontrado, tentando criar...');
        const { data: newStage, error: createError } = await supabase
          .from('contract_stages')
          .insert({
            code: 'SUSPENDED',
            name: 'Suspenso',
            description: 'Contrato suspenso temporariamente'
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Erro ao criar estágio:', createError);
          throw new Error('Não foi possível criar o estágio de suspensão');
        }

        // Usar o estágio recém-criado
        const stageId = newStage.id;
        
        const { data, error } = await supabase.rpc('change_contract_stage', {
          p_contract_id: contractId,
          p_stage_id: stageId,
          p_comments: `Contrato suspenso: ${suspensionReason}`
        });

        if (error) {
          throw error;
        }
      } else {
        // Usar o estágio existente
        const { data, error } = await supabase.rpc('change_contract_stage', {
          p_contract_id: contractId,
          p_stage_id: suspendedStage.id,
          p_comments: `Contrato suspenso: ${suspensionReason}`
        });

        if (error) {
          throw error;
        }
      }

      toast.success('Contrato suspenso com sucesso!');
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
            onClick={handleSuspendContract}
            disabled={isSubmitting || !suspensionReason.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? "Suspendendo..." : "Confirmar Suspensão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 
