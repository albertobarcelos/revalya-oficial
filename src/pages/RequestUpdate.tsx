import { useState, useMemo } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useUpdateValues } from "@/hooks/useUpdateValues";
import { Card, CardContent } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { clientsService } from "@/services/clientsService";
import { Label } from "@/components/ui/label";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";

interface UpdateItem {
  tipo: "modulo" | "terminal";
  modulo_terminal: string;
  valor: string;
  descricao: string;
  solicitante: string;
  quantidade?: number;
}

const itemSchema = z.object({
  tipo: z.enum(["modulo", "terminal"], {
    required_error: "Selecione o tipo",
  }),
  modulo_terminal: z.string().min(1, "Campo obrigatório"),
  valor: z.string().refine((val) => !isNaN(Number(val.replace(",", "."))), {
    message: "Valor inválido",
  }),
  descricao: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  solicitante: z.string().min(3, "Nome do solicitante deve ter pelo menos 3 caracteres"),
  quantidade: z.number().optional(),
});

export default function RequestUpdate() {
  // 🛡️ VALIDAÇÃO DE ACESSO MULTI-TENANT OBRIGATÓRIA
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  const { toast } = useToast();
  const { createUpdateRequest } = useUpdateValues();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  
  // 🚨 GUARD CLAUSE: Bloquear acesso se tenant inválido
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-xl shadow-md p-6 border border-border/30">
              <h1 className="text-xl font-bold text-red-600 mb-4">🚨 Acesso Negado</h1>
              <p className="text-muted-foreground">
                {accessError || 'Você não tem permissão para acessar esta página.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 🔍 LOG DE AUDITORIA: Acesso à página de solicitação de atualização
  console.log(`📋 [AUDIT] Acesso à página RequestUpdate - Tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  // Preços fixos para módulos e terminais
  const modulesPrices = {
    "Estoque": "89,90",
    "Financeiro": "89,90",
    "Fiscal": "89,90",
    "Servidor em Nuvem": "59,90",
    "Delivery Legal": "259,90",
    "Fidelidade Legal": "199,90"
  };

  const terminalPrices = {
    "Terminal": "35,00",
    "Terminal Evento": "50,00"
  };

  // Função para calcular o valor total dos itens
  const getTotalValue = () => {
    return items.reduce((total, item) => {
      const itemValue = parseFloat(item.valor.replace(",", "."));
      // Se for terminal, multiplicar pelo número de terminais
      if (item.tipo === "terminal" && item.quantidade) {
        return total + (itemValue * item.quantidade);
      }
      return total + itemValue;
    }, 0);
  };

  // Função para formatar o valor com R$
  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return `R$ ${value.toFixed(2).replace(".", ",")}`;
    }
    return `R$ ${value}`;
  };

  const form = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      tipo: "modulo",
      modulo_terminal: "",
      valor: "",
      descricao: "",
      solicitante: "",
      quantidade: 1,
    },
  });

  const addItem = (values: z.infer<typeof itemSchema>) => {
    setItems([...items, {
      tipo: values.tipo,
      modulo_terminal: values.modulo_terminal,
      valor: values.valor,
      descricao: values.descricao,
      solicitante: values.solicitante,
      quantidade: values.quantidade,
    }]);
    form.reset({
      ...form.getValues(),
      modulo_terminal: "",
      valor: "",
      descricao: "",
      quantidade: 1,
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Erro",
        description: "Selecione um cliente antes de enviar a solicitação.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item antes de enviar a solicitação.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      for (const item of items) {
        await createUpdateRequest({
          descricao: item.descricao,
          valor: Number(item.valor.replace(",", ".")),
          tipo: item.tipo,
          modulo_terminal: item.modulo_terminal,
          status: "pendente",
          data_solicitacao: new Date().toISOString(),
          customer_id: selectedCustomer.id,
          solicitante: item.solicitante,
          quantidade: item.quantidade,
        });
      }
      
      setItems([]);
      form.reset({
        descricao: "",
        valor: "",
        tipo: "modulo",
        modulo_terminal: "",
        solicitante: "",
        quantidade: undefined,
      });
      setSelectedClientId("");
      setSelectedCustomer(null);
      
      toast({
        title: "Sucesso!",
        description: "Solicitação enviada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img src="/logos/LOGO-REVALYA123.png" alt="Revalya Logo" className="h-12 mx-auto mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-3 text-primary">
              Solicitar Atualização de Valores
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Preencha o formulário abaixo para solicitar uma atualização de valores para módulos ou terminais.
              Nossa equipe analisará sua solicitação e retornará em breve.
            </p>
          </div>

          {/* Seleção de Cliente */}
          <div className="bg-card rounded-xl shadow-md p-6 mb-6 border border-border/30">
            <h2 className="text-lg font-semibold mb-4 flex items-center text-primary">
              <span className="mr-2">👥</span> Pesquisar Cliente
            </h2>
            
            {/* Substituição do componente de seleção de cliente */}
            <div className="mb-6">
              <Label htmlFor="client" className="text-sm font-medium mb-2 block">Cliente/Empresa</Label>
              <SearchableSelect
                value={selectedClientId}
                onChange={(value) => {
                  setSelectedClientId(value);
                  // Buscar o cliente pelo ID e definir como selectedCustomer
                  // AIDEV-NOTE: Incluir tenant_id para isolamento de dados multi-tenant
                  clientsService.getClientById(value, currentTenant?.id).then(client => {
                    if (client) {
                      setSelectedCustomer(client);
                    }
                  });
                }}
                placeholder="Selecione um cliente"
              />
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-muted/30 rounded-lg text-sm">
                  <div className="font-medium">{selectedCustomer.name}</div>
                  <div className="text-muted-foreground">
                    {selectedCustomer.company} - {selectedCustomer.cpf_cnpj}
                  </div>
                </div>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(addItem)} className="space-y-4">
                <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="solicitante"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Nome do Solicitante</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite seu nome completo"
                            {...field}
                            className="rounded-lg py-2 border-primary/30 focus:border-primary"
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
                      <FormItem className="col-span-1">
                        <FormLabel>Tipo</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Resetar o valor do módulo/terminal quando o tipo muda
                            form.setValue("modulo_terminal", "");
                            // Resetar o valor unitário
                            form.setValue("valor", "");
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-lg py-2 border-primary/30 focus:border-primary">
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

                  <FormField
                    control={form.control}
                    name="modulo_terminal"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>
                          {form.watch("tipo") === "modulo" ? "Módulo" : "Tipo de Terminal"}
                        </FormLabel>
                        <FormControl>
                          {form.watch("tipo") === "modulo" ? (
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Definir o valor fixo com base no módulo selecionado
                                const price = modulesPrices[value as keyof typeof modulesPrices];
                                form.setValue("valor", price);
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-lg py-2 border-primary/30 focus:border-primary">
                                  <SelectValue placeholder="Selecione o módulo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Estoque">Estoque</SelectItem>
                                <SelectItem value="Financeiro">Financeiro</SelectItem>
                                <SelectItem value="Delivery Legal">Delivery Legal</SelectItem>
                                <SelectItem value="Fidelidade Legal">Fidelidade Legal</SelectItem>
                                <SelectItem value="Fiscal">Fiscal</SelectItem>
                                <SelectItem value="Servidor em Nuvem">Servidor em Nuvem</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Definir o valor fixo com base no tipo de terminal selecionado
                                const price = terminalPrices[value as keyof typeof terminalPrices];
                                form.setValue("valor", price);
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-lg py-2 border-primary/30 focus:border-primary">
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Terminal">Terminal</SelectItem>
                                <SelectItem value="Terminal Evento">Terminal Evento</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantidade"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem className="col-span-1" style={{ display: form.watch("tipo") === "terminal" ? "block" : "none" }}>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="1"
                            value={value || 1}
                            onChange={(e) => onChange(parseInt(e.target.value) || 1)}
                            {...field}
                            className="rounded-lg py-2 border-primary/30 focus:border-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>Valor unitário</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0,00"
                            {...field}
                            disabled={true} // Desabilitar a edição do valor
                            className="bg-muted rounded-lg py-2 border-primary/30"
                            value={field.value ? formatValue(field.value) : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Alteração</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva detalhadamente o motivo da alteração..."
                          className="min-h-[100px] resize-none rounded-lg py-2 border-primary/30 focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" variant="secondary" className="transition-all duration-200 hover:scale-105">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Solicitação
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Lista de Itens */}
          {items.length > 0 && (
            <div className="bg-card rounded-xl shadow-md p-6 mb-8 border border-border/30">
              <h2 className="text-lg font-semibold mb-4 flex items-center text-primary">
                <span className="mr-2">📋</span> Itens Adicionados
              </h2>
              <div className="grid gap-3 mt-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium flex items-center text-primary">
                            {item.tipo === "modulo" ? 
                              <><span className="mr-2">📦</span> Módulo: </> : 
                              <><span className="mr-2">💻</span> Terminal ({item.quantidade || 1} un.): </>
                            } 
                            <span className="ml-1 text-foreground">{item.modulo_terminal}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Valor unitário: {formatValue(item.valor)}
                            {item.tipo === "terminal" && item.quantidade && item.quantidade > 1 ? 
                              ` × ${item.quantidade} = ${formatValue(parseFloat(item.valor.replace(",", ".")) * item.quantidade)}` : 
                              ""
                            }
                          </div>
                          <div className="text-sm">Solicitante: {item.solicitante}</div>
                          <div className="text-sm">{item.descricao}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex gap-2 mt-4 justify-between items-center pt-4 border-t border-border/30">
                <div className="text-lg font-semibold flex items-center">
                  <span className="text-primary mr-2">💰</span>
                  Valor Total: <span className="ml-2 text-primary">{formatValue(getTotalValue())}</span>
                </div>
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitação"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground mt-8 pb-8">
            Em caso de dúvidas, entre em contato com nosso suporte através do email{" "}
            <a href="mailto:suporte@nexsyn.com.br" className="text-primary hover:underline">
              suporte@nexsyn.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
