import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialAudit } from '@/hooks/useFinancialAudit';
import { AuditEntityType } from '@/services/financialAuditService';
import { Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface AuditLogViewerProps {
  tenantId: string;
  entityType: string;
  entityId: string;
}

const FIELD_LABELS: Record<string, string> = {
  amount: 'Valor',
  gross_amount: 'Valor Bruto',
  net_amount: 'Valor Líquido',
  paid_amount: 'Valor Pago',
  description: 'Descrição',
  due_date: 'Vencimento',
  issue_date: 'Emissão',
  status: 'Status',
  category_id: 'Categoria',
  customer_id: 'Cliente/Fornecedor',
  payment_method: 'Forma de Pagamento',
  recurrence_id: 'Recorrência',
  barcode: 'Código de Barras',
  notes: 'Observações',
  competence_date: 'Competência',
  department_id: 'Departamento',
  cost_center_id: 'Centro de Custo',
  document_number: 'Nº Documento',
  active: 'Ativo',
  name: 'Nome',
  email: 'Email',
  role: 'Função',
  type_id: 'Tipo',
  bank_account_id: 'Conta Bancária',
  interest_amount: 'Juros',
  fine_amount: 'Multa',
  discount_amount: 'Desconto',
  payment_date: 'Data Pagamento',
  repeat: 'Repetição',
  installments: 'Parcelas',
};

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  'CREATE': { label: 'Criação', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'UPDATE': { label: 'Edição', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  'DELETE': { label: 'Exclusão', className: 'bg-red-100 text-red-700 border-red-200' },
  'VIEW': { label: 'Visualização', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  'EXPORT': { label: 'Exportação', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  'IMPORT': { label: 'Importação', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  'APPROVE': { label: 'Aprovação', className: 'bg-green-100 text-green-700 border-green-200' },
  'REJECT': { label: 'Rejeição', className: 'bg-red-100 text-red-700 border-red-200' },
  'CANCEL': { label: 'Cancelamento', className: 'bg-red-100 text-red-700 border-red-200' },
  'PAYMENT_RECEIVED': { label: 'Pagamento Recebido', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'PAYMENT_FAILED': { label: 'Falha Pagamento', className: 'bg-red-100 text-red-700 border-red-200' },
  'CONTRACT_SIGNED': { label: 'Contrato Assinado', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'CONTRACT_TERMINATED': { label: 'Contrato Rescindido', className: 'bg-red-100 text-red-700 border-red-200' },
};

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const config = ACTION_CONFIG[action] || { label: action, className: 'bg-secondary text-secondary-foreground' };
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      config.className
    )}>
      {config.label}
    </span>
  );
};

const formatValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return 'Vazio';
  
  if (key.includes('amount') || key.includes('price') || key.includes('value') || key.includes('balance') || key.includes('total')) {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  }
  
  if (key.includes('date') || key.includes('_at')) {
     try {
       const date = new Date(value);
       if (isNaN(date.getTime())) return String(value);
       // Se tiver hora, formata com hora, senão só data
       if (String(value).includes('T') || String(value).includes(':')) {
         return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
       }
       return format(date, 'dd/MM/yyyy', { locale: ptBR });
     } catch { return String(value); }
  }
  
  if (key === 'status') {
    const statusMap: Record<string, string> = {
        'PENDING': 'Pendente',
        'PAID': 'Pago',
        'OVERDUE': 'Vencido',
        'CANCELED': 'Cancelado',
        'DRAFT': 'Rascunho',
        'PARTIAL': 'Parcial',
        'SCHEDULED': 'Agendado'
    };
    return statusMap[String(value)] || String(value);
  }
  
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const LogDetails: React.FC<{ log: any }> = ({ log }) => {
  // Caso 1: Atualização com valores antigos e novos
  if (log.action === 'UPDATE' && (log.old_values || log.new_values)) {
      const changes: React.ReactNode[] = [];
      const oldV = log.old_values || {};
      const newV = log.new_values || {};
      
      // Identificar chaves que mudaram
      const allKeys = Array.from(new Set([...Object.keys(oldV), ...Object.keys(newV)]));
      
      allKeys.forEach(key => {
         // Ignorar campos de sistema
         if (['updated_at', 'created_at', 'tenant_id', 'id', 'created_by', 'metadata', 'search_vector'].includes(key)) return;
         
         const valOld = oldV[key];
         const valNew = newV[key];
         
         // Comparação simples (pode ser melhorada para objetos profundos se necessário)
         if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
             changes.push(
               <div key={key} className="text-xs flex items-center gap-1.5 flex-wrap">
                 <span className="font-semibold text-foreground/80">{FIELD_LABELS[key] || key}:</span>
                 <span className="text-red-500/80 line-through text-[11px]">{formatValue(key, valOld)}</span>
                 <ArrowRight className="h-3 w-3 text-muted-foreground" />
                 <span className="text-emerald-600 font-medium">{formatValue(key, valNew)}</span>
               </div>
             );
         }
      });
      
      if (changes.length > 0) return <div className="flex flex-col gap-1.5 py-1">{changes}</div>;
      
      // Se não detectou mudanças nos campos principais, mas é um update
      return <span className="text-xs text-muted-foreground italic">Atualização registrada (sem alterações visíveis)</span>;
  }
  
  // Caso 2: Criação
  if (log.action === 'CREATE') {
      const newV = log.new_values || {};
      const parts = [];
      if (newV.description) parts.push(newV.description);
      if (newV.amount) parts.push(formatValue('amount', newV.amount));
      
      if (parts.length > 0) {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-emerald-600">Registro criado</span>
            <span className="text-xs text-muted-foreground">{parts.join(' - ')}</span>
          </div>
        );
      }
      return <span className="text-xs font-medium text-emerald-600">Registro criado</span>;
  }
  
  // Caso 3: Fallback para metadata
  if (log.metadata) {
      // Filtrar campos técnicos
      const { source, risk_level, compliance_flags, ...rest } = log.metadata;
      
      // Se tiver risk_level, mostra formatado
      const riskEl = risk_level ? (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider",
          risk_level === 'LOW' ? "bg-slate-100 text-slate-600 border-slate-200" :
          risk_level === 'MEDIUM' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
          "bg-red-50 text-red-700 border-red-200"
        )}>
          Risco: {risk_level === 'LOW' ? 'Baixo' : risk_level === 'MEDIUM' ? 'Médio' : 'Alto'}
        </span>
      ) : null;

      const restKeys = Object.keys(rest);
      if (restKeys.length > 0) {
        return (
          <div className="flex flex-col gap-1 items-start">
            {riskEl}
            <span className="text-xs text-muted-foreground truncate max-w-[280px]" title={JSON.stringify(rest)}>
              {JSON.stringify(rest).replace(/["{}]/g, '').replace(/:/g, ': ').replace(/,/g, ', ')}
            </span>
          </div>
        );
      }
      
      if (riskEl) return riskEl;
  }
  
  return <span className="text-muted-foreground">-</span>;
};

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  tenantId,
  entityType,
  entityId,
}) => {
  const {
    auditLogs,
    isFetchingLogs,
    fetchAuditLogs,
  } = useFinancialAudit();

  const [userMap, setUserMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenantId && entityId) {
      // Cast entityType to AuditEntityType since we know it's valid or we treat it as such
      // If the passed string is not in AuditEntityType, it might be an issue if strict,
      // but fetchAuditLogs implementation likely passes it to DB where it's a string.
      // However, we added PAYABLE to the type, so we should use that.
      fetchAuditLogs({
        tenant_id: tenantId,
        entity_type: entityType as AuditEntityType,
        entity_id: entityId,
        limit: 50,
        offset: 0
      });
    }
  }, [tenantId, entityType, entityId, fetchAuditLogs]);

  useEffect(() => {
    const loadUsers = async () => {
      const userIds = Array.from(new Set(auditLogs.map(log => log.user_id).filter(Boolean)));
      if (userIds.length === 0) return;

      // Filter out IDs we already have
      const missingIds = userIds.filter(id => !userMap[id]);
      if (missingIds.length === 0) return;

      try {
          const { data, error } = await supabase
              .from('users')
              .select('id, name, email')
              .in('id', missingIds);
              
          if (!error && data) {
              const newMap = { ...userMap };
              data.forEach((p: any) => {
                  newMap[p.id] = p.name || p.email || 'Usuário sem nome';
              });
              setUserMap(newMap);
          }
      } catch (e) {
          console.error("Failed to load user profiles", e);
      }
    };
    
    loadUsers();
  }, [auditLogs]);

  if (isFetchingLogs && auditLogs.length === 0) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto h-full">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Data/Hora</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Usuário</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ação</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                Nenhum registro encontrado
              </td>
            </tr>
          ) : (
            auditLogs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-2 whitespace-nowrap">
                  {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                </td>
                <td className="px-4 py-2">{userMap[log.user_id] || log.user_id || 'Sistema'}</td>
                <td className="px-4 py-2">
                  <ActionBadge action={log.action} />
                </td>
                <td className="px-4 py-2 max-w-[300px]">
                  <LogDetails log={log} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
