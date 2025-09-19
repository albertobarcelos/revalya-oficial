import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, CheckCircle, XCircle } from "lucide-react";
import { useUpdateValues } from "@/hooks/useUpdateValues";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function UpdateValuesList() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "delete">("approve");
  const { toast } = useToast();

  const { updateRequestStatus, getRequests } = useUpdateValues();

  const fetchRequests = async () => {
    setIsLoading(true);
    const data = await getRequests();
    setRequests(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (approved: boolean) => {
    if (!selectedRequest) return;

    try {
      await updateRequestStatus(selectedRequest.id, approved ? "aprovado" : "rejeitado");

      toast({
        title: approved ? "Aprovada!" : "Rejeitada!",
        description: approved
          ? "A solicitação foi aprovada com sucesso!"
          : "A solicitação foi rejeitada.",
      });
    } catch (error) {
      console.error("Erro ao atualizar solicitação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setIsDialogOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    }
  };

  const openDialog = (request: any, type: "approve" | "reject" | "delete") => {
    setSelectedRequest(request);
    setActionType(type);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Módulo/Terminal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{format(new Date(request.data_solicitacao), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.data_solicitacao), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{request.solicitante || "Não informado"}</TableCell>
                <TableCell>{request.customer?.name}</TableCell>
                <TableCell>{request.customer?.cpf_cnpj}</TableCell>
                <TableCell>{request.descricao}</TableCell>
                <TableCell>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(request.valor)}
                  {request.tipo === "terminal" && request.quantidade > 1 && (
                    <span className="text-xs text-muted-foreground block">
                      {request.quantidade}x = {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(request.valor * request.quantidade)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="capitalize">{request.tipo}</TableCell>
                <TableCell>
                  {request.modulo_terminal}
                  {request.tipo === "terminal" && request.quantidade > 1 && (
                    <span className="text-xs text-muted-foreground block">
                      Quantidade: {request.quantidade}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.status === "aprovado"
                        ? "success"
                        : request.status === "rejeitado"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {request.status === "pendente" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(request, "approve")}
                        >
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(request, "reject")}
                        >
                          Rejeitar
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(request, "delete")}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve"
                ? "Aprovar Solicitação"
                : actionType === "reject"
                ? "Rejeitar Solicitação"
                : "Excluir Solicitação"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "delete"
                ? "Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita."
                : `Tem certeza que deseja ${
                    actionType === "approve" ? "aprovar" : "rejeitar"
                  } esta solicitação? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionType === "delete"
                  ? () => {}
                  : handleStatusUpdate(actionType === "approve")
              }
              className={actionType === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
