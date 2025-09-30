import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, MessageSquare, Clock, CheckCircle, XCircle, CheckCircle2, Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTenantAccessGuard, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
// AIDEV-NOTE: Hooks obrigatórios para segurança multi-tenant seguindo o guia

interface MessageHistoryProps {
  chargeId: string;
}

export function MessageHistory({ chargeId }: MessageHistoryProps) {
  // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA (CAMADA 1)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🔍 AUDIT LOG OBRIGATÓRIO
  useEffect(() => {
    if (hasAccess && currentTenant) {
      console.log(`🔍 [AUDIT] Acessando histórico de mensagens da cobrança - Tenant: ${currentTenant.name} (${currentTenant.id}), Charge: ${chargeId}`);
    }
  }, [hasAccess, currentTenant, chargeId]);
  
  // 🚨 GUARD CLAUSE OBRIGATÓRIA
  if (!hasAccess) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Acesso Negado</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">{accessError}</p>
        </CardContent>
      </Card>
    );
  }
  
  // 🔐 HOOK SEGURO OBRIGATÓRIO (CAMADA 2)
  const { data: logs, isLoading } = useSecureTenantQuery(
    ['message-history', chargeId],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Usando a tabela correta 'message_history' conforme schema
      console.log('🔍 [DEBUG] MessageHistory - Iniciando busca segura:', { 
        chargeId, 
        tenantId,
        currentTenant: currentTenant?.name 
      });

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      const { data, error } = await supabase
        .from('message_history')
        .select(`
          id,
          created_at,
          status,
          message,
          tenant_id,
          metadata,
          template_id,
          notification_templates!inner(
            name,
            category
          )
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO
        .eq('charge_id', chargeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🚨 [ERROR] MessageHistory - Erro na consulta:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA (CAMADA 3)
      if (data) {
        const invalidData = data.filter(item => item.tenant_id !== tenantId);
        if (invalidData.length > 0) {
          console.error('🚨 [CRITICAL] Violação de segurança detectada! Mensagens de outros tenants:', invalidData);
          throw new Error('❌ ERRO CRÍTICO: Violação de isolamento de dados detectada!');
        }
        console.log(`✅ [SECURITY] ${data.length} mensagens validadas para tenant ${tenantId}`);
      }

      console.log('✅ [DEBUG] MessageHistory - Dados carregados com sucesso:', {
        count: data?.length || 0,
        tenantId,
        chargeId
      });

      return data || [];
    },
    {
      enabled: !!currentTenant?.id && !!chargeId, // 🔒 SÓ EXECUTA SE TENANT E CHARGE VÁLIDOS
    }
  );

  // 🔄 LOADING STATE SEGURO
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Carregando histórico seguro...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 📭 EMPTY STATE SEGURO
  if (!logs || logs.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhuma mensagem enviada ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Tenant: {currentTenant?.name} • Cobrança: {chargeId.slice(0, 8)}...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🎨 HELPER FUNCTIONS PARA STATUS
  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'READ':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enviada</Badge>;
      case 'DELIVERED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Entregue</Badge>;
      case 'READ':
        return <Badge variant="default" className="bg-green-200 text-green-900">Lida</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  // 🛡️ AUDIT LOG PARA EXIBIÇÃO DE DADOS
  console.log(`✅ [AUDIT] Exibindo ${logs.length} mensagens para tenant ${currentTenant?.name} (${currentTenant?.id})`);

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {/* 🔒 HEADER DE SEGURANÇA */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Histórico Seguro</span>
          </div>
          <div className="text-xs text-gray-500">
            {logs.length} mensagem{logs.length !== 1 ? 's' : ''} • {currentTenant?.name}
          </div>
        </div>

        {/* 📊 TABELA DE MENSAGENS */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(log.status)}
                    <span className="text-sm">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">
                      {log.notification_templates?.name || 'Template não encontrado'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.notification_templates?.category || 'Categoria não definida'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(log.status)}
                </TableCell>
                <TableCell>
                  <p className="text-sm max-w-xs truncate" title={log.message}>
                    {log.message || 'Mensagem não disponível'}
                  </p>
                  {log.metadata && (
                    <p className="text-xs text-gray-400 mt-1">
                      ID: {log.id.slice(0, 8)}...
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
