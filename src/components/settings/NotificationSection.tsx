import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface NotificationSectionProps {
  automaticNotifications: boolean;
  setAutomaticNotifications: (value: boolean) => void;
}

export function NotificationSection({ 
  automaticNotifications, 
  setAutomaticNotifications 
}: NotificationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações da Régua de Cobrança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Notificações automáticas</Label>
            <p className="text-sm text-muted-foreground">
              Ativar envio automático de notificações
            </p>
          </div>
          <Switch 
            checked={automaticNotifications}
            onCheckedChange={setAutomaticNotifications}
          />
        </div>
      </CardContent>
    </Card>
  );
}
