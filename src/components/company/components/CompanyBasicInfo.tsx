/**
 * Componente para dados básicos da empresa
 * AIDEV-NOTE: Componente separado para melhor organização
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import type { CompanyDataForm } from "../schemas";
import { formatCNPJ } from "../utils/formatters";

interface CompanyBasicInfoProps {
  form: UseFormReturn<CompanyDataForm>;
  onSearchCNPJ: () => Promise<void>;
}

export function CompanyBasicInfo({ form, onSearchCNPJ }: CompanyBasicInfoProps) {
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      await onSearchCNPJ();
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="razao_social">Razão Social *</Label>
          <Input
            id="razao_social"
            {...form.register("razao_social")}
            placeholder="Razão Social"
          />
          {form.formState.errors.razao_social && (
            <p className="text-sm text-red-500">
              {form.formState.errors.razao_social.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <div className="flex gap-2">
            <Input
              id="cnpj"
              {...form.register("cnpj", {
                onChange: (e) => {
                  const formatted = formatCNPJ(e.target.value);
                  form.setValue("cnpj", formatted, { shouldValidate: true });
                },
              })}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Pesquisar CNPJ
            </Button>
          </div>
          {form.formState.errors.cnpj && (
            <p className="text-sm text-red-500">
              {form.formState.errors.cnpj.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
          <Input
            id="nome_fantasia"
            {...form.register("nome_fantasia")}
            placeholder="Nome Fantasia"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="ddd">DDD *</Label>
            <Input
              id="ddd"
              {...form.register("ddd")}
              placeholder="00"
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              {...form.register("telefone")}
              placeholder="0000-0000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

