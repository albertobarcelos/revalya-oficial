import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function InvalidLink() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorDescription = searchParams.get("error_description");

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Link Inválido</CardTitle>
          <CardDescription className="text-base">
            {errorDescription?.replace(/\+/g, ' ') || 'O link de convite é inválido ou expirou'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            Por favor, solicite um novo convite ao administrador do sistema.
          </p>
          <Button onClick={() => navigate("/login")}>
            Voltar para o Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 
