import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";
 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCustomers } from "@/hooks/useCustomers";
import { useContracts } from "@/hooks/useContracts";
import { Switch } from "@/components/ui/switch";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";

const formSchema = z.object({
  customer_id: z.string({
    required_error: "Selecione um cliente",
  }),
  initial_date: z.date({
    required_error: "Selecione a data inicial",
  })
  .refine(date => date instanceof Date && !isNaN(date.getTime()), {
    message: "Data inválida",
  }),
  final_date: z.date({
    required_error: "Selecione a data final",
  })
  .refine(date => date instanceof Date && !isNaN(date.getTime()), {
    message: "Data inválida",
  })
  .refine((date, context) => {
    const initialDate = context.parent.initial_date;
    return !initialDate || date >= initialDate;
  }, {
    message: "A data final deve ser igual ou posterior à data inicial",
  }),
  billing_type: z.string({
    required_error: "Selecione o tipo de faturamento",
  }),
  billing_day: z.coerce
    .number()
    .min(1, "Dia deve ser entre 1 e 31")
    .max(31, "Dia deve ser entre 1 e 31"),
  anticipate_weekends: z.boolean().default(true),
  installments: z.coerce
    .number()
    .min(1, "Deve ter pelo menos 1 parcela"),
  description: z.string().optional(),
  internal_notes: z.string().optional(),
  payment_method: z.enum(['PIX', 'Cartão', 'Transferência', 'Boleto']),
  amount: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  auto_renewal: z.boolean().optional(),
  notifications: z.boolean().optional(),
  terms: z.boolean().refine(val => val === true, 'Aceite os termos')
});

type FormValues = z.infer<typeof formSchema>;

interface CreateContractFormProps {
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
}

export function CreateContractForm({ onSuccess, onCancel }: CreateContractFormProps) {
  const { customers, refetch: refetchCustomers } = useCustomers();
  const { createContract } = useContracts();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      billing_day: 10,
      anticipate_weekends: true,
      installments: 1,
      initial_date: undefined,
      final_date: undefined,
    },
  });

  // Estado para controlar o carregamento
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Obtém os valores atuais do formulário para validação
  const initialDate = form.watch("initial_date");
  const finalDate = form.watch("final_date");

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // AIDEV-NOTE: Validação de datas obrigatórias antes de enviar
      if (!data.initial_date || !data.final_date) {
        throw new Error("Por favor, selecione as datas inicial e final");
      }
      
      // AIDEV-NOTE: Usar hook seguro useContracts que configura automaticamente o tenant_id e RLS
      const contractData = await createContract.mutateAsync({
        customer_id: data.customer_id,
        initial_date: format(data.initial_date, "yyyy-MM-dd"),
        final_date: format(data.final_date, "yyyy-MM-dd"),
        billing_type: data.billing_type,
        billing_day: data.billing_day,
        anticipate_weekends: data.anticipate_weekends,
        installments: data.installments,
        description: data.description,
        internal_notes: data.internal_notes,
        // AIDEV-NOTE: Campos adicionais que não estão no schema do banco mas estão no form
        // payment_method: data.payment_method,
        // amount: data.amount,
        // discount: data.discount,
        // auto_renewal: data.auto_renewal,
        // notifications: data.notifications,
        // terms: data.terms
      });
      
      if (contractData?.id) {
        console.log('✅ Contrato criado com sucesso:', {
          id: contractData.id,
          customer_id: '***' + data.customer_id.slice(-4), // Mascarar ID do cliente
        });
        onSuccess(contractData.id);
      }
    } catch (error) {
      console.error("❌ Erro ao criar contrato:", error);
      // AIDEV-NOTE: O hook useContracts já exibe toast de erro automaticamente
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientCreated = async (clientId: string) => {
    await refetchCustomers();
    form.setValue("customer_id", clientId);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Cliente</FormLabel>
                <CreateClientDialog 
                  onClientCreated={handleClientCreated}
                  trigger={
                    <PlusCircle className="h-4 w-4 cursor-pointer text-primary hover:text-primary/80" />
                  }
                />
              </div>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers?.map((customer) => {
                    if (!customer || !customer.id) return null;
                    return (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name || `Cliente ${customer.id}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormDescription>
                O cliente que estará vinculado a este contrato
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="initial_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Inicial</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={
                          "pl-3 text-left font-normal"
                        }
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date); // Atualiza o valor do campo
                        // Se a data final for anterior à nova data inicial, limpa a data final
                        if (date && finalDate && date > finalDate) {
                          form.setValue('final_date', undefined);
                        }
                      }}
                      initialFocus
                      fromDate={new Date()} // Impede seleção de datas passadas
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Data de início da vigência do contrato
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="final_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Final</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={
                          "pl-3 text-left font-normal"
                        }
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(date);
                        }
                      }}
                      disabled={(date) => {
                        // Desabilita datas anteriores à data inicial, se existir
                        return initialDate 
                          ? date < initialDate 
                          : date < new Date(new Date().setHours(0, 0, 0, 0)); // Se não houver data inicial, desabilita datas passadas
                      }}
                      initialFocus
                      fromDate={initialDate || new Date()} // Só permite datas a partir da data inicial
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Data de término da vigência do contrato
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="billing_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Faturamento</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de faturamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Bimestral">Bimestral</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Frequência de geração dos faturamentos
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="billing_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia de Vencimento</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Dia do mês para vencimento dos faturamentos
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="anticipate_weekends"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Antecipar Finais de Semana
                  </FormLabel>
                  <FormDescription>
                    Se o vencimento cair no final de semana, antecipar para sexta-feira
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Parcelas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Quantidade de parcelas para faturamento
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o contrato"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Descrição geral do contrato (será visível para o cliente)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="internal_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Internas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adicione notas internas"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Observações internas (não visíveis para o cliente)
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Criando..." : "Criar Contrato"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
