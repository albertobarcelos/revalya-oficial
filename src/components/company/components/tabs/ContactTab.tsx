/**
 * Aba de Telefones e E-mail
 * AIDEV-NOTE: Componente separado para melhor organização
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanyDataForm } from "../../schemas";

interface ContactTabProps {
  form: UseFormReturn<CompanyDataForm>;
}

export function ContactTab({ form }: ContactTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="ddd_telefone2">DDD Telefone 2</Label>
          <Input
            id="ddd_telefone2"
            {...form.register("ddd_telefone2")}
            placeholder="00"
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone2">Telefone 2</Label>
          <Input
            id="telefone2"
            {...form.register("telefone2")}
            placeholder="0000-0000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="ddd_fax">DDD Fax</Label>
          <Input
            id="ddd_fax"
            {...form.register("ddd_fax")}
            placeholder="00"
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fax">Fax</Label>
          <Input
            id="fax"
            {...form.register("fax")}
            placeholder="0000-0000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="email@exemplo.com.br"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
          >
            <Globe className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">WebSite</Label>
        <div className="flex gap-2">
          <Input
            id="website"
            {...form.register("website")}
            placeholder="https://www.exemplo.com.br"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
          >
            <Globe className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

