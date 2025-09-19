/**
 * Dashboard de Segurança - Monitoramento de Autenticação
 * Sistema Revalya - Painel administrativo para análise de segurança
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Activity, 
  Clock, 
  MapPin, 
  Smartphone,
  RefreshCw,
  Download,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { SecurityStats, AuthEventType, getRiskLevel } from '../../types/auth';

/**
 * Interface para evento de autenticação detalhado
 */
interface AuthEventDetail {
  id: string;
  user_id?: string;
  email?: string;
  event_type: AuthEventType;
  ip_address: string;
  user_agent: string;
  risk_score: number;
  details: Record<string, any>;
  created_at: string;
}

/**
 * Interface para estatísticas do dashboard
 */
interface DashboardStats {
  totalEvents: number;
  successfulLogins: number;
  failedLogins: number;
  highRiskEvents: number;
  uniqueUsers: number;
  uniqueIPs: number;
  avgRiskScore: number;
  suspiciousActivities: number;
}

/**
 * Interface para filtros
 */
interface SecurityFilters {
  eventType: AuthEventType | 'ALL';
  riskLevel: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeRange: '1h' | '24h' | '7d' | '30d';
  searchTerm: string;
}

/**
 * Componente de card de estatística
 */
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, icon: Icon, color, trend }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-1 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

/**
 * Componente de tabela de eventos
 */
const EventsTable: React.FC<{
  events: AuthEventDetail[];
  isLoading: boolean;
}> = ({ events, isLoading }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };
  
  const getEventTypeColor = (eventType: AuthEventType) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS': return 'bg-green-100 text-green-800';
      case 'LOGIN_FAILED': return 'bg-red-100 text-red-800';
      case 'LOGOUT': return 'bg-blue-100 text-blue-800';
      case 'TOKEN_REFRESH': return 'bg-yellow-100 text-yellow-800';
      case 'SUSPICIOUS_ACTIVITY': return 'bg-orange-100 text-orange-800';
      case 'ACCOUNT_LOCKED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getRiskColor = (score: number) => {
    const level = getRiskLevel(score);
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Eventos Recentes</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Evento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risco
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {event.email || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.user_id?.substring(0, 8)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    getEventTypeColor(event.event_type)
                  }`}>
                    {event.event_type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    {event.ip_address}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    getRiskColor(event.risk_score)
                  }`}>
                    {event.risk_score}/100
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(event.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {events.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          Nenhum evento encontrado
        </div>
      )}
    </div>
  );
};

/**
 * Componente principal do dashboard
 */
