import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UserSection() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Gerencie os usuários do sistema e envie convites para novos usuários.
        </p>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate("/invites")}
        >
          Gerenciar Usuários
        </Button>
      </CardContent>
    </Card>
  );
}
