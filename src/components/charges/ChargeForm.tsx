import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientsService } from "@/services/clientsService";
import { useCharges } from "@/hooks/useCharges";
import { Loader2 } from "lucide-react";
import type { Customer, Cobranca } from "@/types/database";

interface ChargeFormProps {
  onSubmit?: (charge: Cobranca) => void;
  onSuccess?: () => void;
  initialData?: Partial<Cobranca>;
}

export const ChargeForm = ({ onSubmit, onSuccess, initialData }: ChargeFormProps) => {
  const { toast } = useToast();
  const { create, updateCharge, isCreating, isUpdating } = useCharges({});
  const [clients, setClients] = useState<Customer[]>([]);
  // AIDEV-NOTE: FormData corrigido - usando apenas campos que EXISTEM no banco
  const [formData, setFormData] = useState({
    customer_id: initialData?.customer_id || '',
    valor: initialData?.valor || 0,
    data_vencimento: initialData?.data_vencimento ? new Date(initialData.data_vencimento).toISOString().split('T')[0] : '',
    descricao: initialData?.descricao || '',
    status: initialData?.status || 'PENDING',
    tipo: initialData?.tipo || 'BOLETO',
    asaas_id: initialData?.asaas_id || null,
    contract_id: initialData?.contract_id || null
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await clientsService.getAllClients();
      setClients(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create a date object and adjust for timezone
      const date = new Date(formData.data_vencimento);
      date.setUTCHours(12, 0, 0, 0); // Set to noon UTC to avoid timezone issues
      const formattedDate = date.toISOString().split('T')[0];
      
      // AIDEV-NOTE: ChargeData corrigido - usando apenas campos que EXISTEM no banco
      const chargeData: Omit<Cobranca, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> = {
        customer_id: formData.customer_id,
        valor: formData.valor,
        data_vencimento: formattedDate,
        descricao: formData.descricao,
        status: formData.status as Cobranca['status'],
        tipo: formData.tipo as Cobranca['tipo'],
        asaas_id: formData.asaas_id,
        contract_id: formData.contract_id
      };

      console.log('Submitting charge data:', chargeData);

      if (initialData?.id) {
        await updateCharge({ id: initialData.id, data: chargeData });
      } else {
        await create(chargeData);
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting charge:', error);
      toast({
        title: "Erro na operação",
        description: "Não foi possível processar a cobrança.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="customer">Cliente</Label>
        <Select
          value={formData.customer_id}
          onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="valor">Valor</Label>
        <Input
          id="valor"
          type="number"
          step="0.01"
          value={formData.valor}
          onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
        />
      </div>

      <div>
        <Label htmlFor="data_vencimento">Data de Vencimento</Label>
        <Input
          id="data_vencimento"
          type="date"
          value={formData.data_vencimento}
          onChange={(e) => {
            const selectedDate = e.target.value;
            setFormData({ ...formData, data_vencimento: selectedDate });
          }}
        />
      </div>

      <div>
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
        />
      </div>

      {/* <div>
        <Label htmlFor="prioridade">Prioridade</Label>
        <Select
          value={formData.prioridade}
          onValueChange={(value) => setFormData({ ...formData, prioridade: value as 'alta' | 'media' | 'baixa' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div> */}

      <Button type="submit" disabled={isCreating || isUpdating}>
        {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Atualizar" : "Criar"} Cobrança
      </Button>
    </form>
  );
};