export const SecurityDashboard: React.FC = () => {
  // AIDEV-NOTE: CAMADA 1 - Validação de acesso global para admin
  const { hasAccess, accessError } = useTenantAccessGuard('ADMIN', false);

  // AIDEV-NOTE: Bloqueio imediato se acesso negado
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">{accessError || 'Você não tem permissão para acessar o dashboard de segurança.'}</p>
        </div>
      </div>
    );
  }

  const { supabase } = useSupabase();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [filters, setFilters] = useState<SecurityFilters>({
    eventType: 'ALL',
    riskLevel: 'ALL',
    timeRange: '24h',
    searchTerm: ''
  });
  
  // AIDEV-NOTE: CAMADA 2 - Consulta segura de estatísticas com audit logs
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useSecureTenantQuery({
    queryKey: ['security-stats', filters.timeRange],
    queryFn: async () => {
      const hours = {
        '1h': 1,
        '24h': 24,
        '7d': 168,
        '30d': 720
      }[filters.timeRange];
      
      const { data, error } = await supabase.rpc('get_security_stats', {
        p_hours: hours
      });
      
      if (error) throw error;
      
      return {
        totalEvents: data?.total_events || 0,
        successfulLogins: data?.successful_logins || 0,
        failedLogins: data?.failed_logins || 0,
        highRiskEvents: data?.high_risk_events || 0,
        uniqueUsers: data?.unique_users || 0,
        uniqueIPs: data?.unique_ips || 0,
        avgRiskScore: data?.avg_risk_score || 0,
        suspiciousActivities: data?.suspicious_activities || 0
      };
    },
    auditAction: 'VIEW_SECURITY_STATS',
    auditResource: 'security:dashboard:stats',
    auditMetadata: {
      time_range: filters.timeRange,
      dashboard_section: 'statistics'
    },
    enabled: hasAccess
  });
  
  // AIDEV-NOTE: CAMADA 3 - Consulta segura de eventos com audit logs
  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = useSecureTenantQuery({
    queryKey: ['security-events', filters],
    queryFn: async () => {
      let query = supabase
        .from('auth_monitoring')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Aplicar filtros
      if (filters.eventType !== 'ALL') {
        query = query.eq('event_type', filters.eventType);
      }
      
      if (filters.riskLevel !== 'ALL') {
        const riskRanges = {
          'LOW': [0, 39],
          'MEDIUM': [40, 69],
          'HIGH': [70, 89],
          'CRITICAL': [90, 100]
        };
        const [min, max] = riskRanges[filters.riskLevel];
        query = query.gte('risk_score', min).lte('risk_score', max);
      }
      
      if (filters.searchTerm) {
        query = query.or(`email.ilike.%${filters.searchTerm}%,ip_address.ilike.%${filters.searchTerm}%`);
      }
      
      // Filtro de tempo
      const timeRanges = {
        '1h': new Date(Date.now() - 60 * 60 * 1000),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
      query = query.gte('created_at', timeRanges[filters.timeRange].toISOString());
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    },
    auditAction: 'VIEW_SECURITY_EVENTS',
    auditResource: 'security:dashboard:events',
    auditMetadata: {
      filters: filters,
      dashboard_section: 'events_table'
    },
    enabled: hasAccess
  });
  
  // AIDEV-NOTE: CAMADA 4 - Atualização segura de dados com validação de acesso
  const refreshData = useCallback(async () => {
    if (!hasAccess) {
      console.warn('Tentativa de refresh sem acesso adequado');
      return;
    }
    
    setIsRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchEvents()]);
      
      // AIDEV-NOTE: Log de auditoria para refresh manual
      await supabase.from('audit_logs').insert({
        action: 'REFRESH_SECURITY_DASHBOARD',
        resource: 'security:dashboard:refresh',
        metadata: {
          refresh_type: 'manual',
          filters: filters
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [hasAccess, refetchStats, refetchEvents, supabase, filters]);
  
  /**
   * Auto-refresh a cada 30 segundos
   */
  useEffect(() => {
    if (!hasAccess) return;
    
    const interval = setInterval(() => {
      refetchStats();
      refetchEvents();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [hasAccess, refetchStats, refetchEvents]);
  
  // AIDEV-NOTE: CAMADA 5 - Exportação segura com audit logs
  const exportToCSV = async () => {
    if (!hasAccess) {
      console.warn('Tentativa de exportação sem acesso adequado');
      return;
    }
    
    try {
      const csvContent = [
        ['Email', 'Evento', 'IP', 'Risco', 'Data/Hora'].join(','),
        ...events.map(event => [
          event.email || 'N/A',
          event.event_type,
          event.ip_address,
          event.risk_score,
          new Date(event.created_at).toLocaleString('pt-BR')
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // AIDEV-NOTE: Log de auditoria para exportação
      await supabase.from('audit_logs').insert({
        action: 'EXPORT_SECURITY_DATA',
        resource: 'security:dashboard:export',
        metadata: {
          export_type: 'csv',
          events_count: events.length,
          filters: filters
        }
      });
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };
  
  // AIDEV-NOTE: Estado de carregamento durante validação de acesso
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-500">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  const isLoading = statsLoading || eventsLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                Dashboard de Segurança
              </h1>
              <p className="text-gray-600 mt-1">
                Monitoramento em tempo real de atividades de autenticação
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>
            
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="1h">Última hora</option>
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
            
            <select
              value={filters.eventType}
              onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value as any }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="ALL">Todos os eventos</option>
              <option value="LOGIN_SUCCESS">Login bem-sucedido</option>
              <option value="LOGIN_FAILED">Login falhado</option>
              <option value="LOGOUT">Logout</option>
              <option value="SUSPICIOUS_ACTIVITY">Atividade suspeita</option>
            </select>
            
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value as any }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="ALL">Todos os riscos</option>
              <option value="LOW">Baixo risco</option>
              <option value="MEDIUM">Risco médio</option>
              <option value="HIGH">Alto risco</option>
              <option value="CRITICAL">Risco crítico</option>
            </select>
            
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por email ou IP..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm w-64"
              />
            </div>
          </div>
        </div>
        
        {/* Cards de Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total de Eventos"
              value={stats.totalEvents.toLocaleString()}
              icon={Activity}
              color="bg-blue-500"
            />
            
            <StatCard
              title="Logins Bem-sucedidos"
              value={stats.successfulLogins.toLocaleString()}
              icon={Users}
              color="bg-green-500"
            />
            
            <StatCard
              title="Tentativas Falhadas"
              value={stats.failedLogins.toLocaleString()}
              icon={AlertTriangle}
              color="bg-red-500"
            />
            
            <StatCard
              title="Score Médio de Risco"
              value={`${stats.avgRiskScore.toFixed(1)}/100`}
              icon={Shield}
              color="bg-orange-500"
            />
          </div>
        )}
        
        {/* Tabela de Eventos */}
        <EventsTable events={events} isLoading={eventsLoading} />
      </div>
    </div>
  );
};

export default SecurityDashboard;
