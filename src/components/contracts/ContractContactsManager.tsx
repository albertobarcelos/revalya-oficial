import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Users, ShieldAlert, RefreshCw, MoreVertical, Pencil, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Upload, Loader2, FileCheck, BadgeCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface ContactItem {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  active?: boolean;
  created_at?: string;
}

/**
 * ContractContactsManager
 * Comentário de nível de função: lista contatos (signers) da Assinafy via Edge Function com segurança multi-tenant
 */
export function ContractContactsManager() {
  const { toast } = useToast();
  const { hasAccess } = useTenantAccessGuard();
  const [page] = useState<number>(1);
  const [perPage] = useState<number>(20);
  const [search, setSearch] = useState<string>("");
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<ContactItem | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [docsSearch, setDocsSearch] = useState<string>("");

  const { data, isLoading, error, refetch } = useSecureTenantQuery<unknown>(
    ["assinafy", "contacts", String(page), String(perPage), search.trim()],
    async (supabaseClient) => {
      const { data, error } = await supabaseClient.functions.invoke<{ contacts: unknown }>(
        "assinafy-list-contacts",
        { body: { page, per_page: perPage, search: search.trim() || undefined } }
      );
      if (error) throw new Error(error.message || "Erro ao listar contatos da Assinafy");
      return data?.contacts ?? [];
    },
    { enabled: hasAccess, staleTime: 5 * 60 * 1000 }
  );

  const updateMutation = useSecureTenantMutation<{ success: boolean }, { signer_id: string; full_name?: string; email?: string }>(
    async (supabaseClient, _tenantId, payload) => {
      const { data, error } = await supabaseClient.functions.invoke<{ success: boolean }>(
        "assinafy-update-contact",
        { body: payload }
      );
      if (error) throw new Error(error.message || "Erro ao atualizar contato");
      return { success: Boolean(data?.success) };
    },
    {
      onSuccess: () => {
        toast({ title: "Contato atualizado", description: "As alterações foram salvas com sucesso." });
        setEditOpen(false);
        setSelected(null);
        refetch?.();
      },
      onError: (e) => {
        toast({ title: "Falha ao atualizar", description: e.message, variant: "destructive" });
      }
    }
  );

  const deleteMutation = useSecureTenantMutation<{ success: boolean }, { signer_id: string }>(
    async (supabaseClient, _tenantId, payload) => {
      const { data, error } = await supabaseClient.functions.invoke<{ success: boolean }>(
        "assinafy-delete-contact",
        { body: payload }
      );
      if (error) throw new Error(error.message || "Erro ao excluir contato");
      return { success: Boolean(data?.success) };
    },
    {
      onSuccess: () => {
        toast({ title: "Contato excluído", description: "O contato foi removido com sucesso." });
        setDeleteOpen(false);
        setSelected(null);
        refetch?.();
      },
      onError: (e) => {
        toast({ title: "Falha ao excluir", description: e.message, variant: "destructive" });
      }
    }
  );

  function normalize(input: unknown): ContactItem[] {
    const map = (it: unknown): ContactItem | null => {
      if (!it || typeof it !== "object") return null;
      const o = it as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : undefined;
      const name = typeof o.name === "string" ? o.name : (typeof o.full_name === "string" ? o.full_name : undefined);
      const email = typeof o.email === "string" ? o.email : undefined;
      const phone = typeof o.phone === "string" ? o.phone : undefined;
      const active = typeof o.active === "boolean" ? o.active : undefined;
      const created_at = typeof o.created_at === "string" ? o.created_at : undefined;
      if (!id || !name) return null;
      return { id, name, email, phone, active, created_at };
    };
    const tryArray = (arr: unknown): ContactItem[] => Array.isArray(arr) ? arr.map(map).filter(Boolean) as ContactItem[] : [];
    if (Array.isArray(input)) return tryArray(input);
    if (input && typeof input === "object") {
      const obj = input as Record<string, unknown>;
      for (const key of ["contacts", "data", "items"]) {
        const maybe = obj[key];
        const normalized = tryArray(maybe);
        if (normalized.length) return normalized;
      }
    }
    return [];
  }

  const contacts = useMemo<ContactItem[]>(() => normalize(data), [data]);

  interface DocumentItem {
    id: string;
    name?: string;
    status?: string;
    method?: string;
    updated_at?: string;
    signers_count?: number;
  }

  function normalizeDocs(input: unknown): DocumentItem[] {
    const map = (it: unknown): DocumentItem | null => {
      if (!it || typeof it !== "object") return null;
      const o = it as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : undefined;
      const name = typeof o.name === "string" ? o.name : undefined;
      const status = typeof o.status === "string" ? o.status : undefined;
      const assignment = o.assignment as Record<string, unknown> | undefined;
      const method = assignment && typeof assignment.method === "string" ? assignment.method : undefined;
      const updated_at = typeof o.updated_at === "string" ? o.updated_at : undefined;
      const signers = assignment && Array.isArray((assignment as any).signers) ? (assignment as any).signers : undefined;
      const signers_count = Array.isArray(signers) ? signers.length : undefined;
      if (!id) return null;
      return { id, name, status, method, updated_at, signers_count };
    };
    const tryArray = (arr: unknown): DocumentItem[] => Array.isArray(arr) ? arr.map(map).filter(Boolean) as DocumentItem[] : [];
    if (Array.isArray(input)) return tryArray(input);
    if (input && typeof input === "object") {
      const obj = input as Record<string, unknown>;
      for (const key of ["documents", "data", "items"]) {
        const maybe = obj[key];
        const normalized = tryArray(maybe);
        if (normalized.length) return normalized;
      }
    }
    return [];
  }

  const { data: docsData, isLoading: docsLoading, refetch: refetchDocs } = useSecureTenantQuery<unknown>(
    selected && editOpen ? ["assinafy", "signer-docs", selected.id, docsSearch.trim()] : ["assinafy", "signer-docs", "idle"],
    async (supabaseClient) => {
      if (!selected) return [];
      const { data, error } = await supabaseClient.functions.invoke<{ documents: unknown }>(
        "assinafy-list-signer-documents",
        { body: { signer_id: selected.id, search: docsSearch.trim() || undefined } }
      );
      if (error) throw new Error(error.message || "Erro ao listar documentos do contato");
      return data?.documents ?? [];
    },
    { enabled: hasAccess && !!selected && editOpen, staleTime: 60 * 1000 }
  );
  const documents = useMemo<DocumentItem[]>(() => normalizeDocs(docsData), [docsData]);

  /**
   * Traduz status do documento Assinafy para PT-BR
   * Comentário de nível de função: padroniza exibição amigável em português
   */
  function translateDocumentStatus(status?: string): string {
    const map: Record<string, string> = {
      uploading: "Upload em Andamento",
      uploaded: "Upload Concluído",
      metadata_processing: "Processando Metadados",
      metadata_ready: "Metadados Prontos",
      expired: "Expirado",
      certificating: "Em Certificação",
      certificated: "Certificado",
      rejected_by_signer: "Rejeitado pelo Signatário",
      pending_signature: "Pendente de Assinatura",
      rejected_by_user: "Rejeitado pelo Usuário",
      failed: "Falha no Processamento",
    };
    if (!status) return "—";
    const key = status.toLowerCase();
    return map[key] ?? status;
  }

  /**
   * Traduz método de assinatura para PT-BR
   * Comentário de nível de função: padroniza exibição amigável em português
   */
  function translateMethod(method?: string): string {
    const map: Record<string, string> = {
      virtual: "Virtual",
      collect: "Coleta",
    };
    if (!method) return "—";
    const key = method.toLowerCase();
    return map[key] ?? method;
  }

  interface StatusMeta { icon: React.ElementType; colorClass: string; text: string; spin?: boolean }
  /**
   * Mapeia status para ícone e cor em PT-BR
   * Comentário de nível de função: fornece apresentação visual consistente por status
   */
  function getDocumentStatusMeta(status?: string): StatusMeta {
    const key = (status || "").toLowerCase();
    const text = translateDocumentStatus(key);
    switch (key) {
      case "pending_signature":
        return { icon: Clock, colorClass: "text-amber-600", text };
      case "certificated":
        return { icon: CheckCircle, colorClass: "text-green-600", text };
      case "certificating":
        return { icon: BadgeCheck, colorClass: "text-indigo-600", text };
      case "rejected_by_signer":
      case "rejected_by_user":
        return { icon: XCircle, colorClass: "text-red-600", text };
      case "expired":
        return { icon: AlertCircle, colorClass: "text-red-600", text };
      case "failed":
        return { icon: AlertCircle, colorClass: "text-red-600", text };
      case "metadata_processing":
        return { icon: Loader2, colorClass: "text-blue-600", text, spin: true };
      case "metadata_ready":
        return { icon: FileCheck, colorClass: "text-blue-600", text };
      case "uploaded":
        return { icon: Upload, colorClass: "text-sky-600", text };
      case "uploading":
        return { icon: Upload, colorClass: "text-amber-600", text };
      default:
        return { icon: AlertCircle, colorClass: "text-slate-600", text };
    }
  }

  if (!hasAccess) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-heading-3 font-semibold">Acesso Negado</h3>
          <p className="text-muted-foreground text-sm">Você não tem permissão para visualizar Contatos.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Contatos</CardTitle>
                <CardDescription>Lista de contatos (signers) disponíveis na Assinafy</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por nome ou e-mail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch?.()} disabled={isLoading}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando contatos...</TableCell>
                  </TableRow>
                )}
                {!isLoading && contacts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/15 text-primary">{c.active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelected(c);
                              setEditName(c.name);
                              setEditEmail(c.email || "");
                              setEditOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelected(c);
                              setDeleteOpen(true);
                            }}
                            className="gap-2 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum contato encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>Atualize o nome e e-mail do contato.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-2">Documentos associados</h4>
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="Buscar por nome ou e-mail do signatário"
                  value={docsSearch}
                  onChange={(e) => setDocsSearch(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline" size="sm" onClick={() => refetchDocs?.()} disabled={docsLoading}>Atualizar</Button>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead>Signatários</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">Carregando documentos...</TableCell>
                      </TableRow>
                    )}
                    {!docsLoading && documents.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name || "—"}</TableCell>
                        <TableCell>
                          {(() => {
                            const meta = getDocumentStatusMeta(d.status);
                            const Icon = meta.icon;
                            return (
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${meta.colorClass} ${meta.spin ? "animate-spin" : ""}`} />
                                <span className="text-muted-foreground">{meta.text}</span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{translateMethod(d.method)}</TableCell>
                        <TableCell className="text-muted-foreground">{d.updated_at ? new Date(d.updated_at).toLocaleString() : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{typeof d.signers_count === "number" ? d.signers_count : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!docsLoading && documents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">Nenhum documento associado</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (!selected) return;
                  updateMutation.mutate({ signer_id: selected.id, full_name: editName || undefined, email: editEmail || undefined });
                }}
                disabled={updateMutation.isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selected) return;
                deleteMutation.mutate({ signer_id: selected.id });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
