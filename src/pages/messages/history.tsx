import React, { useState, useEffect } from 'react';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge,
} from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import type { MessageHistory } from "@/types/database";
import { Layout } from "@/components/layout/Layout";
import { ChevronLeft, ChevronRight, Eye, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function MessageHistoryPage() {
  // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA (CAMADA 1)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  const [selectedMessage, setSelectedMessage] = useState<MessageHistory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 🔍 AUDIT LOG OBRIGATÓRIO
  useEffect(() => {
    if (hasAccess && currentTenant) {
      console.log(`🔍 [AUDIT] Acessando histórico de mensagens - Tenant: ${currentTenant.name} (${currentTenant.id})`);
    }
  }, [hasAccess, currentTenant]);
  
  // 🔐 HOOK SEGURO OBRIGATÓRIO (CAMADA 2) - DEVE VIR ANTES DO EARLY RETURN
  const { data, isLoading } = useSecureTenantQuery(
    ["message-history", currentPage.toString(), pageSize.toString()],
    async (supabase: SupabaseClient, tenantId: string) => {
      console.log(`🔍 [SECURITY] Buscando mensagens para tenant: ${tenantId}`);
      
      // Busca o total de registros
      const { count } = await supabase
        .from('message_history')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId); // 🔑 FILTRO OBRIGATÓRIO POR TENANT

      // Busca os registros da página atual
      const { data: messages, error } = await supabase
        .from('message_history')
        .select('*')
        .eq('tenant_id', tenantId) // 🔑 FILTRO OBRIGATÓRIO POR TENANT
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) {
        console.error(`🚨 [SECURITY] Erro ao buscar mensagens:`, error);
        throw error;
      }
      
      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA (CAMADA 3)
      if (messages) {
        const invalidData = messages.filter(item => item.tenant_id !== tenantId);
        if (invalidData.length > 0) {
          console.error(`🚨 [CRITICAL] Violação de segurança detectada! Dados de outros tenants:`, invalidData);
          throw new Error('❌ ERRO CRÍTICO: Violação de isolamento de dados detectada!');
        }
        console.log(`✅ [SECURITY] ${messages.length} mensagens validadas para tenant ${tenantId}`);
      }

      return {
        messages: messages as MessageHistory[],
        totalCount: count || 0,
      };
    },
    {
      enabled: !!currentTenant?.id // 🔒 SÓ EXECUTA SE TENANT VÁLIDO
    }
  );

  // 🚨 GUARD CLAUSE OBRIGATÓRIA - AGORA APÓS TODOS OS HOOKS
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Acesso Negado</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{accessError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Volta para a primeira página ao mudar o tamanho
  };

  const content = (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Histórico de Mensagens</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data de Envio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.messages.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>{item.customer_name}</TableCell>
                <TableCell>{item.customer_phone}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'success' ? 'success' : 'destructive'}>
                    {item.status === 'success' ? 'Sucesso' : 'Erro'}
                  </Badge>
                  {item.error_message && (
                    <span className="text-sm text-red-500 block mt-1">
                      {item.error_message}
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {item.message_content}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedMessage(item)}
                    title="Ver mensagem completa"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Nenhuma mensagem encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mensagem Completa</DialogTitle>
            <DialogDescription>
              Visualize todos os detalhes da mensagem enviada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Cliente</h4>
              <p>{selectedMessage?.customer_name}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Telefone</h4>
              <p>{selectedMessage?.customer_phone}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Data de Envio</h4>
              <p>
                {selectedMessage && format(new Date(selectedMessage.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Status</h4>
              <Badge variant={selectedMessage?.status === 'success' ? 'success' : 'destructive'}>
                {selectedMessage?.status === 'success' ? 'Sucesso' : 'Erro'}
              </Badge>
              {selectedMessage?.error_message && (
                <span className="text-sm text-red-500 block mt-1">
                  {selectedMessage.error_message}
                </span>
              )}
            </div>
            <div>
              <h4 className="font-medium mb-1">Mensagem</h4>
              <p className="whitespace-pre-wrap">{selectedMessage?.message_content}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-10">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-64" />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
          <div className="rounded-md border">
            <div className="p-4">
              <div className="grid grid-cols-6 gap-4 mb-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="grid grid-cols-6 gap-4 py-3 border-t">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return <Layout>{content}</Layout>;
}
