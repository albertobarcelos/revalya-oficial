import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useUpdateValues } from "@/hooks/useUpdateValues";

const formSchema = z.object({
  descricao: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  valor: z.string().refine((val) => !isNaN(Number(val.replace(",", "."))), {
    message: "Valor inválido",
  }),
  tipo: z.enum(["modulo", "terminal"], {
    required_error: "Selecione o tipo",
  }),
  modulo_terminal: z.string().min(1, "Campo obrigatório"),
});

export function UpdateValuesForm() {
  const { toast } = useToast();
  const { createUpdateRequest } = useUpdateValues();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      valor: "",
      tipo: "modulo",
      modulo_terminal: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      
      const valorNumerico = Number(values.valor.replace(",", "."));
      
      await createUpdateRequest({
        descricao: values.descricao,
        valor: valorNumerico,
        tipo: values.tipo,
        modulo_terminal: values.modulo_terminal,
        status: "pendente",
        data_solicitacao: new Date().toISOString(),
      });

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação foi enviada com sucesso!",
      });

      form.reset();
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição da Alteração</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva detalhadamente a alteração necessária..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor a ser Atualizado</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0,00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="modulo">Módulo</SelectItem>
                    <SelectItem value="terminal">Terminal</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="modulo_terminal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Módulo/Terminal</FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite o nome do módulo ou terminal"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
        </Button>
      </form>
    </Form>
  );
} 
