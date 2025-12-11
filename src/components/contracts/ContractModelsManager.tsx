import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Trash2, ShieldAlert } from "lucide-react";

interface ContractModelItem {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Componente: ContractModelsManager
 * Função: Gerenciar modelos de contrato dentro de Configurações → Contratos
 * Comentário de nível de função: implementa UI segura multi-tenant com dados em memória;
 * integrações com Supabase podem ser adicionadas mantendo mesma estrutura e RLS.
 */
export function ContractModelsManager() {
  const { toast } = useToast();
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const [modelsLocal, setModelsLocal] = useState<ContractModelItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; description: string; is_active: boolean }>({
    name: "",
    description: "",
    is_active: true,
  });

  /**
   * Normaliza a resposta de templates da Assinafy para `ContractModelItem[]`
   * Comentário de nível de função: garante tipagem segura mesmo com formatos variados da API.
   */
  function normalizeTemplates(input: unknown): ContractModelItem[] {
    const mapItem = (item: unknown): ContractModelItem | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : undefined;
      const name = typeof o.name === "string" ? o.name : undefined;
      const description = typeof o.description === "string" ? o.description : undefined;
      const is_active = typeof o.is_active === "boolean" ? o.is_active : true;
      const created_at = typeof o.created_at === "string" ? o.created_at : new Date().toISOString();
      if (!id || !name) return null;
      return { id, name, description, is_active, created_at };
    };

    const tryArray = (arr: unknown): ContractModelItem[] => {
      if (!Array.isArray(arr)) return [];
      return arr.map(mapItem).filter((v): v is ContractModelItem => Boolean(v));
    };

    if (Array.isArray(input)) return tryArray(input);
    if (input && typeof input === "object") {
      const obj = input as Record<string, unknown>;
      for (const key of ["templates", "data", "items"]) {
        const maybe = obj[key];
        const normalized = tryArray(maybe);
        if (normalized.length) return normalized;
      }
    }
    return [];
  }

  const query = useSecureTenantQuery(
    ["assinafy", "templates"],
    async (supabaseClient) => {
      const { data, error } = await supabaseClient.functions.invoke<{ templates: unknown }>(
        "assinafy-list-templates",
        { body: {} }
      );
      if (error) throw new Error(error.message || "Erro ao listar templates da Assinafy");
      return data?.templates ?? [];
    },
    { enabled: hasAccess }
  );

  const models = useMemo<ContractModelItem[]>(() => {
    const remote = normalizeTemplates(query.data);
    return [...remote, ...modelsLocal];
  }, [query.data, modelsLocal]);

  const deleteMutation = useSecureTenantMutation<{ success: boolean }, { templateId: string }>(
    async (supabaseClient, _tenantId, variables) => {
      const { data, error } = await supabaseClient.functions.invoke<{ success: boolean }>(
        "assinafy-delete-template",
        { body: { template_id: variables.templateId } }
      );
      if (error) throw new Error(error.message || "Erro ao excluir template da Assinafy");
      return { success: Boolean(data?.success) };
    },
    {
      invalidateQueries: ["assinafy"],
      onSuccess: () => {
        query.refetch?.();
      }
    }
  );

  const handleCreate = () => {
    if (!createForm.name.trim()) {
      toast({ title: "Erro", description: "Nome do modelo é obrigatório", variant: "destructive" });
      return;
    }
    const newItem: ContractModelItem = {
      id: `mdl-${Math.random().toString(36).slice(2, 8)}`,
      name: createForm.name.trim(),
      description: createForm.description.trim(),
      is_active: createForm.is_active,
      created_at: new Date().toISOString(),
    };
    setModelsLocal(prev => [newItem, ...prev]);
    setIsCreateOpen(false);
    setCreateForm({ name: "", description: "", is_active: true });
    toast({ title: "Modelo criado", description: "Modelo de contrato criado com sucesso" });
  };

  const handleDelete = (id: string) => {
    // Exclusão local para itens criados no frontend
    if (id.startsWith("mdl-")) {
      setModelsLocal(prev => prev.filter(m => m.id !== id));
      toast({ title: "Modelo removido", description: "Modelo excluído com sucesso" });
      return;
    }
    deleteMutation.mutate({ templateId: id });
  };

  if (!hasAccess) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-heading-3 font-semibold">Acesso Negado</h3>
          <p className="text-muted-foreground text-sm">Você não tem permissão para visualizar Modelos de Contrato.</p>
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
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Modelos de Contrato</CardTitle>
                <CardDescription>Gerencie modelos reutilizáveis para criação rápida de contratos</CardDescription>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo Modelo
              </Button>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading && (
            <div className="text-sm text-muted-foreground mb-3">Carregando templates da Assinafy...</div>
          )}
          {query.error && (
            <div className="flex items-center justify-between mb-3 rounded-lg border p-3">
              <span className="text-sm text-destructive">Falha ao carregar templates da Assinafy</span>
              <Button variant="outline" size="sm" onClick={() => query.refetch?.()}>Tentar novamente</Button>
            </div>
          )}
          <div className="rounded-2xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.description || "—"}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/15 text-primary">{m.is_active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleDelete(m.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {models.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum modelo cadastrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Modelo</DialogTitle>
            <DialogDescription>Defina um modelo reutilizável para acelerar a criação de contratos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Nome *</Label>
              <Input id="model-name" value={createForm.name} onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Contrato de Serviços" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-description">Descrição</Label>
              <Input id="model-description" value={createForm.description} onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Detalhes do modelo" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={createForm.is_active} onCheckedChange={v => setCreateForm(prev => ({ ...prev, is_active: Boolean(v) }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
