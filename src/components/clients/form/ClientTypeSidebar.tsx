import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-react";

interface ClientTypeSidebarProps {
  formData: any;
  onChange: (field: string, value: boolean) => void;
}

export function ClientTypeSidebar({ formData, onChange }: ClientTypeSidebarProps) {
  return (
    <Card className="h-fit sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          Tipo de Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is_supplier" className="flex flex-col gap-1 cursor-pointer">
              <span className="font-medium">Fornecedor</span>
              <span className="text-xs text-muted-foreground font-normal">
                Indica se este cliente também é um fornecedor
              </span>
            </Label>
            <Switch
              id="is_supplier"
              checked={formData.is_supplier || false}
              onCheckedChange={(checked) => onChange('is_supplier', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is_carrier" className="flex flex-col gap-1 cursor-pointer">
              <span className="font-medium">Transportadora</span>
              <span className="text-xs text-muted-foreground font-normal">
                Indica se este cliente é uma transportadora
              </span>
            </Label>
            <Switch
              id="is_carrier"
              checked={formData.is_carrier || false}
              onCheckedChange={(checked) => onChange('is_carrier', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
