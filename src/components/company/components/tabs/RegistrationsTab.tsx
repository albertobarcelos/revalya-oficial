/**
 * Aba de Inscrições, CNAE e Outros
 * AIDEV-NOTE: Componente separado para melhor organização
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanyDataForm } from "../../schemas";
import { TIPOS_ATIVIDADE, REGIMES_TRIBUTARIOS } from "../../constants";

interface RegistrationsTabProps {
  form: UseFormReturn<CompanyDataForm>;
}

export function RegistrationsTab({ form }: RegistrationsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="data_abertura">Data de abertura</Label>
        <div className="flex gap-2">
          <Input
            id="data_abertura"
            type="date"
            {...form.register("data_abertura")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
        <Input
          id="inscricao_estadual"
          {...form.register("inscricao_estadual")}
          placeholder="Inscrição Estadual"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
        <Input
          id="inscricao_municipal"
          {...form.register("inscricao_municipal")}
          placeholder="Inscrição Municipal"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo_atividade">Tipo de Atividade</Label>
        <Select
          value={form.watch("tipo_atividade") || ""}
          onValueChange={(value) => form.setValue("tipo_atividade", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_ATIVIDADE.map((tipo) => (
              <SelectItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="regime_tributario">Regime Tributário</Label>
        <Select
          value={form.watch("regime_tributario") || ""}
          onValueChange={(value) => form.setValue("regime_tributario", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o regime" />
          </SelectTrigger>
          <SelectContent>
            {REGIMES_TRIBUTARIOS.map((regime) => (
              <SelectItem key={regime.value} value={regime.value}>
                {regime.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnae_principal">CNAE Principal</Label>
        <div className="flex gap-2">
          <Input
            id="cnae_principal"
            {...form.register("cnae_principal")}
            placeholder="CNAE Principal"
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
        <Label htmlFor="receita_bruta_12_meses">Receita Bruta em 12 Meses (R$)</Label>
        <Input
          id="receita_bruta_12_meses"
          {...form.register("receita_bruta_12_meses")}
          placeholder="0,00"
        />
      </div>
    </div>
  );
}

