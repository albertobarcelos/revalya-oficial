/**
 * Aba de Endereço
 * AIDEV-NOTE: Componente separado para melhor organização
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Search } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanyDataForm } from "../../schemas";
import { ESTADOS_BRASILEIROS } from "../../constants";
import { formatCEP } from "../../utils/formatters";

interface AddressTabProps {
  form: UseFormReturn<CompanyDataForm>;
  onSearchAddress: () => void;
  onSearchCEP: () => void;
}

export function AddressTab({ form, onSearchAddress, onSearchCEP }: AddressTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="logradouro">Endereço *</Label>
        <div className="flex gap-2">
          <Input
            id="logradouro"
            {...form.register("logradouro")}
            placeholder="Rua, Avenida, etc."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSearchAddress}
          >
            <Globe className="h-4 w-4 mr-2" />
            Pesquisar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="numero">Número *</Label>
        <Input
          id="numero"
          {...form.register("numero")}
          placeholder="Número"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bairro">Bairro *</Label>
        <Input
          id="bairro"
          {...form.register("bairro")}
          placeholder="Bairro"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="complemento">Complemento</Label>
        <Input
          id="complemento"
          {...form.register("complemento")}
          placeholder="Sala, Andar, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="uf">Estado *</Label>
        <Select
          value={form.watch("uf")}
          onValueChange={(value) => form.setValue("uf", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_BRASILEIROS.map((estado) => (
              <SelectItem key={estado.value} value={estado.value}>
                {estado.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cidade">Cidade *</Label>
        <div className="flex gap-2">
          <Input
            id="cidade"
            {...form.register("cidade")}
            placeholder="Cidade"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cep">CEP *</Label>
        <div className="flex gap-2">
          <Input
            id="cep"
            {...form.register("cep", {
              onChange: (e) => {
                const formatted = formatCEP(e.target.value);
                form.setValue("cep", formatted, { shouldValidate: true });
              },
            })}
            placeholder="00000-000"
            maxLength={9}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSearchCEP}
          >
            <Globe className="h-4 w-4 mr-2" />
            Pesquisar CEP
          </Button>
        </div>
      </div>
    </div>
  );
}

