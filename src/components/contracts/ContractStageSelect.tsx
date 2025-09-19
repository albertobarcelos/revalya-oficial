import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContracts, useContractStages } from "@/hooks/useContracts";

const formSchema = z.object({
  stage_id: z.string({
    required_error: "Selecione um estágio",
  }),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContractStageSelectProps {
  contractId: string;
  currentStageId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ContractStageSelect({ 
  contractId, 
  currentStageId, 
  onSuccess, 
  onCancel 
}: ContractStageSelectProps) {
  const { data: stages, isLoading } = useContractStages();
  const { changeStageContractMutation } = useContracts();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stage_id: currentStageId || "",
      comments: "",
    },
  });
  
  const filteredStages = stages?.filter(stage => stage.id !== currentStageId) || [];

  const onSubmit = async (data: FormValues) => {
    try {
      await changeStageContractMutation.mutateAsync({
        contractId,
        stageId: data.stage_id,
        comments: data.comments,
      });
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao alterar estágio do contrato:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="stage_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Novo Estágio</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estágio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>
                      Carregando estágios...
                    </SelectItem>
                  ) : filteredStages.length > 0 ? (
                    filteredStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center">
                          <span 
                            className="mr-2 h-3 w-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>
                      Não há outros estágios disponíveis
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Selecione o novo estágio para o contrato
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comentários (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Motivo da mudança de estágio"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Explique o motivo da alteração de estágio
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={changeStageContractMutation.isPending}
          >
            {changeStageContractMutation.isPending ? "Alterando..." : "Alterar Estágio"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
